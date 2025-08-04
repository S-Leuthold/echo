# ==============================================================================
# FILE: echo/adaptive_prompt_generator.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Adaptive prompt generation for the three-phase conversation system.
#   Implements CO-STAR framework and dynamic prompt construction based on
#   conversation stage and context.
#
# USAGE:
#   This module provides prompt generation for discovery, confirmation, and
#   expert coaching stages following Anthropic best practices.
# ==============================================================================

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime

from echo.models import ConversationMessage, ConversationStage


@dataclass
class PromptContext:
    """Context information for prompt generation."""
    conversation_history: List[ConversationMessage]
    project_summary: Optional[str] = None
    detected_domain: Optional[str] = None
    user_expertise: Optional[str] = None
    constraints: List[str] = None
    success_criteria: List[str] = None
    timeline: Optional[str] = None
    uploaded_files: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.constraints is None:
            self.constraints = []
        if self.success_criteria is None:
            self.success_criteria = []
        if self.uploaded_files is None:
            self.uploaded_files = []


class AdaptivePromptGenerator:
    """
    Generates context-aware prompts for each conversation stage.
    
    Implements the CO-STAR framework:
    - Context: Domain-specific background and project understanding
    - Objective: Clear coaching goals aligned with project success
    - Style: Expert consultant tone with supportive guidance
    - Tone: Professional but encouraging, methodology-driven
    - Audience: Tailored to user expertise level
    - Response: Structured strategic guidance with actionable steps
    """
    
    def generate_discovery_prompt(self, context: PromptContext) -> str:
        """
        Generate prompt for discovery stage - natural conversation to understand project.
        
        Args:
            context: Current conversation context
            
        Returns:
            Formatted prompt for discovery stage
        """
        conversation_text = self._format_conversation_history(context.conversation_history)
        file_context = self._format_file_context(context.uploaded_files)
        
        prompt = f"""You are a skilled project strategy consultant helping someone think through their project.
        
ROLE: Experienced project consultant who has guided hundreds of successful projects across diverse domains
APPROACH: Natural conversation that builds understanding gradually and organically
GOAL: Understand what they're building through thoughtful dialogue
EXPERTISE: Project planning, strategic thinking, risk assessment, and methodology selection

CONVERSATION PRINCIPLES:
- Ask thoughtful follow-up questions based on their responses
- Build understanding incrementally, don't interrogate with rapid-fire questions
- Show genuine interest in their vision and challenges
- When you understand enough to summarize their project (usually after 3-5 exchanges), provide a clear summary
- Use their language and terminology to show you're listening
- Be encouraging while also being realistic about challenges

CONVERSATION STYLE:
- Conversational and approachable, not formal or academic
- Use "I" statements to share insights (e.g., "I've seen projects like this succeed when...")
- Ask open-ended questions that invite elaboration
- Acknowledge what they've shared before asking the next question

{file_context}

CONVERSATION HISTORY:
{conversation_text}

IMPORTANT: 
- If you have enough information to understand their project (typically after 3-5 exchanges), provide a project summary starting with "Based on our conversation, here's my understanding of your project:"
- The summary should capture: project type, main objectives, key deliverables, timeline, and any constraints
- After the summary, ask if you've understood correctly

Your response should continue this natural exploration of their project."""
        
        return prompt
    
    def generate_confirmation_prompt(self, context: PromptContext) -> str:
        """
        Generate prompt for confirmation stage - validate understanding and prepare for coaching.
        
        Args:
            context: Current conversation context with project summary
            
        Returns:
            Formatted prompt for confirmation stage
        """
        conversation_text = self._format_conversation_history(context.conversation_history[-3:])  # Last 3 messages
        
        prompt = f"""You are transitioning from discovery to expert coaching mode.

CURRENT UNDERSTANDING:
Project Summary: {context.project_summary}

DETECTED DOMAIN: {context.detected_domain or 'general project management'}

YOUR TASK:
1. Present the project summary in a clear, structured way
2. Ask for confirmation or corrections
3. If confirmed, explain that you'll switch to expert mode with specialized guidance
4. If corrections needed, ask specific clarifying questions

CONVERSATION CONTEXT:
{conversation_text}

RESPONSE STRUCTURE:
- Start with: "Let me make sure I understand your project correctly..."
- Present the summary in bullet points or numbered list
- End with: "Is this accurate? Would you like me to adjust anything before we dive into strategic planning?"

Keep the tone supportive and collaborative."""
        
        return prompt
    
    def generate_expert_prompt(self, context: PromptContext, persona_prompt: str) -> str:
        """
        Generate prompt for expert coaching stage with specific persona.
        
        Args:
            context: Current conversation context
            persona_prompt: Domain-specific expert persona configuration
            
        Returns:
            Formatted prompt for expert coaching
        """
        conversation_text = self._format_conversation_history(context.conversation_history[-5:])  # Last 5 messages
        file_context = self._format_file_context(context.uploaded_files)
        
        prompt = f"""{persona_prompt}

CONVERSATION CONTEXT:
Project Summary: {context.project_summary}
User Expertise: {context.user_expertise or 'Not specified'}
Key Constraints: {', '.join(context.constraints) if context.constraints else 'None specified'}
Success Criteria: {', '.join(context.success_criteria) if context.success_criteria else 'Not yet defined'}
Timeline: {context.timeline or 'Not specified'}

{file_context}

RECENT CONVERSATION:
{conversation_text}

COACHING APPROACH:
1. Acknowledge their specific question or concern
2. Share 2-3 strategic insights based on your expertise
3. Provide a specific recommendation or framework that fits their situation
4. Ask 1-2 diagnostic questions to deepen understanding
5. Identify potential risks and suggest mitigation strategies

Your response should feel like sitting down with an expert who immediately understands their project and can provide specific, actionable guidance.

IMPORTANT: Stay in character as the expert. Use "I" statements and share from your experience."""
        
        return prompt
    
    def _format_conversation_history(self, messages: List[ConversationMessage]) -> str:
        """Format conversation messages for prompt context."""
        if not messages:
            return "No previous conversation."
        
        formatted = []
        for msg in messages:
            role = "User" if msg.role == "user" else "Assistant"
            formatted.append(f"{role}: {msg.content}")
        
        return "\n".join(formatted)
    
    def _format_file_context(self, files: List[Dict[str, Any]]) -> str:
        """Format uploaded file information for context."""
        if not files:
            return ""
        
        file_info = []
        for file in files:
            file_info.append(f"- {file.get('name', 'Unknown')} ({file.get('type', 'Unknown type')})")
        
        return f"""UPLOADED FILES:
The user has shared the following files:
{chr(10).join(file_info)}

Consider these files when understanding their project context."""


