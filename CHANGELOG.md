# Change Log

All notable changes to the "memoripilot" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.0] - 2025-07-01
### Added
- Dependency injection for all core services (MemoryManager, ModeManager) for robust initialization and testability.
- Section-specific file updates (e.g., UpdateContextTool only updates relevant sections).
- Template for architect.md matching root implementation.
- Improved tool registration and Copilot Chat integration.
- All test files and tools updated for new constructor signatures.
- Enhanced TypeScript and functional programming best practices.

### Fixed
- Tools no longer overwrite entire files; only relevant sections are updated.
- Initialization and file template issues for all memory-bank files.

## [Unreleased]

- Initial release