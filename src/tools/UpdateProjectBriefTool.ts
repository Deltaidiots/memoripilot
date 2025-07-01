import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

interface UpdateProjectBriefParams {
  title?: string;
  summary?: string;
  goals?: string[];
  constraints?: string[];
  stakeholders?: string[];
}

/**
 * Tool for updating the project brief in the memory bank
 * This tool is specifically designed to update the projectBrief.md file
 * with high-level information about the project's purpose, goals, and constraints.
 */
export class UpdateProjectBriefTool extends BaseMemoryBankTool<UpdateProjectBriefParams> {
  constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    super(memoryManager, modeManager);
  }

  async prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<UpdateProjectBriefParams>,
    token: vscode.CancellationToken
  ) {
    const { title, summary, goals, constraints, stakeholders } = options.input;

    const changes = [];
    if (title) {
      changes.push(`- Title: ${title}`);
    }
    if (summary) {
      changes.push(`- Summary: ${summary}`);
    }
    if (goals && goals.length > 0) {
      changes.push(`- Goals: ${goals.length} item(s)`);
    }
    if (constraints && constraints.length > 0) {
      changes.push(`- Constraints: ${constraints.length} item(s)`);
    }
    if (stakeholders && stakeholders.length > 0) {
      changes.push(`- Stakeholders: ${stakeholders.length} item(s)`);
    }

    if (changes.length === 0) {
      return {
        invocationMessage: "No changes provided for Project Brief update.",
      };
    }

    return {
      invocationMessage: `Updating Project Brief with new information.`,
      confirmationMessages: {
        title: "Update Project Brief",
        message: new vscode.MarkdownString(`Update project brief with:\n${changes.join("\n")}`),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<UpdateProjectBriefParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();

      const { title, summary, goals, constraints, stakeholders } = options.input;

      // Map the fileName to the full path
      const fullPath = `memory-bank/projectBrief.md` as any;

      // Read the file content
      let content = await this.memoryManager!.readFile(fullPath);

      // Update sections as needed
      let updated = false;
      
      if (title) {
        content = this.updateSection(content, "# ", title, true);
        updated = true;
      }

      if (summary) {
        content = this.updateSection(content, "## Project Summary", summary);
        updated = true;
      }

      if (goals && goals.length > 0) {
        const goalsContent = goals.map(goal => `- ${goal}`).join("\n");
        content = this.updateSection(content, "## Goals", goalsContent);
        updated = true;
      }

      if (constraints && constraints.length > 0) {
        const constraintsContent = constraints.map(constraint => `- ${constraint}`).join("\n");
        content = this.updateSection(content, "## Constraints", constraintsContent);
        updated = true;
      }

      if (stakeholders && stakeholders.length > 0) {
        const stakeholdersContent = stakeholders.map(stakeholder => `- ${stakeholder}`).join("\n");
        content = this.updateSection(content, "## Stakeholders", stakeholdersContent);
        updated = true;
      }

      if (!updated) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart("No changes were provided to update the project brief."),
        ]);
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
        new vscode.LanguageModelTextPart(`✅ Project brief has been updated successfully.`),
      ]);
    } catch (error) {
      console.error("Failed to update project brief:", error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to update project brief: ${error}`),
      ]);
    }
  }

  /**
   * Helper method to update a section in the markdown content
   */
  private updateSection(content: string, sectionHeader: string, newContent: string, isTitle: boolean = false): string {
    if (isTitle) {
      // Special case for title (H1)
      const titleRegex = /^#\s+(.*)$/m;
      const match = content.match(titleRegex);

      if (match) {
        // Title exists, replace it
        return content.replace(titleRegex, `# ${newContent}`);
      } else {
        // No title exists, add it at the beginning
        return `# ${newContent}\n\n${content}`;
      }
    }

    // For other sections
    const sectionRegex = new RegExp(`(${sectionHeader}[\\s\\S]*?)(?=^##\\s|$)`, "m");
    const match = content.match(sectionRegex);

    if (match) {
      // Section exists, replace its content
      const updatedSection = `${sectionHeader}\n\n${newContent}\n\n`;
      return content.replace(sectionRegex, updatedSection);
    } else {
      // Section doesn't exist, add it at the end
      return `${content}\n\n${sectionHeader}\n\n${newContent}\n\n`;
    }
  }
}
