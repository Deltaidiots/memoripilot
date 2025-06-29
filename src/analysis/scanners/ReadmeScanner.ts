import * as vscode from 'vscode';
import { MarkdownBlock, Scanner } from './Scanner';

/**
 * Scanner that analyzes README.md files for project documentation
 */
export class ReadmeScanner implements Scanner {
    async matches(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        // Always check for README, most projects have one
        return true;
    }

    async scan(workspace: vscode.WorkspaceFolder): Promise<MarkdownBlock[]> {
        const results: MarkdownBlock[] = [];
        
        // Check for different README naming conventions
        const readmeVariants = [
            'README.md',
            'Readme.md',
            'readme.md',
            'README.markdown',
            'README'
        ];
        
        let readmeContent = '';
        let found = false;
        
        for (const filename of readmeVariants) {
            try {
                const readmeUri = vscode.Uri.joinPath(workspace.uri, filename);
                await vscode.workspace.fs.stat(readmeUri); // Check if file exists
                
                const rawContent = await vscode.workspace.fs.readFile(readmeUri);
                readmeContent = Buffer.from(rawContent).toString('utf8');
                found = true;
                break;
            } catch (error) {
                // File doesn't exist, try the next variant
                continue;
            }
        }
        
        if (found) {
            // Extract the first few paragraphs (max 3000 chars) for the summary
            const truncatedContent = this.extractRelevantReadmeContent(readmeContent);
            
            results.push({
                sectionTitle: 'README',
                markdown: `## Project Documentation\n\n${truncatedContent}`
            });
        }
        
        return results;
    }
    
    /**
     * Extract the most relevant parts of a README for summarization
     * @param content The full README content
     * @returns A trimmed version focusing on key sections
     */
    private extractRelevantReadmeContent(content: string): string {
        // Remove any badges or image links which are common in READMEs but don't add value to our summary
        let cleaned = content.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '');
        cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');
        
        // If there's a main title, keep it
        let title = '';
        const titleMatch = cleaned.match(/^#\s+(.+)$/m);
        if (titleMatch) {
            title = titleMatch[0] + '\n\n';
        }
        
        // Try to extract key sections: intro, installation, usage
        const sections: string[] = [];
        
        // Introduction is usually the first paragraph
        const firstParaMatch = cleaned.match(/^(?!#)(.+?)(?:\n\n|\n#)/s);
        if (firstParaMatch) {
            sections.push(firstParaMatch[1].trim());
        }
        
        // Look for common section headers and extract their content
        const keyHeaders = [
            'Introduction', 'Overview', 'Description', 
            'Installation', 'Getting Started',
            'Usage', 'Features', 'Examples'
        ];
        
        for (const header of keyHeaders) {
            const regex = new RegExp(`##\\s+${header}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i');
            const match = cleaned.match(regex);
            if (match && match[1]) {
                // Limit the length of each section to keep the summary concise
                const sectionContent = match[1].trim();
                sections.push(`## ${header}\n\n${sectionContent}`);
            }
        }
        
        // Combine title with extracted sections
        let result = title + sections.join('\n\n');
        
        // Truncate if still too long
        if (result.length > 3000) {
            result = result.substring(0, 2997) + '...';
        }
        
        return result;
    }
}
