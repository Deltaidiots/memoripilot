import * as vscode from "vscode";
import {
  FILE_TEMPLATES,
  OPTIONAL_FILE_TEMPLATES,
  ALL_FILE_TEMPLATES,
} from "./FileTemplates";
import { SummaryStrategy } from "./strategies/SummaryStrategy";
import { LlmSummary } from "./strategies/LlmSummary";
import { FileWatcher, MemoryFileChangeEvent } from "./FileWatcher";
import { EventEmitter } from "events";

export type MemoryFile = keyof typeof ALL_FILE_TEMPLATES;

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
    // Always prioritize finding the extension workspace, especially for EDH testing
    try {
      const { WorkspaceUtil } = require('../utils/WorkspaceUtil');
      const extensionWorkspace = WorkspaceUtil.getExtensionWorkspace();
      
      if (extensionWorkspace) {
        console.log(`MemoryManager: Found extension workspace: ${extensionWorkspace.uri.fsPath}`);
        
        // If we already have an instance but it's using a different workspace, we should reset it
        if (this._instance && this._instance.workspace.uri.fsPath !== extensionWorkspace.uri.fsPath) {
          console.log(`MemoryManager: Resetting instance to use extension workspace instead of ${this._instance.workspace.uri.fsPath}`);
          this._instance = new MemoryManager(extensionWorkspace);
        } else if (!this._instance) {
          console.log(`MemoryManager: Creating new instance with extension workspace`);
          this._instance = new MemoryManager(extensionWorkspace);
        }
      } else if (!this._instance) {
        // No extension workspace found, and no existing instance
        console.log(`MemoryManager: Using provided workspace: ${workspace.uri.fsPath}`);
        this._instance = new MemoryManager(workspace);
      }
    } catch (error) {
      console.error(`MemoryManager: Error finding extension workspace:`, error);
      
      // Only create a new instance if we don't have one already
      if (!this._instance) {
        console.log(`MemoryManager: Using provided workspace as fallback: ${workspace.uri.fsPath}`);
        this._instance = new MemoryManager(workspace);
      }
    }
    
    return this._instance;
  }

  /**
   * Initialises the memory bank files and directories.
   * @returns {Promise<void>}
   */
  public async initialise(): Promise<void> {
    const memoryBankPath = vscode.Uri.joinPath(this.workspace.uri, "memory-bank");
    console.log(`MemoryManager: Initializing memory bank at ${memoryBankPath.fsPath}`);

    try {
      await vscode.workspace.fs.stat(memoryBankPath);
      console.log(`MemoryManager: Memory bank directory exists at ${memoryBankPath.fsPath}`);
    } catch (error) {
      console.log(`MemoryManager: Memory bank directory does not exist at ${memoryBankPath.fsPath}, creating it`);
      
      try {
        // In EDH mode, just create the directory without asking
        const { WorkspaceUtil } = require('../utils/WorkspaceUtil');
        if (WorkspaceUtil.isInExtensionDevelopmentHost()) {
          console.log(`MemoryManager: Running in development host, creating memory-bank directory automatically`);
          await vscode.workspace.fs.createDirectory(memoryBankPath);
        } else {
          // In normal mode, ask the user
          const selection = await vscode.window.showInformationMessage(
            "The 'memory-bank' directory does not exist. Would you like to create it?",
            { modal: true },
            "Yes",
            "No"
          );

          if (selection !== "Yes") {
            vscode.window.showInformationMessage(
              "Memory Bank initialization cancelled."
            );
            return;
          }
          await vscode.workspace.fs.createDirectory(memoryBankPath);
        }
      } catch (createError) {
        console.error(`MemoryManager: Error creating memory-bank directory:`, createError);
        throw new Error(`Failed to create memory-bank directory: ${createError instanceof Error ? createError.message : String(createError)}`);
      }
    }

    // Initialize all required files first
    for (const [path, template] of Object.entries(FILE_TEMPLATES)) {
      const fileUri = this.pathUri(path);
      try {
        await vscode.workspace.fs.stat(fileUri);
        console.log(`MemoryManager: Required file exists: ${path}`);
      } catch {
        console.log(`MemoryManager: Creating required file: ${path}`);
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(template));
      }
    }
    
    // Then initialize all optional files
    for (const [path, template] of Object.entries(OPTIONAL_FILE_TEMPLATES)) {
      const fileUri = this.pathUri(path);
      try {
        await vscode.workspace.fs.stat(fileUri);
        console.log(`MemoryManager: Optional file exists: ${path}`);
      } catch {
        console.log(`MemoryManager: Creating optional file: ${path}`);
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(template));
      }
    }

    // Check for a root project brief and copy it if it exists
    const projectBriefUri = vscode.Uri.joinPath(
      this.workspace.uri,
      "projectBrief.md"
    );
    try {
      const projectBriefContent = await vscode.workspace.fs.readFile(
        projectBriefUri
      );
      console.log(`MemoryManager: Found root projectBrief.md, copying to memory-bank folder`);
      await vscode.workspace.fs.writeFile(
        this.pathUri("memory-bank/projectBrief.md"),
        projectBriefContent
      );
    } catch (error) {
      // projectBrief.md doesn't exist at the root, no need to do anything
      console.log(`MemoryManager: No root projectBrief.md found, using template or existing file`);
    }

    this.startWatching();
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
    const perFile = Math.floor(
      totalBudget / Object.keys(ALL_FILE_TEMPLATES).length
    );
    const out: SummarisedMemory[] = [];
    for (const path of Object.keys(ALL_FILE_TEMPLATES) as MemoryFile[]) {
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
   * Appends content to a memory file.
   * @param {MemoryFile} path The path to the memory file.
   * @param {string} content The content to append.
   * @returns {Promise<void>}
   */
  public async appendToFile(path: MemoryFile, content: string): Promise<void> {
    const existingContent = await this.readFile(path);
    const newContent = existingContent + content;
    await vscode.workspace.fs.writeFile(
      this.pathUri(path),
      Buffer.from(newContent)
    );
    // Update cache
    this.fileCache.set(path, newContent);
  }

  /**
   * Writes content to a memory file, replacing existing content.
   * @param {MemoryFile} path The path to the memory file.
   * @param {string} content The content to write.
   * @returns {Promise<void>}
   */
  public async writeFile(path: MemoryFile, content: string): Promise<void> {
    await vscode.workspace.fs.writeFile(
      this.pathUri(path),
      Buffer.from(content)
    );
    // Update cache
    this.fileCache.set(path, content);
  }

  /**
   * Updates only the 'Current Goals' section of the active context file, preserving the template.
   * @param {string} context The new goals to write (can be multiline, will be split into list items).
   */
  public async updateActiveContext(context: string): Promise<void> {
    console.log(`MemoryManager: Attempting to update active context (Current Goals section only)`);
    try {
      const filePath = 'memory-bank/activeContext.md' as MemoryFile;
      let content = await this.readFile(filePath);
      // Fallback to template if file is empty
      if (!content.trim()) {
        content = FILE_TEMPLATES["memory-bank/activeContext.md"];
      }
      // Find section boundaries
      const lines = content.split(/\r?\n/);
      const startIdx = lines.findIndex(l => l.trim() === '## Current Goals');
      const endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith('## '));
      if (startIdx === -1) {
        throw new Error("Template missing '## Current Goals' section");
      }
      // Prepare new goals as list items
      const newGoals = context
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(goal => `- ${goal}`);
      // Replace section
      const before = lines.slice(0, startIdx + 1);
      const after = endIdx !== -1 ? lines.slice(endIdx) : [];
      const updated = [...before, '', ...newGoals, '', ...after].join('\n');
      await this.writeFile(filePath, updated);
      console.log(`MemoryManager: Successfully updated Current Goals in active context`);
    } catch (error) {
      console.error(`MemoryManager: FAILED to update Current Goals:`, error);
      throw new Error(`Failed to update active context: ${error}`);
    }
  }

  /**
   * Logs a decision to the decision log.
   * @param decision The decision that was made
   * @param rationale The reasoning behind the decision
   */
  public async logDecision(decision: string, rationale?: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const row = `| ${date} | ${decision} | ${rationale || '-'} |\n`;
    await this.appendToFile('memory-bank/decisionLog.md' as MemoryFile, row);
    this.emit('decisionLogged', {decision, rationale});
  }

  /**
   * Updates the progress tracking.
   * @param done Tasks that have been completed
   * @param doing Tasks currently in progress  
   * @param next Tasks planned for the future
   */
  public async updateProgress(done?: string[], doing?: string[], next?: string[]): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const formatItems = (items?: string[]) => 
      items?.map(item => `- ${item}`).join('\n') || '';
    
    const content = `# Progress (Updated: ${date})\n\n` +
      `## Done\n\n${formatItems(done)}\n\n` +
      `## Doing\n\n${formatItems(doing)}\n\n` +
      `## Next\n\n${formatItems(next)}\n`;
    
    await this.writeFile('memory-bank/progress.md' as MemoryFile, content);
    this.emit('progressUpdated', {done, doing, next});
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
    const files = Object.keys(ALL_FILE_TEMPLATES) as MemoryFile[];
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

  /**
   * Get the workspace folder URI
   * @returns The workspace folder URI
   */
  public getWorkspaceFolder(): vscode.WorkspaceFolder {
    return this.workspace;
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
      // Always read from disk for freshness
      const bytes = await vscode.workspace.fs.readFile(this.pathUri(path));
      const content = Buffer.from(bytes).toString("utf8");
      this.fileCache.set(path, content); // Update cache after reading
      return content;
    } catch (err) {
      console.error(`Error reading file ${path}:`, err);
      // If file doesn't exist, check template
      const template = (ALL_FILE_TEMPLATES as any)[path];
      if (template) {
        await this.writeFile(path, template); // Create it
        return template;
      }
      return ""; // Return empty string if file doesn't exist and has no template
    }
  }
}
