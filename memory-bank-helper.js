// Memory Bank Helper Functions
// These functions can be used by GitHub Copilot to operate on memory bank files

/**
 * Updates the active context file with new context
 * @param {string} context - The context to add
 */
function updateActiveContext(context) {
  const fs = require('fs');
  const path = require('path');
  
  // Create the file path
  const filePath = path.join(process.cwd(), 'memory-bank', 'activeContext.md');
  
  // Get current date
  const date = new Date().toISOString().split('T')[0];
  
  // Create content to append
  const newContent = `\n## Current Focus (${date})\n${context}\n`;
  
  // Check if file exists, create if not
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `# Active Context\n${newContent}`);
  } else {
    // Append to existing file
    fs.appendFileSync(filePath, newContent);
  }
  
  console.log(`Updated active context: ${context}`);
}

/**
 * Logs a decision to the decision log
 * @param {string} decision - The decision to log
 * @param {string} rationale - Optional rationale for the decision
 */
function logDecision(decision, rationale = "-") {
  const fs = require('fs');
  const path = require('path');
  
  // Create the file path
  const filePath = path.join(process.cwd(), 'memory-bank', 'decisionLog.md');
  
  // Get current date
  const date = new Date().toISOString().split('T')[0];
  
  // Create new row
  const newRow = `| ${date} | ${decision} | ${rationale} |\n`;
  
  // Check if file exists, create if not
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const header = `# Decision Log\n\n| Date | Decision | Rationale |\n|------|----------|----------|\n`;
    fs.writeFileSync(filePath, header + newRow);
  } else {
    // Read file to check if it has the table header
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('| Date | Decision | Rationale |')) {
      // Table exists, just append the row
      fs.appendFileSync(filePath, newRow);
    } else {
      // Add table header and then the row
      const header = `\n\n| Date | Decision | Rationale |\n|------|----------|----------|\n`;
      fs.appendFileSync(filePath, header + newRow);
    }
  }
  
  console.log(`Logged decision: ${decision}`);
}

/**
 * Updates the progress file with done/doing/next items
 * @param {string[]} done - Array of completed items
 * @param {string[]} doing - Array of in-progress items
 * @param {string[]} next - Array of upcoming items
 */
function updateProgress(done = [], doing = [], next = []) {
  const fs = require('fs');
  const path = require('path');
  
  // Create the file path
  const filePath = path.join(process.cwd(), 'memory-bank', 'progress.md');
  
  // Get current date
  const date = new Date().toISOString().split('T')[0];
  
  // Format items as markdown lists
  const formatItems = items => items.map(item => `- [${item.startsWith('[x]') ? 'x' : ' '}] ${item.replace(/^\[\s*.\s*\]\s*/, '')}`).join('\n');
  
  const newContent = `# Progress (Updated: ${date})\n\n` +
    `## Done\n\n${formatItems(done)}\n\n` +
    `## Doing\n\n${formatItems(doing)}\n\n` +
    `## Next\n\n${formatItems(next)}\n`;
  
  // Create directory if it doesn't exist
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  
  // Write the content
  fs.writeFileSync(filePath, newContent);
  
  console.log(`Updated progress tracking`);
}

/**
 * Reads the content of a memory bank file
 * @param {string} fileName - The name of the file to read (without path)
 * @returns {string} The content of the file
 */
function readMemoryFile(fileName) {
  const fs = require('fs');
  const path = require('path');
  
  // Create the file path
  const filePath = path.join(process.cwd(), 'memory-bank', fileName);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return `File ${fileName} does not exist in the memory bank.`;
  }
  
  // Read and return content
  return fs.readFileSync(filePath, 'utf8');
}

module.exports = {
  updateActiveContext,
  logDecision,
  updateProgress,
  readMemoryFile
};
