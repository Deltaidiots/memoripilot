import * as vscode from 'vscode';

export interface MarkdownBlock {
    sectionTitle: string;
    markdown: string;
}

/**
 * Interface for workspace scanners that can detect and analyze specific aspects
 * of a workspace.
 */
export interface Scanner {
    /**
     * Determines if this scanner can operate on the given workspace
     * @param workspace The workspace folder to check
     */
    matches(workspace: vscode.WorkspaceFolder): Promise<boolean>;
    
    /**
     * Scans the workspace and returns markdown blocks of analysis
     * @param workspace The workspace folder to scan
     */
    scan(workspace: vscode.WorkspaceFolder): Promise<MarkdownBlock[]>;
}
