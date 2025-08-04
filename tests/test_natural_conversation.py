#!/usr/bin/env python3
"""Test natural conversation flow with updated Claude integration."""

import requests
import json
import time

def test_natural_conversation():
    """Test the conversation flow to ensure it feels natural like browser Claude."""
    
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
    
    # Test messages that should build naturally
    test_messages = [
        "I'm building a test project now.",
        "For sure! The project objective is to test the implementation of the project creation wizard end to end. I've recently created an AI integration into the wizard, and I want to see if it works correctly.",
        "Let's discuss the timeline.",
        "I need to complete the testing by end of day today. The deliverables are a working conversation flow that feels natural like talking to Claude in the browser."
    ]
    
    for i, message in enumerate(test_messages):
        print(f"\n--- Message {i+1} ---")
        print(f"User: {message}")
        
        # Send message
        response = requests.post(
            f"{base_url}/conversations/{conversation_id}/message",
            json={"message": message}
        )
        
        if response.status_code != 200:
            print(f"Error sending message: {response.text}")
            continue
        
        data = response.json()
        print(f"\nAssistant: {data['message']}")
        print(f"Stage: {data.get('stage', 'unknown')}")
        print(f"Should Transition: {data.get('should_transition', False)}")
        
        if data.get('detected_domain'):
            print(f"Detected Domain: {data['detected_domain']}")
            print(f"Confidence: {data.get('confidence', 0)}")
        
        # Small delay to simulate real conversation
        time.sleep(1)

if __name__ == "__main__":
    print("=== Testing Natural Conversation Flow ===")
    test_natural_conversation()
    print("\n✅ Test complete!")