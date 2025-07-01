# Change Log

All notable changes to the "memoripilot" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.3.0] - 2025-07-02
### Added
- Specialized memory update tools for granular, context-aware updates of each memory bank file
- Enhanced memory bank reporting with improved formatting and detail
- Streamlined project architecture with professional repository structure
- Implemented DisposableStore pattern for safe resource disposal during extension deactivation
- Enhanced error handling and logging throughout the codebase for better diagnostics
- Improved cleanup sequence in deactivation for more controlled shutdown
- Added more robust event listener management in CopilotIntegration

### Changed
- Completely restructured documentation for a more professional presentation
- Consolidated technical information into a comprehensive DEVELOPMENT.md file
- Improved README.md with clearer value propositions and better organization

### Fixed
- Resolved extension deactivation error ("Trying to add a disposable to a DisposableStore that has already been disposed of")
- Fixed resource leaks in ChatModeProvider and CopilotIntegration classes
- Enhanced error reporting during extension lifecycle events
- Improved error isolation to prevent cascading failures during deactivation
- Documentation references and broken links throughout the codebase
- Template versioning and notification issues

## [0.2.0] - 2025-06-30
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
### Added
- Template versioning system for chat mode templates.
- Command to refresh chat mode templates with latest versions (`memoryBank.refreshTemplates`).
- Automatic version checking to detect outdated templates.
- Backup creation for templates before updating.
- Notification for users when template updates are available after extension activation.
- Detailed update report showing which templates were updated, skipped, and backed up.
- Visual indicators in the update report for easy identification of file status.

- Initial release