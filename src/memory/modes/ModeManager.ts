import * as vscode from "vscode";
import { Mode } from "./Mode";
import { MODES } from "./Modes";
import { MemoryManager } from "../MemoryManager";

/**
 * Manages mode selection and mode-specific behaviors.
 */
export class ModeManager {
  private static _instance: ModeManager | null = null;
  private _currentMode: Mode;
  private _memoryManager: MemoryManager;
  
  private constructor(memoryManager: MemoryManager) {
    this._currentMode = MODES.ask; // Default mode
    this._memoryManager = memoryManager;
  }
  
  /**
   * Gets the singleton instance of the ModeManager.
   * @param memoryManager The memory manager instance
   * @returns The ModeManager instance
   */
  public static getInstance(memoryManager: MemoryManager): ModeManager {
    if (!this._instance) {
      this._instance = new ModeManager(memoryManager);
    }
    return this._instance;
  }
  
  /**
   * Gets the current mode.
   */
  public get currentMode(): Mode {
    return this._currentMode;
  }
  
  /**
   * Sets the current mode.
   * @param modeId The mode ID to set
   * @returns True if the mode was set successfully
   */
  public setMode(modeId: string): boolean {
    const mode = MODES[modeId];
    if (!mode) {
      return false;
    }
    this._currentMode = mode;
    return true;
  }
  
  /**
   * Detects the appropriate mode based on text input.
   * @param input User input text
   * @returns The detected mode ID or null if no match
   */
  public detectMode(input: string): string | null {
    const normalizedInput = input.toLowerCase();
    
    for (const [modeId, mode] of Object.entries(MODES)) {
      for (const trigger of mode.triggers) {
        if (normalizedInput.includes(trigger)) {
          return modeId;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Enhances a system prompt with mode-specific context.
   * @param basePrompt The base system prompt
   * @returns Enhanced prompt with mode-specific information
   */
  public async enhancePrompt(basePrompt: string): Promise<string> {
    const mode = this._currentMode;
    let enhancedPrompt = `${basePrompt}\n\n${mode.promptPrefix}\n\n`;
    
    // Add relevant file contents based on mode
    for (const filePath of mode.readFiles) {
      try {
        const content = await this._memoryManager.readFile(filePath as any);
        enhancedPrompt += `## ${filePath}\n${content}\n\n`;
      } catch (err) {
        console.error(`Failed to read ${filePath} for prompt enhancement:`, err);
      }
    }
    
    return enhancedPrompt;
  }
  

}
