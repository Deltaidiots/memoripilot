import * as vscode from "vscode";
import { MemoryManager, SummarisedMemory } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";
import path from "path";

/**
 * Handles integration with GitHub Copilot by providing context in ways
 * that Copilot can access, even without direct API access.
 */
export class CopilotIntegration {
  private static _instance: CopilotIntegration | null = null;
  private _memoryManager: MemoryManager;
  private _modeManager: ModeManager;
  private _contextFileUri?: vscode.Uri;
  private _disposable: vscode.Disposable;
  private _isActive = false;

  private constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    this._memoryManager = memoryManager;
    this._modeManager = modeManager;
    
    // Listen for editor changes to inject context when appropriate
    const subscriptions: vscode.Disposable[] = [];
    
    // When editor becomes active, check if we should inject context
    subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        if (this._isActive) {
          this.updateCopilotContext();
        }
      })
    );
    
    // Memory content changes should update context
    this._memoryManager.on("contentChanged", () => {
      if (this._isActive) {
        this.updateCopilotContext();
      }
    });
    
    this._disposable = vscode.Disposable.from(...subscriptions);
  }
  
  /**
   * Get the singleton instance of CopilotIntegration
   * @param memoryManager The memory manager instance
   * @param modeManager The mode manager instance
   * @returns The CopilotIntegration instance
   */
  public static getInstance(
    memoryManager: MemoryManager,
    modeManager: ModeManager
  ): CopilotIntegration {
    if (!this._instance) {
      this._instance = new CopilotIntegration(memoryManager, modeManager);
    }
    return this._instance;
  }
  
  /**
   * Activate the Copilot integration
   * @param workspace The workspace folder
   */
  public async activate(workspace: vscode.WorkspaceFolder): Promise<void> {
    // Create a hidden folder for Copilot context
    const contextDir = vscode.Uri.joinPath(workspace.uri, ".copilot-memory-bank");
    await vscode.workspace.fs.createDirectory(contextDir);
    
    // Create or update the context file
    this._contextFileUri = vscode.Uri.joinPath(contextDir, "context.md");
    this._isActive = true;
    
    // Initial context update
    await this.updateCopilotContext();
    
    // Show confirmation
    vscode.window.showInformationMessage("Memory Bank integration with GitHub Copilot is active");
  }
  
  /**
   * Deactivate the Copilot integration
   */
  public deactivate(): void {
    this._isActive = false;
    this._disposable.dispose();
  }
  
  /**
   * Update the context file that Copilot can access
   */
  public async updateCopilotContext(): Promise<void> {
    if (!this._contextFileUri || !this._isActive) {
      return;
    }
    
    try {
      // Get summaries based on current mode
      const mode = this._modeManager.currentMode;
      const allSummaries = await this._memoryManager.getSummaries();
      
      // Filter summaries based on current mode's read permissions
      const modeSummaries = allSummaries.filter(s => 
        mode.readFiles.includes(s.path)
      );
      
      // Create context content
      const content = this.createContextContent(modeSummaries, mode.name);
      
      // Write to the context file
      await vscode.workspace.fs.writeFile(
        this._contextFileUri,
        Buffer.from(content)
      );
      
      console.log("Updated Copilot context file");
    } catch (error) {
      console.error("Failed to update Copilot context:", error);
    }
  }
  
  /**
   * Create the content for the context file
   * @param summaries The summaries to include
   * @param modeName The current mode name
   * @returns The context file content
   */
  private createContextContent(summaries: SummarisedMemory[], modeName: string): string {
    let content = `# Memory Bank Context (${modeName} Mode)\n\n`;
    content += `_This file is automatically updated by the Memory Bank extension to provide context to GitHub Copilot Chat._\n\n`;
    
    // Add each summary
    for (const summary of summaries) {
      const filename = path.basename(summary.path);
      content += `## ${filename}\n\n${summary.summary}\n\n`;
    }
    
    // Add instructions for Copilot
    content += `\n## Instructions for GitHub Copilot\n\n`;
    content += `When answering questions in this project, please consider the context above as the `;
    content += `current state of the project's memory bank, which includes key decisions, progress, and context.`;
    
    return content;
  }
  
  /**
   * Create a system prompt that includes memory bank context
   * @returns A system prompt with memory context
   */
  public async createCopilotSystemPrompt(): Promise<string> {
    const currentMode = this._modeManager.currentMode;
    const summaries = await this._memoryManager.getSummaries();
    
    // Filter summaries based on current mode's read permissions
    const modeSummaries = summaries.filter(s => 
      currentMode.readFiles.includes(s.path)
    );
    
    let prompt = `You are GitHub Copilot with memory bank integration in ${currentMode.name} mode.\n\n`;
    prompt += `${currentMode.description}\n\n`;
    
    // Add relevant memory content
    prompt += `## Project Memory\n\n`;
    
    for (const summary of modeSummaries) {
      const filename = summary.path.split("/").pop();
      prompt += `### ${filename}\n${summary.summary}\n\n`;
    }
    
    return prompt;
  }
}
