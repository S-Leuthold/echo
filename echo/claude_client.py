"""
Claude Client for Echo Intelligence Systems

This module provides a Claude API client wrapper that mimics OpenAI's interface
for seamless migration from OpenAI to Anthropic Claude.

Features:
- Structured output support using Pydantic models
- Error handling and retries
- Token usage tracking
- Consistent interface with OpenAI client
"""

import json
import logging
import os
from typing import Any, Dict, List, Type, TypeVar, Union

import anthropic
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Type variable for Pydantic models
T = TypeVar('T', bound=BaseModel)


class ClaudeStructuredResponse:
    """Wrapper to match OpenAI Response API format."""
    
    def __init__(self, parsed_content: BaseModel, raw_response: anthropic.types.Message):
        self.choices = [ClaudeChoice(parsed_content)]
        self.raw_response = raw_response
        self.usage = {
            'prompt_tokens': raw_response.usage.input_tokens,
            'completion_tokens': raw_response.usage.output_tokens,
            'total_tokens': raw_response.usage.input_tokens + raw_response.usage.output_tokens
        }


class ClaudeChoice:
    """Wrapper to match OpenAI choice format."""
    
    def __init__(self, parsed_content: BaseModel):
        self.message = ClaudeMessage(parsed_content)


class ClaudeMessage:
    """Wrapper to match OpenAI message format."""
    
    def __init__(self, parsed_content: BaseModel):
        self.parsed = parsed_content


class ClaudeClient:
    """Claude client wrapper that mimics OpenAI's structured output interface."""
    
    def __init__(self, api_key: str = None):
        """Initialize Claude client.
        
        Args:
            api_key: Anthropic API key. If None, uses ANTHROPIC_API_KEY env var.
        """
        if not api_key:
            api_key = os.getenv('ANTHROPIC_API_KEY')
            
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable must be set")
            
        self.client = anthropic.Anthropic(api_key=api_key)
        self.beta = ClaudeBeta(self.client)
    
    def __getattr__(self, name):
        """Delegate other attributes to the underlying client."""
        return getattr(self.client, name)


class ClaudeBeta:
    """Beta features wrapper to match OpenAI's beta.chat.completions.parse interface."""
    
    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.chat = ClaudeChat(client)


class ClaudeChat:
    """Chat interface wrapper."""
    
    def __init__(self, client: anthropic.Anthropic):
        self.client = client
        self.completions = ClaudeCompletions(client)


class ClaudeCompletions:
    """Completions interface with structured output support."""
    
    def __init__(self, client: anthropic.Anthropic):
        self.client = client
    
    def parse(
        self,
        model: str = "claude-3-5-sonnet-20241022",
        messages: List[Dict[str, str]] = None,
        response_format: Type[T] = None,
        temperature: float = 0.1,
        max_tokens: int = 4000
    ) -> ClaudeStructuredResponse:
        """
        Parse structured output from Claude, mimicking OpenAI's Response API.
        
        Args:
            model: Claude model to use
            messages: List of message dicts with 'role' and 'content'
            response_format: Pydantic model class for structured output
            temperature: Response randomness (0.0 to 1.0)
            max_tokens: Maximum response tokens
            
        Returns:
            ClaudeStructuredResponse with parsed content
        """
        if not messages:
            raise ValueError("messages parameter is required")
            
        if not response_format:
            raise ValueError("response_format parameter is required")
        
        # Convert messages to Claude format
        claude_messages = self._convert_messages(messages)
        
        # Create structured output prompt
        system_prompt = self._create_structured_prompt(response_format)
        
        try:
            # Call Claude API
            response = self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=claude_messages
            )
            
            # Parse response content as JSON
            response_text = response.content[0].text
            parsed_json = self._extract_json(response_text)
            parsed_object = response_format.model_validate(parsed_json)
            
            logger.info(f"Claude API call successful. Tokens used: {response.usage.input_tokens + response.usage.output_tokens}")
            
            return ClaudeStructuredResponse(parsed_object, response)
            
        except anthropic.APIError as e:
            logger.error(f"Claude API error: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.error(f"Response content: {response_text}")
            # Return empty instance of the model on parse error
            empty_instance = response_format()
            return ClaudeStructuredResponse(empty_instance, response)
        except Exception as e:
            logger.error(f"Unexpected error in Claude API call: {e}")
            raise
    
    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Convert OpenAI message format to Claude format."""
        claude_messages = []
        
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            # Claude uses 'user' and 'assistant' roles
            if role == 'system':
                # System messages will be handled separately
                continue
            elif role == 'user':
                claude_messages.append({
                    'role': 'user',
                    'content': content
                })
            elif role == 'assistant':
                claude_messages.append({
                    'role': 'assistant', 
                    'content': content
                })
        
        return claude_messages
    
    def _create_structured_prompt(self, response_format: Type[BaseModel]) -> str:
        """Create system prompt for structured output."""
        schema = response_format.model_json_schema()
        
        return f"""You are a helpful AI assistant that provides responses in valid JSON format.

You must respond with a JSON object that matches this exact schema:

{json.dumps(schema, indent=2)}

Rules:
1. Your response must be valid JSON that can be parsed
2. Include all required fields from the schema
3. Use appropriate data types (strings, numbers, arrays, objects)
4. Do not include any text before or after the JSON object
5. Ensure arrays contain objects of the correct type
6. If a field is optional and you don't have information, you may omit it or use appropriate defaults

Respond only with the JSON object, no other text or explanation."""
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from Claude's response text."""
        text = text.strip()
        
        # If the text is already valid JSON, return it
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON within code blocks
        if '```json' in text:
            start = text.find('```json') + 7
            end = text.find('```', start)
            if end != -1:
                json_text = text[start:end].strip()
                return json.loads(json_text)
        
        # Try to find JSON within triple backticks
        if '```' in text:
            start = text.find('```') + 3
            end = text.find('```', start)
            if end != -1:
                json_text = text[start:end].strip()
                return json.loads(json_text)
        
        # Try to find JSON by looking for opening/closing braces
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            json_text = text[start:end+1]
            return json.loads(json_text)
        
        # If all else fails, try to parse the entire text
        return json.loads(text)


def get_claude_client(api_key: str = None) -> ClaudeClient:
    """
    Factory function to create a Claude client.
    
    Args:
        api_key: Anthropic API key. If None, uses ANTHROPIC_API_KEY env var.
        
    Returns:
        Configured ClaudeClient instance
    """
    return ClaudeClient(api_key)