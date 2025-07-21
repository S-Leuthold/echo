import pytest
from echo.email_processor import OutlookEmailProcessor

@pytest.fixture
def mock_config():
    return {
        "email": {
            "important_senders": ["ceo@company.com", "manager@company.com"],
            "urgent_keywords": ["urgent", "asap", "deadline"],
            "action_keywords": ["please", "can you", "need", "review"]
        }
    }

@pytest.fixture
def test_emails():
    return [
        {
            "id": "1",
            "subject": "Urgent: Project deadline",
            "from": {"emailAddress": {"address": "ceo@company.com"}},
            "bodyPreview": "Please review the project report by Friday. This is urgent.",
        },
        {
            "id": "2",
            "subject": "Meeting request",
            "from": {"emailAddress": {"address": "manager@company.com"}},
            "bodyPreview": "Can we schedule a meeting next week to discuss the project?",
        },
        {
            "id": "3",
            "subject": "Project status update",
            "from": {"emailAddress": {"address": "team@company.com"}},
            "bodyPreview": "Here's the latest status on the Echo project. Please review.",
        }
    ]

def test_filter_emails_by_sender(mock_config, test_emails):
    processor = OutlookEmailProcessor()
    processor.load_email_filters(mock_config)
    processor.urgent_keywords = set()
    processor.action_keywords = set()
    filtered = processor.filter_emails(test_emails)
    assert len(filtered) == 2
    assert all(email["from"]["emailAddress"]["address"] in processor.important_senders for email in filtered)

def test_filter_emails_by_urgent_keyword(mock_config, test_emails):
    processor = OutlookEmailProcessor()
    processor.important_senders = set()
    processor.urgent_keywords = set(["urgent", "deadline"])
    processor.action_keywords = set()
    filtered = processor.filter_emails(test_emails)
    assert len(filtered) == 1
    assert filtered[0]["id"] == "1"

def test_filter_emails_by_action_keyword(mock_config, test_emails):
    processor = OutlookEmailProcessor()
    processor.important_senders = set()
    processor.urgent_keywords = set()
    processor.action_keywords = set(["please", "review"])
    filtered = processor.filter_emails(test_emails)
    assert len(filtered) == 2
    assert set(email["id"] for email in filtered) == {"1", "3"}

def test_filter_emails_combined(mock_config, test_emails):
    processor = OutlookEmailProcessor()
    processor.important_senders = set(["ceo@company.com"])
    processor.urgent_keywords = set(["deadline"])
    processor.action_keywords = set(["review"])
    filtered = processor.filter_emails(test_emails)
    assert len(filtered) == 2
    assert set(email["id"] for email in filtered) == {"1", "3"} 

def test_summarize_emails_via_llm(test_emails, monkeypatch):
    # Patch _get_openai_client and _call_llm to return a mock response
    from echo import email_processor
    def mock_get_openai_client():
        return None
    def mock_call_llm(client, prompt):
        return '{"summary": "(mock) You have 2 urgent emails and 1 meeting request.", "action_items": [{"sender": "ceo@company.com", "subject": "Urgent: Project deadline", "deadline": "Friday"}]}'
    monkeypatch.setattr("echo.cli._get_openai_client", mock_get_openai_client)
    monkeypatch.setattr("echo.cli._call_llm", mock_call_llm)
    processor = email_processor.OutlookEmailProcessor()
    result = processor.summarize_emails_via_llm(test_emails)
    assert "summary" in result
    assert "action_items" in result
    assert isinstance(result["action_items"], list)
    # Check mock response content
    assert result["summary"].startswith("(mock)")
    assert result["action_items"][0]["sender"] == "ceo@company.com"
    assert result["action_items"][0]["subject"] == "Urgent: Project deadline"
    assert result["action_items"][0]["deadline"] == "Friday" 