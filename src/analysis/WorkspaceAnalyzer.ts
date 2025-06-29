import * as vscode from 'vscode';
import { AnalyzerRegistry } from './AnalyzerRegistry';
import { MarkdownBlock } from './scanners/Scanner';
import { MissingManifestError } from './RepoAnalyzer';

/**
 * Main workspace analyzer that serves as an adapter between the old API
 * and the new pluggable analyzer architecture
 */
export class WorkspaceAnalyzer {
    private workspace: vscode.WorkspaceFolder;
    private registry: AnalyzerRegistry;

    private constructor(workspace: vscode.WorkspaceFolder) {
        this.workspace = workspace;
        this.registry = AnalyzerRegistry.getInstance();
        console.log(`WorkspaceAnalyzer: Created with workspace path: ${workspace.uri.fsPath}`);
    }

    /**
     * Get an instance of the workspace analyzer for a specific workspace
     * @param workspace The workspace to analyze
     * @returns A workspace analyzer instance
     */
    public static getInstance(workspace: vscode.WorkspaceFolder): WorkspaceAnalyzer {
        return new WorkspaceAnalyzer(workspace);
    }

    /**
     * Analyze the workspace and generate a markdown summary
     * @returns A markdown string summarizing the workspace
     */
    public async analyze(): Promise<string> {
        try {
            console.log(`WorkspaceAnalyzer: Analyzing workspace ${this.workspace.name} at ${this.workspace.uri.fsPath}`);
            
            // Get the analyzer for this workspace
            const repoAnalyzer = this.registry.getAnalyzer(this.workspace);
            
            // Run the analysis
            const analysisBlocks = await repoAnalyzer.analyze(this.workspace);
            
            // Merge all markdown blocks into a single document
            return this.combineMarkdownBlocks(analysisBlocks);
            
        } catch (error) {
            console.error(`WorkspaceAnalyzer: Analysis error:`, error);
            
            if (error instanceof MissingManifestError) {
                return `# Product Context\n\n## Project Overview\n\nCould not find project manifest files.\n\n*${error.message}*\n\n`;
            } else {
                return `# Product Context\n\n## Analysis Error\n\nAn error occurred during workspace analysis.\n\n*${error instanceof Error ? error.message : String(error)}*\n\n`;
            }
        }
    }
    
    /**
     * Combine multiple markdown blocks into a single document
     * @param blocks The markdown blocks to combine
     * @returns A single markdown document
     */
    private combineMarkdownBlocks(blocks: MarkdownBlock[]): string {
        if (blocks.length === 0) {
            return "# Product Context\n\nNo project information could be detected in this workspace.";
        }
        
        // Extract the header block if it exists
        const headerBlock = blocks.find(b => b.sectionTitle === 'Workspace');
        const contentBlocks = blocks.filter(b => b.sectionTitle !== 'Workspace');
        
        // Start with the header or a default header
        let result = headerBlock ? headerBlock.markdown : "# Product Context\n\n";
        
        // Add each content block
        for (const block of contentBlocks) {
            result += "\n\n" + block.markdown;
        }
        
        return result;
    }
}
