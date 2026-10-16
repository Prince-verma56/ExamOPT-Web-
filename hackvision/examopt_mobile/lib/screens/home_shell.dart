import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../state/app_session.dart';
import '../widgets/state_views.dart';
import 'faculty_duties_screen.dart';
import 'profile_screen.dart';
import 'student_home_screen.dart';
import 'student_timetable_screen.dart';

/// Loads data for whatever the server says this account is linked to, and
/// shows only the matching tabs. Data is fetched on sign-in and on pull to
/// refresh; there is no background or real-time synchronisation.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, this.clock});

  /// Injectable "now" for tests; defaults to the device clock.
  final DateTime Function()? clock;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _Load<T> {
  const _Load({this.data, this.error, this.loading = false});
  final T? data;
  final ApiException? error;
  final bool loading;
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  _Load<StudentTimetable> _student = const _Load();
  _Load<FacultyDuties> _faculty = const _Load();
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_started) {
      _started = true;
      _refresh();
    }
  }

  Future<void> _refresh() async {
    final session = SessionScope.of(context);
    final access = session.access, api = session.api;
    if (access == null || api == null) return;
    final futures = <Future<void>>[];
    if (access.isLinkedStudent) {
      setState(() => _student = _Load(data: _student.data, loading: true));
      futures.add(
        api
            .studentTimetable()
            .then((d) => _set(() => _student = _Load(data: d)))
            .catchError(
              (Object e) => _fail(
                e,
                (err) => _student = _Load(error: err, data: _student.data),
              ),
            ),
      );
    }
    if (access.isLinkedFaculty) {
      setState(() => _faculty = _Load(data: _faculty.data, loading: true));
      futures.add(
        api
            .facultyDuties()
            .then((d) => _set(() => _faculty = _Load(data: d)))
            .catchError(
              (Object e) => _fail(
                e,
                (err) => _faculty = _Load(error: err, data: _faculty.data),
              ),
            ),
      );
    }
    await Future.wait(futures);
  }

  void _set(VoidCallback update) {
    if (mounted) setState(update);
  }

  void _fail(Object error, void Function(ApiException) update) {
    final err = error is ApiException
        ? error
        : ApiException(0, 'UNKNOWN', error.toString());
    if (err.isUnauthorized && mounted) {
      SessionScope.of(context).expire(err.message);
      return;
    }
    _set(() => update(err));
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final access = session.access!;
    final now = (widget.clock ?? DateTime.now)();

    if (!access.isLinkedStudent && !access.isLinkedFaculty) {
      return Scaffold(
        body: SafeArea(
          child: MessageView(
            icon: access.isAdmin
                ? Icons.admin_panel_settings_outlined
                : Icons.link_off_rounded,
            tone: MessageTone.warning,
            title: access.isAdmin
                ? 'Administrator account'
                : 'Account not linked',
            message: access.isAdmin
                ? 'Administrators manage timetables in the ExamOpt web workspace. This app shows a student\'s or an invigilator\'s own timetable, so an administrator account needs a linked roll number or faculty id to use it.'
                : 'You are signed in as ${access.email ?? 'this account'}, but it is not linked to a student roll number or faculty id. Ask the examination office to link it, then refresh.',
            actionLabel: session.busy ? null : 'Check again',
            onAction: session.reloadAccess,
            secondaryLabel: 'Sign out',
            onSecondary: session.signOut,
          ),
        ),
      );
    }

    final tabs = <({String label, IconData icon, Widget body})>[
      if (access.isLinkedStudent) ...[
        (
          label: 'Home',
          icon: Icons.home_rounded,
          body: StudentHomeScreen(
            state: _student.data,
            error: _student.error,
            loading: _student.loading,
            now: now,
            onRefresh: _refresh,
            onOpenTimetable: () => setState(() => _tab = 1),
          ),
        ),
        (
          label: 'Timetable',
          icon: Icons.calendar_today_rounded,
          body: StudentTimetableScreen(
            state: _student.data,
            error: _student.error,
            loading: _student.loading,
            now: now,
            onRefresh: _refresh,
          ),
        ),
      ],
      if (access.isLinkedFaculty)
        (
          label: 'Duties',
          icon: Icons.assignment_outlined,
          body: FacultyDutiesScreen(
            state: _faculty.data,
            error: _faculty.error,
            loading: _faculty.loading,
            now: now,
            onRefresh: _refresh,
          ),
        ),
      (
        label: 'Profile',
        icon: Icons.person_outline_rounded,
        body: ProfileScreen(
          access: access,
          student: _student.data?.student,
          faculty: _faculty.data,
        ),
      ),
    ];
    final index = _tab.clamp(0, tabs.length - 1);

    return Scaffold(
      body: SafeArea(bottom: false, child: tabs[index].body),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          for (final t in tabs)
            NavigationDestination(icon: Icon(t.icon), label: t.label),
        ],
      ),
    );
  }
}
