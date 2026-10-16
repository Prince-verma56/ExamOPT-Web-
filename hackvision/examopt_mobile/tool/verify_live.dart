// Live check of the mobile app's sign-in and API path, using the app's own
// lib/core code (pure Dart, no Flutter) against a running ExamOpt server.
//
//   dart run tool/verify_live.dart <apiBaseUrl> <publishableKey> <email> <passwordFile> [otherRollNo]
//
// It signs in through Clerk's Frontend API exactly as the app does, then calls
// the shared API with the session JWT. It prints identifiers and counts only.
import 'dart:io';

import 'package:examopt_mobile/core/api_client.dart';
import 'package:examopt_mobile/core/app_config.dart';
import 'package:examopt_mobile/core/clerk_auth.dart';
import 'package:http/http.dart' as http;

Future<void> main(List<String> args) async {
  if (args.length < 4) {
    stderr.writeln(
      'usage: dart run tool/verify_live.dart <apiBaseUrl> <publishableKey> <email> <passwordFile> [otherRollNo]',
    );
    exit(64);
  }
  final [base, key, email, passwordFile, ...rest] = args;
  final other = rest.isEmpty ? null : rest.first;
  final fapi = AppConfig.frontendApiFromKey(key);
  if (fapi == null) throw StateError('Invalid publishable key');
  var failures = 0;
  void check(String label, bool ok, [String detail = '']) {
    stdout.writeln(
      '${ok ? 'PASS' : 'FAIL'}  $label${detail.isEmpty ? '' : '  ($detail)'}',
    );
    if (!ok) failures++;
  }

  final auth = ClerkAuth(frontendApi: fapi);
  try {
    await auth.signIn(email, 'definitely-wrong-password');
    check('wrong password is refused by Clerk', false);
  } on ClerkAuthException catch (e) {
    check('wrong password is refused by Clerk', true, e.code ?? '');
  }

  var step = await auth.signIn(
    email,
    File(passwordFile).readAsStringSync().trim(),
  );
  if (step == SignInStep.emailCode) {
    check(
      'Clerk asks for an emailed code on a new device; the app handles it',
      true,
      'sent to ${auth.pendingCodeDestination}',
    );
    try {
      await auth.submitEmailCode('000000');
      check('a wrong verification code is refused', false);
    } on ClerkAuthException catch (e) {
      check('a wrong verification code is refused', true, e.code ?? '');
    }
    // Clerk development instances accept 424242 for +clerk_test addresses; no email is sent.
    step = await auth.submitEmailCode('424242');
  }
  check(
    'native sign-in through Clerk Frontend API completes',
    step == SignInStep.complete && auth.isSignedIn,
  );
  final api = ApiClient(baseUrl: base, tokenProvider: auth.sessionToken);

  final access = await api.access();
  check(
    'GET /api/v1/access resolves the linked roll number from the session',
    access.isLinkedStudent,
    'role=${access.role}, rollNo=${access.rollNo}',
  );

  final timetable = await api.studentTimetable();
  check(
    'GET /api/v1/timetable/student returns the caller\'s own record',
    timetable.student.rollNo == access.rollNo,
    '${timetable.student.rollNo}, ${timetable.exams.length} exams, published=${timetable.published}, version=${timetable.publication?.version}',
  );
  check(
    'every returned exam is one the student is enrolled in',
    timetable.exams.every(
      (e) => timetable.student.subjectIds.contains(e.examId),
    ),
  );

  final token = await auth.sessionToken();
  Future<int> status(String path) async => (await http.get(
    Uri.parse('$base/api/v1$path'),
    headers: {'Authorization': 'Bearer $token'},
  )).statusCode;
  if (other != null) {
    check(
      'asking for another student\'s timetable is forbidden',
      await status('/timetable/student?rollNo=$other') == 403,
    );
  }
  check(
    'a student session cannot use admin routes (Demo Studio)',
    await status('/scheduling/demo/dataset?source=live') == 403,
  );
  check(
    'a student session cannot use admin routes (CSV export)',
    await status('/data/export?entity=students') == 403,
  );
  // Informational: a development server with FEATURE_DEMO_MODE=true treats anonymous
  // requests as a demo administrator (never in production builds).
  final anonymous = await http.get(Uri.parse('$base/api/v1/timetable/student'));
  stdout.writeln(
    'INFO  anonymous GET /timetable/student -> ${anonymous.statusCode} (expect 401 on a production server)',
  );

  await auth.signOut();
  check('sign-out clears the session', !auth.isSignedIn);
  stdout.writeln(
    failures == 0 ? 'ALL CHECKS PASSED' : '$failures CHECK(S) FAILED',
  );
  exit(failures == 0 ? 0 : 1);
}
