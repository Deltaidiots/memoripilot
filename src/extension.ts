import * as vscode from "vscode";
import { MemoryParticipant } from "./chat/MemoryParticipant";
import { appendDecision } from "./commands/AppendDecision";

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
  ctx.subscriptions.push(
    vscode.commands.registerCommand("memoryBank.appendDecision", appendDecision)
  );
  // Register the other commands
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
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {}
