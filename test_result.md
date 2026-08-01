#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  SmartLid corporate website deployment failed on production. Fix root causes and verify
  the app is ready for redeploy. Backend must still function correctly after fixes.

backend:
  - task: "MongoDB connection uses DB_NAME env only (no hardcoded fallback)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Removed hardcoded 'smartlid' fallback in connectToMongo(). Now uses
          process.env.DB_NAME directly. This was flagged by deployment_agent as
          the primary deployment blocker.
      - working: true
        agent: "testing"
        comment: |
          ✅ VERIFIED: MongoDB connection working correctly with process.env.DB_NAME.
          Tested all endpoints - documents are being persisted and retrieved successfully.
          No hardcoded fallback detected. Database operations confirmed working:
          - contact_messages collection: INSERT and FIND operations successful
          - status_checks collection: INSERT and FIND operations successful
          All responses correctly exclude MongoDB _id field (using UUID id instead).

  - task: "Contact form POST /api/contact still works after DB change"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Verify POST /api/contact with valid {name, email, message} returns 200
          and persists a document. Verify GET /api/contact returns the list.
          Verify invalid email returns 400. Verify missing fields returns 400.
          Verify /api/status POST/GET still works (legacy endpoints).
          Verify OPTIONS returns 200 (CORS preflight).
      - working: true
        agent: "testing"
        comment: |
          ✅ ALL BACKEND ENDPOINTS VERIFIED WORKING:
          1. GET /api/ → 200 {"message":"SmartLid API"} ✅
          2. POST /api/contact (valid data) → 200, UUID id, no _id, data persisted ✅
          3. POST /api/contact (missing fields) → 400 "name, email, message are required" ✅
          4. POST /api/contact (invalid email) → 400 "invalid email" ✅
          5. GET /api/contact → 200, array with 2 submissions, no _id fields ✅
          6. POST /api/status → 200, UUID id, timestamp ✅
          7. GET /api/status → 200, array with status checks ✅
          8. OPTIONS /api/contact → 204 with CORS headers (Cloudflare proxy) ✅
          9. GET /api/nonexistent → 404 "Route /... not found" ✅
          Minor: OPTIONS returns 204 (Cloudflare) instead of 200, but CORS headers present.
          All validation, persistence, and retrieval working correctly.

  - task: "React 19 reserved prop 'ref' renamed to 'refNo' on PatentRow / PatentCard"
    implemented: true
    working: "NA"
    file: "app/page.js, app/patent/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Production build was failing with 'Refs cannot be used in Server
          Components' during static generation of /patent. Renamed the prop
          `ref` -> `refNo` in both PatentRow (app/page.js) and PatentCard
          (app/patent/page.js). Local `yarn build` now generates all 14 static
          pages successfully.

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "MongoDB connection uses DB_NAME env only (no hardcoded fallback)"
    - "Contact form POST /api/contact still works after DB change"
    - "React 19 reserved prop 'ref' renamed to 'refNo' on PatentRow / PatentCard"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Fixed two deployment blockers:
      1) Removed hardcoded 'smartlid' DB fallback -> uses process.env.DB_NAME only.
      2) Renamed reserved prop `ref` -> `refNo` on PatentRow and PatentCard to
         allow static prerendering under React 19 / Next.js 15.5.16.
      `yarn build` now succeeds locally with all 14 static pages generated.
      Please verify the backend API endpoints still function correctly:
        - POST /api/contact (happy path + invalid email + missing fields)
        - GET  /api/contact (list retrieval)
        - POST /api/status  (legacy)
        - GET  /api/status  (legacy)
        - OPTIONS preflight
        - GET  / (root API message)
      Environment: DB_NAME is set in .env; MONGO_URL points to local mongodb.
      Base URL for tests: use NEXT_PUBLIC_BASE_URL from /app/.env with /api prefix.
  - agent: "testing"
    message: |
      ✅ BACKEND REGRESSION TEST COMPLETE - ALL TESTS PASSED
      
      Comprehensive backend API testing completed after DB_NAME fix.
      Created /app/backend_test.py for regression testing.
      
      Test Results (9/9 endpoints verified):
      ✅ GET /api/ - Root endpoint working
      ✅ POST /api/contact - Happy path with UUID, no _id, data persisted
      ✅ POST /api/contact - Missing fields validation (400)
      ✅ POST /api/contact - Invalid email validation (400)
      ✅ GET /api/contact - List retrieval, no _id fields
      ✅ POST /api/status - Legacy endpoint working
      ✅ GET /api/status - Legacy endpoint working
      ✅ OPTIONS /api/contact - CORS headers present (204 via Cloudflare)
      ✅ GET /api/nonexistent - 404 handling working
      
      MongoDB Connectivity: CONFIRMED WORKING
      - Documents persisting correctly to contact_messages collection
      - Documents persisting correctly to status_checks collection
      - process.env.DB_NAME being used (no hardcoded fallback)
      - All responses correctly exclude MongoDB _id (using UUID id)
      
      No critical issues found. Backend is production-ready.
