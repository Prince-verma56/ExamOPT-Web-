import 'package:flutter/material.dart';

import '../state/app_session.dart';
import '../theme/app_theme.dart';

/// Sign-in with the same account used on the ExamOpt website. The server, not
/// the app, decides whether the account is a student, an invigilator or an
/// administrator, and which records it may see.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submitCode(AppSession session) async {
    if (_code.text.trim().isEmpty) return;
    FocusScope.of(context).unfocus();
    await session.submitEmailCode(_code.text);
    _code.clear();
  }

  Future<void> _submit(AppSession session) async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) return;
    FocusScope.of(context).unfocus();
    await session.signIn(_email.text, _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final configError = session.configurationError;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.primary, AppColors.primaryDark],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(
                          Icons.event_available_rounded,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'ExamOpt',
                      textAlign: TextAlign.center,
                      style: textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your published examination timetable',
                      textAlign: TextAlign.center,
                      style: textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: 28),
                    if (configError != null)
                      _Banner(
                        icon: Icons.settings_outlined,
                        color: AppColors.warning,
                        text: configError,
                      )
                    else if (session.awaitingEmailCode) ...[
                      Text(
                        'Check your email',
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'For your security, signing in on a new device needs the code we sent to ${session.codeDestination ?? 'your email address'}.',
                        style: textTheme.bodySmall?.copyWith(height: 1.45),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _code,
                        keyboardType: TextInputType.number,
                        autofillHints: const [AutofillHints.oneTimeCode],
                        onSubmitted: (_) => _submitCode(session),
                        decoration: const InputDecoration(
                          labelText: 'Verification code',
                          prefixIcon: Icon(Icons.pin_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (session.error != null) ...[
                        _Banner(
                          icon: Icons.error_outline_rounded,
                          color: AppColors.error,
                          text: session.error!,
                        ),
                        const SizedBox(height: 12),
                      ],
                      FilledButton(
                        onPressed: session.busy
                            ? null
                            : () => _submitCode(session),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                        child: const Text('Verify and sign in'),
                      ),
                      TextButton(
                        onPressed: session.busy ? null : session.cancelSignIn,
                        child: const Text('Use a different account'),
                      ),
                    ] else ...[
                      TextField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon: Icon(Icons.alternate_email_rounded),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _password,
                        obscureText: _obscure,
                        autofillHints: const [AutofillHints.password],
                        onSubmitted: (_) => _submit(session),
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            tooltip: _obscure
                                ? 'Show password'
                                : 'Hide password',
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                            onPressed: () =>
                                setState(() => _obscure = !_obscure),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (session.error != null) ...[
                        _Banner(
                          icon: Icons.error_outline_rounded,
                          color: AppColors.error,
                          text: session.error!,
                        ),
                        const SizedBox(height: 12),
                      ],
                      FilledButton(
                        onPressed: session.busy ? null : () => _submit(session),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                        ),
                        child: session.busy
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Sign in'),
                      ),
                    ],
                    const SizedBox(height: 24),
                    Text(
                      'Use the account you use on the ExamOpt website. Students see only their own exams; '
                      'your account must be linked to your roll number by the examination office.',
                      textAlign: TextAlign.center,
                      style: textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondaryLight,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Server: ${session.apiBaseUrl.isEmpty ? 'not configured' : session.apiBaseUrl}',
                      textAlign: TextAlign.center,
                      style: textTheme.bodySmall?.copyWith(
                        color: AppColors.textTertiaryLight,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.icon, required this.color, required this.text});
  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      border: Border.all(color: color.withValues(alpha: 0.35)),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(height: 1.4),
          ),
        ),
      ],
    ),
  );
}
