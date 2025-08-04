"""
Context briefing and email intelligence prompts for the Echo planning system.

This module handles:
- Context briefing generation for daily planning
- Email summary and action extraction  
- Conversation intelligence from email threads
- Structured data extraction using OpenAI's structured outputs
"""

from __future__ import annotations
import json
import re
import logging
from datetime import date, time, datetime
from typing import List, Dict, Any, Optional

from .models import ContextBriefing, ScheduleItem, Task, Suggestion, Insight

# ============================================================================
# Context Briefing System
# ============================================================================

CONTEXT_BRIEFING_PROMPT_TEMPLATE = """\
# ROLE
You are a factual data extraction and organization assistant. Your job is to extract and organize information from provided sources without adding interpretation or inference.

# OBJECTIVE  
Extract and organize factual information from multiple data sources into a structured briefing. Present facts clearly without synthesis, interpretation, or creative additions.

# INSTRUCTIONS

## Core Principles
- EXTRACT ONLY: Only include information explicitly stated in the provided sources
- NO INFERENCE: Do not infer, assume, or extrapolate beyond what is directly stated  
- NO CREATIVE ADDITIONS: Do not add context, interpretations, or background information
- SOURCE ATTRIBUTION: Always include the source of each item
- IF UNCERTAIN: If information is unclear or ambiguous, do NOT guess - omit it

## Processing Workflow
1. **Read all provided sources completely**
2. **Extract only explicit, factual information**
3. **Organize by type and urgency as stated in sources**
4. **Include sender information exactly as provided**
5. **Create brief factual summary using only stated information**

## Data Sources to Process

### Email Intelligence
{email_context}

### Fixed Calendar Events  
{calendar_events}

### Recent Session Insights
{session_insights}

### Upcoming Reminders & Deadlines
{reminders}

## ANTI-HALLUCINATION RULES
- Do NOT create tasks that are not explicitly mentioned in sources
- Do NOT infer project status or timelines unless explicitly stated  
- Do NOT add urgency levels beyond what is stated in sources
- Do NOT synthesize themes or insights beyond factual summary
- Do NOT include information from your training data

# OUTPUT FORMAT
Extract and organize the factual information following the ContextBriefing schema. Only include information that is explicitly stated in the provided sources.

CRITICAL: Be descriptive but focused. Provide sufficient detail for effective planning. Prioritize the most important items. 

HARD LIMITS:
- conversation_summary: Maximum 6 sentences
- confirmed_schedule: Maximum 24 items
- high_priority_tasks: Maximum 18 items (INCLUDE ALL EMAIL ACTIONS)
- medium_priority_tasks: Maximum 12 items
- ai_suggestions: Maximum 3 items
- insights: Maximum 3 items
- Each field can be more descriptive - provide useful detail for planning"""

def build_context_briefing_prompt(
    email_context: str,
    calendar_events: List[Dict[str, Any]],
    session_insights: List[Dict[str, Any]],
    reminders: List[Dict[str, Any]]
) -> str:
    """
    Build the context briefing prompt with all available intelligence.
    
    Args:
        email_context: Email summary and action items
        calendar_events: List of fixed events for tomorrow
        session_insights: Recent session logs with todos/insights
        reminders: Upcoming reminders and deadlines
        
    Returns:
        Formatted context briefing prompt
    """
    
    # Format calendar events
    calendar_text = ""
    if calendar_events:
        for event in calendar_events:
            time_str = f"{event.get('start', 'TBD')} - {event.get('end', 'TBD')}"
            calendar_text += f"- {time_str}: {event.get('title', 'Untitled Event')}\n"
    else:
        calendar_text = "No fixed events scheduled for tomorrow."
    
    # Format session insights (concise summary only)
    insights_text = ""
    if session_insights:
        for session in session_insights[-3:]:  # Last 3 sessions only
            date = session.get('date', 'Recent')
            project = session.get('project', 'General')
            summary = session.get('summary', '')
            next_steps = session.get('next_steps', [])
            
            insights_text += f"{date} {project}: {summary[:100]}...\n"  # Truncate summary
            
            if next_steps:
                first_step = next_steps[0] if isinstance(next_steps, list) and next_steps else str(next_steps)[:50]
                insights_text += f"  Next: {first_step}\n"
    else:
        insights_text = "No recent session insights available."
    
    # Format reminders
    reminders_text = ""
    if reminders:
        for reminder in reminders:
            urgency = reminder.get('urgency', 'normal')
            urgency_emoji = {'high': '🔥', 'medium': '⚡', 'low': '📅'}.get(urgency, '📅')
            reminders_text += f"- {urgency_emoji} {reminder.get('text', 'Reminder')}\n"
    else:
        reminders_text = "No upcoming reminders."
    
    return CONTEXT_BRIEFING_PROMPT_TEMPLATE.format(
        email_context=email_context or "No new email items to review.",
        calendar_events=calendar_text,
        session_insights=insights_text,
        reminders=reminders_text
    )

