import * as vscode from 'vscode';
import { MarkdownBlock, Scanner } from './Scanner';
import * as path from 'path';

/**
 * Scanner that analyzes package.json files (JavaScript/TypeScript projects)
 */
export class PackageJsonScanner implements Scanner {
    async matches(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        try {
            const packageJsonUri = vscode.Uri.joinPath(workspace.uri, 'package.json');
            await vscode.workspace.fs.stat(packageJsonUri);
            return true;
        } catch (error) {
            return false;
        }
    }

    async scan(workspace: vscode.WorkspaceFolder): Promise<MarkdownBlock[]> {
        const results: MarkdownBlock[] = [];
        const packageJsonUri = vscode.Uri.joinPath(workspace.uri, 'package.json');

        try {
            const rawContent = await vscode.workspace.fs.readFile(packageJsonUri);
            const packageJson = JSON.parse(Buffer.from(rawContent).toString('utf8'));

            // Project info block
            let projectInfo = `## Project: ${packageJson.name || 'Unnamed JS/TS Project'}\n\n`;
            projectInfo += `**Description**: ${packageJson.description || 'No description provided'}\n\n`;
            
            if (packageJson.version) {
                projectInfo += `**Version**: ${packageJson.version}\n\n`;
            }
            
            if (packageJson.author) {
                const author = typeof packageJson.author === 'string' 
                    ? packageJson.author 
                    : packageJson.author.name + (packageJson.author.email ? ` <${packageJson.author.email}>` : '');
                projectInfo += `**Author**: ${author}\n\n`;
            }
            
            if (packageJson.license) {
                projectInfo += `**License**: ${packageJson.license}\n\n`;
            }

            results.push({
                sectionTitle: 'Project Info',
                markdown: projectInfo
            });

            // Dependencies block
            if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
                let depMarkdown = `## Dependencies\n\n`;
                depMarkdown += Object.keys(packageJson.dependencies)
                    .map(dep => `- ${dep}: ${packageJson.dependencies[dep]}`)
                    .join('\n');

                results.push({
                    sectionTitle: 'Dependencies',
                    markdown: depMarkdown
                });
            }

            // Dev Dependencies block
            if (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0) {
                let devDepMarkdown = `## Development Dependencies\n\n`;
                devDepMarkdown += Object.keys(packageJson.devDependencies)
                    .map(dep => `- ${dep}: ${packageJson.devDependencies[dep]}`)
                    .join('\n');

                results.push({
                    sectionTitle: 'Dev Dependencies',
                    markdown: devDepMarkdown
                });
            }

            // Scripts block
            if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
                let scriptsMarkdown = `## Available Scripts\n\n`;
                scriptsMarkdown += Object.keys(packageJson.scripts)
                    .map(script => `- \`${script}\`: ${packageJson.scripts[script]}`)
                    .join('\n');

                results.push({
                    sectionTitle: 'Scripts',
                    markdown: scriptsMarkdown
                });
            }

        } catch (error) {
            console.error(`PackageJsonScanner: Error analyzing package.json:`, error);
            results.push({
                sectionTitle: 'Package.json Error',
                markdown: `## Package.json Analysis Error\n\n${error instanceof Error ? error.message : String(error)}`
            });
        }

        return results;
    }
}
