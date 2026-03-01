import requests
import sys
import json
from datetime import datetime

class iCalSyncTester:
    def __init__(self):
        self.base_url = "https://event-watcher.preview.emergentagent.com/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []
        
    def log_test(self, name, success, message=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {message}")
            self.errors.append(f"{name}: {message}")

    def run_get_test(self, name, endpoint, expected_status=200):
        """Run GET request test"""
        try:
            response = requests.get(f"{self.base_url}/{endpoint}", timeout=10)
            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                return True, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, None

    def run_post_test(self, name, endpoint, data=None, expected_status=200):
        """Run POST request test"""
        try:
            headers = {'Content-Type': 'application/json'}
            response = requests.post(
                f"{self.base_url}/{endpoint}", 
                json=data, 
                headers=headers,
                timeout=10
            )
            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                return True, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, None

    def run_put_test(self, name, endpoint, data=None, expected_status=200):
        """Run PUT request test"""
        try:
            headers = {'Content-Type': 'application/json'}
            response = requests.put(
                f"{self.base_url}/{endpoint}", 
                json=data, 
                headers=headers,
                timeout=10
            )
            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                return True, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, None
        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, None

    def test_all_endpoints(self):
        """Test all API endpoints"""
        print("🚀 Starting iCal Sync API Tests...")
        print("="*50)
        
        # 1. Health Check
        success, _ = self.run_get_test("Health Check", "health")
        if not success:
            print("❌ API is not responding. Stopping tests.")
            return False
            
        # 2. Auth Status
        self.run_get_test("Auth Status", "auth/status")
        
        # 3. Get Settings (should work without auth by default)
        success, settings = self.run_get_test("Get Settings", "settings")
        
        # 4. Update Settings - Test calendar names and sync interval
        if success:
            updated_settings = {
                "calendar_name_1": "Test Kalender 1",
                "calendar_name_2": "Test Kalender 2", 
                "sync_interval": 30,
                "ical_url_1": "https://calendar.google.com/calendar/ical/test1.ics",
                "ical_url_2": "https://calendar.google.com/calendar/ical/test2.ics"
            }
            self.run_put_test("Update Settings", "settings", updated_settings)
        
        # 5. Get Events (should be empty initially)
        self.run_get_test("Get Events", "events")
        
        # 6. Manual Sync
        success, sync_result = self.run_post_test("Manual Sync", "sync")
        if success:
            print(f"   📊 Sync result: {sync_result}")
            
        # 7. Test auth with disabled auth (should succeed)
        self.run_post_test("Login (Auth Disabled)", "auth/login", {"password": "test"})
        
        # 8. Enable auth and test login
        auth_settings = {
            "auth_enabled": True,
            "auth_password": "testpass123"
        }
        self.run_put_test("Enable Auth", "settings", auth_settings)
        
        # 9. Test login with correct password
        self.run_post_test("Login (Correct Password)", "auth/login", {"password": "testpass123"})
        
        # 10. Test login with incorrect password
        self.run_post_test("Login (Wrong Password)", "auth/login", {"password": "wrongpass"}, 401)
        
        # 11. Try to confirm a non-existent event (should fail)
        self.run_post_test("Confirm Non-existent Event", "events/test-id-123/confirm", expected_status=404)
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("📊 TEST SUMMARY")
        print("="*50)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.errors:
            print("\n❌ FAILED TESTS:")
            for error in self.errors:
                print(f"  • {error}")
        else:
            print("\n🎉 All tests passed!")
        
        print("="*50)

def main():
    tester = iCalSyncTester()
    
    try:
        tester.test_all_endpoints()
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
    finally:
        tester.print_summary()
        return 0 if tester.tests_run == tester.tests_passed else 1

if __name__ == "__main__":
    sys.exit(main())