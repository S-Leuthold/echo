# ==============================================================================
# FILE: echo/conversation_serializer.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Conversation state serialization and deserialization utilities.
#   Handles conversion between ConversationState dataclasses, database records,
#   API responses, and frontend-compatible formats.
#
# USAGE:
#   This module provides utilities for serializing conversation data across
#   different layers of the application (database, API, frontend).
# ==============================================================================

import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from dataclasses import asdict

from echo.models import (
    ConversationState, 
    ConversationStage, 
    ConversationMessage, 
    DomainDetection,
    ExpertPersona
)


class ConversationSerializer:
    """
    Handles serialization and deserialization of conversation states across
    different application layers with proper type safety and error handling.
    """
    
    @staticmethod
    def to_api_response(conversation_state: ConversationState, 
                       include_full_history: bool = True) -> Dict[str, Any]:
        """
        Convert ConversationState to API response format.
        
        Args:
            conversation_state: ConversationState to serialize
            include_full_history: Whether to include full message history
            
        Returns:
            Dictionary formatted for API responses
        """
        # Format messages
        messages = []
        if include_full_history:
            messages = [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.metadata
                }
                for msg in conversation_state.messages
            ]
        else:
            # Include only the last few messages for lighter responses
            recent_messages = conversation_state.messages[-5:] if len(conversation_state.messages) > 5 else conversation_state.messages
            messages = [
                {
                    "role": msg.role,
                    "content": msg.content[:200] + "..." if len(msg.content) > 200 else msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": {k: v for k, v in msg.metadata.items() if k in ['confidence', 'stage']}
                }
                for msg in recent_messages
            ]
        
        # Format domain detection
        domain_detection = None
        if conversation_state.domain_detection:
            domain_detection = {
                "domain": conversation_state.domain_detection.domain,
                "confidence": conversation_state.domain_detection.confidence,
                "alternative_domains": conversation_state.domain_detection.alternative_domains,
                "reasoning": conversation_state.domain_detection.reasoning
            }
        
        return {
            "conversation_id": conversation_state.conversation_id,
            "stage": conversation_state.current_stage.value,
            "created_at": conversation_state.created_at.isoformat(),
            "updated_at": conversation_state.updated_at.isoformat(),
            "messages": messages,
            "message_count": len(conversation_state.messages),
            "project_summary": conversation_state.project_summary,
            "extracted_data": conversation_state.extracted_data,
            "confidence_score": conversation_state.confidence_score,
            "missing_information": conversation_state.missing_information,
            "domain_detection": domain_detection,
            "current_persona": conversation_state.current_persona,
            "user_expertise_level": conversation_state.user_expertise_level,
            "key_constraints": conversation_state.key_constraints,
            "success_criteria": conversation_state.success_criteria,
            "risk_factors": conversation_state.risk_factors,
            "total_exchanges": conversation_state.total_exchanges,
            "avg_response_time": conversation_state.avg_response_time,
            "metadata": {
                "stage_transitions": len(conversation_state.stage_transitions),
                "persona_switched_at": conversation_state.persona_switched_at.isoformat() if conversation_state.persona_switched_at else None,
                "user_corrections_count": len(conversation_state.user_corrections),
                "uploaded_files_count": len(conversation_state.uploaded_files)
            }
        }
    
    @staticmethod
    def to_database_record(conversation_state: ConversationState) -> Dict[str, Any]:
        """
        Convert ConversationState to database record format.
        
        Args:
            conversation_state: ConversationState to serialize
            
        Returns:
            Dictionary formatted for database storage
        """
        return {
            "conversation_id": conversation_state.conversation_id,
            "created_at": conversation_state.created_at.isoformat(),
            "updated_at": conversation_state.updated_at.isoformat(),
            "current_stage": conversation_state.current_stage.value,
            "messages": json.dumps([msg.to_dict() for msg in conversation_state.messages]),
            "stage_transitions": json.dumps(conversation_state.stage_transitions),
            "project_summary": conversation_state.project_summary,
            "extracted_data": json.dumps(conversation_state.extracted_data),
            "confidence_score": conversation_state.confidence_score,
            "missing_information": json.dumps(conversation_state.missing_information),
            "domain_detection": json.dumps(conversation_state.domain_detection.to_dict()) if conversation_state.domain_detection else None,
            "current_persona": conversation_state.current_persona,
            "persona_switched_at": conversation_state.persona_switched_at.isoformat() if conversation_state.persona_switched_at else None,
            "user_corrections": json.dumps(conversation_state.user_corrections),
            "user_expertise_level": conversation_state.user_expertise_level,
            "key_constraints": json.dumps(conversation_state.key_constraints),
            "success_criteria": json.dumps(conversation_state.success_criteria),
            "risk_factors": json.dumps(conversation_state.risk_factors),
            "uploaded_files": json.dumps(conversation_state.uploaded_files),
            "external_context": json.dumps(conversation_state.external_context),
            "total_exchanges": conversation_state.total_exchanges,
            "avg_response_time": conversation_state.avg_response_time,
            "user_satisfaction_indicators": json.dumps(conversation_state.user_satisfaction_indicators)
        }
    
    @staticmethod
    def from_database_record(record: Dict[str, Any]) -> ConversationState:
        """
        Convert database record to ConversationState.
        
        Args:
            record: Database record dictionary
            
        Returns:
            ConversationState object
        """
        # Parse messages
        messages = []
        if record.get('messages'):
            message_dicts = json.loads(record['messages'])
            for msg_dict in message_dicts:
                messages.append(ConversationMessage(
                    role=msg_dict['role'],
                    content=msg_dict['content'],
                    timestamp=datetime.fromisoformat(msg_dict['timestamp']),
                    metadata=msg_dict.get('metadata', {})
                ))
        
        # Parse domain detection
        domain_detection = None
        if record.get('domain_detection'):
            dd_dict = json.loads(record['domain_detection'])
            domain_detection = DomainDetection(
                domain=dd_dict['domain'],
                confidence=dd_dict['confidence'],
                alternative_domains=dd_dict.get('alternative_domains', []),
                reasoning=dd_dict.get('reasoning', ''),
                signals_detected=dd_dict.get('signals_detected', {})
            )
        
        return ConversationState(
            conversation_id=record['conversation_id'],
            created_at=datetime.fromisoformat(record['created_at']),
            updated_at=datetime.fromisoformat(record['updated_at']),
            current_stage=ConversationStage(record['current_stage']),
            messages=messages,
            stage_transitions=json.loads(record.get('stage_transitions', '[]')),
            project_summary=record.get('project_summary'),
            extracted_data=json.loads(record.get('extracted_data', '{}')),
            confidence_score=record.get('confidence_score', 0.0),
            missing_information=json.loads(record.get('missing_information', '[]')),
            domain_detection=domain_detection,
            current_persona=record.get('current_persona'),
            persona_switched_at=datetime.fromisoformat(record['persona_switched_at']) if record.get('persona_switched_at') else None,
            user_corrections=json.loads(record.get('user_corrections', '[]')),
            user_expertise_level=record.get('user_expertise_level'),
            key_constraints=json.loads(record.get('key_constraints', '[]')),
            success_criteria=json.loads(record.get('success_criteria', '[]')),
            risk_factors=json.loads(record.get('risk_factors', '[]')),
            uploaded_files=json.loads(record.get('uploaded_files', '[]')),
            external_context=json.loads(record.get('external_context', '{}')),
            total_exchanges=record.get('total_exchanges', 0),
            avg_response_time=record.get('avg_response_time', 0.0),
            user_satisfaction_indicators=json.loads(record.get('user_satisfaction_indicators', '{}'))
        )
    
    @staticmethod
    def to_frontend_state(conversation_state: ConversationState) -> Dict[str, Any]:
        """
        Convert ConversationState to frontend-optimized format.
        
        Args:
            conversation_state: ConversationState to serialize
            
        Returns:
            Dictionary optimized for frontend consumption
        """
        return {
            "id": conversation_state.conversation_id,
            "stage": {
                "current": conversation_state.current_stage.value,
                "progress": ConversationSerializer._calculate_stage_progress(conversation_state),
                "canTransition": ConversationSerializer._can_transition_stage(conversation_state)
            },
            "messages": [
                {
                    "id": f"{conversation_state.conversation_id}_{i}",
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "isTyping": False,  # For frontend typing indicators
                    "confidence": msg.metadata.get('confidence'),
                    "stage": msg.metadata.get('stage')
                }
                for i, msg in enumerate(conversation_state.messages)
            ],
            "project": {
                "summary": conversation_state.project_summary,
                "data": conversation_state.extracted_data,
                "confidence": conversation_state.confidence_score,
                "missingInfo": conversation_state.missing_information,
                "isComplete": conversation_state.confidence_score > 0.8 and len(conversation_state.missing_information) == 0
            },
            "expert": {
                "domain": conversation_state.current_persona,
                "detection": conversation_state.domain_detection.to_dict() if conversation_state.domain_detection else None,
                "isActive": conversation_state.current_stage == ConversationStage.EXPERT_COACHING
            },
            "user": {
                "expertiseLevel": conversation_state.user_expertise_level,
                "constraints": conversation_state.key_constraints,
                "successCriteria": conversation_state.success_criteria,
                "concerns": conversation_state.risk_factors
            },
            "analytics": {
                "exchanges": conversation_state.total_exchanges,
                "avgResponseTime": conversation_state.avg_response_time,
                "startedAt": conversation_state.created_at.isoformat(),
                "lastActive": conversation_state.updated_at.isoformat(),
                "stageTransitions": len(conversation_state.stage_transitions)
            },
            "ui": {
                "showStageIndicator": True,
                "showConfidenceScore": conversation_state.confidence_score > 0,
                "showDomainSwitch": conversation_state.current_stage == ConversationStage.EXPERT_COACHING,
                "showProjectSummary": conversation_state.project_summary is not None,
                "canComplete": ConversationSerializer._can_complete_conversation(conversation_state)
            }
        }
    
    @staticmethod
    def to_export_format(conversation_state: ConversationState, 
                        include_analytics: bool = False) -> Dict[str, Any]:
        """
        Convert ConversationState to export format for backup or analysis.
        
        Args:
            conversation_state: ConversationState to serialize
            include_analytics: Whether to include detailed analytics
            
        Returns:
            Complete conversation data for export
        """
        export_data = {
            "conversation_id": conversation_state.conversation_id,
            "export_timestamp": datetime.now().isoformat(),
            "conversation_data": asdict(conversation_state)
        }
        
        # Convert datetime objects to ISO strings for JSON serialization
        export_data["conversation_data"]["created_at"] = conversation_state.created_at.isoformat()
        export_data["conversation_data"]["updated_at"] = conversation_state.updated_at.isoformat()
        export_data["conversation_data"]["current_stage"] = conversation_state.current_stage.value
        
        if conversation_state.persona_switched_at:
            export_data["conversation_data"]["persona_switched_at"] = conversation_state.persona_switched_at.isoformat()
        
        # Convert messages to dictionaries
        export_data["conversation_data"]["messages"] = [msg.to_dict() for msg in conversation_state.messages]
        
        # Convert domain detection
        if conversation_state.domain_detection:
            export_data["conversation_data"]["domain_detection"] = conversation_state.domain_detection.to_dict()
        
        if include_analytics:
            export_data["analytics"] = {
                "conversation_duration_minutes": (conversation_state.updated_at - conversation_state.created_at).total_seconds() / 60,
                "messages_per_stage": ConversationSerializer._analyze_messages_per_stage(conversation_state),
                "confidence_progression": ConversationSerializer._analyze_confidence_progression(conversation_state),
                "stage_transition_times": conversation_state.stage_transitions
            }
        
        return export_data
    
    @staticmethod
    def _calculate_stage_progress(conversation_state: ConversationState) -> float:
        """Calculate conversation stage progress (0.0 to 1.0)."""
        stage_values = {
            ConversationStage.DISCOVERY: 0.33,
            ConversationStage.CONFIRMATION: 0.66,
            ConversationStage.EXPERT_COACHING: 1.0
        }
        return stage_values.get(conversation_state.current_stage, 0.0)
    
    @staticmethod
    def _can_transition_stage(conversation_state: ConversationState) -> bool:
        """Determine if conversation can transition to next stage."""
        if conversation_state.current_stage == ConversationStage.DISCOVERY:
            return conversation_state.should_trigger_confirmation()
        elif conversation_state.current_stage == ConversationStage.CONFIRMATION:
            return conversation_state.confidence_score > 0.6
        return False
    
    @staticmethod
    def _can_complete_conversation(conversation_state: ConversationState) -> bool:
        """Determine if conversation can be completed and project created."""
        return (
            conversation_state.current_stage == ConversationStage.EXPERT_COACHING and
            conversation_state.confidence_score > 0.7 and
            len(conversation_state.missing_information) <= 2 and
            conversation_state.project_summary is not None
        )
    
    @staticmethod
    def _analyze_messages_per_stage(conversation_state: ConversationState) -> Dict[str, int]:
        """Analyze message distribution across stages."""
        stage_counts = {stage.value: 0 for stage in ConversationStage}
        
        current_stage = ConversationStage.DISCOVERY
        stage_transition_indices = [0]
        
        for transition in conversation_state.stage_transitions:
            stage_transition_indices.append(transition.get('message_count', 0))
        
        for i, msg in enumerate(conversation_state.messages):
            if msg.role == 'user':  # Count only user messages
                # Find which stage this message belongs to
                stage_index = 0
                for j, transition_point in enumerate(stage_transition_indices[1:], 1):
                    if i < transition_point:
                        break
                    stage_index = j
                
                stages = list(ConversationStage)
                if stage_index < len(stages):
                    stage_counts[stages[stage_index].value] += 1
        
        return stage_counts
    
    @staticmethod
    def _analyze_confidence_progression(conversation_state: ConversationState) -> List[Dict[str, Any]]:
        """Analyze how confidence score progressed over time."""
        progression = []
        
        for i, msg in enumerate(conversation_state.messages):
            if msg.role == 'assistant' and 'confidence' in msg.metadata:
                progression.append({
                    "message_index": i,
                    "confidence": msg.metadata['confidence'],
                    "timestamp": msg.timestamp.isoformat()
                })
        
        return progression


