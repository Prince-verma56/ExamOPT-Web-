import 'package:flutter/material.dart';

import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'state/app_session.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(ExamOptApp(session: AppSession()));
}

/// ExamOpt mobile client. It talks only to the ExamOpt Next.js API (the same
/// backend and database as the web app), authenticated with Clerk.
class ExamOptApp extends StatelessWidget {
  const ExamOptApp({
    super.key,
    required this.session,
    this.theme,
    this.darkTheme,
    this.clock,
  });

  final AppSession session;

  /// Tests pass a plain theme so no font is fetched over the network.
  final ThemeData? theme;
  final ThemeData? darkTheme;
  final DateTime Function()? clock;

  @override
  Widget build(BuildContext context) {
    return SessionScope(
      session: session,
      child: MaterialApp(
        title: 'ExamOpt',
        debugShowCheckedModeBanner: false,
        theme: theme ?? AppTheme.lightTheme(),
        darkTheme: darkTheme ?? theme ?? AppTheme.darkTheme(),
        home: _AuthGate(clock: clock),
      ),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate({this.clock});
  final DateTime Function()? clock;

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    // Keyed by user so a new sign-in starts with fresh data.
    return session.isSignedIn
        ? HomeShell(key: ValueKey(session.access!.userId), clock: clock)
        : const LoginScreen();
  }
}
