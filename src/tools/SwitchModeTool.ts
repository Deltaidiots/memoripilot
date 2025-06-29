import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";

interface SwitchModeParams {
  mode: string;
}

/**
 * Tool for switching memory bank working modes
 */
export class SwitchModeTool extends BaseMemoryBankTool<SwitchModeParams> {
  async prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<SwitchModeParams>,
    token: vscode.CancellationToken
  ) {
    const mode = options.input.mode;
    const modeDisplayName = mode.charAt(0).toUpperCase() + mode.slice(1);
    
    return {
      invocationMessage: `Switching to ${modeDisplayName} mode`,
      confirmationMessages: {
        title: 'Switch Mode',
        message: new vscode.MarkdownString(`Switch to **${modeDisplayName}** mode?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SwitchModeParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();
      
      const mode = options.input.mode;
      
      if (!this.modeManager) {
        throw new Error("Mode manager not available");
      }
      
      // Switch the mode
      this.modeManager.setMode(mode);
      
      // Update Copilot integration with new mode context
      const { CopilotIntegration } = await import("../copilot/CopilotIntegration.js");
      const copilotIntegration = CopilotIntegration.getInstance(
        this.memoryManager!,
        this.modeManager
      );
      await copilotIntegration.updateCopilotContext();
      
      const currentMode = this.modeManager.currentMode;
      const modeDisplayName = mode.charAt(0).toUpperCase() + mode.slice(1);
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `✅ Switched to **${modeDisplayName}** mode\n\n` +
          `**Description**: ${currentMode.description}\n\n` +
          `**Available files**: ${currentMode.readFiles.map(f => f.split('/').pop()).join(', ')}`
        )
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to switch mode: ${error}`)
      ]);
    }
  }
}
