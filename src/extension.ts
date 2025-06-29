import * as vscode from "vscode";
import { MemoryManager } from "./memory/MemoryManager";
import { ModeManager } from "./memory/modes/ModeManager";
import { CopilotIntegration } from "./copilot/CopilotIntegration";
import {
  UpdateContextTool,
  LogDecisionTool,
  UpdateProgressTool,
  ShowMemoryTool,
  UpdateMemoryBankTool,
  SwitchModeTool
} from "./tools/index";
import { MemoryParticipant } from "./chat/MemoryParticipant";
import { MemoryTreeDataProvider } from "./ui/MemoryTreeDataProvider";

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
      void initializeMemoryBank(extensionWs);
      const memoryTreeDataProvider = new MemoryTreeDataProvider(extensionWs.uri.fsPath);
      vscode.window.registerTreeDataProvider('memory-bank-view', memoryTreeDataProvider);
    } else {
      // Fallback to the first workspace
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (ws) {
        console.log(`No extension workspace found, using first workspace: ${ws.uri.fsPath}`);
        void initializeMemoryBank(ws);
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
  
  // Register Language Model Tools for GitHub Copilot integration (primary mode)
  registerLanguageModelTools(ctx);
  
  // Register Chat Participant as fallback
  registerChatParticipant(ctx);
  
  // Register essential commands
  registerCommands(ctx);
  
  // Setup status bar
  setupStatusBar(ctx);
}

/**
 * Register Language Model Tools for GitHub Copilot integration
 */
function registerLanguageModelTools(ctx: vscode.ExtensionContext): void {
  try {
    if (vscode.lm && vscode.lm.registerTool) {
      console.log("Registering Language Model Tools...");
      
      ctx.subscriptions.push(
        vscode.lm.registerTool('memory_bank_update_context', new UpdateContextTool()),
        vscode.lm.registerTool('memory_bank_log_decision', new LogDecisionTool()),
        vscode.lm.registerTool('memory_bank_update_progress', new UpdateProgressTool()),
        vscode.lm.registerTool('memory_bank_show_memory', new ShowMemoryTool()),
        vscode.lm.registerTool('memory_bank_update_all', new UpdateMemoryBankTool()),
        vscode.lm.registerTool('memory_bank_switch_mode', new SwitchModeTool())
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
function registerCommands(ctx: vscode.ExtensionContext): void {
  // Test command
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.test", () => {
      void vscode.window.showInformationMessage("Memory Bank extension is active!");
    })
  );

  // Mode selection command
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.selectMode", async () => {
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
    })
  );

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
}

/**
 * Setup status bar items
 */
function setupStatusBar(ctx: vscode.ExtensionContext): void {
  // Create mode status bar item
  modeStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  modeStatusBarItem.text = "$(book) Memory Mode: Ask";
  modeStatusBarItem.tooltip = "Memory Bank Mode (click to change)";
  modeStatusBarItem.command = "memoryBank.selectMode";
  modeStatusBarItem.show();
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
async function initializeMemoryBank(ws: vscode.WorkspaceFolder): Promise<void> {
  try {
    // Initialize memory manager
    memoryManager = MemoryManager.getInstance(ws);
    await memoryManager.initialise();
    
    // Initialize mode manager
    modeManager = ModeManager.getInstance(memoryManager);
    
    // Initialize Copilot integration
    if (memoryManager && modeManager) {
      copilotIntegration = CopilotIntegration.getInstance(memoryManager, modeManager);
      await copilotIntegration.activate(ws);
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
  // Clean up file watchers
  if (memoryManager) {
    memoryManager.stopWatching();
  }
  
  // Deactivate Copilot integration
  if (copilotIntegration) {
    copilotIntegration.deactivate();
  }
  
  console.log("Memory Bank extension deactivated");
}
