import * as vscode from 'vscode';
import { MarkdownBlock, Scanner } from './scanners/Scanner';
import * as crypto from 'crypto';

/**
 * Error thrown when a required manifest file is missing
 */
export class MissingManifestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MissingManifestError';
    }
}

/**
 * Analyzer for a specific workspace folder
 */
export class RepoAnalyzer {
    private scanners: Scanner[] = [];
    private fileHashCache: Map<string, string> = new Map();

    /**
     * Creates a new repository analyzer
     */
    constructor() {
        // Scanners will be registered by the registry
    }

    /**
     * Register a scanner to be used by this analyzer
     * @param scanner The scanner to register
     */
    public registerScanner(scanner: Scanner): void {
        this.scanners.push(scanner);
    }

    /**
     * Analyze the workspace and generate a markdown summary
     * @param workspace The workspace folder to analyze
     */
    public async analyze(workspace: vscode.WorkspaceFolder): Promise<MarkdownBlock[]> {
        console.log(`RepoAnalyzer: Analyzing workspace ${workspace.name} at ${workspace.uri.fsPath}`);
        
        const results: MarkdownBlock[] = [];
        let hasMatchingScanner = false;

        // Add workspace identification block
        results.push({
            sectionTitle: 'Workspace',
            markdown: `# Product Context\n\n## Workspace: ${workspace.name}\n\nPath: ${workspace.uri.fsPath}`
        });

        // Try each scanner
        for (const scanner of this.scanners) {
            try {
                // Check if scanner applies to this workspace
                if (await scanner.matches(workspace)) {
                    hasMatchingScanner = true;
                    const scanResults = await scanner.scan(workspace);
                    results.push(...scanResults);
                }
            } catch (error) {
                console.error(`RepoAnalyzer: Scanner error:`, error);
                results.push({
                    sectionTitle: 'Error',
                    markdown: `## Error During Analysis\n\nA scanner failed: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        }

        // If no scanner matched, add a default message
        if (!hasMatchingScanner) {
            results.push({
                sectionTitle: 'No Recognized Project',
                markdown: `## Project Structure\n\nNo recognizable project structure was found in this workspace.`
            });
        }

        return results;
    }

    /**
     * Checks if a file's content has changed from the cached hash
     * @param uri The URI of the file to check
     * @returns true if the file has changed or wasn't cached before
     */
    private async hasFileChanged(uri: vscode.Uri): Promise<boolean> {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            const key = uri.toString();
            const cachedHash = this.fileHashCache.get(key);

            if (cachedHash !== hash) {
                this.fileHashCache.set(key, hash);
                return true;
            }
            return false;
        } catch (error) {
            // If there's an error reading the file, consider it changed
            return true;
        }
    }
}
