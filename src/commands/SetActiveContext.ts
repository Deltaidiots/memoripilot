import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";

/**
 * Command to set the active context for the memory bank.
 * @returns {Promise<void>}
 */
export async function setActiveContext(): Promise<void> {
  const input = await vscode.window.showInputBox({
    prompt: "Enter your current focus (will be saved to activeContext.md)",
    placeHolder: "Working on authentication flow..."
  });
  if (!input) {
    return;
  }

  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    return;
  }
  const mgr = MemoryManager.getInstance(ws);

  await mgr.appendLine("memory-bank/activeContext.md", input);
  void vscode.window.showInformationMessage("Active context updated.");
}
