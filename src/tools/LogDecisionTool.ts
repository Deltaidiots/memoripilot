import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

interface LogDecisionParams {
  decision: string;
  rationale?: string;
}

/**
 * Tool for logging decisions to the memory bank
 */
export class LogDecisionTool extends BaseMemoryBankTool<LogDecisionParams> {
  constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    super(memoryManager, modeManager);
  }

  async prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<LogDecisionParams>,
    token: vscode.CancellationToken
  ) {
    const { decision, rationale } = options.input;

    return {
      invocationMessage: `Logging decision: ${decision}`,
      confirmationMessages: {
        title: "Log Decision",
        message: new vscode.MarkdownString(
          `Log decision: **${decision}**${
            rationale ? `\n\nRationale: ${rationale}` : ""
          }?`
        ),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<LogDecisionParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();

      const { decision, rationale } = options.input;

      // Log the decision using the MemoryManager method
      await this.memoryManager!.logDecision(decision, rationale);

      // Update Copilot integration if available
      if (this.modeManager) {
        const { CopilotIntegration } = await import(
          "../copilot/CopilotIntegration.js"
        );
        const copilotIntegration = CopilotIntegration.getInstance(
          this.memoryManager!,
          this.modeManager
        );
        await copilotIntegration.updateCopilotContext();
      }

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `✅ Decision logged: ${decision}${
            rationale ? ` (${rationale})` : ""
          }`
        ),
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to log decision: ${error}`),
      ]);
    }
  }
}
