import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

/**
 * Base interface for Memory Bank tools
 */
export interface IMemoryBankTool<T = any> extends vscode.LanguageModelTool<T> {
  /**
   * Get the memory manager instance
   */
  getMemoryManager(): MemoryManager | undefined;

  /**
   * Get the mode manager instance
   */
  getModeManager(): ModeManager | undefined;
}

/**
 * Base class for Memory Bank tools with common functionality
 */
export abstract class BaseMemoryBankTool<T = any> implements IMemoryBankTool<T> {
  protected memoryManager?: MemoryManager;
  protected modeManager?: ModeManager;

  constructor() {
    try {
      // Try to use the workspace that contains our extension
      const { WorkspaceUtil } = require('../utils/WorkspaceUtil');
      const extensionWorkspace = WorkspaceUtil.getExtensionWorkspace();
      
      if (extensionWorkspace) {
        console.log(`BaseMemoryBankTool: Found extension workspace: ${extensionWorkspace.uri.fsPath}`);
        this.memoryManager = MemoryManager.getInstance(extensionWorkspace);
        this.modeManager = ModeManager.getInstance(this.memoryManager);
      } else {
        // Log the available workspaces for debugging
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        console.log(`BaseMemoryBankTool: No extension workspace found. Available workspaces: ${
          workspaceFolders.map(f => f.name + ': ' + f.uri.fsPath).join(', ')
        }`);
        
        // Fall back to active editor workspace or first workspace
        const activeWorkspace = this.getActiveEditorWorkspace() || vscode.workspace.workspaceFolders?.[0];
        if (activeWorkspace) {
          console.log(`BaseMemoryBankTool: Using fallback workspace: ${activeWorkspace.uri.fsPath}`);
          this.memoryManager = MemoryManager.getInstance(activeWorkspace);
          this.modeManager = ModeManager.getInstance(this.memoryManager);
        } else {
          console.error(`BaseMemoryBankTool: No workspace available`);
        }
      }
    } catch (error) {
      // If utility fails, fall back to simpler approach with better error logging
      console.error(`BaseMemoryBankTool: Error finding extension workspace:`, error);
      
      // Log the available workspaces for debugging
      const workspaceFolders = vscode.workspace.workspaceFolders || [];
      console.log(`BaseMemoryBankTool: Available workspaces: ${
        workspaceFolders.map(f => f.name + ': ' + f.uri.fsPath).join(', ')
      }`);
      
      if (workspaceFolders.length > 0) {
        console.log(`BaseMemoryBankTool: Using first workspace as fallback: ${workspaceFolders[0].uri.fsPath}`);
        this.memoryManager = MemoryManager.getInstance(workspaceFolders[0]);
        this.modeManager = ModeManager.getInstance(this.memoryManager);
      } else {
        console.error(`BaseMemoryBankTool: No workspace available`);
      }
    }
  }
  
  /**
   * Gets the workspace folder for the currently active editor
   */
  private getActiveEditorWorkspace(): vscode.WorkspaceFolder | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document && activeEditor.document.uri) {
      return vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
    }
    return undefined;
  }

  getMemoryManager(): MemoryManager | undefined {
    return this.memoryManager;
  }

  getModeManager(): ModeManager | undefined {
    return this.modeManager;
  }

  /**
   * Check if memory bank is initialized
   */
  protected async ensureInitialized(): Promise<void> {
    if (!this.memoryManager) {
      throw new Error("Memory Bank is not initialized. Please open a workspace first.");
    }
    await this.memoryManager.initialise();
  }

  abstract prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<T>,
    token: vscode.CancellationToken
  ): Promise<{
    invocationMessage?: string;
    confirmationMessages?: {
      title: string;
      message: vscode.MarkdownString;
    };
  } | undefined>;

  abstract invoke(
    options: vscode.LanguageModelToolInvocationOptions<T>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult>;
}