def generate_context_briefing_structured(
    email_context: str,
    calendar_events: List[Dict[str, Any]], 
    session_insights: List[str],
    reminders: List[Dict[str, Any]],
    openai_client
) -> Dict[str, Any]:
    """
    Generate context briefing using OpenAI's structured outputs.
    
    Args:
        email_context: Email intelligence context
        calendar_events: List of calendar events  
        session_insights: Recent session insights
        reminders: Upcoming reminders
        openai_client: OpenAI client instance
        
    Returns:
        Dictionary with structured briefing data
    """
    logger = logging.getLogger(__name__)
    
    try:
        # Build the prompt using existing function
        prompt = build_context_briefing_prompt(
            email_context=email_context,
            calendar_events=calendar_events,
            session_insights=session_insights,
            reminders=reminders
        )
        
        logger.info("Generating context briefing with structured outputs")
        
        # Call OpenAI with structured outputs using gpt-4.1
        response = openai_client.beta.chat.completions.parse(
            model="gpt-4.1-2025-04-14",
            messages=[
                {
                    "role": "system", 
                    "content": prompt
                }
            ],
            response_format=ContextBriefing,
            temperature=0.1,
            max_tokens=8000
        )
        
        # Extract the structured data
        briefing_data = response.choices[0].message.parsed
        
        if briefing_data is None:
            logger.error("Failed to parse structured output")
            raise ValueError("OpenAI structured output parsing failed")
            
        logger.info(f"Successfully generated context briefing with {len(briefing_data.high_priority_tasks)} high priority tasks")
        
        # Convert Pydantic model to dict for API compatibility
        return briefing_data.model_dump()
        
    except Exception as e:
        logger.error(f"Error generating structured context briefing: {str(e)}")
        
        # Fallback structure
        return {
            "conversation_summary": f"Error generating context briefing: {str(e)[:100]}",
            "confirmed_schedule": [],
            "high_priority_tasks": [],
            "medium_priority_tasks": [],
            "ai_suggestions": [],
            "insights": []
        }

def parse_context_briefing_response(response_text: str) -> Dict[str, Any]:
    """
    Parse context briefing response for backward compatibility with tests.
    
    This function handles both structured output responses and raw JSON responses
    from the LLM for testing purposes.
    
    Args:
        response_text: Raw response text from LLM
        
    Returns:
        Dictionary with parsed briefing data
    """
    try:
        # Try to extract JSON from the response
        # Look for JSON object or array
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        
        if not json_match:
            raise ValueError("No JSON found in response")
        
        json_text = json_match.group(0)
        
        # Clean up markdown code blocks if present
        if json_text.startswith("```json"):
            json_text = json_text[7:]
        if json_text.endswith("```"):
            json_text = json_text[:-3]
        json_text = json_text.strip()
        
        # Parse the JSON
        parsed_data = json.loads(json_text)
        
        # Ensure required fields exist with defaults
        result = {
            "conversation_summary": parsed_data.get("conversation_summary", ""),
            "confirmed_schedule": parsed_data.get("confirmed_schedule", []),
            "high_priority_tasks": parsed_data.get("high_priority_tasks", []),
            "medium_priority_tasks": parsed_data.get("medium_priority_tasks", []),
            "ai_suggestions": parsed_data.get("ai_suggestions", []),
            "insights": parsed_data.get("insights", [])
        }
        
        return result
        
    except (json.JSONDecodeError, ValueError) as e:
        # Return error structure for failed parsing
        return {
            "conversation_summary": f"Failed to parse response: {str(e)[:100]}",
            "confirmed_schedule": [],
            "high_priority_tasks": [],
            "medium_priority_tasks": [],
            "ai_suggestions": [],
            "insights": []
        }

