# MemoriPilot Development

This document provides key technical information for developers working on the MemoriPilot extension.

## Architecture Overview

MemoriPilot follows a modular, dependency-injected architecture focused on robust resource management:

- **Core Services** - MemoryManager, ModeManager, ChatModeProvider
- **Tools Integration** - Integration with VS Code's Language Model Tools API
- **Memory Files** - Structured markdown files for persistent context storage
- **Resource Management** - DisposableStore pattern for safe resource disposal
- **Specialized Update Tools** - Context-aware tools for granular memory file updates

## Resource Management

### DisposableStore Pattern

MemoriPilot implements a robust resource management pattern using a `DisposableStore` to properly track and dispose resources during extension lifecycle events, particularly during deactivation.

#### Implementation

```typescript
class DisposableStore {
  private _disposables: vscode.Disposable[] = [];
  private _isDisposed = false;

  public add(disposable: vscode.Disposable): void {
    if (this._isDisposed) {
      console.warn('Adding to disposed DisposableStore. The object will be leaked.');
      return;
    }
    this._disposables.push(disposable);
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    
    this._isDisposed = true;
    const errors: Error[] = [];
    
    // Dispose in reverse order
    while (this._disposables.length) {
      try {
        const disposable = this._disposables.pop();
        if (disposable) {
          disposable.dispose();
        }
      } catch (e) {
        errors.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    
    if (errors.length) {
      console.error(`Errors during DisposableStore disposal: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  public get isDisposed(): boolean {
    return this._isDisposed;
  }
}
```

#### Best Practices

1. **Register all disposables** - Add any disposable (event listeners, commands, etc.) to the DisposableStore
2. **Clean up event listeners** - Explicitly remove event listeners during disposal
3. **Handle errors during disposal** - Wrap disposal logic in try-catch blocks
4. **Log disposal actions** - Add logging to track the disposal sequence
5. **Check disposed state** - Before performing operations, verify that components haven't been disposed
6. **Dispose in reverse order** - Resources should be disposed in the reverse order they were created

## Memory Management

The extension maintains a structured set of markdown files with specific purposes:

- **Product Context**: High-level project overview and dependencies
- **Active Context**: Current focus and goals
- **Decision Log**: Architecture and implementation decisions
- **Progress Tracking**: What's done, in progress, and upcoming
- **Project Brief**: Project purpose and requirements
- **System Patterns**: Design patterns and architectural conventions

## Workspace Analysis

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

## Development Workflow

1. **Set up your environment**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/memoripilot.git
   cd memoripilot
   npm install
   ```

2. **Start coding**:
   ```bash
   npm run watch:esbuild  # Live compile for development
   ```

3. **Test your changes**:
   ```bash
   npm test              # Run all tests
   npm run compile-tests # Compile test files
   npm run check-types   # TypeScript strict checking
   npm run lint          # ESLint code quality
   ```

4. **Debug in VS Code**:
   - Press F5 to launch the Extension Development Host
   - In the new window, try your changes

5. **Submit your PR**:
   - Make sure tests pass
   - Update documentation as needed
   - Follow the guidelines in CONTRIBUTING.md
