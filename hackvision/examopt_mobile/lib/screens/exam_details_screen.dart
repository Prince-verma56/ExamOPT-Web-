import 'package:flutter/material.dart';

import '../core/models.dart';
import '../theme/app_theme.dart';
import '../widgets/exam_card.dart';

/// Details of one published examination. Every value comes from the server's
/// schedule; fields the server does not provide are not shown.
class ExamDetailsScreen extends StatelessWidget {
  const ExamDetailsScreen({
    super.key,
    required this.exam,
    required this.now,
    this.asDuty = false,
  });

  final ExamItem exam;
  final DateTime now;
  final bool asDuty;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final days = exam.daysFrom(now);
    final rows = <(IconData, String, String)>[
      (Icons.event_rounded, 'Date', formatExamDate(exam.date)),
      (Icons.schedule_rounded, 'Time', exam.timeRange),
      if (exam.durationLabel.isNotEmpty)
        (Icons.timelapse_rounded, 'Duration', exam.durationLabel),
      (
        Icons.view_day_outlined,
        'Session',
        '${exam.slotId}${exam.session != null ? ' · ${exam.session}' : ''}',
      ),
      (Icons.meeting_room_outlined, 'Room', exam.roomLabel),
      if (exam.roomType != null)
        (
          Icons.science_outlined,
          'Room type',
          exam.roomType == 'LAB' ? 'Laboratory' : 'Theory room',
        ),
      if (asDuty && exam.students != null)
        (
          Icons.groups_outlined,
          'Candidates',
          '${exam.students}${exam.roomCapacity != null ? ' of ${exam.roomCapacity} seats' : ''}',
        ),
      if (!asDuty && exam.facultyName != null)
        (Icons.badge_outlined, 'Invigilator', exam.facultyName!),
      if (exam.program != null)
        (
          Icons.school_outlined,
          'Programme',
          '${exam.program}${exam.semester != null ? ', semester ${exam.semester}' : ''}',
        ),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(exam.examId)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            exam.name ?? exam.examId,
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            [
              exam.requiresLab ? 'Practical examination' : 'Theory examination',
              if (days != null)
                exam.isPast(now)
                    ? 'completed'
                    : days == 0
                    ? 'today'
                    : days == 1
                    ? 'tomorrow'
                    : 'in $days days',
            ].join(' · '),
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondaryLight,
            ),
          ),
          const SizedBox(height: 20),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                for (final (icon, label, value) in rows)
                  ListTile(
                    dense: true,
                    leading: Icon(icon, color: AppColors.primary),
                    title: Text(
                      label,
                      style: textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    subtitle: Text(value, style: textTheme.bodyLarge),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'From the published timetable on the ExamOpt server. Reporting instructions come from the examination office.',
            style: textTheme.bodySmall?.copyWith(
              color: AppColors.textTertiaryLight,
            ),
          ),
        ],
      ),
    );
  }
}
