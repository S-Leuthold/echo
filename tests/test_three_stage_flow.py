#!/usr/bin/env python3
"""Test script for full three-stage conversation flow."""

import json
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from echo.conversation_state_manager import create_conversation_manager
from echo.adaptive_coaching_service import AdaptiveCoachingService

async def test_three_stage_flow():
    """Test complete flow: Discovery → Confirmation → Expert Coaching."""
    
    # Create service and manager
    print("Creating conversation manager and coaching service...")
    manager = create_conversation_manager()
    service = AdaptiveCoachingService(manager)
    
    # Start conversation
    conv = manager.start_conversation("test_user")
    print(f"\n=== Starting Conversation: {conv.conversation_id} ===\n")
    
    # Stage 1: Discovery - Build conversation to trigger summary
    print("=== STAGE 1: DISCOVERY ===")
    
    # Pre-populate conversation history
    discovery_history = [
        ("I want to create a mobile app for task management", 
         "That's exciting! Task management apps can really help people stay organized. What platform are you targeting - iOS, Android, or both?"),
        
        ("I'm thinking both iOS and Android. I want users to be able to create tasks, set deadlines, and get reminders",
         "Cross-platform is a smart choice for reaching more users. Those core features - tasks, deadlines, and reminders - are essential. What makes your app different from existing task managers?"),
        
        ("I want to add AI features that can suggest task priorities based on user patterns and automatically schedule tasks in their calendar",
         "That's a compelling differentiator! AI-powered prioritization and smart scheduling could really set your app apart. What technology stack are you considering for the development?")
    ]
    
    # Add conversation history
    for user_msg, assistant_msg in discovery_history:
        manager.add_user_message(conv.conversation_id, user_msg)
        manager.add_assistant_message(conv.conversation_id, assistant_msg)
    
    # Final discovery message that should trigger summary
    discovery_final = "I'm planning to use React Native for the mobile app with a Node.js backend. The AI features would use machine learning models deployed on AWS"
    
    print(f"User: {discovery_final}")
    manager.add_user_message(conv.conversation_id, discovery_final)
    response1 = await service.process_user_message(conv.conversation_id, discovery_final)
    
    print(f"\nAssistant: {response1.message[:200]}...")
    print(f"Stage: {response1.stage.value if response1.stage else 'None'}")
    print(f"Should Transition: {response1.should_transition}")
    print(f"Detected Domain: {response1.detected_domain}")
    print(f"Confidence: {response1.confidence}")
    
    # Check if we transitioned to confirmation
    if response1.should_transition and response1.stage and response1.stage.value == "confirmation":
        print("\n✅ Successfully transitioned to CONFIRMATION stage")
        
        # Stage 2: Confirmation
        print("\n=== STAGE 2: CONFIRMATION ===")
        
        # Confirm the understanding
        confirmation_message = "Yes, that's exactly right! You've captured it perfectly. Let's move forward with the expert guidance."
        print(f"User: {confirmation_message}")
        
        manager.add_user_message(conv.conversation_id, confirmation_message)
        response2 = await service.process_user_message(conv.conversation_id, confirmation_message)
        
        print(f"\nAssistant: {response2.message[:200]}...")
        print(f"Stage: {response2.stage.value if response2.stage else 'None'}")
        print(f"Should Transition: {response2.should_transition}")
        print(f"Detected Domain: {response2.detected_domain}")
        
        # Check if we transitioned to expert coaching
        if response2.should_transition and response2.stage and response2.stage.value == "expert_coaching":
            print("\n✅ Successfully transitioned to EXPERT COACHING stage")
            
            # Stage 3: Expert Coaching
            print("\n=== STAGE 3: EXPERT COACHING ===")
            
            # Ask for expert guidance
            expert_question = "What would be the best architecture pattern for handling real-time task syncing across devices?"
            print(f"User: {expert_question}")
            
            manager.add_user_message(conv.conversation_id, expert_question)
            response3 = await service.process_user_message(conv.conversation_id, expert_question)
            
            print(f"\nAssistant: {response3.message[:400]}...")
            print(f"Stage: {response3.stage.value if response3.stage else 'None'}")
            print(f"Domain: {response3.detected_domain}")
            print(f"Confidence: {response3.confidence}")
            print(f"Reasoning: {response3.reasoning}")
            
            # Get final conversation state
            final_conv = manager.get_conversation(conv.conversation_id)
            if final_conv:
                print(f"\n=== FINAL CONVERSATION STATE ===")
                print(f"Total Messages: {len(final_conv.messages)}")
                print(f"Current Stage: {final_conv.current_stage.value}")
                print(f"Current Persona: {final_conv.current_persona}")
                print(f"Project Summary: {final_conv.project_summary[:100] if final_conv.project_summary else 'None'}...")
                print(f"Confidence Score: {final_conv.confidence_score}")
                
                if final_conv.domain_detection:
                    print(f"Domain: {final_conv.domain_detection.domain}")
                    print(f"Domain Confidence: {final_conv.domain_detection.confidence:.2%}")

if __name__ == "__main__":
    print("=== Three-Stage Conversation Flow Test ===")
    asyncio.run(test_three_stage_flow())
    print("\n✅ Complete three-stage flow test finished!")