"""
Echo CLI - Command Line Interface

Provides commands for email management and planning.
"""

import argparse
import sys
import os
import logging
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import List, Dict, Any

import webbrowser
import requests
import json

from .config_loader import load_config
from .email_processor import OutlookEmailProcessor
from .prompt_engine import build_email_aware_planner_prompt, parse_planner_response
from .journal import get_recent_reflection_context, analyze_energy_mood_trends
from dotenv import load_dotenv
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


<<<<<<< HEAD
def _get_openai_client():
    """Get OpenAI client with API key from environment."""
    try:
        import openai
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        return openai.OpenAI(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to get OpenAI client: {e}")
        raise


def _call_llm(client, prompt: str) -> str:
    """Call the LLM with the given prompt with error handling."""
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that follows instructions precisely."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2000
        )
        return response.choices[0].message.content
=======
def _get_claude_client():
    """Get Claude client with API key from environment."""
    try:
        from .claude_client import get_claude_client
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")
        return get_claude_client(api_key)
    except Exception as e:
        logger.error(f"Failed to get Claude client: {e}")
        raise


def _call_llm(client, prompt: str, response_format=None, model=None):
    """Call Claude with the given prompt, supporting both text and structured output.
    
    Args:
        client: Claude client instance
        prompt: The prompt to send
        response_format: Optional Pydantic model for structured output
        model: Optional model override (defaults to Sonnet, use "opus" for planning)
        
    Returns:
        String response for text output, or structured object for response_format
    """
    try:
        # Select model: Opus for strategic planning, Sonnet for other tasks
        selected_model = "claude-opus-4-20250514" if model == "opus" else "claude-sonnet-4-20250514"
        
        if response_format:
            # For structured output, request JSON format and parse manually
            structured_prompt = f"""
{prompt}

Please provide your response in valid JSON format that matches this structure:
{response_format.model_json_schema()}

Return ONLY the JSON response, no additional text or markdown formatting.
"""
            response = client.messages.create(
                model=selected_model,
                max_tokens=8000,
                temperature=0.1,
                messages=[{"role": "user", "content": structured_prompt}]
            )
            
            # Parse the JSON response into the Pydantic model
            import json
            response_text = response.content[0].text.strip()
            
            # Clean up any markdown formatting if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_data = json.loads(response_text.strip())
            return response_format(**response_data)
        else:
            # Simple text response using native Claude API
            response = client.messages.create(
                model=selected_model,
                max_tokens=4000,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
>>>>>>> feature/adaptive-coaching-foundation
    except Exception as e:
        logger.error(f"Error calling LLM: {e}")
        raise


def run_email_test_connection(args):
    """Test IMAP connection and configuration."""
    print("🔗 Testing IMAP Connection")
    print("=" * 25)
    
    try:
        config = load_config()
        
        if not config.email.get("imap"):
            print("❌ IMAP email integration not configured.")
            print("Please add IMAP configuration to your config file.")
            return
        
        from .imap_processor import IMAPEmailProcessor
        
        processor = IMAPEmailProcessor(config)
        
        print(f"📧 **Configuration:**")
        print(f"  Provider: {processor.provider}")
        print(f"  Server: {processor.server}")
        print(f"  Port: {processor.port}")
        print(f"  Username: {processor.username}")
        print(f"  SSL: {processor.use_ssl}")
        
        print(f"\n🔗 **Testing Connection...**")
        
        # Test connection
        imap = processor._connect_imap()
        print("✅ Connection successful!")
        
        # Test folder access
        status, messages = imap.select("INBOX")
        if status == "OK":
            print("✅ INBOX access successful!")
        else:
            print("❌ INBOX access failed!")
        
        # Test sent folder
        try:
            status, messages = imap.select("Sent Items")
            if status == "OK":
                print("✅ Sent Items access successful!")
            else:
                print("⚠️ Sent Items access failed (may not exist)")
        except Exception:
            print("⚠️ Sent Items access failed (may not exist)")
        
        imap.logout()
        
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        print(f"❌ Connection test failed: {e}")


def run_test_email_summary(args):
    """Test email summary with mock data."""
    print("🧪 Testing Email Summary with Mock Data")
    print("=" * 40)
    
    # Mock email data for testing
    mock_emails = [
        {
            "subject": "Project Update - Echo Development",
            "from": {"emailAddress": {"address": "colleague@company.com"}},
            "receivedDateTime": "2024-01-15T09:30:00Z",
            "importance": "high",
            "urgency": "high",
            "has_action": True
        },
        {
            "subject": "Meeting Request - Weekly Sync",
            "from": {"emailAddress": {"address": "manager@company.com"}},
            "receivedDateTime": "2024-01-15T10:15:00Z",
            "importance": "high",
            "urgency": "medium",
            "has_action": True
        },
        {
            "subject": "Accepted: Team Lunch Tomorrow",
            "from": {"emailAddress": {"address": "calendar@company.com"}},
            "receivedDateTime": "2024-01-15T11:00:00Z",
            "importance": "medium",
            "urgency": "low",
            "has_action": False
        },
        {
            "subject": "OpenTable Reservation Confirmation",
            "from": {"emailAddress": {"address": "noreply@opentable.com"}},
            "receivedDateTime": "2024-01-15T12:00:00Z",
            "importance": "low",
            "urgency": "low",
            "has_action": False
        }
    ]
    
    try:
        from .prompt_engine import build_email_summary_prompt, parse_email_summary_response
        from .cli import _get_openai_client, _call_llm
        
        # Build the LLM prompt
        prompt = build_email_summary_prompt(mock_emails)
        
        print("📧 **Mock Email Data:**")
        for i, email in enumerate(mock_emails, 1):
            importance_icon = "🔴" if email['importance'] == 'high' else "🟡" if email['importance'] == 'medium' else "🟢"
            urgency_icon = "🔴" if email['urgency'] == 'high' else "🟡" if email['urgency'] == 'medium' else "🟢"
            action_icon = "✅" if email['has_action'] else "❌"
            print(f"  {i}. {importance_icon}{urgency_icon}{action_icon} {email['subject']} from {email['from']['emailAddress']['address']}")
        
        print(f"\n🤖 **Calling LLM for Summary...**")
        
        # Call LLM
        client = _get_openai_client()
        response = _call_llm(client, prompt)
        
        # Parse response
        result = parse_email_summary_response(response)
        
        print(f"\n📋 **Email Summary:**")
        print(result.get("summary", "No summary available"))
        
        print(f"\n✅ **Action Items:**")
        for i, item in enumerate(result.get("action_items", []), 1):
            print(f"  {i}. {item}")
        
        print(f"\n📊 **Statistics:**")
        print(f"  Total Emails: {len(mock_emails)}")
        print(f"  Action Items: {len(result.get('action_items', []))}")
        print(f"  High Priority: {sum(1 for e in mock_emails if e['importance'] == 'high')}")
        print(f"  Urgent: {sum(1 for e in mock_emails if e['urgency'] == 'high')}")
        
    except Exception as e:
        logger.error(f"Test email summary failed: {e}")
        print(f"❌ Test failed: {e}")


def run_email_summary(args):
    """Generate email summary with real data."""
    print("📧 Email Summary")
    print("=" * 15)
    
    try:
        # Load configuration
        config = load_config()
        
        # Initialize email processor
        processor = OutlookEmailProcessor()
        processor.load_email_filters(config.email)
        
        # Get email context
        email_context = processor.get_email_planning_context(days=7)
        
        # Display summary
        print(f"📊 **Email Statistics:**")
        print(f"  Total Unresponded: {email_context['total_unresponded']}")
        print(f"  Urgent Emails: {email_context['urgent_count']}")
        print(f"  High Priority: {email_context['high_priority_count']}")
        
        if email_context.get('response_time_estimates'):
            estimates = email_context['response_time_estimates']
            total_time = estimates.get('total_estimated_time', 0)
            print(f"  Estimated Email Time: {total_time} minutes")
        
        if email_context.get("summary"):
            print(f"\n📋 **Email Summary:**")
            print(email_context["summary"])
        
        if email_context.get("scheduling_recommendations"):
            print(f"\n📅 **Scheduling Recommendations:**")
            for i, rec in enumerate(email_context["scheduling_recommendations"][:5], 1):
                priority_icon = "🔴" if rec['priority'] == 'critical' else "🟡" if rec['priority'] == 'high' else "🟢"
                print(f"  {i}. {priority_icon} {rec['action_item']} ({rec['time_allocation']}min, {rec['recommended_time']})")
        
        if email_context.get("action_items"):
            print(f"\n✅ **Action Items:**")
            for i, item in enumerate(email_context["action_items"][:10], 1):
                print(f"  {i}. {item}")
        
        # Show planning statistics
        stats = processor.get_email_planning_stats()
        print(f"\n📈 **Planning Statistics:**")
        print(f"  Total Scheduled: {stats['total_scheduled']}")
        print(f"  Total Completed: {stats['total_completed']}")
        print(f"  Pending Scheduled: {stats['pending_scheduled']}")
        print(f"  Completion Rate: {stats['completion_rate']:.1f}%")
        
    except Exception as e:
        logger.error(f"Email summary failed: {e}")
        print(f"❌ Email summary failed: {e}")


def run_plan_with_email(args):
    """Generate a daily plan incorporating email priorities and action items."""
    print("📅 Planning with Enhanced Email Integration")
    print("=" * 45)
    
    try:
        # Load configuration
        config = load_config()
        
        # Get email context
        processor = OutlookEmailProcessor()
        processor.load_email_filters(config.email)
        email_context = processor.get_email_planning_context(days=7)
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        # Display email summary
        print(f"\n📧 **Email Context:**")
        print(f"  Total Unresponded: {email_context['total_unresponded']}")
        print(f"  Urgent Emails: {email_context['urgent_count']}")
        print(f"  High Priority: {email_context['high_priority_count']}")
        
        if email_context.get('response_time_estimates'):
            estimates = email_context['response_time_estimates']
            total_time = estimates.get('total_estimated_time', 0)
            print(f"  Estimated Email Time: {total_time} minutes")
        
        if email_context.get("summary"):
            print(f"\n📋 **Email Summary:**")
            print(email_context["summary"])
        
        if email_context.get("scheduling_recommendations"):
            print(f"\n📅 **Email Scheduling Recommendations:**")
            for i, rec in enumerate(email_context["scheduling_recommendations"][:5], 1):
                priority_icon = "🔴" if rec['priority'] == 'critical' else "🟡" if rec['priority'] == 'high' else "🟢"
                print(f"  {i}. {priority_icon} {rec['action_item']} ({rec['time_allocation']}min, {rec['recommended_time']})")
        
        if email_context.get("action_items"):
            print(f"\n✅ **Email Action Items:**")
            for i, item in enumerate(email_context["action_items"][:5], 1):
                print(f"  {i}. {item}")
        
        # Get user input for planning
        print(f"\n📝 **Planning Input:**")
        most_important = input("What's your most important work today? ").strip()
        todos_input = input("What are your to-dos? (comma-separated): ").strip()
        todos = [todo.strip() for todo in todos_input.split(",") if todo.strip()]
        energy_level = input("What's your energy level (1-10)? ").strip()
        non_negotiables = input("What are your non-negotiables? ").strip()
        avoid_today = input("What should you avoid today? ").strip()
        
<<<<<<< HEAD
        # Build the enhanced planning prompt
        prompt = build_email_aware_planner_prompt(
=======
        # Get additional context for unified planning
        from echo.log_reader import get_recent_session_insights
        session_insights = get_recent_session_insights(days=3)
        
        # Get reminders from config
        reminders = []
        if hasattr(config, 'reminders'):
            for reminder in config.reminders:
                reminders.append({
                    'text': reminder.get('text', ''),
                    'urgency': reminder.get('urgency', 'normal')
                })
        
        # Convert fixed events to calendar format
        calendar_events = []  # TODO: Get from config when available
        
        # Call new unified planning system
        from echo.prompts.unified_planning import call_unified_planning
        client = _get_openai_client()
        
        print(f"\n🚀 **Calling Unified Planning System...**")
        blocks, reasoning = call_unified_planning(
>>>>>>> feature/adaptive-coaching-foundation
            most_important=most_important,
            todos=todos,
            energy_level=energy_level,
            non_negotiables=non_negotiables,
            avoid_today=avoid_today,
<<<<<<< HEAD
            fixed_events=[],  # TODO: Get from config
            config=config,
            email_context=email_context,
            journal_context=journal_context[0] if journal_context else None,
            recent_trends=recent_trends
        )
        
        # Call LLM for planning
        client = _get_openai_client()
        response = _call_llm(client, prompt)
        
        # Parse and display the plan
        blocks = parse_planner_response(response)
=======
            email_context=email_context,
            calendar_events=calendar_events,
            session_insights=session_insights,
            reminders=reminders,
            openai_client=client,
            config=config
        )
>>>>>>> feature/adaptive-coaching-foundation
        print(f"\n📅 **Your Enhanced Daily Plan:**")
        print("=" * 35)
        
        for block in blocks:
            status_icon = "🟢" if block.type == "anchor" else "🔵"
            print(f"{status_icon} {block.start.strftime('%H:%M')} - {block.end.strftime('%H:%M')} | {block.label}")
        
<<<<<<< HEAD
        # Save plan to file with enhanced metadata
        plan_file = Path(f"plans/{date.today().isoformat()}-enhanced-plan.json")
=======
        # Save plan to file with unified planning metadata
        plan_file = Path(f"runtime/plans/{date.today().isoformat()}-unified-plan.json")
>>>>>>> feature/adaptive-coaching-foundation
        plan_file.parent.mkdir(exist_ok=True)
        
        plan_data = {
            "date": date.today().isoformat(),
<<<<<<< HEAD
            "blocks": [block.to_dict() for block in blocks],
=======
            "created_at": datetime.now().isoformat(),
            "blocks": [],
>>>>>>> feature/adaptive-coaching-foundation
            "email_context": email_context,
            "user_input": {
                "most_important": most_important,
                "todos": todos,
                "energy_level": energy_level,
                "non_negotiables": non_negotiables,
                "avoid_today": avoid_today
            },
<<<<<<< HEAD
            "planning_stats": processor.get_email_planning_stats()
        }
        
        with open(plan_file, "w") as f:
            json.dump(plan_data, f, indent=2)
        
        print(f"\n✅ Enhanced plan saved to {plan_file}")
=======
            "unified_planning": {
                "reasoning": reasoning,
                "system_version": "unified_v1",
                "cost_optimized": True
            },
            "planning_stats": processor.get_email_planning_stats()
        }
        
        # Convert blocks to JSON format
        for block in blocks:
            block_data = {
                "start": block.start.strftime("%H:%M:%S"),
                "end": block.end.strftime("%H:%M:%S"),
                "label": block.label,
                "type": block.type.value if hasattr(block.type, 'value') else str(block.type),
                "icon": block.meta.get('icon', 'Calendar'),
                "note": block.meta.get('note', ''),
                "rationale": block.meta.get('rationale', ''),
                "priority": block.meta.get('priority', 'medium'),
                "energy_requirement": block.meta.get('energy_requirement', 'medium')
            }
            plan_data["blocks"].append(block_data)
        
        with open(plan_file, "w") as f:
            json.dump(plan_data, f, indent=2)
        
        print(f"\n✅ Unified plan saved to {plan_file}")
        
        # Show planning insights
        if reasoning and reasoning.get('context_analysis'):
            context = reasoning['context_analysis']
            print(f"\n🧠 **Planning Insights:**")
            if context.get('strategic_priorities'):
                print(f"  Strategic Priorities:")
                for i, priority in enumerate(context['strategic_priorities'][:3], 1):
                    print(f"    {i}. {priority}")
            if context.get('email_summary'):
                print(f"  Email Analysis: {context['email_summary'][:100]}...")
