import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryManager } from '../memory/MemoryManager';

/**
 * Type for tracking chat participants with their IDs
 */
interface ParticipantInfo {
    participant: vscode.ChatParticipant;
    id: string;
    disposal: vscode.Disposable;
}

/**
 * Manages Chat Participants based on templates in the resources/chat-modes directory
 */
export interface IChatModeProvider {
  getRegisteredModes(): readonly string[];
  registerMode(modeId: string): void;
}

export class ChatModeProvider implements IChatModeProvider {
  private static instance: ChatModeProvider | null = null;
  private readonly registeredModes: Set<string> = new Set();

  private registeredModesLegacy: string[] = [];

  private readonly templateDir: string;
  private participants: ParticipantInfo[] = [];
  private memoryManager?: MemoryManager;
  private initialized = false;
  private extensionContext?: vscode.ExtensionContext;
  private _disposed = false;

    /**
     * Get the singleton instance of the ChatModeProvider
     */
    public static getInstance(): ChatModeProvider {
        if (!ChatModeProvider.instance) {
            ChatModeProvider.instance = new ChatModeProvider();
        }
        return ChatModeProvider.instance;
    }

    private constructor() {
        // Get the path to the chat-modes directory
        const extensionUri = vscode.extensions.getExtension('gujjar19.memoripilot')?.extensionUri;
        if (!extensionUri) {
            throw new Error('Failed to get extension URI');
        }
        this.templateDir = vscode.Uri.joinPath(extensionUri, 'resources', 'chat-modes').fsPath;
        console.log(`ChatModeProvider: Template directory set to ${this.templateDir}`);
    }

    /**
     * Initialize the ChatModeProvider
     * @param memoryManager The MemoryManager instance
     * @param context The extension context
     */
    public async initialize(memoryManager: MemoryManager, context: vscode.ExtensionContext): Promise<void> {
        if (this._disposed) { 
            console.error('ChatModeProvider: Attempted to initialize a disposed provider');
            throw new Error('ChatModeProvider is disposed'); 
        }
        if (this.initialized) {
            console.log('ChatModeProvider: Already initialized, skipping');
            return;
        }

        console.log('ChatModeProvider: Initializing...');
        this.memoryManager = memoryManager;
        this.extensionContext = context;
        
        try {
            // Ensure all mode templates exist
            await this.ensureAllModeTemplates();

            // Register chat participants and set up file watchers
            await this.registerParticipants();
            this.setupWatchers();
            this.initialized = true;
            console.log('ChatModeProvider: Initialization complete');
        } catch (err) {
            console.error('ChatModeProvider: Initialization failed:', err);
            throw err;
        }
    }

    /**
     * Inject memory bank content into a template
     * @param template The template content
     */
    private async injectMemoryContent(template: string): Promise<string> {
        if (!this.memoryManager) {
            return template;
        }

        const memoryFiles = [
            'memory-bank/productContext.md',
            'memory-bank/activeContext.md',
            'memory-bank/progress.md',
            'memory-bank/decisionLog.md',
            'memory-bank/systemPatterns.md'
        ] as const;

        let result = template;
        for (const filePath of memoryFiles) {
            try {
                let content = '';
                const uri = vscode.Uri.joinPath(this.extensionContext!.extensionUri, filePath);
                try {
                    content = (await vscode.workspace.fs.readFile(uri)).toString();
                } catch (err) {
                    console.warn(`ChatModeProvider: File ${filePath} not found`);
                }
                const fileName = path.basename(filePath);
                result = result.replace(`{{memory-bank/${fileName}}}`, content);
            } catch (error) {
                console.error(`ChatModeProvider: Failed to inject content for ${filePath}:`, error);
            }
        }

        return result;
    }