# ============================================================================
# Email Summary and Action Extraction
# ============================================================================

def build_email_summary_prompt(emails: List[Dict]) -> str:
    """
    Build a prompt for the LLM to summarize a list of emails, focusing on key topics, action items, meetings, and follow-ups.
    """
    if not emails:
        return "No emails to summarize."
    
    formatted_emails = []
    for email in emails:
        sender = email.get('from', {}).get('emailAddress', {}).get('address', '')
        subject = email.get('subject', '')
        body = email.get('bodyPreview', '')
        responded = email.get('responded', False)
        status = "✅ Responded" if responded else "⏳ Needs Response"
        formatted_emails.append(f"From: {sender}\nSubject: {subject}\nBody: {body}\nStatus: {status}")
    
    emails_text = '\n\n'.join(formatted_emails)
    
    prompt = f"""
You are an executive assistant. Summarize the following emails for daily planning. 

**IMPORTANT FILTERING RULES:**
- Ignore newsletters, notifications, and automated messages
- Ignore calendar invites (emails with "Accepted:", "Declined:", "Canceled:", "Meeting", "Calendar", "Invitation" in subject)
- Ignore promotional emails and marketing messages
- Focus only on emails that require actual action or response

**FOCUS ON:**
- Key topics and threads that need attention
- Action items that require responses or follow-up
- Important requests or deadlines
- Only include emails that need responses (not already responded to)
- **BE AGGRESSIVE**: Even if an email doesn't explicitly ask for something, consider if it requires any response, follow-up, or action
- Look for implicit action items like: confirming receipt, providing updates, scheduling follow-ups, etc.

**OUTPUT FORMAT:**
Return a JSON object with two fields:
- summary: a concise summary of the most important topics and threads
- action_items: a list of clean action items in this format:
  [
    {{
      "action": "Brief description of what needs to be done",
      "specific_description": "Detailed description of the specific action required (e.g., 'Review the KFS document and approve/reject the action item', 'Confirm meeting attendance for Tuesday 2pm')",
      "sender": "email@domain.com", 
      "subject": "Original email subject",
      "deadline": "Deadline if mentioned, otherwise null",
      "priority": "high/medium/low based on sender importance and urgency"
    }}
  ]

**PRIORITY GUIDELINES:**
- high: From important senders or contains urgent keywords
- medium: Standard requests or follow-ups
- low: Nice-to-have items or general updates

Emails:
{emails_text}
"""
    return prompt

def parse_email_summary_response(response: str) -> Dict:
    """
    Parse the LLM response for the email summary prompt. Returns a dict with 'summary' and 'action_items'.
    """
    try:
        result = json.loads(response)
        if "summary" not in result:
            result["summary"] = "No summary available."
        if "action_items" not in result:
            result["action_items"] = []
        return result
    except Exception as e:
        print(f"Failed to parse email summary LLM response: {e}")
        return {"summary": "Failed to parse LLM response.", "action_items": []}

