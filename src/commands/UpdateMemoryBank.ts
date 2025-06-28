import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";
import { SessionManager } from "../memory/SessionManager";
import { ModeManager } from "../memory/modes/ModeManager";

/**
 * Command to manually update the memory bank.
 * @returns {Promise<void>}
 */
export async function updateMemoryBank(): Promise<void> {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    void vscode.window.showErrorMessage("No workspace open.");
    return;
  }
  
  const memoryManager = MemoryManager.getInstance(ws);
  const modeManager = ModeManager.getInstance(memoryManager);
  const sessionManager = SessionManager.getInstance(ws, memoryManager, modeManager);
  
  const success = await sessionManager.updateMemoryBank();
  
  if (success) {
    void vscode.window.showInformationMessage("Memory bank updated successfully.");
  } else {
    void vscode.window.showWarningMessage("No active session found to update memory bank.");
  }
}
