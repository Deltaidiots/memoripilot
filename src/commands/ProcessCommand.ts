import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";
import { CopilotCommandHandler } from "../copilot/CopilotCommandHandler";

/**
 * Command to process memory bank commands directly
 * @returns {Promise<void>}
 */
export async function processMemoryBankCommand(): Promise<void> {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    void vscode.window.showErrorMessage("No workspace open.");
    return;
  }
  
  // Get the command input
  const command = await vscode.window.showInputBox({
    prompt: "Enter Memory Bank command (e.g., /mb-help)",
    placeHolder: "/mb-"
  });
  
  if (!command) {
    return;
  }
  
  // Process the command
  const memoryManager = MemoryManager.getInstance(ws);
  const modeManager = ModeManager.getInstance(memoryManager);
  const commandHandler = CopilotCommandHandler.getInstance(memoryManager, modeManager);
  
  try {
    const result = await commandHandler.processCommand(command);
    void vscode.window.showInformationMessage(result);
  } catch (error) {
    console.error("Error processing command:", error);
    void vscode.window.showErrorMessage(`Error: ${error}`);
  }
}
