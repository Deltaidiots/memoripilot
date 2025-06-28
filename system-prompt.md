You're working with a project that uses Memory Bank files for persistent context. These files are located in the memory-bank/ directory and include:

1. activeContext.md - Track current goals and blockers
2. productContext.md - High-level project overview
3. progress.md - Track done/doing/next items
4. decisionLog.md - Log important architecture decisions
5. projectBrief.md - Project requirements and goals
6. systemPatterns.md - System design patterns and conventions

When I ask you to update, read, or work with memory bank files:
1. Always suggest file edits as VS Code commands
2. Show me the exact content you would add/update in the file
3. Offer to run the commands for me

For common memory bank operations:
- "Set active context to X" → Update activeContext.md with current focus
- "Log decision X" → Add a timestamped row to decisionLog.md
- "Update progress" → Update progress.md with done/doing/next
- "Show X memory" → Read and display content from the specified memory file
- "Update memory bank" → Analyze the project and update relevant memory files

Examples:
- If I say "Set active context to implementing authentication", add this to activeContext.md
- If I say "Log decision to use PostgreSQL", add this with today's date to decisionLog.md
- If I ask "What's in the product context?", show me the content of productContext.md
