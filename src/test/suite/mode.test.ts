import * as assert from 'assert';
import * as vscode from 'vscode';
import { ModeManager } from '../../memory/modes/ModeManager';
import { MemoryManager } from '../../memory/MemoryManager';
import { SwitchModeTool } from '../../tools/SwitchModeTool';
import { MODES } from '../../memory/modes/Modes';

suite('Mode Manager Test Suite', () => {
    let memoryManager: MemoryManager;
    let modeManager: ModeManager;

    setup(async () => {
        // Get the first workspace folder
        const ws = vscode.workspace.workspaceFolders?.[0];
        if (!ws) {
            assert.fail('No workspace folder available for testing');
            return;
        }

        // Initialize memory manager
        memoryManager = MemoryManager.getInstance(ws);
        await memoryManager.initialise();

        // Initialize mode manager
        modeManager = ModeManager.getInstance(memoryManager);
    });

    test('Initialize Mode Manager', () => {
        assert.ok(modeManager, 'Mode manager should be initialized');
        assert.strictEqual(modeManager.currentMode.id, 'ask', 'Default mode should be "ask"');
    });

    test('Switch Mode', () => {
        // Switch to Code mode
        modeManager.setMode('code');
        assert.strictEqual(modeManager.currentMode.id, 'code', 'Mode should be switched to "code"');
        
        // Check available read files
        assert.ok(modeManager.currentMode.readFiles.includes('memory-bank/activeContext.md'), 
            'Code mode should have access to activeContext.md');
        assert.ok(modeManager.currentMode.readFiles.includes('memory-bank/progress.md'), 
            'Code mode should have access to progress.md');
        assert.ok(modeManager.currentMode.readFiles.includes('memory-bank/systemPatterns.md'), 
            'Code mode should have access to systemPatterns.md');

        // Switch to Architect mode
        modeManager.setMode('architect');
        assert.strictEqual(modeManager.currentMode.id, 'architect', 'Mode should be switched to "architect"');

        // Check available read files
        assert.ok(modeManager.currentMode.readFiles.includes('memory-bank/productContext.md'), 
            'Architect mode should have access to productContext.md');
    });

    test('Switch Mode Tool', async () => {
        // Create a SwitchModeTool instance
        const switchModeTool = new SwitchModeTool();

        // Create a properly typed mock with unknown casting
        const mockOptions = {
            input: { mode: 'debug' }
        } as unknown as vscode.LanguageModelToolInvocationOptions<{ mode: string }>;

        // Invoke the tool
        const result = await switchModeTool.invoke(mockOptions, new vscode.CancellationTokenSource().token);
        
        // Verify the result
        assert.ok(result, 'Tool should return a result');
        assert.ok(modeManager.currentMode.id === 'debug', 'Mode should be switched to "debug"');
    });
});
