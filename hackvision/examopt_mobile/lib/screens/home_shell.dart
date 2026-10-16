import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../state/app_session.dart';
import '../theme/app_theme.dart';
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
  String? _loadedIdentity;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final access = SessionScope.of(context).access;
    final identity = '${access?.rollNo ?? ''}:${access?.facultyId ?? ''}';
    if (_loadedIdentity != identity) {
      _loadedIdentity = identity;
      if (access?.isLinkedStudent == true || access?.isLinkedFaculty == true) {
        _refresh();
      }
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
      if (!access.isAdmin) {
        return const _LinkStudentView();
      }
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

class _LinkStudentView extends StatefulWidget {
  const _LinkStudentView();

  @override
  State<_LinkStudentView> createState() => _LinkStudentViewState();
}

class _LinkStudentViewState extends State<_LinkStudentView> {
  final _rollNo = TextEditingController();

  @override
  void dispose() {
    _rollNo.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student account'),
        actions: [
          TextButton(
            onPressed: session.busy ? null : session.signOut,
            child: const Text('Sign out'),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(
                    Icons.school_outlined,
                    size: 48,
                    color: AppColors.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Link your student record',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Enter your roll number. To protect your timetable, it must match the institutional email verified on your ExamOpt account.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _rollNo,
                    textCapitalization: TextCapitalization.characters,
                    textInputAction: TextInputAction.done,
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (_) =>
                        session.linkStudent(_rollNo.text.trim()),
                    decoration: const InputDecoration(
                      labelText: 'Student roll number',
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                  ),
                  if (session.error != null) ...[
                    const SizedBox(height: 12),
                    MessageView(
                      icon: Icons.error_outline_rounded,
                      tone: MessageTone.warning,
                      title: 'Could not link account',
                      message: session.error!,
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: session.busy
                        ? null
                        : () {
                            final rollNo = _rollNo.text.trim();
                            if (rollNo.isNotEmpty) {
                              session.linkStudent(rollNo);
                            }
                          },
                    child: session.busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Continue to my timetable'),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'If your record is not set up with your institutional email yet, contact the examination office.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
