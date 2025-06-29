import * as vscode from "vscode";
import { MemoryManager, MemoryContentChangeEvent } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";
import { Mode } from "../memory/modes/Mode";

/**
 * Represents the Memory Bank chat participant.
 * This serves as a fallback when Language Model Tools API is not available.
 */
export class MemoryParticipant {
  public readonly id = "memory-bank";
  private memoryManager?: MemoryManager;
  private modeManager?: ModeManager;
  
  /**
   * Initialize the managers needed for the participant.
   * @param workspace The workspace folder
   */
  private async initialize(workspace: vscode.WorkspaceFolder): Promise<void> {
    if (!this.memoryManager) {
      this.memoryManager = MemoryManager.getInstance(workspace);
      await this.memoryManager.initialise();
      
      // Listen for content changes
      this.memoryManager.on("contentChanged", this.handleContentChange.bind(this));
    }
    
    if (!this.modeManager) {
      this.modeManager = ModeManager.getInstance(this.memoryManager);
    }
  }
  
  /**
   * Handle memory content changes.
   * @param event The content change event
   */
  private handleContentChange(event: MemoryContentChangeEvent): void {
    console.log(`Memory content changed: ${event.file}`);
    // Could use this to notify users of updates if needed
  }

  /**
   * Detect mode based on the user's prompt and switch if needed.
   * @param prompt The user's prompt
   */
  private detectAndSwitchMode(prompt: string): Mode {
    if (!this.modeManager) {
      throw new Error("ModeManager not initialized");
    }
    
    // Try to detect mode from prompt
    const detectedModeId = this.modeManager.detectMode(prompt);
    
    if (detectedModeId) {
      // Switch mode if detected
      this.modeManager.setMode(detectedModeId);
      console.log(`Switched to ${this.modeManager.currentMode.name} mode`);
    }
    
    return this.modeManager.currentMode;
  }

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

    // Initialize the managers if needed
    await this.initialize(ws);
    
    if (!this.memoryManager || !this.modeManager) {
      stream.markdown("Failed to initialize Memory Bank services.");
      return { commands: [] };
    }
    
    // Detect and switch mode based on prompt
    const currentMode = this.detectAndSwitchMode(request.prompt);

    // Get summaries of memory files
    const summaries = await this.memoryManager.getSummaries();
    
    // Filter summaries based on current mode's read permissions
    const modeSummaries = summaries.filter(s => 
      currentMode.readFiles.includes(s.path)
    );

    try {
      stream.markdown(`# Memory Bank (${currentMode.name} Mode) - Fallback Chat\n\n`);
      stream.markdown(`${currentMode.description}\n\n`);
      stream.markdown("**Note**: This is fallback mode. For the best experience, use GitHub Copilot Chat where Memory Bank tools are automatically available.\n\n");
      
      // Show relevant summaries based on mode
      if (modeSummaries.length > 0) {
        stream.markdown("## Project Memory\n\n");
        
        for (const summary of modeSummaries) {
          const filename = summary.path.split("/").pop();
          stream.markdown(`### ${filename}\n${summary.summary}\n\n`);
        }
      } else {
        stream.markdown("No relevant memory files for this mode.\n\n");
      }
      
      // Show instructions for GitHub Copilot Chat
      stream.markdown("## Recommended: Use GitHub Copilot Chat\n\n");
      stream.markdown("For best results, use GitHub Copilot Chat where Memory Bank tools are integrated:\n\n");
      stream.markdown("- Just say \"I'm working on the authentication system\" and Copilot will suggest using Memory Bank tools\n");
      stream.markdown("- Tools like `#updateContext`, `#logDecision`, `#updateProgress` are automatically available\n");
      stream.markdown("- No need to remember commands - just talk naturally!\n\n");
      
      stream.markdown("## Manual Commands (Fallback)\n\n");
      stream.markdown("If needed, you can use these VS Code commands:\n\n");
      stream.markdown("- `Ctrl+Shift+P` → \"Memory Bank: Select Mode\" - Switch working mode\n");
      stream.markdown("- `Ctrl+Alt+M` → Manual command input\n");
      
    } catch (error) {
      console.error("Error responding with summaries:", error);
      stream.markdown("Sorry, I encountered an error trying to generate a response.");
    }

    return { commands: [] };
  }
}
