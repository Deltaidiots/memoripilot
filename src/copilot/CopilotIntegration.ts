import * as vscode from "vscode";
import { MemoryManager, SummarisedMemory } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

/**
 * Handles integration with GitHub Copilot by providing context in ways
 * that Copilot can access, even without direct API access.
 */
export class CopilotIntegration {
  private static _instance: CopilotIntegration | null = null;
  private _memoryManager: MemoryManager;
  private _modeManager: ModeManager;
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
    // No longer create or use a context file for Copilot integration
    this._isActive = true;
    // No context file update
    vscode.window.showInformationMessage("Memory Bank integration with GitHub Copilot is active");
  }
  
  /**
   * Deactivate the Copilot integration
   */
  public deactivate(): void {
    this._isActive = false;
  }
  
  /**
   * Update the context for Copilot integration
   */
  public async updateCopilotContext(): Promise<void> {
    // No-op: context file is not used anymore
    return;
  }
  
  /**
   * Create a system prompt that includes memory bank context
   * (No longer needed, left as a stub for compatibility)
   */
  public async createCopilotSystemPrompt(): Promise<string> {
    return '';
  }
}
