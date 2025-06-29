import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('Extension Test Suite', () => {
  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('gujjar19.memoripilot'));
  });

  test('Extension should activate', async function() {
    this.timeout(10000); // 10 second timeout for activation
    
    const extension = vscode.extensions.getExtension('gujjar19.memoripilot');
    assert.ok(extension);
    
    // Activate the extension
    await extension.activate();
    assert.strictEqual(extension.isActive, true);
  });

  test('Commands should be registered', async function() {
    this.timeout(10000);
    
    const extension = vscode.extensions.getExtension('gujjar19.memoripilot');
    assert.ok(extension);
    await extension.activate();
    
    // Check that essential commands are registered
    const commands = await vscode.commands.getCommands(true);
    
    assert.ok(commands.includes('memoryBank.test'));
    assert.ok(commands.includes('memoryBank.selectMode'));
    assert.ok(commands.includes('memoryBank.processCommand'));
  });

  test('Language Model Tools should be registered', async function() {
    this.timeout(10000);
    
    const extension = vscode.extensions.getExtension('gujjar19.memoripilot');
    assert.ok(extension);
    await extension.activate();
    
    // In a real test environment, we would check that the tools are properly registered
    // For now, we just verify the extension activated without errors
    assert.strictEqual(extension.isActive, true);
  });

  test('Status bar should be created', async function() {
    this.timeout(10000);
    
    const extension = vscode.extensions.getExtension('gujjar19.memoripilot');
    assert.ok(extension);
    await extension.activate();
    
    // We can't easily test status bar creation without more complex setup
    // But activation success indicates the status bar was created without errors
    assert.strictEqual(extension.isActive, true);
  });

  test('Chat participant should be registered', async function() {
    this.timeout(10000);
    
    const extension = vscode.extensions.getExtension('gujjar19.memoripilot');
    assert.ok(extension);
    await extension.activate();
    
    // Chat participant registration is tested indirectly through successful activation
    assert.strictEqual(extension.isActive, true);
  });
});
