#!/usr/bin/env python3
"""Test script to trigger domain detection through project summary."""

import json
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from echo.conversation_state_manager import create_conversation_manager
from echo.adaptive_coaching_service import AdaptiveCoachingService
from echo.models import ConversationMessage
from datetime import datetime

async def test_domain_detection_trigger():
    """Test domain detection by building conversation history that triggers summary."""
    
    # Create service and manager
    print("Creating conversation manager and coaching service...")
    manager = create_conversation_manager()
    service = AdaptiveCoachingService(manager)
    
    # Start conversation
    conv = manager.start_conversation("test_user")
    print(f"\nConversation ID: {conv.conversation_id}")
    
    # Build conversation history that should trigger a summary
    conversation_exchanges = [
        ("I want to build a machine learning model for customer churn prediction", 
         "That's an excellent business problem to tackle! Customer churn prediction can have a huge impact on revenue retention. Can you tell me more about your customer data - what kind of information do you have available?"),
        
        ("We have about 100k customer records with features like usage patterns, payment history, support tickets, subscription tier, and demographic data",
         "That's a robust dataset! 100k records should give you plenty of training data. The feature mix sounds comprehensive. What's your target prediction window - are you trying to predict churn within the next month, quarter, or some other timeframe?"),
        
        ("We want to predict customers likely to cancel in the next 30 days so we can proactively reach out with retention offers",
         "A 30-day prediction window is very actionable - perfect for intervention campaigns. What tools or technologies are you planning to use for this project?"),
        
        ("I'm planning to use Python with scikit-learn for initial models, then maybe XGBoost or LightGBM for better performance. We'll deploy it as an API that our CRM can call",
         "Based on our conversation, here's my understanding of your project:\n\nYou're building a machine learning model to predict customer churn within a 30-day window. You have a substantial dataset of 100k customer records with rich features including usage patterns, payment history, support interactions, subscription tiers, and demographics. The goal is to identify at-risk customers proactively so your team can implement retention strategies through targeted outreach and offers.\n\nOn the technical side, you're planning to use Python with scikit-learn for baseline models and gradient boosting frameworks (XGBoost/LightGBM) for production performance. The model will be deployed as an API service that integrates with your CRM system for real-time predictions.\n\nDid I capture everything correctly? Is there anything else about the project I should know?")
    ]
    
    # Add conversation history
    for user_msg, assistant_msg in conversation_exchanges[:-1]:  # All but last
        manager.add_user_message(conv.conversation_id, user_msg)
        manager.add_assistant_message(conv.conversation_id, assistant_msg)
    
    # Process the final exchange that should trigger domain detection
    final_user_msg = conversation_exchanges[-1][0]
    print(f"\n--- Processing Final Message ---")
    print(f"User: {final_user_msg}")
    
    manager.add_user_message(conv.conversation_id, final_user_msg)
    
    # Process with service - this should detect the summary and trigger domain detection
    response = await service.process_user_message(conv.conversation_id, final_user_msg)
    
    print(f"\nResponse Stage: {response.stage.value if response.stage else 'None'}")
    print(f"Should Transition: {response.should_transition}")
    print(f"Detected Domain: {response.detected_domain}")
    print(f"Confidence: {response.confidence}")
    
    # Check detailed domain detection
    updated_conv = manager.get_conversation(conv.conversation_id)
    if updated_conv and updated_conv.domain_detection:
        print(f"\n=== Domain Detection Details ===")
        print(f"Domain: {updated_conv.domain_detection.domain}")
        print(f"Confidence: {updated_conv.domain_detection.confidence:.2%}")
        print(f"Reasoning: {updated_conv.domain_detection.reasoning}")
        
        if updated_conv.domain_detection.alternative_domains:
            print("\nAlternative domains:")
            for alt_domain, conf in updated_conv.domain_detection.alternative_domains:
                print(f"  - {alt_domain}: {conf:.2%}")
        
        # Show detected signals
        if hasattr(updated_conv.domain_detection, 'signals_detected'):
            print("\nDetected Signals:")
            for signal_type, signals in updated_conv.domain_detection.signals_detected.items():
                if signals:
                    print(f"  {signal_type}:")
                    for signal in signals[:3]:  # Show first 3
                        if hasattr(signal, 'content'):
                            print(f"    - {signal.content}")
    
    print(f"\nAssistant Response Preview: {response.message[:300]}...")

if __name__ == "__main__":
    print("=== Domain Detection Trigger Test ===")
    asyncio.run(test_domain_detection_trigger())
    print("\n✅ Test complete!")