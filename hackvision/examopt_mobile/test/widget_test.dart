import 'dart:convert';

import 'package:examopt_mobile/core/api_client.dart';
import 'package:examopt_mobile/core/app_config.dart';
import 'package:examopt_mobile/core/clerk_auth.dart';
import 'package:examopt_mobile/main.dart';
import 'package:examopt_mobile/state/app_session.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// The app against stand-ins for Clerk's Frontend API and the ExamOpt API.
/// The stand-ins answer with the response shapes of the real endpoints, and
/// record every request so the tests can check what the app sends.

const fapi = 'example.clerk.accounts.dev';
const api = 'https://examopt.test';
final now = DateTime(2026, 10, 20, 8);

Map<String, dynamic> examJson(
  String id,
  String name,
  String date,
  int start,
  int end, {
  String room = 'AB11-201',
  bool lab = false,
}) => {
  'id': '$id@slot',
  'examId': id,
  'examName': name,
  'program': 'BCA',
  'semester': 1,
  'durationMinutes': end - start,
  'requiresLab': lab,
  'slotId': 'D-$date',
  'date': date,
  'startMinutes': start,
  'endMinutes': end,
  'session': start < 720 ? 'morning' : 'evening',
  'roomId': room,
  'roomName': 'CSED Block AB-XI $room',
  'roomType': lab ? 'LAB' : 'THEORY',
  'roomCapacity': 100,
  'students': 80,
  'facultyId': 'FAC-101',
  'facultyName': 'Dr. Example',
  'facultyDepartment': 'CSED',
};

Map<String, dynamic> timetableJson({
  bool published = true,
  List<Map<String, dynamic>>? exams,
  bool? valid = true,
}) => {
  'student': {
    'rollNo': 'GLA26-BCA-0001',
    'name': 'Akash Singh',
    'groupId': 'GRP-BCA-S1',
    'groupName': 'BCA Semester 1',
    'program': 'BCA',
    'semester': 1,
    'hasBacklog': false,
    'subjectIds': ['BCA-101', 'BCA-102', 'BCA-103'],
  },
  'publication': published
      ? {
          'version': 5,
          'title': 'Examination Timetable (Version 5)',
          'publishedAt': '2026-10-16T08:00:00Z',
          'isActive': true,
        }
      : null,
  'status': published ? 'PUBLISHED' : 'NO_PUBLISHED_SCHEDULE',
  'valid': published ? valid : null,
  'exams': published
      ? (exams ??
            [
              examJson(
                'BCA-101',
                'Mathematical Foundation',
                '2026-10-19',
                570,
                750,
              ),
              examJson(
                'BCA-102',
                'Problem Solving with C',
                '2026-10-21',
                840,
                1020,
              ),
            ])
      : [],
  'enrolledCount': 3,
  'scheduledCount': 2,
  'notInPublishedSchedule': published ? ['BCA-103'] : [],
  'clashes': [],
};

class Backend {
  Backend({
    this.password = 'correct-password',
    Map<String, dynamic>? access,
    this.timetable,
  }) : access =
           access ??
           {
             'userId': 'user_1',
             'email': 'student@example.com',
             'role': 'student',
             'permissions': ['student'],
             'identity': {'rollNo': 'GLA26-BCA-0001', 'facultyId': null},
             'isLinked': true,
           };

  final String password;

  /// Simulates Clerk's new-device check: password sign-in then an emailed code.
  bool requireEmailCode = false;
  Map<String, dynamic> access;
  Map<String, dynamic>? timetable;
  http.Response? timetableOverride;
  final List<http.Request> requests = [];
  int tokenRefreshes = 0;

