#!/usr/bin/env python3
"""
SmartLid Backend API Regression Test Suite
Tests all backend endpoints after DB_NAME fix and ref prop rename
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from .env: NEXT_PUBLIC_BASE_URL
BASE_URL = "https://slid-main.preview.emergentagent.com/api"

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(passed, message):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")
    return passed

def test_root_endpoint():
    """Test 1: GET /api/ should return 200 with SmartLid API message"""
    print_test_header("GET /api/ - Root endpoint")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        if data.get("message") != "SmartLid API":
            return print_result(False, f"Expected message 'SmartLid API', got {data}")
        
        return print_result(True, "Root endpoint returns correct message")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_contact_happy_path():
    """Test 2: POST /api/contact with valid data"""
    print_test_header("POST /api/contact - Happy path")
    try:
        payload = {
            "name": "Test Investor",
            "email": "test@example.com",
            "message": "Interested in the pitch deck."
        }
        response = requests.post(f"{BASE_URL}/contact", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        if not data.get("ok"):
            return print_result(False, f"Expected ok: true, got {data}")
        
        submission = data.get("submission", {})
        
        # Check for UUID id (not MongoDB _id)
        if "id" not in submission:
            return print_result(False, "Missing 'id' field in submission")
        
        if "_id" in submission:
            return print_result(False, "MongoDB _id should not be present in response")
        
        # Verify all fields are present
        required_fields = ["id", "name", "email", "message", "createdAt"]
        missing = [f for f in required_fields if f not in submission]
        if missing:
            return print_result(False, f"Missing fields: {missing}")
        
        # Verify field values
        if submission["name"] != "Test Investor":
            return print_result(False, f"Name mismatch: {submission['name']}")
        if submission["email"] != "test@example.com":
            return print_result(False, f"Email mismatch: {submission['email']}")
        if submission["message"] != "Interested in the pitch deck.":
            return print_result(False, f"Message mismatch: {submission['message']}")
        
        print(f"✓ Submission ID: {submission['id']}")
        print(f"✓ Created At: {submission['createdAt']}")
        return print_result(True, "Contact form submission successful with valid UUID")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_contact_missing_fields():
    """Test 3: POST /api/contact with missing fields"""
    print_test_header("POST /api/contact - Missing fields")
    try:
        payload = {
            "name": "",
            "email": "",
            "message": ""
        }
        response = requests.post(f"{BASE_URL}/contact", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            return print_result(False, f"Expected 400, got {response.status_code}")
        
        data = response.json()
        if "error" not in data:
            return print_result(False, f"Expected error field, got {data}")
        
        if "name, email, message are required" not in data["error"]:
            return print_result(False, f"Expected validation error message, got {data['error']}")
        
        return print_result(True, "Missing fields validation works correctly")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_contact_invalid_email():
    """Test 4: POST /api/contact with invalid email"""
    print_test_header("POST /api/contact - Invalid email")
    try:
        payload = {
            "name": "X",
            "email": "not-an-email",
            "message": "hi"
        }
        response = requests.post(f"{BASE_URL}/contact", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            return print_result(False, f"Expected 400, got {response.status_code}")
        
        data = response.json()
        if "error" not in data:
            return print_result(False, f"Expected error field, got {data}")
        
        if "invalid email" not in data["error"]:
            return print_result(False, f"Expected email validation error, got {data['error']}")
        
        return print_result(True, "Invalid email validation works correctly")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_contact_get():
    """Test 5: GET /api/contact should return array of submissions"""
    print_test_header("GET /api/contact - List submissions")
    try:
        response = requests.get(f"{BASE_URL}/contact", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        if not isinstance(data, list):
            return print_result(False, f"Expected array, got {type(data)}")
        
        print(f"Response: Found {len(data)} submissions")
        
        # Check if we have at least one submission (from test 2)
        if len(data) == 0:
            return print_result(False, "Expected at least one submission from previous test")
        
        # Verify no _id field is present in any submission
        for idx, submission in enumerate(data):
            if "_id" in submission:
                return print_result(False, f"MongoDB _id found in submission {idx}")
            if "id" not in submission:
                return print_result(False, f"Missing 'id' field in submission {idx}")
        
        # Show first submission
        print(f"Sample submission: {json.dumps(data[0], indent=2, default=str)}")
        
        return print_result(True, f"GET /api/contact returns {len(data)} submissions without _id field")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_status_post():
    """Test 6: POST /api/status"""
    print_test_header("POST /api/status - Legacy endpoint")
    try:
        payload = {
            "client_name": "deployment-test"
        }
        response = requests.post(f"{BASE_URL}/status", json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        
        # Check required fields
        if "id" not in data:
            return print_result(False, "Missing 'id' field")
        if "client_name" not in data:
            return print_result(False, "Missing 'client_name' field")
        if "timestamp" not in data:
            return print_result(False, "Missing 'timestamp' field")
        
        if data["client_name"] != "deployment-test":
            return print_result(False, f"client_name mismatch: {data['client_name']}")
        
        print(f"✓ Status ID: {data['id']}")
        print(f"✓ Timestamp: {data['timestamp']}")
        return print_result(True, "Status POST endpoint works correctly")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_status_get():
    """Test 7: GET /api/status"""
    print_test_header("GET /api/status - List status checks")
    try:
        response = requests.get(f"{BASE_URL}/status", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        if not isinstance(data, list):
            return print_result(False, f"Expected array, got {type(data)}")
        
        print(f"Response: Found {len(data)} status checks")
        
        if len(data) > 0:
            print(f"Sample status: {json.dumps(data[0], indent=2, default=str)}")
        
        return print_result(True, f"GET /api/status returns {len(data)} status checks")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_options_preflight():
    """Test 8: OPTIONS preflight to /api/contact"""
    print_test_header("OPTIONS /api/contact - CORS preflight")
    try:
        response = requests.options(f"{BASE_URL}/contact", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        # Check CORS headers
        required_headers = [
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers"
        ]
        
        missing_headers = []
        for header in required_headers:
            if header not in response.headers:
                missing_headers.append(header)
        
        if missing_headers:
            return print_result(False, f"Missing CORS headers: {missing_headers}")
        
        print(f"✓ Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
        print(f"✓ Access-Control-Allow-Methods: {response.headers.get('Access-Control-Allow-Methods')}")
        print(f"✓ Access-Control-Allow-Headers: {response.headers.get('Access-Control-Allow-Headers')}")
        
        return print_result(True, "OPTIONS preflight returns correct CORS headers")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_nonexistent_route():
    """Test 9: GET /api/some-nonexistent-route should return 404"""
    print_test_header("GET /api/some-nonexistent-route - 404 handling")
    try:
        response = requests.get(f"{BASE_URL}/some-nonexistent-route", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 404:
            return print_result(False, f"Expected 404, got {response.status_code}")
        
        data = response.json()
        if "error" not in data:
            return print_result(False, f"Expected error field, got {data}")
        
        if "not found" not in data["error"].lower():
            return print_result(False, f"Expected 'not found' in error message, got {data['error']}")
        
        return print_result(True, "404 handling works correctly")
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def main():
    print("\n" + "="*80)
    print("SmartLid Backend API Regression Test Suite")
    print("Testing after DB_NAME fix and ref prop rename")
    print(f"Base URL: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("="*80)
    
    results = []
    
    # Run all tests in order
    results.append(("Root endpoint", test_root_endpoint()))
    results.append(("Contact POST happy path", test_contact_happy_path()))
    results.append(("Contact POST missing fields", test_contact_missing_fields()))
    results.append(("Contact POST invalid email", test_contact_invalid_email()))
    results.append(("Contact GET list", test_contact_get()))
    results.append(("Status POST", test_status_post()))
    results.append(("Status GET", test_status_get()))
    results.append(("OPTIONS preflight", test_options_preflight()))
    results.append(("404 handling", test_nonexistent_route()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Backend is working correctly.")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. See details above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
