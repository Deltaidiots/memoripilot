import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";

/**
 * Command to show the memory bank files in the editor.
 * @returns {Promise<void>}
 */
export async function showMemory(): Promise<void> {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    void vscode.window.showErrorMessage("No workspace open.");
    return;
  }
  
  const mgr = MemoryManager.getInstance(ws);
  await mgr.initialise();
  
  // Get memory file paths from FILE_TEMPLATES
  const { FILE_TEMPLATES } = await import("../memory/FileTemplates.js");
  const options = Object.keys(FILE_TEMPLATES).map(path => {
    return {
      label: path.split("/").pop() || path,
      description: path,
    };
  });

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: "Select memory file to view",
  });

  if (selected) {
    const uri = vscode.Uri.joinPath(ws.uri, selected.description);
    await vscode.commands.executeCommand("vscode.open", uri);
  }
}
