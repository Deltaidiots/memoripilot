import * as vscode from "vscode";
import { FILE_TEMPLATES } from "./FileTemplates";
import { SummaryStrategy } from "./strategies/SummaryStrategy";
import { LlmSummary } from "./strategies/LlmSummary";
import { FileWatcher, MemoryFileChangeEvent } from "./FileWatcher";
import { EventEmitter } from "events";

export type MemoryFile = keyof typeof FILE_TEMPLATES;

export interface SummarisedMemory {
  path: MemoryFile;
  summary: string;
}

/**
 * Event that is fired when memory content changes.
 */
export interface MemoryContentChangeEvent {
  file: MemoryFile;
  summary: string;
  timestamp: number;
}

/**
 * Singleton responsible for CRUD on memory-bank files.
 */
export class MemoryManager extends EventEmitter {
  private static _instance: MemoryManager | null = null;
  private readonly workspace: vscode.WorkspaceFolder;
  private readonly summariser: SummaryStrategy;
  private readonly watcher: FileWatcher;
  private fileCache: Map<string, string> = new Map();
  private summaryCache: Map<string, string> = new Map();

  private constructor(workspace: vscode.WorkspaceFolder) {
    super();
    this.workspace = workspace;
    this.summariser = new LlmSummary();
    this.watcher = FileWatcher.getInstance(workspace);
    
    // Listen for file change events
    this.watcher.on("fileChanged", this.handleFileChange.bind(this));
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
    
    // Create each file if it doesn't exist
    await Promise.all(
      Object.entries(FILE_TEMPLATES).map(async ([path, template]) => {
        const fileUri = this.pathUri(path);
        try {
          await vscode.workspace.fs.stat(fileUri);
          
          // File exists, read it to cache
          const content = await this.readFile(path as MemoryFile);
          this.fileCache.set(path, content);
        } catch {
          // File doesn't exist, create it
          await vscode.workspace.fs.writeFile(fileUri, Buffer.from(template));
          this.fileCache.set(path, template);
        }
      })
    );
    
    // Start watching files
    this.startWatching();
    
    // Log for debugging
    console.log("Memory Bank initialized successfully");
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

  /**
   * Handles file change events from the FileWatcher.
   * @param event The file change event
   */
  private async handleFileChange(event: MemoryFileChangeEvent): Promise<void> {
    const { file, timestamp } = event;
    
    try {
      // Update the file cache
      const content = await this.readFile(file);
      this.fileCache.set(file, content);
      
      // Generate a new summary
      const summary = await this.summariser.summarise(content, 100); // Use a smaller budget for realtime updates
      this.summaryCache.set(file, summary);
      
      // Emit a change event
      this.emit("contentChanged", {
        file,
        summary,
        timestamp
      } as MemoryContentChangeEvent);
      
      console.log(`Updated cache for ${file}`);
    } catch (error) {
      console.error(`Error handling file change for ${file}:`, error);
    }
  }

  /**
   * Start watching all memory files.
   */
  public startWatching(): void {
    const files = Object.keys(FILE_TEMPLATES) as MemoryFile[];
    this.watcher.watchFiles(files);
  }

  /**
   * Stop watching memory files.
   */
  public stopWatching(): void {
    this.watcher.dispose();
  }

  /**
   * Get the content of a memory file from cache or disk.
   * @param path The memory file path
   * @returns The file content
   */
  public async getFileContent(path: MemoryFile): Promise<string> {
    // Use cache if available
    const cached = this.fileCache.get(path);
    if (cached) {
      return cached;
    }
    
    // Read from disk and update cache
    const content = await this.readFile(path);
    this.fileCache.set(path, content);
    return content;
  }

  // ---------------- private helpers ----------------
  private pathUri(rel: string): vscode.Uri {
    return vscode.Uri.joinPath(this.workspace.uri, rel);
  }
  
  /**
   * Read a memory file from disk.
   * @param path The memory file path
   * @returns The file content
   */
  public async readFile(path: MemoryFile): Promise<string> {
    try {
      const bytes = await vscode.workspace.fs.readFile(this.pathUri(path));
      return Buffer.from(bytes).toString("utf8");
    } catch (err) {
      console.error(`Error reading file ${path}:`, err);
      return ""; // Return empty string if file doesn't exist
    }
  }
}
