import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { MemoryManager } from "./memory/MemoryManager";
import { ModeManager } from "./memory/modes/ModeManager";
import { CopilotIntegration } from "./copilot/CopilotIntegration";
import {
  UpdateContextTool,
  LogDecisionTool,
  UpdateProgressTool,
  ShowMemoryTool,
  UpdateMemoryBankTool,
  SwitchModeTool,
  UpdateProductContextTool,
  UpdateSystemPatternsTool,
  UpdateProjectBriefTool,
  UpdateArchitectTool
} from "./tools/index";
import { MemoryParticipant } from "./chat/MemoryParticipant";
import { MemoryTreeDataProvider } from "./ui/MemoryTreeDataProvider";
import { ChatModeProvider } from "./chat/ChatModeProvider";

// Helper class for cleanup management
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

// Global disposal store to ensure proper cleanup
const disposables = new DisposableStore();

// Global state
let memoryManager: MemoryManager | undefined;
let modeManager: ModeManager | undefined;
let copilotIntegration: CopilotIntegration | undefined;
let modeStatusBarItem: vscode.StatusBarItem | undefined;

/**
 * This method is called when your extension is activated.
 * @param {vscode.ExtensionContext} ctx The extension context.
 */
export function activate(ctx: vscode.ExtensionContext): void {
  // Expose memoryManager and extensionContext for tools fallback
  (globalThis as any).extensionContext = ctx;

  console.log("Memory Bank extension is being activated...");
  
  // Try to get the correct workspace using our utility
  try {
    const { WorkspaceUtil } = require('./utils/WorkspaceUtil');
    
    // Check if we're in development mode
    const inDevelopment = WorkspaceUtil.isInExtensionDevelopmentHost();
    console.log(`Extension activating in development mode: ${inDevelopment}`);
    
    // Log all available workspaces
    const allFolders = vscode.workspace.workspaceFolders || [];
    console.log(`Available workspaces (${allFolders.length}): ${allFolders.map(f => f.name + ': ' + f.uri.fsPath).join(', ')}`);
    
    // Find our extension workspace
    const extensionWs = WorkspaceUtil.getExtensionWorkspace();
    if (extensionWs) {
      console.log(`Using extension workspace for initialization: ${extensionWs.uri.fsPath}`);
      void initializeMemoryBank(extensionWs, ctx);
      const memoryTreeDataProvider = new MemoryTreeDataProvider(extensionWs.uri.fsPath);
      vscode.window.registerTreeDataProvider('memory-bank-view', memoryTreeDataProvider);
    } else {
      // Fallback to the first workspace
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (ws) {
        console.log(`No extension workspace found, using first workspace: ${ws.uri.fsPath}`);
        void initializeMemoryBank(ws, ctx);
        const memoryTreeDataProvider = new MemoryTreeDataProvider(ws.uri.fsPath);
        vscode.window.registerTreeDataProvider('memory-bank-view', memoryTreeDataProvider);
      } else {
        console.log("No workspace folders available");
        
        // Setup a listener for when workspace folders change
        ctx.subscriptions.push(
          vscode.workspace.onDidChangeWorkspaceFolders(e => {
            if (e.added.length > 0 && !memoryManager) {
              void initializeMemoryBank(e.added[0]);
            }
          })
        );
      }
    }
  } catch (error) {
    console.error(`Error during extension activation:`, error);
    
    // Fallback to basic initialization
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (ws) {
      console.log(`Falling back to first workspace: ${ws.uri.fsPath}`);
      void initializeMemoryBank(ws);
      const memoryTreeDataProvider = new MemoryTreeDataProvider(ws.uri.fsPath);
      vscode.window.registerTreeDataProvider('memory-bank-view', memoryTreeDataProvider);
    } else {
      // Setup a listener for when workspace folders change
      ctx.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(e => {
          if (e.added.length > 0 && !memoryManager) {
            void initializeMemoryBank(e.added[0]);
          }
        })
      );
    }
  }
  
  // Register Chat Participant as fallback
  registerChatParticipant(ctx);
  
  // Register essential commands
  registerCommands(ctx, disposables);
  
  // Setup status bar
  setupStatusBar(ctx, disposables);
  
  // After memoryManager is initialized (in initializeMemoryBank or fallback), also initialize ChatModeProvider
  // (Assume memoryManager is set in initializeMemoryBank)
  setTimeout(() => {
    if (memoryManager) {
      const chatModeProvider = ChatModeProvider.getInstance();
      chatModeProvider.initialize(memoryManager, ctx)
        .then(async () => {
          // Check if any templates have updates available
          try {
            const updatesAvailable = await chatModeProvider.checkForTemplateUpdates();
            if (updatesAvailable) {
              const updateNow = 'Update Now';
              const remindLater = 'Remind Later';
              const choice = await vscode.window.showInformationMessage(
                'New chat mode templates are available. Would you like to update them?',
                updateNow,
                remindLater
              );
              
              if (choice === updateNow) {
                const results = await vscode.window.withProgress({
                  location: vscode.ProgressLocation.Notification,
                  title: "Updating chat mode templates...",
                  cancellable: false
                }, async () => {
                  return await chatModeProvider.refreshTemplates(false);
                });
                
                // Show detailed update information
                if (results.updated.length > 0) {
                  const viewDetails = 'View Details';
                  const response = await vscode.window.showInformationMessage(
                    `${results.updated.length} chat mode template(s) updated successfully!`,
                    viewDetails
                  );
                  
                  if (response === viewDetails) {
                    // Create a temporary markdown file with update details
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders) {
                      const tempDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
                      if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                      }
                      
                      const detailsPath = path.join(tempDir, 'template-update-details.md');
                      const detailsContent = `# Chat Mode Template Updates

## Updated Templates
${results.updated.map(file => `- ✅ ${file}`).join('\n')}

${results.backups.length > 0 ? `## Backups Created
${results.backups.map(file => `- 💾 ${file}`).join('\n')}` : ''}

${results.skipped.length > 0 ? `## Skipped Templates (Already Up-to-Date)
${results.skipped.map(file => `- ⏭️ ${file}`).join('\n')}` : ''}

Template files are located in the \`.github/chatmodes/\` directory.
`;
                      fs.writeFileSync(detailsPath, detailsContent);
                      const doc = await vscode.workspace.openTextDocument(detailsPath);
                      await vscode.window.showTextDocument(doc);
                    }
                  }
                } else {
                  void vscode.window.showInformationMessage("All chat mode templates are already up-to-date!");
                }
              }
            }
          } catch (err) {
            console.error('Failed to check for template updates:', err);
          }
        })
        .catch(err => {
          console.error('Failed to initialize ChatModeProvider:', err);
        });
      (globalThis as any).chatModeProvider = chatModeProvider;
    }
  }, 1000);
}

