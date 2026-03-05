#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class RemedyPillsAPITester:
    def __init__(self, base_url="http://127.0.0.1:5050"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_credentials = {"username": "admin", "password": "admin123"}
        self.test_user_credentials = {"username": f"testuser_{datetime.now().strftime('%H%M%S')}", "password": "TestPass123!"}

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        return success

    def test_health_check(self):
        """Test if the server is running"""
        try:
            response = self.session.get(f"{self.base_url}")
            success = response.status_code == 200
            return self.log_test("Server Health Check", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Server Health Check", False, str(e))

    def test_auth_providers_endpoint(self):
        """Test auth providers endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/auth/providers")
            success = response.status_code == 200
            if success:
                data = response.json()
                print(f"   Available providers: Google={data.get('google', False)}, Facebook={data.get('facebook', False)}")
            return self.log_test("Auth Providers Endpoint", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Auth Providers Endpoint", False, str(e))

    def test_admin_login(self):
        """Test admin login"""
        try:
            response = self.session.post(f"{self.base_url}/api/login", json=self.admin_credentials)
            success = response.status_code == 200
            if success:
                user_data = response.json()
                success = user_data.get("role") == "admin"
                if success:
                    print(f"   Admin user: {user_data.get('username')} (Role: {user_data.get('role')})")
                else:
                    return self.log_test("Admin Login", False, f"Expected admin role, got {user_data.get('role')}")
            return self.log_test("Admin Login", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Admin Login", False, str(e))

    def test_admin_logout(self):
        """Test admin logout"""
        try:
            response = self.session.post(f"{self.base_url}/api/logout")
            success = response.status_code == 200
            return self.log_test("Admin Logout", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Admin Logout", False, str(e))

    def test_patient_registration(self):
        """Test patient registration"""
        try:
            patient_data = {
                **self.test_user_credentials,
                "name": "Test Patient",
                "email": "test@remedypills.test",
                "phone": "+1-403-123-4567",
                "dob": "1990-01-01",
                "role": "patient",
                "consentGiven": True
            }
            response = self.session.post(f"{self.base_url}/api/register", json=patient_data)
            success = response.status_code == 201
            if success:
                user_data = response.json()
                success = user_data.get("role") == "patient"
                if success:
                    print(f"   Patient registered: {user_data.get('username')} (Role: {user_data.get('role')})")
            return self.log_test("Patient Registration", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Patient Registration", False, str(e))

    def test_patient_login(self):
        """Test patient login"""
        try:
            response = self.session.post(f"{self.base_url}/api/login", json=self.test_user_credentials)
            success = response.status_code == 200
            if success:
                user_data = response.json()
                success = user_data.get("role") == "patient"
                if success:
                    print(f"   Patient logged in: {user_data.get('username')}")
            return self.log_test("Patient Login", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Patient Login", False, str(e))

    def test_authenticated_endpoints(self):
        """Test authenticated endpoints (prescriptions, appointments, etc.)"""
        endpoints_to_test = [
            ("/api/prescriptions", "GET", "Prescriptions List"),
            ("/api/reminders", "GET", "Reminders List"),
            ("/api/appointments", "GET", "Appointments List"),
            ("/api/notifications", "GET", "Notifications List"),
            ("/api/health-logs", "GET", "Health Logs List"),
            ("/api/messages", "GET", "Messages List")
        ]
        
        all_passed = True
        for endpoint, method, name in endpoints_to_test:
            try:
                if method == "GET":
                    response = self.session.get(f"{self.base_url}{endpoint}")
                success = response.status_code == 200
                if success:
                    data = response.json()
                    print(f"   {name}: {len(data) if isinstance(data, list) else 'N/A'} items")
                else:
                    all_passed = False
                self.log_test(f"Patient {name}", success, f"Status: {response.status_code}")
            except Exception as e:
                all_passed = False
                self.log_test(f"Patient {name}", False, str(e))
        
        return all_passed

    def test_patient_logout(self):
        """Test patient logout"""
        try:
            response = self.session.post(f"{self.base_url}/api/logout")
            success = response.status_code == 200
            return self.log_test("Patient Logout", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Patient Logout", False, str(e))

    def test_protected_admin_endpoint(self):
        """Test that admin endpoints are protected"""
        try:
            # Should fail when not authenticated as admin
            response = self.session.get(f"{self.base_url}/api/admin/users")
            success = response.status_code == 401  # Should be unauthorized
            return self.log_test("Admin Endpoint Protection", success, f"Status: {response.status_code} (expected 401)")
        except Exception as e:
            return self.log_test("Admin Endpoint Protection", False, str(e))

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🔍 Starting RemedyPills Pharmacy API Tests\n")
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Cannot reach server, stopping tests")
            return 1
        
        self.test_auth_providers_endpoint()
        
        # Admin functionality
        self.test_admin_login()
        self.test_admin_logout()
        
        # Patient functionality
        self.test_patient_registration()
        self.test_patient_login()
        self.test_authenticated_endpoints()
        self.test_patient_logout()
        
        # Security
        self.test_protected_admin_endpoint()
        
        # Print summary
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = RemedyPillsAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())