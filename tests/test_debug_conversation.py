#!/usr/bin/env python3
"""Debug conversation flow to identify issues."""

import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from echo.conversation_state_manager import create_conversation_manager
from echo.adaptive_coaching_service import AdaptiveCoachingService

async def test_debug():
    """Test with debug output."""
    
    # Create service and manager
    print("Creating conversation manager and coaching service...")
    manager = create_conversation_manager()
    service = AdaptiveCoachingService(manager)
    
    # Start conversation
    conv = manager.start_conversation("debug_user")
    print(f"Conversation ID: {conv.conversation_id}")
    print(f"Initial messages: {len(conv.messages)}")
    
    # Add user message
    test_message = "I want to build a simple test application"
    print(f"\nAdding user message: {test_message}")
    manager.add_user_message(conv.conversation_id, test_message)
    
    # Process with service
    print("\nProcessing with coaching service...")
    try:
        response = await service.process_user_message(conv.conversation_id, test_message)
        print(f"Response: {response.message[:100]}...")
        print(f"Stage: {response.stage}")
        print(f"Confidence: {response.confidence}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=== Debug Conversation Test ===")
    asyncio.run(test_debug())
    print("\n✅ Test complete!")