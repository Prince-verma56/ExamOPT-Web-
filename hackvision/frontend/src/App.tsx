import { useState, useEffect } from 'react';
import {
  Calendar, Clock, Building, Users, BookOpen, CheckCircle, AlertTriangle,
  XCircle, Play, RefreshCw, Download, Award, ShieldCheck, UserCheck,
  Smartphone, Filter, ChevronRight, CheckCircle2, LogOut, Lock, LogIn, User,
  Armchair, LayoutGrid, ListOrdered, RotateCcw
} from 'lucide-react';
import {
  fetchDataSummary, runValidation, loadPreset, generateSchedule,
  compareAlgorithms, publishSchedule, fetchActivePublishedSchedule,
  fetchStudentTimetable, fetchFacultyTimetable, getExportTimetableCsvUrl,
  loginUser, fetchMe, logoutUser, getStoredSession,
  fetchRooms, fetchRoomSeating
} from './services/api';
import type {
  DataSummary, ValidationReport, BenchmarkComparisonResponse, ScheduledAllocation,
  UserSession, RoomSummary, RoomSeatingResponse, SeatItem
} from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(getStoredSession());
  const [loginRole, setLoginRole] = useState<'ADMIN' | 'STUDENT' | 'FACULTY'>('ADMIN');
  const [loginIdentifier, setLoginIdentifier] = useState<string>('admin@examopt.internal');
  const [loginPassword, setLoginPassword] = useState<string>('examopt-admin-2026');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'timetable' | 'seating' | 'validation' | 'benchmark' | 'student' | 'faculty'>('overview');
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<any | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters for timetable grid
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('ALL');

  // Room Seating Plan states
  const [roomList, setRoomList] = useState<RoomSummary[]>([]);
  const [selectedSeatingRoom, setSelectedSeatingRoom] = useState<string>('AB11-101');
  const [selectedSeatingSlot, setSelectedSeatingSlot] = useState<string>('');
  const [seatingData, setSeatingData] = useState<RoomSeatingResponse | null>(null);
  const [seatingLoading, setSeatingLoading] = useState<boolean>(false);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState<SeatItem | null>(null);
  const [seatingViewMode, setSeatingViewMode] = useState<'grid' | 'roster'>('grid');
  const [rosterSearch, setRosterSearch] = useState<string>('');

  // Student and Faculty lookup states
  const [studentRollNo, setStudentRollNo] = useState<string>('GLA26-BCA-0001');
  const [studentData, setStudentData] = useState<any | null>(null);
  const [facultyId, setFacultyId] = useState<string>('FAC-101');
  const [facultyData, setFacultyData] = useState<any | null>(null);

  const loadPublishedSchedule = async () => {
    try {
      const pub = await fetchActivePublishedSchedule();
      if (pub) setActiveSchedule(pub);
    } catch (err) {
      console.warn("Could not load published schedule:", err);
    }
  };

  useEffect(() => {
    loadPublishedSchedule();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMe().catch(() => {
        logoutUser();
        setCurrentUser(null);
      });

      if (currentUser.role === 'STUDENT') {
        setActiveTab('student');
        const roll = currentUser.student_roll_no || 'GLA26-BCA-0001';
        setStudentRollNo(roll);
        loadPublishedSchedule();
        handleStudentLookup(roll);
      } else if (currentUser.role === 'FACULTY') {
        setActiveTab('faculty');
        const fId = currentUser.faculty_id || 'FAC-101';
        setFacultyId(fId);
        loadPublishedSchedule();
        handleFacultyLookup(fId);
      } else {
        loadInitialData();
      }
    }
  }, [currentUser?.user_id]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await loginUser(loginRole, loginIdentifier, loginPassword);
      setCurrentUser(res.user);
      loadPublishedSchedule();
      if (res.user.role === 'STUDENT') {
        const roll = res.user.student_roll_no || loginIdentifier;
        setStudentRollNo(roll);
        setActiveTab('student');
        await handleStudentLookup(roll);
      } else if (res.user.role === 'FACULTY') {
        const fId = res.user.faculty_id || loginIdentifier;
        setFacultyId(fId);
        setActiveTab('faculty');
        await handleFacultyLookup(fId);
      } else {
        setActiveTab('overview');
        await loadInitialData();
      }
      setStatusMessage({ text: `Signed in as ${res.user.name} (${res.user.role})`, type: 'success' });
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
    } finally {
      setCurrentUser(null);
      setStudentData(null);
      setFacultyData(null);
      setActiveSchedule(null);
      setSummary(null);
      setValidationReport(null);
      setBenchmark(null);
      setLoginError(null);
      setStatusMessage({ text: 'You have been signed out successfully.', type: 'info' });
      setLoading(false);
    }
  };

  const handleLoadSeating = async (roomId: string, slotId?: string) => {
    setSeatingLoading(true);
    setSelectedSeatDetails(null);
    try {
      const res = await fetchRoomSeating(roomId, slotId);
      setSeatingData(res);
      setSelectedSeatingRoom(res.room_id);
      setSelectedSeatingSlot(res.slot_id || slotId || '');
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: err.message || "Failed to load room seating", type: 'error' });
    } finally {
      setSeatingLoading(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sumRes, valRes, pubRes, roomsRes] = await Promise.allSettled([
        fetchDataSummary(),
        runValidation(),
        fetchActivePublishedSchedule(),
        fetchRooms()
      ]);

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
      }
      if (valRes.status === 'fulfilled') {
        setValidationReport(valRes.value);
      }
      if (pubRes.status === 'fulfilled' && pubRes.value) {
        setActiveSchedule(pubRes.value);
      }
      if (roomsRes.status === 'fulfilled' && roomsRes.value && roomsRes.value.length > 0) {
        const rooms = roomsRes.value;
        setRoomList(rooms);
        const defaultRoom = rooms[0].room_id;
        setSelectedSeatingRoom(defaultRoom);
        fetchRoomSeating(defaultRoom)
          .then(data => setSeatingData(data))
          .catch(e => console.warn("Seating error:", e));
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: err.message || "Failed to load initial data", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSwitch = async (preset: string) => {
    if (summary?.is_cloud && preset !== 'normal') {
      setStatusMessage({
        text: `Preset '${preset}' switching is disabled in Supabase Cloud mode to protect live cloud data from synthetic file overwrites. Live cloud database is 100% active and verified.`,
        type: 'info'
      });
      return;
    }
    setLoading(true);
    setStatusMessage({ text: `Switching to dataset preset '${preset}'...`, type: 'info' });
    try {
      const res = await loadPreset(preset);
      setValidationReport(res.validation_report);
      const sum = await fetchDataSummary();
      setSummary(sum);
      setStatusMessage({ text: `Dataset preset '${preset}' activated and validated.`, type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to switch preset", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (algorithm: string) => {
    setLoading(true);
    setStatusMessage({ text: `Running ${algorithm} scheduling engine...`, type: 'info' });
    try {
      const res = await generateSchedule(algorithm);
      setActiveSchedule({ allocations: res.allocations, run: res });
      setStatusMessage({
        text: `Schedule generated with ${res.algorithm}! (${res.scheduled_exams}/${res.total_exams} scheduled, ${res.execution_time_ms}ms)`,
        type: res.is_feasible ? 'success' : 'error'
      });
      setActiveTab('timetable');
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Scheduling failed", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBenchmark = async () => {
    setLoading(true);
    setStatusMessage({ text: "Executing side-by-side multi-algorithm benchmark...", type: 'info' });
    try {
      const res = await compareAlgorithms();
      setBenchmark(res);
      setStatusMessage({ text: "Benchmark evaluation completed successfully!", type: 'success' });
      setActiveTab('benchmark');
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Benchmark failed", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (runId: string) => {
    setLoading(true);
    try {
      const res = await publishSchedule(runId);
      setStatusMessage({ text: res.message, type: 'success' });
      const pub = await fetchActivePublishedSchedule();
      setActiveSchedule(pub);
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Publishing rejected", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLookup = async (roll: string) => {
    setLoading(true);
    try {
      const res = await fetchStudentTimetable(roll);
      setStudentData(res);
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Student not found", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyLookup = async (fId: string) => {
    setLoading(true);
    try {
      const res = await fetchFacultyTimetable(fId);
      setFacultyData(res);
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Faculty not found", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filtered allocations for timetable
  const rawAllocations: ScheduledAllocation[] = activeSchedule?.allocations || [];
  const filteredAllocations = rawAllocations.filter(a => {
    if (selectedProgram !== 'ALL' && a.program !== selectedProgram) return false;
    if (selectedSemester !== 'ALL' && String(a.semester) !== selectedSemester) return false;
    if (selectedRoomType === 'LAB' && !a.requires_lab) return false;
    if (selectedRoomType === 'THEORY' && a.requires_lab) return false;
    return true;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans justify-between">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur py-4 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">ExamOpt</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium px-2 py-0.5 rounded-full">
                  GLA University
                </span>
              </div>
              <p className="text-xs text-slate-400">Intelligent Examination Timetable Optimization System</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Secure Access Control</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Institutional Portal Sign In</h1>
              <p className="text-xs text-slate-400 mt-1">Authenticate as an Administrator, Student, or Faculty Member</p>
            </div>

            {/* Role Selection Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700/60 mb-5">
              <button
                type="button"
                onClick={() => {
                  setLoginRole('ADMIN');
                  setLoginIdentifier('admin@examopt.internal');
                  setLoginPassword('examopt-admin-2026');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${loginRole === 'ADMIN' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginRole('STUDENT');
                  setLoginIdentifier('GLA26-BCA-0001');
                  setLoginPassword('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${loginRole === 'STUDENT' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginRole('FACULTY');
                  setLoginIdentifier('FAC-101');
                  setLoginPassword('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${loginRole === 'FACULTY' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Faculty
              </button>
            </div>

            {/* Quick Demo Fillers */}
            <div className="mb-4">
              <div className="text-[11px] font-medium text-slate-400 mb-1.5">Quick Demo Accounts:</div>
              <div className="flex flex-wrap gap-1.5">
                {loginRole === 'STUDENT' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setLoginIdentifier('GLA26-BCA-0001')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${loginIdentifier === 'GLA26-BCA-0001' ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                      Akash Singh (BCA-0001)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginIdentifier('GLA26-BCA-0002')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${loginIdentifier === 'GLA26-BCA-0002' ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                      Vivaan Pathak (BCA-0002)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginIdentifier('GLA26-DS-0286')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${loginIdentifier === 'GLA26-DS-0286' ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                      Aditya (Backlog: DS-0286)
                    </button>
                  </>
                )}
                {loginRole === 'FACULTY' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setLoginIdentifier('FAC-101')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${loginIdentifier === 'FAC-101' ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                      Dr. Ashish Sharma (FAC-101)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginIdentifier('FAC-102')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${loginIdentifier === 'FAC-102' ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                      Prof. Manoj Kumar (FAC-102)
                    </button>
                  </>
                )}
                {loginRole === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginIdentifier('admin@examopt.internal');
                      setLoginPassword('examopt-admin-2026');
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg border bg-indigo-950 text-indigo-300 border-indigo-700"
                  >
                    Administrator (admin@examopt.internal)
                  </button>
                )}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {loginRole === 'STUDENT' ? 'Student Roll Number' : loginRole === 'FACULTY' ? 'Faculty ID' : 'Administrator Email / Username'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={loginRole === 'STUDENT' ? 'e.g. GLA26-BCA-0001' : loginRole === 'FACULTY' ? 'e.g. FAC-101' : 'admin@examopt.internal'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {loginRole === 'ADMIN' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {loginError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </main>

        <footer className="border-t border-slate-800 bg-slate-950 py-3 text-center text-xs text-slate-400">
          ExamOpt — Problem Statement C10: Intelligent Examination Timetable Optimization System • GLA University Context
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header / Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">ExamOpt</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium px-2 py-0.5 rounded-full">
                  GLA University
                </span>
              </div>
              <p className="text-xs text-slate-400">Intelligent Examination Timetable Optimization System</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            {currentUser?.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('timetable')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'timetable' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Timetable Grid
                </button>
                <button
                  onClick={() => {
                    setActiveTab('seating');
                    if (!seatingData) handleLoadSeating(selectedSeatingRoom, selectedSeatingSlot);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${activeTab === 'seating' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  <Armchair className="w-3.5 h-3.5" />
                  <span>Room Seating</span>
                </button>
                <button
                  onClick={() => setActiveTab('validation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'validation' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Data Quality
                </button>
                <button
                  onClick={() => {
                    setActiveTab('benchmark');
                    if (!benchmark) handleBenchmark();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'benchmark' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Algorithm Comparison
                </button>
                <button
                  onClick={() => { setActiveTab('student'); handleStudentLookup(studentRollNo); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${activeTab === 'student' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Student App</span>
                </button>
                <button
                  onClick={() => { setActiveTab('faculty'); handleFacultyLookup(facultyId); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${activeTab === 'faculty' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Faculty Portal</span>
                </button>
              </>
            )}

            {currentUser?.role === 'STUDENT' && (
              <>
                <button
                  onClick={() => { setActiveTab('student'); handleStudentLookup(studentRollNo); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white shadow flex items-center space-x-1"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>My Timetable</span>
                </button>
                <button
                  onClick={() => setActiveTab('timetable')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'timetable' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Campus Timetable
                </button>
                <button
                  onClick={() => {
                    setActiveTab('seating');
                    if (!seatingData) handleLoadSeating(selectedSeatingRoom, selectedSeatingSlot);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${activeTab === 'seating' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  <Armchair className="w-3.5 h-3.5" />
                  <span>Room Seating</span>
                </button>
              </>
            )}

            {currentUser?.role === 'FACULTY' && (
              <>
                <button
                  onClick={() => { setActiveTab('faculty'); handleFacultyLookup(facultyId); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white shadow flex items-center space-x-1"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>My Assigned Duties</span>
                </button>
                <button
                  onClick={() => setActiveTab('timetable')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'timetable' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Campus Timetable
                </button>
                <button
                  onClick={() => {
                    setActiveTab('seating');
                    if (!seatingData) handleLoadSeating(selectedSeatingRoom, selectedSeatingSlot);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${activeTab === 'seating' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  <Armchair className="w-3.5 h-3.5" />
                  <span>Room Seating</span>
                </button>
              </>
            )}
          </nav>

          {/* Quick Actions & User Profile */}
          <div className="flex items-center space-x-3">
            {loading && (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Processing...</span>
              </span>
            )}
            <a
              href={getExportTimetableCsvUrl(activeSchedule?.run?.run_id)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
              title="Download Timetable CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV Export</span>
            </a>

            {/* User Profile Pill & Sign Out */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-indigo-400 font-mono leading-tight">{currentUser.role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-xs font-medium text-rose-300 border border-rose-800/60 transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Status banner */}
      {statusMessage && (
        <div className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between transition ${
          statusMessage.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800' :
          statusMessage.type === 'error' ? 'bg-rose-950/80 text-rose-300 border-b border-rose-800' :
          'bg-indigo-950/80 text-indigo-300 border-b border-indigo-800'
        }`}>
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">Exams (Subjects)</span>
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">{summary?.counts.subjects || 24}</div>
                <div className="text-[11px] text-slate-400 mt-1">BCA, BCA-DS, MCA</div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">Exam Rooms</span>
                  <Building className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-white">{summary?.counts.rooms || 15}</div>
                <div className="text-[11px] text-slate-400 mt-1">10 Theory + 5 Labs</div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">Time Slots</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white">{summary?.counts.timeslots || 10}</div>
                <div className="text-[11px] text-slate-400 mt-1">5 Days × 2 Sessions</div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">Faculty</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">{summary?.counts.faculty || 20}</div>
                <div className="text-[11px] text-slate-400 mt-1">CSED, BCA, MCA</div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">Individual Students</span>
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white">{summary?.counts.student_enrollments || 355}</div>
                <div className="text-[11px] text-slate-400 mt-1">1,735 Subject Enrollments</div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs">Backlog Students</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-rose-400">{summary?.counts.backlog_students || 70}</div>
                <div className="text-[11px] text-slate-400 mt-1">Cross-Semester Edges</div>
              </div>
            </div>

            {/* Quick Engine Launcher & Preset Switcher */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Algorithm Trigger Card */}
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <span>Deterministic Optimization Engine</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Choose an optimization algorithm to generate a zero-conflict timetable respecting student clashes, room capacities, and faculty workloads.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => handleGenerate('FIRST_FIT')}
                    className="flex flex-col items-start p-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-left transition group"
                  >
                    <div className="text-xs font-bold text-slate-300 group-hover:text-white flex items-center justify-between w-full">
                      <span>Algorithm A</span>
                      <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <div className="text-sm font-semibold text-white mt-1">First-Fit Baseline</div>
                    <p className="text-[11px] text-slate-400 mt-2">Greedy placement into first available slot & room configuration.</p>
                  </button>

                  <button
                    onClick={() => handleGenerate('WELSH_POWELL')}
                    className="flex flex-col items-start p-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-left transition group"
                  >
                    <div className="text-xs font-bold text-slate-300 group-hover:text-white flex items-center justify-between w-full">
                      <span>Algorithm B</span>
                      <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <div className="text-sm font-semibold text-white mt-1">Welsh–Powell Coloring</div>
                    <p className="text-[11px] text-slate-400 mt-2">Graph degree ordering (most constrained first) + Best-Fit room packing.</p>
                  </button>

                  <button
                    onClick={() => handleGenerate('BACKTRACKING')}
                    className="flex flex-col items-start p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-slate-800/90 hover:from-indigo-900/60 border border-indigo-500/40 text-left transition group"
                  >
                    <div className="text-xs font-bold text-indigo-300 group-hover:text-white flex items-center justify-between w-full">
                      <span>Algorithm C (Recommended)</span>
                      <Play className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="text-sm font-semibold text-white mt-1">MRV Backtracking</div>
                    <p className="text-[11px] text-slate-400 mt-2">Constraint search with MRV heuristic, forward checking, and fixed propagation.</p>
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-3">
                  <div className="text-xs text-slate-400">
                    Active Published Schedule: <span className="font-semibold text-white">{activeSchedule?.publication?.title || "Auto-Published Version 1"}</span>
                  </div>
                  <button
                    onClick={handleBenchmark}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
                  >
                    <Award className="w-4 h-4" />
                    <span>Run Comparative Benchmark</span>
                  </button>
                </div>
              </div>

              {/* Rubric Edge-Case Switcher Card */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Rubric Test Datasets</span>
                    </h3>
                    {summary?.is_cloud && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                        Supabase Cloud
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {summary?.is_cloud
                      ? "Live cloud database active. Local presets are locked to protect cloud production data from synthetic overwrites."
                      : "Toggle between normal GLA dataset and edge-case scenarios to evaluate the validator:"}
                  </p>

                  <div className="space-y-2 mt-4">
                    <button
                      onClick={() => handlePresetSwitch('normal')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium border flex items-center justify-between transition ${
                        summary?.active_preset === 'normal'
                          ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">Normal GLA Dataset</div>
                        <div className="text-[10px] opacity-75">100% valid, 0 clashes, schedulable</div>
                      </div>
                      {summary?.active_preset === 'normal' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </button>

                    <button
                      onClick={() => handlePresetSwitch('lab_bottleneck')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium border flex items-center justify-between transition ${
                        summary?.active_preset === 'lab_bottleneck'
                          ? 'bg-amber-950/60 border-amber-600/60 text-amber-300'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">Edge: Lab Bottleneck</div>
                        <div className="text-[10px] opacity-75">6 lab exams locked to slot D1-M (exceeds 5 labs)</div>
                      </div>
                      {summary?.active_preset === 'lab_bottleneck' && <CheckCircle className="w-4 h-4 text-amber-400" />}
                    </button>

                    <button
                      onClick={() => handlePresetSwitch('capacity_overflow')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium border flex items-center justify-between transition ${
                        summary?.active_preset === 'capacity_overflow'
                          ? 'bg-rose-950/60 border-rose-600/60 text-rose-300'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">Edge: Capacity Overflow</div>
                        <div className="text-[10px] opacity-75">Mega-course with 650 students (exceeds hall 150)</div>
                      </div>
                      {summary?.active_preset === 'capacity_overflow' && <CheckCircle className="w-4 h-4 text-rose-400" />}
                    </button>

                    <button
                      onClick={() => handlePresetSwitch('invalid_corrupted')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium border flex items-center justify-between transition ${
                        summary?.active_preset === 'invalid_corrupted'
                          ? 'bg-purple-950/60 border-purple-600/60 text-purple-300'
                          : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">Invalid Corrupted Input</div>
                        <div className="text-[10px] opacity-75">Negative counts, contradictory slots, duplicate IDs</div>
                      </div>
                      {summary?.active_preset === 'invalid_corrupted' && <CheckCircle className="w-4 h-4 text-purple-400" />}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Readiness Score:</span>
                  <span className={`text-sm font-bold ${validationReport?.is_valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {validationReport?.readiness_score || 0}/100
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TIMETABLE GRID */}
        {activeTab === 'timetable' && (
          <div className="space-y-4">
            {/* Filter and Publish Bar */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters:</span>
                </div>

                {/* Program Filter */}
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Programs</option>
                  <option value="BCA">BCA Regular</option>
                  <option value="BCA-DS">BCA (Data Science)</option>
                  <option value="MCA">MCA</option>
                </select>

                {/* Semester Filter */}
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="3">Semester 3</option>
                  <option value="5">Semester 5</option>
                </select>

                {/* Room Type Filter */}
                <select
                  value={selectedRoomType}
                  onChange={(e) => setSelectedRoomType(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Room Types</option>
                  <option value="THEORY">Theory Halls Only</option>
                  <option value="LAB">Laboratories Only</option>
                </select>

                <span className="text-xs text-slate-400">
                  Showing {filteredAllocations.length} of {rawAllocations.length} examinations
                </span>

                {(selectedProgram !== 'ALL' || selectedSemester !== 'ALL' || selectedRoomType !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSelectedProgram('ALL');
                      setSelectedSemester('ALL');
                      setSelectedRoomType('ALL');
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {activeSchedule?.run?.run_id && (
                  <button
                    onClick={() => handlePublish(activeSchedule.run.run_id)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Publish Schedule</span>
                  </button>
                )}
                <a
                  href={getExportTimetableCsvUrl(activeSchedule?.run?.run_id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </a>
              </div>
            </div>

            {/* Timetable Table */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Slot & Date</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Program / Sem</th>
                      <th className="px-4 py-3">Room & Type</th>
                      <th className="px-4 py-3">Enrolled / Cap</th>
                      <th className="px-4 py-3">Assigned Faculty</th>
                      <th className="px-4 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <AlertTriangle className="w-8 h-8 text-amber-400/80 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-300">No examinations match the selected filter criteria</p>
                          <p className="text-xs text-slate-500 mt-1">Try resetting Program, Semester, or Room Type filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAllocations.map((a, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3 font-medium">
                            <div className="text-white flex items-center space-x-1.5">
                              <span className="bg-indigo-950 text-indigo-300 font-mono px-1.5 py-0.5 rounded border border-indigo-800 text-[11px]">
                                {a.slot_id}
                              </span>
                              <span>{a.exam_date}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{a.session} ({a.time_range})</div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">{a.subject_name}</div>
                            <div className="text-[11px] font-mono text-indigo-300">{a.subject_id}</div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                              {a.program} • Sem {a.semester}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-white font-medium">{a.room_name}</div>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-400">{a.room_id}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                a.requires_lab ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {a.requires_lab ? 'LAB' : 'THEORY'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSeatingRoom(a.room_id);
                                  setSelectedSeatingSlot(a.slot_id);
                                  setActiveTab('seating');
                                  handleLoadSeating(a.room_id, a.slot_id);
                                }}
                                className="ml-1.5 inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-[10px] font-semibold transition"
                                title={`View ${a.room_id} Seating Plan for ${a.slot_id}`}
                              >
                                <Armchair className="w-2.5 h-2.5" />
                                <span>Seating</span>
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium text-white">
                              {a.assigned_students} / {a.room_capacity}
                            </div>
                            <div className="w-20 bg-slate-700 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (a.assigned_students / a.room_capacity) * 100)}%` }}
                              />
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-slate-200 font-medium">{a.assigned_faculty_name || 'TBD'}</div>
                            {a.assigned_faculty_id && (
                              <div className="text-[10px] text-slate-400 font-mono">{a.assigned_faculty_id}</div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-slate-300">
                            {a.duration_hours} Hours
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ROOM SEATING PLAN */}
        {activeTab === 'seating' && (
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                  <Armchair className="w-4 h-4 text-indigo-400" />
                  <span>Room Seating Matrix:</span>
                </div>

                {/* Room Selector */}
                <select
                  value={selectedSeatingRoom}
                  onChange={(e) => {
                    const r = e.target.value;
                    setSelectedSeatingRoom(r);
                    handleLoadSeating(r, '');
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {roomList.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.room_id} — {r.name} ({r.capacity} seats, {r.room_type})
                    </option>
                  ))}
                </select>

                {/* Time Slot Selector */}
                {seatingData?.available_slots && seatingData.available_slots.length > 0 ? (
                  <select
                    value={selectedSeatingSlot}
                    onChange={(e) => {
                      const s = e.target.value;
                      setSelectedSeatingSlot(s);
                      handleLoadSeating(selectedSeatingRoom, s);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {seatingData.available_slots.map((s) => (
                      <option key={s.slot_id} value={s.slot_id}>
                        {s.slot_id} • {s.subject_id} ({s.subject_name})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-slate-500 italic">No exams scheduled in this room</span>
                )}
              </div>

              {/* View Mode & Actions */}
              <div className="flex items-center space-x-2">
                <div className="bg-slate-900 p-1 rounded-xl border border-slate-700/80 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setSeatingViewMode('grid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                      seatingViewMode === 'grid'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeatingViewMode('roster')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                      seatingViewMode === 'roster'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Student Roster ({seatingData?.occupied_count || 0})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoadSeating(selectedSeatingRoom, selectedSeatingSlot)}
                  disabled={seatingLoading}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
                  title="Reload seating data"
                >
                  <RefreshCw className={`w-4 h-4 ${seatingLoading ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Room Details & Examination Metric Cards */}
            {seatingData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Room Metadata */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Exam Venue</span>
                    <Building className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="text-lg font-bold text-white mt-1">{seatingData.room_name}</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="font-mono text-xs text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      {seatingData.room_id}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      seatingData.room_type === 'LAB' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {seatingData.room_type}
                    </span>
                    <span className="text-xs text-slate-400">{seatingData.building}</span>
                  </div>
                </div>

                {/* Course & Slot */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Course Scheduled</span>
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-sm font-bold text-white mt-1 line-clamp-1" title={seatingData.subject_name}>
                    {seatingData.subject_name}
                  </div>
                  <div className="flex items-center space-x-2 mt-2 text-xs text-slate-400">
                    <span className="font-mono text-indigo-300">{seatingData.subject_id || 'No Exam'}</span>
                    {seatingData.slot_id && (
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[11px] text-slate-300 border border-slate-700">
                        Slot {seatingData.slot_id}
                      </span>
                    )}
                  </div>
                  {seatingData.exam_date && (
                    <div className="text-[11px] text-slate-400 mt-1">
                      {seatingData.exam_date} • {seatingData.time_range}
                    </div>
                  )}
                </div>

                {/* Seating Occupancy & Capacity */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Seat Occupancy</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl font-bold text-white">{seatingData.occupied_count}</span>
                    <span className="text-xs text-slate-400">/ {seatingData.capacity} Seats</span>
                    <span className="text-xs font-semibold text-emerald-400 ml-auto">
                      {seatingData.available_count} Available
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 mt-3 overflow-hidden border border-slate-700/60">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        seatingData.utilization_pct >= 90
                          ? 'bg-emerald-500'
                          : seatingData.utilization_pct >= 50
                          ? 'bg-indigo-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, seatingData.utilization_pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>Room Utilization</span>
                    <span className="font-bold text-white">{seatingData.utilization_pct}%</span>
                  </div>
                </div>

                {/* Faculty Invigilator */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Assigned Invigilator</span>
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {seatingData.assigned_faculty_name || 'Invigilator Assigned'}
                  </div>
                  {seatingData.assigned_faculty_id && (
                    <div className="text-[11px] font-mono text-indigo-300 mt-1">
                      ID: {seatingData.assigned_faculty_id}
                    </div>
                  )}
                  <div className="mt-2.5">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>Duty Confirmed</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SEATING VIEW MODE: 2D VISUAL GRID */}
            {seatingViewMode === 'grid' && seatingData && (
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
                {/* Whiteboard / Exam Hall Front Indicator */}
                <div className="max-w-md mx-auto mb-6 text-center">
                  <div className="py-1.5 px-4 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center justify-center space-x-2 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>[ FRONT OF EXAMINATION ROOM / WHITEBOARD ]</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>

                {/* Visual Seat Matrix */}
                {(() => {
                  const rows = Array.from(new Set(seatingData.seats.map((s) => s.row))).sort();
                  const cols = Array.from(new Set(seatingData.seats.map((s) => s.col))).sort((a, b) => a - b);

                  return (
                    <div className="overflow-x-auto pb-4">
                      <div className="inline-block min-w-full">
                        {/* Column Header Numbers */}
                        <div className="flex items-center space-x-2 mb-2 pl-8">
                          {cols.map((colNum) => (
                            <div key={colNum} className="flex-1 min-w-[50px] text-center text-[11px] font-bold text-slate-400 font-mono">
                              Col {colNum}
                            </div>
                          ))}
                        </div>

                        {/* Rows */}
                        <div className="space-y-2">
                          {rows.map((rowChar) => (
                            <div key={rowChar} className="flex items-center space-x-2">
                              {/* Row letter badge */}
                              <div className="w-6 text-xs font-bold text-indigo-400 font-mono text-center flex-shrink-0">
                                {rowChar}
                              </div>

                              {/* Seats in this row */}
                              <div className="flex-1 flex space-x-2">
                                {cols.map((colNum) => {
                                  const seat = seatingData.seats.find((s) => s.row === rowChar && s.col === colNum);
                                  if (!seat) {
                                    return (
                                      <div key={colNum} className="flex-1 min-w-[50px] h-12 bg-transparent" />
                                    );
                                  }

                                  const isOccupied = seat.status === 'occupied';
                                  const isSelected = selectedSeatDetails?.seat_id === seat.seat_id;

                                  return (
                                    <button
                                      key={seat.seat_id}
                                      type="button"
                                      onClick={() => setSelectedSeatDetails(seat)}
                                      className={`flex-1 min-w-[50px] h-12 rounded-xl border p-1 text-center flex flex-col items-center justify-center transition-all duration-150 ${
                                        isSelected
                                          ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-950/60 shadow-lg scale-105 z-10'
                                          : isOccupied
                                          ? 'bg-indigo-950/70 border-indigo-700/80 hover:bg-indigo-900/90 hover:border-indigo-500 shadow-sm'
                                          : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800 text-slate-500'
                                      }`}
                                      title={
                                        isOccupied
                                          ? `Seat ${seat.seat_id}: ${seat.student_name} (${seat.student_roll})`
                                          : `Seat ${seat.seat_id}: Available`
                                      }
                                    >
                                      <div className="flex items-center space-x-1">
                                        <Armchair
                                          className={`w-3 h-3 ${
                                            isSelected ? 'text-amber-400' : isOccupied ? 'text-indigo-400' : 'text-slate-600'
                                          }`}
                                        />
                                        <span className={`text-[11px] font-bold font-mono ${
                                          isSelected ? 'text-amber-300' : isOccupied ? 'text-white' : 'text-slate-400'
                                        }`}>
                                          {seat.seat_id}
                                        </span>
                                      </div>
                                      {isOccupied && seat.student_roll && (
                                        <div className="text-[9px] font-mono text-indigo-300 truncate max-w-[55px] mt-0.5">
                                          {seat.student_roll.split('-').pop()}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Legend & Selected Seat Inspection Panel */}
                <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3.5 h-3.5 rounded-md bg-indigo-950 border border-indigo-700" />
                      <span className="text-slate-300 font-medium">Occupied ({seatingData.occupied_count})</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3.5 h-3.5 rounded-md bg-slate-900 border border-slate-700" />
                      <span className="text-slate-400">Available ({seatingData.available_count})</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3.5 h-3.5 rounded-md bg-amber-950 border border-amber-400" />
                      <span className="text-amber-300">Selected Seat</span>
                    </div>
                  </div>

                  {/* Selected Seat Details Pill */}
                  {selectedSeatDetails ? (
                    <div className="bg-slate-900/90 border border-indigo-700/80 px-4 py-2 rounded-xl flex items-center space-x-3 shadow-lg">
                      <div className="bg-indigo-900/80 text-white font-mono font-bold px-2 py-1 rounded text-xs">
                        Seat {selectedSeatDetails.seat_id}
                      </div>
                      <div className="text-left text-xs">
                        {selectedSeatDetails.status === 'occupied' ? (
                          <>
                            <div className="font-bold text-white">{selectedSeatDetails.student_name}</div>
                            <div className="text-[11px] font-mono text-indigo-300">Roll: {selectedSeatDetails.student_roll}</div>
                          </>
                        ) : (
                          <div className="text-emerald-400 font-medium">Ready for allocation (Unoccupied)</div>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedSeatDetails(null)}
                        className="text-slate-400 hover:text-white text-xs ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Click any seat to inspect the allocated student's identity and attendance details.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SEATING VIEW MODE: STUDENT ROSTER LIST TABLE */}
            {seatingViewMode === 'roster' && seatingData && (
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <ListOrdered className="w-4 h-4 text-indigo-400" />
                      <span>Student Examination Seating Roster</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Authentic seated student attendance roster mapped to room {seatingData.room_name} ({seatingData.room_id})
                    </p>
                  </div>
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search by student name or roll number..."
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-64"
                  />
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-700/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Seat ID</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Roll Number</th>
                        <th className="px-4 py-3">Scheduled Subject</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 bg-slate-800/40">
                      {seatingData.seats
                        .filter((s) => s.status === 'occupied')
                        .filter((s) => {
                          if (!rosterSearch) return true;
                          const q = rosterSearch.toLowerCase();
                          return (
                            (s.student_name && s.student_name.toLowerCase().includes(q)) ||
                            (s.student_roll && s.student_roll.toLowerCase().includes(q)) ||
                            s.seat_id.toLowerCase().includes(q)
                          );
                        })
                        .map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-700/40 transition">
                            <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                              <span className="bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                                {s.seat_id}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-white">
                              {s.student_name}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-300">
                              {s.student_roll}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {seatingData.subject_name} ({seatingData.subject_id})
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                ALLOCATED
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DATA QUALITY & VALIDATION REPORT */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Readiness Score Card */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Dataset Readiness Score</span>
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="mt-4 flex items-baseline space-x-2">
                    <span className={`text-4xl font-extrabold ${validationReport?.is_valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {validationReport?.readiness_score || 0}
                    </span>
                    <span className="text-slate-400 text-sm">/ 100</span>
                  </div>
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      validationReport?.is_valid
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {validationReport?.status || 'UNKNOWN'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60 text-xs text-slate-400">
                  Blocking Errors: <span className="font-bold text-rose-400">{validationReport?.summary.total_errors || 0}</span> | Warnings: <span className="font-bold text-amber-400">{validationReport?.summary.total_warnings || 0}</span>
                </div>
              </div>

              {/* Dataset Scope Breakdown */}
              <div className="md:col-span-2 bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">Relational Integrity Scope</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-[11px] text-slate-400">Rooms Analyzed</div>
                    <div className="text-lg font-bold text-white mt-1">{validationReport?.summary.table_counts.rooms || 0}</div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-[11px] text-slate-400">Timeslots Available</div>
                    <div className="text-lg font-bold text-white mt-1">{validationReport?.summary.table_counts.timeslots || 0}</div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-[11px] text-slate-400">Faculty Registered</div>
                    <div className="text-lg font-bold text-white mt-1">{validationReport?.summary.table_counts.faculty || 0}</div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-[11px] text-slate-400">Courses / Subjects</div>
                    <div className="text-lg font-bold text-white mt-1">{validationReport?.summary.table_counts.subjects || 0}</div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-[11px] text-slate-400">Student Groups</div>
                    <div className="text-lg font-bold text-white mt-1">{validationReport?.summary.table_counts.student_groups || 0}</div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-[11px] text-slate-400">Individual Students</div>
                    <div className="text-lg font-bold text-white mt-1">{validationReport?.summary.table_counts.student_enrollments || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Diagnostics List */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-3">Validation Issues & Flagged Constraints</h3>
              {(!validationReport?.errors || validationReport.errors.length === 0) ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>0 validation errors detected. Dataset is 100% clean, verified, and schedulable with 0 clashes!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {validationReport.errors.map((err, i) => (
                    <div key={i} className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/70 text-xs flex items-start space-x-3">
                      <XCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-rose-300 flex items-center space-x-2">
                          <span className="font-mono bg-rose-900 px-1.5 py-0.5 rounded text-[10px] text-white">[{err.code}]</span>
                          <span>Table: {err.table} • Field: {err.field} • Row ID: {err.row_id}</span>
                        </div>
                        <div className="text-slate-300 mt-1">{err.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {validationReport?.diagnostics && validationReport.diagnostics.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700/60">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Engine Feasibility Diagnostics</h4>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {validationReport.diagnostics.map((diag, i) => (
                      <li key={i} className="flex items-center space-x-2">
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{diag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ALGORITHM COMPARISON & BENCHMARK */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span>Side-by-Side Algorithm Benchmark (First-Fit vs Welsh–Powell vs Backtracking)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluated on the exact same university dataset under hard student clashes, room capacities, and faculty constraints.
                  </p>
                </div>
                <button
                  onClick={handleBenchmark}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rerun Benchmark</span>
                </button>
              </div>

              {benchmark ? (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs border border-slate-700 rounded-xl overflow-hidden">
                    <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Algorithm</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Scheduled / Total</th>
                        <th className="px-4 py-3">Hard Conflicts</th>
                        <th className="px-4 py-3">Slots Used</th>
                        <th className="px-4 py-3">Room Utilization</th>
                        <th className="px-4 py-3">Unused Capacity</th>
                        <th className="px-4 py-3">Runtime (ms)</th>
                        <th className="px-4 py-3">Soft Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 bg-slate-800/40">
                      {benchmark.comparison.map((item, idx) => (
                        <tr key={idx} className={item.algorithm === benchmark.summary.best_performing_algorithm ? 'bg-indigo-950/40 font-semibold' : ''}>
                          <td className="px-4 py-3 text-white flex items-center space-x-2">
                            {item.algorithm === benchmark.summary.best_performing_algorithm && (
                              <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            )}
                            <span>{item.algorithm}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              item.is_feasible ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white">
                            {item.scheduled_exams} / {benchmark.summary.total_exams_to_schedule}
                          </td>
                          <td className="px-4 py-3">
                            <span className={item.hard_conflicts === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.hard_conflicts}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-mono">
                            {item.slots_used} / {benchmark.summary.total_available_slots}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {item.room_utilization_pct}%
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {item.unused_capacity_seats} seats
                          </td>
                          <td className="px-4 py-3 font-mono text-indigo-300">
                            {item.execution_time_ms} ms
                          </td>
                          <td className="px-4 py-3 font-bold text-amber-400">
                            {item.soft_score} / 100
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Click 'Rerun Benchmark' to compute side-by-side performance metrics.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: STUDENT COMPANION MOBILE APP */}
        {activeTab === 'student' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center space-x-2 text-indigo-400 mb-3">
                <Smartphone className="w-5 h-5" />
                <h2 className="text-sm font-bold text-white">ExamOpt Student Portal</h2>
              </div>

              {/* Roll number search */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={studentRollNo}
                  onChange={(e) => setStudentRollNo(e.target.value)}
                  placeholder="Enter Roll No (e.g. GLA26-BCA-0001)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={() => handleStudentLookup(studentRollNo)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Lookup
                </button>
              </div>

              {studentData?.student && (
                <div className="mt-4 pt-3 border-t border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{studentData.student.student_name}</div>
                      <div className="text-[11px] font-mono text-indigo-300">{studentData.student.roll_no}</div>
                    </div>
                    {studentData.student.has_backlog === 1 && (
                      <span className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Backlog Cohort
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Upcoming Examinations ({studentData.schedule.length})
                    </div>
                    {studentData.schedule.map((exam: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-900/80 border border-slate-700 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-xs">{exam.subject_name}</span>
                          <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono px-1.5 py-0.5 rounded border border-indigo-800">
                            {exam.slot_id}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-indigo-400 mt-0.5">{exam.subject_id}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{exam.exam_date}</span>
                          </span>
                          <span className="flex items-center space-x-1 font-medium text-slate-300">
                            <Building className="w-3 h-3 text-slate-500" />
                            <span>{exam.room_name} ({exam.room_id})</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: FACULTY DUTY PORTAL */}
        {activeTab === 'faculty' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center space-x-2 text-emerald-400 mb-3">
                <UserCheck className="w-5 h-5" />
                <h2 className="text-sm font-bold text-white">Faculty Invigilation Duty Portal</h2>
              </div>

              {/* Faculty selector */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  placeholder="Enter Faculty ID (e.g. FAC-101)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={() => handleFacultyLookup(facultyId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Lookup
                </button>
              </div>

              {facultyData?.faculty && (
                <div className="mt-4 pt-3 border-t border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{facultyData.faculty.name}</div>
                      <div className="text-[11px] font-mono text-emerald-400">{facultyData.faculty.faculty_id}</div>
                      <div className="text-[11px] text-slate-400">Department: {facultyData.faculty.department}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-emerald-400">
                        {facultyData.assigned_duties_count} / {facultyData.max_duties} Duties
                      </div>
                      <div className="text-[10px] text-slate-400">Max Duty Cap</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Assigned Invigilation Shifts ({facultyData.duties.length})
                    </div>
                    {facultyData.duties.map((duty: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-900/80 border border-slate-700 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-xs">{duty.room_name} ({duty.room_id})</span>
                          <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono px-1.5 py-0.5 rounded border border-indigo-800">
                            {duty.slot_id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1">Course: {duty.subject_name} ({duty.subject_id})</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                          <span>{duty.exam_date}</span>
                          <span className="text-emerald-300 font-medium">{duty.session} ({duty.time_range})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-400">
        ExamOpt — Problem Statement C10: Intelligent Examination Timetable Optimization System • GLA University Context
      </footer>
    </div>
  );
}
