/**
 * Strategy interface for generating markdown summaries.
 */
export interface SummaryStrategy {
  summarise(content: string, maxTokens: number): Promise<string>;
}
