# Memory Bank EDH Testing Guide

## Quick Start Testing in Extension Development Host

### 1. Launch Extension Development Host
1. **Open this project** in VS Code
2. **Press F5** (or Run > Start Debugging)
3. A new VS Code window will open with the extension loaded

### 2. Set Up Test Workspace
In the new EDH window:
1. **Open a folder** (File > Open Folder) - create a test project folder
2. The extension will automatically activate when you open a workspace

### 3. Test GitHub Copilot Chat Integration (Primary)

#### Natural Language Testing:
Open GitHub Copilot Chat and try these phrases:

```
"I'm working on implementing user authentication"
→ Should suggest #updateContext tool

"I decided to use PostgreSQL for the database" 
→ Should suggest #logDecision tool

"I finished the login page and started on the dashboard"
→ Should suggest #updateProgress tool

"Show me what's in my progress file"
→ Should suggest #showMemory tool

"Switch to architect mode"
→ Should suggest #switchMode tool
```

#### Direct Tool Testing:
```
#updateContext Set active context to implementing user registration
#logDecision decision:"Use React" rationale:"Better component reusability"
#updateProgress done:["Setup"] doing:["Auth"] next:["Dashboard"]
#showMemory fileName:"decisionLog.md"
#switchMode mode:"code"
```

### 4. Test Fallback Mode (Secondary)

If GitHub Copilot tools don't appear:
1. **Open VS Code Chat** (View > Chat)
2. **Select "memory"** from the participant dropdown
3. **Type "hello"** to get project summaries

### 5. Test Manual Commands
Press `Ctrl+Alt+M` (or `Cmd+Alt+M` on Mac) and test:
- "Open GitHub Copilot Chat (Recommended)"
- "Open VS Code Chat (Fallback)" 
- "Show Memory Bank Status"

### 6. Verify Memory Bank Files
Check that these files are created in `memory-bank/` directory:
- `activeContext.md`
- `productContext.md`
- `progress.md`
- `decisionLog.md`
- `projectBrief.md`
- `systemPatterns.md`

### 7. Test Status Bar
- Look for **Memory Mode indicator** in status bar
- Click it to switch modes
- Verify mode changes are reflected

### 8. Test Mode Switching
Try all four modes:
- **Architect**: "I need to design the system architecture"
- **Code**: "I need to implement the login function"
- **Ask**: "What is the purpose of this project?"
- **Debug**: "There's a bug in the authentication"

## Expected Results ✅

### GitHub Copilot Chat
- ✅ Tools appear automatically in suggestions
- ✅ Confirmation dialogs show before operations
- ✅ Success messages after operations
- ✅ Memory bank files are updated

### Fallback Mode
- ✅ Chat participant "memory" is available
- ✅ Provides project summaries
- ✅ Guides users to GitHub Copilot Chat

### Manual Commands
- ✅ `Ctrl+Alt+M` opens command picker
- ✅ Options guide to appropriate chat interfaces
- ✅ Status shows current mode

## Troubleshooting 🔧

### Tools Don't Appear in Copilot Chat
1. **Restart EDH**: Close and press F5 again
2. **Check VS Code version**: Must be 1.101.0+
3. **Verify GitHub Copilot**: Must be installed and active
4. **Check console**: Open Developer Tools (Help > Toggle Developer Tools)

### Extension Not Activating
1. **Check output**: View > Output > Select "Memory Bank"
2. **Verify workspace**: Must have a folder open
3. **Check activation events**: Look for activation messages

### Memory Bank Files Not Created
1. **Check workspace permissions**: Ensure write access
2. **Try manual trigger**: Use any Memory Bank tool
3. **Check file system**: Look in `<workspace>/memory-bank/`

## Debug Information 🔍

### Console Logs to Check:
```
"Memory Bank extension is being activated..."
"Language Model Tools registered successfully!"
"Memory Bank is active in <mode> mode"
```

### Commands to Test:
```
Developer: Reload Window
Memory Bank: Test Activation
Memory Bank: Select Mode
```

### Files to Monitor:
- Check if `memory-bank/` directory is created
- Verify file templates are populated
- Monitor file updates when using tools

## Performance Testing 🚀

Test these scenarios:
1. **Large context**: Try updating with very long text
2. **Rapid operations**: Quickly use multiple tools
3. **Mode switching**: Rapidly switch between modes
4. **Concurrent usage**: Use multiple tools simultaneously

## Report Issues 📝

If you find issues, note:
- VS Code version
- GitHub Copilot status
- Console error messages
- Steps to reproduce
- Expected vs actual behavior

---

**Happy Testing!** 🎉

The extension has comprehensive test coverage and should work smoothly in EDH mode.
