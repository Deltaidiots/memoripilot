import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";
import { CopilotCommandHandler } from "../copilot/CopilotCommandHandler";

/**
 * Command to register a Memory Bank command with GitHub Copilot
 * @returns {Promise<void>}
 */
export async function registerGitHubCopilotCommand(): Promise<void> {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    void vscode.window.showErrorMessage("No workspace open.");
    return;
  }
  
  // Get command information
  const command = await vscode.window.showInputBox({
    prompt: "Enter a command to register with Copilot (without '/mb-' prefix)",
    placeHolder: "help"
  });
  
  if (!command) {
    return;
  }
  
  // Copy a command template to clipboard
  const commandTemplate = `/mb-${command}`;
  
  // Copy to clipboard
  await vscode.env.clipboard.writeText(commandTemplate);
  
  // Show confirmation
  vscode.window.showInformationMessage(
    `Command '${commandTemplate}' copied to clipboard. You can now paste and use it in GitHub Copilot Chat.`
  );
}
