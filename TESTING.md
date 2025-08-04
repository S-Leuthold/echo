# Testing Strategy & Guide

## Overview

Echo uses a comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests across both backend (Python) and frontend (TypeScript/React) codebases.

## Current Test Coverage

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| Backend (Python) | ~60% | 80% | 🟡 Needs improvement |
| Frontend (React) | ~30% | 80% | 🔴 Critical gap |
| E2E Tests | 0% | 50% | 🔴 Not implemented |
| API Tests | 70% | 90% | 🟡 Good foundation |

## Testing Stack

### Backend Testing
- **Framework**: pytest
- **Coverage**: pytest-cov
- **Mocking**: unittest.mock, pytest-mock
- **Async Testing**: pytest-asyncio
- **Fixtures**: conftest.py

### Frontend Testing
- **Framework**: Jest + React Testing Library
- **Coverage**: Jest coverage reports
- **Component Testing**: @testing-library/react
- **Mocking**: Jest mocks
- **E2E**: Playwright (planned)

## Running Tests

### Backend Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=echo --cov-report=html

# Run specific test file
python -m pytest tests/test_projects.py -v

# Run specific test function
python -m pytest tests/test_api.py::test_create_project -v

# Run tests matching pattern
python -m pytest tests/ -k "project" -v

# Run with live output
python -m pytest tests/ -v -s

# Watch mode (requires pytest-watch)
ptw tests/ -- -v
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch

# Run specific test file
npm test -- ProjectCard.test.tsx

# Update snapshots
npm test -- -u

# Debug mode
npm test -- --debug
```

## Test Organization

### Backend Test Structure

```
tests/
├── conftest.py              # Shared fixtures
├── test_api.py             # API endpoint tests
├── test_projects.py        # Project module tests
├── test_planning.py        # Planning engine tests
├── test_analytics.py       # Analytics tests
├── test_email.py          # Email integration tests
├── test_conversations.py   # Conversation tests
├── test_session.py        # Session management tests
└── fixtures/              # Test data
    ├── mock_projects.json
    ├── mock_emails.json
    └── mock_plans.json
```

### Frontend Test Structure

```
frontend/src/
├── __tests__/             # Global test utilities
├── components/
│   └── __tests__/        # Component tests
├── hooks/
│   └── __tests__/        # Hook tests
├── services/
│   └── __tests__/        # Service tests
└── setupTests.ts         # Test configuration
```

## Writing Tests

### Backend Unit Test Example

```python
# tests/test_projects.py
import pytest
from echo.api.routers.projects import create_project
from echo.models import ProjectCreate

@pytest.fixture
def sample_project():
    """Fixture for sample project data."""
    return ProjectCreate(
        name="Test Project",
        description="Test description",
        type="software"
    )

@pytest.mark.asyncio
async def test_create_project(sample_project, mock_db):
    """Test project creation."""
    # Arrange
    expected_id = "proj-123"
    mock_db.insert.return_value = {"id": expected_id}
    
    # Act
    result = await create_project(sample_project, db=mock_db)
    
    # Assert
    assert result["id"] == expected_id
    assert result["name"] == sample_project.name
    mock_db.insert.assert_called_once()

@pytest.mark.asyncio
async def test_create_project_validation():
    """Test project creation with invalid data."""
    # Arrange
    invalid_project = ProjectCreate(name="")  # Empty name
    
    # Act & Assert
    with pytest.raises(ValueError, match="Name cannot be empty"):
        await create_project(invalid_project)
```

### Frontend Unit Test Example

```typescript
// components/__tests__/ProjectCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import { mockProject } from '../../__tests__/fixtures';

