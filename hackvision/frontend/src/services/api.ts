/**
 * ExamOpt API Client Service
 * Connects React Frontend to FastAPI Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname}:8000` : 'http://127.0.0.1:8000');

export interface DataSummary {
  active_preset: string;
  is_cloud?: boolean;
  backend?: string;
  counts: {
    rooms: number;
    timeslots: number;
    faculty: number;
    subjects: number;
    student_groups: number;
    student_enrollments: number;
    student_subject_enrollments: number;
    backlog_students: number;
  };
  campus_capacity: {
    total_theory_seats: number;
    total_lab_seats: number;
    total_rooms: number;
  };
}

export interface ValidationErrorItem {
  code: string;
  table: string;
  row_id: string;
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationReport {
  is_valid: boolean;
  readiness_score: number;
  status: string;
  summary: {
    total_errors: number;
    total_warnings: number;
    table_counts: Record<string, number>;
  };
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
  diagnostics: string[];
}

export interface ScheduledAllocation {
  subject_id: string;
  subject_name: string;
  program: string;
  semester: number;
  slot_id: string;
  exam_date: string;
  session: string;
  time_range: string;
  room_id: string;
  room_name: string;
  room_capacity: number;
  assigned_faculty_id?: string;
  assigned_faculty_name?: string;
  assigned_students: number;
  duration_hours: number;
  requires_lab: boolean;
}

export interface ScheduleRunResult {
  run_id: string;
  algorithm: string;
  status: string;
  is_feasible: boolean;
  total_exams: number;
  scheduled_exams: number;
  unscheduled_exams: number;
  hard_conflicts: number;
  slots_used: number;
  room_utilization_pct: number;
  unused_capacity_seats: number;
  execution_time_ms: number;
  soft_score: number;
  allocations: ScheduledAllocation[];
  unscheduled_details: any[];
  conflicts_log: any[];
}

export interface AlgorithmComparisonMetric {
  algorithm: string;
  status: string;
  is_feasible: boolean;
  scheduled_exams: number;
  unscheduled_exams: number;
  hard_conflicts: number;
  slots_used: number;
  room_utilization_pct: number;
  unused_capacity_seats: number;
  execution_time_ms: number;
  soft_score: number;
}

export interface BenchmarkComparisonResponse {
  summary: {
    total_exams_to_schedule: number;
    total_available_slots: number;
    total_available_rooms: number;
    best_performing_algorithm: string;
    best_soft_score: number;
  };
  comparison: AlgorithmComparisonMetric[];
  detailed_results: Record<string, ScheduleRunResult>;
}

export interface UserSession {
  user_id: string;
  role: 'ADMIN' | 'STUDENT' | 'FACULTY';
  name: string;
  email: string;
  student_roll_no?: string;
  faculty_id?: string;
  group_id?: string;
  department?: string;
  total_enrolled_exams?: number;
  scheduled_exams_count?: number;
  assigned_duties_count?: number;
  max_duties?: number;
}

export function getStoredSession(): UserSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem('examopt_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('examopt_token') : null;
  const role = typeof localStorage !== 'undefined' ? localStorage.getItem('examopt_role') : null;
  const headers: Record<string, string> = { ...extraHeaders };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (role) {
    headers['X-ExamOpt-Role'] = role;
  }
  return headers;
}

export async function loginUser(role: string, identifier: string, password?: string): Promise<{ access_token: string; user: UserSession }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, identifier, password })
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Authentication failed."));
  }
  const data = await res.json();
  const token = data.access_token || data.token;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('examopt_token', token);
    localStorage.setItem('examopt_role', data.user.role);
    localStorage.setItem('examopt_user', JSON.stringify(data.user));
  }
  return { access_token: token, user: data.user };
}

export async function fetchMe(): Promise<UserSession> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load session profile."));
  }
  const user = await res.json();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('examopt_user', JSON.stringify(user));
  }
  return user;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch {
    // Proceed with local cleanup regardless of network
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('examopt_token');
    localStorage.removeItem('examopt_role');
    localStorage.removeItem('examopt_user');
  }
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.detail || data.message || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/health`);
  return res.json();
}

export async function fetchDataSummary(): Promise<DataSummary> {
  const res = await fetch(`${API_BASE_URL}/api/data/summary`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(await parseApiError(res, "Failed to load data summary"));
  return res.json();
}

export async function fetchTableData(tableName: string, limit: number = 500) {
  const res = await fetch(`${API_BASE_URL}/api/data/tables/${tableName}?limit=${limit}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(await parseApiError(res, `Failed to load ${tableName}`));
  return res.json();
}

export async function runValidation(presetName?: string): Promise<ValidationReport> {
  const res = await fetch(`${API_BASE_URL}/api/data/validate`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ preset_name: presetName })
  });
  if (!res.ok) throw new Error(await parseApiError(res, "Validation request failed"));
  return res.json();
}

export async function loadPreset(presetName: string) {
  const res = await fetch(`${API_BASE_URL}/api/data/load-preset/${presetName}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(await parseApiError(res, `Failed to activate preset ${presetName}`));
  return res.json();
}

export async function generateSchedule(algorithm: string = 'BACKTRACKING'): Promise<ScheduleRunResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/schedules/generate`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ algorithm })
  });
  if (!res.ok) throw new Error("Failed to generate schedule");
  return res.json();
}

export async function compareAlgorithms(): Promise<BenchmarkComparisonResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/schedules/compare`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Comparison benchmark failed");
  return res.json();
}

export async function publishSchedule(runId: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/schedules/${runId}/publish`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Publication rejected" }));
    throw new Error(err.detail || "Publication rejected");
  }
  return res.json();
}

export async function fetchActivePublishedSchedule() {
  const res = await fetch(`${API_BASE_URL}/api/v1/schedules/active-published`);
  if (!res.ok) throw new Error("No published timetable available");
  return res.json();
}

export async function fetchStudentTimetable(rollNo?: string) {
  const url = rollNo 
    ? `${API_BASE_URL}/api/v1/timetable/student?roll_no=${encodeURIComponent(rollNo)}`
    : `${API_BASE_URL}/api/v1/timetable/student`;
  const headers = getAuthHeaders();
  if (!headers['Authorization']) {
    headers['Authorization'] = rollNo ? `Bearer mock-student-${rollNo}` : 'Bearer dev-admin-token';
    headers['X-ExamOpt-Role'] = rollNo ? 'STUDENT' : 'ADMIN';
    if (rollNo) headers['X-ExamOpt-RollNo'] = rollNo;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await parseApiError(res, "Student timetable lookup failed"));
  return res.json();
}

export async function fetchFacultyTimetable(facultyId?: string) {
  const url = facultyId 
    ? `${API_BASE_URL}/api/v1/timetable/faculty?faculty_id=${encodeURIComponent(facultyId)}`
    : `${API_BASE_URL}/api/v1/timetable/faculty`;
  const headers = getAuthHeaders();
  if (!headers['Authorization']) {
    headers['Authorization'] = facultyId ? `Bearer mock-faculty-${facultyId}` : 'Bearer dev-admin-token';
    headers['X-ExamOpt-Role'] = facultyId ? 'FACULTY' : 'ADMIN';
    if (facultyId) headers['X-ExamOpt-FacultyId'] = facultyId;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await parseApiError(res, "Faculty timetable lookup failed"));
  return res.json();
}

export function getExportTimetableCsvUrl(runId?: string) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('examopt_token') : null;
  const params = new URLSearchParams();
  if (runId) params.append('run_id', runId);
  if (token) params.append('token', token);
  const q = params.toString();
  return `${API_BASE_URL}/api/v1/timetable/export/csv${q ? `?${q}` : ''}`;
}

export interface SeatItem {
  row: string;
  col: number;
  seat_id: string;
  status: 'occupied' | 'available';
  student_roll: string | null;
  student_name: string | null;
}

export interface AvailableSlotInfo {
  slot_id: string;
  subject_id: string;
  subject_name: string;
  exam_date?: string;
  time_range?: string;
  enrolled_students?: number;
  assigned_faculty_name?: string;
}

export interface RoomSeatingResponse {
  room_id: string;
  room_name: string;
  building: string;
  room_type: string;
  capacity: number;
  subject_id: string | null;
  subject_code: string | null;
  subject_name: string;
  program?: string | null;
  semester?: number | null;
  assigned_faculty_name?: string | null;
  assigned_faculty_id?: string | null;
  slot_id: string | null;
  exam_date: string | null;
  time_range: string | null;
  occupied_count: number;
  available_count: number;
  utilization_pct: number;
  available_slots: AvailableSlotInfo[];
  seats: SeatItem[];
}

export interface RoomSummary {
  room_id: string;
  name: string;
  building: string;
  capacity: number;
  room_type: string;
  scheduled_count: number;
  scheduled_exams: AvailableSlotInfo[];
}

export async function fetchRooms(): Promise<RoomSummary[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/rooms`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(await parseApiError(res, "Failed to load rooms"));
  return res.json();
}

export async function fetchRoomSeating(roomId: string, slotId?: string): Promise<RoomSeatingResponse> {
  const query = slotId ? `?slot_id=${encodeURIComponent(slotId)}` : '';
  const res = await fetch(`${API_BASE_URL}/api/v1/rooms/${encodeURIComponent(roomId)}/seating${query}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(await parseApiError(res, `Failed to load seating for room ${roomId}`));
  return res.json();
}