    /**
     * Handle chat requests for a participant
     * @param id The participant ID
     * @param sysMessage The system message template
     */
    private createRequestHandler(id: string, sysMessage: string): vscode.ChatRequestHandler {
        return async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {
            // Use the injected template as system message
            const systemMessage = await this.injectMemoryContent(sysMessage);
            
            // Initialize messages array with system message (using Assistant role since system is not supported)
            const messages = [
                vscode.LanguageModelChatMessage.Assistant(systemMessage, 'System')
            ];

            // Add any relevant context from chat history
            const previousMessages = context.history.filter(m => m instanceof vscode.ChatResponseTurn);
            for (const msg of previousMessages) {
                let fullMessage = '';
                msg.response.forEach(r => {
                    if (r instanceof vscode.ChatResponseMarkdownPart) {
                        fullMessage += r.value;
                    }
                });
                messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
            }

            // Add the user's message
            messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

            try {
                // Send the request using the language model
                const chatResponse = await request.model.sendRequest(messages, {}, token);

                // Stream the response as markdown
                for await (const fragment of chatResponse.text) {
                    stream.markdown(fragment);
                }
            } catch (error) {
                console.error(`ChatModeProvider: Error in chat request handler:`, error);
                stream.markdown('Sorry, I encountered an error while processing your request.');
            }
        };
    }

    /**
     * Create a chat participant for a specific mode
     * @param mode The name of the mode (e.g., 'architect', 'code')
     */
    private async createChatParticipant(mode: string): Promise<ParticipantInfo | undefined> {
        const template = await this.loadTemplate(mode);
        if (!template) {
            return undefined;
        }

        const id = `memoripilot.${mode}`;
        const participant = vscode.chat.createChatParticipant(id, this.createRequestHandler(id, template));
        
        return {
            participant,
            id,
            disposal: participant
        };
    }

    /**
     * Register all chat participants from the templates
     */
    private async registerParticipants(): Promise<void> {
        const modes = ['ask', 'architect', 'code', 'debug'];
        for (const mode of modes) {
            try {
                const info = await this.createChatParticipant(mode);
                if (info) {
                    this.participants.push(info);
                    this.registeredModes.add(info.id); // Add mode ID to registered modes
                    console.log(`ChatModeProvider: Registered participant for ${mode} mode`);
                }
            } catch (error) {
                console.error(`ChatModeProvider: Failed to register participant for ${mode} mode:`, error);
            }
        }
        // Set the ask mode as default if the command exists
        const askParticipant = this.participants.find(p => p.id === 'memoripilot.ask');
        if (askParticipant) {
            const commands = await vscode.commands.getCommands(true);
            if (commands.includes('chat.setDefaultParticipant')) {
                await vscode.commands.executeCommand('chat.setDefaultParticipant', askParticipant.id);
            } else {
                console.warn("'chat.setDefaultParticipant' command not found. Skipping default participant set.");
            }
        }
    }

    /**
     * Switch to a specific chat mode
     * @param mode The mode to switch to
     */
    public async switchToMode(mode: 'architect' | 'code' | 'ask' | 'debug'): Promise<void> {
        if (this._disposed) { throw new Error('ChatModeProvider is disposed'); }
        if (!this.initialized) {
            throw new Error('ChatModeProvider not initialized');
        }
        // Ensure the mode template exists before switching
        await this.ensureModeTemplate(mode);
        // Create the new participant for the requested mode
        const info = await this.createChatParticipant(mode);
        if (!info) {
            throw new Error(`Failed to create participant for ${mode} mode`);
        }
        // Remove old participants
        for (const participant of this.participants) {
            participant.disposal.dispose();
        }
        this.participants = [];
        // Add the new participant
        this.participants.push(info);
        console.log(`ChatModeProvider: Switched to ${mode} mode`);
        // Set as default if it's the ask mode and command exists
        if (mode === 'ask') {
            const commands = await vscode.commands.getCommands(true);
            if (commands.includes('chat.setDefaultParticipant')) {
                await vscode.commands.executeCommand('chat.setDefaultParticipant', info.id);
            } else {
                console.warn("'chat.setDefaultParticipant' command not found. Skipping default participant set.");
            }
        }
    }

    /**
     * Get the current active chat mode
     */
    public getActiveMode(): 'architect' | 'code' | 'ask' | 'debug' | undefined {
        if (this._disposed) { return undefined; }
        if (!this.participants.length) {
            return undefined;
        }

        const activeModeId = this.participants[0].id;
        return activeModeId.split('.')[1] as 'architect' | 'code' | 'ask' | 'debug';
    }

    /**
     * Setup file watchers for memory bank files to auto-refresh participants
     */
    private setupWatchers(): void {
        if (this._disposed) { return; }
        if (!this.memoryManager) {
            return;
        }

        const watcher = vscode.workspace.createFileSystemWatcher('**/memory-bank/*.md');
        watcher.onDidChange(() => this.refreshParticipants());
        watcher.onDidCreate(() => this.refreshParticipants());
        watcher.onDidDelete(() => this.refreshParticipants());
        
        // Store the watcher disposal
        this.participants.push({
            participant: undefined as any,
            id: 'watcher',
            disposal: watcher
        });
    }

