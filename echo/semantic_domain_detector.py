# ==============================================================================
# FILE: echo/semantic_domain_detector.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Intelligent domain detection for the adaptive expert coaching system.
#   Uses multi-signal analysis to determine project domains and route users
#   to appropriate expert personas with high confidence scoring.
#
# USAGE:
#   This module provides the SemanticDomainDetector service class that analyzes
#   conversation content, file uploads, and context signals to detect project
#   domains for expert persona routing.
# ==============================================================================

import re
import json
from typing import Dict, List, Tuple, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum
import logging

from echo.models import DomainDetection, ConversationMessage


class SignalType(Enum):
    """Types of signals used for domain detection."""
    KEYWORD = "keyword"
    PHRASE = "phrase"
    FILE_EXTENSION = "file_extension"
    TECHNICAL_TERM = "technical_term"
    WORKFLOW = "workflow"
    TOOL_MENTION = "tool_mention"
    FRAMEWORK = "framework"
    LANGUAGE = "language"


@dataclass
class DetectionSignal:
    """A signal detected in conversation content."""
    signal_type: SignalType
    content: str
    confidence: float
    context: str
    domains: List[str]  # Domains this signal points to
    metadata: Dict[str, Any]


class SemanticDomainDetector:
    """
    Multi-signal domain detection service for adaptive expert coaching.
    
    Analyzes conversation content using multiple signal types to determine
    the most likely project domain for expert persona routing.
    """
    
    def __init__(self):
        """Initialize the domain detector with signal configurations."""
        self.logger = logging.getLogger(__name__)
        self._load_domain_signals()
    
    def _load_domain_signals(self) -> None:
        """Load domain signal configurations."""
        
        # Software Development Signals  
        self.SOFTWARE_SIGNALS = {
            'keywords': {
                'app': ['software_development', 'mobile_development'],
                'software': ['software_development'],
                'code': ['software_development'],
                'programming': ['software_development'],
                'backend': ['software_development'],
                'frontend': ['software_development'],
                'api': ['software_development'],
                'database': ['software_development', 'data_science'],
                'web': ['software_development'],
                'mobile': ['mobile_development'],
                'ios': ['mobile_development'],
                'android': ['mobile_development'],
                'website': ['software_development'],
                'platform': ['software_development'],
                'system': ['software_development'],
                'algorithm': ['software_development', 'data_science']
            },
            'frameworks': {
                'react': ['software_development'],
                'vue': ['software_development'],
                'angular': ['software_development'],
                'node': ['software_development'],
                'django': ['software_development'],
                'flask': ['software_development'],
                'rails': ['software_development'],
                'spring': ['software_development'],
                'laravel': ['software_development'],
                'express': ['software_development'],
                'next': ['software_development'],
                'nuxt': ['software_development']
            },
            'languages': {
                'python': ['software_development', 'data_science'],
                'javascript': ['software_development'],
                'typescript': ['software_development'],
                'java': ['software_development'],
                'c++': ['software_development'],
                'c#': ['software_development'],
                'php': ['software_development'],
                'ruby': ['software_development'],
                'go': ['software_development'],
                'rust': ['software_development'],
                'swift': ['mobile_development'],
                'kotlin': ['mobile_development'],
                'r': ['data_science'],
                'sql': ['software_development', 'data_science']
            },
            'tools': {
                'git': ['software_development'],
                'docker': ['software_development'],
                'kubernetes': ['software_development'],
                'jenkins': ['software_development'],
                'jira': ['software_development', 'business_strategy'],
                'figma': ['design'],
                'sketch': ['design'],
                'photoshop': ['design'],
                'illustrator': ['design']
            }
        }
        
        # Business Strategy Signals
        self.BUSINESS_SIGNALS = {
            'keywords': {
                'business': ['business_strategy'],
                'strategy': ['business_strategy'],
                'market': ['business_strategy', 'marketing'],
                'revenue': ['business_strategy'],
                'growth': ['business_strategy'],
                'startup': ['business_strategy'],
                'company': ['business_strategy'],
                'product': ['business_strategy', 'product_management'],
                'customer': ['business_strategy', 'marketing'],
                'sales': ['business_strategy', 'marketing'],
                'funding': ['business_strategy'],
                'investor': ['business_strategy'],
                'partnership': ['business_strategy'],
                'expansion': ['business_strategy'],
                'competitive': ['business_strategy'],
                'roi': ['business_strategy'],
                'kpi': ['business_strategy']
            },
            'phrases': {
                'business plan': ['business_strategy'],
                'market research': ['business_strategy', 'marketing'],
                'competitive analysis': ['business_strategy'],
                'revenue model': ['business_strategy'],
                'go-to-market': ['business_strategy', 'marketing'],
                'product-market fit': ['business_strategy', 'product_management'],
                'user acquisition': ['business_strategy', 'marketing'],
                'customer retention': ['business_strategy', 'marketing']
            }
        }
        
        # Data Science & Analytics Signals
        self.DATA_SIGNALS = {
            'keywords': {
                'data': ['data_science'],
                'analytics': ['data_science'],
                'machine learning': ['data_science'],
                'ml': ['data_science'],
                'ai': ['data_science'],
                'prediction': ['data_science'],
                'model': ['data_science'],
                'dataset': ['data_science'],
                'visualization': ['data_science'],
                'statistics': ['data_science'],
                'analysis': ['data_science'],
                'insights': ['data_science'],
                'dashboard': ['data_science'],
                'metrics': ['data_science', 'business_strategy'],
                'neural': ['data_science'],
                'deep learning': ['data_science'],
                'regression': ['data_science'],
                'classification': ['data_science']
            },
            'tools': {
                'pandas': ['data_science'],
                'numpy': ['data_science'],
                'scikit-learn': ['data_science'],
                'tensorflow': ['data_science'],
                'pytorch': ['data_science'],
                'jupyter': ['data_science'],
                'tableau': ['data_science'],
                'powerbi': ['data_science'],
                'excel': ['data_science', 'business_strategy'],
                'spark': ['data_science'],
                'hadoop': ['data_science']
            }
        }
        
        # Marketing & Content Signals
        self.MARKETING_SIGNALS = {
            'keywords': {
                'marketing': ['marketing'],
                'content': ['marketing'],
                'social media': ['marketing'],
                'seo': ['marketing'],
                'campaign': ['marketing'],
                'brand': ['marketing'],
                'advertising': ['marketing'],
                'promotion': ['marketing'],
                'engagement': ['marketing'],
                'audience': ['marketing'],
                'conversion': ['marketing'],
                'funnel': ['marketing'],
                'lead': ['marketing'],
                'email marketing': ['marketing'],
                'influencer': ['marketing']
            },
            'platforms': {
                'facebook': ['marketing'],
                'instagram': ['marketing'],
                'twitter': ['marketing'],
                'linkedin': ['marketing'],
                'youtube': ['marketing'],
                'tiktok': ['marketing'],
                'google ads': ['marketing'],
                'mailchimp': ['marketing'],
                'hubspot': ['marketing', 'business_strategy']
            }
        }
        
        # Design Signals
        self.DESIGN_SIGNALS = {
            'keywords': {
                'design': ['design'],
                'ui': ['design'],
                'ux': ['design'],
                'interface': ['design'],
                'prototype': ['design'],
                'wireframe': ['design'],
                'mockup': ['design'],
                'branding': ['design', 'marketing'],
                'logo': ['design'],
                'visual': ['design'],
                'typography': ['design'],
                'color': ['design'],
                'layout': ['design'],
                'user experience': ['design'],
                'user interface': ['design']
            },
            'tools': {
                'figma': ['design'],
                'sketch': ['design'],
                'adobe': ['design'],
                'photoshop': ['design'],
                'illustrator': ['design'],
                'indesign': ['design'],
                'canva': ['design']
            }
        }
        
        # File extension patterns
        self.FILE_PATTERNS = {
            '.py': ['software_development', 'data_science'],
            '.js': ['software_development'],
            '.ts': ['software_development'],
            '.java': ['software_development'],
            '.cpp': ['software_development'],
            '.c': ['software_development'],
            '.php': ['software_development'],
            '.rb': ['software_development'],
            '.go': ['software_development'],
            '.rs': ['software_development'],
            '.swift': ['mobile_development'],
            '.kt': ['mobile_development'],
            '.html': ['software_development'],
            '.css': ['software_development', 'design'],
            '.scss': ['software_development', 'design'],
            '.json': ['software_development', 'data_science'],
            '.sql': ['software_development', 'data_science'],
            '.csv': ['data_science', 'business_strategy'],
            '.xlsx': ['data_science', 'business_strategy'],
            '.psd': ['design'],
            '.ai': ['design'],
            '.sketch': ['design'],
            '.fig': ['design'],
            '.md': ['software_development'],
            '.ipynb': ['data_science'],
            '.r': ['data_science'],
            '.ppt': ['business_strategy', 'marketing'],
            '.pptx': ['business_strategy', 'marketing']
        }
        
        # Domain confidence weights
        self.SIGNAL_WEIGHTS = {
            SignalType.KEYWORD: 1.0,
            SignalType.PHRASE: 1.5,
            SignalType.TECHNICAL_TERM: 2.0,
            SignalType.FRAMEWORK: 2.5,
            SignalType.LANGUAGE: 2.0,
            SignalType.TOOL_MENTION: 1.8,
            SignalType.FILE_EXTENSION: 1.2,
            SignalType.WORKFLOW: 1.3
        }
    
    def detect_domain(self, messages: List[ConversationMessage], 
                     uploaded_files: List[str] = None,
                     context: Dict[str, Any] = None) -> DomainDetection:
        """
        Detect the most likely domain based on conversation content and context.
        
        Args:
            messages: List of conversation messages
            uploaded_files: List of uploaded file names/paths
            context: Additional context information
            
        Returns:
            DomainDetection: Domain detection results with confidence
        """
        try:
            # Combine all text content
            combined_text = self._extract_text_content(messages)
            
            # Detect signals from multiple sources
            signals = []
            signals.extend(self._detect_keyword_signals(combined_text))
            signals.extend(self._detect_phrase_signals(combined_text))
            signals.extend(self._detect_framework_signals(combined_text))
            signals.extend(self._detect_tool_signals(combined_text))
            
            if uploaded_files:
                signals.extend(self._detect_file_signals(uploaded_files))
            
            # Calculate domain scores
            domain_scores = self._calculate_domain_scores(signals)
            
            # Determine primary domain and alternatives
            primary_domain, confidence = self._select_primary_domain(domain_scores)
            alternatives = self._get_alternative_domains(domain_scores, primary_domain)
            
            # Generate reasoning
            reasoning = self._generate_reasoning(signals, primary_domain, domain_scores)
            
            return DomainDetection(
                domain=primary_domain,
                confidence=confidence,
                alternative_domains=alternatives,
                reasoning=reasoning,
                signals_detected={
                    signal_type.value: [
                        {
                            'content': s.content,
                            'confidence': s.confidence,
                            'context': s.context,
                            'domains': s.domains
                        }
                        for s in signals if s.signal_type == signal_type
                    ]
                    for signal_type in SignalType
                }
            )
            
        except Exception as e:
            self.logger.error(f"Domain detection failed: {e}")
            return DomainDetection(
                domain="general",
                confidence=0.3,
                reasoning="Failed to analyze content - defaulting to general domain"
            )
    
    def _extract_text_content(self, messages: List[ConversationMessage]) -> str:
        """Extract and combine text content from all messages."""
        return " ".join([msg.content.lower() for msg in messages if msg.content])
    
    def _detect_keyword_signals(self, text: str) -> List[DetectionSignal]:
        """Detect keyword-based signals in text."""
        signals = []
        
        # Check all domain signal sets
        signal_sets = [
            self.SOFTWARE_SIGNALS.get('keywords', {}),
            self.BUSINESS_SIGNALS.get('keywords', {}),
            self.DATA_SIGNALS.get('keywords', {}),
            self.MARKETING_SIGNALS.get('keywords', {}),
            self.DESIGN_SIGNALS.get('keywords', {})
        ]
        
        for signal_set in signal_sets:
            for keyword, domains in signal_set.items():
                # Use word boundaries for more accurate matching
                pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
                if re.search(pattern, text.lower()):
                    # Calculate confidence based on frequency and context
                    frequency = len(re.findall(pattern, text.lower()))
                    confidence = min(0.9, 0.4 + (frequency * 0.1))
                    
                    signals.append(DetectionSignal(
                        signal_type=SignalType.KEYWORD,
                        content=keyword,
                        confidence=confidence,
                        context=self._extract_context(text, keyword),
                        domains=domains,
                        metadata={'frequency': frequency}
                    ))
        
        return signals
    
    def _detect_phrase_signals(self, text: str) -> List[DetectionSignal]:
        """Detect phrase-based signals in text."""
        signals = []
        
        # Check business phrases
        for phrase, domains in self.BUSINESS_SIGNALS.get('phrases', {}).items():
            if phrase.lower() in text:
                signals.append(DetectionSignal(
                    signal_type=SignalType.PHRASE,
                    content=phrase,
                    confidence=0.8,
                    context=self._extract_context(text, phrase),
                    domains=domains,
                    metadata={}
                ))
        
        return signals
    
    def _detect_framework_signals(self, text: str) -> List[DetectionSignal]:
        """Detect framework and technology signals."""
        signals = []
        
        framework_sets = [
            (self.SOFTWARE_SIGNALS.get('frameworks', {}), SignalType.FRAMEWORK),
            (self.SOFTWARE_SIGNALS.get('languages', {}), SignalType.LANGUAGE)
        ]
        
        for signal_set, signal_type in framework_sets:
            for framework, domains in signal_set.items():
                # Use word boundaries for more accurate matching (case-insensitive)
                pattern = r'\b' + re.escape(framework.lower()) + r'\b'
                if re.search(pattern, text.lower()):
                    signals.append(DetectionSignal(
                        signal_type=signal_type,
                        content=framework,
                        confidence=0.9,
                        context=self._extract_context(text, framework),
                        domains=domains,
                        metadata={}
                    ))
        
        return signals
    
    def _detect_tool_signals(self, text: str) -> List[DetectionSignal]:
        """Detect tool and platform mentions."""
        signals = []
        
        tool_sets = [
            self.SOFTWARE_SIGNALS.get('tools', {}),
            self.DATA_SIGNALS.get('tools', {}),
            self.MARKETING_SIGNALS.get('platforms', {}),
            self.DESIGN_SIGNALS.get('tools', {})
        ]
        
        for signal_set in tool_sets:
            for tool, domains in signal_set.items():
                # Use word boundaries for more accurate matching (case-insensitive)
                pattern = r'\b' + re.escape(tool.lower()) + r'\b'
                if re.search(pattern, text.lower()):
                    signals.append(DetectionSignal(
                        signal_type=SignalType.TOOL_MENTION,
                        content=tool,
                        confidence=0.7,
                        context=self._extract_context(text, tool),
                        domains=domains,
                        metadata={}
                    ))
        
        return signals
    
    def _detect_file_signals(self, uploaded_files: List[str]) -> List[DetectionSignal]:
        """Detect domain signals from uploaded file extensions."""
        signals = []
        
        for file_path in uploaded_files:
            # Extract file extension
            extension = None
            if '.' in file_path:
                extension = '.' + file_path.split('.')[-1].lower()
            
            if extension and extension in self.FILE_PATTERNS:
                domains = self.FILE_PATTERNS[extension]
                signals.append(DetectionSignal(
                    signal_type=SignalType.FILE_EXTENSION,
                    content=extension,
                    confidence=0.6,
                    context=f"Uploaded file: {file_path}",
                    domains=domains,
                    metadata={'file_path': file_path}
                ))
        
        return signals
    
    def _calculate_domain_scores(self, signals: List[DetectionSignal]) -> Dict[str, float]:
        """Calculate weighted scores for each domain."""
        domain_scores = {}
        
        for signal in signals:
            weight = self.SIGNAL_WEIGHTS.get(signal.signal_type, 1.0)
            weighted_confidence = signal.confidence * weight
            
            for domain in signal.domains:
                if domain not in domain_scores:
                    domain_scores[domain] = 0.0
                domain_scores[domain] += weighted_confidence
        
        # Normalize scores
        if domain_scores:
            max_score = max(domain_scores.values())
            if max_score > 0:
                domain_scores = {k: v / max_score for k, v in domain_scores.items()}
        
        return domain_scores
    
    def _select_primary_domain(self, domain_scores: Dict[str, float]) -> Tuple[str, float]:
        """Select the primary domain with highest confidence."""
        if not domain_scores:
            return "general", 0.3
        
        primary_domain = max(domain_scores.keys(), key=lambda k: domain_scores[k])
        confidence = domain_scores[primary_domain]
        
        # Apply confidence thresholds
        if confidence < 0.3:
            return "general", 0.3
        elif confidence > 0.95:
            confidence = 0.95  # Cap confidence to leave room for uncertainty
        
        return primary_domain, confidence
    
    def _get_alternative_domains(self, domain_scores: Dict[str, float], 
                                primary_domain: str) -> List[Tuple[str, float]]:
        """Get alternative domains sorted by confidence."""
        alternatives = []
        
        for domain, score in domain_scores.items():
            if domain != primary_domain and score > 0.2:
                alternatives.append((domain, score))
        
        # Sort by confidence and return top 3
        alternatives.sort(key=lambda x: x[1], reverse=True)
        return alternatives[:3]
    
    def _generate_reasoning(self, signals: List[DetectionSignal], 
                           primary_domain: str, domain_scores: Dict[str, float]) -> str:
        """Generate human-readable reasoning for domain detection."""
        if not signals:
            return "No clear domain indicators found in the conversation."
        
        # Group signals by type
        signal_groups = {}
        for signal in signals:
            if primary_domain in signal.domains:
                signal_type = signal.signal_type.value
                if signal_type not in signal_groups:
                    signal_groups[signal_type] = []
                signal_groups[signal_type].append(signal.content)
        
        reasoning_parts = []
        
        if 'framework' in signal_groups:
            reasoning_parts.append(f"Detected frameworks/technologies: {', '.join(signal_groups['framework'])}")
        
        if 'language' in signal_groups:
            reasoning_parts.append(f"Programming languages mentioned: {', '.join(signal_groups['language'])}")
        
        if 'keyword' in signal_groups:
            top_keywords = signal_groups['keyword'][:3]
            reasoning_parts.append(f"Key domain indicators: {', '.join(top_keywords)}")
        
        if 'tool_mention' in signal_groups:
            reasoning_parts.append(f"Tools/platforms mentioned: {', '.join(signal_groups['tool_mention'])}")
        
        if 'file_extension' in signal_groups:
            reasoning_parts.append(f"File types uploaded: {', '.join(signal_groups['file_extension'])}")
        
        reasoning = ". ".join(reasoning_parts)
        
        # Add confidence context
        confidence_score = domain_scores.get(primary_domain, 0.0)
        if confidence_score > 0.8:
            reasoning += f". High confidence ({confidence_score:.1%}) based on multiple strong indicators."
        elif confidence_score > 0.6:
            reasoning += f". Moderate confidence ({confidence_score:.1%}) with clear domain signals."
        else:
            reasoning += f". Lower confidence ({confidence_score:.1%}) - may need more information."
        
        return reasoning
    
    def _extract_context(self, text: str, term: str, context_size: int = 50) -> str:
        """Extract context around a detected term."""
        term_lower = term.lower()
        text_lower = text.lower()
        
        index = text_lower.find(term_lower)
        if index == -1:
            return ""
        
        start = max(0, index - context_size)
        end = min(len(text), index + len(term) + context_size)
        
        context = text[start:end].strip()
        if start > 0:
            context = "..." + context
        if end < len(text):
            context = context + "..."
        
        return context
    
    def get_supported_domains(self) -> List[str]:
        """Get list of all supported domains."""
        return [
            "software_development",
            "mobile_development", 
            "data_science",
            "business_strategy",
            "marketing",
            "design",
            "product_management",
            "general"
        ]
    
    def get_domain_description(self, domain: str) -> str:
        """Get human-readable description of a domain."""
        descriptions = {
            "software_development": "Software Development & Engineering",
            "mobile_development": "Mobile App Development",
            "data_science": "Data Science & Analytics",
            "business_strategy": "Business Strategy & Operations",
            "marketing": "Marketing & Content Strategy",
            "design": "Design & User Experience",
            "product_management": "Product Management",
            "general": "General Project Guidance"
        }
        return descriptions.get(domain, domain.replace('_', ' ').title())


