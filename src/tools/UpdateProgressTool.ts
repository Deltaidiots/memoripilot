import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";

interface UpdateProgressParams {
  done?: string[];
  doing?: string[];
  next?: string[];
}

/**
 * Tool for updating progress tracking in the memory bank
 */
export class UpdateProgressTool extends BaseMemoryBankTool<UpdateProgressParams> {
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<UpdateProgressParams>,
    token: vscode.CancellationToken
  ) {
    const { done, doing, next } = options.input;
    
    const sections = [];
    if (done?.length) {
      sections.push(`**Done**: ${done.join(', ')}`);
    }
    if (doing?.length) {
      sections.push(`**Doing**: ${doing.join(', ')}`);
    }
    if (next?.length) {
      sections.push(`**Next**: ${next.join(', ')}`);
    }
    return {
      invocationMessage: `Updating progress tracking`,
      confirmationMessages: {
        title: 'Update Progress',
        message: new vscode.MarkdownString(
          `Update progress with:\n\n${sections.join('\n\n')}?`
        )
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<UpdateProgressParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();
      
      const { done, doing, next } = options.input;
      
      // Update progress using the MemoryManager method
      await this.memoryManager!.updateProgress(done, doing, next);
      
      // Update Copilot integration if available
      if (this.modeManager) {
        const { CopilotIntegration } = await import("../copilot/CopilotIntegration.js");
        const copilotIntegration = CopilotIntegration.getInstance(
          this.memoryManager!,
          this.modeManager
        );
        await copilotIntegration.updateCopilotContext();
      }
      
      const sections = [];
      if (done?.length) {
        sections.push(`Done: ${done.length} items`);
      }
      if (doing?.length) {
        sections.push(`Doing: ${doing.length} items`);
      }
      if (next?.length) {
        sections.push(`Next: ${next.length} items`);
      }
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`✅ Progress updated: ${sections.join(', ')}`)
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to update progress: ${error}`)
      ]);
    }
  }
}