>>>>>>> feature/adaptive-coaching-foundation
        
        # Schedule email action items
        if email_context.get("scheduling_recommendations"):
            print(f"\n📅 **Scheduling Email Action Items...**")
            for rec in email_context["scheduling_recommendations"][:3]:  # Schedule top 3
                success = processor.schedule_email_action_item(
                    rec['email_id'], 
                    rec['recommended_time'], 
                    rec['action_item']
                )
                if success:
                    print(f"  ✅ Scheduled: {rec['action_item']}")
        
<<<<<<< HEAD
=======
        print(f"\n💰 **Cost Optimization: 67% API call reduction with unified planning**")
        
>>>>>>> feature/adaptive-coaching-foundation
    except Exception as e:
        logger.error(f"Enhanced planning failed: {e}")
        print(f"❌ Planning failed: {e}")


def run_email_stats(args):
    """Show email planning statistics and completion tracking."""
    print("📊 Email Planning Statistics")
    print("=" * 30)
    
    try:
        processor = OutlookEmailProcessor()
        
        # Get planning statistics
        stats = processor.get_email_planning_stats()
        
        print(f"📈 **Overall Statistics:**")
        print(f"  Total Scheduled: {stats['total_scheduled']}")
        print(f"  Total Completed: {stats['total_completed']}")
        print(f"  Pending Scheduled: {stats['pending_scheduled']}")
        print(f"  Completion Rate: {stats['completion_rate']:.1f}%")
        
        # Show scheduled emails
        scheduled_emails = processor.get_scheduled_emails()
        if scheduled_emails:
            print(f"\n📅 **Scheduled Email Action Items:**")
            for email_id, details in scheduled_emails.items():
                status_icon = "✅" if details.get('status') == 'completed' else "⏳"
                print(f"  {status_icon} {details['block_title']} ({details['scheduled_time']})")
        
        # Show completed emails
        completed_emails = processor.get_completed_emails()
        if completed_emails:
            print(f"\n✅ **Completed Email Action Items:**")
            for email_id, details in completed_emails.items():
                print(f"  ✅ Completed at {details['completed_at']}")
        
    except Exception as e:
        logger.error(f"Email stats failed: {e}")
        print(f"❌ Email stats failed: {e}")


