/// Models for the ExamOpt API v1 responses (the same endpoints the web app uses).
/// Every field comes from the server; nothing is filled in with sample values.
library;

String? _s(Object? v) => v?.toString();
int? _i(Object? v) =>
    v is int ? v : (v is num ? v.toInt() : int.tryParse('${v ?? ''}'));

/// GET /api/v1/access: who the server says the caller is.
class AccessSummary {
  const AccessSummary({
    required this.userId,
    required this.email,
    required this.role,
    required this.rollNo,
    required this.facultyId,
  });

  final String? userId;
  final String? email;

  /// admin, student, user or guest, decided by the server.
  final String role;
  final String? rollNo;
  final String? facultyId;

  bool get isAdmin => role == 'admin';
  bool get isLinkedStudent => rollNo != null && rollNo!.isNotEmpty;
  bool get isLinkedFaculty => facultyId != null && facultyId!.isNotEmpty;

  factory AccessSummary.fromJson(Map<String, dynamic> json) {
    final identity = json['identity'] as Map<String, dynamic>? ?? const {};
    return AccessSummary(
      userId: _s(json['userId']),
      email: _s(json['email']),
      role: _s(json['role']) ?? 'guest',
      rollNo: _s(identity['rollNo']),
      facultyId: _s(identity['facultyId']),
    );
  }
}

class Publication {
  const Publication({
    required this.version,
    required this.title,
    required this.publishedAt,
  });
  final int version;
  final String title;
  final DateTime? publishedAt;

  static Publication? fromJson(Object? json) {
    if (json is! Map<String, dynamic>) return null;
    return Publication(
      version: _i(json['version']) ?? 0,
      title: _s(json['title']) ?? 'Examination timetable',
      publishedAt: DateTime.tryParse(_s(json['publishedAt']) ?? ''),
    );
  }
}

String _clock(int minutes) {
  final h = minutes ~/ 60, m = minutes % 60;
  final h12 = ((h + 11) % 12) + 1;
  return '${h12.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')} ${h < 12 ? 'AM' : 'PM'}';
}

/// One scheduled examination (an assignment of the published run).
class ExamItem {
  const ExamItem({
    required this.examId,
    required this.name,
    required this.program,
    required this.semester,
    required this.durationMinutes,
    required this.requiresLab,
    required this.slotId,
    required this.date,
    required this.startMinutes,
    required this.endMinutes,
    required this.session,
    required this.roomId,
    required this.roomName,
    required this.roomType,
    required this.roomCapacity,
    required this.students,
    required this.facultyName,
  });

  final String examId;
  final String? name;
  final String? program;
  final int? semester;
  final int? durationMinutes;
  final bool requiresLab;
  final String slotId;
  final DateTime? date;
  final int? startMinutes;
  final int? endMinutes;
  final String? session;
  final String roomId;
  final String? roomName;
  final String? roomType;
  final int? roomCapacity;
  final int? students;
  final String? facultyName;

  factory ExamItem.fromJson(Map<String, dynamic> json) => ExamItem(
    examId: _s(json['examId']) ?? '',
    name: _s(json['examName']),
    program: _s(json['program']),
    semester: _i(json['semester']),
    durationMinutes: _i(json['durationMinutes']),
    requiresLab: json['requiresLab'] == true,
    slotId: _s(json['slotId']) ?? '',
    date: DateTime.tryParse(_s(json['date']) ?? ''),
    startMinutes: _i(json['startMinutes']),
    endMinutes: _i(json['endMinutes']),
    session: _s(json['session']),
    roomId: _s(json['roomId']) ?? '',
    roomName: _s(json['roomName']),
    roomType: _s(json['roomType']),
    roomCapacity: _i(json['roomCapacity']),
    students: _i(json['students']),
    facultyName: _s(json['facultyName']),
  );

  /// Start of the exam in local wall-clock terms, or null when the slot has no date.
  DateTime? get startsAt => date == null || startMinutes == null
      ? null
      : DateTime(
          date!.year,
          date!.month,
          date!.day,
          startMinutes! ~/ 60,
          startMinutes! % 60,
        );

  String get timeRange => startMinutes == null || endMinutes == null
      ? 'Time not set'
      : '${_clock(startMinutes!)} - ${_clock(endMinutes!)}';
  String get durationLabel => durationMinutes == null
      ? ''
      : durationMinutes! % 60 == 0
      ? '${durationMinutes! ~/ 60} hours'
      : '$durationMinutes minutes';
  String get roomLabel =>
      roomName == null || roomName == roomId ? roomId : '$roomName ($roomId)';

