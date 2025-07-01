import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

/**
 * Handles integration with GitHub Copilot.
 * NOTE: This class previously managed the context.md file, which has been removed.
 */
export class CopilotIntegration {
  private static _instance: CopilotIntegration | null = null;
  private _memoryManager: MemoryManager;
  private _modeManager: ModeManager;
  private _isActive = false;
  private _disposables: vscode.Disposable[] = [];

  private constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    this._memoryManager = memoryManager;
    this._modeManager = modeManager;
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
   * Deactivate Copilot integration and dispose all resources
   */
  public deactivate(): void {
    console.log('CopilotIntegration: Deactivating...');
    this._isActive = false;
    
    // Dispose all disposables
    for (const disposable of this._disposables) {
      try {
        disposable.dispose();
      } catch (err) {
        console.error('Error disposing CopilotIntegration resource:', err);
      }
    }
    this._disposables = [];
    
    // Reset the singleton instance
    CopilotIntegration._instance = null;
    console.log('CopilotIntegration: Successfully deactivated');
  }
  
  /**
   * This method previously updated the context.md file.
   * It's now a no-op but maintained for compatibility with existing tools.
   */
  public async updateCopilotContext(): Promise<void> {
    // This functionality has been removed
    return;
  }
}
