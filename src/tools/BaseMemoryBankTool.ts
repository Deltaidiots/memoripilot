import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

/**
 * Base interface for Memory Bank tools
 */
export interface IMemoryBankTool<T = any> extends vscode.LanguageModelTool<T> {
  prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<T>,
    token: vscode.CancellationToken
  ): Promise<{
    invocationMessage?: string;
    confirmationMessages?: {
      title: string;
      message: vscode.MarkdownString;
    };
  } | undefined>;

  invoke(
    options: vscode.LanguageModelToolInvocationOptions<T>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult>;
}

/**
 * Base class for Memory Bank tools with common functionality
 */
export abstract class BaseMemoryBankTool<T = any> implements IMemoryBankTool<T> {
  protected memoryManager: MemoryManager;
  protected modeManager: ModeManager;

  // Accept managers via constructor (dependency injection)
  constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    this.memoryManager = memoryManager;
    this.modeManager = modeManager;
  }

  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  getModeManager(): ModeManager {
    return this.modeManager;
  }

  /**
   * Ensure all required managers are initialized (now a no-op, but kept for interface compatibility)
   */
  protected async ensureInitialized(): Promise<void> {
    // Managers are injected and guaranteed to be initialized
    return;
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
