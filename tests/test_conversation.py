#!/usr/bin/env python3
"""Test script to debug conversation flow."""

import json
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from echo.conversation_state_manager import create_conversation_manager
from echo.adaptive_coaching_service import AdaptiveCoachingService

def test_conversation():
    try:
        # Create manager and service
        print("Creating conversation manager...")
        manager = create_conversation_manager()
        
        print("Creating adaptive coaching service...")
        service = AdaptiveCoachingService(manager)
        
        # Start conversation
        print("Starting conversation...")
        conv = manager.start_conversation("test_user")
        print(f"Conversation ID: {conv.conversation_id}")
        print(f"Messages type: {type(conv.messages)}")
        print(f"Messages: {conv.messages}")
        
        # Get conversation back
        print("\nRetrieving conversation...")
        retrieved = manager.get_conversation(conv.conversation_id)
        print(f"Retrieved conversation: {retrieved.conversation_id if retrieved else 'None'}")
        
        if retrieved:
            print(f"Retrieved messages type: {type(retrieved.messages)}")
            print(f"Retrieved messages: {retrieved.messages}")
            
            # Add a user message
            print("\nAdding user message...")
            manager.add_user_message(
                conv.conversation_id,
                "I want to build a machine learning model",
                metadata={}
            )
            
            # Process with coaching service
            print("\nProcessing with coaching service...")
            try:
                import asyncio
                response = asyncio.run(service.process_user_message(
                    conv.conversation_id,
                    "I want to build a machine learning model"
                ))
                print(f"Response: {response}")
            except Exception as e:
                print(f"Error in coaching service: {e}")
                import traceback
                traceback.print_exc()
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_conversation()