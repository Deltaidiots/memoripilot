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
        if (this._disposed) { throw new Error('ChatModeProvider is disposed'); }
        if (this.initialized) {
            return;
        }

        console.log('ChatModeProvider: Initializing...');
        this.memoryManager = memoryManager;
        this.extensionContext = context;

        // Ensure all mode templates exist
        await this.ensureAllModeTemplates();

        // Register chat participants and set up file watchers
        await this.registerParticipants();
        this.setupWatchers();
        this.initialized = true;
        console.log('ChatModeProvider: Initialization complete');
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
     * Ensure a mode template exists, creating it with a default if missing
     */
    private async ensureModeTemplate(mode: string): Promise<void> {
        const chatmodesDir = getWorkspaceChatmodesDir();
        if (!chatmodesDir) { return; }
        if (!fs.existsSync(chatmodesDir)) {
            fs.mkdirSync(chatmodesDir, { recursive: true });
        }
        const templatePath = path.join(chatmodesDir, `${mode}.chatmode.md`);
        try {
            await fs.promises.access(templatePath, fs.constants.F_OK);
        } catch {
            // Try to copy from /resources/chat-modes/{mode}.md if it exists
            let content: string | undefined;
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
                        content = await fs.promises.readFile(resourcePath, 'utf8');
                    }
                }
            } catch (err) {
                // Ignore, fallback to default
            }
            if (!content) {
                content = DEFAULT_MODE_TEMPLATES[mode] || `---\ndescription: ${mode} mode\ntools: []\n---\n# ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode\nDefault template.`;
            }
            await fs.promises.writeFile(templatePath, content, 'utf8');
            console.log(`ChatModeProvider: Created template for mode '${mode}' at ${templatePath}`);
        }
    }

    /**
     * Ensure all core mode templates exist
     */
    private async ensureAllModeTemplates(): Promise<void> {
        const modes = ['ask', 'architect', 'code', 'debug'];
        for (const mode of modes) {
            await this.ensureModeTemplate(mode);
        }
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
     * Dispose all resources (file watchers, participants, etc.)
     */
    public dispose(): void {
        if (this._disposed) { return; }
        for (const info of this.participants) {
            if (info.disposal && typeof info.disposal.dispose === 'function') {
                try { info.disposal.dispose(); } catch {}
            }
        }
        this.participants = [];
        this.memoryManager = undefined;
        this.extensionContext = undefined;
        this.initialized = false;
        this._disposed = true;
        ChatModeProvider.instance = null; // now valid
    }

    public registerMode(modeId: string): void {
      this.registeredModes.add(modeId);
    }

    public getRegisteredModes(): readonly string[] {
      return Array.from(this.registeredModes);
    }
}

const DEFAULT_MODE_TEMPLATES: Record<string, string> = {
    ask: `---\ndescription: Ask mode is optimized for answering questions about your codebase, coding, and general technology concepts.\ntools: ['codebase', 'search', 'usages']\n---\n# Ask Mode\nYou are in ask mode. Answer questions about the project using the context below.\n\n---\n### Product Context\n{{memory-bank/productContext.md}}\n---`,
    architect: `---\ndescription: System architecture and design.\ntools: ['codebase', 'search', 'usages']\n---\n# Architect Mode\nYou are an expert system architect.\n\n---\n### Product Context\n{{memory-bank/productContext.md}}\n---`,
    code: `---\ndescription: Code implementation and review.\ntools: ['codebase', 'search', 'usages']\n---\n# Code Mode\nYou are an expert programmer.\n\n---\n### Active Context\n{{memory-bank/activeContext.md}}\n---`,
    debug: `---\ndescription: Debugging and troubleshooting.\ntools: ['codebase', 'search', 'usages']\n---\n# Debug Mode\nYou are a debugging expert.\n\n---\n### Active Context\n{{memory-bank/activeContext.md}}\n---`
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
