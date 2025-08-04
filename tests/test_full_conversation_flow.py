#!/usr/bin/env python3
"""Test script for full conversation flow with domain detection."""

import json
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from echo.conversation_state_manager import create_conversation_manager
from echo.adaptive_coaching_service import AdaptiveCoachingService

async def test_full_conversation():
    """Test full conversation flow from discovery through expert coaching."""
    
    # Create service and manager
    print("Creating conversation manager and coaching service...")
    manager = create_conversation_manager()
    service = AdaptiveCoachingService(manager)
    
    # Start conversation
    conv = manager.start_conversation("test_user")
    print(f"\n=== Starting Conversation: {conv.conversation_id} ===\n")
    
    # Discovery stage messages
    discovery_messages = [
        "I want to build a machine learning model for customer churn prediction",
        "We have about 100k customer records with features like usage patterns, payment history, and support tickets",
        "The goal is to identify customers likely to cancel in the next 30 days so we can proactively reach out",
        "I'm planning to use Python with scikit-learn and maybe XGBoost for the modeling"
    ]
    
    for i, message in enumerate(discovery_messages):
        print(f"\n--- Discovery Message {i+1} ---")
        print(f"User: {message}")
        
        # Add to conversation
        manager.add_user_message(conv.conversation_id, message)
        
        # Get response
        response = await service.process_user_message(conv.conversation_id, message)
        
        print(f"Assistant: {response.message[:200]}...")
        print(f"Stage: {response.stage.value if response.stage else 'None'}")
        print(f"Confidence: {response.confidence}")
        print(f"Should Transition: {response.should_transition}")
        
        if response.should_transition:
            print(f"\n🔄 STAGE TRANSITION DETECTED!")
            print(f"Domain: {response.detected_domain}")
            
            # Check detailed domain detection
            updated_conv = manager.get_conversation(conv.conversation_id)
            if updated_conv and updated_conv.domain_detection:
                print(f"Domain Detection Confidence: {updated_conv.domain_detection.confidence:.2%}")
                print(f"Reasoning: {updated_conv.domain_detection.reasoning}")
                if updated_conv.domain_detection.alternative_domains:
                    print("Alternative domains:")
                    for alt_domain, conf in updated_conv.domain_detection.alternative_domains:
                        print(f"  - {alt_domain}: {conf:.2%}")
            break
    
    # If we transitioned to confirmation, handle that stage
    if response.should_transition and response.stage:
        print("\n=== CONFIRMATION STAGE ===")
        
        # Confirm understanding
        confirm_message = "Yes, that's exactly right! Let's proceed with the expert guidance."
        print(f"\nUser: {confirm_message}")
        
        manager.add_user_message(conv.conversation_id, confirm_message)
        confirm_response = await service.process_user_message(conv.conversation_id, confirm_message)
        
        print(f"Assistant: {confirm_response.message[:300]}...")
        print(f"Stage: {confirm_response.stage.value if confirm_response.stage else 'None'}")
        print(f"Domain: {confirm_response.detected_domain}")
        
        # Expert coaching stage
        if confirm_response.stage and confirm_response.stage.value == "expert_coaching":
            print("\n=== EXPERT COACHING STAGE ===")
            
            expert_question = "What would be the best approach for handling class imbalance in this dataset?"
            print(f"\nUser: {expert_question}")
            
            manager.add_user_message(conv.conversation_id, expert_question)
            expert_response = await service.process_user_message(conv.conversation_id, expert_question)
            
            print(f"Assistant: {expert_response.message[:400]}...")
            print(f"Stage: {expert_response.stage.value if expert_response.stage else 'None'}")
            print(f"Confidence: {expert_response.confidence}")
            print(f"Reasoning: {expert_response.reasoning}")

if __name__ == "__main__":
    print("=== Full Conversation Flow Test ===")
    asyncio.run(test_full_conversation())
    print("\n✅ Test complete!")