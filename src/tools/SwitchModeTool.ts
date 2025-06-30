import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";
import { ChatModeProvider } from "../chat/ChatModeProvider";
import { AllowedMode, MODE_PREFIX } from "../memory/modes/Modes";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

const getFullModeId = (mode: AllowedMode): string => `${MODE_PREFIX}${mode}`;

/**
 * Tool for switching between chat modes using VS Code's native chat functionality
 */
export class SwitchModeTool extends BaseMemoryBankTool<SwitchModeParams> {
  constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    super(memoryManager, modeManager);
  }

  async prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<SwitchModeParams>,
    token: vscode.CancellationToken
  ) {
    const mode = options.input.mode;
    return {
      invocationMessage: `Switching to ${mode} mode`,
      confirmationMessages: {
        title: 'Switch Mode',
        message: new vscode.MarkdownString(
          `Are you sure you want to switch to **${mode}** mode?`
        )
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SwitchModeParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    await this.ensureInitialized();
    // Log state before mode switch
    console.log('[SwitchModeTool] Invoked. memoryManager:', this.memoryManager, 'modeManager:', this.modeManager);

    // Defensive: check managers
    if (!this.memoryManager) {
      console.error('[SwitchModeTool] memoryManager is undefined before mode switch!');
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('❌ Error: memoryManager is not initialized. Please reload the extension.')
      ]);
    }
    if (!this.modeManager) {
      console.error('[SwitchModeTool] modeManager is undefined before mode switch!');
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('❌ Error: modeManager is not initialized. Please reload the extension.')
      ]);
    }

    const mode = options.input.mode;
    const fullModeId = getFullModeId(mode);

    const chatProvider = ChatModeProvider.getInstance();
    if (!chatProvider) {
      console.error('[SwitchModeTool] ChatModeProvider is not initialized.');
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          '\u274c Error: ChatModeProvider is not initialized and no context is available. Please reload the window or re-activate the extension to resolve this issue.'
        )
      ]);
    }
    const registeredModes = chatProvider.getRegisteredModes();
    console.log('[SwitchModeTool] Registered modes:', registeredModes, 'FullModeId:', fullModeId);

    if (!registeredModes.includes(fullModeId)) {
      console.error(`[SwitchModeTool] Mode '${fullModeId}' is not registered.`);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`\u274c Error: Mode '${fullModeId}' is not registered. Please reload the window or check your configuration.`)
      ]);
    }

    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes('chat.setMode')) {
      console.warn('[SwitchModeTool] chat.setMode command not found.');
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('⚠️ VS Code chat mode switching is not available in this environment. Internal mode switched only.')
      ]);
    }

    try {
      console.log(`[SwitchModeTool] Executing chat.setMode with: ${fullModeId}`);
      await vscode.commands.executeCommand('chat.setMode', fullModeId);
      if (this.modeManager) {
        this.modeManager.setMode(mode);
      }
      // Log state after mode switch
      console.log('[SwitchModeTool] After mode switch. memoryManager:', this.memoryManager, 'modeManager:', this.modeManager);
      // Defensive: check managers after switch
      if (!this.memoryManager) {
        console.error('[SwitchModeTool] memoryManager is undefined after mode switch!');
      }
      if (!this.modeManager) {
        console.error('[SwitchModeTool] modeManager is undefined after mode switch!');
      }
      const displayName = mode.charAt(0).toUpperCase() + mode.slice(1);
      console.log(`[SwitchModeTool] Successfully switched to ${displayName} mode.`);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`✅ Switched to MemoriPilot ${displayName} mode. The chat interface and extension are now in sync.`)
      ]);
    } catch (error) {
      console.error('[SwitchModeTool] Failed to switch VS Code chat mode:', error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to switch VS Code chat mode: ${error instanceof Error ? error.message : String(error)}`)
      ]);
    }
  }
}

export interface SwitchModeParams {
  mode: AllowedMode;
}
