import * as vscode from "vscode";
import { MemoryManager } from "./MemoryManager";
import { ModeManager } from "./modes/ModeManager";
import { Mode } from "./modes/Mode";

/**
 * Simplified chat message for session tracking.
 */
export interface SessionMessage {
  text: string;
  participant?: string;
  command?: string;
  timestamp: number;
}

/**
 * Represents a chat session with the Memory Bank.
 */
export interface Session {
  id: string;
  startTime: number;
  mode: Mode;
  messages: SessionMessage[];
}

/**
 * Manages chat sessions and end-of-session persistence.
 */
export class SessionManager {
  private static _instance: SessionManager | null = null;
  private _activeSessions: Map<string, Session> = new Map();
  private _memoryManager: MemoryManager;
  private _modeManager: ModeManager;
  private _workspace: vscode.WorkspaceFolder;
  
  /**
   * Constructor for SessionManager.
   * @param workspace The workspace folder
   * @param memoryManager The memory manager instance
   * @param modeManager The mode manager instance
   */
  private constructor(
    workspace: vscode.WorkspaceFolder,
    memoryManager: MemoryManager,
    modeManager: ModeManager
  ) {
    this._workspace = workspace;
    this._memoryManager = memoryManager;
    this._modeManager = modeManager;
  }
  
  /**
   * Get the singleton instance of SessionManager.
   * @param workspace The workspace folder
   * @param memoryManager The memory manager instance
   * @param modeManager The mode manager instance
   * @returns The SessionManager instance
   */
  public static getInstance(
    workspace: vscode.WorkspaceFolder,
    memoryManager: MemoryManager,
    modeManager: ModeManager
  ): SessionManager {
    if (!this._instance) {
      this._instance = new SessionManager(workspace, memoryManager, modeManager);
    }
    return this._instance;
  }
  
  /**
   * Create a new session.
   * @param request The chat request
   * @returns The new session ID
   */
  public createSession(request: vscode.ChatRequest): string {
    const sessionId = `session-${Date.now()}`;
    const mode = this._modeManager.currentMode;
    
    const sessionMessage: SessionMessage = {
      text: request.prompt,
      timestamp: Date.now()
    };
    
    const session: Session = {
      id: sessionId,
      startTime: Date.now(),
      mode,
      messages: [sessionMessage]
    };
    
    this._activeSessions.set(sessionId, session);
    console.log(`Created new session: ${sessionId} in mode: ${mode.name}`);
    
    return sessionId;
  }
  
  /**
   * Add a message to an existing session.
   * @param sessionId The session ID
   * @param text The message text
   * @param participant Optional participant ID
   * @param command Optional command
   * @returns True if the message was added, false otherwise
   */
  public addMessage(
    sessionId: string, 
    text: string, 
    participant?: string, 
    command?: string
  ): boolean {
    const session = this._activeSessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    const message: SessionMessage = {
      text,
      participant,
      command,
      timestamp: Date.now()
    };
    
    session.messages.push(message);
    return true;
  }
  
  /**
   * End a session and perform end-of-session tasks.
   * @param sessionId The session ID
   * @returns True if the session was ended, false otherwise
   */
  public async endSession(sessionId: string): Promise<boolean> {
    const session = this._activeSessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    // Save session summary to progress.md
    await this._summarizeSession(session);
    
    // Clean up
    this._activeSessions.delete(sessionId);
    console.log(`Ended session: ${sessionId}`);
    
    return true;
  }
  
  /**
   * Generate a summary of the session and save it to progress.md.
   * @param session The session to summarize
   */
  private async _summarizeSession(session: Session): Promise<void> {
    const messages = session.messages;
    if (messages.length === 0) {
      return;
    }
    
    // Extract user messages for summarization
    const userMessages = messages
      .filter(msg => !msg.command && !msg.participant)
      .map(msg => msg.text);
    
    if (userMessages.length === 0) {
      return;
    }
    
    // Create session summary entry
    const summary = `## Session ${new Date().toISOString().split("T")[0]} (${session.mode.name} Mode)\n\n` +
      `- ${userMessages.join('\n- ')}\n`;
    
    // Append to progress.md
    await this._memoryManager.appendLine("memory-bank/progress.md", summary);
  }
  
  /**
   * Manually update the memory bank with session highlights.
   * @param sessionId The session ID (optional, uses most recent session if not provided)
   * @returns True if the update was successful
   */
  public async updateMemoryBank(sessionId?: string): Promise<boolean> {
    // If sessionId is provided, use that session
    // Otherwise, use the most recent active session
    let session: Session | undefined;
    
    if (sessionId) {
      session = this._activeSessions.get(sessionId);
    } else if (this._activeSessions.size > 0) {
      // Sort sessions by startTime in descending order
      const sortedSessions = Array.from(this._activeSessions.values())
        .sort((a, b) => b.startTime - a.startTime);
      
      session = sortedSessions[0];
    }
    
    if (!session) {
      return false;
    }
    
    // Generate session summary and save it
    await this._summarizeSession(session);
    
    return true;
  }
}
