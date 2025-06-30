import * as vscode from "vscode";
import { Mode } from "./Mode";

/**
 * The four working modes for the memory bank participant.
 */
export const MODES: Record<string, Mode> = {
  architect: {
    id: "architect",
    name: "Architect",
    description: "Design system architecture and make technical decisions",
    readFiles: [
      "memory-bank/productContext.md",
      "memory-bank/decisionLog.md",
      "memory-bank/systemPatterns.md"
    ],
    writeFiles: [
      "memory-bank/decisionLog.md",
      "memory-bank/systemPatterns.md"
    ],
    promptPrefix: "You are in **Architect Mode**. Focus on system design, architecture decisions, and high-level patterns.",
    triggers: ["architect", "design", "structure", "system", "pattern", "decision"]
  },
  
  code: {
    id: "code",
    name: "Code",
    description: "Implement features and write code",
    readFiles: [
      "memory-bank/activeContext.md",
      "memory-bank/progress.md",
      "memory-bank/systemPatterns.md"
    ],
    writeFiles: [
      "memory-bank/progress.md"
    ],
    promptPrefix: "You are in **Code Mode**. Focus on implementation details, code generation, and unit testing.",
    triggers: ["code", "implement", "program", "write", "build", "feature"]
  },
  
  ask: {
    id: "ask",
    name: "Ask",
    description: "Answer questions about the project",
    readFiles: [
      "memory-bank/productContext.md",
      "memory-bank/systemPatterns.md",
      "memory-bank/progress.md",
      "memory-bank/decisionLog.md",
      "memory-bank/projectBrief.md"
    ],
    writeFiles: [],
    promptPrefix: "You are in **Ask Mode**. Focus on answering questions based on project memory.",
    triggers: ["ask", "explain", "what", "why", "how", "describe", "tell"]
  },
  
  debug: {
    id: "debug",
    name: "Debug",
    description: "Help identify and fix issues",
    readFiles: [
      "memory-bank/activeContext.md",
      "memory-bank/decisionLog.md",
      "memory-bank/systemPatterns.md"
    ],
    writeFiles: [
      "memory-bank/progress.md"
    ],
    promptPrefix: "You are in **Debug Mode**. Focus on troubleshooting, identifying issues, and fixing bugs.",
    triggers: ["debug", "fix", "issue", "bug", "problem", "error", "fail"]
  }
};

export type AllowedMode = keyof typeof MODES;
export const MODE_PREFIX = "memoripilot.";
