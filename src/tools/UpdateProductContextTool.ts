import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

interface UpdateProductContextParams {
  description?: string;
  architecture?: string;
  technologies?: string[];
  libraries?: string[];
}

/**
 * Tool for updating the product context in the memory bank
 * This tool is specifically designed to update the productContext.md file
 * with detailed information about the project's architecture, technologies, and libraries.
 */
export class UpdateProductContextTool extends BaseMemoryBankTool<UpdateProductContextParams> {
  constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    super(memoryManager, modeManager);
  }

  async prepare(
    options: vscode.LanguageModelToolInvocationPrepareOptions<UpdateProductContextParams>,
    token: vscode.CancellationToken
  ) {
    const { description, architecture, technologies, libraries } = options.input;

    const changes = [];
    if (description) {
      changes.push(`- Project Description: ${description}`);
    }
    if (architecture) {
      changes.push(`- Architecture: ${architecture}`);
    }
    if (technologies && technologies.length > 0) {
      changes.push(`- Technologies: ${technologies.join(", ")}`);
    }
    if (libraries && libraries.length > 0) {
      changes.push(`- Libraries: ${libraries.join(", ")}`);
    }

    if (changes.length === 0) {
      return {
        invocationMessage: "No changes provided for Product Context update.",
      };
    }

    return {
      invocationMessage: `Updating Product Context with new information.`,
      confirmationMessages: {
        title: "Update Product Context",
        message: new vscode.MarkdownString(`Update product context with:\n${changes.join("\n")}`),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<UpdateProductContextParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();

      const { description, architecture, technologies, libraries } = options.input;

      // Get current product context
      // Map the fileName to the full path
      const fullPath = `memory-bank/productContext.md` as any;

      // Read the file content
      let productContextContent = await this.memoryManager!.readFile(fullPath);

      // Update sections as needed
      let updated = false;
      
      if (description) {
        productContextContent = this.updateSection(
          productContextContent,
          "## Project Description",
          description
        );
        updated = true;
      }

      if (architecture) {
        productContextContent = this.updateSection(
          productContextContent,
          "## Architecture",
          architecture
        );
        updated = true;
      }

      if (technologies && technologies.length > 0) {
        const techContent = technologies.map(tech => `- ${tech}`).join("\n");
        productContextContent = this.updateSection(
          productContextContent,
          "## Technologies",
          techContent
        );
        updated = true;
      }

      if (libraries && libraries.length > 0) {
        const libContent = libraries.map(lib => `- ${lib}`).join("\n");
        productContextContent = this.updateSection(
          productContextContent,
          "## Libraries and Dependencies",
          libContent
        );
        updated = true;
      }

      if (!updated) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart("No changes were provided to update the product context."),
        ]);
      }

      // Write updated content back to the file
      await this.memoryManager!.writeFile(fullPath, productContextContent);

      // Update Copilot integration if available
      if (this.modeManager) {
        const { CopilotIntegration } = await import("../copilot/CopilotIntegration.js");
        const copilotIntegration = CopilotIntegration.getInstance(this.memoryManager!, this.modeManager);
        await copilotIntegration.updateCopilotContext();
      }

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`✅ Product context has been updated successfully.`),
      ]);
    } catch (error) {
      console.error("Failed to update product context:", error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to update product context: ${error}`),
      ]);
    }
  }

  /**
   * Helper method to update a section in the markdown content
   */
  private updateSection(content: string, sectionHeader: string, newContent: string): string {
    // Check if section exists
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
