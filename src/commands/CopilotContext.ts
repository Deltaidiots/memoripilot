import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";
import { CopilotIntegration } from "../copilot/CopilotIntegration";

/**
 * Command to copy the current memory context as a prompt for GitHub Copilot Chat.
 * @returns {Promise<void>}
 */
export async function copilotContext(): Promise<void> {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    void vscode.window.showErrorMessage("No workspace open.");
    return;
  }
  
  const memoryManager = MemoryManager.getInstance(ws);
  const modeManager = ModeManager.getInstance(memoryManager);
  const copilotIntegration = CopilotIntegration.getInstance(memoryManager, modeManager);
  
  try {
    // Generate the prompt
    const prompt = await copilotIntegration.createCopilotSystemPrompt();
    
    // Copy to clipboard
    await vscode.env.clipboard.writeText(prompt);
    
    void vscode.window.showInformationMessage(
      "Memory context copied to clipboard. You can now paste it into GitHub Copilot Chat as a system message."
    );
  } catch (error) {
    console.error("Failed to generate Copilot context:", error);
    void vscode.window.showErrorMessage("Failed to generate context for Copilot.");
  }
}
