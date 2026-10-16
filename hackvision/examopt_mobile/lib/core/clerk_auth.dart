import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

enum SignInStep { complete, emailCode }

class ClerkAuthException implements Exception {
  ClerkAuthException(this.message, [this.code]);
  final String message;
  final String? code;
  @override
  String toString() => message;
}

/// Sign-in with the same Clerk instance the web app uses, through Clerk's
/// Frontend API in native mode (`_is_native=1`). The app never sees a secret:
/// it holds a client token and short-lived session JWTs (about 60 s), and
/// sends the JWT as `Authorization: Bearer` to the ExamOpt server, which
/// verifies it with Clerk and decides the caller's role and linked records.
///
/// The session lives in memory only, so signing in is needed after the app restarts.
class ClerkAuth {
  ClerkAuth({required this.frontendApi, http.Client? client})
    : _http = client ?? http.Client();

  final String frontendApi;
  final http.Client _http;
  String? _clientToken;
  String? _sessionId;
  String? _jwt;
  DateTime? _jwtIssuedAt;

  /// Refresh the session JWT once it is older than this (Clerk issues 60-second tokens).
  static const tokenRefreshAfter = Duration(seconds: 45);
  static const _timeout = Duration(seconds: 20);

  bool get isSignedIn => _sessionId != null;

  Uri _uri(String path) => Uri.https(frontendApi, path, {'_is_native': '1'});

  Map<String, String> get _headers => {
    'Accept': 'application/json',
    'Authorization': ?_clientToken,
  };

  /// Native responses carry the rotating client token in the `Authorization` header.
  void _captureClientToken(http.Response response) {
    final token = response.headers['authorization'];
    if (token != null && token.isNotEmpty) _clientToken = token;
  }

  static String _errorMessage(http.Response response, String fallback) {
    try {
      final errors =
          (jsonDecode(response.body) as Map<String, dynamic>)['errors']
              as List?;
      final first = errors != null && errors.isNotEmpty
          ? errors.first as Map<String, dynamic>
          : null;
      return (first?['long_message'] ?? first?['message'] ?? fallback)
          .toString();
    } catch (_) {
      return fallback;
    }
  }

  static String? _errorCode(http.Response response) {
    try {
      final errors =
          (jsonDecode(response.body) as Map<String, dynamic>)['errors']
              as List?;
      return errors != null && errors.isNotEmpty
          ? (errors.first as Map<String, dynamic>)['code']?.toString()
          : null;
    } catch (_) {
      return null;
    }
  }

  String? _signInId;

  /// Email and password sign-in. Returns [SignInStep.complete], or
  /// [SignInStep.emailCode] when Clerk requires a code sent by email (a new
  /// device, "client trust", or an email second factor); then call
  /// [submitEmailCode]. Throws [ClerkAuthException] with Clerk's own message.
  Future<SignInStep> signIn(String email, String password) async {
    final body = await _post('/v1/client/sign_ins', {
      'strategy': 'password',
      'identifier': email.trim(),
      'password': password,
    });
    return _continue(body);
  }

  /// Completes a sign-in that is waiting for the code Clerk emailed.
  Future<SignInStep> submitEmailCode(String code) async {
    final id = _signInId;
    if (id == null) {
      throw ClerkAuthException('Start signing in again.', 'no_sign_in');
    }
    final body = await _post('/v1/client/sign_ins/$id/attempt_second_factor', {
      'strategy': 'email_code',
      'code': code.trim(),
    });
    return _continue(body);
  }

  /// Email masked by Clerk (for example "s***@example.com") while a code is pending.
  String? pendingCodeDestination;

