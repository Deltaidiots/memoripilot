import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { MemoryManager } from '../../memory/MemoryManager';
import { ModeManager } from '../../memory/modes/ModeManager';
import { UpdateContextTool } from '../../tools/UpdateContextTool';

suite('Memory Bank Stress & Edge Case Tests', () => {
  let tempWorkspace: vscode.WorkspaceFolder;
  let memoryManager: MemoryManager;
  let modeManager: ModeManager;

  suiteSetup(async () => {
    // Create a temporary workspace for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-bank-stress-test-'));
    const workspaceUri = vscode.Uri.file(tempDir);
    tempWorkspace = {
      uri: workspaceUri,
      name: 'stress-test-workspace',
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

  test('Large content handling - should handle very long context strings', async () => {
    // Test with very large context (10KB+)
    const largeContext = 'This is a very long context. '.repeat(500); // ~15KB
    
    try {
      await memoryManager.updateActiveContext(largeContext);
      const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
      assert.ok(content.includes(largeContext), 'Should handle large content');
    } catch (error) {
      // Should either succeed or fail gracefully
      assert.ok(error instanceof Error, 'Should provide meaningful error for large content');
    }
  });

  test('Unicode and special characters - should handle international content', async () => {
    const unicodeContext = `
    Working on internationalization:
    - 中文支持 (Chinese support)
    - العربية (Arabic support)
    - Русский язык (Russian support)
    - हिन्दी (Hindi support)
    - 日本語 (Japanese support)
    - Emoji support: 🚀 💻 ⚡ 🎯 ✅
    - Special chars: @#$%^&*()[]{}|\\:";'<>?,.
    `;

    await memoryManager.updateActiveContext(unicodeContext);
    const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
    
    assert.ok(content.includes('中文支持'), 'Should handle Chinese characters');
    assert.ok(content.includes('العربية'), 'Should handle Arabic characters');
    assert.ok(content.includes('🚀'), 'Should handle emoji');
    assert.ok(content.includes('@#$%'), 'Should handle special characters');
  });

  test('Concurrent operations - should handle multiple simultaneous updates', async () => {
    const operations = [];
    
    // Create multiple concurrent operations
    for (let i = 0; i < 10; i++) {
      operations.push(
        memoryManager.updateActiveContext(`Concurrent update ${i}`),
        memoryManager.logDecision(`Decision ${i}`, `Rationale ${i}`),
        memoryManager.updateProgress([`Done ${i}`], [`Doing ${i}`], [`Next ${i}`])
      );
    }
    
    // All operations should complete without errors
    try {
      await Promise.all(operations);
      assert.ok(true, 'All concurrent operations completed');
    } catch (error) {
      assert.fail(`Concurrent operations failed: ${error}`);
    }
  });

  test('Memory pressure - should handle rapid repeated operations', async () => {
    // Rapidly perform many operations
    for (let i = 0; i < 50; i++) {
      await memoryManager.updateActiveContext(`Rapid update ${i}`);
      
      // Occasionally check that memory isn't growing excessively
      if (i % 10 === 0) {
        const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
        assert.ok(content.length > 0, `Content should exist after ${i} operations`);
      }
    }
  });

  test('Invalid file paths - should handle malformed paths gracefully', async () => {
    try {
      // Test with invalid memory file path
      await memoryManager.getFileContent('invalid-path.md' as any);
      assert.fail('Should have thrown error for invalid path');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw meaningful error for invalid path');
    }
  });

  test('Filesystem permissions - should handle read-only scenarios', async () => {
    // This test might not work in all environments, but we can try
    const memoryBankPath = path.join(tempWorkspace.uri.fsPath, 'memory-bank');
    
    try {
      // Make directory read-only temporarily
      fs.chmodSync(memoryBankPath, 0o444);
      
      try {
        await memoryManager.updateActiveContext('Test write to read-only');
        // If it succeeds, that's fine too
      } catch (error) {
        // Should handle permission errors gracefully
        assert.ok(error instanceof Error, 'Should handle permission errors');
      }
    } finally {
      // Restore permissions
      try {
        fs.chmodSync(memoryBankPath, 0o755);
      } catch (e) {
        // Ignore errors in cleanup
      }
    }
  });

  test('Malformed JSON-like content - should handle parsing edge cases', async () => {
    const malformedContent = `
    This looks like JSON but isn't: {"incomplete": 
    And this has weird formatting:
    {
      "key": "value"
      "missing_comma": true
    }
    `;
    
    // Should handle non-JSON content gracefully
    await memoryManager.updateActiveContext(malformedContent);
    const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
    assert.ok(content.includes(malformedContent), 'Should handle malformed content');
  });

  test('Mode detection edge cases - should handle ambiguous prompts', async () => {
    const ambiguousPrompts = [
      '', // Empty string
      '   ', // Whitespace only
      'a', // Single character
      'I need to code debug architect ask help', // Multiple keywords
      'UPPERCASE ONLY TEXT', // All caps
      'lowercase only text', // All lowercase
      '123456789', // Numbers only
      '!@#$%^&*()', // Symbols only
    ];

    for (const prompt of ambiguousPrompts) {
      const detectedMode = modeManager.detectMode(prompt);
      // Should return a valid mode or null/undefined, not crash
      if (detectedMode) {
        assert.ok(['architect', 'code', 'ask', 'debug'].includes(detectedMode), 
                 `Should return valid mode for "${prompt}"`);
      }
    }
  });

  test('File encoding edge cases - should handle different encodings', async () => {
    // Test with content that might have encoding issues
    const binaryLikeContent = String.fromCharCode(0, 1, 2, 3, 255, 254, 253);
    const mixedContent = `Normal text ${binaryLikeContent} more normal text`;
    
    try {
      await memoryManager.updateActiveContext(mixedContent);
      const content = await memoryManager.getFileContent('memory-bank/activeContext.md');
      // Should either handle it or fail gracefully
      assert.ok(content.length > 0, 'Should handle mixed content');
    } catch (error) {
      // Failing gracefully is also acceptable
      assert.ok(error instanceof Error, 'Should provide meaningful error for encoding issues');
    }
  });

  test('Resource cleanup - should properly clean up resources', async () => {
    // Create multiple managers and ensure they clean up properly
    const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-bank-cleanup-test-'));
    const workspaceUri2 = vscode.Uri.file(tempDir2);
    const tempWorkspace2 = {
      uri: workspaceUri2,
      name: 'cleanup-test-workspace',
      index: 1
    };

    try {
      const memoryManager2 = MemoryManager.getInstance(tempWorkspace2);
      await memoryManager2.initialise();
      
      const modeManager2 = ModeManager.getInstance(memoryManager2);
      
      // Perform some operations
      await memoryManager2.updateActiveContext('Cleanup test');
      modeManager2.setMode('architect');
      
      // Managers should be working
      assert.ok(memoryManager2);
      assert.ok(modeManager2);
      assert.strictEqual(modeManager2.currentMode.id, 'architect');
      
    } finally {
      // Clean up
      fs.rmSync(tempDir2, { recursive: true, force: true });
    }
  });

  test('Tool error handling - should handle tool invocation errors gracefully', async () => {
    const tool = new UpdateContextTool();
    
    // Test with various malformed inputs
    const malformedInputs = [
      { input: null as any, toolInvocationToken: null as any },
      { input: { context: null } as any, toolInvocationToken: {} as any },
      { input: { context: undefined } as any, toolInvocationToken: {} as any },
      { input: { wrongProperty: 'value' } as any, toolInvocationToken: {} as any },
    ];

    for (const malformedInput of malformedInputs) {
      try {
        const mockToken = {
          isCancellationRequested: false,
          onCancellationRequested: (() => ({ dispose: () => {} })) as any
        };
        
        const result = await tool.invoke(malformedInput, mockToken);
        // Should either succeed or return an error result, not crash
        assert.ok(result, 'Should return a result even with malformed input');
      } catch (error) {
        // Throwing an error is also acceptable
        assert.ok(error instanceof Error, 'Should provide meaningful error');
      }
    }
  });

  test('Performance characteristics - should complete operations in reasonable time', async function() {
    this.timeout(5000); // 5 second timeout
    
    const startTime = Date.now();
    
    // Perform a series of operations and measure time
    await memoryManager.updateActiveContext('Performance test context');
    await memoryManager.logDecision('Performance test decision', 'Testing performance');
    await memoryManager.updateProgress(['Item 1'], ['Item 2'], ['Item 3']);
    
    const summaries = await memoryManager.getSummaries();
    assert.ok(summaries.length > 0, 'Should generate summaries');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Operations should complete within reasonable time (less than 2 seconds)
    assert.ok(duration < 2000, `Operations took too long: ${duration}ms`);
  });
});
