import * as vscode from "vscode";
import { SummaryStrategy } from "./SummaryStrategy";

export class LlmSummary implements SummaryStrategy {
  public async summarise(
    content: string,
    maxTokens: number = 200
  ): Promise<string> {
    try {
      // Since we can't directly access the LM API in published extensions,
      // we'll use a simple fallback summarization strategy
      return this.createSimpleSummary(content, maxTokens);
    } catch (error) {
      console.error("Error summarizing content:", error);
      return content.substring(0, maxTokens * 4); // Fallback: return truncated content
    }
  }
  
  /**
   * Creates a simple summary by extracting key sentences
   * @param content The content to summarize
   * @param maxTokens The maximum number of tokens to include in the summary
   * @returns A simple summary of the content
   */
  private createSimpleSummary(content: string, maxTokens: number): string {
    // Split into paragraphs and take the first few
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Start with the first paragraph (likely the most important)
    const firstPara = paragraphs[0] || "";
    
    // Approximating 4 chars per token
    const tokenLimit = maxTokens * 4;
    
    // If first paragraph is short enough, we're good
    if (firstPara.length <= tokenLimit) {
      return firstPara;
    }
    
    // Otherwise, truncate and add ellipsis
    return firstPara.substring(0, tokenLimit - 3) + "...";
  }
}