describe('ProjectCard', () => {
  const mockOnUpdate = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should render project information', () => {
    render(
      <ProjectCard 
        project={mockProject} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    expect(screen.getByText(mockProject.description)).toBeInTheDocument();
  });
  
  it('should call onUpdate when edited', async () => {
    render(
      <ProjectCard 
        project={mockProject} 
        onUpdate={mockOnUpdate} 
      />
    );
    
    // Click edit button
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    // Change name
    const input = screen.getByRole('textbox', { name: /name/i });
    fireEvent.change(input, { target: { value: 'Updated Name' } });
    
    // Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        mockProject.id,
        { name: 'Updated Name' }
      );
    });
  });
});
```

### Integration Test Example

```python
# tests/test_api_integration.py
import pytest
from fastapi.testclient import TestClient
from api_server import app

@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)

def test_project_workflow(client):
    """Test complete project creation and retrieval workflow."""
    # Create project
    create_response = client.post(
        "/projects",
        json={
            "name": "Integration Test Project",
            "type": "software"
        }
    )
    assert create_response.status_code == 200
    project_id = create_response.json()["id"]
    
    # Get project
    get_response = client.get(f"/projects/{project_id}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Integration Test Project"
    
    # Update project
    update_response = client.put(
        f"/projects/{project_id}",
        json={"status": "active"}
    )
    assert update_response.status_code == 200
    
    # Delete project
    delete_response = client.delete(f"/projects/{project_id}")
    assert delete_response.status_code == 200
```

## Test Categories

### 1. Unit Tests
Test individual functions and methods in isolation.

**What to test:**
- Pure functions
- Data transformations
- Validation logic
- Error handling
- Edge cases

**Example scenarios:**
- Empty inputs
- Invalid data types
- Boundary values
- Null/undefined handling

### 2. Integration Tests
Test interaction between multiple components.

**What to test:**
- API endpoints
- Database operations
- Service interactions
- External API calls

**Example scenarios:**
- Complete API workflows
- Database transactions
- Multi-step processes
- Error propagation

### 3. Component Tests (Frontend)
Test React components in isolation.

**What to test:**
- Rendering logic
- User interactions
- State changes
- Props handling
- Event handlers

**Example scenarios:**
- Component mounting
- User clicks/inputs
- Conditional rendering
- Loading states
- Error states

### 4. E2E Tests (Planned)
Test complete user workflows.

**What to test:**
- User journeys
- Critical paths
- Cross-browser compatibility
- Performance

**Example scenarios:**
- User login flow
- Project creation workflow
- Daily planning process
- Data export

## Testing Best Practices

### 1. Test Naming
Use descriptive names that explain what is being tested:

```python
# Good
def test_create_project_with_valid_data_returns_success():
    pass

# Bad
def test_create():
    pass
```

### 2. Arrange-Act-Assert Pattern
Structure tests clearly:

```python
def test_example():
    # Arrange - Set up test data
    input_data = {"name": "Test"}
    
    # Act - Perform the action
    result = process_data(input_data)
    
    # Assert - Check the outcome
    assert result["status"] == "success"
```

### 3. Use Fixtures
Share common test setup:

```python
@pytest.fixture
def authenticated_client():
    """Client with authentication."""
    client = TestClient(app)
    client.headers["Authorization"] = "Bearer test-token"
    return client
```

### 4. Mock External Dependencies
Isolate tests from external services:

```python
@patch('echo.services.openai_client')
def test_ai_planning(mock_openai):
    mock_openai.complete.return_value = {"plan": "..."}
    result = generate_plan()
    assert result is not None
```

### 5. Test Error Conditions
Don't just test the happy path:

```python
def test_api_handles_timeout():
    with patch('requests.get', side_effect=Timeout):
        result = fetch_data()
        assert result["error"] == "timeout"
```

## Coverage Requirements

### Minimum Coverage Targets

| Category | Minimum | Recommended |
|----------|---------|-------------|
| Critical paths | 100% | 100% |
| API endpoints | 90% | 95% |
| Business logic | 80% | 90% |
| UI components | 70% | 85% |
| Utilities | 80% | 90% |

### Measuring Coverage

```bash
# Backend coverage report
python -m pytest tests/ --cov=echo --cov-report=term-missing

# Frontend coverage report
cd frontend && npm run test:coverage

# Generate HTML reports
python -m pytest tests/ --cov=echo --cov-report=html
# Open htmlcov/index.html
```

### Coverage Exclusions

Some code may be excluded from coverage:

```python
# pragma: no cover - for Python
if __name__ == "__main__":  # pragma: no cover
    main()

// istanbul ignore next - for JavaScript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      - name: Run tests
        run: |
          python -m pytest tests/ --cov=echo --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm test -- --coverage
```

## Test Data Management

### Fixtures Location
```
tests/fixtures/
├── projects.json      # Sample project data
├── users.json        # Sample user data
├── plans.json        # Sample plan data
└── emails.json       # Sample email data
```

### Using Fixtures

```python
# conftest.py
import json
from pathlib import Path

@pytest.fixture
def mock_projects():
    """Load mock project data."""
    fixture_path = Path(__file__).parent / "fixtures" / "projects.json"
    with open(fixture_path) as f:
        return json.load(f)
```

## Debugging Tests

### Backend Debugging

```bash
# Use pdb for debugging
python -m pytest tests/test_api.py -v -s --pdb

# Or add breakpoint in code
def test_something():
    import pdb; pdb.set_trace()
    # Test code here
```

### Frontend Debugging

```javascript
// Add debug() in test
import { debug } from '@testing-library/react';

test('debugging example', () => {
  const { container } = render(<Component />);
  debug(container); // Prints DOM
});

// Or use VS Code debugger with launch.json
```

## Performance Testing

### Load Testing (Backend)

```python
# tests/test_performance.py
import time
import pytest

@pytest.mark.performance
def test_api_response_time(client):
    """Test API responds within acceptable time."""
    start = time.time()
    response = client.get("/projects")
    duration = time.time() - start
    
    assert response.status_code == 200
    assert duration < 1.0  # Should respond within 1 second
```

### Component Performance (Frontend)

```javascript
// Use React Profiler
import { Profiler } from 'react';

test('component renders efficiently', () => {
  const onRender = jest.fn();
  
  render(
    <Profiler id="test" onRender={onRender}>
      <ExpensiveComponent />
    </Profiler>
  );
  
  const [, , actualDuration] = onRender.mock.calls[0];
  expect(actualDuration).toBeLessThan(100); // ms
});
```

## Test Maintenance

### Regular Tasks
1. **Weekly**: Review failing tests
2. **Monthly**: Update test data/fixtures
3. **Quarterly**: Review coverage targets
4. **Per Release**: Full regression testing

### Flaky Test Management
1. Identify flaky tests with CI logs
2. Add retry logic for network-dependent tests
3. Use proper async/await patterns
4. Increase timeouts where appropriate
5. Document known issues in test comments

## Testing Checklist

### Before Committing
- [ ] All tests pass locally
- [ ] New code has tests
- [ ] Coverage hasn't decreased
- [ ] No `.only` or `.skip` in tests
- [ ] Test names are descriptive

### Before PR
- [ ] CI tests pass
- [ ] Coverage meets requirements
- [ ] No console.log in tests
- [ ] Performance tests pass
- [ ] Documentation updated

## Troubleshooting

### Common Issues

**Issue**: Tests fail in CI but pass locally
- Check environment variables
- Verify timezone settings
- Check file path separators (Windows vs Unix)

**Issue**: Async tests timeout
- Increase timeout: `jest.setTimeout(10000)`
- Check for missing await statements
- Verify mock implementations

**Issue**: Coverage not accurate
- Check for duplicate test runs
- Verify source maps are correct
- Ensure all source files are included

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [Jest documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing best practices](https://testingjavascript.com/)
- [Coverage guidelines](https://martinfowler.com/bliki/TestCoverage.html)