  Future<SignInStep> _continue(Map<String, dynamic> body) async {
    final attempt = body['response'] as Map<String, dynamic>? ?? const {};
    final status = attempt['status']?.toString();
    _signInId = attempt['id']?.toString() ?? _signInId;
    if (status == 'needs_second_factor' || status == 'needs_client_trust') {
      final factors =
          ((attempt['supported_second_factors'] as List?) ?? const [])
              .cast<Map<String, dynamic>>();
      final email = factors
          .where((f) => f['strategy'] == 'email_code')
          .firstOrNull;
      if (email == null) {
        throw ClerkAuthException(
          'This account needs a verification method the app does not support (${factors.map((f) => f['strategy']).join(', ')}). Sign in on the web instead.',
          status,
        );
      }
      await _post('/v1/client/sign_ins/$_signInId/prepare_second_factor', {
        'strategy': 'email_code',
        if (email['email_address_id'] != null)
          'email_address_id': '${email['email_address_id']}',
      });
      pendingCodeDestination = email['safe_identifier']?.toString();
      return SignInStep.emailCode;
    }
    if (status != 'complete') {
      throw ClerkAuthException(
        'This account needs another verification step ($status) that the app does not support. Sign in on the web instead.',
        status,
      );
    }
    pendingCodeDestination = null;
    _signInId = null;
    _sessionId = attempt['created_session_id']?.toString();
    final sessions =
        ((body['client'] as Map<String, dynamic>?)?['sessions'] as List?) ??
        const [];
    final session = sessions
        .cast<Map<String, dynamic>>()
        .where((s) => s['id'] == _sessionId)
        .firstOrNull;
    final jwt = (session?['last_active_token'] as Map<String, dynamic>?)?['jwt']
        ?.toString();
    if (jwt != null && jwt.isNotEmpty) {
      _jwt = jwt;
      _jwtIssuedAt = DateTime.now();
    } else {
      await _refresh();
    }
    return SignInStep.complete;
  }

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, String> form,
  ) async {
    final http.Response response;
    try {
      response = await _http
          .post(_uri(path), headers: _headers, body: form)
          .timeout(_timeout);
    } on TimeoutException {
      throw ClerkAuthException(
        'The sign-in service did not answer in time. Check your connection.',
        'timeout',
      );
    } catch (_) {
      throw ClerkAuthException(
        'Cannot reach the sign-in service. Check your connection.',
        'network',
      );
    }
    _captureClientToken(response);
    if (response.statusCode >= 400) {
      throw ClerkAuthException(
        _errorMessage(response, 'Sign-in failed (${response.statusCode}).'),
        _errorCode(response),
      );
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  /// A fresh session JWT for the `Authorization: Bearer` header.
  Future<String> sessionToken() async {
    if (_sessionId == null) {
      throw ClerkAuthException('You are signed out.', 'signed_out');
    }
    if (_jwt == null ||
        _jwtIssuedAt == null ||
        DateTime.now().difference(_jwtIssuedAt!) > tokenRefreshAfter) {
      await _refresh();
    }
    return _jwt!;
  }

  Future<void> _refresh() async {
    final http.Response response;
    try {
      response = await _http
          .post(
            _uri('/v1/client/sessions/$_sessionId/tokens'),
            headers: _headers,
          )
          .timeout(_timeout);
    } catch (_) {
      throw ClerkAuthException(
        'Cannot reach the sign-in service to renew your session.',
        'network',
      );
    }
    _captureClientToken(response);
    if (response.statusCode != 200) {
      _clear();
      throw ClerkAuthException(
        'Your session has ended. Sign in again.',
        'session_ended',
      );
    }
    _jwt = (jsonDecode(response.body) as Map<String, dynamic>)['jwt']
        ?.toString();
    _jwtIssuedAt = DateTime.now();
  }

  Future<void> signOut() async {
    final id = _sessionId;
    if (id != null) {
      try {
        await _http
            .post(_uri('/v1/client/sessions/$id/end'), headers: _headers)
            .timeout(const Duration(seconds: 5));
      } catch (_) {
        // The local session is cleared regardless; the server-side session also expires on its own.
      }
    }
    _clear();
  }

  void _clear() {
    _signInId = null;
    pendingCodeDestination = null;
    _sessionId = null;
    _jwt = null;
    _jwtIssuedAt = null;
    _clientToken = null;
  }
}