  /// Whole days from [now] to the exam date (0 = today, negative = past).
  int? daysFrom(DateTime now) {
    if (date == null) return null;
    final today = DateTime(now.year, now.month, now.day);
    return DateTime(
      date!.year,
      date!.month,
      date!.day,
    ).difference(today).inDays;
  }

  bool isPast(DateTime now) {
    final end = date == null || endMinutes == null
        ? null
        : DateTime(
            date!.year,
            date!.month,
            date!.day,
            endMinutes! ~/ 60,
            endMinutes! % 60,
          );
    return end != null && end.isBefore(now);
  }
}

class StudentRecord {
  const StudentRecord({
    required this.rollNo,
    required this.name,
    required this.groupId,
    required this.groupName,
    required this.program,
    required this.semester,
    required this.hasBacklog,
    required this.subjectIds,
  });
  final String rollNo;
  final String name;
  final String groupId;
  final String? groupName;
  final String? program;
  final int? semester;
  final bool hasBacklog;
  final List<String> subjectIds;

  factory StudentRecord.fromJson(Map<String, dynamic> json) => StudentRecord(
    rollNo: _s(json['rollNo']) ?? '',
    name: _s(json['name']) ?? '',
    groupId: _s(json['groupId']) ?? '',
    groupName: _s(json['groupName']),
    program: _s(json['program']),
    semester: _i(json['semester']),
    hasBacklog: json['hasBacklog'] == true,
    subjectIds: ((json['subjectIds'] as List?) ?? const [])
        .map((e) => '$e')
        .toList(),
  );
}

/// GET /api/v1/timetable/student: the caller's own exams from the active publication.
class StudentTimetable {
  const StudentTimetable({
    required this.student,
    required this.publication,
    required this.published,
    required this.valid,
    required this.exams,
    required this.notInPublishedSchedule,
    required this.clashes,
  });
  final StudentRecord student;
  final Publication? publication;

  /// False when no timetable has been published yet.
  final bool published;

  /// Whether the published schedule still passes every hard rule against today's data (null when unpublished).
  final bool? valid;
  final List<ExamItem> exams;

  /// Enrolled subjects that the published timetable does not contain.
  final List<String> notInPublishedSchedule;

  /// Pairs of the student's own exams that overlap (should always be empty for a valid schedule).
  final List<List<String>> clashes;

  factory StudentTimetable.fromJson(Map<String, dynamic> json) {
    final exams =
        ((json['exams'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .map(ExamItem.fromJson)
            .toList()
          ..sort(
            (a, b) => (a.startsAt ?? DateTime(9999)).compareTo(
              b.startsAt ?? DateTime(9999),
            ),
          );
    return StudentTimetable(
      student: StudentRecord.fromJson(
        json['student'] as Map<String, dynamic>? ?? const {},
      ),
      publication: Publication.fromJson(json['publication']),
      published: json['status'] == 'PUBLISHED',
      valid: json['valid'] as bool?,
      exams: exams,
      notInPublishedSchedule:
          ((json['notInPublishedSchedule'] as List?) ?? const [])
              .map((e) => '$e')
              .toList(),
      clashes: ((json['clashes'] as List?) ?? const [])
          .map((p) => (p as List).map((e) => '$e').toList())
          .toList(),
    );
  }
}

/// GET /api/v1/timetable/faculty: the caller's own invigilation duties.
class FacultyDuties {
  const FacultyDuties({
    required this.facultyId,
    required this.name,
    required this.department,
    required this.maxDuties,
    required this.publication,
    required this.published,
    required this.duties,
  });
  final String facultyId;
  final String name;
  final String? department;
  final int? maxDuties;
  final Publication? publication;
  final bool published;
  final List<ExamItem> duties;

  factory FacultyDuties.fromJson(Map<String, dynamic> json) {
    final faculty = json['faculty'] as Map<String, dynamic>? ?? const {};
    final duties =
        ((json['duties'] as List?) ?? const [])
            .cast<Map<String, dynamic>>()
            .map(ExamItem.fromJson)
            .toList()
          ..sort(
            (a, b) => (a.startsAt ?? DateTime(9999)).compareTo(
              b.startsAt ?? DateTime(9999),
            ),
          );
    return FacultyDuties(
      facultyId: _s(faculty['id']) ?? '',
      name: _s(faculty['name']) ?? '',
      department: _s(faculty['department']),
      maxDuties: _i(json['maxDuties']),
      publication: Publication.fromJson(json['publication']),
      published: json['status'] == 'PUBLISHED',
      duties: duties,
    );
  }
}
