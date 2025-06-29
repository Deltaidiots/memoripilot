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
    // Get instances from the workspace
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (ws) {
      this.memoryManager = MemoryManager.getInstance(ws);
      this.modeManager = ModeManager.getInstance(this.memoryManager);
    }
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

  abstract prepareInvocation(
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
