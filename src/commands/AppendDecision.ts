import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";

/**
 * Appends a decision to the decision log.
 * @returns {Promise<void>}
 */
export async function appendDecision(): Promise<void> {
  const input = await vscode.window.showInputBox({
    prompt: "Decision text (will be logged)",
    placeHolder: "Switch DB to Postgres for FTS…"
  });
  if (!input) {
    return;
  }

  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    return;
  }
  const mgr = MemoryManager.getInstance(ws);

  const row = `| ${new Date().toISOString().split("T")[0]} | ${input} | – |`;
  await mgr.appendLine("memory-bank/decisionLog.md", row);
  void vscode.window.showInformationMessage("Decision appended.");
}
