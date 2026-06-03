# Contributing to OmniParse

Thank you for your interest in contributing. OmniParse is an open-source monorepo with a FastAPI backend and Next.js frontend.

## Getting Started

### Windows (recommended)

Double-click `start.bat` in the project root. It will:

1. Create and activate `backend/.venv` if needed
2. Install Python and Node dependencies on first run
3. Start the API and UI in separate terminal windows

### Manual setup

See [README.md](README.md) for step-by-step instructions.

## Development Guidelines

- Keep changes focused and modular
- Use Pydantic models for all API schemas
- Place business logic in `backend/app/services/`, not route handlers
- Match existing naming and file structure
- Update docs in `docs/architecture/` when behavior or data flow changes

## Pull Requests

1. Fork the repository and create a feature branch
2. Make your changes with clear commit messages
3. Ensure the backend starts (`uvicorn app.main:app`) and frontend builds (`npm run build`)
4. Open a pull request with a summary and test plan

## Reporting Issues

Use GitHub Issues and include:

- Steps to reproduce
- Expected vs actual behavior
- URL or HTML sample (if applicable)
- OS and Python/Node versions

## Code of Conduct

Be respectful and constructive. We welcome contributors of all experience levels.
