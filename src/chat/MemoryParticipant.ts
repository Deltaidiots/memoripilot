import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";

/**
 * Represents the Memory Bank chat participant.
 */
export class MemoryParticipant {
  public readonly id = "memory-bank";

  /**
   * Provides a reply to a chat request.
   * @param {vscode.ChatRequest} request The chat request.
   * @param {vscode.ChatContext} _ctx The chat participant context.
   * @param {vscode.ChatResponseStream} stream The chat response stream.
   * @returns {Promise<any>} A promise that resolves when the reply is complete.
   */
  public async handler(
    request: vscode.ChatRequest,
    _ctx: any,
    stream: vscode.ChatResponseStream
  ): Promise<any> {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) {
      stream.markdown("No workspace open.");
      return { commands: [] };
    }

    const mgr = MemoryManager.getInstance(ws);
    await mgr.initialise();
    const summaries = await mgr.getSummaries();

    const sysPrompt =
      "You are GitHub Copilot with project memory.\n\n" +
      summaries
        .map(s => `## ${s.path}\n${s.summary}`)
        .join("\n\n");

    // Using the current VS Code API for language models
    // We can't directly access Copilot's API, so let's respond with our summaries
    try {
      stream.markdown("# Memory Bank Summary\n\n");
      stream.markdown("Here's what I remember about this project:\n\n");
      
      for (const summary of summaries) {
        stream.markdown(`## ${summary.path}\n${summary.summary}\n\n`);
      }
      
      stream.markdown("I don't have access to the Copilot language model directly, but I can show you your project memory.\n\n");
    } catch (error) {
      console.error("Error accessing responding with summaries:", error);
      stream.markdown("Sorry, I encountered an error trying to generate a response.");
    }

    return { commands: [] };
  }
}
