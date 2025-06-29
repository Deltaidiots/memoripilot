import * as vscode from "vscode";
import { BaseMemoryBankTool } from "./BaseMemoryBankTool";
import { MemoryFile } from "../memory/MemoryManager";

interface ShowMemoryParams {
  fileName: string;
}

/**
 * Tool for showing memory bank file contents
 */
export class ShowMemoryTool extends BaseMemoryBankTool<ShowMemoryParams> {
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ShowMemoryParams>,
    token: vscode.CancellationToken
  ) {
    const fileName = options.input.fileName;
    
    return {
      invocationMessage: `Showing content of ${fileName}`,
      confirmationMessages: {
        title: 'Show Memory File',
        message: new vscode.MarkdownString(`Display content of **${fileName}**?`)
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ShowMemoryParams>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      await this.ensureInitialized();
      
      const fileName = options.input.fileName;
      
      // Map the fileName to the full path
      const fullPath = `memory-bank/${fileName}` as MemoryFile;
      
      // Read the file content
      const content = await this.memoryManager!.readFile(fullPath);
      
      if (!content.trim()) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(`📄 ${fileName} is empty or contains only the template.`)
        ]);
      }
      
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`📄 **${fileName}**:\n\n\`\`\`markdown\n${content}\n\`\`\``)
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`❌ Failed to read ${options.input.fileName}: ${error}`)
      ]);
    }
  }
}
