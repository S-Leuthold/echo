# ==============================================================================
# FILE: echo/academic_domain_detector.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Academic-focused domain detection for the adaptive expert intelligence system.
#   Tailored specifically for academic and research work including data analysis,
#   scientific software development, grant writing, and academic writing.
#
# USAGE:
#   This module provides the AcademicDomainDetector service class that analyzes
#   conversation content to detect academic project domains for expert persona routing.
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
    METHODOLOGY = "methodology"
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


class AcademicDomainDetector:
    """
    Academic-focused domain detection service for adaptive expert intelligence.
    
    Analyzes conversation content using multiple signal types to determine
    the most likely academic project domain for expert persona routing.
    """
    
    def __init__(self):
        """Initialize the academic domain detector with signal configurations."""
        self.logger = logging.getLogger(__name__)
        self._load_academic_domain_signals()
    
    def _load_academic_domain_signals(self) -> None:
        """Load academic domain signal configurations."""
        
        # Research & Data Analysis Signals
        self.RESEARCH_SIGNALS = {
            'keywords': {
                'research': ['research_analysis'],
                'analysis': ['research_analysis', 'data_science'],
                'data': ['research_analysis', 'data_science'],
                'study': ['research_analysis'],
                'experiment': ['research_analysis'],
                'hypothesis': ['research_analysis'],
                'methodology': ['research_analysis'],
                'findings': ['research_analysis'],
                'results': ['research_analysis'],
                'statistical': ['research_analysis', 'data_science'],
                'statistics': ['research_analysis', 'data_science'],
                'survey': ['research_analysis'],
                'interview': ['research_analysis'],
                'qualitative': ['research_analysis'],
                'quantitative': ['research_analysis', 'data_science'],
                'correlation': ['research_analysis', 'data_science'],
                'regression': ['research_analysis', 'data_science'],
                'significance': ['research_analysis', 'data_science'],
                'p-value': ['research_analysis', 'data_science'],
                'sample': ['research_analysis'],
                'population': ['research_analysis'],
                'variable': ['research_analysis', 'data_science']
            },
            'methodologies': {
                'mixed methods': ['research_analysis'],
                'case study': ['research_analysis'],
                'grounded theory': ['research_analysis'],
                'ethnography': ['research_analysis'],
                'phenomenology': ['research_analysis'],
                'content analysis': ['research_analysis'],
                'thematic analysis': ['research_analysis'],
                'statistical analysis': ['research_analysis', 'data_science'],
                'meta-analysis': ['research_analysis'],
                'systematic review': ['research_analysis']
            }
        }
        
        # Scientific Software Development Signals
        self.SCIENTIFIC_SOFTWARE_SIGNALS = {
            'keywords': {
                'package': ['scientific_software'],
                'library': ['scientific_software'],
                'tool': ['scientific_software'],
                'software': ['scientific_software'],
                'code': ['scientific_software'],
                'programming': ['scientific_software'],
                'development': ['scientific_software'],
                'algorithm': ['scientific_software', 'data_science'],
                'function': ['scientific_software'],
                'module': ['scientific_software'],
                'api': ['scientific_software'],
                'documentation': ['scientific_software', 'academic_writing'],
                'testing': ['scientific_software'],
                'debugging': ['scientific_software'],
                'optimization': ['scientific_software'],
                'reproducible': ['scientific_software', 'research_analysis'],
                'computational': ['scientific_software', 'data_science']
            },
            'languages': {
                'r': ['scientific_software', 'data_science'],
                'python': ['scientific_software', 'data_science'],
                'julia': ['scientific_software', 'data_science'],
                'matlab': ['scientific_software', 'data_science'],
                'stata': ['data_science', 'research_analysis'],
                'sas': ['data_science', 'research_analysis'],
                'spss': ['data_science', 'research_analysis'],
                'sql': ['data_science'],
                'javascript': ['scientific_software'],
                'c++': ['scientific_software'],
                'fortran': ['scientific_software']
            },
            'frameworks': {
                'shiny': ['scientific_software'],
                'tidyverse': ['scientific_software', 'data_science'],
                'ggplot2': ['scientific_software', 'data_science'],
                'dplyr': ['scientific_software', 'data_science'],
                'pandas': ['scientific_software', 'data_science'],
                'numpy': ['scientific_software', 'data_science'],
                'scikit-learn': ['scientific_software', 'data_science'],
                'tensorflow': ['scientific_software', 'data_science'],
                'pytorch': ['scientific_software', 'data_science'],
                'jupyter': ['scientific_software', 'data_science'],
                'rmarkdown': ['scientific_software', 'academic_writing'],
                'quarto': ['scientific_software', 'academic_writing']
            },
            'tools': {
                'rstudio': ['scientific_software', 'data_science'],
                'git': ['scientific_software'],
                'github': ['scientific_software'],
                'docker': ['scientific_software'],
                'conda': ['scientific_software', 'data_science'],
                'devtools': ['scientific_software'],
                'testthat': ['scientific_software'],
                'roxygen2': ['scientific_software'],
                'pkgdown': ['scientific_software']
            }
        }
        
        # Grant Writing Signals
        self.GRANT_SIGNALS = {
            'keywords': {
                'grant': ['grant_writing'],
                'funding': ['grant_writing'],
                'proposal': ['grant_writing'],
                'budget': ['grant_writing'],
                'nsf': ['grant_writing'],
                'nih': ['grant_writing'],
                'foundation': ['grant_writing'],
                'award': ['grant_writing'],
                'application': ['grant_writing'],
                'submission': ['grant_writing'],
                'deadline': ['grant_writing'],
                'aims': ['grant_writing'],
                'objectives': ['grant_writing'],
                'impact': ['grant_writing'],
                'innovation': ['grant_writing'],
                'collaboration': ['grant_writing'],
                'partnership': ['grant_writing'],
                'timeline': ['grant_writing'],
                'deliverables': ['grant_writing'],
                'outcomes': ['grant_writing'],
                'evaluation': ['grant_writing'],
                'sustainability': ['grant_writing']
            },
            'phrases': {
                'specific aims': ['grant_writing'],
                'research plan': ['grant_writing'],
                'budget justification': ['grant_writing'],
                'project narrative': ['grant_writing'],
                'literature review': ['grant_writing', 'academic_writing'],
                'preliminary data': ['grant_writing'],
                'research design': ['grant_writing', 'research_analysis'],
                'broader impacts': ['grant_writing'],
                'intellectual merit': ['grant_writing'],
                'project timeline': ['grant_writing'],
                'evaluation plan': ['grant_writing']
            }
        }
        
        # Academic Writing Signals
        self.ACADEMIC_WRITING_SIGNALS = {
            'keywords': {
                'paper': ['academic_writing'],
                'manuscript': ['academic_writing'],
                'article': ['academic_writing'],
                'publication': ['academic_writing'],
                'journal': ['academic_writing'],
                'abstract': ['academic_writing'],
                'introduction': ['academic_writing'],
                'methods': ['academic_writing', 'research_analysis'],
                'results': ['academic_writing', 'research_analysis'],
                'discussion': ['academic_writing'],
                'conclusion': ['academic_writing'],
                'references': ['academic_writing'],
                'bibliography': ['academic_writing'],
                'citation': ['academic_writing'],
                'peer review': ['academic_writing'],
                'revision': ['academic_writing'],
                'submission': ['academic_writing'],
                'conference': ['academic_writing'],
                'presentation': ['academic_writing'],
                'poster': ['academic_writing'],
                'thesis': ['academic_writing'],
                'dissertation': ['academic_writing']
            },
            'phrases': {
                'literature review': ['academic_writing', 'research_analysis'],
                'systematic review': ['academic_writing', 'research_analysis'],
                'meta-analysis': ['academic_writing', 'research_analysis'],
                'peer review': ['academic_writing'],
                'journal submission': ['academic_writing'],
                'conference paper': ['academic_writing'],
                'book chapter': ['academic_writing'],
                'research proposal': ['academic_writing', 'grant_writing'],
                'academic writing': ['academic_writing']
            },
            'tools': {
                'latex': ['academic_writing'],
                'overleaf': ['academic_writing'],
                'word': ['academic_writing'],
                'mendeley': ['academic_writing'],
                'zotero': ['academic_writing'],
                'endnote': ['academic_writing'],
                'reference manager': ['academic_writing'],
                'grammarly': ['academic_writing'],
                'scrivener': ['academic_writing']
            }
        }
        
        # Data Science & Statistics Signals
        self.DATA_SCIENCE_SIGNALS = {
            'keywords': {
                'data science': ['data_science'],
                'machine learning': ['data_science'],
                'ml': ['data_science'],
                'ai': ['data_science'],
                'modeling': ['data_science', 'research_analysis'],
                'prediction': ['data_science'],
                'classification': ['data_science'],
                'clustering': ['data_science'],
                'visualization': ['data_science'],
                'dashboard': ['data_science'],
                'analytics': ['data_science'],
                'insights': ['data_science'],
                'dataset': ['data_science', 'research_analysis'],
                'database': ['data_science'],
                'big data': ['data_science'],
                'neural network': ['data_science'],
                'deep learning': ['data_science'],
                'statistics': ['data_science', 'research_analysis'],
                'biostatistics': ['data_science', 'research_analysis'],
                'econometrics': ['data_science', 'research_analysis']
            },
            'methods': {
                'linear regression': ['data_science', 'research_analysis'],
                'logistic regression': ['data_science', 'research_analysis'],
                'random forest': ['data_science'],
                'neural networks': ['data_science'],
                'clustering analysis': ['data_science'],
                'time series': ['data_science', 'research_analysis'],
                'bayesian analysis': ['data_science', 'research_analysis'],
                'survival analysis': ['data_science', 'research_analysis'],
                'multilevel modeling': ['data_science', 'research_analysis']
            }
        }
        
        # File extension patterns for academic work
        self.ACADEMIC_FILE_PATTERNS = {
            # Programming & Analysis Files
            '.r': ['scientific_software', 'data_science'],
            '.rmd': ['scientific_software', 'academic_writing'],
            '.qmd': ['scientific_software', 'academic_writing'],
            '.py': ['scientific_software', 'data_science'],
            '.ipynb': ['scientific_software', 'data_science'],
            '.jl': ['scientific_software', 'data_science'],
            '.m': ['scientific_software', 'data_science'],  # MATLAB
            '.do': ['data_science', 'research_analysis'],  # Stata
            '.sas': ['data_science', 'research_analysis'],
            '.spv': ['data_science', 'research_analysis'],  # SPSS
            
            # Data Files
            '.csv': ['data_science', 'research_analysis'],
            '.tsv': ['data_science', 'research_analysis'],
            '.xlsx': ['data_science', 'research_analysis'],
            '.xls': ['data_science', 'research_analysis'],
            '.dta': ['data_science', 'research_analysis'],  # Stata data
            '.sav': ['data_science', 'research_analysis'],  # SPSS data
            '.rds': ['scientific_software', 'data_science'],  # R data
            '.rdata': ['scientific_software', 'data_science'],  # R workspace
            '.pkl': ['scientific_software', 'data_science'],  # Python pickle
            '.hdf5': ['scientific_software', 'data_science'],  # HDF5 data
            '.parquet': ['data_science', 'research_analysis'],  # Parquet data
            
            # Document Files
            '.docx': ['academic_writing', 'grant_writing'],
            '.doc': ['academic_writing', 'grant_writing'],
            '.odt': ['academic_writing', 'grant_writing'],  # OpenDocument Text
            '.rtf': ['academic_writing', 'grant_writing'],  # Rich Text Format
            '.pages': ['academic_writing', 'grant_writing'],  # Apple Pages
            
            # Academic Writing Files
            '.tex': ['academic_writing'],
            '.latex': ['academic_writing'],
            '.bib': ['academic_writing'],
            '.cls': ['academic_writing'],  # LaTeX class files
            '.sty': ['academic_writing'],  # LaTeX style files
            '.bst': ['academic_writing'],  # BibTeX style files
            
            # Presentation Files
            '.pptx': ['academic_writing', 'grant_writing', 'research_analysis'],
            '.ppt': ['academic_writing', 'grant_writing', 'research_analysis'],
            '.odp': ['academic_writing', 'grant_writing'],  # OpenDocument Presentation
            '.key': ['academic_writing', 'grant_writing'],  # Apple Keynote
            
            # PDF and Text Files
            '.pdf': ['academic_writing', 'research_analysis', 'grant_writing'],
            '.ps': ['academic_writing'],  # PostScript
            '.eps': ['academic_writing'],  # Encapsulated PostScript
            
            # Plain Text and Markup
            '.txt': ['research_analysis', 'academic_writing'],
            '.md': ['academic_writing', 'scientific_software'],
            '.markdown': ['academic_writing', 'scientific_software'],
            '.rst': ['academic_writing', 'scientific_software'],  # reStructuredText
            '.asciidoc': ['academic_writing', 'scientific_software'],
            
            # Configuration and Code Files
            '.json': ['scientific_software', 'data_science'],
            '.yaml': ['scientific_software'],
            '.yml': ['scientific_software'],
            '.toml': ['scientific_software'],
            '.ini': ['scientific_software'],
            '.cfg': ['scientific_software'],
            
            # Reference Management Files
            '.ris': ['academic_writing'],  # Reference Manager format
            '.enw': ['academic_writing'],  # EndNote format
            '.xml': ['academic_writing', 'data_science'],  # XML (can be references or data)
            
            # Survey and Form Files
            '.qsf': ['research_analysis'],  # Qualtrics survey format
            '.sps': ['research_analysis'],  # SPSS syntax
            '.ado': ['research_analysis'],  # Stata ado files
            
            # Image Files (for figures, diagrams)
            '.png': ['academic_writing', 'research_analysis'],
            '.jpg': ['academic_writing', 'research_analysis'],
            '.jpeg': ['academic_writing', 'research_analysis'],
            '.tiff': ['academic_writing', 'research_analysis'],
            '.svg': ['academic_writing', 'scientific_software'],
            '.eps': ['academic_writing'],  # Vector graphics for papers
            
            # Specialized Academic Formats
            '.cwl': ['scientific_software'],  # Common Workflow Language
            '.nf': ['scientific_software'],  # Nextflow
            '.wdl': ['scientific_software'],  # Workflow Description Language
        }
        
        # Domain confidence weights
        self.SIGNAL_WEIGHTS = {
            SignalType.KEYWORD: 1.0,
            SignalType.PHRASE: 1.5,
            SignalType.TECHNICAL_TERM: 2.0,
            SignalType.METHODOLOGY: 2.5,
            SignalType.FRAMEWORK: 2.5,
            SignalType.LANGUAGE: 2.0,
            SignalType.TOOL_MENTION: 1.8,
            SignalType.FILE_EXTENSION: 1.2
        }
    
    def detect_domain(self, messages: List[ConversationMessage], 
                     uploaded_files: List[str] = None,
                     context: Dict[str, Any] = None) -> DomainDetection:
        """
        Detect the most likely academic domain based on conversation content and context.
        
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
            signals.extend(self._detect_methodology_signals(combined_text))
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
                    signal_type.value: [s for s in signals if s.signal_type == signal_type]
                    for signal_type in SignalType
                }
            )
            
        except Exception as e:
            self.logger.error(f"Academic domain detection failed: {e}")
            return DomainDetection(
                domain="general_project",
                confidence=0.3,
                reasoning="Failed to analyze content - defaulting to general project domain"
            )
    
    def _extract_text_content(self, messages: List[ConversationMessage]) -> str:
        """Extract and combine text content from all messages."""
        return " ".join([msg.content.lower() for msg in messages if msg.content])
    
    def _detect_keyword_signals(self, text: str) -> List[DetectionSignal]:
        """Detect keyword-based signals in text."""
        signals = []
        
        # Check all academic domain signal sets
        signal_sets = [
            self.RESEARCH_SIGNALS.get('keywords', {}),
            self.SCIENTIFIC_SOFTWARE_SIGNALS.get('keywords', {}),
            self.GRANT_SIGNALS.get('keywords', {}),
            self.ACADEMIC_WRITING_SIGNALS.get('keywords', {}),
            self.DATA_SCIENCE_SIGNALS.get('keywords', {})
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
        
        # Check academic phrases
        phrase_sets = [
            self.GRANT_SIGNALS.get('phrases', {}),
            self.ACADEMIC_WRITING_SIGNALS.get('phrases', {})
        ]
        
        for phrase_set in phrase_sets:
            for phrase, domains in phrase_set.items():
                if phrase.lower() in text.lower():
                    signals.append(DetectionSignal(
                        signal_type=SignalType.PHRASE,
                        content=phrase,
                        confidence=0.8,
                        context=self._extract_context(text, phrase),
                        domains=domains,
                        metadata={}
                    ))
        
        return signals
    
    def _detect_methodology_signals(self, text: str) -> List[DetectionSignal]:
        """Detect research methodology signals."""
        signals = []
        
        methodology_sets = [
            self.RESEARCH_SIGNALS.get('methodologies', {}),
            self.DATA_SCIENCE_SIGNALS.get('methods', {})
        ]
        
        for methodology_set in methodology_sets:
            for methodology, domains in methodology_set.items():
                if methodology.lower() in text.lower():
                    signals.append(DetectionSignal(
                        signal_type=SignalType.METHODOLOGY,
                        content=methodology,
                        confidence=0.9,
                        context=self._extract_context(text, methodology),
                        domains=domains,
                        metadata={}
                    ))
        
        return signals
    
    def _detect_framework_signals(self, text: str) -> List[DetectionSignal]:
        """Detect framework and language signals."""
        signals = []
        
        framework_sets = [
            (self.SCIENTIFIC_SOFTWARE_SIGNALS.get('frameworks', {}), SignalType.FRAMEWORK),
            (self.SCIENTIFIC_SOFTWARE_SIGNALS.get('languages', {}), SignalType.LANGUAGE)
        ]
        
        for signal_set, signal_type in framework_sets:
            for framework, domains in signal_set.items():
                # Use word boundaries for more accurate matching
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
            self.SCIENTIFIC_SOFTWARE_SIGNALS.get('tools', {}),
            self.ACADEMIC_WRITING_SIGNALS.get('tools', {})
        ]
        
        for signal_set in tool_sets:
            for tool, domains in signal_set.items():
                # Use word boundaries for more accurate matching
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
            
            if extension and extension in self.ACADEMIC_FILE_PATTERNS:
                domains = self.ACADEMIC_FILE_PATTERNS[extension]
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
            return "general_project", 0.3
        
        primary_domain = max(domain_scores.keys(), key=lambda k: domain_scores[k])
        confidence = domain_scores[primary_domain]
        
        # Apply confidence thresholds
        if confidence < 0.3:
            return "general_project", 0.3
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
        
        if 'methodology' in signal_groups:
            reasoning_parts.append(f"Research methodologies detected: {', '.join(signal_groups['methodology'])}")
        
        if 'framework' in signal_groups:
            reasoning_parts.append(f"Academic frameworks/tools: {', '.join(signal_groups['framework'])}")
        
        if 'language' in signal_groups:
            reasoning_parts.append(f"Programming languages: {', '.join(signal_groups['language'])}")
        
        if 'keyword' in signal_groups:
            top_keywords = signal_groups['keyword'][:3]
            reasoning_parts.append(f"Key academic indicators: {', '.join(top_keywords)}")
        
        if 'phrase' in signal_groups:
            reasoning_parts.append(f"Academic phrases: {', '.join(signal_groups['phrase'])}")
        
        if 'tool_mention' in signal_groups:
            reasoning_parts.append(f"Academic tools mentioned: {', '.join(signal_groups['tool_mention'])}")
        
        if 'file_extension' in signal_groups:
            reasoning_parts.append(f"Academic file types: {', '.join(signal_groups['file_extension'])}")
        
        reasoning = ". ".join(reasoning_parts)
        
        # Add confidence context
        confidence_score = domain_scores.get(primary_domain, 0.0)
        if confidence_score > 0.8:
            reasoning += f". High confidence ({confidence_score:.1%}) based on multiple strong academic indicators."
        elif confidence_score > 0.6:
            reasoning += f". Moderate confidence ({confidence_score:.1%}) with clear academic domain signals."
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
        """Get list of all supported academic domains."""
        return [
            "research_analysis",
            "scientific_software", 
            "grant_writing",
            "academic_writing",
            "data_science",
            "general_project"
        ]
    
    def get_domain_description(self, domain: str) -> str:
        """Get human-readable description of an academic domain."""
        descriptions = {
            "research_analysis": "Research & Data Analysis",
            "scientific_software": "Scientific Software Development",
            "grant_writing": "Grant Writing & Funding Applications",
            "academic_writing": "Academic Writing & Publishing",
            "data_science": "Data Science & Statistical Analysis",
            "general_project": "General Project Guidance"
        }
        return descriptions.get(domain, domain.replace('_', ' ').title())


# ===== TESTING UTILITIES =====

if __name__ == "__main__":
    # Test academic domain detection
    print("=== Academic Domain Detector Test ===")
    
    detector = AcademicDomainDetector()
    
    # Test cases for academic work
    test_cases = [
        {
            'name': 'R Package Development',
            'messages': [
                ConversationMessage(
                    role="user",
                    content="I want to create an R package for statistical analysis with functions for regression modeling and data visualization using ggplot2",
                    timestamp="2025-01-25T10:00:00Z"
                )
            ],
            'files': ['DESCRIPTION', 'analysis.R', 'tests.R', 'README.md']
        },
        {
            'name': 'Grant Writing',
            'messages': [
                ConversationMessage(
                    role="user", 
                    content="I need help writing an NSF grant proposal with specific aims, budget justification, and research plan for a data science project",
                    timestamp="2025-01-25T10:00:00Z"
                )
            ],
            'files': ['proposal.docx', 'budget.xlsx', 'references.bib']
        },
        {
            'name': 'Academic Paper',
            'messages': [
                ConversationMessage(
                    role="user",
                    content="I'm writing a journal manuscript about machine learning methods, need help with literature review and results section",
                    timestamp="2025-01-25T10:00:00Z"
                )
            ],
            'files': ['manuscript.tex', 'references.bib', 'analysis.py']
        },
        {
            'name': 'Data Analysis Project',
            'messages': [
                ConversationMessage(
                    role="user",
                    content="I have survey data that needs statistical analysis using R, including regression modeling and visualization",
                    timestamp="2025-01-25T10:00:00Z"
                )
            ],
            'files': ['survey_data.csv', 'analysis.Rmd', 'results.pdf']
        }
    ]
    
    for test_case in test_cases:
        print(f"\n--- Testing: {test_case['name']} ---")
        
        detection = detector.detect_domain(
            messages=test_case['messages'],
            uploaded_files=test_case['files']
        )
        
        print(f"Detected Domain: {detection.domain}")
        print(f"Description: {detector.get_domain_description(detection.domain)}")
        print(f"Confidence: {detection.confidence:.2%}")
        print(f"Reasoning: {detection.reasoning}")
        
        if detection.alternative_domains:
            print("Alternative domains:")
            for domain, conf in detection.alternative_domains:
                print(f"  - {detector.get_domain_description(domain)}: {conf:.2%}")
    
    print("\n✅ Academic domain detection test complete!")