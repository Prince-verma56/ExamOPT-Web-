import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../theme/app_theme.dart';
import '../widgets/exam_card.dart';
import '../widgets/state_views.dart';
import 'exam_details_screen.dart';
import 'student_home_screen.dart';

/// Every published exam of the student, grouped by date.
class StudentTimetableScreen extends StatefulWidget {
  const StudentTimetableScreen({
    super.key,
    required this.state,
    required this.error,
    required this.loading,
    required this.now,
    required this.onRefresh,
  });

  final StudentTimetable? state;
  final ApiException? error;
  final bool loading;
  final DateTime now;
  final Future<void> Function() onRefresh;

  @override
  State<StudentTimetableScreen> createState() => _StudentTimetableScreenState();
}

enum _Filter { all, upcoming, completed }

class _StudentTimetableScreenState extends State<StudentTimetableScreen> {
  _Filter _filter = _Filter.upcoming;

  @override
  Widget build(BuildContext context) {
    final data = widget.state;
    if (data == null) {
      return widget.error != null
          ? timetableErrorView(widget.error!, widget.onRefresh)
          : const LoadingView();
    }
    if (!data.published) {
      return MessageView(
        icon: Icons.hourglass_empty_rounded,
        title: 'Not published yet',
        message:
            'No examination timetable has been published. Check again later.',
        actionLabel: 'Refresh',
        onAction: widget.onRefresh,
      );
    }
    final exams = data.exams
        .where(
          (e) => switch (_filter) {
            _Filter.all => true,
            _Filter.upcoming => !e.isPast(widget.now),
            _Filter.completed => e.isPast(widget.now),
          },
        )
        .toList();
    final groups = <String, List<ExamItem>>{};
    for (final e in exams) {
      groups.putIfAbsent(formatExamDate(e.date), () => []).add(e);
    }

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          Text(
            'My timetable',
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          SegmentedButton<_Filter>(
            segments: const [
              ButtonSegment(value: _Filter.upcoming, label: Text('Upcoming')),
              ButtonSegment(value: _Filter.completed, label: Text('Completed')),
              ButtonSegment(value: _Filter.all, label: Text('All')),
            ],
            selected: {_filter},
            onSelectionChanged: (s) => setState(() => _filter = s.first),
          ),
          if (widget.loading)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          const SizedBox(height: 16),
          if (exams.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Text(
                _filter == _Filter.completed
                    ? 'No completed examinations yet.'
                    : _filter == _Filter.upcoming
                    ? 'No upcoming examinations.'
                    : 'No examinations in the published timetable.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: AppColors.textSecondaryLight),
              ),
            ),
          for (final entry in groups.entries) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 8, top: 4),
              child: Text(
                entry.key,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondaryLight,
                ),
              ),
            ),
            for (final exam in entry.value)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ExamCard(
                  exam: exam,
                  now: widget.now,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) =>
                          ExamDetailsScreen(exam: exam, now: widget.now),
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
