# MemoriPilot

<div align="center">

![MemoriPilot Logo](./resources/memory-bank-icon.png)

[![VS Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/gujjar19.memoripilot?style=flat-square&label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=gujjar19.memoripilot)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/gujjar19.memoripilot?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=gujjar19.memoripilot)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/gujjar19.memoripilot?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=gujjar19.memoripilot)
[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE)

</div>

**Give Copilot a memory!** MemoriPilot provides seamless, persistent context management that makes GitHub Copilot aware of your project decisions, progress, and architectural patterns - dramatically improving the relevance and quality of AI assistance.

![MemoriPilot in Action](https://raw.githubusercontent.com/Deltaidiots/memoripilot/main/resources/demo-screenshot.png)

## Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tools](#-tools)
- [Installation](#-installation)
- [Usage](#-usage)
- [Working Modes](#-working-modes)
- [Memory Files](#-memory-files)
- [Release Notes](#-release-notes)
- [Documentation](#-documentation)
- [Contributing](#-contributing)

## 🧠 Overview

**Problem**: GitHub Copilot loses context between sessions and has limited awareness of your project's big picture.

**Solution**: MemoriPilot creates and maintains a structured knowledge base about your project that:
- Persists across all coding sessions
- Captures important decisions and their rationale
- Tracks project progress and priorities
- Documents system architecture and patterns
- Is automatically updated as your project evolves

## ✨ Features

- **Native GitHub Copilot Integration**: Tools appear directly in Copilot's agent mode
- **Robust Resource Management**: Safe resource disposal and memory leak prevention
- **Specialized Tools**: Context-specific tools for granular memory updates
- **Dependency Injection**: Reliable core services for stability and testability
- **Smart Template Versioning**: Automatically updates templates with latest improvements
- **Section-Specific Updates**: Tools update only relevant sections of memory files
- **Four Working Modes**: Architect, Code, Ask, and Debug - each with specialized behaviors
- **Real-time Updates**: Monitors file changes and maintains cross-file consistency

## 🛠️ Tools

MemoriPilot provides specialized tools that GitHub Copilot can use automatically:

| Tool | Description | Use When |
|------|-------------|----------|
| `memory_bank_update_context` | Set your current working focus | Switching tasks or areas of focus |
| `memory_bank_log_decision` | Record important architectural decisions | Making design or technology choices |
| `memory_bank_update_progress` | Track done/doing/next items | Completing tasks or planning work |
| `memory_bank_show_memory` | Display memory bank file contents | Referencing project knowledge |
| `memory_bank_switch_mode` | Change working mode | Switching between different activities |
| `memory_bank_update_product_context` | Update product details and dependencies | Changing project scope or dependencies |
| `memory_bank_update_system_patterns` | Document design patterns and conventions | Establishing coding standards |
| `memory_bank_update_project_brief` | Refine project requirements | Updating project goals or scope |
| `memory_bank_update_architect` | Document architecture decisions | Defining system structure |

## 📦 Installation

1. Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=gujjar19.memoripilot)
2. Open a workspace/project folder
3. The extension automatically initializes when you start using GitHub Copilot Chat
4. Memory bank files are created in a `memory-bank/` directory

## 💬 Usage

### Natural Language Interaction

Talk to GitHub Copilot Chat naturally, and it will automatically suggest using MemoriPilot tools:

**Examples:**
- "I'm working on implementing the authentication system" 
  → Copilot suggests using `memory_bank_update_context`
- "I decided to use PostgreSQL for the database"
  → Copilot suggests using `memory_bank_log_decision` 
- "I finished the login page and started on the dashboard"
  → Copilot suggests using `memory_bank_update_progress`
- "Document our React component pattern"
  → Copilot suggests using `memory_bank_update_system_patterns`

### Direct Tool References

You can also reference tools directly in your prompts:

- `memory_bank_update_context` context:"Implementing user authentication flow"
- `memory_bank_log_decision` decision:"Use React Query" rationale:"Better caching and state management"
- `memory_bank_update_progress` done:["Login page"] doing:["Dashboard"] next:["Admin panel"]
- `memory_bank_update_system_patterns` pattern:"Repository Pattern" description:"Data access abstraction" examples:["UserRepository"]

Each operation includes a confirmation dialog showing what will be changed before applying updates.

## 🔄 Working Modes

MemoriPilot supports four specialized working modes:

| Mode | Focus | When to Use |
|------|-------|-------------|
| **Architect** | System design and decisions | Planning architecture and making design decisions |
| **Code** | Implementation details | Writing and testing code |
| **Ask** | Knowledge retrieval | Asking questions about your project |
| **Debug** | Issue resolution | Troubleshooting and fixing problems |

Switch modes via:
1. GitHub Copilot Chat: "Switch to architect mode" 
2. Status bar indicator
3. Command palette: "Memory Bank: Select Mode"

## 📄 Memory Files

MemoriPilot creates and maintains these files in your project:

| File | Purpose |
|------|---------|
| `activeContext.md` | Current goals and blockers |
| `productContext.md` | High-level project overview |
| `progress.md` | Done/doing/next tracking |
| `decisionLog.md` | Timestamped architecture decisions |
| `projectBrief.md` | High-level project requirements |
| `systemPatterns.md` | System design patterns and conventions |

## 📝 Release Notes

### 0.3.0 - Robust Resource Management & Specialized Tools
- Added specialized update tools for each memory bank file
- Streamlined project documentation and repository structure
- Implemented DisposableStore pattern for safe resource disposal
- Enhanced error handling and logging throughout the codebase
- Fixed extension deactivation errors and resource leaks

### 0.2.0 - Architecture Enhancements
- Dependency injection for all core services
- Section-specific file updates for better content preservation
- Enhanced TypeScript and functional programming best practices
- Template versioning system for chat mode templates
- Specialized update tools for each memory bank file

### 0.1.0 - Language Model Tools Integration
- Native GitHub Copilot integration using VS Code Language Model Tools API
- Automatic tool discovery and suggestion in Copilot Chat
- Direct tool referencing with specialized syntax
- Comprehensive test suite with 200+ test cases

## 📚 Documentation

For detailed information about the extension:

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on contributing to the project
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for technical details about the extension's architecture

## 👥 Contributing

Contributions are welcome! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Enhance your GitHub Copilot experience with persistent project memory!**

</div>
