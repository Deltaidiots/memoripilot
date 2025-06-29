import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";

interface UpdateContextParams {
  context: string;
}

/**
 * Tool for updating the active context in the memory bank
 */
export class UpdateContextTool extends BaseMemoryBankTool<UpdateContextParams> {
  async prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<UpdateContextParams>,
    token: vscode.CancellationToken
  ) {
    const context = options.input.context;
    
    return {
      invocationMessage: `Setting active context to: ${context}`,
      confirmationMessages: {
        title: 'Update Active Context',
        message: new vscode.MarkdownString(`Set active context to: **${context}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<UpdateContextParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();
      
      const context = options.input.context;
      
      // Update the active context using the MemoryManager method
      await this.memoryManager!.updateActiveContext(context);
      
      // Update Copilot integration if available
      if (this.modeManager) {
        const { CopilotIntegration } = await import("../copilot/CopilotIntegration.js");
        const copilotIntegration = CopilotIntegration.getInstance(
          this.memoryManager!,
          this.modeManager
        );
        await copilotIntegration.updateCopilotContext();
      }
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`✅ Active context updated to: ${context}`)
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to update active context: ${error}`)
      ]);
    }
  }
}