  late final MockClient clerk = MockClient((request) async {
    requests.add(request);
    if (request.url.path == '/v1/client/sign_ins') {
      final form = Uri.splitQueryString(request.body);
      if (form['password'] != password) {
        return http.Response(
          jsonEncode({
            'errors': [
              {
                'code': 'form_password_incorrect',
                'message': 'Password is incorrect.',
                'long_message':
                    'Password is incorrect. Try again, or use another method.',
              },
            ],
          }),
          422,
        );
      }
      if (requireEmailCode) {
        return http.Response(
          jsonEncode({
            'response': {
              'id': 'sia_1',
              'object': 'sign_in_attempt',
              'status': 'needs_client_trust',
              'supported_second_factors': [
                {
                  'strategy': 'email_code',
                  'email_address_id': 'idn_1',
                  'safe_identifier': 's***@example.com',
                },
              ],
            },
          }),
          200,
          headers: {'authorization': 'client-token-1'},
        );
      }
    }
    if (request.url.path == '/v1/client/sign_ins/sia_1/prepare_second_factor') {
      final form = Uri.splitQueryString(request.body);
      return http.Response(
        jsonEncode({
          'response': {
            'id': 'sia_1',
            'status': 'needs_client_trust',
            'prepared_email': form['email_address_id'],
          },
        }),
        200,
      );
    }
    if (request.url.path == '/v1/client/sign_ins/sia_1/attempt_second_factor') {
      final form = Uri.splitQueryString(request.body);
      if (form['code'] != '424242') {
        return http.Response(
          jsonEncode({
            'errors': [
              {
                'code': 'form_code_incorrect',
                'message': 'Incorrect code',
                'long_message': 'The verification code is incorrect.',
              },
            ],
          }),
          422,
        );
      }
    }
    if (request.url.path == '/v1/client/sign_ins' ||
        request.url.path == '/v1/client/sign_ins/sia_1/attempt_second_factor') {
      return http.Response(
        jsonEncode({
          'response': {
            'object': 'sign_in_attempt',
            'status': 'complete',
            'created_session_id': 'sess_1',
          },
          'client': {
            'sessions': [
              {
                'id': 'sess_1',
                'last_active_token': {'jwt': 'jwt-initial'},
              },
            ],
          },
        }),
        200,
        headers: {'authorization': 'client-token-1'},
      );
    }
    if (request.url.path == '/v1/client/sessions/sess_1/tokens') {
      tokenRefreshes++;
      return http.Response(
        jsonEncode({'object': 'token', 'jwt': 'jwt-$tokenRefreshes'}),
        200,
      );
    }
    return http.Response('{}', 200);
  });

  late final MockClient server = MockClient((request) async {
    requests.add(request);
    http.Response envelope(Object data) =>
        http.Response(jsonEncode({'success': true, 'data': data}), 200);
    if (!(request.headers['Authorization'] ?? '').startsWith('Bearer jwt-')) {
      return http.Response(
        jsonEncode({
          'success': false,
          'error': {
            'code': 'UNAUTHORIZED',
            'message': 'Authentication required',
          },
        }),
        401,
      );
    }
    if (request.url.path == '/api/v1/access') return envelope(access);
    if (request.url.path == '/api/v1/student/me/link' &&
        request.method == 'POST') {
      final input = jsonDecode(request.body) as Map<String, dynamic>;
      final identity = Map<String, dynamic>.from(
        access['identity'] as Map<String, dynamic>,
      )..['rollNo'] = input['rollNo'];
      access = {...access, 'identity': identity, 'isLinked': true};
      return envelope({'rollNo': input['rollNo'], 'name': 'Akash Singh'});
    }
    if (request.url.path == '/api/v1/timetable/student') {
      if (timetableOverride != null) return timetableOverride!;
      if ((access['identity'] as Map)['rollNo'] == null) {
        return http.Response(
          jsonEncode({
            'success': false,
            'error': {
              'code': 'NOT_LINKED',
              'message': 'Your account is not linked to a student record.',
            },
          }),
          403,
        );
      }
      return envelope(timetable ?? timetableJson());
    }
    if (request.url.path == '/api/v1/timetable/faculty') {
      return envelope({
        'faculty': {
          'id': 'FAC-101',
          'name': 'Dr. Example',
          'department': 'CSED',
          'maxDuties': 5,
        },
        'status': 'PUBLISHED',
        'publication': {'version': 5},
        'duties': [
          examJson(
            'BCA-102',
            'Problem Solving with C',
            '2026-10-21',
            840,
            1020,
          ),
        ],
        'dutyCount': 1,
        'maxDuties': 5,
      });
    }
    return http.Response('{}', 404);
  });

  AppSession session() => AppSession(
    auth: ClerkAuth(frontendApi: fapi, client: clerk),
    apiBaseUrl: api,
    apiFactory: (tokens) =>
        ApiClient(baseUrl: api, tokenProvider: tokens, client: server),
  );
}