def create_adaptive_prompt_generator() -> AdaptivePromptGenerator:
    """
    Factory function to create an AdaptivePromptGenerator instance.
    
    Returns:
        AdaptivePromptGenerator: Configured prompt generator
    """
    return AdaptivePromptGenerator()


# ===== TESTING UTILITIES =====

if __name__ == "__main__":
    # Test prompt generation
    generator = create_adaptive_prompt_generator()
    
    # Test discovery prompt
    test_messages = [
        ConversationMessage(
            id="1",
            role="user",
            content="I want to build a research paper recommendation system",
            timestamp=datetime.now().isoformat()
        ),
        ConversationMessage(
            id="2", 
            role="assistant",
            content="That sounds interesting! Can you tell me more about who would use this system?",
            timestamp=datetime.now().isoformat()
        )
    ]
    
    test_context = PromptContext(
        conversation_history=test_messages,
        uploaded_files=[{"name": "requirements.pdf", "type": "application/pdf"}]
    )
    
    discovery_prompt = generator.generate_discovery_prompt(test_context)
    print("=== Discovery Prompt ===")
    print(discovery_prompt[:500] + "...")
    
    # Test confirmation prompt
    test_context.project_summary = "A machine learning system to recommend research papers"
    test_context.detected_domain = "academic_research"
    
    confirmation_prompt = generator.generate_confirmation_prompt(test_context)
    print("\n=== Confirmation Prompt ===")
    print(confirmation_prompt[:500] + "...")