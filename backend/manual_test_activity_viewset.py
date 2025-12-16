#!/usr/bin/env python
"""
Manual test script for ActivityLogViewSet endpoints.
Run this after starting the Django server to verify the API works.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_activity_endpoints():
    """Test ActivityLogViewSet endpoints"""
    
    print("=" * 60)
    print("Testing ActivityLogViewSet Endpoints")
    print("=" * 60)
    
    # First, login as an instructor
    print("\n1. Logging in as instructor...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login/",
        json={
            "username": "instructor",
            "password": "password123"
        }
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return
    
    token = login_response.json().get('access')
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful")
    
    # Test 1: List all activity logs
    print("\n2. Testing GET /api/activity/logs/")
    response = requests.get(f"{BASE_URL}/api/activity/logs/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data.get('count', 0)} activity logs")
        if data.get('results'):
            print(f"Sample activity: {json.dumps(data['results'][0], indent=2)}")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Test 2: Get recent activities
    print("\n3. Testing GET /api/activity/logs/recent/")
    response = requests.get(f"{BASE_URL}/api/activity/logs/recent/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data.get('count', 0)} recent activities")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Test 3: Get recent activities with limit
    print("\n4. Testing GET /api/activity/logs/recent/?limit=10")
    response = requests.get(f"{BASE_URL}/api/activity/logs/recent/?limit=10", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data.get('count', 0)} activities (limited to 10)")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Test 4: Filter by action type
    print("\n5. Testing GET /api/activity/logs/?action_type=lesson_complete")
    response = requests.get(
        f"{BASE_URL}/api/activity/logs/?action_type=lesson_complete",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data.get('count', 0)} lesson completion activities")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Test 5: Filter by date range
    print("\n6. Testing GET /api/activity/logs/?date_from=2024-01-01&date_to=2025-12-31")
    response = requests.get(
        f"{BASE_URL}/api/activity/logs/?date_from=2024-01-01&date_to=2025-12-31",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data.get('count', 0)} activities in date range")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Test 6: Test as non-instructor (should fail)
    print("\n7. Testing access as student (should be forbidden)...")
    student_login = requests.post(
        f"{BASE_URL}/api/auth/login/",
        json={
            "username": "student",
            "password": "password123"
        }
    )
    
    if student_login.status_code == 200:
        student_token = student_login.json().get('access')
        student_headers = {"Authorization": f"Bearer {student_token}"}
        
        response = requests.get(f"{BASE_URL}/api/activity/logs/", headers=student_headers)
        if response.status_code == 403:
            print("✅ Correctly forbidden for non-instructor")
        else:
            print(f"❌ Expected 403, got {response.status_code}")
    
    print("\n" + "=" * 60)
    print("Testing Complete!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        test_activity_endpoints()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to Django server.")
        print("Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")
