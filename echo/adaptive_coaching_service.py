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
import logging
import json
import re
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from datetime import datetime

from echo.models import ConversationStage, ConversationState, DomainDetection, ConversationMessage
from echo.conversation_state_manager import ConversationStateManager, create_conversation_manager
from echo.claude_client import get_claude_client
from echo.expert_personas import ExpertPersonaManager, create_expert_persona_manager
from echo.semantic_domain_detector import SemanticDomainDetector

logger = logging.getLogger(__name__)


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
        self.claude_client = get_claude_client()
        self.persona_manager = create_expert_persona_manager()
        self.domain_detector = SemanticDomainDetector()
    
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
        
        Uses Claude API with discovery prompts to build understanding through
        natural dialogue. Analyzes conversation for project understanding and
        determines readiness for confirmation stage.
        
        Args:
            conversation_state: Current conversation state
            user_message: User's message
            
        Returns:
            CoachingResponse with discovery stage response
        """
        try:
            # Build Claude messages with full conversation context
            claude_messages = self._build_claude_messages(
                conversation_state, 
                user_message,
                stage=ConversationStage.DISCOVERY
            )
            
            # Extract system message and conversation messages
            system_message = None
            conversation_messages = []
            for msg in claude_messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    conversation_messages.append(msg)
            
            # Call Claude API with full conversation context
            logger.info("Calling Claude API for discovery stage")
            logger.info(f"System prompt: {system_message}")
            logger.info(f"Messages being sent to Claude: {json.dumps(conversation_messages, indent=2)}")
            try:
                response = self.claude_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1000,
                    temperature=0.7,
                    system=system_message,
                    messages=conversation_messages
                )
                logger.debug(f"Claude API response type: {type(response)}")
                logger.debug(f"Response attributes: {dir(response)}")
            except Exception as api_error:
                logger.error(f"Claude API call failed: {api_error}", exc_info=True)
                raise
            
            # Handle the response content properly
            logger.debug(f"Response content type: {type(response.content) if hasattr(response, 'content') else 'No content attr'}")
            
            if hasattr(response, 'content'):
                if isinstance(response.content, list):
                    logger.debug(f"Response content is list with {len(response.content)} items")
                    if response.content:
                        logger.debug(f"First content item type: {type(response.content[0])}")
                        response_text = response.content[0].text
                    else:
                        response_text = "No response content"
                else:
                    logger.warning(f"Unexpected response content type: {type(response.content)}")
                    response_text = str(response.content)
            else:
                logger.error("Response has no content attribute")
                response_text = str(response)
            
            # Count exchanges to avoid endless discovery
            exchange_count = len([m for m in conversation_state.messages if m.role == "user"]) + 1
            
            logger.info(f"Discovery stage - Exchange count: {exchange_count}, Messages in state: {len(conversation_state.messages)}")
            
            # Force progression after 3 exchanges or if summary detected
            should_progress = exchange_count >= 3 or self._contains_project_summary(response_text)
            
            # Check if response includes project summary or we should force progression
            if should_progress:
                # If forcing progression, add a summary to the response
                if exchange_count >= 4 and not self._contains_project_summary(response_text):
                    response_text += "\n\nBased on our conversation, here's my understanding of your project: " + self._generate_summary_from_conversation(conversation_state)
                
                summary = self._extract_project_summary(response_text) or response_text
                
                # Perform domain detection using semantic detector
                # Add the current message to the messages list
                messages_for_detection = conversation_state.messages.copy() if hasattr(conversation_state, 'messages') else []
                messages_for_detection.append(ConversationMessage(
                    role="user",
                    content=user_message,
                    timestamp=datetime.now()
                ))
                
                # Get uploaded files if any
                uploaded_files = conversation_state.uploaded_files if hasattr(conversation_state, 'uploaded_files') else []
                
                # Use semantic domain detector
                domain_detection = self.domain_detector.detect_domain(
                    messages=messages_for_detection,
                    uploaded_files=uploaded_files
                )
                
                # Store conversation ID for data extraction
                self._current_conversation_id = conversation_state.conversation_id
                
                # Extract comprehensive project data
                project_data = self._extract_project_data(summary, user_message, conversation_state)
                
                # Update conversation state
                self.conversation_manager.update_project_understanding(
                    conversation_state.conversation_id,
                    summary,
                    project_data,
                    domain_detection.confidence
                )
                
                self.conversation_manager.set_domain_detection(
                    conversation_state.conversation_id,
                    domain_detection
                )
                
                # Transition to confirmation
                self.conversation_manager.transition_stage(
                    conversation_state.conversation_id,
                    ConversationStage.CONFIRMATION,
                    "Project understanding achieved"
                )
                
                return CoachingResponse(
                    message=response_text,
                    stage=ConversationStage.CONFIRMATION,
                    confidence=domain_detection.confidence,
                    detected_domain=domain_detection.domain,
                    should_transition=True
                )
            
            # Still in discovery stage
            return CoachingResponse(
                message=response_text,
                stage=ConversationStage.DISCOVERY,
                confidence=0.5
            )
            
        except Exception as e:
            logger.error(f"Error in discovery stage: {e}", exc_info=True)
            # Fallback response
            return CoachingResponse(
                message="I'm having trouble processing that. Could you tell me more about what you're trying to accomplish?",
                stage=ConversationStage.DISCOVERY,
                confidence=0.0
            )
    
    async def _handle_confirmation_stage(self, conversation_state: ConversationState, 
                                       user_message: str) -> CoachingResponse:
        """
        Handle confirmation stage - validate project understanding and select persona.
        
        Presents project summary for validation, handles corrections, and
        transitions to expert coaching mode with appropriate persona.
        
        Args:
            conversation_state: Current conversation state
            user_message: User's message
            
        Returns:
            CoachingResponse with confirmation stage response
        """
        try:
            # Build Claude messages with full conversation context
            claude_messages = self._build_claude_messages(
                conversation_state,
                user_message,
                stage=ConversationStage.CONFIRMATION
            )
            
            # Extract system message and conversation messages
            system_message = None
            conversation_messages = []
            for msg in claude_messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    conversation_messages.append(msg)
            
            # Call Claude API with full conversation context
            logger.info("Calling Claude API for confirmation stage")
            logger.info(f"System prompt: {system_message}")
            logger.info(f"Messages being sent to Claude: {json.dumps(conversation_messages, indent=2)}")
            response = self.claude_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=800,
                temperature=0.5,  # Lower temperature for more structured response
                system=system_message,
                messages=conversation_messages
            )
            
            response_text = response.content[0].text
            
            # Check if user confirmed understanding
            if self._is_confirmation_positive(user_message):
                # Get the appropriate persona
                domain = conversation_state.domain_detection.domain if conversation_state.domain_detection else "general_planning"
                persona = self.persona_manager.get_persona(domain)
                
                # Set persona and transition to expert coaching
                self.conversation_manager.set_persona(
                    conversation_state.conversation_id,
                    domain
                )
                
                self.conversation_manager.transition_stage(
                    conversation_state.conversation_id,
                    ConversationStage.EXPERT_COACHING,
                    "User confirmed project understanding"
                )
                
                # Generate transition message - seamless, no meta-commentary
                project_data = conversation_state.project_data if hasattr(conversation_state, 'project_data') else {}
                project_name = project_data.get('project_name', 'your project')
                project_type = project_data.get('project_type', 'project')
                
                transition_message = f"Perfect! Now I'm going to guide you through strategic planning for {project_name}.\n\nBased on your project scope and constraints, here's what we need to lock down first:\n\n**Your biggest risk is scope creep** - with {project_type} projects, feature bloat kills more projects than technical challenges. I'm recommending a strict feature lockdown system.\n\n**Your second critical risk is time sustainability** - 10 hours/week sounds manageable until life happens. We need realistic scheduling with built-in buffers.\n\n**Your third challenge is technical architecture** - as your first complex project, early decisions will make or break your development velocity.\n\nI'm going to walk you through these systematically. First, let's establish your scope boundaries and risk mitigation strategy."
                
                return CoachingResponse(
                    message=transition_message,
                    stage=ConversationStage.EXPERT_COACHING,
                    confidence=0.9,
                    detected_domain=domain,
                    should_transition=True
                )
            else:
                # User wants corrections - stay in confirmation
                return CoachingResponse(
                    message=response_text,
                    stage=ConversationStage.CONFIRMATION,
                    confidence=0.6
                )
                
        except Exception as e:
            logger.error(f"Error in confirmation stage: {e}")
            return CoachingResponse(
                message="I'd be happy to refine my understanding. What aspects would you like to clarify?",
                stage=ConversationStage.CONFIRMATION,
                confidence=0.0
            )
    
    async def _handle_expert_coaching(self, conversation_state: ConversationState, 
                                    user_message: str) -> CoachingResponse:
        """
        Handle expert coaching stage - provide domain-specific strategic guidance.
        
        Uses expert persona prompts with CO-STAR framework to provide
        domain-specific methodologies, strategic recommendations, and
        risk assessments tailored to the project type.
        
        Args:
            conversation_state: Current conversation state
            user_message: User's message
            
        Returns:
            CoachingResponse with expert coaching response
        """
        try:
            # Build Claude messages with full conversation context
            claude_messages = self._build_claude_messages(
                conversation_state,
                user_message,
                stage=ConversationStage.EXPERT_COACHING
            )
            
            # Extract system message and conversation messages
            system_message = None
            conversation_messages = []
            for msg in claude_messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    conversation_messages.append(msg)
            
            # Call Claude API with Opus for strategic guidance
            logger.info("Calling Claude API for expert coaching stage")
            logger.info(f"System prompt: {system_message}")
            logger.info(f"Messages being sent to Claude: {json.dumps(conversation_messages, indent=2)}")
            response = self.claude_client.messages.create(
                model="claude-opus-4-20250514",  # Use Opus for expert coaching
                max_tokens=1200,
                temperature=0.7,
                system=system_message,
                messages=conversation_messages
            )
            
            response_text = response.content[0].text
            
            # Update conversation analytics
            self._update_conversation_analytics(conversation_state.conversation_id)
            
            # Get current persona for response
            domain = conversation_state.current_persona or "general_planning"
            persona = self.persona_manager.get_persona(domain)
            
            return CoachingResponse(
                message=response_text,
                stage=ConversationStage.EXPERT_COACHING,
                confidence=0.9,
                detected_domain=domain,
                reasoning=f"Expert guidance from {persona.name if persona else 'consultant'}"
            )
            
        except Exception as e:
            logger.error(f"Error in expert coaching stage: {e}")
            # Fallback to general guidance
            return CoachingResponse(
                message="Let me help you think through this strategically. What's your biggest concern or question about moving forward with this project?",
                stage=ConversationStage.EXPERT_COACHING,
                confidence=0.0
            )
    
    # ===== HELPER METHODS =====
    
    def _contains_project_summary(self, response_text: str) -> bool:
        """Check if response contains a project summary."""
        summary_indicators = [
            "based on our conversation, here's my understanding",
            "let me summarize what i've learned",
            "project summary:",
            "to summarize your project",
            "here's my complete understanding of your project"
        ]
        # Stricter matching - require more specific summary phrases
        response_lower = response_text.lower()
        return any(indicator in response_lower for indicator in summary_indicators)
    
    def _extract_project_summary(self, response_text: str) -> str:
        """Extract project summary from response."""
        # Find the summary section
        lines = response_text.split('\n')
        summary_lines = []
        in_summary = False
        
        for line in lines:
            if self._contains_project_summary(line):
                in_summary = True
            if in_summary:
                summary_lines.append(line)
                if line.strip() == "" and len(summary_lines) > 3:
                    break
        
        return '\n'.join(summary_lines).strip()
    
    def _extract_project_data(self, summary: str, user_message: str, conversation_state: ConversationState = None) -> Dict[str, Any]:
        """Extract structured project planning data from summary and conversation."""
        # Initialize with metadata
        data = {
            "project_summary": summary,
            "last_user_input": user_message,
            "extraction_timestamp": datetime.now().isoformat()
        }
        
        # Extract project information from conversation messages
        all_user_messages = []
        all_ai_messages = []
        
        if conversation_state and hasattr(conversation_state, 'messages'):
            all_user_messages = [m.content for m in conversation_state.messages if m.role == "user"]
            all_ai_messages = [m.content for m in conversation_state.messages if m.role == "assistant"]
        else:
            # Fallback to conversation manager if state not available
            conversation_id = getattr(self, '_current_conversation_id', None)
            if conversation_id:
                try:
                    conv_state = self.conversation_manager.get_conversation(conversation_id)
                    if conv_state and hasattr(conv_state, 'messages'):
                        all_user_messages = [m.content for m in conv_state.messages if m.role == "user"]
                        all_ai_messages = [m.content for m in conv_state.messages if m.role == "assistant"]
                except Exception as e:
                    logger.debug(f"Could not get conversation messages: {e}")
        
        # Add current message if not already in list
        if user_message and user_message not in all_user_messages:
            all_user_messages.append(user_message)
        
        # Combine user input and AI insights for better extraction
        combined_user_input = " ".join(all_user_messages) if all_user_messages else user_message
        combined_conversation = " ".join(all_user_messages + all_ai_messages) if (all_user_messages or all_ai_messages) else combined_user_input
        
        logger.info(f"Extracting project data from combined input: {combined_user_input[:100]}...")
        
        # Extract project type based on keywords from full conversation
        conversation_text = combined_conversation.lower()
        if any(word in conversation_text for word in ["app", "mobile", "ios", "android", "application", "software", "code", "programming"]):
            data["project_type"] = "software"
        elif any(word in conversation_text for word in ["research", "study", "thesis", "paper", "analysis", "academic", "scientific"]):
            data["project_type"] = "research"
        elif any(word in conversation_text for word in ["book", "article", "blog", "content", "writing", "publication"]):
            data["project_type"] = "writing"
        elif any(word in conversation_text for word in ["business", "startup", "company", "venture", "marketing"]):
            data["project_type"] = "business"
        else:
            data["project_type"] = "personal"
        
        # Extract project name (look for "build/create/develop X" patterns)
        name_patterns = [
            r"(?:build|create|develop|make|design|implement)\s+(?:a\s+)?([^.!?]+?)(?:\s+for|\s+to|\s+that|\.|!|\?|$)",
            r"(?:working on|planning|designing)\s+(?:a\s+)?([^.!?]+?)(?:\.|!|\?|$)",
            r"([^.!?]+?)\s+(?:app|application|tool|system|platform|project)"
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, conversation_text, re.IGNORECASE)
            if match and "project_name" not in data:
                potential_name = match.group(1).strip()
                # Clean up the name
                if len(potential_name) < 100:  # Reasonable length for a project name
                    data["project_name"] = potential_name
                    break
        
        # If no name found, generate one from the type
        if "project_name" not in data:
            if "mobile app" in combined_user_input.lower():
                data["project_name"] = "Mobile App Project"
            elif "web" in combined_user_input.lower():
                data["project_name"] = "Web Application Project"
            else:
                data["project_name"] = f"New {data['project_type'].title()} Project"
        
        # Extract timeline
        timeline_patterns = [
            r"(\d+)\s*(?:months?|weeks?|days?)",
            r"(?:by|before|until|deadline)\s+([A-Za-z]+ \d+)",
            r"(?:complete|finish|done|ready)\s+(?:in|by)\s+([^.!?]+)"
        ]
        
        for pattern in timeline_patterns:
            match = re.search(pattern, conversation_text, re.IGNORECASE)
            if match:
                data["timeline_info"] = match.group(0)
                # Extract duration in days if possible
                try:
                    if "month" in match.group(0):
                        num = int(re.search(r"\d+", match.group(0)).group())
                        data["estimated_duration_days"] = num * 30
                    elif "week" in match.group(0):
                        num = int(re.search(r"\d+", match.group(0)).group())
                        data["estimated_duration_days"] = num * 7
                except (ValueError, AttributeError):
                    pass  # Skip if can't extract number
                break
        
        # Extract key features/deliverables using broader pattern matching
        deliverables = []
        
        # Common app features
        feature_keywords = {
            "authentication": ["login", "auth", "sign in", "user account", "registration"],
            "tracking": ["track", "monitor", "log", "record", "measure"],
            "analytics": ["analytics", "dashboard", "reports", "metrics", "insights"],
            "notifications": ["notify", "remind", "alert", "notification", "reminder"],
            "social": ["share", "social", "community", "friends", "collaborate"],
            "data_management": ["database", "storage", "sync", "backup", "export"],
            "goals": ["goals", "objectives", "targets", "achievements"],
            "habits": ["habits", "routine", "daily", "consistency"],
            "calendar": ["schedule", "calendar", "events", "appointments"],
            "search": ["search", "find", "filter", "browse"]
        }
        
        for feature, keywords in feature_keywords.items():
            if any(keyword in conversation_text for keyword in keywords):
                deliverables.append(feature.replace("_", " ").title())
        
        # Extract explicit deliverables from text
        deliverable_patterns = [
            r"(?:need|want|require|build|create|implement)\s+(?:a\s+)?([^.!?]+?)(?:\s+feature|\s+system|\s+component|\.|\!|\?|$)",
            r"(?:will have|includes?|features?)\s+([^.!?]+?)(?:\.|\!|\?|$)",
            r"(?:deliverables?|outcomes?|results?)[:\s]+([^.!?]+)",
        ]
        
        for pattern in deliverable_patterns:
            matches = re.findall(pattern, conversation_text, re.IGNORECASE)
            for match in matches:
                clean_deliverable = match.strip().strip(",")
                if len(clean_deliverable) < 50 and clean_deliverable not in deliverables:
                    deliverables.append(clean_deliverable)
        
        if deliverables:
            data["key_deliverables"] = deliverables[:5]  # Limit to 5 most relevant
        
        # Extract primary objective (what the user wants to achieve)
        objective_patterns = [
            r"(?:want to|need to|trying to|hoping to|goal is to)\s+([^.!?]+)",
            r"(?:objective|purpose|aim)\s+(?:is\s+)?(?:to\s+)?([^.!?]+)",
            r"(?:will help|enables?|allows?)\s+(?:me to|users? to)?\s*([^.!?]+)"
        ]
        
        for pattern in objective_patterns:
            match = re.search(pattern, conversation_text, re.IGNORECASE)
            if match and "objective" not in data:
                objective = match.group(1).strip()
                if len(objective) < 100:  # Reasonable length
                    data["objective"] = objective
                    break
        
        # Extract requirements/constraints
        requirements = []
        constraint_patterns = [
            r"(?:must|need|require|have to)\s+([^.!?]+?)(?:\.|!|\?|$)",
            r"(?:constraint|limitation|requirement)[:\s]+([^.!?]+)",
            r"(?:can't|cannot|won't|shouldn't)\s+([^.!?]+)"
        ]
        
        for pattern in constraint_patterns:
            matches = re.findall(pattern, conversation_text, re.IGNORECASE)
            for match in matches:
                clean_req = match.strip().strip(",")
                if len(clean_req) < 80 and clean_req not in requirements:
                    requirements.append(clean_req)
        
        if requirements:
            data["requirements"] = requirements[:3]  # Limit to 3 most important
        
        # Create a clean description
        data["description"] = self._create_clean_description(combined_user_input, data.get("project_name", ""))
        
        logger.info(f"Extracted project data: {json.dumps(data, indent=2)}")
        return data
    
    def _create_clean_description(self, user_input: str, project_name: str) -> str:
        """Create a clean project description from user input."""
        # Remove the project name from the description to avoid redundancy
        description = user_input
        if project_name and project_name.lower() in description.lower():
            description = description.replace(project_name, "this project", 1)
        
        # Clean up common phrases
        description = re.sub(r"I want to |I'd like to |I'm planning to |I need to ", "", description, count=1)
        
        # Ensure proper capitalization
        description = description[0].upper() + description[1:] if description else ""
        
        # Limit length
        if len(description) > 200:
            description = description[:197] + "..."
        
        return description.strip()
    
    async def _detect_domain(self, conversation_state: ConversationState, summary: str) -> DomainDetection:
        """Detect domain using semantic domain detector as fallback."""
        # Use semantic domain detector for comprehensive analysis
        messages = conversation_state.messages if hasattr(conversation_state, 'messages') else []
        uploaded_files = conversation_state.uploaded_files if hasattr(conversation_state, 'uploaded_files') else []
        
        # Add summary as an additional message for analysis
        messages_with_summary = messages.copy()
        messages_with_summary.append(ConversationMessage(
            role="assistant",
            content=summary,
            timestamp=datetime.now()
        ))
        
        return self.domain_detector.detect_domain(
            messages=messages_with_summary,
            uploaded_files=uploaded_files
        )
    
    def _is_confirmation_positive(self, message: str) -> bool:
        """Check if user confirmed the project understanding."""
        positive_indicators = [
            "yes", "correct", "right", "exactly", "perfect",
            "that's it", "sounds good", "let's proceed", "let's go",
            "confirm", "accurate", "good to go"
        ]
        negative_indicators = [
            "no", "not", "incorrect", "wrong", "actually",
            "change", "different", "modify", "adjust"
        ]
        
        message_lower = message.lower()
        
        # Check for negative indicators first
        if any(neg in message_lower for neg in negative_indicators):
            return False
        
        # Check for positive indicators
        return any(pos in message_lower for pos in positive_indicators)
    
    def _infer_user_expertise(self, conversation_state: ConversationState) -> str:
        """Infer user expertise level from conversation."""
        messages_text = " ".join([m.content for m in conversation_state.messages if m.role == "user"])
        
        # Simple heuristic based on technical language and detail
        expert_indicators = ["architecture", "methodology", "framework", "optimization", "scalability"]
        beginner_indicators = ["how to", "what is", "help me", "new to", "first time"]
        
        expert_count = sum(1 for ind in expert_indicators if ind in messages_text.lower())
        beginner_count = sum(1 for ind in beginner_indicators if ind in messages_text.lower())
        
        if expert_count > beginner_count:
            return "expert"
        elif beginner_count > expert_count:
            return "beginner"
        else:
            return "intermediate"
    
    def _extract_timeline(self, conversation_state: ConversationState) -> Optional[str]:
        """Extract timeline information from conversation."""
        timeline_keywords = ["deadline", "by", "timeline", "due", "complete by", "finish", "launch"]
        
        for msg in conversation_state.messages:
            if msg.role == "user":
                for keyword in timeline_keywords:
                    if keyword in msg.content.lower():
                        # Simple extraction - could be enhanced with NLP
                        return msg.content
        
        return None
    
    def _update_conversation_analytics(self, conversation_id: str):
        """Update conversation analytics (placeholder for future implementation)."""
        # This would track response times, stage transitions, etc.
        pass
    
    def _generate_summary_from_conversation(self, conversation_state: ConversationState) -> str:
        """Generate a project summary from conversation history."""
        # Extract key information from user messages
        user_messages = [m.content for m in conversation_state.messages if m.role == "user"]
        if not user_messages:
            return "A project that needs further clarification."
        
        # Combine messages to create a basic summary
        combined = " ".join(user_messages)
        # Truncate if too long
        if len(combined) > 300:
            combined = combined[:297] + "..."
        
        return f"You're planning {combined}"
    
    def _build_claude_messages(self, conversation_state: ConversationState, 
                              current_user_message: str, 
                              stage: ConversationStage) -> List[Dict[str, str]]:
        """
        Build proper Claude message array with full conversation context.
        
        Args:
            conversation_state: Current conversation state
            current_user_message: The new user message to process
            stage: Current conversation stage
            
        Returns:
            List of messages formatted for Claude API
        """
        messages = []
        
        # Add system message based on stage
        if stage == ConversationStage.DISCOVERY:
            system_content = """You're helping someone create a project plan in their project management system. Focus on understanding the PROJECT STRUCTURE and PLANNING needs, not implementation details.

