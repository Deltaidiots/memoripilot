import * as vscode from "vscode";
import { MemoryParticipant } from "./chat/MemoryParticipant";
import { appendDecision } from "./commands/AppendDecision";
import { MemoryManager } from "./memory/MemoryManager";
import { ModeManager } from "./memory/modes/ModeManager";
import { SessionManager } from "./memory/SessionManager";
import { CopilotIntegration } from "./copilot/CopilotIntegration";
import { CopilotCommandHandler } from "./copilot/CopilotCommandHandler";
import {
  UpdateContextTool,
  LogDecisionTool,
  UpdateProgressTool,
  ShowMemoryTool,
  UpdateMemoryBankTool,
  SwitchModeTool
} from "./tools/index";

let memoryManager: MemoryManager | undefined;
let modeManager: ModeManager | undefined;
let sessionManager: SessionManager | undefined;
let copilotIntegration: CopilotIntegration | undefined;
let commandHandler: CopilotCommandHandler | undefined;

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 * @param {vscode.ExtensionContext} ctx The extension context.
 */
export function activate(ctx: vscode.ExtensionContext): void {
  console.log("Memory Bank extension is being activated...");
  
  // Register a simple test command to verify the extension is working
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.test", () => {
      vscode.window.showInformationMessage("Memory Bank extension is active!");
    })
  );

  // Check if chat API is available
  if (!vscode.chat) {
    console.error("VS Code Chat API is not available in this version");
    vscode.window.showErrorMessage("Memory Bank requires VS Code Chat API, which is not available in this version.");
    return;
  } else {
    console.log("VS Code Chat API is available");
  }
  
  // Initialize when we have a workspace open
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (ws) {
    initializeMemoryBank(ws);
  } else {
    // Setup a listener for when workspace folders change
    ctx.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(e => {
        if (e.added.length > 0 && !memoryManager) {
          initializeMemoryBank(e.added[0]);
        }
      })
    );
  }
  
  // Create the memory participant handler
  const participant = new MemoryParticipant();
  
  // Attempt to register the chat participant
  try {
    console.log("Attempting to register chat participant with ID:", participant.id);
    
    // Use the createChatParticipant method with the participant's handler
    if (vscode.chat && vscode.chat.createChatParticipant) {
      const chatParticipant = vscode.chat.createChatParticipant(
        participant.id, 
        participant.handler.bind(participant)
      );
      console.log("Chat participant created:", chatParticipant);
      ctx.subscriptions.push(chatParticipant);
      console.log("Memory Bank chat participant registered successfully!");
    } else {
      console.error("vscode.chat.createChatParticipant is not available");
      vscode.window.showWarningMessage("Memory Bank: Chat API not fully available. Some features may not work.");
    }
  } catch (error) {
    console.error("Failed to register Memory Bank chat participant:", error);
    vscode.window.showErrorMessage(`Failed to register Memory Bank: ${error}`);
  }
  
  // Register Language Model Tools for GitHub Copilot integration
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
      vscode.window.showInformationMessage("Memory Bank tools registered for GitHub Copilot!");
    } else {
      console.warn("Language Model Tools API not available - falling back to chat participant only");
      vscode.window.showWarningMessage("Language Model Tools API not available. Using chat participant mode only.");
    }
  } catch (error) {
    console.error("Failed to register Language Model Tools:", error);
    vscode.window.showWarningMessage(`Failed to register Memory Bank tools: ${error}. Using chat participant mode only.`);
  }
  
  // Register commands
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.appendDecision", appendDecision)
  );
  
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.setActiveContext", async () => {
      const module = await import("./commands/SetActiveContext.js");
      return module.setActiveContext();
    })
  );
  
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.showMemory", async () => {
      const module = await import("./commands/ShowMemory.js");
      return module.showMemory();
    })
  );
  
  // Register the update memory bank command
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.updateMemoryBank", async () => {
      const module = await import("./commands/UpdateMemoryBank.js");
      return module.updateMemoryBank();
    })
  );
  
  // Register the Copilot context command
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.copilotContext", async () => {
      const module = await import("./commands/CopilotContext.js");
      return module.copilotContext();
    })
  );
  
  // Register the process Memory Bank command
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.processCommand", async () => {
      const module = await import("./commands/ProcessCommand.js");
      return module.processMemoryBankCommand();
    })
  );
  
  // Register the GitHub Copilot command registration
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.registerCopilotCommand", async () => {
      const module = await import("./commands/RegisterCopilotCommand.js");
      return module.registerGitHubCopilotCommand();
    })
  );
  
  // Create a status bar item for the current mode
  const modeStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  modeStatusBarItem.text = "$(book) Memory Mode: Ask";
  modeStatusBarItem.tooltip = "Memory Bank Mode (click to change)";
  modeStatusBarItem.command = "memoryBank.selectMode";
  modeStatusBarItem.show();
  ctx.subscriptions.push(modeStatusBarItem);
  
  // Create a status bar item for GitHub Copilot integration
  const copilotStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    99
  );
  copilotStatusBarItem.text = "$(copilot) Memory → Copilot";
  copilotStatusBarItem.tooltip = "Copy Memory Bank context to GitHub Copilot Chat";
  copilotStatusBarItem.command = "memoryBank.copilotContext";
  copilotStatusBarItem.show();
  ctx.subscriptions.push(copilotStatusBarItem);
  
  // Create the select mode command
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.selectMode", async () => {
      if (!modeManager) {
        return;
      }
      
      const modes = ["Architect", "Code", "Ask", "Debug"];
      const selected = await vscode.window.showQuickPick(modes, {
        placeHolder: "Select Memory Bank mode"
      });
      
      if (selected) {
        const modeId = selected.toLowerCase();
        modeManager.setMode(modeId);
        modeStatusBarItem.text = `$(book) Memory Mode: ${selected}`;
      }
    })
  );
}

/**
 * Initialize the Memory Bank services when a workspace is available.
 * @param ws The workspace folder
 */
async function initializeMemoryBank(ws: vscode.WorkspaceFolder): Promise<void> {
  // Initialize memory manager
  memoryManager = MemoryManager.getInstance(ws);
  await memoryManager.initialise();
  
  // Initialize mode manager
  modeManager = ModeManager.getInstance(memoryManager);
  
  // Initialize session manager
  if (memoryManager && modeManager) {
    sessionManager = SessionManager.getInstance(ws, memoryManager, modeManager);
    
    // Initialize Copilot integration
    copilotIntegration = CopilotIntegration.getInstance(memoryManager, modeManager);
    await copilotIntegration.activate(ws);
    
    // Initialize command handler for GitHub Copilot Chat commands
    commandHandler = CopilotCommandHandler.getInstance(memoryManager, modeManager);
    commandHandler.enable();
  }
  
  console.log("Memory Bank services initialized");
  vscode.window.showInformationMessage("Memory Bank initialized successfully!");
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {
  // Clean up file watchers
  if (memoryManager) {
    memoryManager.stopWatching();
  }
  
  // Update memory bank with any pending changes
  if (sessionManager) {
    void sessionManager.updateMemoryBank();
  }
  
  // Deactivate Copilot integration
  if (copilotIntegration) {
    copilotIntegration.deactivate();
  }
  
  // Disable command handler
  if (commandHandler) {
    commandHandler.disable();
    commandHandler.dispose();
  }
  
  console.log("Memory Bank extension deactivated");
}
