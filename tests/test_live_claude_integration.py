#!/usr/bin/env python3
"""
Live Claude Integration Demo
===========================

This script demonstrates the three-phase Claude integration working with real API calls.
We'll generate scaffolds, start a session, and complete it with AI synthesis.
"""

import requests
import json
import time
from datetime import datetime, date

# API Configuration
API_BASE = "http://127.0.0.1:8001"

def test_api_health():
    """Test if the API server is responding."""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API Server is responding")
            return True
        else:
            print(f"❌ API Server responded with {response.status_code}")
            return False
    except requests.ConnectionError:
        print("❌ Cannot connect to API server - is it running on port 8001?")
        return False
    except Exception as e:
        print(f"❌ API Health check failed: {e}")
        return False

def test_scaffold_generation():
    """Test Phase 1: Post-Planning Enrichment (Scaffold Generation)"""
    print("\n🧠 PHASE 1: Testing Scaffold Generation with Live Claude")
    print("=" * 60)
    
    # Sample daily plan for scaffold generation
    daily_plan = [
        {
            "start": "09:00:00",
            "end": "10:30:00",
            "label": "Echo | Live Claude Integration Demo",
            "type": "flex",
            "meta": {
                "id": "demo-block-1",
                "time_category": "deep_work"
            }
        },
        {
            "start": "14:00:00", 
            "end": "15:30:00",
            "label": "Research | Data Analysis Pipeline",
            "type": "flex",
            "meta": {
                "id": "demo-block-2",
                "time_category": "analysis"
            }
        }
    ]
    
    # Context briefing (what Claude will use for intelligent scaffolding)
    context_briefing = {
        "executive_summary": "Today's focus is on demonstrating the live Claude integration system while advancing research data analysis workflows.",
        "email_summary": {
            "action_items": ["Review Claude integration performance", "Respond to research collaboration email"],
            "response_needed": ["Project status update request"],
            "metadata": {"total_processed": 8}
        },
        "session_notes": {
            "pending_commitments": ["Complete Claude demo", "Finalize data analysis pipeline", "Document integration patterns"],
            "metadata": {"sessions_analyzed": 5}
        },
        "commitments_deadlines": {
            "urgent_deadlines": ["Claude integration demo due today"],
            "upcoming_deadlines": ["Research manuscript draft due Friday"],
            "metadata": {"deadlines_processed": 3}
        }
    }
    
    # Make the API request
    scaffold_request = {
        "daily_plan": daily_plan,
        "context_briefing": context_briefing,
        "force_refresh": True
    }
    
    print(f"📤 Sending scaffold generation request to Claude...")
    print(f"   • {len(daily_plan)} work blocks")
    print(f"   • Comprehensive context briefing")
    print(f"   • Force refresh: True")
    
    try:
        response = requests.post(
            f"{API_BASE}/session/generate-scaffolds",
            json=scaffold_request,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Scaffold Generation SUCCESS!")
            print(f"   • Generated: {result['scaffolds_generated']} scaffolds")
            print(f"   • Success rate: {result['success_rate']*100:.1f}%")
            print(f"   • Message: {result['message']}")
            
            if result['failed_blocks']:
                print(f"   • Failed blocks: {result['failed_blocks']}")
            
            return True
        else:
            print(f"❌ Scaffold generation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.Timeout:
        print("⏱️ Request timed out - Claude might be taking longer than expected")
        return False
    except Exception as e:
        print(f"❌ Error during scaffold generation: {e}")
        return False

def test_session_start():
    """Test Phase 2: Real-time Session Start with Checklist Generation"""
    print("\n🚀 PHASE 2: Testing Session Start with Live Claude")
    print("=" * 60)
    
    # Session start request (what user would input when starting a session)
    start_request = {
        "block_id": "demo-block-1",
        "primary_outcome": "Successfully demonstrate live Claude integration with comprehensive testing",
        "key_tasks": [
            "Test scaffold generation with real Claude API calls",
            "Validate session start checklist generation",
            "Demonstrate session completion log synthesis",
            "Document API performance and response quality"
        ],
        "session_duration_minutes": 90,
        "energy_level": 8,
        "time_constraints": "Need to complete demo before end of session"
    }
    
    print(f"📤 Sending session start request to Claude...")
    print(f"   • Block ID: {start_request['block_id']}")
    print(f"   • Primary outcome: {start_request['primary_outcome']}")
    print(f"   • Key tasks: {len(start_request['key_tasks'])}")
    print(f"   • Energy level: {start_request['energy_level']}/10")
    print(f"   • Duration: {start_request['session_duration_minutes']} minutes")
    
    try:
        response = requests.post(
            f"{API_BASE}/session/start",
            json=start_request,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Session Start SUCCESS!")
            print(f"   • Session title: {result['session_title']}")
            print(f"   • Primary objective: {result['primary_objective']}")
            print(f"   • Checklist items: {len(result['checklist'])}")
            print(f"   • Success criteria: {len(result['success_criteria'])}")
            
            print(f"\n📋 Generated Checklist:")
            for i, item in enumerate(result['checklist'][:3], 1):  # Show first 3 items
                priority_emoji = {"high": "🔥", "medium": "⚡", "low": "📋"}.get(item['priority'], "📋")
                print(f"   {i}. {priority_emoji} {item['task']} ({item['estimated_minutes']}min, {item['category']})")
            
            if len(result['checklist']) > 3:
                print(f"   ... and {len(result['checklist']) - 3} more items")
            
            print(f"\n⏱️ Time Allocation:")
            for category, minutes in result['time_allocation'].items():
                print(f"   • {category.title()}: {minutes} minutes")
            
            return result  # Return for next phase
        else:
            print(f"❌ Session start failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except requests.Timeout:
        print("⏱️ Request timed out - Claude might be taking longer than expected")
        return None
    except Exception as e:
        print(f"❌ Error during session start: {e}")
        return None

def test_session_completion(checklist_data=None):
    """Test Phase 3: Session Completion with Hybrid Voice Model Synthesis"""
    print("\n📝 PHASE 3: Testing Session Completion with Live Claude")
    print("=" * 60)
    
    # Session completion request (what user would input when ending a session)
    completion_request = {
        "block_title": "Echo | Live Claude Integration Demo",
        "project_name": "Echo",
        "session_date": date.today().isoformat(),
        "duration_minutes": 85,  # Slightly under time
        "time_category": "deep_work",
        "start_time": "09:00",
        "end_time": "10:25",
        "accomplishments": "Successfully tested all three phases of Claude integration with live API calls. Validated scaffold generation, real-time checklist creation, and session completion synthesis. Confirmed API endpoints are working correctly with proper error handling. Documented performance characteristics and response quality.",
        "outstanding": "Still need to integrate with frontend session states. Should test with larger data sets to validate performance at scale. Need to monitor Claude API usage costs during production deployment.",
        "final_notes": "The Claude integration is working beautifully! The three-phase architecture provides excellent separation of concerns while delivering genuine AI intelligence. The hybrid voice model creates remarkably useful session logs that will be valuable for future planning.",
        "checklist_data": checklist_data  # Include checklist if we have it
    }
    
    print(f"📤 Sending session completion request to Claude...")
    print(f"   • Session: {completion_request['block_title']}")
    print(f"   • Duration: {completion_request['duration_minutes']} minutes")
    print(f"   • Accomplishments: {len(completion_request['accomplishments'])} characters")
    print(f"   • Outstanding: {len(completion_request['outstanding'])} characters")
    print(f"   • Final notes: {len(completion_request['final_notes'])} characters")
    
    try:
        response = requests.post(
            f"{API_BASE}/session/complete",
            json=completion_request,
            timeout=45  # Longer timeout for synthesis
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Session Completion SUCCESS!")
            print(f"   • Status: {result['status']}")
            print(f"   • Stored successfully: {result['stored_successfully']}")
            print(f"   • Log length: {len(result['session_log_markdown'])} characters")
            print(f"   • AI insights: {len(result['ai_insights'])} categories")
            
            print(f"\n📊 AI Insights Generated:")
            for key, value in result['ai_insights'].items():
                if isinstance(value, list):
                    print(f"   • {key.replace('_', ' ').title()}: {len(value)} items")
                else:
                    print(f"   • {key.replace('_', ' ').title()}: {value}")
            
            print(f"\n📄 Session Log Preview (Hybrid Voice Model):")
            print("-" * 50)
            # Show first 500 characters of the generated log
            log_preview = result['session_log_markdown'][:500]
            print(log_preview)
            if len(result['session_log_markdown']) > 500:
                print(f"\n... ({len(result['session_log_markdown']) - 500} more characters)")
            
            return True
        else:
            print(f"❌ Session completion failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.Timeout:
        print("⏱️ Request timed out - Claude synthesis can take longer for complex logs")
        return False
    except Exception as e:
        print(f"❌ Error during session completion: {e}")
        return False

def main():
    """Run the complete live Claude integration demo."""
    print("🎯 LIVE CLAUDE INTEGRATION DEMO")
    print("=" * 70)
    print("Testing the complete three-phase session intelligence system")
    print("with real Claude API calls and your actual project data!")
    print()
    
    start_time = time.time()
    
    # Test 1: API Health
    if not test_api_health():
        print("\n❌ Cannot proceed - API server not responding")
        return False
    
    # Test 2: Phase 1 - Scaffold Generation
    scaffold_success = test_scaffold_generation()
    
    # Test 3: Phase 2 - Session Start  
    checklist_data = test_session_start()
    session_start_success = checklist_data is not None
    
    # Test 4: Phase 3 - Session Completion
    completion_success = test_session_completion(checklist_data)
    
    # Results Summary
    end_time = time.time()
    total_time = end_time - start_time
    
    print("\n" + "=" * 70)
    print("🎯 LIVE DEMO RESULTS")
    print("=" * 70)
    
    tests = [
        ("Phase 1: Scaffold Generation", scaffold_success),
        ("Phase 2: Session Start", session_start_success), 
        ("Phase 3: Session Completion", completion_success)
    ]
    
    passed = sum(1 for _, success in tests if success)
    total = len(tests)
    
    for test_name, success in tests:
        emoji = "✅" if success else "❌"
        print(f"{emoji} {test_name}")
    
    print(f"\nResults: {passed}/{total} phases successful")
    print(f"Total time: {total_time:.1f} seconds")
    
    if passed == total:
        print("\n🎉 COMPLETE SUCCESS!")
        print("The three-phase Claude integration is LIVE and operational!")
        print("\n🚀 Next Steps:")
        print("• Frontend integration to connect with session states")
        print("• Production monitoring for Claude API usage")
        print("• Scale testing with larger data sets")
    else:
        print(f"\n⚠️ {total - passed} phase(s) failed - check error messages above")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)