# ===== TESTING UTILITIES =====

if __name__ == "__main__":
    # Test domain detection
    print("=== Semantic Domain Detector Test ===")
    
    detector = SemanticDomainDetector()
    
    # Test cases
    test_cases = [
        {
            'name': 'Software Development',
            'messages': [
                ConversationMessage(
                    role="user",
                    content="I want to build a web application using React and Node.js with a PostgreSQL database",
                    timestamp="2025-01-25T10:00:00Z"
                )
            ],
            'files': ['app.js', 'package.json', 'schema.sql']
        },
        {
            'name': 'Data Science',
            'messages': [
                ConversationMessage(
                    role="user", 
                    content="I need to analyze customer data and build a machine learning model for predictions using Python and pandas",
                    timestamp="2025-01-25T10:00:00Z"
                )
            ],
            'files': ['data.csv', 'analysis.ipynb']
        },
        {
            'name': 'Business Strategy',
            'messages': [
                ConversationMessage(
                    role="user",
                    content="I'm working on a business plan for my startup, need help with market research and revenue model",
                    timestamp="2025-01-25T10:00:00Z"
                )
            ],
            'files': ['business_plan.pptx', 'financial_model.xlsx']
        },
        {
            'name': 'Design',
            'messages': [
                ConversationMessage(
                    role="user",
                    content="I need to design a mobile app interface with good UX, create wireframes and prototypes in Figma",
                    timestamp="2025-01-25T10:00:00Z"
                )
            ],
            'files': ['mockup.fig', 'style_guide.psd']
        }
    ]
    
    for test_case in test_cases:
        print(f"\n--- Testing: {test_case['name']} ---")
        
        detection = detector.detect_domain(
            messages=test_case['messages'],
            uploaded_files=test_case['files']
        )
        
        print(f"Detected Domain: {detection.domain}")
        print(f"Confidence: {detection.confidence:.2%}")
        print(f"Reasoning: {detection.reasoning}")
        
        if detection.alternative_domains:
            print("Alternative domains:")
            for domain, conf in detection.alternative_domains:
                print(f"  - {domain}: {conf:.2%}")
    
    print("\n✅ Domain detection test complete!")