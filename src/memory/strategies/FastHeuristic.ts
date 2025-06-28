import { SummaryStrategy } from "./SummaryStrategy";

/**
 * A fallback strategy for summarizing content when the LLM is unavailable.
 * Uses simple heuristics to create a summary.
 */
export class FastHeuristic implements SummaryStrategy {
  /**
   * Creates a simple summary by extracting the first few sentences or words.
   * @param content The content to summarize
   * @param maxTokens The maximum number of tokens to include in the summary
   * @returns A simple summary of the content
   */
  public async summarise(content: string, maxTokens: number): Promise<string> {
    // Simple heuristic: use first paragraph and truncate
    const firstParagraph = content.split("\n\n")[0] || content;
    // Rough approximation: 4 chars per token
    const truncated = firstParagraph.substring(0, maxTokens * 4);
    
    return truncated + (truncated.length < firstParagraph.length ? "..." : "");
  }
}