Keep responses conversational but well-structured:
- Start by acknowledging what they've shared
- When asking questions, organize them under clear topic headers using **Topic:** format
- Ask 1-3 questions per topic area
- Use bullet points (- ) for individual questions within each topic
- Keep questions concise and end with a question mark

IMPORTANT: Focus on PROJECT PLANNING questions like:
- Project scope and objectives
- Key deliverables and milestones
- Timeline and phases
- Success criteria
- Resources needed

AVOID implementation details like:
- Specific technical configurations
- Writing methodology
- Documentation formatting
- Code/content specifics

Example format:
I understand you're planning [their project type]. Let me help you set up a clear project structure.

**Project Scope:**
- What are the main deliverables you need to complete?
- What's your target timeline for this project?

**Key Milestones:**
- What are the major phases or checkpoints?
- Are there any external deadlines we should plan around?

This helps me create a comprehensive project plan for you.

IMPORTANT: After 2-3 exchanges, you should have enough information to summarize and move forward. Don't get stuck asking for endless details. Once you understand:
- What they're building/planning
- Rough timeline or scope
- Key deliverables or goals

Move to confirmation by offering a summary starting with 'Based on our conversation, here's my understanding of your project:'

Avoid asking "do you want to discuss X more?" or "shall we dive deeper?" - just summarize what you know and move forward."""
        elif stage == ConversationStage.CONFIRMATION:
            system_content = """You're confirming project understanding before transitioning to expert coaching mode.

