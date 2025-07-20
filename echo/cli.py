"""
Echo CLI - Command Line Interface

Provides commands for email management.
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime, date
from typing import List, Dict, Any

from .config_loader import load_config


def run_email_test_connection(args):
    """Test IMAP connection and configuration."""
    print("🔗 Testing IMAP Connection")
    print("=" * 25)
    
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
    
    try:
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
        
        print(f"\n✅ **Connection Test Passed!**")
        print("Your IMAP configuration is working correctly.")
        
    except Exception as e:
        print(f"❌ **Connection Failed:** {e}")
        print("\n📋 **Troubleshooting Tips:**")
        print("1. Check your username and password")
        print("2. Verify the server and port settings")
        print("3. Ensure IMAP is enabled in your email account")
        print("4. Check if you need an app password")
        print("5. Verify SSL settings")


def run_email_summary(args):
    """Generate daily email summary."""
    print("📧 Daily Email Summary")
    print("=" * 20)
    
    config = load_config()
    
    if not config.email.get("imap"):
        print("❌ IMAP email integration not configured.")
        return
    
    from .imap_processor import IMAPEmailProcessor
    
    processor = IMAPEmailProcessor(config)
    
    print("📥 Fetching important emails from last 7 days...")
    emails = processor.get_important_emails(days=7)
    
    if not emails:
        print("📭 No important emails found.")
        return
    
    print(f"📧 Found {len(emails)} important emails.")
    
    actions = processor.load_actions()
    summary = processor.generate_daily_summary(emails, actions)
    
    print(f"\n📊 **Email Summary for {summary.date.strftime('%A, %B %d')}**")
    print("=" * 50)
    print(f"📧 Total Emails: {summary.total_emails}")
    print(f"🔥 Urgent: {summary.urgent_count}")
    print(f"✅ Action Items: {summary.action_items_count}")
    print(f"📅 Meetings: {summary.meetings_count}")
    print(f"📈 Updates: {summary.updates_count}")
    print(f"⏰ Deferred: {summary.deferred_count}")
    
    print(f"\n📊 **Response Status:**")
    print(f"  ✅ Responded: {summary.responded_count} emails")
    print(f"  ⏳ Pending Response: {summary.pending_response_count} emails")
    print(f"  📧 No Response Needed: {summary.no_response_needed_count} emails")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Echo - Email Management")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Email test connection
    email_test_parser = subparsers.add_parser("email_test_connection", help="Test IMAP connection and configuration.")
    email_test_parser.set_defaults(func=run_email_test_connection)
    
    # Email summary
    email_summary_parser = subparsers.add_parser("email_summary", help="Generate daily email summary.")
    email_summary_parser.set_defaults(func=run_email_summary)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    args.func(args)


if __name__ == "__main__":
    main()