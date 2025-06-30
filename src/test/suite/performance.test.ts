import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { MemoryManager } from '../../memory/MemoryManager';
import { ModeManager } from '../../memory/modes/ModeManager';
import { UpdateContextTool, LogDecisionTool, UpdateProgressTool } from '../../tools/index';

// Mock CancellationToken
const mockToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: (() => ({ dispose: () => {} })) as any
};

// Mock ToolInvocationToken
const mockInvocationToken = {
  request: { prompt: 'test prompt' }
} as any;

suite('Memory Bank Performance Tests', () => {
  let tempWorkspace: vscode.WorkspaceFolder;
  let memoryManager: MemoryManager;
  let modeManager: ModeManager;

  suiteSetup(async () => {
    // Create a temporary workspace for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-bank-perf-test-'));
    const workspaceUri = vscode.Uri.file(tempDir);
    tempWorkspace = {
      uri: workspaceUri,
      name: 'perf-test-workspace',
      index: 0
    };

    // Mock workspace.workspaceFolders for the tools
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [tempWorkspace],
      writable: false,
      configurable: true
    });

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

  test('Tool execution performance - should complete operations under 1 second', async function() {
    this.timeout(5000);
    
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    const logDecisionTool = new LogDecisionTool(memoryManager, modeManager);
    const updateProgressTool = new UpdateProgressTool(memoryManager, modeManager);
    
    // Mock cancellation token
    const cancellationToken = new vscode.CancellationTokenSource().token;
    
    // Test UpdateContextTool performance
    const start1 = Date.now();
    const prepareOptions1 = {
      input: { context: 'Performance test context' },
      requestId: 'test-1',
      // Add required VS Code types that might be missing
    } as vscode.LanguageModelToolInvocationPrepareOptions<{ context: string }>;
    
    await updateContextTool.prepare(prepareOptions1, cancellationToken);
    const prepare1Time = Date.now() - start1;
    assert.ok(prepare1Time < 100, `UpdateContextTool preparation took ${prepare1Time}ms, should be under 100ms`);
    
    const start2 = Date.now();
    const invokeOptions1 = {
      input: { context: 'Performance test context' },
      toolInvocationToken: mockInvocationToken
    };
    
    const result1 = await updateContextTool.invoke(invokeOptions1, cancellationToken);
    const invoke1Time = Date.now() - start2;
    assert.ok(invoke1Time < 1000, `UpdateContextTool invocation took ${invoke1Time}ms, should be under 1000ms`);
    assert.ok(result1);
    
    // Test LogDecisionTool performance
    const start3 = Date.now();
    const prepareOptions2 = {
      input: { decision: 'Use React', rationale: 'Better performance' },
      requestId: 'test-2',
    } as vscode.LanguageModelToolInvocationPrepareOptions<{ decision: string; rationale?: string }>;
    
    await logDecisionTool.prepare(prepareOptions2, cancellationToken);
    const prepare2Time = Date.now() - start3;
    assert.ok(prepare2Time < 100, `LogDecisionTool preparation took ${prepare2Time}ms, should be under 100ms`);
    
    const start4 = Date.now();
    const invokeOptions2 = {
      input: { decision: 'Use React', rationale: 'Better performance' },
      toolInvocationToken: mockInvocationToken
    };
    
    const result2 = await logDecisionTool.invoke(invokeOptions2, cancellationToken);
    const invoke2Time = Date.now() - start4;
    assert.ok(invoke2Time < 1000, `LogDecisionTool invocation took ${invoke2Time}ms, should be under 1000ms`);
    assert.ok(result2);
  });

  test('Concurrent tool operations - should handle parallel execution', async function() {
    this.timeout(10000);
    
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    const logDecisionTool = new LogDecisionTool(memoryManager, modeManager);
    const updateProgressTool = new UpdateProgressTool(memoryManager, modeManager);
    
    const cancellationToken = new vscode.CancellationTokenSource().token;
    
    // Create multiple concurrent operations
    const operations = [
      updateContextTool.invoke({
        input: { context: 'Concurrent test 1' },
        toolInvocationToken: mockInvocationToken
      }, cancellationToken),
      
      updateContextTool.invoke({
        input: { context: 'Concurrent test 2' },
        toolInvocationToken: mockInvocationToken
      }, cancellationToken),
      
      logDecisionTool.invoke({
        input: { decision: 'Concurrent decision', rationale: 'Testing concurrency' },
        toolInvocationToken: mockInvocationToken
      }, cancellationToken),
      
      updateProgressTool.invoke({
        input: { 
          done: ['Item 1'], 
          doing: ['Item 2'], 
          next: ['Item 3'] 
        },
        toolInvocationToken: mockInvocationToken
      }, cancellationToken)
    ];
    
    const start = Date.now();
    const results = await Promise.all(operations);
    const totalTime = Date.now() - start;
    
    // All operations should complete successfully
    assert.strictEqual(results.length, 4);
    results.forEach(result => assert.ok(result));
    
    // Concurrent execution should be faster than sequential
    assert.ok(totalTime < 5000, `Concurrent operations took ${totalTime}ms, should be under 5000ms`);
  });

  test('Memory usage - should not leak memory during repeated operations', async function() {
    this.timeout(30000);
    
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    const cancellationToken = new vscode.CancellationTokenSource().token;
    
    // Get initial memory usage (Node.js only has limited memory stats)
    const initialMemory = process.memoryUsage();
    
    // Perform many repeated operations
    for (let i = 0; i < 100; i++) {
      const invokeOptions = {
        input: { context: `Memory test iteration ${i}` },
        toolInvocationToken: mockInvocationToken
      };
      
      await updateContextTool.invoke(invokeOptions, cancellationToken);
      
      // Force garbage collection every 10 iterations if available
      if (i % 10 === 0 && global.gc) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage();
    const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Memory growth should be reasonable (less than 50MB for 100 operations)
    const maxGrowthMB = 50 * 1024 * 1024;
    assert.ok(heapGrowth < maxGrowthMB, 
      `Memory grew by ${Math.round(heapGrowth / 1024 / 1024)}MB, should be less than 50MB`);
  });

  test('Large file operations - should handle large memory bank files efficiently', async function() {
    this.timeout(15000);
    
    // Create a large context (1MB)
    const largeContext = 'A'.repeat(1024 * 1024);
    
    const start = Date.now();
    await memoryManager.updateActiveContext(largeContext);
    const writeTime = Date.now() - start;
    
    assert.ok(writeTime < 5000, `Large file write took ${writeTime}ms, should be under 5000ms`);
    
    const readStart = Date.now();
    const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
    const readTime = Date.now() - readStart;
    
    assert.ok(readTime < 2000, `Large file read took ${readTime}ms, should be under 2000ms`);
    assert.ok(content.includes(largeContext), 'Large content should be preserved');
  });

  test('Mode switching performance - should switch modes quickly', async function() {
    this.timeout(5000);
    
    const modes = ['architect', 'code', 'ask', 'debug'];
    const iterations = 50;
    
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const modeIndex = i % modes.length;
      const success = modeManager.setMode(modes[modeIndex]);
      assert.strictEqual(success, true);
      assert.strictEqual(modeManager.currentMode.id, modes[modeIndex]);
    }
    
    const totalTime = Date.now() - start;
    const avgTime = totalTime / iterations;
    
    assert.ok(avgTime < 10, `Average mode switch took ${avgTime}ms, should be under 10ms`);
  });

  test('File system stress - should handle many file operations', async function() {
    this.timeout(20000);
    
    const operations = [];
    const fileCount = 20;
    
    // Create multiple concurrent file operations
    for (let i = 0; i < fileCount; i++) {
      operations.push(
        memoryManager.logDecision(`Decision ${i}`, `Rationale ${i}`)
      );
      operations.push(
        memoryManager.updateActiveContext(`Context ${i}`)
      );
      operations.push(
        memoryManager.updateProgress([`Done ${i}`], [`Doing ${i}`], [`Next ${i}`])
      );
    }
    
    const start = Date.now();
    await Promise.all(operations);
    const totalTime = Date.now() - start;
    
    assert.ok(totalTime < 15000, `${operations.length} file operations took ${totalTime}ms, should be under 15000ms`);
    
    // Verify that all operations completed successfully
    const decisionContent = await memoryManager.getFileContent('memory-bank/decisionLog.md');
    const contextContent = await memoryManager.getFileContent('memory-bank/activeContext.md');
    const progressContent = await memoryManager.getFileContent('memory-bank/progress.md');
    
    assert.ok(decisionContent.includes('Decision 19'), 'All decisions should be logged');
    assert.ok(contextContent.includes('Context 19'), 'Final context should be set');
    assert.ok(progressContent.includes('Done 19'), 'All progress should be updated');
  });
});
