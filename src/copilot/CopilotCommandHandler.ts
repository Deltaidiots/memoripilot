import * as vscode from "vscode";
import { MemoryManager } from "../memory/MemoryManager";
import { ModeManager } from "../memory/modes/ModeManager";

/**
 * Handles commands sent through GitHub Copilot Chat
 */
export class CopilotCommandHandler {
  private static _instance: CopilotCommandHandler | null = null;
  private _memoryManager: MemoryManager;
  private _modeManager: ModeManager;
  private _disposable: vscode.Disposable;
  private _commandPrefix = "/mb-";
  private _isEnabled = false;
  
  // The list of available commands
  private _commands: { [key: string]: (args: string) => Promise<string> } = {
    "init": this.initializeMemoryBank.bind(this),
    "update": this.updateMemoryBank.bind(this),
    "show": this.showMemory.bind(this),
    "decision": this.appendDecision.bind(this),
    "context": this.setContext.bind(this),
    "mode": this.switchMode.bind(this),
    "help": this.showHelp.bind(this)
  };
  
  private constructor(memoryManager: MemoryManager, modeManager: ModeManager) {
    this._memoryManager = memoryManager;
    this._modeManager = modeManager;
    
    // Listen for editor changes to detect GitHub Copilot Chat inputs
    const subscriptions: vscode.Disposable[] = [];
    
    // Listen for text document changes - we'll use this to detect commands in Copilot Chat
    subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(this.onTextDocumentChange.bind(this))
    );
    
