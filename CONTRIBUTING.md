# Contributing to ARQ Monitor Dashboard

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/arq-dashboard.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes locally
6. Commit with a descriptive message
7. Push to your fork
8. Open a Pull Request

## Development Setup

```bash
# Install dependencies
pnpm install

# Start Redis for testing
docker run -d -p 6379:6379 redis:7-alpine

# Start development server
pnpm dev
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code style (Prettier will format on save)
- Use named exports over default exports
- Keep components small and focused
- Add types for all function parameters and return values

## Testing

Before submitting a PR:

```bash
# Type checking
pnpm check

# Ensure the app builds
pnpm build
```

## Commit Messages

Follow conventional commits format:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `style: format code`
- `refactor: restructure code`
- `test: add tests`
- `chore: update dependencies`

## Pull Request Process

1. Update the README.md if you've added features
2. Ensure all type checks pass
3. Provide a clear description of your changes
4. Link any related issues

## Questions?

Feel free to open an issue for discussion before starting major changes.
