"""
ExamOpt — FastAPI Endpoints & Security Authorization Test Suite
Verifies:
1. Public health checks distinguishing application process health from database connectivity.
2. Unauthenticated request rejection (HTTP 401) on administrative and personalized endpoints.
3. Role-based access control (RBAC): Admin vs Faculty vs Student isolation (HTTP 403).
4. Student timetable isolation: students cannot access other students' records or faculty duties.
5. Faculty duties isolation: faculty cannot access other faculty records or student timetables.
6. Admin operations: schedule generation, publication, data summary, and table inspection.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

ADMIN_HEADERS = {
    "Authorization": "Bearer test-admin-token",
    "X-ExamOpt-Role": "ADMIN"
}

STUDENT_HEADERS_1 = {
    "Authorization": "Bearer mock-student-GLA26-BCA-0001",
    "X-ExamOpt-Role": "STUDENT",
    "X-ExamOpt-RollNo": "GLA26-BCA-0001"
}

STUDENT_HEADERS_2 = {
    "Authorization": "Bearer mock-student-GLA26-BCA-0002",
    "X-ExamOpt-Role": "STUDENT",
    "X-ExamOpt-RollNo": "GLA26-BCA-0002"
}

FACULTY_HEADERS_1 = {
    "Authorization": "Bearer mock-faculty-FAC-101",
    "X-ExamOpt-Role": "FACULTY",
    "X-ExamOpt-FacultyId": "FAC-101"
}

FACULTY_HEADERS_2 = {
    "Authorization": "Bearer mock-faculty-FAC-102",
    "X-ExamOpt-Role": "FACULTY",
    "X-ExamOpt-FacultyId": "FAC-102"
}


# -----------------------------------------------------------------------------
# 1. Public Health Check Tests
# -----------------------------------------------------------------------------
def test_health_check_public_and_distinct_process_db():
    """Verify health check is public and explicitly separates app process health from DB connectivity."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")

    # Application process health
    assert "application" in data
    assert data["application"]["status"] == "UP"
    assert data["application"]["service"] == "ExamOpt API"

    # Database connectivity health
    assert "database" in data
    assert data["database"]["status"] == "UP"
    assert data["database"]["connected"] is True
    assert data["database"]["is_cloud"] is False
    assert "password" not in str(data)
    assert "secret" not in str(data)


# -----------------------------------------------------------------------------
# 2. Unauthenticated Access Rejections (HTTP 401)
# -----------------------------------------------------------------------------
def test_unauthenticated_requests_rejected():
    """Verify unauthenticated requests to protected endpoints return 401 Unauthorized."""
    # Data endpoints
    assert client.get("/api/data/summary").status_code == 401
    assert client.get("/api/data/tables/rooms").status_code == 401
    assert client.post("/api/data/validate").status_code == 401
    assert client.post("/api/data/load-preset/normal").status_code == 401

    # Scheduling engine
    assert client.post("/api/v1/schedules/generate", json={"algorithm": "FIRST_FIT"}).status_code == 401
    assert client.post("/api/v1/schedules/compare").status_code == 401
    assert client.get("/api/v1/schedules").status_code == 401
    assert client.get("/api/v1/schedules/RUN-DRAFT-123").status_code == 401
    assert client.post("/api/v1/schedules/RUN-DRAFT-123/publish").status_code == 401

    # Personalized timetables
    assert client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001").status_code == 401
    assert client.get("/api/v1/timetable/faculty?faculty_id=FAC-101").status_code == 401


# -----------------------------------------------------------------------------
# 3. Student Isolation & Privilege Enforcement (HTTP 403)
# -----------------------------------------------------------------------------
def test_student_isolation_and_boundary_checks():
    """Verify students can access ONLY their own record, and cannot access admin or faculty endpoints."""
    # First ensure a schedule is published so timetables have records
    client.post("/api/v1/schedules/generate", json={"algorithm": "WELSH_POWELL"}, headers=ADMIN_HEADERS)
    pub = client.post("/api/v1/schedules/generate", json={"algorithm": "WELSH_POWELL"}, headers=ADMIN_HEADERS).json()
    client.post(f"/api/v1/schedules/{pub['run_id']}/publish", headers=ADMIN_HEADERS)

    # 1. Student can access their own schedule
    res_own = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001", headers=STUDENT_HEADERS_1)
    assert res_own.status_code == 200
    assert res_own.json()["student"]["roll_no"] == "GLA26-BCA-0001"

    # 2. Student CANNOT access another student's schedule
    res_other = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0002", headers=STUDENT_HEADERS_1)
    assert res_other.status_code == 403
    assert "Forbidden" in res_other.json()["detail"]

    # 3. Student CANNOT access faculty duties
    res_fac = client.get("/api/v1/timetable/faculty?faculty_id=FAC-101", headers=STUDENT_HEADERS_1)
    assert res_fac.status_code == 403

    # 4. Student CANNOT perform administrative actions
    assert client.post("/api/v1/schedules/generate", json={"algorithm": "WELSH_POWELL"}, headers=STUDENT_HEADERS_1).status_code == 403
    assert client.post("/api/v1/schedules/RUN-1/publish", headers=STUDENT_HEADERS_1).status_code == 403
    assert client.get("/api/data/tables/student_enrollments", headers=STUDENT_HEADERS_1).status_code == 403


