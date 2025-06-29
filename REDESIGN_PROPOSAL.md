# Memory Bank Redesign: Language Model Tools API

## Overview
Redesign the Memory Bank extension to use VS Code's Language Model Tools API for native GitHub Copilot integration.

## Architecture Changes

### 1. Tool Registration
Replace the current chat participant approach with Language Model Tools:

```typescript
// In extension.ts
export function activate(context: vscode.ExtensionContext) {
  // Register each memory bank operation as a separate tool
  context.subscriptions.push(
    vscode.lm.registerTool('memory_bank_update_context', new UpdateContextTool()),
    vscode.lm.registerTool('memory_bank_log_decision', new LogDecisionTool()),
    vscode.lm.registerTool('memory_bank_update_progress', new UpdateProgressTool()),
    vscode.lm.registerTool('memory_bank_show_memory', new ShowMemoryTool()),
    vscode.lm.registerTool('memory_bank_update_all', new UpdateMemoryBankTool()),
    vscode.lm.registerTool('memory_bank_switch_mode', new SwitchModeTool())
  );
}
```

### 2. Tool Definitions in package.json

```json
{
  "contributes": {
    "languageModelTools": [
      {
        "name": "memory_bank_update_context",
        "displayName": "Update Active Context",
        "toolReferenceName": "updateContext",
        "modelDescription": "Updates the active context file with the current working focus. Use this when the user wants to set their current task, goal, or area of focus. This helps maintain continuity across coding sessions.",
        "userDescription": "Set your current working focus in the memory bank",
        "canBeReferencedInPrompt": true,
        "icon": "$(target)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "context": {
              "type": "string",
              "description": "The current context or focus area to set"
            }
          },
          "required": ["context"]
        }
      },
      {
        "name": "memory_bank_log_decision",
        "displayName": "Log Decision",
        "toolReferenceName": "logDecision",
        "modelDescription": "Logs an important architectural or implementation decision to the decision log. Use this when the user makes or mentions a significant choice about technology, architecture, or implementation approach.",
        "userDescription": "Log an important decision to the memory bank",
        "canBeReferencedInPrompt": true,
        "icon": "$(checklist)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "decision": {
              "type": "string",
              "description": "The decision that was made"
            },
            "rationale": {
              "type": "string",
              "description": "The reasoning behind the decision"
            }
          },
          "required": ["decision"]
        }
      },
      {
        "name": "memory_bank_update_progress",
        "displayName": "Update Progress",
        "toolReferenceName": "updateProgress",
        "modelDescription": "Updates the progress tracking with done, doing, and next items. Use this when the user mentions completing tasks, starting new work, or planning upcoming activities.",
        "userDescription": "Update your project progress tracking",
        "canBeReferencedInPrompt": true,
        "icon": "$(list-unordered)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "done": {
              "type": "array",
              "items": {"type": "string"},
              "description": "Tasks that have been completed"
            },
            "doing": {
              "type": "array", 
              "items": {"type": "string"},
              "description": "Tasks currently in progress"
            },
            "next": {
              "type": "array",
              "items": {"type": "string"}, 
              "description": "Tasks planned for the future"
            }
          }
        }
      }
    ]
  }
}
```

### 3. Tool Implementation Classes

```typescript
// src/tools/UpdateContextTool.ts
export class UpdateContextTool implements vscode.LanguageModelTool<{context: string}> {
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<{context: string}>,
    token: vscode.CancellationToken
  ) {
    return {
      invocationMessage: `Setting active context to: ${options.input.context}`,
      confirmationMessages: {
        title: 'Update Active Context',
        message: new vscode.MarkdownString(`Set active context to: **${options.input.context}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<{context: string}>,
    token: vscode.CancellationToken
  ) {
    const memoryManager = MemoryManager.getInstance();
    await memoryManager.updateActiveContext(options.input.context);
    
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(`✅ Active context updated to: ${options.input.context}`)
    ]);
  }
}
```

### 4. Enhanced Memory Manager Integration

```typescript
// src/memory/MemoryManager.ts - Enhanced for tool integration
export class MemoryManager {
  // ... existing code ...

  async updateActiveContext(context: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const content = `\n## Current Focus (${date})\n${context}\n`;
    await this.appendToFile('activeContext.md', content);
    this.emit('contextUpdated', context);
  }

  async logDecision(decision: string, rationale?: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const row = `| ${date} | ${decision} | ${rationale || '-'} |\n`;
    await this.appendToFile('decisionLog.md', row);
    this.emit('decisionLogged', {decision, rationale});
  }

  async updateProgress(done?: string[], doing?: string[], next?: string[]): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const formatItems = (items?: string[]) => 
      items?.map(item => `- ${item}`).join('\n') || '';
    
    const content = `# Progress (Updated: ${date})\n\n` +
      `## Done\n\n${formatItems(done)}\n\n` +
      `## Doing\n\n${formatItems(doing)}\n\n` +
      `## Next\n\n${formatItems(next)}\n`;
    
    await this.writeFile('progress.md', content);
    this.emit('progressUpdated', {done, doing, next});
  }
}
```

## Migration Strategy

### Phase 1: Tool Implementation
1. Create tool classes for each memory bank operation
2. Update package.json with tool definitions
3. Register tools in extension activation

### Phase 2: Enhanced Integration
1. Add context-aware tool availability (when clauses)
2. Implement rich confirmation messages
3. Add tool result formatting

### Phase 3: Advanced Features
1. Tool chaining (tools that call other tools)
2. Dynamic tool availability based on workspace state
3. Integration with existing mode system

### Phase 4: Migration & Cleanup
1. Deprecate old chat participant approach
2. Update documentation
3. Remove legacy command handlers

## Benefits of This Approach

1. **Native Copilot Integration**: Tools appear directly in agent mode
2. **Automatic Context**: Copilot automatically suggests relevant tools
3. **User Safety**: Built-in confirmation flows
4. **Better UX**: Rich parameter validation and error handling
5. **Discoverability**: Tools are automatically listed in Copilot
6. **Maintainability**: Clean separation of concerns

## Example User Workflow

```
User: "I'm working on implementing the authentication system now"
Copilot: "I'll update your active context. Let me use the updateContext tool."
[Tool confirmation dialog appears]
User: "Yes, update it"
Copilot: "✅ Active context updated to: implementing the authentication system"

User: "I decided to use JWT tokens for authentication"
Copilot: "That's an important decision. Let me log it using the logDecision tool."
[Tool confirmation with decision and rationale]
User: "Yes, log it"
Copilot: "✅ Decision logged: Use JWT tokens for authentication"
```

## Implementation Effort

**Low-Medium complexity** - The existing Memory Bank logic can be largely reused, with the main work being:
- Converting commands to tool classes
- Updating package.json tool definitions  
- Refactoring the activation logic
- Enhanced error handling and user feedback