    /**
     * Refresh all chat participants with the latest memory bank content
     */
    private async refreshParticipants(): Promise<void> {
        if (this._disposed) { return; }
        if (!this.initialized) {
            return;
        }

        // Store the current mode
        const currentMode = this.getActiveMode();
        if (!currentMode) {
            return;
        }

        // Re-register the current participant with fresh content
        await this.switchToMode(currentMode);
    }

    /**
     * Ensure a mode template exists and is up-to-date, creating or updating it if needed
     * @param mode The mode name
     * @param forceUpdate Whether to force update the template even if it's not newer
     * @returns Object containing update status information
     */
    private async ensureModeTemplate(mode: string, forceUpdate: boolean = false): Promise<{
        updated: boolean;
        backupCreated: boolean;
        templatePath: string;
        backupPath?: string;
        fromVersion?: string;
        toVersion?: string;
    }> {
        const chatmodesDir = getWorkspaceChatmodesDir();
        if (!chatmodesDir) {
            return {
                updated: false,
                backupCreated: false,
                templatePath: ''
            };
        }
        
        if (!fs.existsSync(chatmodesDir)) {
            fs.mkdirSync(chatmodesDir, { recursive: true });
        }
        
        const templatePath = path.join(chatmodesDir, `${mode}.chatmode.md`);
        let shouldUpdate = false;
        let backupCreated = false;
        let fromVersion: string | undefined;
        let backupPath: string | undefined;
        
        // Get bundled template and its version
        const bundledTemplate = await this.getBundledTemplate(mode);
        const bundledVersion = this.extractTemplateVersion(bundledTemplate);
        
        // Check if workspace template exists and get its version
        if (fs.existsSync(templatePath)) {
            if (forceUpdate) {
                shouldUpdate = true;
                console.log(`ChatModeProvider: Force updating template for mode '${mode}'`);
            } else {
                try {
                    const workspaceTemplate = await fs.promises.readFile(templatePath, 'utf8');
                    fromVersion = this.extractTemplateVersion(workspaceTemplate);
                    
                    // Compare versions and decide if update is needed
                    if (this.isVersionNewer(bundledVersion, fromVersion)) {
                        shouldUpdate = true;
                        console.log(`ChatModeProvider: Template for mode '${mode}' is outdated (${fromVersion} -> ${bundledVersion}). Updating...`);
                    }
                } catch (err) {
                    console.error(`ChatModeProvider: Error checking template version for ${mode}:`, err);
                    shouldUpdate = true; // In case of error, update to be safe
                }
            }
        } else {
            // Template doesn't exist, create it
            shouldUpdate = true;
        }
        
        // Update or create the template if needed
        if (shouldUpdate) {
            try {
                // If the file exists and we're updating it, create a backup
                if (fs.existsSync(templatePath)) {
                    backupPath = `${templatePath}.backup`;
                    await fs.promises.copyFile(templatePath, backupPath);
                    backupCreated = true;
                    console.log(`ChatModeProvider: Created backup of template at ${backupPath}`);
                }
                
                await fs.promises.writeFile(templatePath, bundledTemplate, 'utf8');
                console.log(`ChatModeProvider: ${fs.existsSync(templatePath) ? 'Updated' : 'Created'} template for mode '${mode}' at ${templatePath}`);
                
                return {
                    updated: true,
                    backupCreated,
                    templatePath,
                    backupPath,
                    fromVersion,
                    toVersion: bundledVersion
                };
            } catch (err) {
                console.error(`ChatModeProvider: Failed to ${fs.existsSync(templatePath) ? 'update' : 'create'} template for ${mode}:`, err);
                return {
                    updated: false,
                    backupCreated,
                    templatePath,
                    backupPath,
                    fromVersion,
                    toVersion: bundledVersion
                };
            }
        }
        
        return {
            updated: false,
            backupCreated: false,
            templatePath
        };
    }

