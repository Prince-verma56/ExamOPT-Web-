import 'dart:convert';

/// Build-time configuration, supplied with `--dart-define`. Nothing secret is
/// compiled into the app: the Clerk publishable key is public by design, and
/// no Supabase or Clerk secret is ever needed on the device.
///
///   flutter build apk --debug \
///     --dart-define=CLERK_PUBLISHABLE_KEY=pk_test_...
class AppConfig {
  AppConfig._();

  static const String defaultApiBaseUrl = 'https://exam-opt-web.vercel.app';
  static const String _apiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String defaultClerkPublishableKey =
      'pk_test_d2VsY29tZS1ld2UtMzM0OC5jbGVyay5hY2NvdW50cy5kZXYk';
  static const String _clerkPublishableKey = String.fromEnvironment(
    'CLERK_PUBLISHABLE_KEY',
  );
  static String get clerkPublishableKey =>
      _clerkPublishableKey.isNotEmpty ? _clerkPublishableKey : defaultClerkPublishableKey;

  /// True in release builds (`flutter build apk --release`).
  static const bool isRelease = bool.fromEnvironment('dart.vm.product');

  /// The deployed ExamOpt server is the default; local development can override
  /// it with `--dart-define=API_BASE_URL=http://10.0.2.2:3000`.
  static String get apiBaseUrl {
    final value = _apiBaseUrl.trim();
    if (value.isNotEmpty) {
      return value.endsWith('/') ? value.substring(0, value.length - 1) : value;
    }
    return defaultApiBaseUrl;
  }

  /// Clerk Frontend API host encoded in the publishable key
  /// (`pk_test_` / `pk_live_` + base64 of `host$`), or null if the key is malformed.
  static String? frontendApiFromKey(String key) {
    final match = RegExp(r'^pk_(test|live)_(.+)$').firstMatch(key.trim());
    if (match == null) return null;
    try {
      var encoded = match.group(2)!;
      encoded = encoded.padRight(
        encoded.length + (4 - encoded.length % 4) % 4,
        '=',
      );
      final host = utf8.decode(base64.decode(encoded));
      if (!host.endsWith(r'$')) return null;
      final trimmed = host.substring(0, host.length - 1);
      return RegExp(r'^[a-z0-9.-]+$').hasMatch(trimmed) ? trimmed : null;
    } catch (_) {
      return null;
    }
  }

  static String? get clerkFrontendApi =>
      frontendApiFromKey(clerkPublishableKey);

  /// A human-readable reason the app cannot reach the backend, or null when configured.
  static String? get configurationError {
    if (apiBaseUrl.isEmpty) {
      return 'This build has no API_BASE_URL. Rebuild with --dart-define=API_BASE_URL=https://your-server.';
    }
    if (isRelease && !apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
      return 'API_BASE_URL must begin with http:// or https://';
    }
    if (clerkPublishableKey.isEmpty) {
      return 'This build has no CLERK_PUBLISHABLE_KEY. Rebuild with --dart-define=CLERK_PUBLISHABLE_KEY=pk_...';
    }
    if (clerkFrontendApi == null) {
      return 'CLERK_PUBLISHABLE_KEY is not a valid Clerk publishable key.';
    }
    return null;
  }
}
