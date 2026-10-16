import 'package:flutter/material.dart';

import '../core/models.dart';
import '../state/app_session.dart';
import '../theme/app_theme.dart';

/// Who the server says you are, and how this app connects.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.access,
    required this.student,
    required this.faculty,
  });

  final AccessSummary access;
  final StudentRecord? student;
  final FacultyDuties? faculty;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final rows = <(String, String)>[
      if (access.email != null) ('Email', access.email!),
      ('Role (decided by the server)', access.role),
      if (student != null) ...[
        ('Name', student!.name),
        ('Roll number', student!.rollNo),
        if (student!.program != null)
          (
            'Programme',
            '${student!.program}${student!.semester != null ? ', semester ${student!.semester}' : ''}',
          ),
        if (student!.groupName != null)
          ('Group', '${student!.groupName} (${student!.groupId})'),
        ('Enrolled subjects', student!.subjectIds.join(', ')),
        ('Backlog subjects', student!.hasBacklog ? 'Yes' : 'No'),
      ] else if (access.rollNo != null)
        ('Roll number', access.rollNo!),
      if (faculty != null) ...[
        ('Faculty id', faculty!.facultyId),
        if (faculty!.department != null) ('Department', faculty!.department!),
      ] else if (access.facultyId != null)
        ('Faculty id', access.facultyId!),
      ('Server', SessionScope.of(context).apiBaseUrl),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Text(
          'Profile',
          style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 16),
        Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              for (final (label, value) in rows)
                ListTile(
                  dense: true,
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
        const SizedBox(height: 12),
        Text(
          'Your records are managed by the examination office. To correct them, contact the office; this app cannot change them.',
          style: textTheme.bodySmall?.copyWith(
            color: AppColors.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: () => SessionScope.of(context).signOut(),
          icon: const Icon(Icons.logout_rounded, size: 18),
          label: const Text('Sign out'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.error,
            minimumSize: const Size.fromHeight(46),
          ),
        ),
      ],
    );
  }
}
