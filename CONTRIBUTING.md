# Contributing to MemoriPilot

First off, thank you for considering contributing to MemoriPilot! It's people like you that make this extension better for everyone.

## Getting Started

Before you begin:
- Make sure you have a [GitHub account](https://github.com/signup)
- [Fork the repository](https://github.com/Deltaidiots/memoripilot/fork) on GitHub
- Familiarize yourself with [VS Code extension development](https://code.visualstudio.com/api)

## Development Environment Setup

1. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/memoripilot.git
   cd memoripilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Launch in debug mode:
   - Press F5 in VS Code to launch the Extension Development Host
   - In the new window, open a workspace and test the extension

5. Read the [DEVELOPMENT.md](./DEVELOPMENT.md) file for technical details about the project architecture and best practices.

## Making Changes

1. Create a branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards.

3. Write or update tests as necessary.

4. Run the tests to ensure they pass:
   ```bash
   npm test
   ```

5. Make sure your code follows our linting rules:
   ```bash
   npm run lint
   ```

6. Check TypeScript type safety:
   ```bash
   npm run check-types
   ```

## Submitting Changes

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. [Submit a pull request](https://github.com/Deltaidiots/memoripilot/compare) from your branch to our `main` branch.

3. Wait for the maintainers to review your PR. We'll provide feedback as soon as possible.

## Coding Standards

- **TypeScript**: Use strict typing
- **Error Handling**: Always include proper error handling
- **Comments**: Document complex code sections
- **Tests**: Add tests for new functionality
- **Architecture**: Follow the existing architectural patterns

### File Structure

- `/src/analysis` - Workspace analyzers and scanners
- `/src/chat` - Chat participant code
- `/src/copilot` - GitHub Copilot integration
- `/src/memory` - Memory management and file operations
- `/src/tools` - Language Model Tools implementation
- `/src/ui` - UI components
- `/src/utils` - Utility functions

## Adding New Features

When adding new features:

1. **Scanners**: If you're adding support for a new project type, create a new scanner implementing the `Scanner` interface.

2. **Tools**: To add a new tool:
   - Create a new tool class extending `BaseMemoryBankTool`
   - Add the tool to the index in `/src/tools/index.ts`
   - Register the tool in `extension.ts`
   - Add tool definition to `package.json` under `contributes.languageModelTools`

3. **Memory Files**: If you're adding a new memory file type:
   - Add the template to `FileTemplates.ts`
   - Update relevant tool implementations

## Testing

We maintain a comprehensive test suite:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test multiple components working together
3. **End-to-End Tests**: Test the extension in a VS Code environment

When writing tests:
- Create new test files in `/src/test/suite/`
- Follow the existing patterns for test organization
- Mock external dependencies
- Focus on behavior, not implementation details

## Documentation

- Update the README.md as necessary
- Maintain technical documentation in DEVELOPMENT.md
- Document public APIs and interfaces
- Add JSDoc comments to functions
- Follow the resource management patterns described in DEVELOPMENT.md
- When implementing new tools, document their purpose and parameters

## Questions?

If you have questions about contributing or need help with setup, please open an issue with the tag `question`.

## Thank You!

Your contributions to open source, no matter how small, make projects like this possible. Thank you for being part of our community!
