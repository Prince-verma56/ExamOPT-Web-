import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/models.dart';
import '../theme/app_theme.dart';

final _dateFormat = DateFormat('EEE, d MMM yyyy');
String formatExamDate(DateTime? date) =>
    date == null ? 'Date not set' : _dateFormat.format(date);

/// One examination or duty: what, when and where, straight from the published schedule.
class ExamCard extends StatelessWidget {
  const ExamCard({
    super.key,
    required this.exam,
    required this.now,
    this.onTap,
    this.highlight = false,
  });

  final ExamItem exam;
  final DateTime now;
  final VoidCallback? onTap;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final past = exam.isPast(now);
    final days = exam.daysFrom(now);
    final badge = past
        ? 'Done'
        : days == null
        ? null
        : days == 0
        ? 'Today'
        : days == 1
        ? 'Tomorrow'
        : 'In $days days';
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: highlight ? AppColors.primary : AppColors.borderLight,
          width: highlight ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: exam.requiresLab
                          ? AppColors.pillPurpleBg
                          : AppColors.pillBlueBg,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      exam.examId,
                      style: textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: exam.requiresLab
                            ? AppColors.pillPurple
                            : AppColors.pillBlue,
                      ),
                    ),
                  ),
                  if (exam.requiresLab) ...[
                    const SizedBox(width: 6),
                    Text(
                      'Practical',
                      style: textTheme.labelSmall?.copyWith(
                        color: AppColors.pillPurple,
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (badge != null)
                    Text(
                      badge,
                      style: textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: past
                            ? AppColors.textTertiaryLight
                            : AppColors.primary,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                exam.name ?? exam.examId,
                style: textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: past ? AppColors.textSecondaryLight : null,
                ),
              ),
              const SizedBox(height: 8),
              _Meta(icon: Icons.event_rounded, text: formatExamDate(exam.date)),
              _Meta(
                icon: Icons.schedule_rounded,
                text:
                    '${exam.timeRange}${exam.durationLabel.isEmpty ? '' : ' · ${exam.durationLabel}'}',
              ),
              _Meta(icon: Icons.meeting_room_outlined, text: exam.roomLabel),
            ],
          ),
        ),
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 3),
    child: Row(
      children: [
        Icon(icon, size: 15, color: AppColors.textSecondaryLight),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text, style: Theme.of(context).textTheme.bodySmall),
        ),
      ],
    ),
  );
}