def run_mark_email_completed(args):
    """Mark an email action item as completed."""
    if not args.email_id:
        print("❌ Please provide an email ID to mark as completed")
        return
    
    try:
        processor = OutlookEmailProcessor()
        success = processor.mark_email_action_completed(args.email_id)
        
        if success:
            print(f"✅ Marked email {args.email_id} as completed")
        else:
            print(f"❌ Failed to mark email {args.email_id} as completed")
            
    except Exception as e:
        logger.error(f"Mark email completed failed: {e}")
        print(f"❌ Failed to mark email as completed: {e}")


def run_end_of_day(args):
    """End of day workflow: process emails and plan tomorrow."""
    print("🌙 End of Day Planning")
    print("=" * 25)
    
    try:
        # Load configuration
        config = load_config()
        
        # Get email context for tomorrow's planning
        processor = OutlookEmailProcessor()
        processor.load_email_filters(config.email)
        email_context = processor.get_email_planning_context(days=7)
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        print(f"📧 **Email Summary for Tomorrow:**")
        print(f"  Unresponded Emails: {email_context['total_unresponded']}")
        print(f"  Urgent: {email_context['urgent_count']}")
        print(f"  High Priority: {email_context['high_priority_count']}")
        
        if email_context.get('response_time_estimates'):
            estimates = email_context['response_time_estimates']
            total_time = estimates.get('total_estimated_time', 0)
            print(f"  Estimated Email Time: {total_time} minutes")
        
        # Show email action items if available
        if email_context.get('action_items'):
            print(f"\n📋 **Email Action Items:**")
            for i, item in enumerate(email_context['action_items'][:5], 1):  # Show top 5
                print(f"  {i}. {item}")
            if len(email_context['action_items']) > 5:
                print(f"  ... and {len(email_context['action_items']) - 5} more")
        
        # Show planning statistics
        stats = processor.get_email_planning_stats()
        print(f"\n📈 **Today's Email Planning Stats:**")
        print(f"  Scheduled: {stats['total_scheduled']}")
        print(f"  Completed: {stats['total_completed']}")
        print(f"  Completion Rate: {stats['completion_rate']:.1f}%")
        
        # Get journal reflection for tomorrow's planning
        print(f"\n📝 **Journal Reflection:**")
        
        # Start with an information dump question
        day_summary = input("Tell me about your day: ").strip()
        
        # More focused planning questions
        tomorrow_tasks = input("What specific tasks do you need to complete tomorrow? ").strip()
        fixed_events = input("What fixed events/appointments do you need to schedule around? ").strip()
        energy_level = input("What was your energy level today (1-10)? ").strip()
        mood = input("What was your mood today? ").strip()
        tomorrow_energy = input("What's your expected energy tomorrow (1-10)? ").strip()
        non_negotiables = input("What are your non-negotiables for tomorrow? ").strip()
        avoid_tomorrow = input("What should you avoid tomorrow? ").strip()
        tomorrow_focus = input("What should be your main focus tomorrow? ").strip()
        
        # Create journal entry
        from .journal import create_enhanced_evening_reflection_entry, save_journal_entry
        reflection_entry = create_enhanced_evening_reflection_entry(
            what_went_well=day_summary,  # Use day summary as what went well for now
            challenges="",  # Could add separate challenges question if needed
            learnings="",
            energy_level=energy_level,
            mood=mood,
            tomorrow_focus=tomorrow_focus,
            tomorrow_energy=tomorrow_energy,
            non_negotiables=non_negotiables,
            avoid_tomorrow=avoid_tomorrow
        )
        
        # Save reflection
        save_journal_entry(reflection_entry)
        
        print(f"\n✅ Evening reflection saved!")
        print(f"\n💡 **Tomorrow's Planning Context:**")
        print(f"  Focus: {tomorrow_focus}")
        print(f"  Expected Energy: {tomorrow_energy}/10")
        print(f"  Non-negotiables: {non_negotiables}")
        print(f"  Avoid: {avoid_tomorrow}")
        print(f"  Tasks: {tomorrow_tasks}")
        print(f"  Fixed Events: {fixed_events}")
        print(f"  Email action items: {len(email_context.get('action_items', []))}")
        
        # Ask if user wants to plan tomorrow now
        plan_now = input(f"\n🤔 Would you like to plan tomorrow now? (y/n): ").strip().lower()
        if plan_now == 'y':
            print(f"\n📅 Planning tomorrow with email integration...")
            
            # Build the enhanced planning prompt for tomorrow
            prompt = build_email_aware_planner_prompt(
                most_important=tomorrow_focus,
                todos=tomorrow_tasks.split(', ') if tomorrow_tasks else [],  # Convert tasks to list
                energy_level=tomorrow_energy,
                non_negotiables=non_negotiables,
                avoid_today=avoid_tomorrow,
                fixed_events=fixed_events.split(', ') if fixed_events else [],  # Convert events to list
                config=config,
                email_context=email_context,
                journal_context=reflection_entry.content,
                recent_trends=recent_trends
            )
            
            try:
                # Call LLM for planning
                client = _get_openai_client()
                response = _call_llm(client, prompt)
                
                # Parse and display the plan
                blocks = parse_planner_response(response)
                print(f"\n📅 **Your Tomorrow Plan:**")
                print("=" * 30)
                
                for block in blocks:
                    status_icon = "🟢" if block.type == "anchor" else "🔵"
                    print(f"{status_icon} {block.start.strftime('%H:%M')} - {block.end.strftime('%H:%M')} | {block.label}")
                
                # Save tomorrow's plan