# ===== UTILITY FUNCTIONS =====

def serialize_for_api(conversation_state: ConversationState, 
                     full_history: bool = True) -> Dict[str, Any]:
    """Convenience function for API serialization."""
    return ConversationSerializer.to_api_response(conversation_state, full_history)


def serialize_for_frontend(conversation_state: ConversationState) -> Dict[str, Any]:
    """Convenience function for frontend serialization."""
    return ConversationSerializer.to_frontend_state(conversation_state)


def deserialize_from_database(record: Dict[str, Any]) -> ConversationState:
    """Convenience function for database deserialization."""
    return ConversationSerializer.from_database_record(record)


# ===== TESTING UTILITIES =====

if __name__ == "__main__":
    # Test serialization utilities
    print("=== Conversation Serializer Test ===")
    
    from echo.conversation_state_manager import create_conversation_manager
    import asyncio
    
    async def test_serializer():
        # Create a test conversation
        manager = create_conversation_manager()
        conversation = manager.start_conversation(user_id="test_user")
        
        # Add some test data
        manager.add_user_message(conversation.conversation_id, "I want to build an app")
        manager.add_assistant_message(conversation.conversation_id, "Tell me more about it")
        
        manager.update_project_understanding(
            conversation.conversation_id,
            "Mobile app project",
            {"project_type": "software", "features": ["auth", "dashboard"]},
            0.8
        )
        
        # Get updated state
        conversation_state = manager.get_conversation(conversation.conversation_id)
        
        # Test API serialization
        api_format = ConversationSerializer.to_api_response(conversation_state)
        print(f"✅ API format: {len(api_format)} fields")
        
        # Test frontend serialization
        frontend_format = ConversationSerializer.to_frontend_state(conversation_state)
        print(f"✅ Frontend format: {len(frontend_format)} sections")
        
        # Test database serialization
        db_format = ConversationSerializer.to_database_record(conversation_state)
        print(f"✅ Database format: {len(db_format)} fields")
        
        # Test roundtrip (database -> object -> database)
        restored_state = ConversationSerializer.from_database_record(db_format)
        print(f"✅ Roundtrip: {restored_state.conversation_id == conversation_state.conversation_id}")
        
        # Test export format
        export_format = ConversationSerializer.to_export_format(conversation_state, include_analytics=True)
        print(f"✅ Export format: {len(export_format)} sections")
        
        print("✅ Conversation Serializer test complete!")
    
    asyncio.run(test_serializer())