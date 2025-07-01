import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

interface UpdateSystemPatternsParams {
  pattern: string;
  description: string;
  examples?: string[];
}

/**
 * Tool for updating the system patterns in the memory bank
 * This tool is specifically designed to update the systemPatterns.md file
 * with architectural patterns, design patterns, and coding conventions.
 */
export class UpdateSystemPatternsTool extends BaseMemoryBankTool<UpdateSystemPatternsParams> {
  constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    super(memoryManager, modeManager);
  }

  async prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<UpdateSystemPatternsParams>,
    token: vscode.CancellationToken
  ) {
    const { pattern, description, examples } = options.input;

    if (!pattern || !description) {
      return {
        invocationMessage: "Pattern name and description are required.",
      };
    }

    const message = [
      `**Pattern**: ${pattern}`,
      `**Description**: ${description}`,
    ];

    if (examples && examples.length > 0) {
      message.push("**Examples**:");
      examples.forEach(example => message.push(`- ${example}`));
    }

    return {
      invocationMessage: `Adding system pattern: ${pattern}`,
      confirmationMessages: {
        title: "Update System Patterns",
        message: new vscode.MarkdownString(message.join("\n")),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<UpdateSystemPatternsParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();

      const { pattern, description, examples } = options.input;

      if (!pattern || !description) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart("Pattern name and description are required."),
        ]);
      }

      // Map the fileName to the full path
      const fullPath = `memory-bank/systemPatterns.md` as any;

      // Read the file content
      let content = await this.memoryManager!.readFile(fullPath);

      // Format the new pattern entry
      let patternEntry = `\n## ${pattern}\n\n${description}\n`;
      
      if (examples && examples.length > 0) {
        patternEntry += "\n### Examples\n\n";
        examples.forEach(example => {
          patternEntry += `- ${example}\n`;
        });
      }

      // Check if pattern already exists
      const patternRegex = new RegExp(`## ${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "m");
      
      if (patternRegex.test(content)) {
        // Pattern exists, update it
        const fullPatternRegex = new RegExp(`(## ${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=^##\\s|$)`, "m");
        content = content.replace(fullPatternRegex, patternEntry);
      } else {
        // Pattern doesn't exist, add it
        content += `\n${patternEntry}`;
      }

      // Write updated content back to the file
      await this.memoryManager!.writeFile(fullPath, content);

      // Update Copilot integration if available
      if (this.modeManager) {
        const { CopilotIntegration } = await import("../copilot/CopilotIntegration.js");
        const copilotIntegration = CopilotIntegration.getInstance(this.memoryManager!, this.modeManager);
        await copilotIntegration.updateCopilotContext();
      }

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`✅ System pattern "${pattern}" has been added/updated.`),
      ]);
    } catch (error) {
      console.error("Failed to update system patterns:", error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to update system patterns: ${error}`),
      ]);
    }
  }
}
