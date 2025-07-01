import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

interface UpdateArchitectParams {
  decisions?: string[];
  considerations?: string[];
  components?: {
    name: string;
    description: string;
    responsibilities?: string[];
  }[];
}

/**
 * Tool for updating the architect document in the memory bank
 * This tool is specifically designed to update the architect.md file
 * with architectural decisions, considerations, and component designs.
 */
export class UpdateArchitectTool extends BaseMemoryBankTool<UpdateArchitectParams> {
  constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    super(memoryManager, modeManager);
  }

  async prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<UpdateArchitectParams>,
    token: vscode.CancellationToken
  ) {
    const { decisions, considerations, components } = options.input;

    const changes = [];
    if (decisions && decisions.length > 0) {
      changes.push(`- Architectural Decisions: ${decisions.length} item(s)`);
    }
    if (considerations && considerations.length > 0) {
      changes.push(`- Design Considerations: ${considerations.length} item(s)`);
    }
    if (components && components.length > 0) {
      changes.push(`- Components: ${components.length} item(s)`);
    }

    if (changes.length === 0) {
      return {
        invocationMessage: "No changes provided for Architect document update.",
      };
    }

    return {
      invocationMessage: `Updating Architect document with new information.`,
      confirmationMessages: {
        title: "Update Architect Document",
        message: new vscode.MarkdownString(`Update architect document with:\n${changes.join("\n")}`),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<UpdateArchitectParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();

      const { decisions, considerations, components } = options.input;

      // Map the fileName to the full path
      const fullPath = `memory-bank/architect.md` as any;

      // Read the file content
      let content = await this.memoryManager!.readFile(fullPath);

      // Update sections as needed
      let updated = false;

      if (decisions && decisions.length > 0) {
        const decisionsContent = decisions.map(decision => `- ${decision}`).join("\n");
        content = this.updateSection(content, "## Architectural Decisions", decisionsContent);
        updated = true;
      }

      if (considerations && considerations.length > 0) {
        const considerationsContent = considerations.map(consideration => `- ${consideration}`).join("\n");
        content = this.updateSection(content, "## Design Considerations", considerationsContent);
        updated = true;
      }

      if (components && components.length > 0) {
        let componentsContent = "";
        
        for (const component of components) {
          componentsContent += `### ${component.name}\n\n${component.description}\n\n`;
          
          if (component.responsibilities && component.responsibilities.length > 0) {
            componentsContent += "**Responsibilities:**\n\n";
            for (const responsibility of component.responsibilities) {
              componentsContent += `- ${responsibility}\n`;
            }
            componentsContent += "\n";
          }
        }
        
        content = this.updateSection(content, "## Components", componentsContent);
        updated = true;
      }

      if (!updated) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart("No changes were provided to update the architect document."),
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
        new vscode.LanguageModelTextPart(`✅ Architect document has been updated successfully.`),
      ]);
    } catch (error) {
      console.error("Failed to update architect document:", error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to update architect document: ${error}`),
      ]);
    }
  }

  /**
   * Helper method to update a section in the markdown content
   */
  private updateSection(content: string, sectionHeader: string, newContent: string): string {
    // Check if section exists
    const sectionRegex = new RegExp(`(${sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=^##\\s|$)`, "m");
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
