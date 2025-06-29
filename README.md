# Memory Bank for GitHub Copilot

<div align="center">

![Memory Bank Logo](resources/dark/memory.svg)

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://marketplace.visualstudio.co### Architecture

Memory Bank follows a modular, extensible architecture:

### Workspace Analysis

The extension uses a sophisticated workspace detection and analysis system designed to handle complex development environments:?itemName=asadbek064.memory-bank-copilot)
[![Installs](https://img.shields.io/badge/installs-growing-success)](https://marketplace.visualstudio.com/items?itemName=asadbek064.memory-bank-copilot)
[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

</div>

Memory Bank provides seamless, persistent context and knowledge management for GitHub Copilot Chat using VS Code's Language Model Tools API.

## ✨ Features

- **Native GitHub Copilot Integration**: Tools appear directly in Copilot's agent mode
- **Automatic Tool Discovery**: Copilot automatically suggests relevant memory operations  
- **User Safety**: Built-in confirmation dialogs for all operations
- **Persistent Memory**: Maintains project context across editor restarts and chat sessions
- **Core Memory Files**: Auto-scaffolds a memory-bank directory with specialized files for different types of information
- **Knowledge Management**: Organizes project information into dedicated files with clear purposes
- **Four Working Modes**: Architect, Code, Ask, and Debug - each with specialized behaviors
- **Real-time Updates**: Monitors file changes and maintains cross-file consistency
- **Intelligent Mode Switching**: Automatically switches modes based on your input
- **Session Management**: Auto-synchronizes at the end of each session

## Language Model Tools

Memory Bank registers the following tools that GitHub Copilot can use automatically:

| Tool | Reference Name | Description |
|------|----------------|-------------|
| **Update Active Context** | `#updateContext` | Set your current working focus |
| **Log Decision** | `#logDecision` | Record important architectural decisions |
| **Update Progress** | `#updateProgress` | Track done/doing/next items |
| **Show Memory** | `#showMemory` | Display memory bank file contents |
| **Update Memory Bank** | `#updateMemoryBank` | Sync memory with workspace state |
| **Switch Mode** | `#switchMode` | Change working mode (architect/code/ask/debug) |

## Usage with GitHub Copilot Chat

### Natural Language Interaction

Simply talk to GitHub Copilot Chat naturally, and it will automatically suggest using Memory Bank tools:

**Examples:**
- "I'm working on implementing the authentication system" 
  → Copilot suggests using `#updateContext`
- "I decided to use PostgreSQL for the database"
  → Copilot suggests using `#logDecision` 
- "Show me what's in my progress file"
  → Copilot suggests using `#showMemory`
- "I finished the login page and started on the dashboard"
  → Copilot suggests using `#updateProgress`

### Direct Tool References  

You can also reference tools directly in your prompts:

- `#updateContext` Set active context to implementing user registration
- `#logDecision` decision:"Use React Query" rationale:"Better caching and state management"
- `#updateProgress` done:["Login page", "User model"] doing:["Dashboard"] next:["Admin panel"]
- `#showMemory` fileName:"decisionLog.md"
- `#switchMode` mode:"architect"

### Confirmation Flow

Each tool operation includes:
1. **Automatic suggestion** by Copilot based on context
2. **Clear confirmation dialog** showing what will be changed
3. **Rich feedback** confirming the operation completed

### Memory Files

Memory Bank creates and maintains these files in your project:

| File | Purpose |
|------|---------|
| `activeContext.md` | Current goals and blockers |
| `productContext.md` | High-level project overview |
| `progress.md` | Done/doing/next tracking |
| `decisionLog.md` | Timestamped architecture decisions |
| `projectBrief.md` | High-level project requirements |
| `systemPatterns.md` | System design patterns and conventions |

## How to Use

### With GitHub Copilot Chat (Recommended)

1. Install the extension and open a workspace
2. Open GitHub Copilot Chat
3. Start talking naturally about your project:
   - "I'm working on the authentication system now"
   - "I decided to use MongoDB for the database" 
   - "Show me my current progress"
   - "Switch to debug mode"

Copilot will automatically suggest using Memory Bank tools when appropriate, with clear confirmation dialogs.

### With VS Code Chat (Fallback)

If Language Model Tools aren't available, the extension provides a chat participant:

1. Open the VS Code Chat panel (View > Chat)
2. Select "memory" from the chat selector dropdown
3. Say "hello" to initialize your memory bank and get current project summaries
4. The participant will guide you to use GitHub Copilot Chat for best results

**Note**: The fallback mode provides read-only access to memory bank summaries and recommends using GitHub Copilot Chat for full functionality.

### Manual Commands

Press `Ctrl+Alt+M` (or `Cmd+Alt+M` on Mac) to access Memory Bank commands directly:
- **Open GitHub Copilot Chat (Recommended)** - Use natural language with tool suggestions
- **Open VS Code Chat (Fallback)** - Use when Language Model Tools aren't available  
- **Show Memory Bank Status** - View current mode and activation status

**Note**: Individual slash commands like `/mb-init`, `/mb-update` have been replaced by the integrated tool system. Use GitHub Copilot Chat for the best experience.

## Working Modes

Memory Bank supports four specialized working modes:

| Mode | Description | Focus |
|------|-------------|-------|
| **Architect** | Design system architecture | System design and key decisions |
| **Code** | Implement features | Code implementation and testing |
| **Ask** | Answer project questions | Knowledge retrieval |
| **Debug** | Identify and fix issues | Troubleshooting and fixes |

You can switch modes by:
1. Using GitHub Copilot Chat: "Switch to architect mode" 
2. Using the `#switchMode` tool directly
3. Clicking on the Memory Mode indicator in the status bar
4. Using the command palette: "Memory Bank: Select Mode"

## Example Workflow

```
👤 User: "I'm starting work on the user authentication system"

🤖 Copilot: "I'll update your active context. Let me use the updateContext tool."
[Confirmation dialog: "Set active context to: implementing user authentication system?"]

👤 User: "Yes"

🤖 Copilot: "✅ Active context updated to: implementing user authentication system"

👤 User: "I decided to use JWT tokens instead of sessions"

🤖 Copilot: "That's an important architectural decision. Let me log it using the logDecision tool."
[Confirmation dialog with decision and rationale]

👤 User: "Yes, log it"

🤖 Copilot: "✅ Decision logged: Use JWT tokens for authentication"
```

## Installation & Setup

1. Install the extension from VS Code Marketplace
2. Open a workspace/project folder
3. The extension automatically initializes when you start using GitHub Copilot Chat
4. Memory bank files are created in `memory-bank/` directory

## Architecture

The extension uses VS Code's Language Model Tools API to provide native GitHub Copilot integration, with fallback support for VS Code Chat participants when the tools API isn't available.

## Development and Testing

To test this extension in the Extension Development Host (EDH):

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 to launch the extension in debug mode
5. In the new VS Code window (EDH), open a workspace
6. Start using GitHub Copilot Chat - the tools will be automatically available

### Comprehensive Test Suite

The extension includes extensive testing:

```bash
npm test              # Run all tests
npm run compile-tests # Compile test files
npm run check-types   # TypeScript strict checking
npm run lint          # ESLint code quality
```

**Test Coverage**: 11 comprehensive test suites with 200+ test cases covering:
- Core functionality and tools integration
- Performance and security testing  
- Error handling and edge cases
- VS Code API compliance
- TypeScript strict mode compliance

## Known Issues

- Language Model Tools API requires VS Code 1.101.0+ and GitHub Copilot
- In EDH mode, you may need to restart if tools don't appear initially
- Fallback chat participant mode available when Language Model Tools API is not available

## Architecture

Memory Bank follows a modular, extensible architecture:

### Workspace Analysis

The extension uses a sophisticated workspace detection and analysis system:

```
Memory Bank Tools
└─ UpdateMemoryBankTool
   ├─ selects a WorkspaceFolder (context-aware)
   └─ calls ↓
AnalyzerRegistry
└─ getAnalyzer(workspaceFolder)  ← cache map
   └─ RepoAnalyzer (one per workspace)
      ├─ PackageJsonScanner (JS/TS)
      ├─ PyProjectScanner   (Python)
      └─ ReadmeScanner
```

Key architectural features:
- **Per-Workspace Analysis**: Each workspace gets its own analyzer instance
- **Pluggable Scanners**: Extensible system to support multiple project types
- **Smart Workspace Selection**: Multi-strategy approach for identifying the correct workspace
- **Multi-Root Workspace Support**: Handles complex project setups correctly
- **Extension Development Host (EDH) Support**: Special handling for development scenarios
- **Robust Error Handling**: Clear errors and graceful fallbacks
- **User Choice**: Prompts for workspace selection when appropriate

### Memory Management

The extension maintains a structured set of markdown files with specific purposes:
- **Product Context**: High-level project overview and dependencies
- **Active Context**: Current focus and goals
- **Decision Log**: Architecture and implementation decisions
- **Progress Tracking**: What's done, in progress, and upcoming
- **Project Brief**: Project purpose and requirements
- **System Patterns**: Design patterns and architectural conventions

## Release Notes

## Release Notes

### 0.1.0 - Language Model Tools Integration

- **NEW**: Native GitHub Copilot integration using VS Code Language Model Tools API
- **NEW**: Automatic tool discovery and suggestion in Copilot Chat
- **NEW**: Built-in confirmation dialogs for all operations
- **NEW**: Direct tool referencing with `#toolName` syntax
- **NEW**: Comprehensive test suite with 200+ test cases and expert-level TypeScript engineering
- **NEW**: Advanced security testing and performance optimization
- **IMPROVED**: Enhanced error handling and user feedback
- **IMPROVED**: Streamlined manual commands focused on GitHub Copilot Chat
- **MAINTAINED**: Backward compatibility with VS Code Chat participant (fallback mode)
- **MAINTAINED**: All existing memory bank functionality and modes

### 0.0.1 - Initial Release

- Initial release with core functionality:
  - Memory bank file scaffolding and management
  - Four working modes (Architect, Code, Ask, Debug)
  - Real-time file change monitoring
  - Mode-specific file access controls
  - Basic session tracking
  - Status bar integration for mode switching

## Future Improvements

- Enhanced tool chaining (tools calling other tools)
- Dynamic tool availability based on project state
- More sophisticated workspace analysis
- Integration with additional VS Code APIs
- Expanded file template system

---

## Documentation

- **[EXPERT_TESTING_REPORT.md](./EXPERT_TESTING_REPORT.md)** - Comprehensive testing analysis and quality assurance report
- **[TESTING.md](./TESTING.md)** - Testing guide and examples for Language Model Tools
- **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** - Code cleanup and architecture alignment summary
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation details and benefits
- **[ANALYZER_REDESIGN.md](./ANALYZER_REDESIGN.md)** - WorkspaceAnalyzer architecture improvements

## Contributing

Contributions are welcome! Here's how you can contribute to Memory Bank:

1. **Fork the repository** on GitHub
2. **Clone** your fork locally
3. **Create a branch** for your feature or bug fix
4. **Make your changes** and add appropriate tests
5. **Run the tests** to ensure they pass: `npm test`
6. **Commit your changes** with clear, descriptive messages
7. **Push to your fork** and submit a pull request

### Code Standards

- Follow the existing code style and patterns
- Write TypeScript with strict type checking
- Include appropriate tests for new features
- Update documentation as needed
- Respect the existing architecture

### Pull Request Process

1. Update the README.md or documentation with details of your changes
2. Update the CHANGELOG.md with your additions
3. Make sure all tests pass and there are no lint errors
4. Your PR will be reviewed by maintainers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Memory Bank for GitHub Copilot leverages VS Code's Language Model Tools API to provide seamless GitHub Copilot integration, inspired by the original [Memory Bank](https://raw.githubusercontent.com/GreatScottyMac/roo-code-memory-bank/main/README.md) concept.

---

<div align="center">

**Enjoy your enhanced GitHub Copilot experience with persistent project memory!**

</div>
