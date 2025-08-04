# ==============================================================================
# FILE: tests/test_semantic_domain_detector.py  
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Unit tests for the SemanticDomainDetector class.
#   Tests multi-signal analysis, confidence scoring, and domain classification.
# ==============================================================================

import pytest
from echo.semantic_domain_detector import SemanticDomainDetector, DetectionSignal, SignalType
from echo.models import ConversationMessage, DomainDetection


class TestSemanticDomainDetector:
    """Test suite for SemanticDomainDetector."""
    
    @pytest.fixture
    def detector(self):
        """Create a detector instance for testing."""
        return SemanticDomainDetector()
    
    @pytest.fixture  
    def sample_messages(self):
        """Sample conversation messages for testing."""
        return [
            ConversationMessage(
                role="user",
                content="I want to build a web application using React",
                timestamp="2025-01-25T10:00:00Z"
            ),
            ConversationMessage(
                role="assistant", 
                content="Great! What kind of web application are you thinking about?",
                timestamp="2025-01-25T10:01:00Z"
            ),
            ConversationMessage(
                role="user",
                content="A task management app with Node.js backend and PostgreSQL database",
                timestamp="2025-01-25T10:02:00Z"
            )
        ]
    
    def test_detector_initialization(self, detector):
        """Test that detector initializes correctly."""
        assert detector is not None
        assert hasattr(detector, 'SOFTWARE_SIGNALS')
        assert hasattr(detector, 'BUSINESS_SIGNALS')
        assert hasattr(detector, 'DATA_SIGNALS')
        assert hasattr(detector, 'MARKETING_SIGNALS')
        assert hasattr(detector, 'DESIGN_SIGNALS')
    
    def test_extract_text_content(self, detector, sample_messages):
        """Test text content extraction from messages."""
        text = detector._extract_text_content(sample_messages)
        
        assert "react" in text.lower()
        assert "node.js" in text.lower()
        assert "postgresql" in text.lower()
        assert "task management" in text.lower()
    
    def test_detect_keyword_signals(self, detector):
        """Test keyword signal detection."""
        text = "I want to build a web app using React and Node.js"
        signals = detector._detect_keyword_signals(text)
        
        # Should detect web, app keywords
        signal_contents = [s.content for s in signals]
        assert any("web" in content for content in signal_contents)
        assert any("app" in content for content in signal_contents)
        
        # Check signal properties
        for signal in signals:
            assert signal.signal_type == SignalType.KEYWORD
            assert 0.0 < signal.confidence <= 1.0
            assert len(signal.domains) > 0
    
    def test_detect_framework_signals(self, detector):
        """Test framework and language signal detection."""
        text = "I'm using React with TypeScript and Python for backend"
        signals = detector._detect_framework_signals(text)
        
        signal_contents = [s.content for s in signals]
        assert "react" in signal_contents
        assert "typescript" in signal_contents
        assert "python" in signal_contents
        
        # Check that frameworks and languages are properly categorized
        framework_signals = [s for s in signals if s.signal_type == SignalType.FRAMEWORK]
        language_signals = [s for s in signals if s.signal_type == SignalType.LANGUAGE]
        
        assert len(framework_signals) > 0
        assert len(language_signals) > 0
    
    def test_detect_tool_signals(self, detector):
        """Test tool and platform signal detection."""
        text = "I use Docker, Git, and Figma for my development workflow"
        signals = detector._detect_tool_signals(text)
        
        signal_contents = [s.content for s in signals]
        assert "docker" in signal_contents
        assert "git" in signal_contents
        assert "figma" in signal_contents
        
        for signal in signals:
            assert signal.signal_type == SignalType.TOOL_MENTION
    
    def test_detect_file_signals(self, detector):
        """Test file extension signal detection."""
        files = ["app.py", "styles.css", "data.csv", "design.psd"]
        signals = detector._detect_file_signals(files)
        
        signal_contents = [s.content for s in signals]
        assert ".py" in signal_contents
        assert ".css" in signal_contents
        assert ".csv" in signal_contents
        assert ".psd" in signal_contents
        
        for signal in signals:
            assert signal.signal_type == SignalType.FILE_EXTENSION
    
    def test_calculate_domain_scores(self, detector):
        """Test domain score calculation."""
        signals = [
            DetectionSignal(
                signal_type=SignalType.KEYWORD,
                content="app",
                confidence=0.8,
                context="mobile app",
                domains=["software_development"],
                metadata={}
            ),
            DetectionSignal(
                signal_type=SignalType.FRAMEWORK,
                content="react",
                confidence=0.9,
                context="using react",
                domains=["software_development"],
                metadata={}
            )
        ]
        
        scores = detector._calculate_domain_scores(signals)
        
        assert "software_development" in scores
        assert scores["software_development"] > 0
        
        # Framework signals should have higher weight than keyword signals
        # So the score should reflect the weighted combination
    
    def test_select_primary_domain(self, detector):
        """Test primary domain selection."""
        domain_scores = {
            "software_development": 0.8,
            "data_science": 0.3,
            "business_strategy": 0.1
        }
        
        primary, confidence = detector._select_primary_domain(domain_scores)
        
        assert primary == "software_development"
        assert confidence == 0.8
    
    def test_select_primary_domain_empty(self, detector):
        """Test primary domain selection with empty scores."""
        domain_scores = {}
        
        primary, confidence = detector._select_primary_domain(domain_scores)
        
        assert primary == "general"
        assert confidence == 0.3
    
    def test_get_alternative_domains(self, detector):
        """Test alternative domain extraction."""
        domain_scores = {
            "software_development": 0.8,
            "data_science": 0.6,
            "business_strategy": 0.4,
            "marketing": 0.1  # Below threshold
        }
        
        alternatives = detector._get_alternative_domains(domain_scores, "software_development")
        
        # Should include data_science and business_strategy, not marketing
        alt_domains = [domain for domain, score in alternatives]
        assert "data_science" in alt_domains
        assert "business_strategy" in alt_domains
        assert "marketing" not in alt_domains
        
        # Should be sorted by confidence
        assert alternatives[0][1] >= alternatives[1][1]
    
    def test_detect_domain_software_development(self, detector):
        """Test software development domain detection."""
        messages = [
            ConversationMessage(
                role="user",
                content="I want to build a web app using React, Node.js, and MongoDB",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        files = ["app.js", "package.json"]
        
        detection = detector.detect_domain(messages, files)
        
        assert detection.domain == "software_development"
        assert detection.confidence > 0.7
        assert detection.reasoning is not None
        assert len(detection.reasoning) > 0
    
    def test_detect_domain_data_science(self, detector):
        """Test data science domain detection."""
        messages = [
            ConversationMessage(
                role="user",
                content="I need to analyze customer data using pandas and build ML models with scikit-learn",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        files = ["analysis.ipynb", "data.csv"]
        
        detection = detector.detect_domain(messages, files)
        
        assert detection.domain == "data_science"
        assert detection.confidence > 0.7
    
    def test_detect_domain_business_strategy(self, detector):
        """Test business strategy domain detection."""
        messages = [
            ConversationMessage(
                role="user",
                content="I'm working on a business plan and need help with market research and revenue model",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        files = ["business_plan.pptx", "financials.xlsx"]
        
        detection = detector.detect_domain(messages, files)
        
        assert detection.domain == "business_strategy"
        assert detection.confidence > 0.6
    
    def test_detect_domain_design(self, detector):
        """Test design domain detection."""
        messages = [
            ConversationMessage(
                role="user",
                content="I need to design a mobile app UI with great UX in Figma",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        files = ["mockup.fig", "assets.psd"]
        
        detection = detector.detect_domain(messages, files)
        
        assert detection.domain == "design"
        assert detection.confidence > 0.6
    
    def test_detect_domain_marketing(self, detector):
        """Test marketing domain detection."""
        messages = [
            ConversationMessage(
                role="user",
                content="I want to create a social media marketing campaign with content strategy",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        
        detection = detector.detect_domain(messages)
        
        assert detection.domain == "marketing"
        assert detection.confidence > 0.5
    
    def test_detect_domain_mixed_signals(self, detector):
        """Test domain detection with mixed signals."""
        messages = [
            ConversationMessage(
                role="user",
                content="I want to build a data analytics web app with business dashboards using React and Python",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        files = ["app.py", "dashboard.js", "data.csv"]
        
        detection = detector.detect_domain(messages, files)
        
        # Should detect a primary domain (likely software_development or data_science)
        assert detection.domain in ["software_development", "data_science"]
        assert detection.confidence > 0.5
        
        # Should have alternative domains
        assert len(detection.alternative_domains) > 0
    
    def test_detect_domain_no_clear_signals(self, detector):
        """Test domain detection with unclear signals."""
        messages = [
            ConversationMessage(
                role="user",
                content="I have a project idea but I'm not sure about the details",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        
        detection = detector.detect_domain(messages)
        
        # Should default to general domain with low confidence
        assert detection.domain == "general"
        assert detection.confidence <= 0.5
    
    def test_extract_context(self, detector):
        """Test context extraction around detected terms."""
        text = "I want to build a web application using React framework for the frontend"
        context = detector._extract_context(text, "React")
        
        assert "React" in context
        assert "web application" in context or "framework" in context
    
    def test_generate_reasoning(self, detector):
        """Test reasoning generation."""
        signals = [
            DetectionSignal(
                signal_type=SignalType.FRAMEWORK,
                content="react",
                confidence=0.9,
                context="using react",
                domains=["software_development"],
                metadata={}
            ),
            DetectionSignal(
                signal_type=SignalType.KEYWORD,
                content="app",
                confidence=0.7,
                context="web app",
                domains=["software_development"],
                metadata={}
            )
        ]
        
        domain_scores = {"software_development": 0.85}
        reasoning = detector._generate_reasoning(signals, "software_development", domain_scores)
        
        assert "react" in reasoning.lower()
        assert "app" in reasoning.lower()
        assert "confidence" in reasoning.lower()
        assert len(reasoning) > 20  # Should be a substantial explanation
    
    def test_get_supported_domains(self, detector):
        """Test getting supported domains list."""
        domains = detector.get_supported_domains()
        
        expected_domains = [
            "software_development",
            "mobile_development",
            "data_science", 
            "business_strategy",
            "marketing",
            "design",
            "product_management",
            "general"
        ]
        
        for domain in expected_domains:
            assert domain in domains
    
    def test_get_domain_description(self, detector):
        """Test getting domain descriptions."""
        description = detector.get_domain_description("software_development")
        assert description == "Software Development & Engineering"
        
        description = detector.get_domain_description("data_science")
        assert description == "Data Science & Analytics"
        
        # Test unknown domain
        description = detector.get_domain_description("unknown_domain")
        assert "Unknown Domain" in description
    
    def test_confidence_capping(self, detector):
        """Test that confidence scores are properly capped."""
        # Create signals that would result in very high scores
        messages = [
            ConversationMessage(
                role="user",
                content="React React React JavaScript TypeScript Node.js Python Django Flask web app software development programming code",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        files = ["app.js", "server.py", "config.json", "styles.css"]
        
        detection = detector.detect_domain(messages, files)
        
        # Confidence should be capped at 95%
        assert detection.confidence <= 0.95
    
    def test_signal_frequency_impact(self, detector):
        """Test that keyword frequency impacts confidence."""
        # Single mention
        text1 = "I want to build an app"
        signals1 = detector._detect_keyword_signals(text1)
        
        # Multiple mentions
        text2 = "I want to build an app, this app will be a mobile app for app users"
        signals2 = detector._detect_keyword_signals(text2)
        
        # Find the "app" signal in both
        app_signal1 = next((s for s in signals1 if s.content == "app"), None)
        app_signal2 = next((s for s in signals2 if s.content == "app"), None)
        
        assert app_signal1 is not None
        assert app_signal2 is not None
        
        # Multiple mentions should have higher confidence
        assert app_signal2.confidence > app_signal1.confidence


@pytest.mark.integration
class TestSemanticDomainDetectorIntegration:
    """Integration tests for SemanticDomainDetector."""
    
    @pytest.fixture
    def detector(self):
        """Create a detector instance for integration testing."""
        return SemanticDomainDetector()
    
    def test_real_world_software_project(self, detector):
        """Test detection on a realistic software project conversation."""
        messages = [
            ConversationMessage(
                role="user",
                content="I want to create a task management application",
                timestamp="2025-01-25T10:00:00Z"
            ),
            ConversationMessage(
                role="assistant",
                content="That sounds great! What technology stack are you considering?",
                timestamp="2025-01-25T10:01:00Z"
            ),
            ConversationMessage(
                role="user",
                content="I'm thinking React for the frontend, Node.js with Express for the backend, and PostgreSQL for the database. I also want to use Docker for deployment.",
                timestamp="2025-01-25T10:02:00Z"
            )
        ]
        
        files = ["package.json", "server.js", "schema.sql", "Dockerfile"]
        
        detection = detector.detect_domain(messages, files)
        
        assert detection.domain == "software_development"
        assert detection.confidence > 0.8
        assert "react" in detection.reasoning.lower()
        assert "node" in detection.reasoning.lower()
    
    def test_ambiguous_project_resolution(self, detector):
        """Test handling of projects with ambiguous domain signals."""
        messages = [
            ConversationMessage(
                role="user",
                content="I want to build a platform for analyzing customer data and creating business dashboards with charts and visualizations",
                timestamp="2025-01-25T10:00:00Z"
            )
        ]
        
        files = ["analysis.py", "dashboard.html", "customer_data.csv"]
        
        detection = detector.detect_domain(messages, files)
        
        # Should pick a primary domain
        assert detection.domain in ["data_science", "software_development", "business_strategy"]
        assert detection.confidence > 0.5
        
        # Should have alternatives since it's ambiguous
        assert len(detection.alternative_domains) >= 1


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])