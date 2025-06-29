export const FILE_TEMPLATES = Object.freeze({
  "memory-bank/productContext.md": `# Product Context

Describe the product.

## Overview

Provide a high-level overview of the project.

## Core Features

- Feature 1
- Feature 2

## Technical Stack

- Tech 1
- Tech 2`,

  "memory-bank/progress.md": `# Progress

## Done

- [x] Initialize project

## Doing

- [ ] Current task

## Next

- [ ] Upcoming task`,

  "memory-bank/decisionLog.md": `# Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
`,

  "memory-bank/activeContext.md": `# Active Context

## Current Goals

- Goal 1

## Current Blockers

- None yet`,
});

export const OPTIONAL_FILE_TEMPLATES = Object.freeze({
  "memory-bank/projectBrief.md": `# Project Brief

## Purpose

Define the main purpose of this project.

## Target Users

Describe who will use this.

## Success Metrics

How will success be measured?`,

  "memory-bank/systemPatterns.md": `# System Patterns

## Architectural Patterns

- Pattern 1: Description

## Design Patterns

- Pattern 1: Description

## Common Idioms

- Idiom 1: Description`,
});

export const ALL_FILE_TEMPLATES = Object.freeze({
  ...FILE_TEMPLATES,
  ...OPTIONAL_FILE_TEMPLATES,
});