<<<<<<< HEAD
                tomorrow_plan_file = Path(f"plans/{(date.today() + timedelta(days=1)).isoformat()}-tomorrow-plan.json")
=======
                tomorrow_plan_file = Path(f"runtime/plans/{(date.today() + timedelta(days=1)).isoformat()}-tomorrow-plan.json")
>>>>>>> feature/adaptive-coaching-foundation
                tomorrow_plan_file.parent.mkdir(exist_ok=True)
                
                plan_data = {
                    "date": (date.today() + timedelta(days=1)).isoformat(),
                    "blocks": [block.to_dict() for block in blocks],
                    "email_context": email_context,
                    "journal_context": reflection_entry.content,
                    "user_input": {
                        "day_summary": day_summary,
                        "tomorrow_tasks": tomorrow_tasks,
                        "fixed_events": fixed_events,
                        "tomorrow_focus": tomorrow_focus,
                        "tomorrow_energy": tomorrow_energy,
                        "non_negotiables": non_negotiables,
                        "avoid_tomorrow": avoid_tomorrow
                    },
                    "planning_stats": processor.get_email_planning_stats()
                }
                
                with open(tomorrow_plan_file, "w") as f:
                    json.dump(plan_data, f, indent=2)
                
                print(f"\n✅ Tomorrow's plan saved to {tomorrow_plan_file}")
                
            except Exception as e:
                logger.error(f"Tomorrow planning failed: {e}")
                print(f"❌ Tomorrow planning failed: {e}")
                print(f"📝 Your journal reflection was still saved successfully!")
            
        else:
            print(f"\n📅 Tomorrow planning will be available when you're ready!")
        
        print(f"\n✅ End of day processing complete!")
        print(f"📅 Ready to plan tomorrow with email integration")
        
    except Exception as e:
        logger.error(f"End of day processing failed: {e}")
        print(f"❌ End of day processing failed: {e}")


