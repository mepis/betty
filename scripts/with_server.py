#!/usr/bin/env python3
"""
Server manager for LLM Server testing
Starts backend and frontend servers, runs tests, then cleans up
"""

import subprocess
import sys
import time
import signal
import os
from pathlib import Path

class ServerManager:
    def __init__(self):
        self.processes = []
        self.project_root = Path(__file__).parent.parent
    
    def start_backend(self):
        """Start the backend Node.js server"""
        print("Starting backend server...")
        env = os.environ.copy()
        env['NODE_ENV'] = 'development'
        
        process = subprocess.Popen(
            ['node', 'src/server.js'],
            cwd=self.project_root,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        self.processes.append(process)
        print("  Backend process started (PID: {})".format(process.pid))
        return process
    
    def start_frontend(self):
        """Start the frontend Vite dev server"""
        print("Starting frontend server...")
        process = subprocess.Popen(
            ['npm', 'run', 'dev', '--', '--host'],
            cwd=self.project_root / 'frontend',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        self.processes.append(process)
        print("  Frontend process started (PID: {})".format(process.pid))
        return process
    
    def wait_for_server(self, url, timeout=30):
        """Wait for a server to be ready"""
        import urllib.request
        print(f"Waiting for {url} to be ready...")
        start = time.time()
        
        while time.time() - start < timeout:
            try:
                response = urllib.request.urlopen(url, timeout=2)
                if response.status == 200:
                    print(f"  {url} is ready!")
                    return True
            except Exception as e:
                time.sleep(1)
        
        print(f"  Timeout waiting for {url}")
        return False
    
    def cleanup(self):
        """Kill all started processes"""
        print("\nCleaning up processes...")
        for process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
                print(f"  Terminated process {process.pid}")
            except Exception as e:
                try:
                    process.kill()
                    print(f"  Killed process {process.pid}")
                except:
                    pass
        
        # Also kill any remaining node processes on our ports
        try:
            subprocess.run(['pkill', '-f', 'node.*server.js'], capture_output=True)
            subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
        except:
            pass
    
    def run_test_script(self, script_path):
        """Run a test script"""
        print(f"\nRunning test script: {script_path}")
        
        # Use venv python if available
        venv_python = self.project_root / 'venv' / 'bin' / 'python3'
        python_cmd = str(venv_python) if venv_python.exists() else 'python3'
        
        result = subprocess.run(
            [python_cmd, str(script_path)],
            cwd=self.project_root,
            capture_output=False
        )
        
        return result.returncode == 0
    
    def run(self, test_script=None):
        """Main run method"""
        import atexit
        atexit.register(self.cleanup)
        
        print("=" * 60)
        print("LLM Server Test Runner")
        print("=" * 60)
        
        try:
            # Start servers
            self.start_backend()
            self.start_frontend()
            
            # Wait for servers to be ready
            print("\nWaiting for servers to start...")
            time.sleep(3)  # Initial delay
            
            if not self.wait_for_server('http://127.0.0.1:3000/api/health', timeout=20):
                print("ERROR: Backend server failed to start")
                self.cleanup()
                return False
            
            if not self.wait_for_server('http://127.0.0.1:5173', timeout=20):
                print("ERROR: Frontend server failed to start")
                self.cleanup()
                return False
            
            print("\n✓ Both servers are ready!")
            
            # Run tests if script provided
            if test_script:
                success = self.run_test_script(test_script)
            else:
                # Default test script
                test_script = self.project_root / 'test_all_frontend.py'
                if test_script.exists():
                    success = self.run_test_script(test_script)
                else:
                    print(f"ERROR: Test script not found: {test_script}")
                    success = False
            
            return success
            
        except KeyboardInterrupt:
            print("\nInterrupted by user")
            return False
        except Exception as e:
            print(f"\nERROR: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            self.cleanup()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='LLM Server Test Runner')
    parser.add_argument('--test', '-t', help='Path to test script to run')
    parser.add_argument('--backend-only', action='store_true', help='Only start backend')
    parser.add_argument('--frontend-only', action='store_true', help='Only start frontend')
    
    args = parser.parse_args()
    
    manager = ServerManager()
    success = manager.run(test_script=args.test if args.test else None)
    
    sys.exit(0 if success else 1)
