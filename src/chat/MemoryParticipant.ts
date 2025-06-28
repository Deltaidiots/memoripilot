import * as vscode from "vscode";
import { MemoryManager, MemoryContentChangeEvent } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";
import { SessionManager } from "../memory/SessionManager";
import { Mode } from "../memory/modes/Mode";

/**
 * Represents the Memory Bank chat participant.
 */
export class MemoryParticipant {
  public readonly id = "memory-bank";
  private memoryManager?: MemoryManager;
  private modeManager?: ModeManager;
  private sessionManager?: SessionManager;
  private activeSessions: Map<string, string> = new Map();
  
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
    
    if (!this.sessionManager) {
      this.sessionManager = SessionManager.getInstance(
        workspace, 
        this.memoryManager, 
        this.modeManager
      );
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
    
    if (!this.memoryManager || !this.modeManager || !this.sessionManager) {
      stream.markdown("Failed to initialize Memory Bank services.");
      return { commands: [] };
    }
    
    // Generate a unique identifier for this conversation
    const conversationId = `chat-${Date.now()}`;
    
    // Track the chat session
    let sessionId = this.activeSessions.get(conversationId);
    if (!sessionId) {
      // Create a new session if this is a new conversation
      sessionId = this.sessionManager.createSession(request);
      this.activeSessions.set(conversationId, sessionId);
    } else {
      // Add message to existing session
      this.sessionManager.addMessage(
        sessionId, 
        request.prompt, 
        undefined,
        undefined
      );
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
      stream.markdown(`# Memory Bank (${currentMode.name} Mode)\n\n`);
      stream.markdown(`${currentMode.description}\n\n`);
      
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
      stream.markdown("## Using Memory Bank with GitHub Copilot Chat\n\n");
      stream.markdown("Type these commands directly in GitHub Copilot Chat:\n\n");
      stream.markdown("- `/mb-init` - Initialize memory bank files\n");
      stream.markdown("- `/mb-update` - Update memory bank based on workspace\n");
      stream.markdown("- `/mb-show [file]` - Show memory bank file\n");
      stream.markdown("- `/mb-decision <text>` - Log a new decision\n");
      stream.markdown("- `/mb-context <text>` - Set your active context\n");
      stream.markdown("- `/mb-mode <mode>` - Switch mode (architect, code, ask, debug)\n");
      stream.markdown("- `/mb-help` - Show all commands\n\n");
      
      stream.markdown("You can also press `Ctrl+Shift+P` and type \"Memory Bank: Run Command\" to access all commands.\n");
    } catch (error) {
      console.error("Error responding with summaries:", error);
      stream.markdown("Sorry, I encountered an error trying to generate a response.");
    }

    const availableCommands = [
      "memoryBank.setActiveContext",
      "memoryBank.appendDecision",
      "memoryBank.showMemory",
      "memoryBank.updateMemoryBank" 
    ];

    return { commands: availableCommands };
  }
}
