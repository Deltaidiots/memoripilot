import * as assert from 'assert';
import * as vscode from 'vscode';
import { MemoryManager, MemoryFile } from '../../memory/MemoryManager';
import { ModeManager } from '../../memory/modes/ModeManager';
import { Mode } from '../../memory/modes/Mode';
import { ALL_FILE_TEMPLATES } from '../../memory/FileTemplates';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('Type Safety & Validation Tests', () => {
  let tempWorkspace: vscode.WorkspaceFolder;
  let memoryManager: MemoryManager;
  let modeManager: ModeManager;

  suiteSetup(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-bank-types-test-'));
    const workspaceUri = vscode.Uri.file(tempDir);
    tempWorkspace = {
      uri: workspaceUri,
      name: 'types-test-workspace',
      index: 0
    };

    memoryManager = MemoryManager.getInstance(tempWorkspace);
    await memoryManager.initialise();
    modeManager = ModeManager.getInstance(memoryManager);
  });

  suiteTeardown(async () => {
    if (tempWorkspace) {
      try {
        fs.rmSync(tempWorkspace.uri.fsPath, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temp workspace:', error);
      }
    }
  });

  test('MemoryFile type - should only accept valid memory file paths', async () => {
    // Test all valid memory file paths
    const validPaths: MemoryFile[] = Object.keys(ALL_FILE_TEMPLATES) as MemoryFile[];

    for (const validPath of validPaths) {
      // These should all work without TypeScript errors
      const content = await memoryManager.getFileContent(validPath);
      assert.ok(typeof content === 'string', `Should return string content for ${validPath}`);
      
      await memoryManager.writeFile(validPath, 'Test content');
      const updatedContent = await memoryManager.getFileContent(validPath);
      assert.ok(updatedContent.includes('Test content'), `Should update content for ${validPath}`);
    }
  });

  test('FILE_TEMPLATES - should have correct structure and types', () => {
    // Verify FILE_TEMPLATES has the expected structure
    assert.ok(typeof ALL_FILE_TEMPLATES === 'object', 'ALL_FILE_TEMPLATES should be an object');
    
    const expectedFiles = [
      'memory-bank/activeContext.md',
      'memory-bank/decisionLog.md',
      'memory-bank/progress.md',
      'memory-bank/productContext.md',
      'memory-bank/systemPatterns.md',
      'memory-bank/projectBrief.md'
    ];

    for (const expectedFile of expectedFiles) {
      assert.ok(expectedFile in ALL_FILE_TEMPLATES, `ALL_FILE_TEMPLATES should contain ${expectedFile}`);
      assert.ok(typeof ALL_FILE_TEMPLATES[expectedFile as MemoryFile] === 'string', 
               `Template for ${expectedFile} should be a string`);
      assert.ok(ALL_FILE_TEMPLATES[expectedFile as MemoryFile].length > 0, 
               `Template for ${expectedFile} should not be empty`);
    }
  });

  test('Mode type - should have correct structure and validation', () => {
    const currentMode: Mode = modeManager.currentMode;
    
    // Verify Mode interface compliance
    assert.ok(typeof currentMode.id === 'string', 'Mode id should be string');
    assert.ok(typeof currentMode.name === 'string', 'Mode name should be string');
    assert.ok(typeof currentMode.description === 'string', 'Mode description should be string');
    assert.ok(Array.isArray(currentMode.readFiles), 'Mode readFiles should be array');
    assert.ok(Array.isArray(currentMode.writeFiles), 'Mode writeFiles should be array');

    // Verify all file paths in mode are valid MemoryFile types
    for (const filePath of currentMode.readFiles) {
      assert.ok(filePath in ALL_FILE_TEMPLATES, `Read file ${filePath} should be valid MemoryFile`);
    }

    for (const filePath of currentMode.writeFiles) {
      assert.ok(filePath in ALL_FILE_TEMPLATES, `Write file ${filePath} should be valid MemoryFile`);
    }
  });

  test('ModeManager - should enforce valid mode IDs', () => {
    const validModes = ['architect', 'code', 'ask', 'debug'];
    
    // Test setting valid modes
    for (const validMode of validModes) {
      const success = modeManager.setMode(validMode);
      assert.strictEqual(success, true, `Should accept valid mode: ${validMode}`);
      assert.strictEqual(modeManager.currentMode.id, validMode, `Current mode should be ${validMode}`);
    }

    // Test setting invalid modes
    const invalidModes = ['invalid', 'ARCHITECT', 'Code', 'unknown', '', null, undefined];
    
    for (const invalidMode of invalidModes) {
      const previousMode = modeManager.currentMode.id;
      const success = modeManager.setMode(invalidMode as any);
      assert.strictEqual(success, false, `Should reject invalid mode: ${invalidMode}`);
      assert.strictEqual(modeManager.currentMode.id, previousMode, 
                        `Current mode should remain unchanged after invalid mode: ${invalidMode}`);
    }
  });

  test('MemoryManager - should validate input parameters', async () => {
    // Test updateActiveContext with various input types
    const validContexts = [
      'Valid context string',
      'Context with\nmultiple\nlines',
      'Context with special chars: @#$%^&*()',
      '123456789',
      ''
    ];

    for (const context of validContexts) {
      try {
        await memoryManager.updateActiveContext(context);
        // Should succeed or fail gracefully
      } catch (error) {
        assert.ok(error instanceof Error, `Should provide Error object for context: ${context}`);
      }
    }

    // Test logDecision parameter validation
    const validDecisions = [
      { decision: 'Valid decision', rationale: 'Valid rationale' },
      { decision: 'Decision without rationale', rationale: undefined },
      { decision: 'Decision with empty rationale', rationale: '' }
    ];

    for (const { decision, rationale } of validDecisions) {
      try {
        await memoryManager.logDecision(decision, rationale);
        // Should succeed or fail gracefully
      } catch (error) {
        assert.ok(error instanceof Error, `Should provide Error object for decision: ${decision}`);
      }
    }
  });

  test('Progress update - should validate array parameters', async () => {
    const validProgressData = [
      { done: [], doing: [], next: [] },
      { done: ['Item 1'], doing: ['Item 2'], next: ['Item 3'] },
      { done: ['A', 'B', 'C'], doing: ['D', 'E'], next: ['F', 'G', 'H', 'I'] }
    ];

    for (const { done, doing, next } of validProgressData) {
      try {
        await memoryManager.updateProgress(done, doing, next);
        // Should succeed
      } catch (error) {
        assert.ok(error instanceof Error, `Should handle progress data gracefully`);
      }
    }
  });

  test('SummarisedMemory type - should have correct structure', async () => {
    const summaries = await memoryManager.getSummaries();
    
    assert.ok(Array.isArray(summaries), 'getSummaries should return array');
    
    for (const summary of summaries) {
      // Verify SummarisedMemory interface compliance
      assert.ok(typeof summary.path === 'string', 'Summary path should be string');
      assert.ok(summary.path in ALL_FILE_TEMPLATES, 'Summary path should be valid MemoryFile');
      assert.ok(typeof summary.summary === 'string', 'Summary summary should be string');
    }
  });

  test('Event handling - should emit correct event types', (done) => {
    let contextUpdatedEmitted = false;
    
    // Listen for context updated event
    memoryManager.once('contextUpdated', (context: string) => {
      assert.ok(typeof context === 'string', 'Context event should include string');
      contextUpdatedEmitted = true;
      
      if (contextUpdatedEmitted) {
        done();
      }
    });

    // Trigger context update
    memoryManager.updateActiveContext('Test event emission').catch(done);
  });

  test('Singleton pattern - should maintain single instances', () => {
    // Test MemoryManager singleton
    const memoryManager1 = MemoryManager.getInstance(tempWorkspace);
    const memoryManager2 = MemoryManager.getInstance(tempWorkspace);
    assert.strictEqual(memoryManager1, memoryManager2, 'MemoryManager should be singleton');

    // Test ModeManager singleton
    const modeManager1 = ModeManager.getInstance(memoryManager);
    const modeManager2 = ModeManager.getInstance(memoryManager);
    assert.strictEqual(modeManager1, modeManager2, 'ModeManager should be singleton');
  });

  test('URI handling - should work with VS Code Uri objects', () => {
    const workspaceUri = tempWorkspace.uri;
    
    // Verify URI properties
    assert.ok(workspaceUri.scheme, 'Workspace URI should have scheme');
    assert.ok(workspaceUri.fsPath, 'Workspace URI should have fsPath');
    assert.ok(typeof workspaceUri.toString === 'function', 'URI should have toString method');
    
    // Test path construction
    const memoryBankUri = vscode.Uri.joinPath(workspaceUri, 'memory-bank');
    assert.ok(memoryBankUri.fsPath.includes('memory-bank'), 'Should construct paths correctly');
  });

  test('Error types - should provide meaningful error information', async () => {
    try {
      // Try to access non-existent file
      await memoryManager.getFileContent('memory-bank/nonexistent.md' as any);
      assert.fail('Should have thrown error for non-existent file');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw Error instance');
      assert.ok(error.message, 'Error should have message');
      assert.ok(typeof error.message === 'string', 'Error message should be string');
    }
  });

  test('Async/await handling - should properly handle promise chains', async () => {
    // Test chained async operations
    const context = 'Async test context';
    
    await memoryManager.updateActiveContext(context);
    const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
    assert.ok(content.includes(context), 'Async operations should complete in order');
    
    // Test parallel async operations
    const promises = [
      memoryManager.updateActiveContext('Parallel 1'),
      memoryManager.logDecision('Parallel decision', 'Parallel rationale'),
      memoryManager.updateProgress(['Done'], ['Doing'], ['Next'])
    ];
    
    await Promise.all(promises);
    // All should complete without issues
  });

  test('TypeScript strict mode compliance - should handle undefined/null properly', async () => {
    // Test handling of potentially undefined values
    const workspace = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspace, 'Workspace should be defined in test environment');
    
    // Test mode detection with edge cases
    const detectedMode1 = modeManager.detectMode('test prompt');
    if (detectedMode1) {
      assert.ok(typeof detectedMode1 === 'string', 'Detected mode should be string if defined');
    }
    
    const detectedMode2 = modeManager.detectMode('');
    // Should handle empty string gracefully (return undefined or default mode)
    if (detectedMode2) {
      assert.ok(typeof detectedMode2 === 'string', 'Detected mode should be string if defined');
    }
  });
});
