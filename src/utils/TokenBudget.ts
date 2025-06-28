/**
 * Utilities for managing token budgets for LLM context windows.
 */

/**
 * Approximate token count based on character length
 * @param text The text to count tokens for
 * @returns Approximate token count
 */
export function estimateTokenCount(text: string): number {
  // Approximate token count: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Distributes a token budget among multiple text items
 * @param totalBudget Total token budget available
 * @param items Array of text items
 * @returns An array of budget allocations corresponding to the items
 */
export function distributeBudget(
  totalBudget: number,
  items: string[]
): number[] {
  if (items.length === 0) {
    return [];
  }
  
  // Calculate total estimated tokens
  const tokenCounts = items.map(item => estimateTokenCount(item));
  const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);
  
  // If total is less than budget, return actual counts
  if (totalTokens <= totalBudget) {
    return tokenCounts;
  }
  
  // Otherwise, distribute proportionally
  return tokenCounts.map(count => 
    Math.floor((count / totalTokens) * totalBudget)
  );
}