    /**
     * Ensure all core mode templates exist and are up-to-date
     * @param forceUpdate Whether to force update all templates
     * @returns Summary of template updates
     */
    private async ensureAllModeTemplates(forceUpdate: boolean = false): Promise<{
        updated: string[],
        skipped: string[],
        backups: string[]
    }> {
        const modes = ['ask', 'architect', 'code', 'debug'];
        const results = {
            updated: [] as string[],
            skipped: [] as string[],
            backups: [] as string[]
        };
        
        for (const mode of modes) {
            const result = await this.ensureModeTemplate(mode, forceUpdate);
            if (result.updated) {
                results.updated.push(`${mode}.chatmode.md`);
            } else {
                results.skipped.push(`${mode}.chatmode.md`);
            }
            if (result.backupCreated) {
                results.backups.push(`${mode}.chatmode.md.backup`);
            }
        }
        
        return results;
    }

    /**
     * Load a template from the chatmodes directory
     * @param templateName The name of the template without extension
     */
    private async loadTemplate(templateName: string): Promise<string | undefined> {
        const chatmodesDir = getWorkspaceChatmodesDir();
        if (!chatmodesDir) { return undefined; }
        const templatePath = path.join(chatmodesDir, `${templateName}.chatmode.md`);
        try {
            return await fs.promises.readFile(templatePath, 'utf8');
        } catch (error) {
            console.error(`ChatModeProvider: Failed to load template ${templateName}:`, error);
            return undefined;
        }
    }

