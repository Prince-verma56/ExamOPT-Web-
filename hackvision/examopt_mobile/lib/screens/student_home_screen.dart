import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../theme/app_theme.dart';
import '../widgets/exam_card.dart';
import '../widgets/state_views.dart';
import 'exam_details_screen.dart';

/// Overview of the signed-in student's published timetable.
class StudentHomeScreen extends StatelessWidget {
  const StudentHomeScreen({
    super.key,
    required this.state,
    required this.error,
    required this.loading,
    required this.now,
    required this.onRefresh,
    required this.onOpenTimetable,
  });

  final StudentTimetable? state;
  final ApiException? error;
  final bool loading;
  final DateTime now;
  final Future<void> Function() onRefresh;
  final VoidCallback onOpenTimetable;

  @override
  Widget build(BuildContext context) {
    final data = state;
    if (data == null) {
      if (error != null) return _errorView(error!, onRefresh);
      return const LoadingView();
    }
    final textTheme = Theme.of(context).textTheme;
    final upcoming = data.exams.where((e) => !e.isPast(now)).toList();
    final next = upcoming.isEmpty ? null : upcoming.first;
    final s = data.student;

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          Text(
            'Hello,',
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondaryLight,
            ),
          ),
          Text(
            s.name.isEmpty ? s.rollNo : s.name,
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            [
              s.rollNo,
              if (s.program != null) s.program!,
              if (s.semester != null) 'Semester ${s.semester}',
              if (s.groupName != null) s.groupName!,
            ].join(' · '),
            style: textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondaryLight,
            ),
          ),
          if (loading)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          if (error != null) ...[
            const SizedBox(height: 12),
            _Notice(
              icon: Icons.cloud_off_rounded,
              color: AppColors.warning,
              text:
                  'Could not refresh: ${error!.message} Showing the last data received.',
            ),
          ],
          const SizedBox(height: 20),
          if (!data.published)
            const _Notice(
              icon: Icons.hourglass_empty_rounded,
              color: AppColors.primary,
              text: 'No examination timetable has been published yet. Pull down to check again later.',
            )
          else ...[
            if (data.valid == false) ...[
              const _Notice(
                icon: Icons.report_problem_outlined,
                color: AppColors.warning,
                text: 'The examination office changed data after this timetable was published, and it is being reviewed. Check again before your exams.',
              ),
              const SizedBox(height: 12),
            ],
            if (data.clashes.isNotEmpty) ...[
              _Notice(
                icon: Icons.error_outline_rounded,
                color: AppColors.error,
                text:
                    'Two of your exams overlap: ${data.clashes.map((c) => c.join(' and ')).join('; ')}. Contact the examination office.',
              ),
              const SizedBox(height: 12),
            ],
            Text(
              'Next examination',
              style: textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            if (next == null)
              const _Notice(
                icon: Icons.check_circle_outline_rounded,
                color: AppColors.success,
                text: 'You have no upcoming examinations in the published timetable.',
              )
            else
              ExamCard(
                exam: next,
                now: now,
                highlight: true,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ExamDetailsScreen(exam: next, now: now),
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _Stat(
                    label: 'Scheduled',
                    value: '${data.exams.length}',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _Stat(label: 'Upcoming', value: '${upcoming.length}'),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _Stat(
                    label: 'Enrolled',
                    value: '${s.subjectIds.length}',
                  ),
                ),
              ],
            ),
            if (data.notInPublishedSchedule.isNotEmpty) ...[
              const SizedBox(height: 12),
              _Notice(
                icon: Icons.info_outline_rounded,
                color: AppColors.warning,
                text:
                    'Not in the published timetable: ${data.notInPublishedSchedule.join(', ')}. Ask the examination office about these subjects.',
              ),
            ],
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onOpenTimetable,
              icon: const Icon(Icons.calendar_today_rounded, size: 18),
              label: const Text('Full timetable'),
            ),
            const SizedBox(height: 16),
            if (data.publication != null)
              Text(
                'Published timetable version ${data.publication!.version}${data.publication!.publishedAt != null ? ', ${DateFormat('d MMM yyyy, HH:mm').format(data.publication!.publishedAt!.toLocal())}' : ''}. Pull down to refresh.',
                style: textTheme.bodySmall?.copyWith(
                  color: AppColors.textTertiaryLight,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

Widget _errorView(ApiException error, Future<void> Function() onRefresh) {
  if (error.isNotLinked) {
    return MessageView(
      icon: Icons.link_off_rounded,
      tone: MessageTone.warning,
      title: 'Account not linked',
      message: error.message,
      actionLabel: 'Try again',
      onAction: onRefresh,
    );
  }
  return MessageView(
    icon: error.isNetwork
        ? Icons.cloud_off_rounded
        : Icons.error_outline_rounded,
    tone: MessageTone.error,
    title: error.isNetwork
        ? 'Cannot reach the server'
        : 'Could not load your timetable',
    message: error.message,
    actionLabel: 'Retry',
    onAction: onRefresh,
  );
}

Widget timetableErrorView(
  ApiException error,
  Future<void> Function() onRefresh,
) => _errorView(error, onRefresh);

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      border: Border.all(color: AppColors.borderLight),
      borderRadius: BorderRadius.circular(14),
      color: Theme.of(context).colorScheme.surface,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: AppColors.textSecondaryLight),
        ),
      ],
    ),
  );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.color, required this.text});
  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      border: Border.all(color: color.withValues(alpha: 0.3)),
      borderRadius: BorderRadius.circular(14),
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
