import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Utility functions for workspace operations
 */
export class WorkspaceUtil {
    /**
     * Check if we're running in Extension Development Host
     */
    public static isInExtensionDevelopmentHost(): boolean {
        // Multiple ways to check if we're in development mode
        return (
            process.env.VSCODE_EXTENSION_DEVELOPMENT_HOST === '1' ||
            process.env.VSCODE_EXTENSION_DEVELOPMENT === '1' ||
            process.env.VSCODE_DEBUG_MODE === 'true' ||
            // If our extension is being actively developed, this path will typically exist
            require('fs').existsSync(require('path').join(__dirname, '..', '..', 'src')) ||
            require('fs').existsSync(require('path').join(__dirname, '..', '..', 'tsconfig.json'))
        );
    }

    /**
     * Finds the workspace folder containing the extension itself.
     * This is useful when testing in Extension Development Host where multiple workspaces might be open.
     */
    public static getExtensionWorkspace(): vscode.WorkspaceFolder | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        if (workspaceFolders.length === 0) {
            console.log('WorkspaceUtil: No workspace folders available');
            return undefined;
        }
        
        // Debug log all workspaces
        console.log(`WorkspaceUtil: Available workspaces: ${workspaceFolders.map(f => f.name + ': ' + f.uri.fsPath).join(', ')}`);
        
        // Check if we're in the Extension Development Host
        const inDevelopmentHost = this.isInExtensionDevelopmentHost();
        console.log(`WorkspaceUtil: Running in Extension Development Host: ${inDevelopmentHost}`);
        
        // Get our current code location - this should be the extension root
        const currentDir = __dirname;
        console.log(`WorkspaceUtil: Current directory: ${currentDir}`);
        
        // Try to find our extension workspace using our current directory
        // We need to go up from src/utils to the root of the extension
        try {
            const extensionRoot = path.resolve(currentDir, '..', '..');
            console.log(`WorkspaceUtil: Calculated extension root: ${extensionRoot}`);
            
            // Find which workspace contains this directory
            for (const folder of workspaceFolders) {
                if (extensionRoot.startsWith(folder.uri.fsPath) || folder.uri.fsPath.includes('memoripilot')) {
                    console.log(`WorkspaceUtil: Found extension workspace by path matching: ${folder.uri.fsPath}`);
                    return folder;
                }
            }
        } catch (error) {
            console.error(`WorkspaceUtil: Error finding extension root:`, error);
        }
        
        // If path matching failed, try other methods
        // First, try to find by extension ID
        try {
            const extension = vscode.extensions.getExtension('gujjar19.memoripilot');
            if (extension) {
                // The extension is installed and active
                // Now find which workspace folder contains our extension code
                for (const folder of workspaceFolders) {
                    const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
                    try {
                        // Try reading package.json to check if it's our extension
                        if (fs.existsSync(packageJsonPath)) {
                            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                            if (packageJson.name === 'memoripilot') {
                                console.log(`WorkspaceUtil: Found extension workspace by package.json: ${folder.uri.fsPath}`);
                                return folder;
                            }
                        }
                    } catch (error) {
                        console.error(`WorkspaceUtil: Error checking package.json at ${packageJsonPath}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error(`WorkspaceUtil: Error checking extension:`, error);
        }
        
        // Add a hardcoded check for our specific workspace path
        const hardcodedPath = '/home/asad/dev/memoripilot';
        for (const folder of workspaceFolders) {
            if (folder.uri.fsPath === hardcodedPath) {
                console.log(`WorkspaceUtil: Found extension workspace by hardcoded path: ${folder.uri.fsPath}`);
                return folder;
            }
        }
        
        // Second, try to find by specific project files
        for (const folder of workspaceFolders) {
            console.log(`WorkspaceUtil: Checking if ${folder.uri.fsPath} contains our extension`);
            
            // Check for multiple specific files that would only be in our extension workspace
            try {
                const hasPackageJson = fs.existsSync(path.join(folder.uri.fsPath, 'package.json'));
                const hasExtensionTs = fs.existsSync(path.join(folder.uri.fsPath, 'src', 'extension.ts'));
                const hasMemoryManagerTs = fs.existsSync(path.join(folder.uri.fsPath, 'src', 'memory', 'MemoryManager.ts'));
                
                // If all these specific files exist, it's very likely our extension workspace
                if (hasPackageJson && hasExtensionTs && hasMemoryManagerTs) {
                    console.log(`WorkspaceUtil: Found extension workspace by specific files: ${folder.uri.fsPath}`);
                    return folder;
                }
                
                // Check for specific files in our repository
                const hasWorkspaceUtil = fs.existsSync(path.join(folder.uri.fsPath, 'src', 'utils', 'WorkspaceUtil.ts'));
                const hasBaseMemoryBankTool = fs.existsSync(path.join(folder.uri.fsPath, 'src', 'tools', 'BaseMemoryBankTool.ts'));
                
                if (hasWorkspaceUtil && hasBaseMemoryBankTool) {
                    console.log(`WorkspaceUtil: Found extension workspace by specific source files: ${folder.uri.fsPath}`);
                    return folder;
                }
                
                // Look for a memory-bank directory which would indicate it's our extension workspace
                const hasMemoryBankDir = fs.existsSync(path.join(folder.uri.fsPath, 'memory-bank'));
                if (hasMemoryBankDir && hasPackageJson) {
                    console.log(`WorkspaceUtil: Found extension workspace by memory-bank directory: ${folder.uri.fsPath}`);
                    return folder;
                }
                
                // Also check if the path contains our extension name as a fallback
                if (folder.uri.fsPath.includes('memoripilot')) {
                    console.log(`WorkspaceUtil: Found extension workspace by path: ${folder.uri.fsPath}`);
                    return folder;
                }
            } catch (error) {
                console.error(`WorkspaceUtil: Error checking files in ${folder.uri.fsPath}:`, error);
            }
        }
        
        // In EDH, try to detect if any workspace has our source code structure
        for (const folder of workspaceFolders) {
            try {
                // Check for src/memory directory which is unique to our extension
                const hasSrcMemoryDir = fs.existsSync(path.join(folder.uri.fsPath, 'src', 'memory'));
                const hasSrcToolsDir = fs.existsSync(path.join(folder.uri.fsPath, 'src', 'tools'));
                
                if (hasSrcMemoryDir && hasSrcToolsDir) {
                    console.log(`WorkspaceUtil: Found extension workspace by directory structure: ${folder.uri.fsPath}`);
                    return folder;
                }
            } catch (error) {
                console.error(`WorkspaceUtil: Error checking directory structure in ${folder.uri.fsPath}:`, error);
            }
        }
        
        // If we can't find our extension workspace, fall back to the first workspace
        if (workspaceFolders.length > 0) {
            console.log(`WorkspaceUtil: Using first workspace as fallback: ${workspaceFolders[0].uri.fsPath}`);
            return workspaceFolders[0];
        }
        
        console.log('WorkspaceUtil: No workspace folders available');
        return undefined;
    }
}