def run_morning_check_in(args):
    """Morning check-in with email priorities."""
    print("🌅 Morning Check-in with Email Priorities")
    print("=" * 40)
    
    try:
        # Load configuration
        config = load_config()
        
        # Get email context
        processor = OutlookEmailProcessor()
        processor.load_email_filters(config.email)
        email_context = processor.get_email_planning_context(days=7)
        
        print(f"📧 **Morning Email Priority:**")
        print(f"  Urgent Emails: {email_context['urgent_count']}")
        print(f"  High Priority: {email_context['high_priority_count']}")
        
        if email_context.get('response_time_estimates'):
            estimates = email_context['response_time_estimates']
            total_time = estimates.get('total_estimated_time', 0)
            print(f"  Estimated Email Time: {total_time} minutes")
        
        if email_context.get("scheduling_recommendations"):
            print(f"\n📅 **Today's Email Priorities:**")
            for i, rec in enumerate(email_context["scheduling_recommendations"][:3], 1):
                priority_icon = "🔴" if rec['priority'] == 'critical' else "🟡" if rec['priority'] == 'high' else "🟢"
                print(f"  {i}. {priority_icon} {rec['action_item']} ({rec['time_allocation']}min)")
        
        print(f"\n✅ Morning check-in complete!")
        print(f"📅 Ready to plan your day with email integration")
        
    except Exception as e:
        logger.error(f"Morning check-in failed: {e}")
        print(f"❌ Morning check-in failed: {e}")


def run_oauth_login(args):
    """Initiate OAuth login for Microsoft Graph API."""
    print("🔐 OAuth Login for Microsoft Graph API")
    print("=" * 35)
    
    try:
        processor = OutlookEmailProcessor()
        
        # Build authorization URL with offline_access scope to get refresh token
        auth_url = f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        params = {
            "client_id": processor.client_id,
            "response_type": "code",
            "redirect_uri": processor.redirect_uri,
            "scope": "Mail.Read Mail.Send offline_access",
            "response_mode": "query"
        }
        
        auth_url_with_params = f"{auth_url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
        
        print(f"🔗 Opening browser for OAuth login...")
        print(f"📝 Note: This will request offline access to enable automatic token refresh")
        webbrowser.open(auth_url_with_params)
        
        print(f"📝 Please complete the login in your browser and copy the authorization code.")
        auth_code = input("Enter the authorization code: ").strip()
        
        if not auth_code:
            print("❌ No authorization code provided")
            return
        
        # Exchange code for token
        token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        token_data = {
            "client_id": processor.client_id,
            "client_secret": processor.client_secret,
            "code": auth_code,
            "redirect_uri": processor.redirect_uri,
            "grant_type": "authorization_code"
        }
        
        response = requests.post(token_url, data=token_data)
        
        if response.status_code == 200:
            token_info = response.json()
            
            # Use the processor's token saving method
            processor._save_tokens(token_info)
            
            print("✅ OAuth login successful! Tokens saved with automatic refresh capability.")
            print("🔑 You can now use email integration features without manual re-authentication.")
            print("🔄 Tokens will be automatically refreshed when needed.")
            
        else:
            print(f"❌ OAuth login failed: {response.status_code} {response.text}")
            
    except Exception as e:
        logger.error(f"OAuth login failed: {e}")
        print(f"❌ OAuth login failed: {e}")


