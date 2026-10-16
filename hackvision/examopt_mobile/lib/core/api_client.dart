import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

class ApiException implements Exception {
  ApiException(this.status, this.code, this.message);
  final int status;
  final String code;
  final String message;

  bool get isUnauthorized => status == 401;
  bool get isNotLinked => code == 'NOT_LINKED';
  bool get isNetwork => status == 0;

  @override
  String toString() => message;
}

/// Client for the ExamOpt API v1, the same routes the web app calls. Every
/// request carries the Clerk session JWT; the server derives the caller's
/// identity from it, so no roll number or role is ever sent as proof.
class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.tokenProvider,
    http.Client? client,
  }) : _http = client ?? http.Client();

  final String baseUrl;
  final Future<String> Function() tokenProvider;
  final http.Client _http;

  static const _timeout = Duration(seconds: 20);

  Future<Map<String, dynamic>> _get(String path) async {
    final token = await tokenProvider();
    final http.Response response;
    try {
      response = await _http
          .get(
            Uri.parse('$baseUrl/api/v1$path'),
            headers: {
              'Authorization': 'Bearer $token',
              'Accept': 'application/json',
            },
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw ApiException(
        0,
        'TIMEOUT',
        'The ExamOpt server did not answer in time. Check your connection and retry.',
      );
    } catch (_) {
      throw ApiException(
        0,
        'NETWORK_ERROR',
        'Cannot reach the ExamOpt server at $baseUrl. Check your connection and retry.',
      );
    }
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      body = null;
    }
    if (response.statusCode >= 400 || body == null || body['success'] != true) {
      final error = body?['error'] as Map<String, dynamic>?;
      final code = error?['code']?.toString() ?? 'HTTP_${response.statusCode}';
      var message =
          error?['message']?.toString() ??
          'The request failed (${response.statusCode}).';
      if (response.statusCode == 401) {
        message = 'Your session is not valid any more. Sign in again.';
      }
      throw ApiException(response.statusCode, code, message);
    }
    return (body['data'] as Map<String, dynamic>?) ?? const {};
  }

  Future<void> linkStudent(String rollNo) async {
    final token = await tokenProvider();
    final http.Response response;
    try {
      response = await _http
          .post(
            Uri.parse('$baseUrl/api/v1/student/me/link'),
            headers: {
              'Authorization': '******',
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }..addAll({'Authorization': 'Bearer $token'}),
            body: jsonEncode({'rollNo': rollNo}),
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw ApiException(
        0,
        'TIMEOUT',
        'The ExamOpt server did not answer in time. Check your connection and retry.',
      );
    } catch (_) {
      throw ApiException(
        0,
        'NETWORK_ERROR',
        'Cannot reach the ExamOpt server at $baseUrl. Check your connection and retry.',
      );
    }
    Map<String, dynamic>? body;
    try {
      body = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      body = null;
    }
    if (response.statusCode >= 400 || body == null || body['success'] != true) {
      final error = body?['error'] as Map<String, dynamic>?;
      throw ApiException(
        response.statusCode,
        error?['code']?.toString() ?? 'HTTP_${response.statusCode}',
        error?['message']?.toString() ??
            'The request failed (${response.statusCode}).',
      );
    }
  }

  Future<AccessSummary> access() async =>
      AccessSummary.fromJson(await _get('/access'));

  /// The signed-in student's exams. The server picks the student from the session.
  Future<StudentTimetable> studentTimetable() async =>
      StudentTimetable.fromJson(await _get('/timetable/student'));

  /// The signed-in faculty member's invigilation duties.
  Future<FacultyDuties> facultyDuties() async =>
      FacultyDuties.fromJson(await _get('/timetable/faculty'));
}