CRITICAL: Stay at the PLANNING level. Do NOT dive into implementation details, code, or technical specifics.

Structure your confirmation response:
1. Start with a clear project summary
2. List the project phases (Month 1, Month 2, etc.) with HIGH-LEVEL goals
3. Confirm key deliverables and success metrics
4. Ask for confirmation

Example format:
Based on our conversation, here's my understanding of your project:

[One paragraph project overview]

**Project Timeline:**
- Month 1: [High-level goal, e.g., "Foundation and basic tracking"]
- Month 2: [High-level goal, e.g., "Bank integration"]
- Month 3: [High-level goal]

**Key Deliverables:**
- [Deliverable 1]
- [Deliverable 2]

**Success Criteria:**
- [What makes this project complete]

Does this project structure align with your vision?

AVOID:
- Technical stack discussions
- Code file structures
- Week-by-week breakdowns
- Implementation details
- "Let's dive into..." phrases

Keep it brief and high-level. We're confirming the WHAT, not the HOW."""
        else:  # EXPERT_COACHING
            persona = self.persona_manager.get_persona(
                conversation_state.current_persona or "general_planning"
            )
            base_prompt = persona.prompt if persona else "You're providing expert project guidance."
            
            # Add decisive, directive guidance to persona prompt
            system_content = f"""{base_prompt}

CRITICAL: You are the expert leading this planning session. Be DECISIVE and DIRECTIVE.

**Your Role:**
- Take charge of the planning flow - YOU decide what to cover next
- Give concrete recommendations, not options
- Drive the conversation forward with authority
- Use your expertise to sequence planning logically

**Communication Style:**
- Start with "Based on your project, here's what we need to address..."
- Make definitive statements: "Your biggest risk is X. Here's how we handle it..."
- Give 2-3 concrete recommendations per response
- End with "Next, we need to tackle Y" (not "What would you like to discuss?")

**Planning Sequence (follow this order):**
1. Risk Assessment & Mitigation (identify 2-3 critical risks)
2. Timeline & Resource Allocation (realistic scheduling)
3. Technical Architecture Decisions (key technology choices)
4. Success Metrics & Milestones (measurable outcomes)

**AVOID being consultative:**
- Don't ask "Which area would you like to focus on?"
- Don't offer multiple options for user to choose from
- Don't ask "What concerns you most?" 
- Don't end with open questions

**BE decisive:**
- "Your project needs X. Here's my recommendation..."
- "Based on your constraints, we must prioritize Y first..."
- "Next, we're going to lock down your Z strategy..."

Remember: You're the expert architect. Lead the planning session decisively."""
        
        messages.append({"role": "system", "content": system_content})
        
        # Add all previous conversation messages
        if hasattr(conversation_state, 'messages') and conversation_state.messages:
            for msg in conversation_state.messages:
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        # Add the current user message
        messages.append({
            "role": "user",
            "content": current_user_message
        })
        
        logger.debug(f"Built {len(messages)} messages for Claude (including system message)")
        return messages


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