#!/usr/bin/env python3
"""Test complete conversation flow with project summary and domain detection."""

import requests
import json
import time

def test_complete_flow():
    """Test the full conversation flow through summary generation."""
    
    base_url = "http://localhost:8000"
    
    # Start a new conversation
    print("=== Starting New Conversation ===")
    response = requests.post(f"{base_url}/conversations/start", 
                           json={"user_id": "test_user"})
    
    if response.status_code != 200:
        print(f"Error starting conversation: {response.text}")
        return
    
    data = response.json()
    conversation_id = data["conversation_id"]
    print(f"Conversation ID: {conversation_id}")
    print(f"Initial message: {data['message']}\n")
    
    # Messages designed to build understanding and trigger summary
    test_messages = [
        "I want to build a web application for tracking fitness goals",
        "It'll help users set fitness goals like running distances or workout frequencies, track their progress over time with charts, and send reminders. I'm thinking of using React for the frontend and Node.js for the backend.",
        "The target users are fitness enthusiasts who want a simple way to track their progress without all the complexity of full fitness apps. Main features would be goal creation, progress logging, visualization dashboards, and reminder notifications.",
        "I'm planning to use PostgreSQL for the database to store user data and progress logs. For the timeline, I'd like to have an MVP ready in about 3 months. The success criteria would be having at least 100 active users in the first month after launch.",
        "Yes, that sounds perfect! I'm ready to dive into the planning."
    ]
    
    for i, message in enumerate(test_messages):
        print(f"\n--- Message {i+1} ---")
        print(f"User: {message}\n")
        
        # Send message
        response = requests.post(
            f"{base_url}/conversations/{conversation_id}/message",
            json={"message": message}
        )
        
        if response.status_code != 200:
            print(f"Error sending message: {response.text}")
            continue
        
        data = response.json()
        print(f"Assistant: {data['message']}\n")
        print(f"Stage: {data.get('stage', 'unknown')}")
        print(f"Should Transition: {data.get('should_transition', False)}")
        
        if data.get('detected_domain'):
            print(f"\n🎯 DOMAIN DETECTED: {data['detected_domain']}")
            print(f"Confidence: {data.get('confidence', 0)}")
        
        if data.get('should_transition'):
            print(f"\n✅ STAGE TRANSITION DETECTED!")
            if data.get('stage') == 'confirmation':
                print("Moving to CONFIRMATION stage")
            elif data.get('stage') == 'expert_coaching':
                print("Moving to EXPERT COACHING stage")
        
        # Small delay to simulate real conversation
        time.sleep(0.5)

if __name__ == "__main__":
    print("=== Testing Complete Conversation Flow ===\n")
    test_complete_flow()
    print("\n✅ Test complete!")