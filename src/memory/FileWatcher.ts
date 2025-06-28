import * as vscode from "vscode";
import { MemoryFile } from "./MemoryManager";
import { EventEmitter } from "events";

/**
 * Event that is fired when a memory file changes.
 */
export interface MemoryFileChangeEvent {
  /**
   * The file that changed.
   */
  file: MemoryFile;
  
  /**
   * When the change happened.
   */
  timestamp: number;
}

/**
 * Watches memory-bank files for changes and emits events.
 */
export class FileWatcher extends EventEmitter {
  private static _instance: FileWatcher | null = null;
  private _watchers: vscode.FileSystemWatcher[] = [];
  private _pendingChanges: Map<string, NodeJS.Timeout> = new Map();
  private _workspace: vscode.WorkspaceFolder;
  private _batchDelay = 2000; // 2 seconds batch delay
  
  /**
   * Constructor for FileWatcher.
   * @param workspace The workspace folder
   */
  private constructor(workspace: vscode.WorkspaceFolder) {
    super();
    this._workspace = workspace;
  }
  
  /**
   * Get the singleton instance of FileWatcher.
   * @param workspace The workspace folder
   * @returns The FileWatcher instance
   */
  public static getInstance(workspace: vscode.WorkspaceFolder): FileWatcher {
    if (!this._instance) {
      this._instance = new FileWatcher(workspace);
    }
    return this._instance;
  }
  
  /**
   * Start watching memory-bank files.
   * @param files The memory files to watch
   */
  public watchFiles(files: MemoryFile[]): void {
    // Dispose any existing watchers
    this.dispose();
    
    // Create new watchers for each file
    for (const file of files) {
      const pattern = new vscode.RelativePattern(this._workspace, file);
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      
      // Watch for changes
      watcher.onDidChange(uri => this._handleFileChange(file, uri));
      watcher.onDidCreate(uri => this._handleFileChange(file, uri));
      
      this._watchers.push(watcher);
    }
    
    console.log(`Watching ${files.length} memory-bank files`);
  }
  
  /**
   * Handles a file change event with debouncing.
   * @param file The memory file
   * @param uri The URI of the changed file
   */
  private _handleFileChange(file: MemoryFile, uri: vscode.Uri): void {
    // Cancel any pending timeout for this file
    const existingTimeout = this._pendingChanges.get(file);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Create a new timeout to batch changes
    const timeout = setTimeout(() => {
      console.log(`File changed: ${file}`);
      this.emit("fileChanged", {
        file,
        timestamp: Date.now()
      } as MemoryFileChangeEvent);
      
      this._pendingChanges.delete(file);
    }, this._batchDelay);
    
    this._pendingChanges.set(file, timeout);
  }
  
  /**
   * Dispose all watchers.
   */
  public dispose(): void {
    for (const watcher of this._watchers) {
      watcher.dispose();
    }
    this._watchers = [];
    
    // Clear any pending timeouts
    for (const timeout of this._pendingChanges.values()) {
      clearTimeout(timeout);
    }
    this._pendingChanges.clear();
  }
}