# -----------------------------------------------------------------------------
# 4. Faculty Isolation & Privilege Enforcement (HTTP 403)
# -----------------------------------------------------------------------------
def test_faculty_isolation_and_boundary_checks():
    """Verify faculty can access ONLY their own examination duties, and cannot access student records or admin operations."""
    # 1. Faculty can access their own duties
    res_own = client.get("/api/v1/timetable/faculty?faculty_id=FAC-101", headers=FACULTY_HEADERS_1)
    assert res_own.status_code == 200
    assert res_own.json()["faculty"]["faculty_id"] == "FAC-101"

    # 2. Faculty CANNOT access another faculty's duties
    res_other = client.get("/api/v1/timetable/faculty?faculty_id=FAC-102", headers=FACULTY_HEADERS_1)
    assert res_other.status_code == 403
    assert "Forbidden" in res_other.json()["detail"]

    # 3. Faculty CANNOT access student personalized records
    res_stu = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001", headers=FACULTY_HEADERS_1)
    assert res_stu.status_code == 403

    # 4. Faculty CANNOT perform administrative actions
    assert client.post("/api/v1/schedules/generate", json={"algorithm": "WELSH_POWELL"}, headers=FACULTY_HEADERS_1).status_code == 403
    assert client.post("/api/v1/schedules/RUN-1/publish", headers=FACULTY_HEADERS_1).status_code == 403
    assert client.get("/api/data/tables/faculty", headers=FACULTY_HEADERS_1).status_code == 403


# -----------------------------------------------------------------------------
# 5. Administrator Full Scoped Operations
# -----------------------------------------------------------------------------
def test_admin_full_operations():
    """Verify authenticated administrator can perform generation, publication, data retrieval, and cross-inspections."""
    # 1. Data summary
    summary_resp = client.get("/api/data/summary", headers=ADMIN_HEADERS)
    assert summary_resp.status_code == 200
    counts = summary_resp.json()["counts"]
    assert counts["rooms"] == 15
    assert counts["subjects"] == 24

    # 2. Table data with pagination
    tbl_resp = client.get("/api/data/tables/rooms?limit=5&offset=0", headers=ADMIN_HEADERS)
    assert tbl_resp.status_code == 200
    tbl_data = tbl_resp.json()
    assert tbl_data["table"] == "rooms"
    assert tbl_data["count"] == 5
    assert tbl_data["total"] == 15

    # 3. Validation
    val_resp = client.post("/api/data/validate", headers=ADMIN_HEADERS)
    assert val_resp.status_code == 200
    assert val_resp.json()["is_valid"] is True

    # 4. Generation
    gen_resp = client.post("/api/v1/schedules/generate", json={"algorithm": "BACKTRACKING"}, headers=ADMIN_HEADERS)
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["is_feasible"] is True
    run_id = gen_data["run_id"]

    # 5. Publication
    pub_resp = client.post(f"/api/v1/schedules/{run_id}/publish", headers=ADMIN_HEADERS)
    assert pub_resp.status_code == 200
    assert pub_resp.json()["is_active"] is True

    # 6. Admin can inspect any student or faculty record
    admin_stu = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001", headers=ADMIN_HEADERS)
    assert admin_stu.status_code == 200

    admin_fac = client.get("/api/v1/timetable/faculty?faculty_id=FAC-101", headers=ADMIN_HEADERS)
    assert admin_fac.status_code == 200


# -----------------------------------------------------------------------------
# 6. Public Active Published Timetable
# -----------------------------------------------------------------------------
def test_public_active_published_timetable_access():
    """Verify active published timetable is publicly readable without credentials and contains no secrets."""
    pub_resp = client.get("/api/v1/schedules/active-published")
    assert pub_resp.status_code == 200
    pub_data = pub_resp.json()
    assert "allocations" in pub_data
    # Does not contain raw secret tokens
    assert "password" not in str(pub_data)


