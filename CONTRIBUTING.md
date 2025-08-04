# Contributing to Echo

Thank you for your interest in contributing to Echo! This document provides guidelines and best practices for contributing to the project.

## Table of Contents
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Session Management](#session-management)

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- VS Code (recommended) or your preferred editor

### Initial Setup

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/echo.git
cd echo
```

2. **Set up Python environment:**
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies
```

3. **Set up Node environment:**
```bash
cd frontend
npm install
cd ..
```

4. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

5. **Set up pre-commit hooks:**
```bash
pre-commit install
```

### Running the Application

```bash
# Terminal 1: Start backend
python api_server.py

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run tests (optional)
python -m pytest tests/ -v --watch
```

## Development Workflow

### 1. Start a Development Session

Always begin significant work with session tracking:

```bash
# Using Claude Code commands
/project:session-start feature-name

# Or manually create a session file
echo "# Session $(date +%Y-%m-%d-%H%M)" > sessions/$(date +%Y-%m-%d-%H%M).md
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
# or
git checkout -b docs/documentation-update
```

### 3. Make Your Changes

Follow the coding standards and ensure all tests pass.

### 4. Update Documentation

- Update relevant documentation files
- Add inline comments for complex logic
- Update API_REFERENCE.md for new endpoints
- Update TECHNICAL_DEBT.md if adding TODOs

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature description"
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

## Code Style Guidelines

### Python (Backend)

#### Formatting
```bash
# Format code with Black
black echo/ tests/

# Lint with Ruff
ruff echo/ tests/

# Type check with mypy
mypy echo/
```

#### Style Rules
- Use type hints for all functions
- Maximum line length: 88 characters (Black default)
- Use descriptive variable names
- Follow PEP 8 guidelines

#### Example:
```python
from typing import Optional, List
from pydantic import BaseModel

class ProjectCreate(BaseModel):
    """Model for creating a new project."""
    name: str
    description: Optional[str] = None
    tags: List[str] = []

async def create_project(
    project_data: ProjectCreate,
    user_id: str
) -> dict:
    """
    Create a new project in the database.
    
    Args:
        project_data: Project creation data
        user_id: ID of the user creating the project
        
    Returns:
        Created project dictionary
    """
    # Implementation here
    pass
```

### TypeScript/React (Frontend)

#### Formatting
```bash
# Format and lint
cd frontend
npm run lint
npm run format
```

#### Style Rules
- Use TypeScript for all new code
- Prefer functional components with hooks
- Use proper TypeScript types (avoid `any`)
- Follow React best practices

#### Example:
```typescript
import { useState, useEffect } from 'react';

interface ProjectProps {
  id: string;
  name: string;
  onUpdate: (id: string, data: Partial<Project>) => Promise<void>;
}

export function ProjectCard({ id, name, onUpdate }: ProjectProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Component implementation
  return (
    <div className="project-card">
      {/* JSX content */}
    </div>
  );
}
```

### CSS/Styling

- Use Tailwind CSS utilities
- Avoid inline styles
- Use CSS modules for complex components
- Follow mobile-first responsive design

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples
```bash
feat(projects): add project roadmap generation

fix(api): handle timeout in email processing

docs: update API reference for new endpoints

refactor(frontend): extract common API client

test(backend): add project CRUD tests
```

## Pull Request Process

### Before Creating a PR

1. **Update from main:**
```bash
git fetch origin
git rebase origin/main
```

2. **Run all tests:**
```bash
# Backend tests
python -m pytest tests/ -v

# Frontend tests
cd frontend && npm test
```

3. **Check code quality:**
```bash
# Python
black echo/ --check
ruff echo/

# TypeScript
cd frontend && npm run lint
```

4. **Update documentation:**
- Update README if needed
- Update API_REFERENCE.md for API changes
- Add/update code comments

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Added new tests for changes
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] TECHNICAL_DEBT.md updated if adding TODOs

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

### Review Process

1. At least one review required
2. All CI checks must pass
3. No merge conflicts
4. Documentation updated

## Testing Requirements

### Unit Tests

All new code should have corresponding tests:

```python
# Python example
def test_create_project():
    """Test project creation."""
    project_data = ProjectCreate(name="Test Project")
    result = create_project(project_data, "user123")
    assert result["name"] == "Test Project"
```

```typescript
// TypeScript example
describe('ProjectCard', () => {
  it('should render project name', () => {
    render(<ProjectCard id="1" name="Test" onUpdate={jest.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Integration Tests

Test API endpoints and component integration:

```python
# API test
async def test_project_endpoint(client):
    response = await client.post(
        "/projects",
        json={"name": "Test Project"}
    )
    assert response.status_code == 200
```

### Coverage Requirements

- Minimum 80% coverage for new code
- Critical paths must have 100% coverage
- Run coverage reports:

```bash
# Python coverage
pytest --cov=echo --cov-report=html

# JavaScript coverage
cd frontend && npm run test:coverage
```

## Documentation Standards

### Code Documentation

#### Python Docstrings
```python
def complex_function(param1: str, param2: int) -> dict:
    """
    Brief description of function.
    
    Longer description if needed, explaining the purpose
    and any important details.
    
    Args:
        param1: Description of param1
        param2: Description of param2
        
    Returns:
        Description of return value
        
    Raises:
        ValueError: When param1 is empty
        
    Example:
        >>> result = complex_function("test", 42)
        >>> print(result["status"])
        "success"
    """
    pass
```

#### TypeScript JSDoc
```typescript
/**
 * Brief description of function
 * 
 * @param param1 - Description of param1
 * @param param2 - Description of param2
 * @returns Description of return value
 * @throws {Error} When validation fails
 * 
 * @example
 * const result = complexFunction("test", 42);
 * console.log(result.status);
 */
function complexFunction(param1: string, param2: number): Result {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing setup procedures
- Modifying API endpoints
- Adding new dependencies

### API Documentation

Update API_REFERENCE.md when:
- Adding new endpoints
- Modifying endpoint parameters
- Changing response formats
- Adding new error codes

## Session Management

### Daily Development Sessions

1. **Start each day with session review:**
```bash
/project:session-current
```

2. **Log significant progress:**
```bash
/project:session-update "Completed API integration"
```

3. **End sessions properly:**
```bash
/project:session-end
```

### Session Documentation

Sessions should document:
- Goals for the session
- Changes made
- Problems encountered
- Solutions implemented
- Next steps

## Getting Help

### Resources
- [Project Documentation](docs/README.md)
- [API Reference](API_REFERENCE.md)
- [Architecture Guide](ARCHITECTURE.md)
- [Technical Debt Tracker](TECHNICAL_DEBT.md)

### Communication
- GitHub Issues for bugs and features
- GitHub Discussions for questions
- Pull Request comments for code review

## Code of Conduct

### Our Standards
- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards others

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Public or private harassment
- Publishing private information
- Unprofessional conduct

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to Echo! Your efforts help make this project better for everyone. 🎉