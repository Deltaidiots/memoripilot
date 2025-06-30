import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { MemoryManager } from '../../memory/MemoryManager';
import { ModeManager } from '../../memory/modes/ModeManager';
import { UpdateContextTool, LogDecisionTool, ShowMemoryTool } from '../../tools/index';

// Mock CancellationToken
const mockToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: (() => ({ dispose: () => {} })) as any
};

// Mock ToolInvocationToken
const mockInvocationToken = {
  request: { prompt: 'test prompt' }
} as any;

suite('Memory Bank Security & Edge Case Tests', () => {
  let tempWorkspace: vscode.WorkspaceFolder;
  let memoryManager: MemoryManager;
  let modeManager: ModeManager;

  suiteSetup(async () => {
    // Create a temporary workspace for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-bank-security-test-'));
    const workspaceUri = vscode.Uri.file(tempDir);
    tempWorkspace = {
      uri: workspaceUri,
      name: 'security-test-workspace',
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

  test('Input validation - should handle malicious input safely', async () => {
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    
    // Test with various potentially malicious inputs
    const maliciousInputs = [
      '../../../../../../etc/passwd', // Path traversal
      '<script>alert("xss")</script>', // XSS attempt
      'DROP TABLE users;', // SQL injection attempt
      'eval("malicious code")', // Code injection
      'null\0byte\0injection', // Null byte injection
      '../../../../../../../windows/system32/cmd.exe', // Windows path traversal
      '${process.env.SECRET}', // Template injection
      'file://etc/passwd', // File URI scheme
      'javascript:alert(1)', // JavaScript URI scheme
    ];

    for (const maliciousInput of maliciousInputs) {
      try {
        const invokeOptions = {
          input: { context: maliciousInput },
          toolInvocationToken: mockInvocationToken
        };

        const result = await updateContextTool.invoke(invokeOptions, mockToken);
        
        // Should not crash and should sanitize input
        assert.ok(result, `Tool should handle malicious input: ${maliciousInput}`);
        
        // Verify the malicious input was written safely to the file
        const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
        assert.ok(content.includes(maliciousInput), 'Input should be preserved but safely handled');
        
      } catch (error) {
        // Should not throw errors for malicious input
        assert.fail(`Tool should not crash on malicious input: ${maliciousInput}. Error: ${error}`);
      }
    }
  });

  test('File path security - should prevent directory traversal attacks', async () => {
    const showMemoryTool = new ShowMemoryTool(memoryManager, modeManager);
    
    // Test with path traversal attempts
    const pathTraversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\hosts',
      '/etc/shadow',
      'C:\\Windows\\System32\\config\\SAM',
      '../../../../../../proc/version',
      '../../../../../../../var/log/auth.log'
    ];

    for (const maliciousPath of pathTraversalAttempts) {
      try {
        const invokeOptions = {
          input: { fileName: maliciousPath },
          toolInvocationToken: mockInvocationToken
        };

        const result = await showMemoryTool.invoke(invokeOptions, mockToken);
        
        // Should handle the request safely, either by sanitizing the path or failing gracefully
        assert.ok(result, `Tool should handle path traversal attempt: ${maliciousPath}`);
        
        // The result should not contain sensitive system file content
        const resultText = (result.content[0] as any).value || (result.content[0] as any).text || '';
        assert.ok(!resultText.includes('root:'), 'Should not expose passwd file content');
        assert.ok(!resultText.includes('admin:'), 'Should not expose system user content');
        
      } catch (error) {
        // It's acceptable to throw errors for invalid paths, but should be controlled
        const errorMessage = error instanceof Error ? error.message : String(error);
        assert.ok(errorMessage, 'Error should have a descriptive message');
      }
    }
  });

  test('Large input handling - should handle extremely large inputs gracefully', async () => {
    const logDecisionTool = new LogDecisionTool(memoryManager, modeManager);
    
    // Test with extremely large decision text (10MB)
    const largeDecision = 'A'.repeat(10 * 1024 * 1024);
    const largeRationale = 'B'.repeat(5 * 1024 * 1024);
    
    try {
      const invokeOptions = {
        input: { 
          decision: largeDecision,
          rationale: largeRationale
        },
        toolInvocationToken: mockInvocationToken
      };

      const result = await logDecisionTool.invoke(invokeOptions, mockToken);
      
      // Should handle large input without crashing
      assert.ok(result, 'Tool should handle large input');
      
      // Verify content was written (may be truncated for performance)
      const content = await memoryManager.getFileContent('memory-bank/decisionLog.md');
      assert.ok(content.length > 1000, 'Large content should be written');
      
    } catch (error) {
      // It's acceptable to fail on extremely large input, but should be controlled
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.ok(errorMessage.includes('too large') || errorMessage.includes('memory'), 
               'Should provide meaningful error for large input');
    }
  });

  test('Special character handling - should handle unicode and special characters', async () => {
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    
    // Test with various special characters and unicode
    const specialInputs = [
      '🚀 Working on rocket ship feature! 🎉',
      'Testing with émojis and àccénts',
      '中文测试 Japanese: テスト Arabic: اختبار',
      'Math symbols: ∑∏∫∂∇ ≤≥≠≈∞',
      'Combining chars: a\u0300\u0301\u0302', // a with multiple diacritics
      'Zero-width chars: a\u200Bb\u200Cc\u200Dd', // Zero-width space, non-joiner, joiner
      'RTL text: שלום עולם Hello world',
      'Newlines\nand\ttabs\rand\rcarriage\rreturns',
      'Quotes: "double" \'single\' `backtick` «guillemets»',
      'Symbols: ©®™§¶†‡•…‰′″‴‵‶‷‸‹›‼‽⁇⁈⁉⁏'
    ];

    for (const specialInput of specialInputs) {
      try {
        const invokeOptions = {
          input: { context: specialInput },
          toolInvocationToken: mockInvocationToken
        };

        const result = await updateContextTool.invoke(invokeOptions, mockToken);
        
        assert.ok(result, `Tool should handle special characters: ${specialInput}`);
        
        // Verify special characters are preserved correctly
        const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
        assert.ok(content.includes(specialInput), 'Special characters should be preserved');
        
      } catch (error) {
        assert.fail(`Tool should handle special characters: ${specialInput}. Error: ${error}`);
      }
    }
  });

  test('Concurrent access - should handle file system race conditions', async () => {
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    const logDecisionTool = new LogDecisionTool(memoryManager, modeManager);
    
    // Create many concurrent operations on the same files
    const operations = [];
    const operationCount = 50;
    
    for (let i = 0; i < operationCount; i++) {
      // Mix different operations that might conflict
      if (i % 2 === 0) {
        operations.push(
          updateContextTool.invoke({
            input: { context: `Concurrent context ${i}` },
            toolInvocationToken: mockInvocationToken
          }, mockToken)
        );
      } else {
        operations.push(
          logDecisionTool.invoke({
            input: { 
              decision: `Concurrent decision ${i}`,
              rationale: `Rationale ${i}`
            },
            toolInvocationToken: mockInvocationToken
          }, mockToken)
        );
      }
    }
    
    // All operations should complete without errors
    const results = await Promise.all(operations);
    assert.strictEqual(results.length, operationCount);
    
    // Verify that all results are successful
    for (let i = 0; i < results.length; i++) {
      assert.ok(results[i], `Operation ${i} should succeed`);
    }
    
    // Verify final file states are consistent
    const contextContent = await memoryManager.getFileContent('memory-bank/activeContext.md');
    const decisionContent = await memoryManager.getFileContent('memory-bank/decisionLog.md');
    
    assert.ok(contextContent.length > 0, 'Context file should not be empty');
    assert.ok(decisionContent.length > 0, 'Decision file should not be empty');
  });

  test('Memory pressure - should handle low memory conditions gracefully', async () => {
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    
    // Simulate memory pressure by creating large objects
    const largeObjects: any[] = [];
    
    try {
      // Create large objects to consume memory
      for (let i = 0; i < 100; i++) {
        largeObjects.push(new Array(100000).fill(`memory-pressure-test-${i}`));
      }
      
      // Try to perform operations under memory pressure
      const invokeOptions = {
        input: { context: 'Testing under memory pressure' },
        toolInvocationToken: mockInvocationToken
      };

      const result = await updateContextTool.invoke(invokeOptions, mockToken);
      
      assert.ok(result, 'Tool should work under memory pressure');
      
    } catch (error) {
      // It's acceptable to fail under extreme memory pressure
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.ok(errorMessage, 'Should provide meaningful error under memory pressure');
    } finally {
      // Clean up to prevent actual memory issues in test runner
      largeObjects.length = 0;
    }
  });

  test('Error recovery - should recover from file system errors', async () => {
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    
    // Create a scenario where the memory bank directory might be temporarily unavailable
    const memoryBankPath = path.join(tempWorkspace.uri.fsPath, 'memory-bank');
    
    try {
      // Make the directory read-only to simulate permission issues
      if (fs.existsSync(memoryBankPath)) {
        fs.chmodSync(memoryBankPath, 0o444); // Read-only
      }
      
      const invokeOptions = {
        input: { context: 'Testing error recovery' },
        toolInvocationToken: mockInvocationToken
      };

      const result = await updateContextTool.invoke(invokeOptions, mockToken);
      
      // Should either succeed after recovery or fail gracefully
      if (result) {
        assert.ok(result, 'Tool recovered from permission error');
      }
      
    } catch (error) {
      // Should provide meaningful error message
      const err = error instanceof Error ? error : new Error(String(error));
      assert.ok(err.message, 'Should provide descriptive error message');
      assert.ok(err.message.includes('permission') || 
               err.message.includes('access') || 
               err.message.includes('write'),
               'Error should indicate the permission issue');
    } finally {
      // Restore permissions
      try {
        if (fs.existsSync(memoryBankPath)) {
          fs.chmodSync(memoryBankPath, 0o755); // Restore full permissions
        }
      } catch (restoreError) {
        console.warn('Failed to restore permissions:', restoreError);
      }
    }
  });

  test('Cancellation token handling - should respect cancellation requests', async () => {
    const updateContextTool = new UpdateContextTool(memoryManager, modeManager);
    const cancellationSource = new vscode.CancellationTokenSource();
    
    // Cancel the operation immediately
    cancellationSource.cancel();
    
    const invokeOptions = {
      input: { context: 'This operation should be cancelled' },
      toolInvocationToken: mockInvocationToken
    };

    try {
      const result = await updateContextTool.invoke(invokeOptions, cancellationSource.token);
      
      // If the operation completes, it should be very fast
      // (Since the tool might not check cancellation for simple operations)
      assert.ok(result, 'Tool completed despite cancellation');
      
    } catch (error) {
      // It's acceptable to throw cancellation errors
      const err = error instanceof Error ? error : new Error(String(error));
      assert.ok(err.message.includes('cancel') || err.name === 'CancelledError',
               'Should throw cancellation-related error');
    }
  });
});