/**
 * Register Language Model Tools for GitHub Copilot integration
 */
function registerLanguageModelTools(ctx: vscode.ExtensionContext): void {
  try {
    if (vscode.lm && vscode.lm.registerTool) {
      console.log("Registering Language Model Tools...");

      // Use the already-initialized managers
      if (!memoryManager || !modeManager) {
        throw new Error("MemoryManager or ModeManager not initialized before tool registration");
      }

      ctx.subscriptions.push(
        vscode.lm.registerTool('memory_bank_update_context', new UpdateContextTool(memoryManager, modeManager)),
        vscode.lm.registerTool('memory_bank_log_decision', new LogDecisionTool(memoryManager, modeManager)),
        vscode.lm.registerTool('memory_bank_update_progress', new UpdateProgressTool(memoryManager, modeManager)),
        vscode.lm.registerTool('memory_bank_show_memory', new ShowMemoryTool(memoryManager, modeManager)),
        // Tool disabled as it's not ready yet
        // vscode.lm.registerTool('memory_bank_update_all', new UpdateMemoryBankTool(memoryManager, modeManager)),
        vscode.lm.registerTool('memory_bank_switch_mode', new SwitchModeTool(memoryManager, modeManager)),
        vscode.lm.registerTool('switchMode', new SwitchModeTool(memoryManager, modeManager)),
        
        // Specialized memory file update tools
        vscode.lm.registerTool('memory_bank_update_product_context', new UpdateProductContextTool(memoryManager, modeManager)),
        vscode.lm.registerTool('memory_bank_update_system_patterns', new UpdateSystemPatternsTool(memoryManager, modeManager)),
        vscode.lm.registerTool('memory_bank_update_project_brief', new UpdateProjectBriefTool(memoryManager, modeManager)),
        vscode.lm.registerTool('memory_bank_update_architect', new UpdateArchitectTool(memoryManager, modeManager))
      );

      console.log("Language Model Tools registered successfully!");
      void vscode.window.showInformationMessage("Memory Bank tools registered for GitHub Copilot!");
    } else {
      console.warn("Language Model Tools API not available - falling back to chat participant only");
      void vscode.window.showWarningMessage("Language Model Tools API not available. Using chat participant mode only.");
    }
  } catch (error) {
    console.error("Failed to register Language Model Tools:", error);
    void vscode.window.showWarningMessage(`Failed to register Memory Bank tools: ${error}. Using chat participant mode only.`);
  }
}

/**
 * Register VS Code Chat Participant as fallback
 */