def build_action_extraction_prompt(emails: List[Dict[str, Any]]) -> str:
    """
    Build a prompt for extracting action items from emails.
    
    Args:
        emails: List of email data dictionaries
        
    Returns:
        Action extraction prompt
    """
    
    # Format email data for analysis
    emails_text = ""
    for email in emails:
        emails_text += f"\n📧 **From**: {email.get('sender', 'Unknown')}"
        emails_text += f"\n📋 **Subject**: {email.get('subject', 'No subject')}"
        emails_text += f"\n📅 **Received**: {email.get('received', 'Unknown')}"
        emails_text += f"\n⚡ **Importance**: {email.get('importance', 'normal')}"
        emails_text += f"\n📝 **Content**: {email.get('body', '')[:200]}..."
        emails_text += "\n" + "="*50 + "\n"
    
    prompt = f"""You are an AI assistant that extracts action items from emails. Analyze the emails and identify specific tasks, requests, or actions that need to be taken.

## Your Task
Extract action items from the provided emails. Focus on:
1. **Explicit requests**: "Please send the report", "Can you review this?"
2. **Implicit tasks**: "The deadline is Friday", "We need to schedule a meeting"
3. **Follow-up items**: "Let me know when you're available", "Get back to me on this"
4. **Project-related tasks**: Status updates, milestone requests, deliverables

## Email Data:
{emails_text}

## Analysis Guidelines:
- Look for action-oriented language (please, can you, need to, should)
- Identify deadlines and due dates
- Recognize meeting requests and scheduling needs
- Note project-related tasks and updates
- Consider sender importance and email priority
- Extract specific, actionable items

## Output Format:
Return a JSON array of action items with the following structure:
[
  {{
    "description": "Specific action item description",
    "priority": "urgent|high|medium|low",
    "sender": "email address of sender",
    "email_subject": "original email subject",
    "email_date": "ISO date string",
    "project_context": "related project if applicable",
    "notes": "additional context or notes"
  }}
]

## Priority Guidelines:
- urgent: Requires immediate attention, explicit deadlines
- high: Important sender, time-sensitive requests
- medium: Standard requests, follow-ups
- low: Optional tasks, nice-to-have items

Your Task:
Extract all actionable items from the emails and provide them in the specified JSON format.
"""
    
    return prompt

def parse_action_extraction_response(json_text: str) -> List[Dict[str, Any]]:
    """
    Parse action extraction response from LLM.
    
    Args:
        json_text: Raw JSON response from LLM
        
    Returns:
        List of action item dictionaries
    """
    try:
        # Extract JSON from response
        json_match = re.search(r'\[.*\]', json_text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'\{.*\}', json_text, re.DOTALL)
        
        if not json_match:
            raise ValueError("No JSON found in response")
        
        json_data = json_match.group(0)
        
        # Clean up markdown if present
        if json_data.startswith("```json"):
            json_data = json_data[7:]
        if json_data.endswith("```"):
            json_data = json_data[:-3]
        json_data = json_data.strip()
        
        # Parse JSON
        data = json.loads(json_data)
        
        # Ensure it's a list
        if isinstance(data, dict):
            data = [data]
        
        return data
        
    except (json.JSONDecodeError, ValueError) as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to parse action extraction response: {e}")
        return []

# ============================================================================
# Conversation Intelligence
# ============================================================================

