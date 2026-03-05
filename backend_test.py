import requests
import sys
from datetime import datetime
import time

class PharmacyAuthTester:
    def __init__(self, base_url="http://127.0.0.1:5050"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_json = response.json()
                    print(f"   Response: {response_json}")
                    return True, response_json
                except:
                    print(f"   Response: {response.text}")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_providers(self):
        """Test auth providers endpoint"""
        success, response = self.run_test(
            "Auth Providers API",
            "GET",
            "/api/auth/providers",
            200
        )
        if success:
            expected_google = True
            expected_facebook = False
            if response.get('google') == expected_google and response.get('facebook') == expected_facebook:
                print(f"   ✅ Providers correct: Google={response.get('google')}, Facebook={response.get('facebook')}")
                return True
            else:
                print(f"   ❌ Providers incorrect: Expected Google=True, Facebook=False, Got Google={response.get('google')}, Facebook={response.get('facebook')}")
                return False
        return False

    def test_admin_login(self):
        """Test admin login with username/password"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'id' in response:
            print(f"   ✅ Admin logged in successfully: {response.get('name', 'Admin')}")
            return True
        return False

    def test_invalid_login(self):
        """Test invalid login credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "/api/login",
            401,
            data={"username": "invalid", "password": "invalid"}
        )
        return success

    def test_user_endpoint_without_auth(self):
        """Test user endpoint without authentication"""
        success, response = self.run_test(
            "User Endpoint (No Auth)",
            "GET",
            "/api/user",
            401
        )
        return success

    def test_patient_registration(self):
        """Test patient registration with username/password"""
        test_user = f"testpatient_{int(time.time())}"
        success, response = self.run_test(
            "Patient Registration",
            "POST",
            "/api/register",
            201,
            data={
                "username": test_user,
                "password": "testpass123",
                "name": "Test Patient",
                "email": f"{test_user}@test.com",
                "role": "patient",
                "consentGiven": True
            }
        )
        if success and 'id' in response:
            print(f"   ✅ Patient registered successfully: {response.get('name')}")
            return True
        return False

    def test_emergent_auth_callback_missing_session(self):
        """Test Emergent Auth callback with missing session ID"""
        success, response = self.run_test(
            "Emergent Auth Callback (Missing Session)",
            "POST",
            "/api/auth/emergent-callback",
            400,
            data={}
        )
        return success

    def test_emergent_auth_callback_invalid_session(self):
        """Test Emergent Auth callback with invalid session ID"""
        success, response = self.run_test(
            "Emergent Auth Callback (Invalid Session)",
            "POST",
            "/api/auth/emergent-callback",
            401,
            data={"sessionId": "invalid_session_id"}
        )
        return success

def main():
    print("🚀 Starting Pharmacy Auth System Tests")
    print("=" * 50)
    
    tester = PharmacyAuthTester()
    
    # Test auth providers endpoint first
    print("\n📋 Testing Auth Providers Configuration...")
    tester.test_auth_providers()
    
    # Test admin login
    print("\n👨‍💼 Testing Admin Authentication...")
    tester.test_admin_login()
    
    # Test invalid login
    print("\n🚫 Testing Invalid Credentials...")
    tester.test_invalid_login()
    
    # Test protected endpoint without auth
    print("\n🔒 Testing Protected Endpoints...")
    tester.test_user_endpoint_without_auth()
    
    # Test patient registration
    print("\n👤 Testing Patient Registration...")
    tester.test_patient_registration()
    
    # Test Emergent Auth callback endpoints
    print("\n🔗 Testing Emergent Auth Callbacks...")
    tester.test_emergent_auth_callback_missing_session()
    tester.test_emergent_auth_callback_invalid_session()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed. Check the details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())