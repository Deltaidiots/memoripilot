import * as vscode from "vscode";
import { FILE_TEMPLATES } from "./FileTemplates";
import { SummaryStrategy } from "./strategies/SummaryStrategy";
import { LlmSummary } from "./strategies/LlmSummary";

export type MemoryFile = keyof typeof FILE_TEMPLATES;

export interface SummarisedMemory {
  path: MemoryFile;
  summary: string;
}

/**
 * Singleton responsible for CRUD on memory-bank files.
 */
export class MemoryManager {
  private static _instance: MemoryManager | null = null;
  private readonly workspace: vscode.WorkspaceFolder;
  private readonly summariser: SummaryStrategy;

  private constructor(workspace: vscode.WorkspaceFolder) {
    this.workspace = workspace;
    this.summariser = new LlmSummary();
  }

  public static getInstance(
    workspace: vscode.WorkspaceFolder
  ): MemoryManager {
    if (!this._instance) {
      this._instance = new MemoryManager(workspace);
    }
    return this._instance;
  }

  /**
   * Initialises the memory bank files and directories.
   * @returns {Promise<void>}
   */
  public async initialise(): Promise<void> {
    const rootUri = this.pathUri("memory-bank");
    await vscode.workspace.fs.createDirectory(rootUri);
    await Promise.all(
      Object.entries(FILE_TEMPLATES).map(async ([path, template]) => {
        const fileUri = this.pathUri(path);
        try {
          await vscode.workspace.fs.stat(fileUri);
        } catch {
          await vscode.workspace.fs.writeFile(fileUri, Buffer.from(template));
        }
      })
    );
  }

  /**
   * Gets summaries of the memory files.
   * @param {number} [totalBudget=256] The total token budget for all summaries.
   * @returns {Promise<SummarisedMemory[]>} The summaries.
   */
  public async getSummaries(
    totalBudget = 256
  ): Promise<SummarisedMemory[]> {
    const perFile = Math.floor(totalBudget / Object.keys(FILE_TEMPLATES).length);
    const out: SummarisedMemory[] = [];
    for (const path of Object.keys(
      FILE_TEMPLATES
    ) as MemoryFile[]) {
      const text = await this.readFile(path);
      const summary = await this.summariser.summarise(text, perFile);
      out.push({ path, summary });
    }
    return out;
  }

  /**
   * Appends a line to a memory file.
   * @param {MemoryFile} path The path to the memory file.
   * @param {string} line The line to append.
   * @returns {Promise<void>}
   */
  public async appendLine(path: MemoryFile, line: string): Promise<void> {
    const content = await this.readFile(path) + "\n" + line + "\n";
    await vscode.workspace.fs.writeFile(
      this.pathUri(path),
      Buffer.from(content)
    );
  }

  // ---------------- private helpers ----------------
  private pathUri(rel: string): vscode.Uri {
    return vscode.Uri.joinPath(this.workspace.uri, rel);
  }
  private async readFile(path: MemoryFile): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(this.pathUri(path));
    return Buffer.from(bytes).toString("utf8");
  }
}
