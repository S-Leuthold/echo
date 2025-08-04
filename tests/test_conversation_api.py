#!/usr/bin/env python3
"""
Test script to verify conversation API returns expected data structure
"""

import requests
import json

# Base URL for the API
BASE_URL = "http://localhost:8000"

def test_conversation_flow():
    """Test the conversation flow and data extraction"""
    
    # 1. Start a conversation
    print("1. Starting conversation...")
    response = requests.post(f"{BASE_URL}/conversations", json={})
    if response.status_code != 200:
        print(f"Error starting conversation: {response.status_code}")
        print(response.text)
        return
    
    conv_data = response.json()
    conversation_id = conv_data['id']
    print(f"   ✓ Conversation started: {conversation_id}")
    
    # 2. Send a message about a project
    print("\n2. Sending project description...")
    message = "I want to build a mobile app for tracking daily habits and goals. It should have reminders and analytics."
    
    response = requests.post(
        f"{BASE_URL}/conversations/{conversation_id}/message",
        json={"message": message}
    )
    
    if response.status_code != 200:
        print(f"Error sending message: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    print(f"   ✓ Response received")
    print(f"   - Stage: {data.get('stage')}")
    print(f"   - Confidence: {data.get('confidence')}")
    print(f"   - Extracted data: {json.dumps(data.get('extracted_data', {}), indent=2)}")
    
    # 3. Send another message with timeline
    print("\n3. Adding timeline information...")
    message2 = "I'd like to complete this in about 3 months, working on weekends."
    
    response = requests.post(
        f"{BASE_URL}/conversations/{conversation_id}/message",
        json={"message": message2}
    )
    
    if response.status_code != 200:
        print(f"Error sending second message: {response.status_code}")
        print(response.text)
        return
    
    data2 = response.json()
    print(f"   ✓ Response received")
    print(f"   - Stage: {data2.get('stage')}")
    print(f"   - Confidence: {data2.get('confidence')}")
    print(f"   - Project summary: {data2.get('project_summary', 'Not yet available')}")
    print(f"   - Extracted data: {json.dumps(data2.get('extracted_data', {}), indent=2)}")
    
    # 4. Get conversation state
    print("\n4. Getting conversation state...")
    response = requests.get(f"{BASE_URL}/conversations/{conversation_id}")
    
    if response.status_code != 200:
        print(f"Error getting conversation: {response.status_code}")
        print(response.text)
        return
    
    state = response.json()
    print(f"   ✓ Conversation state retrieved")
    print(f"   - Messages: {state.get('message_count', 0)}")
    print(f"   - Project data available: {'extracted_data' in state}")
    if 'project' in state:
        print(f"   - Project summary: {state['project'].get('summary', 'None')}")
        print(f"   - Project data: {json.dumps(state['project'].get('data', {}), indent=2)}")

if __name__ == "__main__":
    test_conversation_flow()