Future<void> pumpApp(
  WidgetTester tester,
  Backend backend, {
  Size size = const Size(400, 860),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(
    ExamOptApp(
      session: backend.session(),
      theme: ThemeData(useMaterial3: true),
      clock: () => now,
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> signIn(
  WidgetTester tester, {
  String password = 'correct-password',
}) async {
  await tester.enterText(
    find.widgetWithText(TextField, 'Email'),
    'student@example.com',
  );
  await tester.enterText(find.widgetWithText(TextField, 'Password'), password);
  await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
  await tester.pumpAndSettle();
}

void main() {
  group('configuration', () {
    test('uses the deployed ExamOpt server by default', () {
      expect(AppConfig.defaultApiBaseUrl, 'https://exam-opt-web.vercel.app');
      expect(AppConfig.apiBaseUrl, AppConfig.defaultApiBaseUrl);
    });

    test('decodes the Clerk Frontend API host from a publishable key', () {
      final key =
          'pk_test_${base64.encode(utf8.encode('welcome-ewe-3348.clerk.accounts.dev\$')).replaceAll('=', '')}';
      expect(
        AppConfig.frontendApiFromKey(key),
        'welcome-ewe-3348.clerk.accounts.dev',
      );
      expect(AppConfig.frontendApiFromKey('not-a-key'), isNull);
      expect(AppConfig.frontendApiFromKey('sk_test_abc'), isNull);
    });

    testWidgets(
      'a build without API settings says so instead of pretending to work',
      (tester) async {
        await tester.pumpWidget(
          ExamOptApp(session: AppSession(), theme: ThemeData()),
        );
        await tester.pumpAndSettle();
        expect(find.textContaining('CLERK_PUBLISHABLE_KEY'), findsOneWidget);
        expect(find.widgetWithText(FilledButton, 'Sign in'), findsNothing);
      },
    );
  });

  testWidgets(
    'sign-in shows the student\'s own published exams, fetched with a Bearer token and no roll number',
    (tester) async {
      final backend = Backend();
      await pumpApp(tester, backend);
      expect(find.text('Sign in'), findsOneWidget);
      await signIn(tester);

      expect(find.text('Akash Singh'), findsOneWidget);
      expect(find.text('Next examination'), findsOneWidget);
      // BCA-101 (19 Oct) is over at "now" (20 Oct, 08:00); BCA-102 on 21 Oct is next.
      expect(find.text('Problem Solving with C'), findsOneWidget);
      expect(find.text('Tomorrow'), findsOneWidget);
      expect(
        find.textContaining('Not in the published timetable: BCA-103'),
        findsOneWidget,
      );

      final timetableCalls = backend.requests
          .where((r) => r.url.path == '/api/v1/timetable/student')
          .toList();
      expect(timetableCalls, hasLength(1));
      expect(timetableCalls.single.url.queryParameters, isEmpty);
      expect(
        timetableCalls.single.headers['Authorization'],
        startsWith('Bearer jwt-'),
      );
    },
  );

  testWidgets(
    'the timetable tab groups exams by date and filters completed ones',
    (tester) async {
      final backend = Backend();
      await pumpApp(tester, backend);
      await signIn(tester);
      await tester.tap(find.text('Timetable'));
      await tester.pumpAndSettle();
      expect(find.text('Problem Solving with C'), findsOneWidget);
      expect(
        find.text('Mathematical Foundation'),
        findsNothing,
      ); // upcoming filter
      await tester.tap(find.text('Completed'));
      await tester.pumpAndSettle();
      expect(find.text('Mathematical Foundation'), findsOneWidget);
      await tester.tap(find.text('Mathematical Foundation'));
      await tester.pumpAndSettle();
      expect(find.text('Room'), findsOneWidget);
      expect(find.text('CSED Block AB-XI AB11-201 (AB11-201)'), findsOneWidget);
    },
  );

  testWidgets('a wrong password shows Clerk\'s message and stays on sign-in', (
    tester,
  ) async {
    final backend = Backend();
    await pumpApp(tester, backend);
    await signIn(tester, password: 'wrong');
    expect(find.textContaining('Password is incorrect'), findsOneWidget);
    expect(find.text('Next examination'), findsNothing);
    expect(
      backend.requests.where((r) => r.url.host == 'examopt.test'),
      isEmpty,
    );
  });

  testWidgets(
    'an account the server has not linked sees an explanation, not someone else\'s data',
    (tester) async {
      final backend = Backend(
        access: {
          'userId': 'user_2',
          'email': 'new@example.com',
          'role': 'student',
          'permissions': ['student'],
          'identity': {'rollNo': null, 'facultyId': null},
          'isLinked': false,
        },
      );
      await pumpApp(tester, backend);
      await signIn(tester);
      expect(find.text('Link your student record'), findsOneWidget);
      expect(
        backend.requests.where(
          (r) => r.url.path == '/api/v1/timetable/student',
        ),
        isEmpty,
      );
      await tester.enterText(find.byType(TextField), 'GLA26-BCA-0001');
      await tester.ensureVisible(find.text('Continue to my timetable'));
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNotNull,
      );
      await tester.tap(find.text('Continue to my timetable'));
      await tester.pumpAndSettle();
      expect(
        backend.requests.where(
          (r) => r.url.path == '/api/v1/student/me/link' && r.method == 'POST',
        ),
        hasLength(1),
      );
      expect(
        backend.requests.where(
          (r) => r.url.path == '/api/v1/timetable/student',
        ),
        hasLength(1),
      );
      expect(find.text('Akash Singh'), findsOneWidget);
    },
  );

  testWidgets('no published timetable is stated truthfully', (tester) async {
    final backend = Backend(timetable: timetableJson(published: false));
    await pumpApp(tester, backend);
    await signIn(tester);
    expect(
      find.textContaining('No examination timetable has been published yet'),
      findsOneWidget,
    );
  });

  testWidgets('a server error shows a retry, and retry loads the data', (
    tester,
  ) async {
    final backend = Backend()
      ..timetableOverride = http.Response(
        jsonEncode({
          'success': false,
          'error': {
            'code': 'DATA_SOURCE_UNAVAILABLE',
            'message':
                'The scheduling data service is temporarily unavailable.',
          },
        }),
        503,
      );
    await pumpApp(tester, backend);
    await signIn(tester);
    expect(find.text('Could not load your timetable'), findsOneWidget);
    expect(find.text('Akash Singh'), findsNothing);
    backend.timetableOverride = null;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(find.text('Akash Singh'), findsOneWidget);
  });

  testWidgets('a session the server rejects returns to sign-in', (
    tester,
  ) async {
    final backend = Backend()
      ..timetableOverride = http.Response(
        jsonEncode({
          'success': false,
          'error': {
            'code': 'UNAUTHORIZED',
            'message': 'Authentication required',
          },
        }),
        401,
      );
    await pumpApp(tester, backend);
    await signIn(tester);
    expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);
    expect(find.textContaining('Sign in again'), findsOneWidget);
  });

  testWidgets('a linked invigilator gets a Duties tab with their own duties', (
    tester,
  ) async {
    final backend = Backend(
      access: {
        'userId': 'user_3',
        'email': 'fac@example.com',
        'role': 'student',
        'permissions': ['student'],
        'identity': {'rollNo': null, 'facultyId': 'FAC-101'},
        'isLinked': false,
      },
    );
    await pumpApp(tester, backend);
    await signIn(tester);
    expect(find.text('Invigilation duties'), findsOneWidget);
    expect(find.text('Problem Solving with C'), findsOneWidget);
    expect(find.text('Timetable'), findsNothing);
  });

  testWidgets(
    'a warning appears when the published timetable fails validation against today\'s data',
    (tester) async {
      final backend = Backend(timetable: timetableJson(valid: false));
      await pumpApp(tester, backend);
      await signIn(tester);
      expect(find.textContaining('being reviewed'), findsOneWidget);
    },
  );

  testWidgets('renders on a small phone without layout overflow', (
    tester,
  ) async {
    final backend = Backend();
    await pumpApp(tester, backend, size: const Size(320, 568));
    await signIn(tester);
    for (final tab in ['Timetable', 'Profile', 'Home']) {
      await tester.tap(find.text(tab).last);
      await tester.pumpAndSettle();
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'a new-device sign-in asks for the emailed code, refuses a wrong one, and completes with the right one',
    (tester) async {
      final backend = Backend()..requireEmailCode = true;
      await pumpApp(tester, backend);
      await signIn(tester);
      expect(find.text('Check your email'), findsOneWidget);
      expect(find.textContaining('s***@example.com'), findsOneWidget);
      expect(
        backend.requests.any(
          (r) =>
              r.url.path.endsWith('/prepare_second_factor') &&
              Uri.splitQueryString(r.body)['strategy'] == 'email_code',
        ),
        isTrue,
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Verification code'),
        '111111',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Verify and sign in'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('verification code is incorrect'),
        findsOneWidget,
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Verification code'),
        '424242',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Verify and sign in'));
      await tester.pumpAndSettle();
      expect(find.text('Akash Singh'), findsOneWidget);
    },
  );
}