    /**
     * Extract version from a template's frontmatter
     * @param template The template content
     * @returns The version string or "0.0.0" if not found
     */
    private extractTemplateVersion(template: string): string {
        const match = /---[\s\S]*?version:\s*["']?([\d\.]+)["']?[\s\S]*?---/.exec(template);
        return match ? match[1] : '0.0.0';
    }

    /**
     * Compare two semantic version strings
     * @param newVersion The new version
     * @param oldVersion The old version
     * @returns True if newVersion is newer than oldVersion
     */
    private isVersionNewer(newVersion: string, oldVersion: string): boolean {
        // Simple semantic version comparison
        const newParts = newVersion.split('.').map(Number);
        const oldParts = oldVersion.split('.').map(Number);
        
    for (let i = 0; i < Math.max(newParts.length, oldParts.length); i++) {
        const newPart = newParts[i] || 0;
        const oldPart = oldParts[i] || 0;
        
        if (newPart > oldPart) {
            return true;
        }
        if (newPart < oldPart) {
            return false;
        }
    }
        
        return false; // Versions are equal
    }

    /**
     * Get the bundled template content from resources directory
     * @param mode The mode name
     * @returns The template content or undefined if not found
     */
    private async getBundledTemplate(mode: string): Promise<string> {
        try {
            const extensionUri = this.extensionContext?.extensionUri;
            if (extensionUri) {
                const resourcePath = path.join(
                    extensionUri.fsPath,
                    'resources',
                    'chat-modes',
                    `${mode}.md`
                );
                if (fs.existsSync(resourcePath)) {
                    return await fs.promises.readFile(resourcePath, 'utf8');
                }
            }
        } catch (err) {
            console.error(`ChatModeProvider: Failed to load bundled template for ${mode}:`, err);
        }
        
        // Fallback to default template
        return DEFAULT_MODE_TEMPLATES[mode] || `---\ndescription: ${mode} mode\ntools: []\nversion: "1.0.0"\n---\n# ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode\nDefault template.`;
    }

    /**
     * Dispose all resources (file watchers, participants, etc.)
     */
    public dispose(): void {
        if (this._disposed) { return; }
        console.log('ChatModeProvider: Disposing resources...');
        
        // Dispose all participants
        for (const info of this.participants) {
            if (info.disposal && typeof info.disposal.dispose === 'function') {
                try { 
                    console.log(`ChatModeProvider: Disposing participant ${info.id}`);
                    info.disposal.dispose(); 
                } catch (err) {
                    console.error(`ChatModeProvider: Error disposing participant ${info.id}:`, err);
                }
            }
        }
        
        // Clear all references
        this.participants = [];
        this.memoryManager = undefined;
        this.extensionContext = undefined;
        this.initialized = false;
        this._disposed = true;
        
        // Set instance to null after fully disposing all resources
        console.log('ChatModeProvider: Successfully disposed all resources');
        ChatModeProvider.instance = null;
    }

    public registerMode(modeId: string): void {
      this.registeredModes.add(modeId);
    }

    public getRegisteredModes(): readonly string[] {
      return Array.from(this.registeredModes);
    }

    /**
     * Refresh all chat mode templates with the latest versions from the extension
     * @param forceUpdate Whether to force update all templates even if they're not outdated
     * @returns Promise that resolves with summary of updates when all templates are refreshed
     */
    public async refreshTemplates(forceUpdate: boolean = false): Promise<{
        updated: string[],
        skipped: string[],
        backups: string[]
    }> {
        if (this._disposed) { throw new Error('ChatModeProvider is disposed'); }
        if (!this.initialized) {
            throw new Error('ChatModeProvider not initialized');
        }
        
        console.log(`ChatModeProvider: Refreshing templates (forceUpdate=${forceUpdate})`);
        const updateResults = await this.ensureAllModeTemplates(forceUpdate);
        
        // Refresh participants with new templates
        await this.refreshParticipants();
        console.log('ChatModeProvider: Templates refreshed');
        
        return updateResults;
    }

    /**
     * Check if any chat mode templates have updates available
     * @returns Promise that resolves to true if any templates have updates available
     */
    public async checkForTemplateUpdates(): Promise<boolean> {
        if (this._disposed) { throw new Error('ChatModeProvider is disposed'); }
        if (!this.initialized) {
            throw new Error('ChatModeProvider not initialized');
        }
        
        const modes = ['ask', 'architect', 'code', 'debug'];
        const chatmodesDir = getWorkspaceChatmodesDir();
        if (!chatmodesDir) { return false; }
        
        for (const mode of modes) {
            const templatePath = path.join(chatmodesDir, `${mode}.chatmode.md`);
            
            // If template doesn't exist, it needs to be created
            if (!fs.existsSync(templatePath)) {
                return true;
            }
            
            try {
                // Get bundled template version
                const bundledTemplate = await this.getBundledTemplate(mode);
                const bundledVersion = this.extractTemplateVersion(bundledTemplate);
                
                // Get workspace template version
                const workspaceTemplate = await fs.promises.readFile(templatePath, 'utf8');
                const workspaceVersion = this.extractTemplateVersion(workspaceTemplate);
                
                // If bundled version is newer, update is needed
                if (this.isVersionNewer(bundledVersion, workspaceVersion)) {
                    return true;
                }
            } catch (err) {
                console.error(`ChatModeProvider: Error checking template version for ${mode}:`, err);
                // Consider an error as needing an update to be safe
                return true;
            }
        }
        
        return false; // No updates needed
    }
}

const DEFAULT_MODE_TEMPLATES: Record<string, string> = {
    ask: `---\ndescription: Ask mode is optimized for answering questions about your codebase, coding, and general technology concepts.\ntools: ['codebase', 'search', 'usages']\nversion: "1.0.0"\n---\n# Ask Mode\nYou are in ask mode. Answer questions about the project using the context below.\n\n---\n### Product Context\n{{memory-bank/productContext.md}}\n---`,
    architect: `---\ndescription: System architecture and design.\ntools: ['codebase', 'search', 'usages']\nversion: "1.0.0"\n---\n# Architect Mode\nYou are an expert system architect.\n\n---\n### Product Context\n{{memory-bank/productContext.md}}\n---`,
    code: `---\ndescription: Code implementation and review.\ntools: ['codebase', 'search', 'usages']\nversion: "1.0.0"\n---\n# Code Mode\nYou are an expert programmer.\n\n---\n### Active Context\n{{memory-bank/activeContext.md}}\n---`,
    debug: `---\ndescription: Debugging and troubleshooting.\ntools: ['codebase', 'search', 'usages']\nversion: "1.0.0"\n---\n# Debug Mode\nYou are a debugging expert.\n\n---\n### Active Context\n{{memory-bank/activeContext.md}}\n---`
};

function getWorkspaceChatmodesDir(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) { return undefined; }
    // Check for chat.modeFilesLocations setting
    const config = vscode.workspace.getConfiguration('chat');
    const locations = config.get<string[]>('modeFilesLocations');
    if (locations && locations.length > 0) {
        // Use the first configured location
        return path.isAbsolute(locations[0])
            ? locations[0]
            : path.join(workspaceFolders[0].uri.fsPath, locations[0]);
    }
    // Default to .github/chatmodes in the first workspace
    return path.join(workspaceFolders[0].uri.fsPath, '.github', 'chatmodes');
}
