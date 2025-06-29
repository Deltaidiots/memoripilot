import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { UpdateContextTool } from '../../tools/UpdateContextTool';
import { LogDecisionTool } from '../../tools/LogDecisionTool';
import { UpdateProgressTool } from '../../tools/UpdateProgressTool';
import { ShowMemoryTool } from '../../tools/ShowMemoryTool';
import { UpdateMemoryBankTool } from '../../tools/UpdateMemoryBankTool';
import { SwitchModeTool } from '../../tools/SwitchModeTool';

// Mock CancellationToken
const mockToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: (() => ({ dispose: () => {} })) as any
};

// Mock ToolInvocationToken
const mockInvocationToken = {
  request: { prompt: 'test prompt' }
} as any;

suite('Memory Bank Tools Integration Tests', () => {
  let tempWorkspace: vscode.WorkspaceFolder;

  suiteSetup(async () => {
    // Create a temporary workspace for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-bank-tools-test-'));
    const workspaceUri = vscode.Uri.file(tempDir);
    tempWorkspace = {
      uri: workspaceUri,
      name: 'test-workspace',
      index: 0
    };

    // Mock workspace.workspaceFolders for the tools
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [tempWorkspace],
      writable: false,
      configurable: true
    });
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

  test('UpdateContextTool - should handle tool invocation lifecycle', async () => {
    const tool = new UpdateContextTool();
    const testContext = 'Working on authentication system for e-commerce platform';
    
    // Test prepare first
    const prepareOptions = {
      input: { context: testContext }
    };
    
    const preparation = await tool.prepare(prepareOptions, mockToken);
    
    assert.ok(preparation.invocationMessage);
    assert.ok(preparation.invocationMessage.includes(testContext));
    assert.ok(preparation.confirmationMessages);
    assert.strictEqual(preparation.confirmationMessages.title, 'Update Active Context');
    
    // Test actual invocation
    const invokeOptions = {
      input: { context: testContext },
      toolInvocationToken: mockInvocationToken
    };

    const result = await tool.invoke(invokeOptions, mockToken);
    
    assert.ok(result);
    assert.ok(result.content);
    assert.ok(result.content.length > 0);
    
    // Check that the result contains success indication
    const resultText = (result.content[0] as any).value || (result.content[0] as any).text || '';
    assert.ok(resultText.includes('✅') || resultText.includes('context updated'), 
             `Expected success message, got: ${resultText}`);
  });

  test('LogDecisionTool - should validate input and handle errors gracefully', async () => {
    const tool = new LogDecisionTool();
    
    // Test with valid input
    const validInput = {
      decision: 'Use microservices architecture',
      rationale: 'Better scalability and maintainability for our growing team'
    };
    
    const prepareOptions = { input: validInput };
    const preparation = await tool.prepare(prepareOptions, mockToken);
    
    assert.ok(preparation.invocationMessage.includes(validInput.decision));
    assert.ok(preparation.confirmationMessages);
    
    // Test with missing rationale
    const partialInput = {
      decision: 'Use Redis for caching'
      // rationale is optional
    };
    
    const partialPrepareOptions = { input: partialInput };
    const partialPreparation = await tool.prepare(partialPrepareOptions, mockToken);
    
    assert.ok(partialPreparation.invocationMessage.includes(partialInput.decision));
    
    // Test invocation
    const invokeOptions = {
      input: validInput,
      toolInvocationToken: mockInvocationToken
    };

    const result = await tool.invoke(invokeOptions, mockToken);
    assert.ok(result);
    assert.ok(result.content.length > 0);
  });

  test('UpdateProgressTool - should handle complex progress structures', async () => {
    const tool = new UpdateProgressTool();
    
    const complexProgress = {
      done: [
        'User authentication system',
        'Database schema design',
        'Basic REST API endpoints',
        'Frontend login component'
      ],
      doing: [
        'Shopping cart functionality',
        'Payment gateway integration',
        'Unit test coverage'
      ],
      next: [
        'Order management system',
        'Admin dashboard',
        'Email notifications',
        'Performance optimization',
        'Security audit'
      ]
    };
    
    const prepareOptions = { input: complexProgress };
    const preparation = await tool.prepare(prepareOptions, mockToken);
    
    assert.ok(preparation.invocationMessage);
    assert.ok(preparation.confirmationMessages);
    
    // Verify that the preparation includes progress counts
    const message = preparation.invocationMessage;
    assert.ok(message.includes('4') || message.includes('done'), 'Should mention completed items');
    assert.ok(message.includes('3') || message.includes('doing'), 'Should mention current items');
    assert.ok(message.includes('5') || message.includes('next'), 'Should mention next items');
    
    const invokeOptions = {
      input: complexProgress,
      toolInvocationToken: mockInvocationToken
    };

    const result = await tool.invoke(invokeOptions, mockToken);
    assert.ok(result);
    assert.ok(result.content.length > 0);
  });

  test('ShowMemoryTool - should handle different file types', async () => {
    const tool = new ShowMemoryTool();
    
    // Test with different valid file names
    const testFiles = [
      'activeContext.md',
      'decisionLog.md',
      'progress.md',
      'productContext.md',
      'systemPatterns.md'
    ];
    
    for (const fileName of testFiles) {
      const prepareOptions = { input: { fileName } };
      const preparation = await tool.prepare(prepareOptions, mockToken);
      
      assert.ok(preparation.invocationMessage.includes(fileName), 
               `Should mention ${fileName} in invocation message`);
      assert.ok(preparation.confirmationMessages);
      
      const invokeOptions = {
        input: { fileName },
        toolInvocationToken: mockInvocationToken
      };

      const result = await tool.invoke(invokeOptions, mockToken);
      assert.ok(result, `Should return result for ${fileName}`);
      assert.ok(result.content.length > 0, `Should have content for ${fileName}`);
    }
    
    // Test with invalid file name
    const invalidOptions = {
      input: { fileName: 'nonexistent.md' },
      toolInvocationToken: mockInvocationToken
    };

    const invalidResult = await tool.invoke(invalidOptions, mockToken);
    assert.ok(invalidResult);
    // Should handle gracefully, either showing error or empty content
  });

  test('SwitchModeTool - should validate modes and provide clear feedback', async () => {
    const tool = new SwitchModeTool();
    
    const validModes = ['architect', 'code', 'ask', 'debug'];
    
    // Test each valid mode
    for (const mode of validModes) {
      const prepareOptions = { input: { mode } };
      const preparation = await tool.prepare(prepareOptions, mockToken);
      
      assert.ok(preparation.invocationMessage.includes(mode), 
               `Should mention ${mode} in preparation`);
      assert.ok(preparation.confirmationMessages);
      
      const invokeOptions = {
        input: { mode },
        toolInvocationToken: mockInvocationToken
      };

      const result = await tool.invoke(invokeOptions, mockToken);
      assert.ok(result, `Should handle ${mode} mode switch`);
      assert.ok(result.content.length > 0);
    }
    
    // Test invalid mode
    const invalidModeOptions = {
      input: { mode: 'invalid-mode' },
      toolInvocationToken: mockInvocationToken
    };

    const invalidResult = await tool.invoke(invalidModeOptions, mockToken);
    assert.ok(invalidResult);
    
    const resultText = (invalidResult.content[0] as any).value || (invalidResult.content[0] as any).text || '';
    assert.ok(resultText.includes('Invalid') || resultText.includes('❌'), 
             'Should indicate invalid mode');
  });

  test('UpdateMemoryBankTool - should handle comprehensive memory updates', async () => {
    const tool = new UpdateMemoryBankTool();
    
    const comprehensiveContext = `
    Working on a modern e-commerce platform with the following characteristics:
    - Microservices architecture using Node.js and TypeScript
    - React frontend with Next.js framework
    - PostgreSQL database with Prisma ORM
    - Redis for caching and session management
    - Docker containerization for all services
    - CI/CD pipeline with GitHub Actions
    - Current focus: implementing payment gateway integration
    `;
    
    const prepareOptions = { input: { context: comprehensiveContext.trim() } };
    const preparation = await tool.prepare(prepareOptions, mockToken);
    
    assert.ok(preparation.invocationMessage);
    assert.ok(preparation.confirmationMessages);
    
    const invokeOptions = {
      input: { context: comprehensiveContext.trim() },
      toolInvocationToken: mockInvocationToken
    };

    const result = await tool.invoke(invokeOptions, mockToken);
    assert.ok(result);
    assert.ok(result.content.length > 0);
    
    const resultText = (result.content[0] as any).value || (result.content[0] as any).text || '';
    assert.ok(resultText.includes('✅') || resultText.includes('updated'), 
             'Should indicate successful update');
  });

  test('Tools should handle edge cases and errors gracefully', async () => {
    // Test with empty workspace
    const originalWorkspace = vscode.workspace.workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [],
      writable: false,
      configurable: true
    });

    try {
      const tool = new UpdateContextTool();
      const options = {
        input: { context: 'Test context' },
        toolInvocationToken: mockInvocationToken
      };

      const result = await tool.invoke(options, mockToken);
      assert.ok(result);
      // Should handle gracefully, possibly with error message
      
    } finally {
      // Restore workspace
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: originalWorkspace,
        writable: false,
        configurable: true
      });
    }
  });

  test('Tools should handle cancellation tokens properly', async () => {
    // Create a cancelled token
    const cancelledToken: vscode.CancellationToken = {
      isCancellationRequested: true,
      onCancellationRequested: (() => ({ dispose: () => {} })) as any
    };

    const tool = new UpdateContextTool();
    const options = {
      input: { context: 'Test context' },
      toolInvocationToken: mockInvocationToken
    };

    // Tools should check cancellation and handle appropriately
    const result = await tool.invoke(options, cancelledToken);
    assert.ok(result);
    // Should either complete quickly or indicate cancellation
  });

  test('All tools should implement the base interface correctly', () => {
    const tools = [
      new UpdateContextTool(),
      new LogDecisionTool(),
      new UpdateProgressTool(),
      new ShowMemoryTool(),
      new UpdateMemoryBankTool(),
      new SwitchModeTool()
    ];

    for (const tool of tools) {
      // Check that tools have required methods
      assert.strictEqual(typeof tool.prepare, 'function', 
                        `${tool.constructor.name} should have prepare method`);
      assert.strictEqual(typeof tool.invoke, 'function', 
                        `${tool.constructor.name} should have invoke method`);
    }
  });
});