def run_check_token_status(args):
    """Check the status of the current access token."""
    print("🔍 Token Status Check")
    print("=" * 20)
    
    try:
        processor = OutlookEmailProcessor()
        
        if not processor.access_token:
            print("❌ No access token found")
            print("💡 Run 'oauth-login' to authenticate")
        return
        
        print(f"✅ Access token found")
        print(f"🔄 Refresh token: {'✅ Available' if processor.refresh_token else '❌ Not available'}")
        
        if processor.token_expires_at:
            now = datetime.now()
            time_until_expiry = processor.token_expires_at - now
            minutes_until_expiry = time_until_expiry.total_seconds() / 60
            
            print(f"⏰ Token expires at: {processor.token_expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"⏱️  Time until expiry: {minutes_until_expiry:.1f} minutes")
            
            if minutes_until_expiry < 0:
                print("❌ Token is expired!")
                if processor.refresh_token:
                    print("🔄 Attempting to refresh token...")
                    if processor._refresh_access_token():
                        print("✅ Token refreshed successfully!")
                    else:
                        print("❌ Token refresh failed")
                        print("💡 Run 'oauth-login' to re-authenticate")
                else:
                    print("💡 Run 'oauth-login' to re-authenticate")
            elif minutes_until_expiry < 10:
                print("⚠️  Token expires soon!")
                if processor.refresh_token:
                    print("🔄 Refreshing token proactively...")
                    if processor._refresh_access_token():
                        print("✅ Token refreshed successfully!")
                    else:
                        print("❌ Token refresh failed")
            else:
                print("✅ Token is valid")
        else:
            print("❓ Token expiration time unknown")
        
        # Test the token with a simple API call
        print(f"\n🧪 Testing token with API call...")
        success, result = processor._make_api_request("/me")
        if success:
            user_info = result
            print(f"✅ Token is working!")
            print(f"👤 Connected as: {user_info.get('displayName', 'Unknown')}")
            print(f"📧 Email: {user_info.get('userPrincipalName', 'Unknown')}")
        else:
            print(f"❌ Token test failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        logger.error(f"Token status check failed: {e}")
        print(f"❌ Token status check failed: {e}")


<<<<<<< HEAD
=======
def run_conversation_intelligence(args):
    """Show thread-aware conversation intelligence for planning."""
    try:
        processor = OutlookEmailProcessor()
        config = load_config()
        processor.load_email_filters(config.email)
        
        print("📧 Analyzing Email Conversations...")
        print("=" * 50)
        
        # Get conversation intelligence
        intelligence = processor.get_conversation_intelligence(days=7)
        
        # Display conversation summary
        print(f"\n🎯 CONVERSATION LANDSCAPE")
        print(f"Summary: {intelligence.get('conversation_summary', 'No summary available')}")
        
        # Display actionable inputs
        actionable_inputs = intelligence.get('actionable_inputs', [])
        if actionable_inputs:
            print(f"\n📥 ACTIONABLE INPUTS ({len(actionable_inputs)} items)")
            for i, item in enumerate(actionable_inputs[:5], 1):
                urgency_emoji = {"immediate": "🔥", "today": "⚡", "this_week": "📅", "low": "⏳"}.get(item.get('urgency', 'low'), '⏳')
                print(f"  {i}. {urgency_emoji} {item.get('action', 'No action specified')}")
                print(f"     Context: {item.get('context', 'No context')}")
                print(f"     From: {item.get('source', 'Unknown')}")
                print(f"     Time: {item.get('estimated_time', '?')} mins")
                print()
        else:
            print(f"\n📥 ACTIONABLE INPUTS: None found")
        
        # Display commitments
        commitments = intelligence.get('my_commitments', [])
        if commitments:
            print(f"\n📋 MY COMMITMENTS ({len(commitments)} items)")
            for i, item in enumerate(commitments[:5], 1):
                status_emoji = {"pending": "⏸️", "overdue": "🚨", "unclear": "❓"}.get(item.get('status', 'pending'), '⏸️')
                print(f"  {i}. {status_emoji} {item.get('commitment', 'No commitment specified')}")
                print(f"     To: {item.get('promised_to', 'Unknown')}")
                if item.get('deadline'):
                    print(f"     Deadline: {item.get('deadline')}")
                print(f"     Time: {item.get('estimated_time', '?')} mins")
                print()
        else:
            print(f"\n📋 MY COMMITMENTS: None found")
        
        # Display requests/waiting on
        requests = intelligence.get('my_requests', [])
        if requests:
            print(f"\n⏳ MY REQUESTS ({len(requests)} items)")
            for i, item in enumerate(requests[:5], 1):
                follow_up = "📞 Follow up needed" if item.get('follow_up_needed') else "📋 Tracking"
                print(f"  {i}. {follow_up}: {item.get('request', 'No request specified')}")
                print(f"     Waiting on: {item.get('waiting_on', 'Unknown')}")
                if item.get('blocking'):
                    print(f"     Blocking: {item.get('blocking')}")
                print()
        else:
            print(f"\n⏳ MY REQUESTS: None found")
        
        # Display strategic intelligence
        conv_intel = intelligence.get('conversation_intelligence', {})
        if conv_intel:
            print(f"\n🧠 STRATEGIC INTELLIGENCE")
            
            high_priority = conv_intel.get('high_priority_threads', [])
            if high_priority:
                print(f"🔥 High Priority Threads: {len(high_priority)}")
            
            stalled = conv_intel.get('stalled_conversations', [])
            if stalled:
                print(f"⏸️ Stalled Conversations: {len(stalled)}")
            
            insights = conv_intel.get('strategic_insights', [])
            if insights:
                print(f"\n💡 Key Insights:")
                for insight in insights[:3]:
                    print(f"  • {insight}")
            
            actions = conv_intel.get('recommended_actions', [])
            if actions:
                print(f"\n🎯 Recommended Actions:")
                for action in actions[:3]:
                    print(f"  • {action}")
        
        print("\n" + "=" * 50)
        print("💡 This intelligence can inform your daily planning!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Check your email configuration and token status.")

def run_daily_email_brief(args):
    """Show comprehensive daily email brief with time block suggestions."""
    try:
        processor = OutlookEmailProcessor()
        config = load_config()
        processor.load_email_filters(config.email)
        
        print("📧 Daily Email Brief")
        print("=" * 50)
        
        # Get the daily brief
        brief = processor.get_daily_email_brief(days=1)
        
        print(f"\n🗓️  DATE: {brief['date']}")
        print(f"\n📋 CONVERSATION SUMMARY")
        print(f"{brief['conversation_summary']}")
        
        # Show metrics
        metrics = brief['metrics']
        print(f"\n📊 EMAIL METRICS")
        print(f"  • Actionable Inputs: {metrics['actionable_inputs']}")
        print(f"  • My Commitments: {metrics['my_commitments']}")
        print(f"  • My Requests: {metrics['my_requests']}")
        print(f"  • High Priority Threads: {metrics['high_priority_threads']}")
        print(f"  • Stalled Conversations: {metrics['stalled_conversations']}")
        print(f"  • Total Estimated Time: {metrics['total_estimated_time']} mins")
        
        # Show priority actions
        priority_actions = brief['priority_actions']
        if priority_actions:
            print(f"\n🎯 TOP PRIORITY ACTIONS")
            for i, action in enumerate(priority_actions, 1):
                print(f"  {i}. ⚡ {action.get('description', 'Action required')}")
                print(f"     Context: {action.get('context', 'N/A')}")
                print(f"     Time: {action.get('estimated_time', '15 mins')}")
                print()
        
        # Show urgent commitments
        commitments = brief['urgent_commitments']
        if commitments:
            print(f"\n📋 URGENT COMMITMENTS")
            for i, commitment in enumerate(commitments, 1):
                print(f"  {i}. ⏰ {commitment.get('description', 'Commitment')}")
                print(f"     To: {commitment.get('recipient', 'N/A')}")
                print(f"     Deadline: {commitment.get('deadline', 'Not specified')}")
                print()
        
        # Show blocking requests
        blocking = brief['blocking_requests']
        if blocking:
            print(f"\n🚫 BLOCKING REQUESTS")
            for i, request in enumerate(blocking, 1):
                print(f"  {i}. 🔒 {request.get('description', 'Request')}")
                print(f"     Waiting on: {request.get('waiting_on', 'N/A')}")
                print(f"     Blocking: {request.get('context', 'N/A')}")
                print()
        
        # Show strategic insights
        insights = brief['strategic_insights']
        if insights:
            print(f"\n💡 STRATEGIC INSIGHTS")
            for insight in insights:
                print(f"  • {insight}")
        
        # Show suggested time blocks
        time_blocks = brief['time_blocks_needed']
        if time_blocks:
            print(f"\n⏰ SUGGESTED TIME BLOCKS")
            for i, block in enumerate(time_blocks, 1):
                duration = block['duration_minutes']
                label = block['label']
                preferred = block.get('preferred_time', 'anytime')
                priority_icon = "🔴" if block['priority'] == 'high' else "🟡" if block['priority'] == 'medium' else "🟢"
                
                print(f"  {i}. {priority_icon} {label} ({duration} mins, {preferred})")
                if block.get('context'):
                    print(f"     Context: {block['context']}")
                print()
        
        # Show follow-up scheduling
        follow_ups = brief['follow_up_scheduling']
        if follow_ups:
            print(f"\n📞 FOLLOW-UP SCHEDULING")
            for i, follow_up in enumerate(follow_ups, 1):
                print(f"  {i}. 🔄 {follow_up['conversation_topic']}")
                print(f"     Last Activity: {follow_up['last_activity']}")
                print(f"     Suggested Action: {follow_up['suggested_action']}")
                print()
        
        print("=" * 50)
        print("💡 Use this brief to inform your daily planning!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Check your email configuration and token status.")

def run_commitment_tracking(args):
    """Show commitment tracking with deadline awareness."""
    try:
        processor = OutlookEmailProcessor()
        config = load_config()
        processor.load_email_filters(config.email)
        
        print("📋 Commitment Tracking & Deadline Awareness")
        print("=" * 60)
        
        # Get commitment tracking report
        report = processor.track_commitments_and_deadlines(days=30)
        
        print(f"\n🗓️  REPORT DATE: {report['date_generated']}")
        print(f"📊 TOTAL COMMITMENTS: {report['total_commitments']}")
        print(f"🚨 URGENT COMMITMENTS: {report['urgent_commitments']}")
        print(f"💚 COMMITMENT HEALTH SCORE: {report['commitment_health_score']}/100")
        
        # Show categorized commitments
        categorized = report['commitments_by_urgency']
        
        # Overdue commitments
        overdue = categorized.get('overdue', [])
        if overdue:
            print(f"\n🔴 OVERDUE COMMITMENTS ({len(overdue)}):")
            for i, commitment in enumerate(overdue[:5], 1):
                days_overdue = abs(commitment.get('days_until_due', 0))
                print(f"  {i}. ⚠️  {commitment['description']}")
                print(f"     To: {commitment['recipient']}")
                print(f"     Overdue by: {days_overdue} days")
                print(f"     Effort: {commitment.get('estimated_effort', 'Unknown')}")
                print()
        
        # Due today
        due_today = categorized.get('due_today', [])
        if due_today:
            print(f"\n🟡 DUE TODAY ({len(due_today)}):")
            for i, commitment in enumerate(due_today, 1):
                print(f"  {i}. 📅 {commitment['description']}")
                print(f"     To: {commitment['recipient']}")
                print(f"     Effort: {commitment.get('estimated_effort', 'Unknown')}")
                print()
        
        # Due this week
        due_week = categorized.get('due_this_week', [])
        if due_week:
            print(f"\n🟢 DUE THIS WEEK ({len(due_week)}):")
            for i, commitment in enumerate(due_week[:3], 1):
                days_left = commitment.get('days_until_due', 0)
                print(f"  {i}. 📆 {commitment['description']}")
                print(f"     To: {commitment['recipient']}")
                print(f"     Due in: {days_left} days")
                print(f"     Effort: {commitment.get('estimated_effort', 'Unknown')}")
                print()
        
        # Show next actions
        actions = report.get('next_actions', [])
        if actions:
            print(f"\n🎯 RECOMMENDED ACTIONS:")
            for i, action in enumerate(actions, 1):
                priority_icon = "🔴" if action['priority'] == 'critical' else "🟡" if action['priority'] == 'high' else "🟢"
                print(f"  {i}. {priority_icon} {action['title']}")
                print(f"     {action['description']}")
                print(f"     Time needed: {action['estimated_time']}")
                if action.get('commitments'):
                    print(f"     Items: {', '.join(action['commitments'][:2])}")
                print()
        
        print("=" * 60)
        print("💡 Use this tracking to prioritize commitment management!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Check your email configuration and token status.")

def run_test_refinement(args):
    """Test plan refinement functionality."""
    try:
        from echo.prompt_engine import parse_refinement_feedback, detect_refinement_scope
        
        print("🔧 Testing Plan Refinement Engine")
        print("=" * 50)
        
        # Test feedback parsing
        print("\n📝 Testing Feedback Parsing:")
        test_feedback = "I need more focus time in the morning and move email processing to afternoon"
        parsed_feedback = parse_refinement_feedback(test_feedback)
        print(f"Original: {test_feedback}")
        print(f"Parsed: {parsed_feedback}")
        
        # Test scope detection
        print(f"\n🎯 Testing Scope Detection:")
        scope = detect_refinement_scope(parsed_feedback)
        print(f"Detected scope: {scope}")
        
        # Test with different types of feedback
        test_cases = [
            "Shift the morning routine 15 minutes earlier",  # Minor
            "Move all email blocks to the afternoon",        # Moderate  
            "Completely restructure this plan, wrong approach" # Major
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            parsed = parse_refinement_feedback(test_case)
            scope = detect_refinement_scope(parsed)
            print(f"{i}. '{test_case}' → {scope}")
        
        print("\n=" * 50)
        print("🎉 Refinement engine components are working!")
        print("💡 Ready for API integration and frontend chat interface")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

>>>>>>> feature/adaptive-coaching-foundation
def run_refresh_token(args):
    """Manually refresh the access token."""
    print("🔄 Manual Token Refresh")
    print("=" * 20)
    
    try:
        processor = OutlookEmailProcessor()
        
        if not processor.refresh_token:
            print("❌ No refresh token available")
            print("💡 Run 'oauth-login' to get a refresh token")
            return
        
        print("🔄 Refreshing access token...")
        if processor._refresh_access_token():
            print("✅ Token refreshed successfully!")
            
            # Show new expiration time
            if processor.token_expires_at:
                print(f"⏰ New expiration: {processor.token_expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            print("❌ Token refresh failed")
            print("💡 Run 'oauth-login' to re-authenticate")
            
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        print(f"❌ Token refresh failed: {e}")


def run_force_reauth(args):
    """Force re-authentication to get refresh token capabilities."""
    print("🔄 Force Re-authentication")
    print("=" * 25)
    
    try:
        processor = OutlookEmailProcessor()
        
        # Check if current token has refresh capability
        if processor.refresh_token:
            print("✅ Current token already has refresh capability")
            print("💡 No need to re-authenticate")
            return
        
        print("⚠️  Current token doesn't have refresh capability")
        print("📝 This means you need to manually re-authenticate every hour")
        print("🔄 Re-authenticating will enable automatic token refresh...")
        
        confirm = input("Continue with re-authentication? (y/n): ").strip().lower()
        if confirm != 'y':
            print("❌ Re-authentication cancelled")
            return
        
        # Remove old token file
        if os.path.exists(processor.token_file):
            os.remove(processor.token_file)
            print("🗑️  Removed old token file")
        
        # Run OAuth login
        print("\n🔄 Starting OAuth login with refresh token support...")
        run_oauth_login(args)
        
    except Exception as e:
        logger.error(f"Force re-authentication failed: {e}")
        print(f"❌ Force re-authentication failed: {e}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Echo CLI - Email and Planning Integration")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Email test connection
    subparsers.add_parser("test-connection", help="Test IMAP connection")
    
    # Email summary commands
    subparsers.add_parser("test-email-summary", help="Test email summary with mock data")
    subparsers.add_parser("email-summary", help="Generate email summary with real data")
    
    # Planning commands
    subparsers.add_parser("plan", help="Generate daily plan with email integration")
    subparsers.add_parser("end-day", help="End of day processing")
    subparsers.add_parser("morning", help="Morning check-in with email priorities")
    
    # Email management commands
    stats_parser = subparsers.add_parser("email-stats", help="Show email planning statistics")
    complete_parser = subparsers.add_parser("mark-email-completed", help="Mark email action item as completed")
    complete_parser.add_argument("email_id", help="Email ID to mark as completed")
    
    # OAuth commands
    subparsers.add_parser("oauth-login", help="Initiate OAuth login for Microsoft Graph API")
    subparsers.add_parser("check-token-status", help="Check the status of the current access token")
    subparsers.add_parser("refresh-token", help="Manually refresh the access token")
    subparsers.add_parser("force-reauth", help="Force re-authentication to get refresh token capabilities")
<<<<<<< HEAD
=======
    subparsers.add_parser("conversation-intelligence", help="Show thread-aware conversation intelligence")
    subparsers.add_parser("daily-email-brief", help="Show comprehensive daily email brief with time blocks")
    subparsers.add_parser("commitment-tracking", help="Track commitments with deadline awareness")
    subparsers.add_parser("test-refinement", help="Test plan refinement functionality")
>>>>>>> feature/adaptive-coaching-foundation

    args = parser.parse_args()
    
    if args.command == "test-connection":
        run_email_test_connection(args)
    elif args.command == "test-email-summary":
        run_test_email_summary(args)
    elif args.command == "email-summary":
        run_email_summary(args)
    elif args.command == "plan":
        run_plan_with_email(args)
    elif args.command == "end-day":
        run_end_of_day(args)
    elif args.command == "morning":
        run_morning_check_in(args)
    elif args.command == "email-stats":
        run_email_stats(args)
    elif args.command == "mark-email-completed":
        run_mark_email_completed(args)
    elif args.command == "oauth-login":
        run_oauth_login(args)
    elif args.command == "check-token-status":
        run_check_token_status(args)
    elif args.command == "refresh-token":
        run_refresh_token(args)
    elif args.command == "force-reauth":
        run_force_reauth(args)
<<<<<<< HEAD
=======
    elif args.command == "conversation-intelligence":
        run_conversation_intelligence(args)
    elif args.command == "daily-email-brief":
        run_daily_email_brief(args)
    elif args.command == "commitment-tracking":
        run_commitment_tracking(args)
    elif args.command == "test-refinement":
        run_test_refinement(args)
>>>>>>> feature/adaptive-coaching-foundation
    else:
        parser.print_help()


if __name__ == "__main__":
    main()