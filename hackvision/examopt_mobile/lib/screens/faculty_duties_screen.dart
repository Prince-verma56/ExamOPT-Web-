import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/models.dart';
import '../theme/app_theme.dart';
import '../widgets/exam_card.dart';
import '../widgets/state_views.dart';
import 'exam_details_screen.dart';

/// The signed-in invigilator's duties in the active published timetable.
class FacultyDutiesScreen extends StatelessWidget {
  const FacultyDutiesScreen({
    super.key,
    required this.state,
    required this.error,
    required this.loading,
    required this.now,
    required this.onRefresh,
  });

  final FacultyDuties? state;
  final ApiException? error;
  final bool loading;
  final DateTime now;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final data = state;
    if (data == null) {
      if (error != null) {
        return MessageView(
          icon: error!.isNetwork
              ? Icons.cloud_off_rounded
              : Icons.error_outline_rounded,
          tone: MessageTone.error,
          title: 'Could not load your duties',
          message: error!.message,
          actionLabel: 'Retry',
          onAction: onRefresh,
        );
      }
      return const LoadingView();
    }
    final textTheme = Theme.of(context).textTheme;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          Text(
            'Invigilation duties',
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${data.name} · ${data.facultyId}${data.department != null ? ' · ${data.department}' : ''}',
            style: textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondaryLight,
            ),
          ),
          if (loading)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          const SizedBox(height: 16),
          if (!data.published)
            Text(
              'No examination timetable has been published yet.',
              style: textTheme.bodyMedium,
            )
          else if (data.duties.isEmpty)
            Text(
              'You have no invigilation duties in the published timetable.',
              style: textTheme.bodyMedium,
            )
          else ...[
            Text(
              '${data.duties.length} dut${data.duties.length == 1 ? 'y' : 'ies'}${data.maxDuties != null ? ' (limit ${data.maxDuties})' : ''}',
              style: textTheme.labelLarge?.copyWith(
                color: AppColors.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 8),
            for (final duty in data.duties)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ExamCard(
                  exam: duty,
                  now: now,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) =>
                          ExamDetailsScreen(exam: duty, now: now, asDuty: true),
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