def build_conversation_aware_email_prompt(conversations: Dict[str, List[Dict]]) -> str:
    """Build thread-aware email processing prompt for conversation intelligence."""
    
    conversation_summaries = []
    
    for thread_id, thread in conversations.items():
        if not thread:
            continue
            
        thread_context = _build_thread_context(thread)
        conversation_summaries.append(thread_context)
    
    prompt = f"""You are the Conversation Intelligence Engine for Echo, a planning system that treats email threads as ongoing dialogues rather than isolated messages.

## Your Mission
Analyze email conversations holistically, understanding the full context of each thread to extract actionable intelligence for daily planning.

## Key Principles
1. **Thread Context Awareness**: Always consider the full conversation history, not individual emails
2. **Three-Category Extraction**: Classify extracted items into exactly three categories
3. **Conversation State Understanding**: Recognize dialogue patterns, urgency evolution, and resolution status

## Conversation Data:
{chr(10).join(conversation_summaries)}

## Extraction Categories

### 1. My Actions (things I need to do)
Extract as actionable inputs with this structure:
        {{
            "action": "What I need to do (specific task)",
            "context": "Why this matters in the conversation flow",
            "source": "Which specific email/person requested this",
            "urgency": "immediate|today|this_week|low",
            "estimated_time": "time estimate in minutes",
            "thread_id": "{thread_id}"
        }}

### 2. My Commitments (promises I've made)
Extract commitments I've made to others:
        {{
            "commitment": "What I committed to do/deliver",
            "recipient": "Who I made this commitment to",
            "context": "Why this commitment matters",
            "status": "pending|in_progress|overdue",
            "thread_id": "{thread_id}"
        }}

### 3. My Requests (things I've asked others to do)
Extract things I'm waiting for from others:
        {{
            "request": "What I asked someone else to do",
            "person": "Who I'm waiting for a response/action from",
            "context": "Why this request matters",
            "status": "pending|overdue|urgent",
            "thread_id": "{thread_id}"
        }}

## Analysis Focus Areas:
- **My Commitments**: Promises you've made in writing to others  
- **My Requests**: Things you've asked others to do, creating dependencies
- **Thread Priority**: Based on conversation dynamics, not just individual email importance
- **Context**: Always explain WHY something matters in the conversation flow
- **Strategic Intelligence**: Look for patterns, escalations, and optimization opportunities

Return JSON with: my_actions, my_commitments, my_requests, stalled_conversations, strategic_insights, recommended_actions.
"""
    
    return prompt

def parse_conversation_aware_response(llm_response: str) -> Dict:
    """Parse conversation intelligence response."""
    try:
        # Try to extract JSON from the response
        json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
        if json_match:
            json_text = json_match.group(0)
            
            # Clean up markdown if present
            if json_text.startswith("```json"):
                json_text = json_text[7:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
            
            result = json.loads(json_text.strip())
            
            # Ensure required fields exist
            required_fields = ["my_actions", "my_commitments", "my_requests", "stalled_conversations", "strategic_insights", "recommended_actions"]
            for field in required_fields:
                if field not in result:
                    result[field] = []
                    
            return result
        else:
            raise ValueError("No JSON found in response")
            
    except (json.JSONDecodeError, ValueError) as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to parse conversation intelligence response: {e}")
        return {
            "my_actions": [],
            "my_commitments": [],
            "my_requests": [],
            "stalled_conversations": [],
            "strategic_insights": [],
            "recommended_actions": []
        }

# ============================================================================
# Utility Functions
# ============================================================================

def _build_thread_context(thread: List[Dict]) -> str:
    """Build contextual summary of an email thread for LLM processing."""
    if not thread:
        return ""
    
    # Get basic thread info
    subject = thread[0].get('subject', 'No Subject')
    thread_length = len(thread)
    
    # Extract participants
    participants = set()
    
    for email in thread:
        if email.get('from'):
            participants.add(email['from']['emailAddress']['address'])
        if email.get('toRecipients'):
            participants.update([r['emailAddress']['address'] for r in email['toRecipients']])
    
    # Build conversation flow
    thread_flow = []
    for i, email in enumerate(thread):
        sender = email.get('from', {}).get('emailAddress', {}).get('address', 'Unknown')
        received_time = email.get('receivedDateTime', '')[:10]  # Just the date
        body_preview = email.get('bodyPreview', '')[:200] + ('...' if len(email.get('bodyPreview', '')) > 200 else '')
        
        thread_flow.append(f"  {i+1}. {sender} ({received_time}): {body_preview}")
    
    conversation_flow = '\n'.join(thread_flow)
    
    return f"""
## Thread: {subject}
**Participants**: {', '.join(participants)}
**Messages**: {thread_length}

**Conversation Flow**:
{conversation_flow}
"""

def _extract_section(text: str, section_header: str) -> str:
    """Extract a specific section from the briefing text."""
    lines = text.split('\n')
    section_lines = []
    in_section = False
    
    for line in lines:
        if section_header in line:
            in_section = True
            continue
        elif in_section and line.startswith('###'):
            break
        elif in_section:
            section_lines.append(line)
    
    return '\n'.join(section_lines).strip()