# ==============================================================================
# FILE: echo/adaptive_coaching_service.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Adaptive Expert Coaching Service for intelligent conversation flow management.
#   Orchestrates the three-phase conversation system with domain detection and
#   expert persona switching following Anthropic best practices.
#
# USAGE:
#   This module provides the main AdaptiveCoachingService that processes user
#   messages and generates appropriate responses based on conversation stage.
# ==============================================================================

import asyncio
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime

from echo.models import ConversationStage, ConversationState, DomainDetection
from echo.conversation_state_manager import ConversationStateManager, create_conversation_manager


@dataclass
class CoachingResponse:
    """
    Response from the adaptive coaching service.
    Contains the AI message and conversation state information.
    """
    message: str
    stage: Optional[ConversationStage] = None
    confidence: float = 0.0
    detected_domain: Optional[str] = None
    reasoning: Optional[str] = None
    should_transition: bool = False


class AdaptiveCoachingService:
    """
    Main orchestrator for the adaptive expert coaching system.
    
    Handles conversation flow, domain detection, persona switching,
    and Claude API integration following Anthropic best practices.
    """
    
    def __init__(self, conversation_manager: ConversationStateManager = None):
        """Initialize the adaptive coaching service."""
        self.conversation_manager = conversation_manager or create_conversation_manager()
    
    async def process_user_message(self, conversation_id: str, user_message: str) -> CoachingResponse:
        """
        Process a user message and generate appropriate coaching response.
        
        Args:
            conversation_id: Unique conversation identifier
            user_message: User's input message
            
        Returns:
            CoachingResponse with AI message and state updates
        """
        # Get current conversation state
        conversation_state = self.conversation_manager.get_conversation(conversation_id)
        if not conversation_state:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        # Process based on current stage
        if conversation_state.current_stage == ConversationStage.DISCOVERY:
            return await self._handle_discovery_stage(conversation_state, user_message)
        elif conversation_state.current_stage == ConversationStage.CONFIRMATION:
            return await self._handle_confirmation_stage(conversation_state, user_message)
        elif conversation_state.current_stage == ConversationStage.EXPERT_COACHING:
            return await self._handle_expert_coaching(conversation_state, user_message)
        else:
            return CoachingResponse(
                message="I'm not sure how to help at this stage. Let's start over.",
                confidence=0.0
            )
    
    async def _handle_discovery_stage(self, conversation_state: ConversationState, 
                                    user_message: str) -> CoachingResponse:
        """
        Handle discovery stage - natural conversation to understand the project.
        
        This is a placeholder implementation. In the full system, this would:
        1. Use Claude API with discovery prompts
        2. Analyze conversation for project understanding
        3. Determine if ready for confirmation stage
        
        Args:
            conversation_state: Current conversation state
            user_message: User's message
            
        Returns:
            CoachingResponse with discovery stage response
        """
        # Simulate realistic processing time for discovery stage
        await asyncio.sleep(0.8)  # Simulate Claude API processing time
        
        # Placeholder implementation - will be replaced with full Claude integration
        responses = [
            "That sounds interesting! Can you tell me more about the specific goals you have in mind?",
            "I'd love to understand more about your vision. What would success look like for this project?",
            "Great! What's driving your interest in this particular project right now?",
            "That's a compelling idea. What resources or constraints should we consider?",
            "Excellent! Who else might be involved or affected by this project?"
        ]
        
        # Simple response selection based on message count
        response_index = min(len(conversation_state.messages) // 2, len(responses) - 1)
        response_message = responses[response_index]
        
        # Mock project understanding (in real implementation, this would be Claude analysis)
        if len(conversation_state.messages) >= 4:  # After a few exchanges
            # Mock transition to confirmation
            self.conversation_manager.update_project_understanding(
                conversation_state.conversation_id,
                f"Project about: {user_message[:100]}...",
                {
                    "project_name": "User's Project",
                    "project_type": "personal",
                    "description": f"Based on conversation: {user_message[:200]}..."
                },
                0.7
            )
            
            # Mock domain detection
            domain_detection = DomainDetection(
                domain="general_planning",
                confidence=0.8,
                reasoning="Based on conversation context"
            )
            
            self.conversation_manager.set_domain_detection(
                conversation_state.conversation_id,
                domain_detection
            )
            
            # Transition to confirmation
            self.conversation_manager.transition_stage(
                conversation_state.conversation_id,
                ConversationStage.CONFIRMATION,
                "Sufficient information gathered"
            )
            
            response_message = "Based on our conversation, I understand you're working on an interesting project. Let me summarize what I've learned and we can refine the details together. Would you like to proceed with creating a strategic plan?"
            
            return CoachingResponse(
                message=response_message,
                stage=ConversationStage.CONFIRMATION,
                confidence=0.7,
                detected_domain="general_planning",
                should_transition=True
            )
        
        return CoachingResponse(
            message=response_message,
            stage=ConversationStage.DISCOVERY,
            confidence=0.5
        )
    
    async def _handle_confirmation_stage(self, conversation_state: ConversationState, 
                                       user_message: str) -> CoachingResponse:
        """
        Handle confirmation stage - validate project understanding and select persona.
        
        This is a placeholder implementation. In the full system, this would:
        1. Present project summary for user validation
        2. Handle user corrections and refinements
        3. Finalize domain detection and select expert persona
        4. Transition to expert coaching mode
        
        Args:
            conversation_state: Current conversation state
            user_message: User's message
            
        Returns:
            CoachingResponse with confirmation stage response
        """
        # Simulate realistic processing time for confirmation stage
        await asyncio.sleep(0.6)
        
        # Placeholder confirmation logic
        if "yes" in user_message.lower() or "correct" in user_message.lower() or "proceed" in user_message.lower():
            # User confirmed - transition to expert coaching
            self.conversation_manager.set_persona(
                conversation_state.conversation_id,
                "general_planning"
            )
            
            self.conversation_manager.transition_stage(
                conversation_state.conversation_id,
                ConversationStage.EXPERT_COACHING,
                "User confirmed project understanding"
            )
            
            return CoachingResponse(
                message="Perfect! I'm now switching to expert mode to provide you with strategic guidance. As your project planning consultant, let me help you develop a comprehensive approach. What would you like to focus on first - timeline, resources, or risk planning?",
                stage=ConversationStage.EXPERT_COACHING,
                confidence=0.9,
                detected_domain="general_planning",
                should_transition=True
            )
        else:
            # User wants to make corrections
            return CoachingResponse(
                message="I'd be happy to refine my understanding. What aspects would you like to clarify or correct?",
                stage=ConversationStage.CONFIRMATION,
                confidence=0.6
            )
    
    async def _handle_expert_coaching(self, conversation_state: ConversationState, 
                                    user_message: str) -> CoachingResponse:
        """
        Handle expert coaching stage - provide domain-specific strategic guidance.
        
        This is a placeholder implementation. In the full system, this would:
        1. Use expert persona prompts with CO-STAR framework
        2. Provide domain-specific methodologies and frameworks
        3. Generate strategic recommendations and risk assessments
        4. Guide user through project planning best practices
        
        Args:
            conversation_state: Current conversation state
            user_message: User's message
            
        Returns:
            CoachingResponse with expert coaching response
        """
        # Simulate realistic processing time for expert coaching stage
        await asyncio.sleep(1.0)  # Expert responses take longer
        
        # Placeholder expert coaching responses
        expert_responses = [
            "Based on my experience with similar projects, I'd recommend starting with a clear scope definition. Have you considered the core deliverables?",
            "From a strategic perspective, let's think about your success metrics. How will you measure progress and outcomes?",
            "I've seen projects like this succeed when they focus on iterative development. What's your approach to managing complexity?",
            "Risk management is crucial here. What are the biggest uncertainties or potential obstacles you foresee?",
            "Let's talk about stakeholder alignment. Who needs to be bought into this project's success?"
        ]
        
        # Rotate through expert responses
        response_index = (len(conversation_state.messages) // 2) % len(expert_responses)
        response_message = expert_responses[response_index]
        
        return CoachingResponse(
            message=response_message,
            stage=ConversationStage.EXPERT_COACHING,
            confidence=0.8,
            detected_domain=conversation_state.current_persona or "general_planning"
        )


# ===== FACTORY FUNCTIONS =====

def create_adaptive_coaching_service() -> AdaptiveCoachingService:
    """
    Factory function to create an AdaptiveCoachingService.
    
    Returns:
        AdaptiveCoachingService: Configured service instance
    """
    return AdaptiveCoachingService()


# ===== TESTING UTILITIES =====

if __name__ == "__main__":
    import asyncio
    
    async def test_coaching_service():
        """Test the adaptive coaching service."""
        print("=== Adaptive Coaching Service Test ===")
        
        # Create service and conversation
        service = create_adaptive_coaching_service()
        manager = create_conversation_manager()
        
        conversation = manager.start_conversation(user_id="test_user")
        print(f"✅ Created conversation: {conversation.conversation_id}")
        
        # Test discovery stage
        manager.add_user_message(conversation.conversation_id, "I want to build a mobile app")
        response1 = await service.process_user_message(conversation.conversation_id, "I want to build a mobile app")
        print(f"✅ Discovery response: {response1.message[:50]}...")
        
        # Test more discovery
        manager.add_user_message(conversation.conversation_id, "It's for task management and productivity")
        response2 = await service.process_user_message(conversation.conversation_id, "It's for task management and productivity")
        print(f"✅ Discovery response 2: {response2.message[:50]}...")
        
        # Test stage progression
        for i in range(3):
            manager.add_user_message(conversation.conversation_id, f"More details about the project {i}")
            response = await service.process_user_message(conversation.conversation_id, f"More details about the project {i}")
            print(f"✅ Stage {response.stage.value if response.stage else 'unknown'}: {response.message[:50]}...")
            
            if response.should_transition:
                print(f"🔄 Transitioned to {response.stage.value}")
        
        print("✅ Adaptive Coaching Service test complete!")
    
    # Run the test
    asyncio.run(test_coaching_service())