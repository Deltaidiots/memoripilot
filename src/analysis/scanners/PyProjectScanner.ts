import * as vscode from 'vscode';
import { MarkdownBlock, Scanner } from './Scanner';
import * as path from 'path';

/**
 * Scanner that analyzes Python projects via pyproject.toml, setup.py, or requirements.txt
 */
export class PyProjectScanner implements Scanner {
    async matches(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        try {
            // Check for common Python project files
            const pyprojectUri = vscode.Uri.joinPath(workspace.uri, 'pyproject.toml');
            const setupPyUri = vscode.Uri.joinPath(workspace.uri, 'setup.py');
            const requirementsUri = vscode.Uri.joinPath(workspace.uri, 'requirements.txt');
            
            try {
                await vscode.workspace.fs.stat(pyprojectUri);
                return true;
            } catch {
                try {
                    await vscode.workspace.fs.stat(setupPyUri);
                    return true;
                } catch {
                    try {
                        await vscode.workspace.fs.stat(requirementsUri);
                        return true;
                    } catch {
                        // None of the Python project files exist
                        return false;
                    }
                }
            }
        } catch (error) {
            return false;
        }
    }

    async scan(workspace: vscode.WorkspaceFolder): Promise<MarkdownBlock[]> {
        const results: MarkdownBlock[] = [];
        
        // Try to analyze pyproject.toml first (modern Python projects)
        try {
            const pyprojectUri = vscode.Uri.joinPath(workspace.uri, 'pyproject.toml');
            await vscode.workspace.fs.stat(pyprojectUri);
            
            const rawContent = await vscode.workspace.fs.readFile(pyprojectUri);
            const content = Buffer.from(rawContent).toString('utf8');
            
            // Basic parsing of pyproject.toml (a proper TOML parser would be better)
            let projectName = this.extractFromToml(content, 'name');
            let projectVersion = this.extractFromToml(content, 'version');
            let projectDescription = this.extractFromToml(content, 'description');
            
            let projectInfo = `## Python Project: ${projectName || 'Unnamed Python Project'}\n\n`;
            if (projectVersion) {
                projectInfo += `**Version**: ${projectVersion}\n\n`;
            }
            if (projectDescription) {
                projectInfo += `**Description**: ${projectDescription}\n\n`;
            }
            
            results.push({
                sectionTitle: 'Python Project',
                markdown: projectInfo
            });
            
            // Extract dependencies if present
            const dependenciesMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(\[|\]|$)/);
            if (dependenciesMatch) {
                const depsSection = dependenciesMatch[1];
                const deps = this.extractDependenciesFromToml(depsSection);
                
                if (deps.length > 0) {
                    let depsMarkdown = `## Python Dependencies\n\n`;
                    depsMarkdown += deps.join('\n');
                    
                    results.push({
                        sectionTitle: 'Python Dependencies',
                        markdown: depsMarkdown
                    });
                }
            }
            
            return results;
        } catch (error) {
            // pyproject.toml analysis failed, try requirements.txt
        }
        
        // Try requirements.txt
        try {
            const requirementsUri = vscode.Uri.joinPath(workspace.uri, 'requirements.txt');
            await vscode.workspace.fs.stat(requirementsUri);
            
            const rawContent = await vscode.workspace.fs.readFile(requirementsUri);
            const content = Buffer.from(rawContent).toString('utf8');
            
            const requirements = content
                .split('\n')
                .filter(line => line.trim() && !line.trim().startsWith('#'))
                .map(line => `- ${line.trim()}`);
            
            if (requirements.length > 0) {
                results.push({
                    sectionTitle: 'Python Project',
                    markdown: `## Python Project\n\nThis appears to be a Python project.`
                });
                
                results.push({
                    sectionTitle: 'Python Dependencies',
                    markdown: `## Python Dependencies\n\n${requirements.join('\n')}`
                });
            }
            
            return results;
        } catch (error) {
            // requirements.txt analysis failed, try setup.py
        }
        
        // Try setup.py as last resort
        try {
            const setupPyUri = vscode.Uri.joinPath(workspace.uri, 'setup.py');
            await vscode.workspace.fs.stat(setupPyUri);
            
            // We can't safely execute or parse Python code, so just note its existence
            results.push({
                sectionTitle: 'Python Project',
                markdown: `## Python Project\n\nThis appears to be a Python project using setup.py.`
            });
            
            return results;
        } catch (error) {
            // All Python project analyses failed
            return [];
        }
    }
    
    /**
     * Very basic extraction of a value from TOML content
     * This is not a complete TOML parser, just enough to get basic metadata
     */
    private extractFromToml(content: string, key: string): string {
        const regex = new RegExp(`${key}\\s*=\\s*["']([^"']*?)["']`);
        const match = content.match(regex);
        return match ? match[1] : '';
    }
    
    /**
     * Extract dependencies from a TOML dependencies section
     */
    private extractDependenciesFromToml(section: string): string[] {
        const deps: string[] = [];
        const lines = section.split('\n');
        
        for (const line of lines) {
            const match = line.match(/^\s*([a-zA-Z0-9._-]+)\s*=\s*["']([^"']*?)["']/);
            if (match) {
                deps.push(`- ${match[1]} (${match[2]})`);
            }
        }
        
        return deps;
    }
}