function registerChatParticipant(ctx: vscode.ExtensionContext): void {
  if (!vscode.chat) {
    console.warn("VS Code Chat API is not available - Language Model Tools only");
    return;
  }

  try {
    const participant = new MemoryParticipant();
    console.log("Attempting to register chat participant with ID:", participant.id);
    
    if (vscode.chat.createChatParticipant) {
      const chatParticipant = vscode.chat.createChatParticipant(
        participant.id, 
        participant.handler.bind(participant)
      );
      ctx.subscriptions.push(chatParticipant);
      console.log("Memory Bank chat participant registered successfully!");
    } else {
      console.error("vscode.chat.createChatParticipant is not available");
    }
  } catch (error) {
    console.error("Failed to register Memory Bank chat participant:", error);
  }
}

/**
 * Register essential commands
 */
function registerCommands(ctx: vscode.ExtensionContext, store: DisposableStore): void {
  // Test command
  const testCommand = vscode.commands.registerCommand("memoryBank.test", () => {
    void vscode.window.showInformationMessage("Memory Bank extension is active!");
  });
  store.add(testCommand);
  ctx.subscriptions.push(testCommand);

  // Mode selection command
  const selectModeCommand = vscode.commands.registerCommand("memoryBank.selectMode", async () => {
    if (!modeManager) {
      void vscode.window.showErrorMessage("Memory Bank not initialized. Please open a workspace.");
      return;
    }
    
    const modes = ["Architect", "Code", "Ask", "Debug"];
    const selected = await vscode.window.showQuickPick(modes, {
      placeHolder: "Select Memory Bank mode"
    });
    
    if (selected) {
      const modeId = selected.toLowerCase();
      modeManager.setMode(modeId);
      updateStatusBar(selected);
    }
  });
  store.add(selectModeCommand);
  ctx.subscriptions.push(selectModeCommand);

  // Manual command processor (keyboard shortcut)
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.processCommand", async () => {
      const action = await vscode.window.showQuickPick([
        "Open GitHub Copilot Chat (Recommended)",
        "Open VS Code Chat (Fallback)",
        "Show Memory Bank Status"
      ], {
        placeHolder: "How would you like to interact with Memory Bank?"
      });
      
      if (action?.includes("GitHub Copilot")) {
        void vscode.commands.executeCommand("workbench.panel.chat.view.copilot.focus");
        void vscode.window.showInformationMessage("Use GitHub Copilot Chat! Just say things like 'I'm working on authentication' and Memory Bank tools will be suggested automatically.");
      } else if (action?.includes("VS Code Chat")) {
        void vscode.commands.executeCommand("workbench.panel.chat.view.focus");
        void vscode.window.showInformationMessage("Select 'memory-bank' from the chat participant dropdown and say hello!");
      } else if (action?.includes("Status")) {
        const mode = modeManager?.currentMode.name || "Unknown";
        void vscode.window.showInformationMessage(`Memory Bank is active in ${mode} mode. Use GitHub Copilot Chat for the best experience!`);
      }
    })
  );

  // Template refresh command
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.refreshTemplates", async () => {
      try {
        const chatProvider = ChatModeProvider.getInstance();
        
        const options = [
          { label: "Yes, update all templates", detail: "Overwrite existing templates with the latest versions from the extension" },
          { label: "No, only update if newer", detail: "Update templates only if they have a newer version" },
          { label: "Cancel", detail: "Don't update any templates" }
        ];
        
        const selection = await vscode.window.showQuickPick(options, {
          placeHolder: "How would you like to update chat mode templates?",
          ignoreFocusOut: true
        });
        
        if (!selection || selection.label === "Cancel") {
          return;
        }
        
        const forceUpdate = selection.label === "Yes, update all templates";
        
        const results = await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Refreshing chat mode templates...",
          cancellable: false
        }, async () => {
          return await chatProvider.refreshTemplates(forceUpdate);
        });
        
        // Show detailed update information
        if (results.updated.length > 0) {
          const viewDetails = 'View Details';
          const response = await vscode.window.showInformationMessage(
            `${results.updated.length} chat mode template(s) updated successfully!`,
            viewDetails
          );
          
          if (response === viewDetails) {
            // Create a temporary markdown file with update details
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
              const tempDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              
              const detailsPath = path.join(tempDir, 'template-update-details.md');
              const detailsContent = `# Chat Mode Template Updates

## Updated Templates
${results.updated.map(file => `- ✅ ${file}`).join('\n')}

${results.backups.length > 0 ? `## Backups Created
${results.backups.map(file => `- 💾 ${file}`).join('\n')}` : ''}

${results.skipped.length > 0 ? `## Skipped Templates (Already Up-to-Date)
${results.skipped.map(file => `- ⏭️ ${file}`).join('\n')}` : ''}

Template files are located in the \`.github/chatmodes/\` directory.
`;
              fs.writeFileSync(detailsPath, detailsContent);
              const doc = await vscode.workspace.openTextDocument(detailsPath);
              await vscode.window.showTextDocument(doc);
            }
          }
        } else {
          void vscode.window.showInformationMessage("All chat mode templates are already up-to-date!");
        }
      } catch (error) {
        void vscode.window.showErrorMessage(`Failed to refresh templates: ${error instanceof Error ? error.message : String(error)}`);
      }
    })
  );
}

