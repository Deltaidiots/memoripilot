# Memory Bank for Copilot

Memory Bank provides persistent context and knowledge management for GitHub Copilot Chat, enhancing its ability to assist you with your projects.

## Features

- **Persistent Memory**: Maintains project context across editor restarts and chat sessions
- **Core Memory Files**: Auto-scaffolds a memory-bank directory with specialized files for different types of information
- **Knowledge Management**: Organizes project information into dedicated files with clear purposes
- **Four Working Modes**: Architect, Code, Ask, and Debug - each with specialized behaviors
- **Real-time Updates**: Monitors file changes and maintains cross-file consistency
- **Intelligent Mode Switching**: Automatically switches modes based on your input
- **Session Management**: Auto-synchronizes at the end of each session

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

1. Install the extension
2. Open the VS Code Chat panel (View > Chat)
3. Select "memory" from the chat selector dropdown
4. Say "hello" to initialize your memory bank
5. Use slash commands for common operations:
   - `/active-context` - Set your current working focus
   - `/append-decision` - Log a new decision to decisionLog.md
   - `/show-memory` - Show a memory bank file
   - `/update-memory-bank` - Manually update the memory bank (UMB)

## Working Modes

Memory Bank supports four specialized working modes:

| Mode | Description | Focus |
|------|-------------|-------|
| **Architect** | Design system architecture | System design and key decisions |
| **Code** | Implement features | Code implementation and testing |
| **Ask** | Answer project questions | Knowledge retrieval |
| **Debug** | Identify and fix issues | Troubleshooting and fixes |

You can switch modes by:
1. Clicking on the Memory Mode indicator in the status bar 
2. Using natural language in your chat (e.g., "Let's design the architecture..." switches to Architect mode)

## Using with GitHub Copilot Chat

### Using Memory Bank Commands

There are two ways to use Memory Bank commands:

1. **Keyboard Shortcut (Recommended)**
   - Press `Ctrl+Alt+M` (or `Cmd+Alt+M` on Mac)
   - Type the command (e.g., `mb-help`)
   - Press Enter

2. **Command Palette**
   - Press `Ctrl+Shift+P`
   - Type "Memory Bank: Run Command"
   - Enter the command (e.g., `/mb-init`)

### Available Commands

- `/mb-init` - Initialize memory bank files
- `/mb-update` - Update memory bank based on workspace content
- `/mb-show [file]` - Show memory bank file (or "list" for all files)
- `/mb-decision <text>` - Log a new decision
- `/mb-context <text>` - Set your active context
- `/mb-mode <mode>` - Switch mode (architect, code, ask, debug)
- `/mb-help` - Show help for all commands

### Example Usage

Using the keyboard shortcut or command palette:
```
/mb-init
/mb-update
/mb-mode architect
/mb-decision Use PostgreSQL for the database
```

### Additional Integration Options

#### Option 1: Automatic Context Injection

The extension creates a hidden `.copilot-memory-bank/context.md` file in your workspace that GitHub Copilot can see. This file is automatically updated with your project memory based on the current mode.

#### Option 2: Copy Context to Clipboard

For more explicit control:

1. Click the "Memory → Copilot" button in the status bar
2. A specialized prompt with your memory context will be copied to your clipboard
3. In GitHub Copilot Chat, use the `/system` command and paste this content 

#### Option 3: Direct Command Access

Press `Ctrl+Shift+P` and type "Memory Bank: Run Command" to access all memory bank commands through a quick input box.

## Direct GitHub Copilot Chat Integration

You can use GitHub Copilot Chat directly with your memory bank files without any special commands or extensions. Here's how:

### Step 1: Initialize Your Memory Bank Files
Use the extension to create the initial files or create them manually in a `memory-bank` folder.

### Step 2: Teach GitHub Copilot About Your Memory Bank
Copy and paste the system prompt from `system-prompt.md` into GitHub Copilot Chat using the `/system` command.

### Step 3: Use Natural Language to Update Memory Bank
Now you can simply talk to GitHub Copilot Chat using phrases like:

- "Set active context to implementing the authentication system"
- "Log a decision to use PostgreSQL for the database"
- "Update my progress to show I completed the login page"
- "What's in my product context file?"
- "Update the memory bank based on my project"

GitHub Copilot will suggest commands to update the appropriate memory bank files and can run them for you with your permission.

### Example Conversation

**You:** "Set active context to working on the authentication system"

**Copilot:** "I'll update your active context. Here's what I'll add to your activeContext.md file:

```markdown
## Current Focus (June 28, 2025)
Working on the authentication system. Implementing user login and registration flows.
```

Would you like me to update the file for you?"

**You:** "Yes, please update it"

**Copilot:** "I've updated your activeContext.md file with the new context."

## Development and Testing

To test this extension in the Extension Development Host (EDH):

1. Clone the repository
2. Run `npm install` to install dependencies
3. Press F5 to launch the extension in debug mode
4. In the new VS Code window (EDH), open the Chat panel
5. Select "memory" from the dropdown
6. Try interacting with the Memory Bank

## Known Issues

- The extension currently relies on VS Code Chat API, not the GitHub Copilot Chat API directly
- In EDH mode, you may need to click the "memory" participant again if it doesn't appear initially

## Release Notes

### 0.0.1

- Initial release with core functionality:
  - Memory bank file scaffolding and management
  - Four working modes (Architect, Code, Ask, Debug)
  - Real-time file change monitoring
  - Mode-specific file access controls
  - Basic session tracking
  - Status bar integration for mode switching

## Future Improvements

- Deeper integration with GitHub Copilot Chat API when available
- Enhanced cross-referencing between files
- More robust file change synchronization
- Additional visualization components
- MCP tool endpoints for programmatic access

---

## Credits

Inspired by the original [Memory Bank](https://raw.githubusercontent.com/GreatScottyMac/roo-code-memory-bank/main/README.md) concept.

**Enjoy your enhanced GitHub Copilot experience!**
