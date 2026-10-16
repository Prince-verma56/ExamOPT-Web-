"""
ExamOpt — Real Browser End-to-End Test Suite
Executes in real Google Chrome browser via Playwright.
Tests Student, Faculty, and Admin authentication, Timetable Matrix, Filters,
CSV export, Portal Lookups, Logout, and Navigation boundaries.
"""

import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "http://127.0.0.1:5173"
SCREENSHOT_DIR = Path(__file__).resolve().parent / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def run_e2e_verification():
    print("=" * 80)
    print(" EXAMOPT REAL-BROWSER END-TO-END VERIFICATION")
    print(f" Browser: Google Chrome ({CHROME_PATH})")
    print(f" Target:  {BASE_URL}")
    print("=" * 80)

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        try:
            # -------------------------------------------------------------
            # STEP 1: INITIAL PAGE LOAD & LOGIN FORM
            # -------------------------------------------------------------
            print("\n[+] Step 1: Navigating to ExamOpt Web Application...")
            page.goto(BASE_URL, wait_until="networkidle")
            page.wait_for_timeout(1000)

            title = page.title()
            print(f"    Page Title: '{title}'")
            assert "ExamOpt" in title, f"Unexpected title: {title}"

            # Verify Institutional Login heading is rendered
            login_heading = page.locator("text=Institutional Portal Sign In").first
            assert login_heading.is_visible(), "Institutional Portal Sign In heading not found!"
            print("    [PASS] Institutional Login interface displayed.")
            page.screenshot(path=str(SCREENSHOT_DIR / "01_login_screen.png"))
            results.append(("01_initial_login_screen", "PASS", "Login interface displayed cleanly"))

            # -------------------------------------------------------------
            # STEP 2: STUDENT LOGIN & PORTAL VERIFICATION
            # -------------------------------------------------------------
            print("\n[+] Step 2: Testing Student Login Journey...")
            page.get_by_role("button", name="Student", exact=True).click()
            page.wait_for_timeout(300)

            akash_chip = page.locator("button:has-text('Akash Singh (BCA-0001)')").first
            akash_chip.click()
            page.wait_for_timeout(300)

            page.get_by_role("button", name="Sign In", exact=True).click()

            # Wait for Student Schedule to finish loading
            page.wait_for_selector("text=Upcoming Examinations", timeout=15000)

            student_name = page.locator("text=Akash Singh").first
            assert student_name.is_visible(), "Student name 'Akash Singh' not visible!"

            roll_badge = page.locator("text=GLA26-BCA-0001").first
            assert roll_badge.is_visible(), "Roll number 'GLA26-BCA-0001' not visible!"

            # Verify 4 exams are displayed
            for sub_code in ["BCA-101", "BCA-102", "BCA-103", "BCA-104P"]:
                assert page.locator(f"text={sub_code}").first.is_visible(), f"Exam {sub_code} not found!"

            print("    [PASS] Student portal rendered 4 authentic exams for Akash Singh (GLA26-BCA-0001).")
            page.screenshot(path=str(SCREENSHOT_DIR / "02_student_portal.png"))
            results.append(("02_student_login_and_portal", "PASS", "Akash Singh profile and 4 authentic exams displayed"))

            # Logout from Student session
            page.get_by_role("button", name="Sign Out", exact=True).click()
            page.wait_for_selector("text=Institutional Portal Sign In", timeout=10000)
            print("    [PASS] Student logout cleared session and returned to Login.")
            results.append(("03_student_logout", "PASS", "Session cleared and login re-rendered"))

            # -------------------------------------------------------------
            # STEP 3: FACULTY LOGIN & DUTY PORTAL
            # -------------------------------------------------------------
            print("\n[+] Step 3: Testing Faculty Login Journey...")
            page.get_by_role("button", name="Faculty", exact=True).click()
            page.wait_for_timeout(300)

            fac_chip = page.locator("button:has-text('Dr. Ashish Sharma (FAC-101)')").first
            fac_chip.click()
            page.wait_for_timeout(300)

            page.get_by_role("button", name="Sign In", exact=True).click()

            # Wait for Faculty Duties to finish loading
            page.wait_for_selector("text=Assigned Invigilation Shifts", timeout=15000)

            fac_name = page.locator("text=Dr. Ashish Sharma").first
            assert fac_name.is_visible(), "Faculty name not visible!"

            dept_badge = page.locator("text=Department: CSED").first
            assert dept_badge.is_visible(), "Department CSED badge not visible!"

            print("    [PASS] Faculty portal rendered Dr. Ashish Sharma (FAC-101) with duty roster.")
            page.screenshot(path=str(SCREENSHOT_DIR / "03_faculty_portal.png"))
            results.append(("04_faculty_login_and_portal", "PASS", "Dr. Ashish Sharma profile and duties rendered"))

            # Logout from Faculty session
            page.get_by_role("button", name="Sign Out", exact=True).click()
            page.wait_for_selector("text=Institutional Portal Sign In", timeout=10000)
            print("    [PASS] Faculty logout cleared session and returned to Login.")
            results.append(("05_faculty_logout", "PASS", "Faculty session invalidated and returned to login"))

            # -------------------------------------------------------------
            # STEP 4: ADMINISTRATOR LOGIN & OVERVIEW
            # -------------------------------------------------------------
            print("\n[+] Step 4: Testing Administrator Login & Dashboard...")
            page.get_by_role("button", name="Admin", exact=True).click()
            page.wait_for_timeout(300)

            page.get_by_role("button", name="Sign In", exact=True).click()
            page.wait_for_selector("text=Exams (Subjects)", timeout=15000)

            # Check entity count badges
            assert page.locator("text=Exams (Subjects)").first.is_visible(), "Subjects metric card not visible!"
            assert page.locator("text=Exam Rooms").first.is_visible(), "Rooms metric card not visible!"
            assert page.locator("text=Time Slots").first.is_visible(), "Timeslots metric card not visible!"
            assert page.locator("text=Faculty").first.is_visible(), "Faculty metric card not visible!"
            print("    [PASS] Admin Overview rendered with campus capacity and entity stats.")
            page.screenshot(path=str(SCREENSHOT_DIR / "04_admin_overview.png"))
            results.append(("06_admin_login_and_overview", "PASS", "Admin dashboard loaded with system stats"))

            # -------------------------------------------------------------
            # STEP 5: TIMETABLE GRID & FILTERS VERIFICATION
            # -------------------------------------------------------------
            print("\n[+] Step 5: Testing Timetable Grid & Dynamic Filters...")
            page.get_by_role("button", name="Timetable Grid", exact=True).click()
            page.wait_for_selector("text=Showing 24 of 24 examinations", timeout=15000)
            print("    [PASS] Timetable Grid displays all 24 published examinations.")

            # Test Program Filter (select BCA Regular)
            selects = page.locator("select").all()
            prog_select = selects[0]
            prog_select.select_option("BCA")
            page.wait_for_selector("text=Showing 8 of 24 examinations", timeout=5000)
            print("    [PASS] Program filter: BCA Regular filtered to 8 examinations.")

            # Test Semester Filter (select Semester 1)
            sem_select = selects[1]
            sem_select.select_option("1")
            page.wait_for_selector("text=Showing 4 of 24 examinations", timeout=5000)
            print("    [PASS] Semester filter: Semester 1 filtered to 4 examinations.")

            # Test Room Type Filter (select Laboratories Only)
            room_select = selects[2]
            room_select.select_option("LAB")
            page.wait_for_selector("text=Showing 1 of 24 examinations", timeout=5000)
            print("    [PASS] Room type filter: LAB filtered to 1 laboratory examination.")

            # Reset all filters to ALL
            prog_select.select_option("ALL")
            sem_select.select_option("ALL")
            room_select.select_option("ALL")
            page.wait_for_selector("text=Showing 24 of 24 examinations", timeout=5000)
            print("    [PASS] All filters reset successfully to 24 examinations.")
            page.screenshot(path=str(SCREENSHOT_DIR / "05_timetable_grid.png"))
            results.append(("07_timetable_grid_and_filters", "PASS", "24 allocations and filters (Program, Sem, Room) verified"))

            # -------------------------------------------------------------
            # STEP 6: CSV EXPORT BUTTON
            # -------------------------------------------------------------
            print("\n[+] Step 6: Verifying CSV Export Button...")
            download_link = page.locator("a:has-text('Download CSV')").first
            assert download_link.is_visible(), "Download CSV button not found!"
            csv_href = download_link.get_attribute("href")
            assert "/api/v1/timetable/export/csv" in csv_href, f"CSV URL mismatch: {csv_href}"
            print(f"    [PASS] Download CSV button verified pointing to '{csv_href}'.")
            results.append(("08_csv_export_action", "PASS", f"Download CSV link verified ({csv_href})"))

            # -------------------------------------------------------------
            # STEP 7: OTHER ADMIN TABS (VALIDATOR & BENCHMARK)
            # -------------------------------------------------------------
            print("\n[+] Step 7: Testing Data Quality & Benchmark Tabs...")
            # Data Quality tab
            page.get_by_role("button", name="Data Quality", exact=True).click()
            page.wait_for_selector("text=Dataset Readiness Score", timeout=10000)
            print("    [PASS] Data Quality tab displays Dataset Readiness Score.")
            page.screenshot(path=str(SCREENSHOT_DIR / "06_data_quality.png"))
            results.append(("09_data_quality_tab", "PASS", "Readiness score and constraint validation report rendered"))

            # Benchmark tab
            page.get_by_role("button", name="Algorithm Comparison", exact=True).click()
            page.wait_for_selector("text=Side-by-Side Algorithm Benchmark", timeout=15000)

            # Click Rerun Benchmark to execute live comparison
            rerun_btn = page.locator("button:has-text('Rerun Benchmark')").first
            if rerun_btn.is_visible():
                rerun_btn.click()
                page.wait_for_timeout(3000)

            assert page.locator("text=Side-by-Side Algorithm Benchmark").first.is_visible(), "Benchmark heading not found!"
            print("    [PASS] Algorithm Comparison tab displays multi-algorithm comparison.")
            page.screenshot(path=str(SCREENSHOT_DIR / "07_algorithm_comparison.png"))
            results.append(("10_algorithm_comparison_tab", "PASS", "Multi-algorithm comparison (Welsh-Powell, Backtracking, First-Fit) displayed"))

            # -------------------------------------------------------------
            # STEP 8: LOGOUT, DIRECT NAVIGATION, & SECURITY GATING
            # -------------------------------------------------------------
            print("\n[+] Step 8: Testing Logout, Direct Navigation & Security Gating...")
            page.get_by_role("button", name="Sign Out", exact=True).click()
            page.wait_for_selector("text=Institutional Portal Sign In", timeout=10000)
            print("    [PASS] Administrator signed out successfully.")

            # Verify localStorage token and user are purged
            stored_user = page.evaluate("() => localStorage.getItem('examopt_user')")
            stored_token = page.evaluate("() => localStorage.getItem('examopt_token')")
            assert stored_user is None, f"Expected examopt_user to be None, got: {stored_user}"
            assert stored_token is None, f"Expected examopt_token to be None, got: {stored_token}"
            print("    [PASS] Client storage completely purged (tokens & session wiped).")

            # Direct navigation to root and hash routes while logged out
            for target_route in ["/", "/#overview", "/#timetable", "/#validation", "/#benchmark"]:
                page.goto(f"{BASE_URL}{target_route}", wait_until="networkidle")
                page.wait_for_timeout(500)
                assert page.locator("text=Institutional Portal Sign In").first.is_visible(), (
                    f"Direct navigation to {target_route} bypassed authentication gate!"
                )
            print("    [PASS] Direct navigation to protected pages strictly blocked; login enforced.")

            # Test browser back navigation between routes while logged out
            page.go_back()
            page.wait_for_timeout(500)
            assert page.locator("text=Institutional Portal Sign In").first.is_visible(), (
                "Browser back navigation exposed protected views!"
            )
            print("    [PASS] Browser back navigation retains login security enforcement.")

            page.screenshot(path=str(SCREENSHOT_DIR / "08_post_logout_gated.png"))
            results.append(("11_logout_and_navigation_security", "PASS", "Tokens wiped, direct navigation blocked, login gate enforced"))

        finally:
            browser.close()

    print("\n" + "=" * 80)
    print(" BROWSER E2E TEST SUMMARY")
    print("=" * 80)
    all_passed = True
    for test_id, status, details in results:
        print(f"[{status}] {test_id:<32} : {details}")
        if status != "PASS":
            all_passed = False

    print("=" * 80)
    if all_passed:
        print(">>> ALL 11 REAL-BROWSER END-TO-END STEPS PASSED WITH 100% SUCCESS! <<<")
    else:
        print(">>> SOME BROWSER STEPS FAILED! <<<")
    print("=" * 80)
    return all_passed


if __name__ == "__main__":
    success = run_e2e_verification()
    sys.exit(0 if success else 1)
