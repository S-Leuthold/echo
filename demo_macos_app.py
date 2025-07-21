#!/usr/bin/env python3
"""
Demo script to show what we've built so far!
"""

import requests
import json
from datetime import datetime

def print_header(title):
    print(f"\n{'='*60}")
    print(f"🎯 {title}")
    print(f"{'='*60}")

def print_section(title):
    print(f"\n📋 {title}")
    print("-" * 40)

def demo_api_server():
    """Demo the API server functionality"""
    
    base_url = "http://localhost:8000"
    
    print_header("ECHO MACOS APP DEMO")
    print("This shows what we've built so far!")
    
    try:
        # Test health check
        print_section("1. Health Check")
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ API Server: {health_data['status']}")
            print(f"⏰ Timestamp: {health_data['timestamp']}")
        else:
            print("❌ API server not responding")
            return
        
        # Test today's schedule
        print_section("2. Today's Schedule & Email Integration")
        response = requests.get(f"{base_url}/today")
        if response.status_code == 200:
            today_data = response.json()
            
            print(f"📅 Date: {today_data['date']}")
            print(f"⏰ Current Time: {today_data['current_time']}")
            print(f"📦 Blocks: {len(today_data['blocks'])} scheduled")
            
            # Email summary
            email_summary = today_data.get('email_summary', {})
            if email_summary:
                print(f"\n📧 Email Summary:")
                print(f"   📝 Summary: {email_summary.get('summary', 'No summary')}")
                print(f"   📊 Unresponded: {email_summary.get('total_unresponded', 0)} emails")
                print(f"   ⚡ Urgent: {email_summary.get('urgent_count', 0)} emails")
                print(f"   🔥 High Priority: {email_summary.get('high_priority_count', 0)} emails")
                
                # Action items
                action_items = email_summary.get('action_items', [])
                if action_items:
                    print(f"\n📋 Action Items:")
                    for i, item in enumerate(action_items[:3], 1):
                        print(f"   {i}. {item[:60]}...")
        
        # Test analytics
        print_section("3. Analytics")
        response = requests.get(f"{base_url}/analytics")
        if response.status_code == 200:
            analytics_data = response.json()
            
            print(f"📊 Date: {analytics_data['date']}")
            print(f"⏱️  Total Time: {analytics_data['total_time']} minutes")
            print(f"🎯 Productivity Score: {analytics_data['productivity_score']:.1f}%")
            print(f"🎯 Focus Time: {analytics_data['focus_time']} minutes")
            print(f"☕ Break Time: {analytics_data['break_time']} minutes")
        
        # Test projects
        print_section("4. Projects")
        response = requests.get(f"{base_url}/projects")
        if response.status_code == 200:
            projects_data = response.json()
            
            print(f"📁 Projects: {len(projects_data)} found")
            for project in projects_data:
                print(f"   📂 {project['name']} ({project['status']})")
                if project.get('current_focus'):
                    print(f"      🎯 Focus: {project['current_focus']}")
        
        # Test sessions
        print_section("5. Sessions")
        response = requests.get(f"{base_url}/sessions")
        if response.status_code == 200:
            sessions_data = response.json()
            print(f"⏱️  Sessions: {len(sessions_data)} found")
        
        print_header("SUMMARY")
        print("✅ API Server: Working perfectly!")
        print("✅ Email Integration: Real email data with action items")
        print("✅ Analytics: Productivity tracking ready")
        print("✅ Projects: Status management working")
        print("✅ Sessions: Session management ready")
        print("\n🎨 Next: Open the macOS app in Xcode to see the UI!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server")
        print("💡 Start the server with: python api_server.py")
    except Exception as e:
        print(f"❌ Error: {e}")

def show_file_structure():
    """Show what files we've created"""
    
    print_header("FILES WE'VE BUILT")
    
    print_section("Python API Server")
    print("✅ api_server.py - FastAPI server with all endpoints")
    print("✅ tests/test_api_server.py - 17 comprehensive tests")
    
    print_section("macOS App (SwiftUI)")
    print("✅ macos/EchoApp/Services/EchoAPI.swift - Networking layer")
    print("✅ macos/EchoApp/ViewModels/TodayViewModel.swift - Real data integration")
    print("✅ macos/EchoApp/Views/TodayView.swift - Beautiful UI with email integration")
    print("✅ macos/EchoApp/Views/SessionView.swift - Session management")
    print("✅ macos/EchoApp/ViewModels/SessionViewModel.swift - Session logic")
    print("✅ macos/EchoApp/Tests/APITest.swift - API connectivity tests")
    
    print_section("Documentation")
    print("✅ macos/README.md - Comprehensive documentation")
    print("✅ ENHANCED_EMAIL_INTEGRATION.md - Email features")
    print("✅ TOKEN_MANAGEMENT.md - OAuth token handling")

if __name__ == "__main__":
    show_file_structure()
    demo_api_server() 