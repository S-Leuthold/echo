#!/usr/bin/env python3
"""
Interactive test interface for the Academic Domain Detector and Adaptive Coaching System.

This script provides a simple CLI interface to test the academic domain detection
and conversation flow without needing the full web interface.
"""

import sys
import os
from typing import List

# Add the echo directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from echo.academic_domain_detector import AcademicDomainDetector
from echo.models import ConversationMessage
from datetime import datetime
import json


class AcademicCoachingTester:
    """Simple CLI tester for academic coaching system."""
    
    def __init__(self):
        self.detector = AcademicDomainDetector()
        self.messages: List[ConversationMessage] = []
        self.uploaded_files: List[str] = []
    
    def display_welcome(self):
        """Display welcome message."""
        print("\n" + "="*60)
        print("🎓 ACADEMIC ADAPTIVE COACHING SYSTEM - TEST INTERFACE")
        print("="*60)
        print("\nWelcome! This system can help with:")
        print("📊 Research & Data Analysis")
        print("💻 Scientific Software Development (R packages, Python tools)")
        print("💰 Grant Writing & Funding Applications")
        print("📝 Academic Writing & Publishing")
        print("📈 Data Science & Statistical Analysis")
        print("🔧 General Project Guidance")
        print("\nCommands:")
        print("  /files <file1> <file2> ... - Add files to context")
        print("  /domain - Show current domain detection")
        print("  /clear - Clear conversation")
        print("  /quit - Exit")
        print("  /help - Show this help")
        print("\n" + "-"*60)
    
    def add_message(self, role: str, content: str):
        """Add a message to the conversation."""
        message = ConversationMessage(
            role=role,
            content=content,
            timestamp=datetime.now().isoformat() + "Z"
        )
        self.messages.append(message)
    
    def detect_current_domain(self):
        """Detect and display current domain."""
        if not self.messages:
            print("💡 No messages yet - start describing your project!")
            return None
            
        detection = self.detector.detect_domain(
            messages=self.messages,
            uploaded_files=self.uploaded_files
        )
        
        print(f"\n🎯 DOMAIN DETECTION RESULTS")
        print(f"   Primary Domain: {self.detector.get_domain_description(detection.domain)}")
        print(f"   Confidence: {detection.confidence:.1%}")
        print(f"   Reasoning: {detection.reasoning}")
        
        if detection.alternative_domains:
            print(f"\n   Alternative Domains:")
            for domain, conf in detection.alternative_domains:
                desc = self.detector.get_domain_description(domain)
                print(f"   • {desc}: {conf:.1%}")
        
        return detection
    
    def add_files(self, files: List[str]):
        """Add files to the context."""
        self.uploaded_files.extend(files)
        print(f"📁 Added {len(files)} files: {', '.join(files)}")
    
    def clear_conversation(self):
        """Clear the conversation."""
        self.messages.clear()
        self.uploaded_files.clear()
        print("🔄 Conversation cleared!")
    
    def show_conversation_summary(self):
        """Show conversation summary."""
        if not self.messages:
            return
            
        print(f"\n📝 CONVERSATION SUMMARY ({len(self.messages)} messages)")
        for i, msg in enumerate(self.messages[-3:], 1):  # Show last 3 messages
            role_icon = "🤖" if msg.role == "assistant" else "👤"
            content_preview = msg.content[:60] + "..." if len(msg.content) > 60 else msg.content
            print(f"   {role_icon} {msg.role}: {content_preview}")
        
        if self.uploaded_files:
            print(f"📁 Files: {', '.join(self.uploaded_files)}")
    
    def run_interactive_session(self):
        """Run the interactive test session."""
        self.display_welcome()
        
        while True:
            try:
                # Show current status
                self.show_conversation_summary()
                
                # Get user input
                user_input = input("\n💬 You: ").strip()
                
                if not user_input:
                    continue
                
                # Handle commands
                if user_input.startswith('/'):
                    if user_input == '/quit':
                        print("👋 Goodbye!")
                        break
                    elif user_input == '/help':
                        self.display_welcome()
                        continue
                    elif user_input == '/clear':
                        self.clear_conversation()
                        continue
                    elif user_input == '/domain':
                        self.detect_current_domain()
                        continue
                    elif user_input.startswith('/files'):
                        files = user_input.split()[1:]  # Get files after /files
                        if files:
                            self.add_files(files)
                        else:
                            print("Usage: /files <file1> <file2> ...")
                        continue
                    else:
                        print("❌ Unknown command. Type /help for available commands.")
                        continue
                
                # Add user message
                self.add_message("user", user_input)
                
                # Detect domain and provide response
                detection = self.detect_current_domain()
                
                # Generate a simple coaching response based on domain
                coaching_response = self.generate_coaching_response(detection, user_input)
                self.add_message("assistant", coaching_response)
                
                print(f"\n🤖 Academic Coach: {coaching_response}")
                
            except KeyboardInterrupt:
                print("\n\n👋 Session interrupted. Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}")
                continue
    
    def generate_coaching_response(self, detection, user_input: str) -> str:
        """Generate a simple coaching response based on detected domain."""
        if not detection:
            return "I'd love to help! Could you tell me more about your project?"
        
        domain = detection.domain
        confidence = detection.confidence
        
        # Domain-specific responses
        responses = {
            "research_analysis": [
                "Great! I can help with research design and data analysis.",
                "What research methodology are you considering?",
                "Are you planning qualitative, quantitative, or mixed methods research?",
                "What's your research question or hypothesis?"
            ],
            "scientific_software": [
                "Excellent! I specialize in scientific software development.",
                "Are you building an R package or Python tool?", 
                "What functionality do you want to include?",
                "Have you considered testing and documentation strategies?"
            ],
            "grant_writing": [
                "Perfect! I can guide you through the grant writing process.",
                "Which funding agency are you targeting?",
                "What's your project's broader impact?",
                "Do you need help with specific aims or budget justification?"
            ],
            "academic_writing": [
                "I'd be happy to help with your academic writing!",
                "What type of publication are you working on?",
                "Are you at the planning, drafting, or revision stage?",
                "What's the main contribution of your work?"
            ],
            "data_science": [
                "Great! I can help with your data science project.",
                "What type of analysis are you planning?",
                "Do you have your data already, or do you need collection strategies?",
                "Are you interested in descriptive, predictive, or causal analysis?"
            ],
            "general_project": [
                "I'm here to help! Could you provide more details about your project?",
                "What are your main goals?",
                "What's the timeline you're working with?",
                "Are there any specific challenges you're facing?"
            ]
        }
        
        domain_responses = responses.get(domain, responses["general_project"])
        
        # Add confidence context
        if confidence > 0.8:
            confidence_text = f"Based on what you've described, this sounds like a {self.detector.get_domain_description(domain).lower()} project. "
        elif confidence > 0.6:
            confidence_text = f"This seems like it might be a {self.detector.get_domain_description(domain).lower()} project. "
        else:
            confidence_text = "I'm still learning about your project. "
        
        # Simple response selection based on conversation length
        response_idx = min(len(self.messages) // 2, len(domain_responses) - 1)
        domain_response = domain_responses[response_idx]
        
        return confidence_text + domain_response


def main():
    """Main entry point."""
    tester = AcademicCoachingTester()
    tester.run_interactive_session()


if __name__ == "__main__":
    main()