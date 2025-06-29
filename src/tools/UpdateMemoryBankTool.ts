import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";

interface UpdateMemoryBankParams {
  // No parameters needed for this tool
}

/**
 * Tool for updating the entire memory bank based on workspace state
 */
export class UpdateMemoryBankTool extends BaseMemoryBankTool<UpdateMemoryBankParams> {
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<UpdateMemoryBankParams>,
    token: vscode.CancellationToken
  ) {
    return {
      invocationMessage: `Analyzing workspace and updating memory bank`,
      confirmationMessages: {
        title: 'Update Memory Bank',
        message: new vscode.MarkdownString(
          `Analyze the current workspace and update memory bank files based on recent changes?`
        )
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<UpdateMemoryBankParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();
      
      // Re-initialize to make sure all files are up to date
      await this.memoryManager!.initialise();
      
      // Update Copilot integration
      if (this.modeManager) {
        const { CopilotIntegration } = await import("../copilot/CopilotIntegration.js");
        const copilotIntegration = CopilotIntegration.getInstance(
          this.memoryManager!,
          this.modeManager
        );
        await copilotIntegration.updateCopilotContext();
      }
      
      // Get fresh summaries
      const summaries = await this.memoryManager!.getSummaries();
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `✅ Memory bank updated successfully. Processed ${summaries.length} files:\n` +
          summaries.map(s => `- ${s.path.split('/').pop()}: ${s.summary.slice(0, 100)}...`).join('\n')
        )
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to update memory bank: ${error}`)
      ]);
    }
  }
}
