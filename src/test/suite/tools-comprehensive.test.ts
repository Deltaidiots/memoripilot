import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Import all tools for testing
import { UpdateContextTool } from '../../tools/UpdateContextTool';
import { LogDecisionTool } from '../../tools/LogDecisionTool';
import { UpdateProgressTool } from '../../tools/UpdateProgressTool';
import { ShowMemoryTool } from '../../tools/ShowMemoryTool';
import { UpdateMemoryBankTool } from '../../tools/UpdateMemoryBankTool';
import { SwitchModeTool } from '../../tools/SwitchModeTool';
import { BaseMemoryBankTool } from '../../tools/BaseMemoryBankTool';

// Mock Language Model Tool interfaces for testing
interface MockLanguageModelToolInvocationPrepareOptions<T> {
  input: T;
}

interface MockLanguageModelToolInvocationOptions<T> {
  input: T;
  toolInvocationToken: any;
}

interface MockLanguageModelToolResult {
  content: Array<{ value?: string; text?: string }>;
}

suite('Language Model Tools Comprehensive Tests', () => {
  let tempWorkspace: vscode.WorkspaceFolder;

  // Mock cancellation token and invocation token
  const mockCancellationToken: vscode.CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: (() => ({ dispose: () => {} })) as any
  };

  const mockInvocationToken = {
    request: { prompt: 'test prompt' }
  } as any;

  suiteSetup(async () => {
    // Create a temporary workspace for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-bank-tools-comprehensive-'));
    const workspaceUri = vscode.Uri.file(tempDir);
    tempWorkspace = {
      uri: workspaceUri,
      name: 'tools-comprehensive-test',
      index: 0
    };

    // Set up workspace for tools
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [tempWorkspace],
      writable: false,
      configurable: true
    });
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

  test('All tools should extend BaseMemoryBankTool correctly', () => {
    const tools = [
      UpdateContextTool,
      LogDecisionTool,
      UpdateProgressTool,
      ShowMemoryTool,
      UpdateMemoryBankTool,
      SwitchModeTool
    ];

    for (const ToolClass of tools) {
      const tool = new ToolClass();
      
      // Check inheritance
      assert.ok(tool instanceof BaseMemoryBankTool, 
               `${ToolClass.name} should extend BaseMemoryBankTool`);
      
      // Check required methods exist
      assert.strictEqual(typeof tool.prepareInvocation, 'function',
               `${ToolClass.name} should have prepareInvocation method`);
      assert.strictEqual(typeof tool.invoke, 'function',
               `${ToolClass.name} should have invoke method`);
    }
  });

  test('UpdateContextTool - comprehensive functionality test', async () => {
    const tool = new UpdateContextTool();
    
    // Test input validation and preparation
    const testCases = [
      { context: 'Simple context' },
      { context: 'Multi-line\ncontext\nwith breaks' },
      { context: 'Context with special chars: @#$%^&*()[]{}' },
      { context: 'Very long context: ' + 'x'.repeat(1000) }
    ];

    for (const testCase of testCases) {
      // Test preparation phase
      const prepareOptions: MockLanguageModelToolInvocationPrepareOptions<{ context: string }> = {
        input: testCase
      };
      
      const preparation = await tool.prepareInvocation(prepareOptions, mockCancellationToken);
      
      assert.ok(preparation, 'Should return preparation result');
      assert.ok(preparation.invocationMessage, 'Should have invocation message');
      assert.ok(preparation.invocationMessage.includes(testCase.context), 
               'Invocation message should include context');
      assert.ok(preparation.confirmationMessages, 'Should have confirmation messages');
      assert.strictEqual(preparation.confirmationMessages.title, 'Update Active Context');
      
      // Test invocation phase
      const invokeOptions: MockLanguageModelToolInvocationOptions<{ context: string }> = {
        input: testCase,
        toolInvocationToken: mockInvocationToken
      };
      
      const result = await tool.invoke(invokeOptions, mockCancellationToken) as MockLanguageModelToolResult;
      
      assert.ok(result, 'Should return invocation result');
      assert.ok(result.content, 'Result should have content');
      assert.ok(result.content.length > 0, 'Result content should not be empty');
      
      const resultText = result.content[0].value || result.content[0].text || '';
      assert.ok(resultText.includes('✅') || resultText.toLowerCase().includes('updated'), 
               'Result should indicate success');
    }
  });

  test('LogDecisionTool - decision logging with rationale variations', async () => {
    const tool = new LogDecisionTool();
    
    const testCases = [
      { 
        decision: 'Use React for frontend', 
        rationale: 'Better component reusability and ecosystem' 
      },
      { 
        decision: 'Choose PostgreSQL database', 
        rationale: undefined // Test without rationale
      },
      { 
        decision: 'Implement microservices architecture', 
        rationale: '' // Test with empty rationale
      },
      {
        decision: 'Decision with special chars: @#$%^&*()',
        rationale: 'Rationale with "quotes" and \'apostrophes\' and <tags>'
      }
    ];

    for (const testCase of testCases) {
      const prepareOptions = { input: testCase };
      const preparation = await tool.prepareInvocation(prepareOptions, mockCancellationToken);
      
      assert.ok(preparation.invocationMessage.includes(testCase.decision));
      if (testCase.rationale) {
        assert.ok(preparation.invocationMessage.includes(testCase.rationale));
      }
      
      const invokeOptions = {
        input: testCase,
        toolInvocationToken: mockInvocationToken
      };
      
      const result = await tool.invoke(invokeOptions, mockCancellationToken) as MockLanguageModelToolResult;
      assert.ok(result.content.length > 0);
      
      const resultText = result.content[0].value || result.content[0].text || '';
      assert.ok(resultText.includes('✅') || resultText.toLowerCase().includes('logged'));
    }
  });

  test('UpdateProgressTool - complex progress tracking', async () => {
    const tool = new UpdateProgressTool();
    
    const testCases = [
      {
        done: [],
        doing: [],
        next: []
      },
      {
        done: ['Authentication system', 'Database setup'],
        doing: ['Payment integration'],
        next: ['Admin dashboard', 'Mobile app']
      },
      {
        done: ['Feature A', 'Feature B', 'Feature C', 'Feature D', 'Feature E'],
        doing: ['Feature F', 'Feature G', 'Feature H'],
        next: ['Feature I', 'Feature J', 'Feature K', 'Feature L', 'Feature M', 'Feature N']
      }
    ];

    for (const testCase of testCases) {
      const prepareOptions = { input: testCase };
      const preparation = await tool.prepareInvocation(prepareOptions, mockCancellationToken);
      
      assert.ok(preparation.invocationMessage);
      
      // Check that the message mentions the counts
      const message = preparation.invocationMessage;
      if (testCase.done.length > 0) {
        assert.ok(message.includes(testCase.done.length.toString()) || 
                 message.toLowerCase().includes('done'));
      }
      
      const invokeOptions = {
        input: testCase,
        toolInvocationToken: mockInvocationToken
      };
      
      const result = await tool.invoke(invokeOptions, mockCancellationToken) as MockLanguageModelToolResult;
      assert.ok(result.content.length > 0);
    }
  });

  test('ShowMemoryTool - file display functionality', async () => {
    const tool = new ShowMemoryTool();
    
    const validFiles = [
      'activeContext.md',
      'decisionLog.md',
      'progress.md',
      'productContext.md',
      'systemPatterns.md',
      'projectBrief.md'
    ];

    for (const fileName of validFiles) {
      const prepareOptions = { input: { fileName } };
      const preparation = await tool.prepareInvocation(prepareOptions, mockCancellationToken);
      
      assert.ok(preparation.invocationMessage.includes(fileName));
      
      const invokeOptions = {
        input: { fileName },
        toolInvocationToken: mockInvocationToken
      };
      
      const result = await tool.invoke(invokeOptions, mockCancellationToken) as MockLanguageModelToolResult;
      assert.ok(result.content.length > 0);
      
      // Result should either show content or indicate file status
      const resultText = result.content[0].value || result.content[0].text || '';
      assert.ok(resultText.length > 0);
    }
  });

  test('SwitchModeTool - mode switching validation', async () => {
    const tool = new SwitchModeTool();
    
    const validModes = ['architect', 'code', 'ask', 'debug'];
    const invalidModes = ['invalid', 'ARCHITECT', 'Code', '', 'unknown'];

    // Test valid modes
    for (const mode of validModes) {
      const prepareOptions = { input: { mode } };
      const preparation = await tool.prepareInvocation(prepareOptions, mockCancellationToken);
      
      assert.ok(preparation.invocationMessage.includes(mode));
      
      const invokeOptions = {
        input: { mode },
        toolInvocationToken: mockInvocationToken
      };
      
      const result = await tool.invoke(invokeOptions, mockCancellationToken) as MockLanguageModelToolResult;
      assert.ok(result.content.length > 0);
      
      const resultText = result.content[0].value || result.content[0].text || '';
      assert.ok(resultText.includes('✅') || resultText.toLowerCase().includes('switched'));
    }

    // Test invalid modes
    for (const mode of invalidModes) {
      const invokeOptions = {
        input: { mode },
        toolInvocationToken: mockInvocationToken
      };
      
      const result = await tool.invoke(invokeOptions, mockCancellationToken) as MockLanguageModelToolResult;
      assert.ok(result.content.length > 0);
      
      const resultText = result.content[0].value || result.content[0].text || '';
      assert.ok(resultText.includes('❌') || resultText.toLowerCase().includes('invalid'));
    }
  });

  test('UpdateMemoryBankTool - comprehensive memory update', async () => {
    const tool = new UpdateMemoryBankTool();
    
    const testContexts = [
      'Simple update context',
      `Complex multi-line context with:
       - Technical details
       - Architecture decisions
       - Implementation notes
       - Performance considerations`,
      'Context with emojis 🚀 and special chars @#$%',
      'Very detailed context: ' + 'detail '.repeat(100)
    ];

    for (const context of testContexts) {
      const prepareOptions = { input: { context } };
      const preparation = await tool.prepareInvocation(prepareOptions, mockCancellationToken);
      
      assert.ok(preparation.invocationMessage);
      
      const invokeOptions = {
        input: { context },
        toolInvocationToken: mockInvocationToken
      };
      
      const result = await tool.invoke(invokeOptions, mockCancellationToken) as MockLanguageModelToolResult;
      assert.ok(result.content.length > 0);
      
      const resultText = result.content[0].value || result.content[0].text || '';
      assert.ok(resultText.includes('✅') || resultText.toLowerCase().includes('updated'));
    }
  });

  test('Error handling across all tools', async () => {
    const tools = [
      new UpdateContextTool(),
      new LogDecisionTool(),
      new UpdateProgressTool(),
      new ShowMemoryTool(),
      new UpdateMemoryBankTool(),
      new SwitchModeTool()
    ];

    // Test with malformed input
    for (const tool of tools) {
      try {
        const malformedOptions = {
          input: null as any,
          toolInvocationToken: null as any
        };
        
        const result = await tool.invoke(malformedOptions, mockCancellationToken);
        
        // Should either succeed or return an error result
        assert.ok(result, `${tool.constructor.name} should handle malformed input gracefully`);
        
      } catch (error) {
        // Throwing an error is also acceptable
        assert.ok(error instanceof Error, 
                 `${tool.constructor.name} should throw proper Error objects`);
      }
    }
  });

  test('Cancellation token handling', async () => {
    const tools = [
      new UpdateContextTool(),
      new LogDecisionTool(),
      new UpdateProgressTool(),
      new ShowMemoryTool(),
      new UpdateMemoryBankTool(),
      new SwitchModeTool()
    ];

    const cancelledToken: vscode.CancellationToken = {
      isCancellationRequested: true,
      onCancellationRequested: (() => ({ dispose: () => {} })) as any
    };

    // Test with cancelled token
    for (const tool of tools) {
      try {
        const options = {
          input: {} as any,
          toolInvocationToken: mockInvocationToken
        };
        
        const result = await tool.invoke(options, cancelledToken);
        
        // Should handle cancellation appropriately
        assert.ok(result, `${tool.constructor.name} should handle cancellation`);
        
      } catch (error) {
        // May throw cancellation error
        assert.ok(error instanceof Error, 
                 `${tool.constructor.name} should provide proper cancellation errors`);
      }
    }
  });

  test('Performance characteristics of tools', async function() {
    this.timeout(10000); // 10 second timeout for performance test
    
    const tool = new UpdateContextTool();
    const iterations = 50;
    const startTime = Date.now();
    
    // Perform multiple operations
    for (let i = 0; i < iterations; i++) {
      const options = {
        input: { context: `Performance test iteration ${i}` },
        toolInvocationToken: mockInvocationToken
      };
      
      await tool.invoke(options, mockCancellationToken);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const averageTime = duration / iterations;
    
    // Each operation should complete reasonably quickly (less than 100ms average)
    assert.ok(averageTime < 100, 
             `Tool operations too slow: ${averageTime}ms average (${iterations} iterations)`);
    
    console.log(`Performance test: ${iterations} operations in ${duration}ms (${averageTime.toFixed(2)}ms average)`);
  });
});
