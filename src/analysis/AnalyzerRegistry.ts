import * as vscode from 'vscode';
import { RepoAnalyzer } from './RepoAnalyzer';
import { PackageJsonScanner } from './scanners/PackageJsonScanner';
import { ReadmeScanner } from './scanners/ReadmeScanner';
import { PyProjectScanner } from './scanners/PyProjectScanner';

/**
 * Registry that manages analyzers for different workspaces
 */
export class AnalyzerRegistry {
    private static instance: AnalyzerRegistry;
    private analyzers: Map<string, RepoAnalyzer> = new Map();

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get the singleton instance of the analyzer registry
     */
    public static getInstance(): AnalyzerRegistry {
        if (!AnalyzerRegistry.instance) {
            AnalyzerRegistry.instance = new AnalyzerRegistry();
        }
        return AnalyzerRegistry.instance;
    }

    /**
     * Get an analyzer for a specific workspace, creating it if it doesn't exist
     * @param workspace The workspace folder to analyze
     */
    public getAnalyzer(workspace: vscode.WorkspaceFolder): RepoAnalyzer {
        const workspaceKey = workspace.uri.toString();
        
        if (!this.analyzers.has(workspaceKey)) {
            console.log(`AnalyzerRegistry: Creating new analyzer for workspace ${workspace.name}`);
            const analyzer = new RepoAnalyzer();
            
            // Register all available scanners
            analyzer.registerScanner(new PackageJsonScanner());
            analyzer.registerScanner(new ReadmeScanner());
            analyzer.registerScanner(new PyProjectScanner());
            // Register additional scanners here as they're implemented
            
            this.analyzers.set(workspaceKey, analyzer);
        }
        
        return this.analyzers.get(workspaceKey)!;
    }

    /**
     * Utility function to pick the appropriate workspace folder based on context
     * @param fileUri Optional URI of a file to help determine the workspace
     */
    public pickWorkspaceFromContext(fileUri?: vscode.Uri): vscode.WorkspaceFolder | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        
        if (workspaceFolders.length === 0) {
            return undefined;
        }
        
        // Strategy 1: If a file URI is provided, find its workspace
        if (fileUri) {
            const workspaceForFile = vscode.workspace.getWorkspaceFolder(fileUri);
            if (workspaceForFile) {
                console.log(`AnalyzerRegistry: Selected workspace from file path: ${workspaceForFile.name}`);
                return workspaceForFile;
            }
        }
        
        // Strategy 2: Use active editor's workspace
        if (vscode.window.activeTextEditor) {
            const activeFile = vscode.window.activeTextEditor.document.uri;
            const activeWorkspace = vscode.workspace.getWorkspaceFolder(activeFile);
            if (activeWorkspace) {
                console.log(`AnalyzerRegistry: Selected workspace from active editor: ${activeWorkspace.name}`);
                return activeWorkspace;
            }
        }
        
        // Strategy 3: If only one workspace, use it
        if (workspaceFolders.length === 1) {
            console.log(`AnalyzerRegistry: Selected the only available workspace: ${workspaceFolders[0].name}`);
            return workspaceFolders[0];
        }
        
        // Strategy 4: If in EDH, try to find the extension workspace
        try {
            const extensionRoot = __dirname.split('out')[0];
            
            for (const folder of workspaceFolders) {
                if (folder.uri.fsPath.includes('memory-bank-copilot')) {
                    console.log(`AnalyzerRegistry: Selected extension workspace: ${folder.name}`);
                    return folder;
                }
            }
        } catch (error) {
            console.error(`AnalyzerRegistry: Error finding extension workspace:`, error);
        }
        
        // Strategy 5: Default to first workspace, but log a warning
        console.log(`AnalyzerRegistry: Multiple workspaces open, defaulting to first: ${workspaceFolders[0].name}`);
        return workspaceFolders[0];
    }
}
