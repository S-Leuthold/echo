#!/usr/bin/env python3
"""
Test script to verify conversation API with better progression
"""

import requests
import json
import time

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
    
    # 2. Send initial project description
    print("\n2. Sending project description...")
    message = "I want to build a mobile app for tracking daily habits and goals"
    
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
    print(f"   - AI says: {data.get('message', '')[:200]}...")
    
    # 3. Answer AI's questions
    print("\n3. Providing more details...")
    message2 = "It should have reminders and analytics. I'd like to complete this in about 3 months, working on weekends. Planning to launch on both iOS and Android."
    
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
    
    # Check if we have clean extracted data
    extracted = data2.get('extracted_data', {})
    print("\n   Extracted project data:")
    print(f"   - Project name: {extracted.get('project_name', 'Not extracted')}")
    print(f"   - Project type: {extracted.get('project_type', 'Not extracted')}")
    print(f"   - Timeline: {extracted.get('timeline_info', 'Not extracted')}")
    print(f"   - Deliverables: {extracted.get('key_deliverables', [])}")
    
    # 4. If still in discovery, provide one more response
    if data2.get('stage') == 'discovery':
        print("\n4. Providing final details...")
        message3 = "This is a personal project. I want to help people build better habits."
        
        response = requests.post(
            f"{BASE_URL}/conversations/{conversation_id}/message",
            json={"message": message3}
        )
        
        data3 = response.json()
        print(f"   ✓ Response received")
        print(f"   - Stage: {data3.get('stage')}")
        print(f"   - Should transition: {data3.get('should_transition')}")
        
        # Check extracted data again
        extracted = data3.get('extracted_data', {})
        print("\n   Final extracted project data:")
        print(f"   - Project name: {extracted.get('project_name', 'Not extracted')}")
        print(f"   - Project type: {extracted.get('project_type', 'Not extracted')}")
        print(f"   - Timeline: {extracted.get('timeline_info', 'Not extracted')}")
        print(f"   - Deliverables: {extracted.get('key_deliverables', [])}")
        print(f"   - Description: {extracted.get('description', 'Not extracted')[:100]}...")

if __name__ == "__main__":
    test_conversation_flow()