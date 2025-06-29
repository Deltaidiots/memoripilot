# Memory Bank Language Model Tools Test

This file demonstrates how the new Language Model Tools integration works.

## Available Tools

1. **memory_bank_update_context** - Updates active context
2. **memory_bank_log_decision** - Logs architectural decisions  
3. **memory_bank_update_progress** - Updates progress tracking
4. **memory_bank_show_memory** - Shows memory file contents
5. **memory_bank_update_all** - Updates entire memory bank
6. **memory_bank_switch_mode** - Switches working modes

## Example GitHub Copilot Chat Interactions

### Natural Language Examples:

**User**: "I'm working on implementing the authentication system now"
**Expected**: Copilot suggests using `memory_bank_update_context` tool

**User**: "I decided to use JWT tokens for authentication"  
**Expected**: Copilot suggests using `memory_bank_log_decision` tool

**User**: "I finished the login page and started on the dashboard"
**Expected**: Copilot suggests using `memory_bank_update_progress` tool

**User**: "Show me what's in my decision log"
**Expected**: Copilot suggests using `memory_bank_show_memory` tool

**User**: "Switch to architect mode"
**Expected**: Copilot suggests using `memory_bank_switch_mode` tool

### Direct Tool References:

**User**: "#updateContext I'm implementing user registration"
**User**: "#logDecision decision:'Use PostgreSQL' rationale:'Better ACID compliance'"  
**User**: "#showMemory fileName:'progress.md'"
**User**: "#switchMode mode:'debug'"

## Tool Activation Flow

1. User makes a request in GitHub Copilot Chat
2. Copilot analyzes the request and suggests appropriate Memory Bank tool
3. User sees confirmation dialog with operation details
4. User approves the operation
5. Tool executes and updates memory bank files
6. User gets confirmation with results

## Testing in Extension Development Host

1. Press F5 to launch extension in debug mode
2. Open GitHub Copilot Chat in the new window
3. Try the natural language examples above
4. Verify tools appear in Copilot's suggestions
5. Test confirmation dialogs and file updates

## Fallback Mode

If Language Model Tools API isn't available:
- Extension falls back to VS Code Chat participant (`@memory`)
- Manual commands via `Ctrl+Alt+M` keyboard shortcut
- Status bar integration still works
