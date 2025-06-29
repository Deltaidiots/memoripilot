import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { MemoryManager } from '../../memory/MemoryManager';
import { ModeManager } from '../../memory/modes/ModeManager';

suite('Memory Bank Core Test Suite', () => {
  let tempWorkspace: vscode.WorkspaceFolder;
  let memoryManager: MemoryManager;
  let modeManager: ModeManager;

  suiteSetup(async () => {
    // Create a temporary workspace for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-bank-test-'));
    const workspaceUri = vscode.Uri.file(tempDir);
    tempWorkspace = {
      uri: workspaceUri,
      name: 'test-workspace',
      index: 0
    };

    // Initialize managers
    memoryManager = MemoryManager.getInstance(tempWorkspace);
    await memoryManager.initialise();
    modeManager = ModeManager.getInstance(memoryManager);
  });

  suiteTeardown(async () => {
    // Clean up temp directory
    if (tempWorkspace) {
      try {
        fs.rmSync(tempWorkspace.uri.fsPath, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temp workspace:', error);
      }
    }
  });

  test('Memory Bank initialization', async () => {
    // Test that memory bank was properly initialized
    const files: (keyof typeof import('../../memory/FileTemplates').FILE_TEMPLATES)[] = [
      'memory-bank/activeContext.md',
      'memory-bank/decisionLog.md',
      'memory-bank/progress.md',
      'memory-bank/productContext.md',
      'memory-bank/systemPatterns.md'
    ];
    
    for (const file of files) {
      const content = await memoryManager.getFileContent(file);
      assert.ok(content.length > 0, `${file} should have content`);
    }
  });

  test('Mode detection and switching', async () => {
    // Test mode detection
    const detectedMode = modeManager.detectMode('I want to understand the architecture');
    assert.strictEqual(detectedMode, 'ask');
    
    const architectMode = modeManager.detectMode('I need to design the system structure');
    assert.strictEqual(architectMode, 'architect');
    
    const codeMode = modeManager.detectMode('I need to implement the login function');
    assert.strictEqual(codeMode, 'code');
    
    const debugMode = modeManager.detectMode('There is a bug in the authentication');
    assert.strictEqual(debugMode, 'debug');
  });

  test('Mode switching', async () => {
    // Test manual mode switching
    const success = modeManager.setMode('architect');
    assert.strictEqual(success, true);
    assert.strictEqual(modeManager.currentMode.id, 'architect');
    
    // Test switching to code mode
    const codeSuccess = modeManager.setMode('code');
    assert.strictEqual(codeSuccess, true);
    assert.strictEqual(modeManager.currentMode.id, 'code');
    
    // Test invalid mode
    const invalidSuccess = modeManager.setMode('invalid-mode');
    assert.strictEqual(invalidSuccess, false);
    // Should stay in previous mode
    assert.strictEqual(modeManager.currentMode.id, 'code');
  });

  test('Memory Manager file operations', async () => {
    const testFile: keyof typeof import('../../memory/FileTemplates').FILE_TEMPLATES = 'memory-bank/activeContext.md';
    const testContent = '# Test File\n\nThis is a test.';
    
    // Test writing content
    await memoryManager.writeFile(testFile, testContent);
    
    // Test reading content
    const readContent = await memoryManager.getFileContent(testFile);
    assert.strictEqual(readContent, testContent);
    
    // Test appending content
    const appendText = '\n\nAppended text.';
    await memoryManager.appendLine(testFile, appendText);
    
    const finalContent = await memoryManager.getFileContent(testFile);
    assert.ok(finalContent.includes('Appended text'));
  });

  test('Context updating', async () => {
    const testContext = 'Working on authentication system';
    
    // Test updating active context
    await memoryManager.updateActiveContext(testContext);
    
    // Verify the context was written
    const contextContent = await memoryManager.getFileContent('memory-bank/activeContext.md');
    assert.ok(contextContent.includes(testContext));
  });

  test('Decision logging', async () => {
    const testDecision = 'Use PostgreSQL for database';
    const testRationale = 'Better performance and ACID compliance';
    
    // Test logging a decision
    await memoryManager.logDecision(testDecision, testRationale);
    
    // Verify the decision was logged
    const decisionContent = await memoryManager.getFileContent('memory-bank/decisionLog.md');
    assert.ok(decisionContent.includes(testDecision));
    assert.ok(decisionContent.includes(testRationale));
  });

  test('Progress updating', async () => {
    const testProgress = {
      done: ['Login page', 'User model'],
      doing: ['Dashboard'],
      next: ['Admin panel', 'Reports']
    };
    
    // Test updating progress
    await memoryManager.updateProgress(testProgress.done, testProgress.doing, testProgress.next);
    
    // Verify the progress was updated
    const progressContent = await memoryManager.getFileContent('memory-bank/progress.md');
    assert.ok(progressContent.includes('Login page'));
    assert.ok(progressContent.includes('Dashboard'));
    assert.ok(progressContent.includes('Admin panel'));
  });

  test('Mode permissions', async () => {
    // Test that different modes have appropriate read permissions
    modeManager.setMode('architect');
    const architectMode = modeManager.currentMode;
    assert.ok(architectMode.readFiles.includes('memory-bank/productContext.md'));
    assert.ok(architectMode.readFiles.includes('memory-bank/systemPatterns.md'));
    
    modeManager.setMode('code');
    const codeMode = modeManager.currentMode;
    assert.ok(codeMode.readFiles.includes('memory-bank/activeContext.md'));
    assert.ok(codeMode.readFiles.includes('memory-bank/progress.md'));
    
    modeManager.setMode('debug');
    const debugMode = modeManager.currentMode;
    assert.ok(debugMode.readFiles.includes('memory-bank/decisionLog.md'));
  });

  test('Memory summaries', async () => {
    // Test getting summaries
    const summaries = await memoryManager.getSummaries();
    assert.ok(Array.isArray(summaries));
    assert.ok(summaries.length > 0);
    
    // Each summary should have path and summary
    for (const summary of summaries) {
      assert.ok(summary.path);
      assert.ok(typeof summary.summary === 'string');
    }
  });
});