/**
 * Setup status bar items
 */
function setupStatusBar(ctx: vscode.ExtensionContext, store: DisposableStore): void {
  // Create mode status bar item
  modeStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  modeStatusBarItem.text = "$(book) Memory Mode: Ask";
  modeStatusBarItem.tooltip = "Memory Bank Mode (click to change)";
  modeStatusBarItem.command = "memoryBank.selectMode";
  modeStatusBarItem.show();
  
  // Add to both the extension context and our disposable store
  store.add(modeStatusBarItem);
  ctx.subscriptions.push(modeStatusBarItem);
}

/**
 * Update the status bar with current mode
 */
function updateStatusBar(modeName: string): void {
  if (modeStatusBarItem) {
    modeStatusBarItem.text = `$(book) Memory Mode: ${modeName}`;
  }
}

/**
 * Initialize the Memory Bank services when a workspace is available.
 * @param ws The workspace folder
 */
async function initializeMemoryBank(ws: vscode.WorkspaceFolder, ctx?: vscode.ExtensionContext): Promise<void> {
  try {
    // Initialize memory manager
    memoryManager = MemoryManager.getInstance(ws);
    await memoryManager.initialise();
    (globalThis as any).memoryManager = memoryManager;
    modeManager = ModeManager.getInstance(memoryManager);
    if (memoryManager && modeManager) {
      copilotIntegration = CopilotIntegration.getInstance(memoryManager, modeManager);
      await copilotIntegration.activate(ws);
    }
    const chatModeProvider = ChatModeProvider.getInstance();
    chatModeProvider.registerMode('memoripilot.ask');
    chatModeProvider.registerMode('memoripilot.architect');
    chatModeProvider.registerMode('memoripilot.code');
    chatModeProvider.registerMode('memoripilot.debug');
    // Register tools only after managers are ready
    if (ctx) {
      registerLanguageModelTools(ctx);
    }
    console.log("Memory Bank services initialized");
    void vscode.window.showInformationMessage("Memory Bank initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize Memory Bank:", error);
    void vscode.window.showErrorMessage(`Failed to initialize Memory Bank: ${error}`);
  }
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {
  // Log deactivation with stack trace
  console.log('[Memory Bank] Deactivation called. Stack:', new Error().stack);
  
  try {
    console.log('[Memory Bank] Beginning controlled deactivation sequence...');
    
    // First, deactivate Copilot integration to stop any active processes
    if (copilotIntegration) {
      console.log('[Memory Bank] Deactivating Copilot integration...');
      copilotIntegration.deactivate();
      copilotIntegration = undefined;
    }
    
    // Next, dispose ChatModeProvider before MemoryManager
    try {
      const chatModeProvider = ChatModeProvider.getInstance();
      if (chatModeProvider) {
        console.log('[Memory Bank] Disposing ChatModeProvider...');
        chatModeProvider.dispose();
      }
    } catch (err) {
      console.error('[Memory Bank] Error disposing ChatModeProvider:', err);
    }
    
    // Clean up memory manager and file watchers
    try {
      if (memoryManager) {
        console.log('[Memory Bank] Stopping file watchers...');
        memoryManager.stopWatching();
        memoryManager = undefined;
      }
    } catch (err) {
      console.error('[Memory Bank] Error stopping file watchers:', err);
    }
    
    // Clear mode manager reference
    modeManager = undefined;
    
    // Clear status bar
    if (modeStatusBarItem) {
      try {
        modeStatusBarItem.dispose();
      } catch (err) {
        console.error('[Memory Bank] Error disposing status bar item:', err);
      }
      modeStatusBarItem = undefined;
    }
    
    // Finally, dispose all remaining disposables in the store
    console.log('[Memory Bank] Disposing remaining resources...');
    if (disposables && !disposables.isDisposed) {
      disposables.dispose();
    }
    
    console.log('[Memory Bank] Extension successfully deactivated');
  } catch (error) {
    console.error('[Memory Bank] Error during deactivation:', error);
  }
}
