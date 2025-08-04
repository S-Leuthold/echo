#!/usr/bin/env python3
"""Test script for semantic domain detector integration."""

import json
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from echo.conversation_state_manager import create_conversation_manager
from echo.adaptive_coaching_service import AdaptiveCoachingService

async def test_semantic_detection():
    """Test semantic domain detection with various project types."""
    
    # Create service and manager
    print("Creating conversation manager and coaching service...")
    manager = create_conversation_manager()
    service = AdaptiveCoachingService(manager)
    
    # Test cases for different domains
    test_cases = [
        {
            'name': 'Machine Learning Project',
            'message': 'I want to build a machine learning model to predict customer churn using Python and scikit-learn'
        },
        {
            'name': 'Web Development Project',
            'message': 'I need to create a React web application with Node.js backend and PostgreSQL database'
        },
        {
            'name': 'Business Strategy Project',
            'message': 'I need help developing a business plan for my startup, including market research and revenue model'
        },
        {
            'name': 'Design Project',
            'message': 'I want to design a mobile app interface with good UX, creating wireframes in Figma'
        }
    ]
    
    for test_case in test_cases:
        print(f"\n=== Testing: {test_case['name']} ===")
        
        # Start new conversation
        conv = manager.start_conversation("test_user")
        print(f"Conversation ID: {conv.conversation_id}")
        
        # Add user message
        manager.add_user_message(conv.conversation_id, test_case['message'])
        
        # Process with coaching service
        try:
            response = await service.process_user_message(
                conv.conversation_id,
                test_case['message']
            )
            
            print(f"Stage: {response.stage.value if response.stage else 'None'}")
            print(f"Detected Domain: {response.detected_domain}")
            print(f"Confidence: {response.confidence}")
            print(f"Should Transition: {response.should_transition}")
            print(f"Response preview: {response.message[:150]}...")
            
            # Check conversation state for domain detection details
            updated_conv = manager.get_conversation(conv.conversation_id)
            if updated_conv and updated_conv.domain_detection:
                print(f"Domain Detection Reasoning: {updated_conv.domain_detection.reasoning}")
                if updated_conv.domain_detection.alternative_domains:
                    print("Alternative domains:")
                    for alt_domain, conf in updated_conv.domain_detection.alternative_domains:
                        print(f"  - {alt_domain}: {conf:.2%}")
                        
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    print("=== Semantic Domain Detection Integration Test ===")
    asyncio.run(test_semantic_detection())
    print("\n✅ Test complete!")