# -----------------------------------------------------------------------------
# 7. Authentication Lifecycle & Room Seating Tests
# -----------------------------------------------------------------------------
def test_auth_login_student_success():
    """Verify student login issues a valid JWT for an existing roll number."""
    resp = client.post("/api/v1/auth/login", json={
        "role": "STUDENT",
        "identifier": "GLA26-BCA-0001"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "STUDENT"
    assert data["user"]["name"] == "Akash Singh"
    assert data["user"]["student_roll_no"] == "GLA26-BCA-0001"


def test_auth_login_student_invalid_roll_rejected():
    """Verify non-existent student roll number is rejected with 401."""
    resp = client.post("/api/v1/auth/login", json={
        "role": "STUDENT",
        "identifier": "INVALID-ROLL-9999"
    })
    assert resp.status_code == 401
    assert "not found" in resp.json()["detail"].lower()


def test_auth_login_faculty_success():
    """Verify faculty login issues a valid JWT for an existing faculty ID."""
    resp = client.post("/api/v1/auth/login", json={
        "role": "FACULTY",
        "identifier": "FAC-101"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "FACULTY"
    assert data["user"]["name"] == "Dr. Ashish Sharma"
    assert data["user"]["faculty_id"] == "FAC-101"


def test_auth_login_admin_success():
    """Verify admin login succeeds and provides ADMIN role."""
    resp = client.post("/api/v1/auth/login", json={
        "role": "ADMIN",
        "identifier": "admin@examopt.internal",
        "password": "examopt-admin-2026"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"


def test_auth_me_with_token():
    """Verify /api/v1/auth/me returns the authenticated student profile."""
    # 1. Login
    login_resp = client.post("/api/v1/auth/login", json={
        "role": "STUDENT",
        "identifier": "GLA26-BCA-0001"
    })
    token = login_resp.json()["access_token"]

    # 2. Query /me
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["student_roll_no"] == "GLA26-BCA-0001"
    assert me_data["name"] == "Akash Singh"
    assert me_data["role"] == "STUDENT"


def test_auth_logout():
    """Verify logout returns logged out confirmation."""
    resp = client.post("/api/v1/auth/logout")
    assert resp.status_code == 200
    assert resp.json()["status"] == "LOGGED_OUT"


def test_auth_logout_revokes_token_server_side():
    """Verify that logging out revokes the JWT server-side so it cannot be reused."""
    # 1. Login to obtain a genuine JWT token
    login_resp = client.post("/api/v1/auth/login", json={
        "role": "STUDENT",
        "identifier": "GLA26-BCA-0001",
        "password": "pwd"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]

    # 2. Verify token grants access to protected endpoints
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["student_roll_no"] == "GLA26-BCA-0001"

    tt_resp = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001", headers={"Authorization": f"Bearer {token}"})
    assert tt_resp.status_code == 200

    # 3. Perform logout passing the Bearer token
    logout_resp = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_resp.status_code == 200
    assert logout_resp.json()["status"] == "LOGGED_OUT"

    # 4. Verify that the previously valid token is now rejected server-side
    revoked_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert revoked_me.status_code == 401
    assert "revoked" in revoked_me.json()["detail"].lower()

    revoked_tt = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001", headers={"Authorization": f"Bearer {token}"})
    assert revoked_tt.status_code == 401
    assert "revoked" in revoked_tt.json()["detail"].lower()


def test_student_isolation_cannot_access_other_student_or_faculty_data():
    """Verify that student tokens cannot inspect other students' timetables or faculty duties."""
    login_resp = client.post("/api/v1/auth/login", json={
        "role": "STUDENT",
        "identifier": "GLA26-BCA-0001",
        "password": "pwd"
    })
    token = login_resp.json()["token"]
    auth_header = {"Authorization": f"Bearer {token}"}

    # Accessing own timetable succeeds
    own_resp = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001", headers=auth_header)
    assert own_resp.status_code == 200

    # Accessing another student's timetable is rejected with 403 Forbidden
    other_resp = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0002", headers=auth_header)
    assert other_resp.status_code == 403
    assert "Forbidden" in other_resp.json()["detail"]

    # Accessing faculty duties is rejected with 403 Forbidden
    fac_resp = client.get("/api/v1/timetable/faculty?faculty_id=FAC-101", headers=auth_header)
    assert fac_resp.status_code == 403
    assert "Forbidden" in fac_resp.json()["detail"]


def test_faculty_isolation_cannot_access_other_faculty_or_student_data():
    """Verify that faculty tokens cannot inspect other faculty members' duties or student timetables."""
    login_resp = client.post("/api/v1/auth/login", json={
        "role": "FACULTY",
        "identifier": "FAC-101",
        "password": "pwd"
    })
    token = login_resp.json()["token"]
    auth_header = {"Authorization": f"Bearer {token}"}

    # Accessing own duties succeeds
    own_resp = client.get("/api/v1/timetable/faculty?faculty_id=FAC-101", headers=auth_header)
    assert own_resp.status_code == 200

    # Accessing another faculty member's duties is rejected with 403 Forbidden
    other_resp = client.get("/api/v1/timetable/faculty?faculty_id=FAC-102", headers=auth_header)
    assert other_resp.status_code == 403
    assert "Forbidden" in other_resp.json()["detail"]

    # Accessing student timetable is rejected with 403 Forbidden
    stu_resp = client.get("/api/v1/timetable/student?roll_no=GLA26-BCA-0001", headers=auth_header)
    assert stu_resp.status_code == 403
    assert "Forbidden" in stu_resp.json()["detail"]


def test_timetable_current_alias():
    """Verify /api/timetable/current alias returns active published schedule."""
    resp = client.get("/api/timetable/current")
    assert resp.status_code == 200
    assert "allocations" in resp.json()


def test_room_seating_allocation():
    """Verify room seating returns real layout with occupied and available seats."""
    resp = client.get("/api/v1/rooms/AB11-101/seating")
    assert resp.status_code == 200
    data = resp.json()
    assert data["room_id"] == "AB11-101"
    assert data["capacity"] > 0
    assert "seats" in data
    assert len(data["seats"]) == data["capacity"]
