# ==============================================================================
# FILE: echo/conversation_state_manager.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Manages conversation state for the adaptive expert coaching system.
#   Provides high-level operations for conversation management, state persistence,
#   and integration with Claude API for intelligent conversation flow.
#
# USAGE:
#   This module provides the ConversationStateManager service class that handles
#   all conversation state operations, following Anthropic best practices for
#   multi-turn conversation management.
# ==============================================================================

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict

from echo.models import (
    ConversationState, 
    ConversationStage, 
    ConversationMessage, 
    DomainDetection,
    ExpertPersona
)
from echo.database_schema import SessionDatabase
from echo.conversation_serializer import ConversationSerializer


class ConversationStateManager:
    """
    High-level service for managing conversation states in the adaptive expert coaching system.
    
    Handles conversation lifecycle, state persistence, and intelligent flow management
    following Anthropic best practices for multi-turn conversations with Claude.
    """
    
    def __init__(self, db: SessionDatabase = None):
        """Initialize the conversation state manager with database connection."""
        self.db = db or SessionDatabase()
    
    # ===== CONVERSATION LIFECYCLE =====
    
    def start_conversation(self, user_id: Optional[str] = None) -> ConversationState:
        """
        Start a new conversation with initial discovery stage.
        
        Args:
            user_id: Optional user identifier for conversation tracking
            
        Returns:
            ConversationState: New conversation state in discovery stage
        """
        conversation_id = str(uuid.uuid4())
        
        # Create initial conversation state
        conversation_state = ConversationState(
            conversation_id=conversation_id,
            current_stage=ConversationStage.DISCOVERY,
            messages=[],
            extracted_data={
                'user_id': user_id,
                'conversation_context': 'project_creation'
            }
        )
        
        # Persist to database
        success = self.db.create_conversation_state(conversation_state)
        if not success:
            raise RuntimeError(f"Failed to create conversation state for {conversation_id}")
        
        return conversation_state
    
    def get_conversation(self, conversation_id: str) -> Optional[ConversationState]:
        """
        Retrieve conversation state by ID.
        
        Args:
            conversation_id: Unique conversation identifier
            
        Returns:
            ConversationState or None if not found
        """
        state_dict = self.db.get_conversation_state(conversation_id)
        if not state_dict:
            return None
        
        # Convert database dict back to ConversationState dataclass
        return ConversationSerializer.from_database_record(state_dict)
    
    def save_conversation(self, conversation_state: ConversationState) -> bool:
        """
        Save conversation state to database.
        
        Args:
            conversation_state: ConversationState to persist
            
        Returns:
            bool: Success status
        """
        # Update timestamp
        conversation_state.updated_at = datetime.now()
        
        # Persist to database
        return self.db.update_conversation_state(
            conversation_state.conversation_id, 
            conversation_state
        )
    
    # ===== MESSAGE MANAGEMENT =====
    
    def add_user_message(self, conversation_id: str, message: str, 
                        metadata: Dict[str, Any] = None) -> ConversationState:
        """
        Add a user message to the conversation.
        
        Args:
            conversation_id: Conversation identifier
            message: User's message content
            metadata: Optional metadata (e.g., file references, context)
            
        Returns:
            ConversationState: Updated conversation state
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        # Add user message
        conversation_state.add_message("user", message, metadata or {})
        
        # Save updated state
        self.save_conversation(conversation_state)
        
        return conversation_state
    
    def add_assistant_message(self, conversation_id: str, message: str, 
                            metadata: Dict[str, Any] = None) -> ConversationState:
        """
        Add an assistant message to the conversation.
        
        Args:
            conversation_id: Conversation identifier
            message: Assistant's message content
            metadata: Optional metadata (e.g., confidence scores, reasoning)
            
        Returns:
            ConversationState: Updated conversation state
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        # Add assistant message
        conversation_state.add_message("assistant", message, metadata or {})
        
        # Save updated state
        self.save_conversation(conversation_state)
        
        return conversation_state
    
    # ===== CONVERSATION FLOW MANAGEMENT =====
    
    def transition_stage(self, conversation_id: str, new_stage: ConversationStage, 
                        reason: str = "") -> ConversationState:
        """
        Transition conversation to a new stage.
        
        Args:
            conversation_id: Conversation identifier
            new_stage: Target conversation stage
            reason: Reason for transition (for analytics)
            
        Returns:
            ConversationState: Updated conversation state
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        # Perform stage transition
        conversation_state.transition_stage(new_stage, reason)
        
        # Save updated state
        self.save_conversation(conversation_state)
        
        return conversation_state
    
    def set_persona(self, conversation_id: str, domain: str) -> ConversationState:
        """
        Set the expert persona for the conversation.
        
        Args:
            conversation_id: Conversation identifier
            domain: Domain identifier for expert persona
            
        Returns:
            ConversationState: Updated conversation state
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        # Set persona
        conversation_state.set_persona(domain)
        
        # Save updated state
        self.save_conversation(conversation_state)
        
        return conversation_state
    
    def update_project_understanding(self, conversation_id: str, summary: str, 
                                   data: Dict[str, Any], confidence: float) -> ConversationState:
        """
        Update the AI's understanding of the project.
        
        Args:
            conversation_id: Conversation identifier
            summary: Project summary
            data: Extracted structured data
            confidence: Confidence score (0.0-1.0)
            
        Returns:
            ConversationState: Updated conversation state
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        # Update project understanding
        conversation_state.update_project_understanding(summary, data, confidence)
        
        # Save updated state
        self.save_conversation(conversation_state)
        
        return conversation_state
    
    def set_domain_detection(self, conversation_id: str, 
                           domain_detection: DomainDetection) -> ConversationState:
        """
        Set domain detection results for the conversation.
        
        Args:
            conversation_id: Conversation identifier
            domain_detection: Domain detection results
            
        Returns:
            ConversationState: Updated conversation state
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        # Set domain detection
        conversation_state.domain_detection = domain_detection
        conversation_state.updated_at = datetime.now()
        
        # Save updated state
        self.save_conversation(conversation_state)
        
        return conversation_state
    
    # ===== CONVERSATION COMPLETION =====
    
    def complete_conversation(self, conversation_id: str, 
                            created_project_id: str) -> ConversationState:
        """
        Mark conversation as completed with created project.
        
        Args:
            conversation_id: Conversation identifier
            created_project_id: ID of the created project
            
        Returns:
            ConversationState: Final conversation state
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        # Mark as completed in database
        success = self.db.mark_conversation_completed(conversation_id, created_project_id)
        if not success:
            raise RuntimeError(f"Failed to mark conversation {conversation_id} as completed")
        
        # Update local state
        conversation_state.updated_at = datetime.now()
        
        return conversation_state
    
    # ===== QUERY OPERATIONS =====
    
    def get_active_conversations(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get active (incomplete) conversations.
        
        Args:
            limit: Maximum number of conversations to return
            
        Returns:
            List of conversation summaries
        """
        return self.db.get_active_conversations(limit)
    
    def get_conversations_by_stage(self, stage: ConversationStage, 
                                 limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get conversations in a specific stage.
        
        Args:
            stage: Conversation stage to filter by
            limit: Maximum number of conversations to return
            
        Returns:
            List of conversation summaries
        """
        return self.db.get_conversations_by_stage(stage.value, limit)
    
    def get_conversation_analytics(self) -> Dict[str, Any]:
        """
        Get analytics data about conversations.
        
        Returns:
            Dictionary with conversation analytics
        """
        stats = self.db.get_database_stats()
        
        # Extract conversation-specific stats
        return {
            'total_conversations': stats.get('total_conversations', 0),
            'active_conversations': stats.get('active_conversations', 0),
            'expert_coaching_conversations': stats.get('expert_coaching_conversations', 0),
            'completion_rate': self._calculate_completion_rate(stats)
        }
    
    # ===== CLAUDE API INTEGRATION HELPERS =====
    
    def get_conversation_history_for_claude(self, conversation_id: str, 
                                          include_metadata: bool = False) -> List[Dict[str, Any]]:
        """
        Get conversation history formatted for Claude API calls.
        
        Args:
            conversation_id: Conversation identifier
            include_metadata: Whether to include message metadata
            
        Returns:
            List of messages formatted for Claude API
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            return []
        
        return conversation_state.get_conversation_history_for_llm(include_metadata)
    
    def should_trigger_stage_transition(self, conversation_id: str) -> bool:
        """
        Check if conversation should transition to confirmation stage.
        
        Args:
            conversation_id: Conversation identifier
            
        Returns:
            bool: Whether stage transition should be triggered
        """
        conversation_state = self.get_conversation(conversation_id)
        if not conversation_state:
            return False
        
        return conversation_state.should_trigger_confirmation()
    
    # ===== UTILITY METHODS =====
    
    def cleanup_old_conversations(self, days_old: int = 30) -> int:
        """
        Clean up old completed conversations for privacy and storage management.
        
        Args:
            days_old: Age threshold for cleanup (days)
            
        Returns:
            int: Number of conversations cleaned up
        """
        # This would need to be implemented in the database layer
        # For now, return 0 as placeholder
        return 0
    
    def _dict_to_conversation_state(self, state_dict: Dict[str, Any]) -> ConversationState:
        """
        Convert database dictionary to ConversationState dataclass.
        
        Args:
            state_dict: Dictionary from database
            
        Returns:
            ConversationState: Reconstructed conversation state
        """
        # Convert messages from dict to ConversationMessage objects
        messages = []
        for msg_dict in state_dict.get('messages', []):
            messages.append(ConversationMessage(
                role=msg_dict['role'],
                content=msg_dict['content'],
                timestamp=datetime.fromisoformat(msg_dict['timestamp']),
                metadata=msg_dict.get('metadata', {})
            ))
        
        # Convert domain detection if present
        domain_detection = None
        if state_dict.get('domain_detection'):
            dd_dict = state_dict['domain_detection']
            domain_detection = DomainDetection(
                domain=dd_dict['domain'],
                confidence=dd_dict['confidence'],
                alternative_domains=dd_dict.get('alternative_domains', []),
                reasoning=dd_dict.get('reasoning', ''),
                signals_detected=dd_dict.get('signals_detected', {})
            )
        
        # Create ConversationState
        return ConversationState(
            conversation_id=state_dict['conversation_id'],
            created_at=datetime.fromisoformat(state_dict['created_at']),
            updated_at=datetime.fromisoformat(state_dict['updated_at']),
            current_stage=ConversationStage(state_dict['current_stage']),
            messages=messages,
            stage_transitions=state_dict.get('stage_transitions', []),
            project_summary=state_dict.get('project_summary'),
            extracted_data=state_dict.get('extracted_data', {}),
            confidence_score=state_dict.get('confidence_score', 0.0),
            missing_information=state_dict.get('missing_information', []),
            domain_detection=domain_detection,
            current_persona=state_dict.get('current_persona'),
            persona_switched_at=datetime.fromisoformat(state_dict['persona_switched_at']) if state_dict.get('persona_switched_at') else None,
            user_corrections=state_dict.get('user_corrections', []),
            user_expertise_level=state_dict.get('user_expertise_level'),
            key_constraints=state_dict.get('key_constraints', []),
            success_criteria=state_dict.get('success_criteria', []),
            risk_factors=state_dict.get('risk_factors', []),
            uploaded_files=state_dict.get('uploaded_files', []),
            external_context=state_dict.get('external_context', {}),
            total_exchanges=state_dict.get('total_exchanges', 0),
            avg_response_time=state_dict.get('avg_response_time', 0.0),
            user_satisfaction_indicators=state_dict.get('user_satisfaction_indicators', {})
        )
    
    def _calculate_completion_rate(self, stats: Dict[str, Any]) -> float:
        """Calculate conversation completion rate."""
        total = stats.get('total_conversations', 0)
        active = stats.get('active_conversations', 0)
        
        if total == 0:
            return 0.0
        
        completed = total - active
        return completed / total
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if self.db:
            self.db.close()


# ===== FACTORY FUNCTIONS =====

def create_conversation_manager(db_path: str = None) -> ConversationStateManager:
    """
    Factory function to create a ConversationStateManager with database.
    
    Args:
        db_path: Optional database path
        
    Returns:
        ConversationStateManager: Configured manager instance
    """
    if db_path:
        db = SessionDatabase(db_path)
    else:
        db = SessionDatabase()
    
    return ConversationStateManager(db)


# ===== TESTING UTILITIES =====

if __name__ == "__main__":
    # Test conversation state manager
    print("=== Conversation State Manager Test ===")
    
    # Create manager with test database
    manager = create_conversation_manager("data/test_conversation_states.db")
    
    try:
        # Test conversation creation
        conversation = manager.start_conversation(user_id="test_user")
        print(f"✅ Created conversation: {conversation.conversation_id}")
        
        # Test message addition
        manager.add_user_message(
            conversation.conversation_id, 
            "I want to create a new software project for task management"
        )
        print("✅ Added user message")
        
        manager.add_assistant_message(
            conversation.conversation_id,
            "Great! I'd love to help you plan your task management project. Can you tell me more about what features you envision?"
        )
        print("✅ Added assistant message")
        
        # Test project understanding update
        manager.update_project_understanding(
            conversation.conversation_id,
            "Task management software project",
            {"project_type": "software", "features": ["task_creation", "due_dates"]},
            0.8
        )
        print("✅ Updated project understanding")
        
        # Test stage transition
        manager.transition_stage(
            conversation.conversation_id,
            ConversationStage.CONFIRMATION,
            "Sufficient information gathered"
        )
        print("✅ Transitioned to confirmation stage")
        
        # Test domain detection
        domain_detection = DomainDetection(
            domain="software_development",
            confidence=0.9,
            reasoning="User mentioned software project with specific features"
        )
        manager.set_domain_detection(conversation.conversation_id, domain_detection)
        print("✅ Set domain detection")
        
        # Test persona setting
        manager.set_persona(conversation.conversation_id, "software_development")
        print("✅ Set expert persona")
        
        # Test retrieval
        retrieved = manager.get_conversation(conversation.conversation_id)
        print(f"✅ Retrieved conversation with {len(retrieved.messages)} messages")
        
        # Test analytics
        analytics = manager.get_conversation_analytics()
        print(f"✅ Analytics: {analytics}")
        
        # Test completion
        manager.complete_conversation(conversation.conversation_id, "test_project_123")
        print("✅ Marked conversation as completed")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
    finally:
        manager.__exit__(None, None, None)
    
    print("✅ Conversation State Manager test complete!")