    this._disposable = vscode.Disposable.from(...subscriptions);
  }
  
  /**
   * Get the singleton instance of CopilotCommandHandler
   * @param memoryManager The memory manager instance
   * @param modeManager The mode manager instance
   * @returns The CopilotCommandHandler instance
   */
  public static getInstance(
    memoryManager: MemoryManager,
    modeManager: ModeManager
  ): CopilotCommandHandler {
    if (!this._instance) {
      this._instance = new CopilotCommandHandler(memoryManager, modeManager);
    }
    return this._instance;
  }
  
  /**
   * Enable the command handler
   */
  public enable(): void {
    this._isEnabled = true;
    console.log("Copilot command handler enabled");
  }
  
  /**
   * Disable the command handler
   */
  public disable(): void {
    this._isEnabled = false;
    console.log("Copilot command handler disabled");
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this._disposable.dispose();
  }
  
  /**
   * Handle text document changes to detect commands in GitHub Copilot Chat
   * @param e The text document change event
   */
  private async onTextDocumentChange(e: vscode.TextDocumentChangeEvent): Promise<void> {
    if (!this._isEnabled) {
      return;
    }
    
    // We'll try multiple approaches to detect commands in Copilot Chat
    
    // Check if this looks like a chat input
    const isChatInput = (
      e.document.fileName.includes("Copilot") || 
      e.document.uri.scheme === "chatInputEditor" ||
      e.document.uri.scheme === "chatInputHistory" ||
      e.document.uri.scheme.includes("chat") ||
      e.document.fileName.toLowerCase().includes("chat")
    );
    
    if (!isChatInput) {
      return;
    }
    
    // Look at the full document text, not just the change
    let fullText = e.document.getText();
    let lines = fullText.split('\n');
    
    // Check each line for our command prefix
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith(this._commandPrefix)) {
        await this.handleCommandLine(trimmedLine);
      }
    }
    
    // Also check the change itself
    for (const change of e.contentChanges) {
      const text = change.text.trim();
      
      if (text.startsWith(this._commandPrefix)) {
        await this.handleCommandLine(text);
      }
    }
  }
  
  /**
   * Handle a command line
   * @param commandLine The full command line starting with the prefix
   */
  private async handleCommandLine(commandLine: string): Promise<void> {
    try {
      const commandText = commandLine.substring(this._commandPrefix.length);
      const [command, ...argParts] = commandText.split(" ");
      const args = argParts.join(" ");
      
      // Execute the command if valid
      if (command in this._commands) {
        const result = await this._commands[command](args);
        
        // Use a notification to display the result
        vscode.window.showInformationMessage(`Memory Bank: ${result}`);
      }
    } catch (error) {
      console.error(`Error executing Memory Bank command: ${commandLine}`, error);
    }
  }
  
  /**
   * Process command directly from a string (for testing and manual invocation)
   * @param input The input command string
   * @returns The result message
   */
  public async processCommand(input: string): Promise<string> {
    if (!input.startsWith(this._commandPrefix)) {
      return "Not a Memory Bank command";
    }
    
    const commandText = input.substring(this._commandPrefix.length);
    const [command, ...argParts] = commandText.split(" ");
    const args = argParts.join(" ");
    
    if (command in this._commands) {
      return await this._commands[command](args);
    } else {
      return `Unknown command '${command}'. Type /mb-help for available commands.`;
    }
  }
  
  // ----- Command implementations -----
  
  /**
   * Initialize the memory bank
   */
  private async initializeMemoryBank(_args: string): Promise<string> {
    try {
      await this._memoryManager.initialise();
      return "Memory bank initialized successfully. Use /mb-show to view files.";
    } catch (error) {
      console.error("Error initializing memory bank:", error);
      return "Failed to initialize memory bank. See console for details.";
    }
  }
  
  /**
   * Update the memory bank based on workspace content
   */
  private async updateMemoryBank(_args: string): Promise<string> {
    try {
      // Perform a workspace scan to update memory files
      await this.scanWorkspace();
      return "Memory bank updated based on workspace content.";
    } catch (error) {
      console.error("Error updating memory bank:", error);
      return "Failed to update memory bank. See console for details.";
    }
  }
  
  /**
   * Show a memory file
   * @param args The file name or 'list' to show all files
   */
  private async showMemory(args: string): Promise<string> {
    if (!args || args === "list") {
      // List all memory files
      const files = Object.keys(await import("../memory/FileTemplates.js"))
        .map(path => path.split("/").pop());
      
      return `Available memory files:\n${files.join("\n")}`;
    }
    
    // Try to find the file by name
    const fileTemplates = await import("../memory/FileTemplates.js");
    const filesMap = fileTemplates.FILE_TEMPLATES as Record<string, string>;
    
    const matchingFile = Object.keys(filesMap).find(path => 
      path.toLowerCase().includes(args.toLowerCase())
    );
    
    if (matchingFile) {
      try {
        const content = await this._memoryManager.getFileContent(matchingFile as any);
        
        // Show the file in a new editor
        const ws = vscode.workspace.workspaceFolders?.[0];
        if (ws) {
          const uri = vscode.Uri.joinPath(ws.uri, matchingFile);
          await vscode.commands.executeCommand("vscode.open", uri);
          return `Opened ${matchingFile.split("/").pop()}`;
        }
        
        return `Content of ${matchingFile}:\n${content}`;
      } catch (error) {
        return `Error reading file: ${error}`;
      }
    } else {
      return `File not found: ${args}. Use /mb-show list to see available files.`;
    }
  }
  
  /**
   * Append a decision to the decision log
   * @param args The decision text
   */
  private async appendDecision(args: string): Promise<string> {
    if (!args) {
      return "Please provide a decision to log. Usage: /mb-decision Your decision text";
    }
    
    try {
      const row = `| ${new Date().toISOString().split("T")[0]} | ${args} | – |`;
      await this._memoryManager.appendLine("memory-bank/decisionLog.md", row);
      return "Decision logged successfully.";
    } catch (error) {
      console.error("Error logging decision:", error);
      return "Failed to log decision. See console for details.";
    }
  }
  
  /**
   * Set the active context
   * @param args The context text
   */
  private async setContext(args: string): Promise<string> {
    if (!args) {
      return "Please provide context text. Usage: /mb-context Your context text";
    }
    
    try {
      await this._memoryManager.appendLine("memory-bank/activeContext.md", args);
      return "Active context updated.";
    } catch (error) {
      console.error("Error updating context:", error);
      return "Failed to update context. See console for details.";
    }
  }
  
  /**
   * Switch to a different mode
   * @param args The mode name
   */
  private async switchMode(args: string): Promise<string> {
    if (!args) {
      return "Please specify a mode: architect, code, ask, or debug.";
    }
    
    const mode = args.toLowerCase();
    const success = this._modeManager.setMode(mode);
    
    if (success) {
      return `Switched to ${this._modeManager.currentMode.name} mode.`;
    } else {
      return `Invalid mode: ${args}. Available modes: architect, code, ask, debug.`;
    }
  }
  
  /**
   * Show help for available commands
   */
  private async showHelp(_args: string): Promise<string> {
    return [
      "Memory Bank Commands:",
      "/mb-init - Initialize memory bank files",
      "/mb-update - Update memory bank based on workspace",
      "/mb-show [file] - Show memory file content (or 'list' for all files)",
      "/mb-decision <text> - Log a decision",
      "/mb-context <text> - Set active context",
      "/mb-mode <mode> - Switch mode (architect, code, ask, debug)",
      "/mb-help - Show this help"
    ].join("\n");
  }
  
  /**
   * Scan the workspace to update memory files
   */
  private async scanWorkspace(): Promise<void> {
    // Get workspace info
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) {
      throw new Error("No workspace open");
    }
    
    // Get all files in the workspace (excluding node_modules, .git, etc.)
    const pattern = new vscode.RelativePattern(ws, "**/*.*");
    const excludePattern = "{**/.git/**,**/node_modules/**,**/.vscode/**,**/memory-bank/**}";
    const files = await vscode.workspace.findFiles(pattern, excludePattern, 500);
    
    // Extract project structure
    const fileTree = files.map(f => {
      const relativePath = vscode.workspace.asRelativePath(f.fsPath, false);
      return relativePath;
    });
    
    // Get file contents for package.json and README.md if they exist
    let packageJson = "";
    let readme = "";
    
    const packageFile = files.find(f => f.fsPath.endsWith("package.json"));
    if (packageFile) {
      const content = await vscode.workspace.fs.readFile(packageFile);
      packageJson = Buffer.from(content).toString("utf8");
    }
    
    const readmeFile = files.find(f => f.fsPath.toLowerCase().endsWith("readme.md"));
    if (readmeFile) {
      const content = await vscode.workspace.fs.readFile(readmeFile);
      readme = Buffer.from(content).toString("utf8");
    }
    
    // Update productContext.md
    let productContext = "# Product Context\n\n";
    productContext += "## Overview\n\n";
    
    if (readme) {
      // Extract first paragraph from README
      const readmeParts = readme.split("\n\n");
      if (readmeParts.length > 1) {
        productContext += readmeParts[1] + "\n\n";
      }
    }
    
    productContext += "## Project Structure\n\n";
    productContext += "```\n";
    productContext += fileTree.slice(0, 30).join("\n"); // Limit to 30 files
    if (fileTree.length > 30) {
      productContext += "\n... (and " + (fileTree.length - 30) + " more files)";
    }
    productContext += "\n```\n\n";
    
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        
        productContext += "## Technical Stack\n\n";
        
        if (pkg.dependencies || pkg.devDependencies) {
          productContext += "### Dependencies\n\n";
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          const depsArray = Object.entries(deps).slice(0, 10); // Limit to 10 deps
          
          for (const [name, version] of depsArray) {
            productContext += `- ${name}: ${version}\n`;
          }
          
          const totalDeps = Object.keys(deps).length;
          if (totalDeps > 10) {
            productContext += `- ... (and ${totalDeps - 10} more dependencies)\n`;
          }
        }
      } catch (e) {
        console.error("Error parsing package.json:", e);
      }
    }
    
    // Update the product context file
    const productContextUri = vscode.Uri.joinPath(ws.uri, "memory-bank/productContext.md");
    await vscode.workspace.fs.writeFile(productContextUri, Buffer.from(productContext));
    
    // Create a basic system patterns file if it's empty
    const systemPatternsUri = vscode.Uri.joinPath(ws.uri, "memory-bank/systemPatterns.md");
    try {
      const systemPatternsContent = await vscode.workspace.fs.readFile(systemPatternsUri);
      if (systemPatternsContent.byteLength < 100) {
        // File exists but is mostly empty, populate with basic patterns
        let patterns = "# System Patterns\n\n";
        
        // Detect language/framework from files and package.json
        const detectedPatterns = this.detectPatterns(fileTree, packageJson);
        patterns += detectedPatterns;
        
        await vscode.workspace.fs.writeFile(systemPatternsUri, Buffer.from(patterns));
      }
    } catch (e) {
      console.error("Error updating system patterns:", e);
    }
  }
  
  /**
   * Detect system patterns based on project files and package.json
   */
  private detectPatterns(fileTree: string[], packageJsonStr: string): string {
    let patterns = "";
    
    // Detect programming languages
    const langCount = {
      js: fileTree.filter(f => f.endsWith(".js")).length,
      ts: fileTree.filter(f => f.endsWith(".ts") || f.endsWith(".tsx")).length,
      py: fileTree.filter(f => f.endsWith(".py")).length,
      java: fileTree.filter(f => f.endsWith(".java")).length,
      cs: fileTree.filter(f => f.endsWith(".cs")).length
    };
    
    const mainLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0];
    
    patterns += "## Detected Architecture\n\n";
    
    // Framework detection from package.json
    let framework = "Unknown";
    try {
      if (packageJsonStr) {
        const pkg = JSON.parse(packageJsonStr);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        
        if (deps.react) {
          framework = "React";
        } else if (deps.vue) {
          framework = "Vue.js";
        } else if (deps.angular) {
          framework = "Angular";
        } else if (deps.next) {
          framework = "Next.js";
        } else if (deps.express) {
          framework = "Express.js";
        } else if (deps.django) {
          framework = "Django";
        } else if (deps.flask) {
          framework = "Flask";
        }
      }
    } catch (e) {
      console.error("Error parsing package.json for framework detection:", e);
    }
    
    // Create a pattern description based on language and framework
    patterns += `This project appears to be primarily written in ${this.getLanguageName(mainLang[0])}, `;
    patterns += `${mainLang[1] > 0 ? `with ${mainLang[1]} files detected. ` : ""}`;
    
    if (framework !== "Unknown") {
      patterns += `The project uses the ${framework} framework.\n\n`;
    } else {
      patterns += "\n\n";
    }
    
    patterns += "## Common Patterns\n\n";
    patterns += "- **File Structure**: Standard project layout with source files organized by feature/module\n";
    patterns += "- **Convention**: Follow established coding conventions for the detected language/framework\n";
    
    // Framework specific patterns
    if (framework !== "Unknown") {
      patterns += `- **${framework} Patterns**: Follow ${framework} best practices and component structure\n`;
    }
    
    return patterns;
  }
  
  /**
   * Get the full language name from extension shortcode
   */
  private getLanguageName(lang: string): string {
    const langMap: Record<string, string> = {
      js: "JavaScript",
      ts: "TypeScript",
      py: "Python",
      java: "Java",
      cs: "C#"
    };
    
    return langMap[lang] || lang;
  }
}
