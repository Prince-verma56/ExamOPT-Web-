import 'package:flutter/widgets.dart';

import '../core/api_client.dart';
import '../core/app_config.dart';
import '../core/clerk_auth.dart';
import '../core/models.dart';

/// Signs in through Clerk, then asks the ExamOpt server who the caller is.
/// Screens read the role and linked records from [access], which the server
/// decided; the app never decides access itself.
class AppSession extends ChangeNotifier {
  AppSession({
    ClerkAuth? auth,
    ApiClient Function(Future<String> Function() tokenProvider)? apiFactory,
    String? apiBaseUrl,
  }) : _auth =
           auth ??
           (AppConfig.configurationError == null
               ? ClerkAuth(frontendApi: AppConfig.clerkFrontendApi!)
               : null),
       apiBaseUrl = apiBaseUrl ?? AppConfig.apiBaseUrl,
       configurationError = auth != null ? null : AppConfig.configurationError,
       _apiFactory =
           apiFactory ??
           ((tokens) => ApiClient(
             baseUrl: apiBaseUrl ?? AppConfig.apiBaseUrl,
             tokenProvider: tokens,
           ));

  /// Where the app sends API requests.
  final String apiBaseUrl;

  /// Why this build cannot sign in (missing or invalid build settings), or null.
  final String? configurationError;
  final ClerkAuth? _auth;
  final ApiClient Function(Future<String> Function() tokenProvider) _apiFactory;

  ApiClient? _api;
  AccessSummary? _access;
  bool _busy = false;
  String? _error;

  ApiClient? get api => _api;
  AccessSummary? get access => _access;
  bool get isSignedIn => _access != null;
  bool get busy => _busy;
  String? get error => _error;

  bool _awaitingEmailCode = false;

  /// True when Clerk emailed a verification code that must be entered to finish signing in.
  bool get awaitingEmailCode => _awaitingEmailCode;

  /// Where the code was sent, masked by Clerk.
  String? get codeDestination => _auth?.pendingCodeDestination;

  Future<void> signIn(String email, String password) =>
      _step((auth) => auth.signIn(email, password));

  Future<void> submitEmailCode(String code) =>
      _step((auth) => auth.submitEmailCode(code));

  /// Leaves the code step and returns to email and password.
  Future<void> cancelSignIn() async {
    _awaitingEmailCode = false;
    _error = null;
    await _auth?.signOut();
    notifyListeners();
  }

  Future<void> _step(Future<SignInStep> Function(ClerkAuth auth) action) async {
    final auth = _auth;
    if (auth == null) {
      _error = configurationError ?? 'Sign-in is not configured.';
      notifyListeners();
      return;
    }
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final step = await action(auth);
      _awaitingEmailCode = step == SignInStep.emailCode;
      if (step == SignInStep.complete) {
        final api = _apiFactory(auth.sessionToken);
        _access = await api.access();
        _api = api;
      }
    } on ClerkAuthException catch (e) {
      _error = e.message;
    } on ApiException catch (e) {
      _error = e.message;
      _awaitingEmailCode = false;
      await auth.signOut();
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Asks the server again who this account is (for example after an administrator linked it).
  Future<void> reloadAccess() async {
    final api = _api;
    if (api == null) return;
    _busy = true;
    notifyListeners();
    try {
      _access = await api.access();
      _error = null;
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        _busy = false;
        await expire(e.message);
        return;
      }
      _error = e.message;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> linkStudent(String rollNo) async {
    final api = _api;
    if (api == null) return;
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      await api.linkStudent(rollNo);
      _access = await api.access();
    } on ApiException catch (e) {
      _error = e.message;
      if (e.isUnauthorized) {
        await expire(e.message);
      }
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    _awaitingEmailCode = false;
    await _auth?.signOut();
    _api = null;
    _access = null;
    _error = null;
    notifyListeners();
  }

  /// Called when the server rejects the session mid-use.
  Future<void> expire(String message) async {
    await signOut();
    _error = message;
    notifyListeners();
  }
}

/// Makes the [AppSession] available to the widget tree and rebuilds dependants when it changes.
class SessionScope extends InheritedNotifier<AppSession> {
  const SessionScope({
    super.key,
    required AppSession session,
    required super.child,
  }) : super(notifier: session);

  static AppSession of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SessionScope>()!.notifier!;
}
