# PLAN.md - CONTEXT.md Generation Strategy

This document outlines the plan for creating CONTEXT.md files for all subfolders in the `packages/` and `apps/` directories of the tldraw monorepo.

## Objective

Create comprehensive CONTEXT.md files for 27 directories to provide AI agents and developers with clear understanding of each package/app's purpose, architecture, and usage patterns.

## Current Status

### Existing CONTEXT.md Files (9)

- ✅ `/` (root) - Created
- ✅ `packages/editor/` - Existing
- ✅ `packages/tldraw/` - Existing
- ✅ `packages/store/` - Existing
- ✅ `apps/examples/` - Existing

**Phase 1 Completed (5 new files created):**
- ✅ `packages/state/` - Reactive signals library
- ✅ `packages/state-react/` - React bindings for state
- ✅ `packages/tlschema/` - Type definitions and schema
- ✅ `packages/utils/` - Shared utilities
- ✅ `packages/validate/` - Runtime validation library

### Missing CONTEXT.md Files (21)

#### Apps (13)

- ❌ `apps/analytics/` - Analytics tracking service
- ❌ `apps/apps-script/` - Google Apps Script integration
- ❌ `apps/bemo-worker/` - Merge server worker
- ❌ `apps/dev-tools/` - Development tooling
- ❌ `apps/docs/` - Documentation site (tldraw.dev)
- ❌ `apps/dotcom-asset-upload/` - Asset upload service
- ❌ `apps/dotcom-worker/` - Multiplayer sync worker
- ❌ `apps/dotcom/` - Main tldraw.com application
- ❌ `apps/health-worker/` - Health check service
- ❌ `apps/huppy/` - GitHub bot for repo management
- ❌ `apps/images.tldraw.xyz/` - Image optimization service
- ❌ `apps/simple-server-example/` - Example server implementations
- ❌ `apps/vscode/` - VSCode extension

#### Packages (8)

- ❌ `packages/ai/` - AI integration module
- ❌ `packages/assets/` - Icons, fonts, translations
- ❌ `packages/create-tldraw/` - npm create CLI tool
- ❌ `packages/dotcom-shared/` - Shared dotcom utilities
- ❌ `packages/namespaced-tldraw/` - Namespaced tldraw build
- ❌ `packages/sync-core/` - Core sync functionality
- ❌ `packages/sync/` - React sync bindings
- ❌ `packages/worker-shared/` - Shared worker utilities

## Generation Strategy

### Phase 1: Core Packages (Priority: High) ✅ COMPLETED

~~Generate CONTEXT.md for foundational packages that other packages depend on:~~

1. ✅ **packages/state/** - Reactive signals (foundation for all reactivity)
2. ✅ **packages/state-react/** - React integration for signals
3. ✅ **packages/tlschema/** - Type definitions (used everywhere)
4. ✅ **packages/utils/** - Shared utilities (used everywhere)
5. ✅ **packages/validate/** - Validation library (used for schemas)

### Phase 2: Sync & Collaboration (Priority: High)

Generate CONTEXT.md for real-time collaboration packages:

6. **packages/sync-core/** - Core sync logic
7. **packages/sync/** - React sync bindings
8. **packages/worker-shared/** - Shared worker utilities
9. **apps/dotcom-worker/** - Multiplayer backend
10. **apps/bemo-worker/** - Merge server

### Phase 3: Main Applications (Priority: High)

Generate CONTEXT.md for primary user-facing applications:

11. **apps/dotcom/** - tldraw.com application
12. **apps/docs/** - Documentation site
13. **apps/vscode/** - VSCode extension

### Phase 4: Supporting Services (Priority: Medium)

Generate CONTEXT.md for supporting infrastructure:

14. **apps/dotcom-asset-upload/** - Asset handling
15. **apps/images.tldraw.xyz/** - Image optimization
16. **apps/health-worker/** - Health monitoring
17. **apps/analytics/** - Analytics tracking
18. **packages/dotcom-shared/** - Shared dotcom code

### Phase 5: Developer Tools (Priority: Medium)

Generate CONTEXT.md for development utilities:

19. **apps/dev-tools/** - Development tooling
20. **packages/create-tldraw/** - CLI tool
21. **apps/simple-server-example/** - Server examples
22. **apps/huppy/** - GitHub automation

### Phase 6: Specialized Packages (Priority: Low)

Generate CONTEXT.md for specialized/experimental packages:

23. **packages/ai/** - AI integration
24. **packages/assets/** - Asset management
25. **packages/namespaced-tldraw/** - Namespaced build
26. **apps/apps-script/** - Google Apps integration

## CONTEXT.md Template Structure

Each CONTEXT.md file should follow this structure:

```markdown
# CONTEXT.md - [Package/App Name]

Brief description of the package/app's purpose and role in the tldraw ecosystem.

## Package/App Overview

- **Purpose**: What problem does this solve?
- **Type**: Library/Application/Service/Tool
- **Status**: Production/Beta/Experimental
- **Dependencies**: Key dependencies (internal and external)
- **Consumers**: Who uses this package/app?

## Architecture

### Core Components

- List and describe main components/modules
- Explain how they interact

### Key Files

- Important files and their purposes
- Entry points
- Configuration files

## API/Interface (if applicable)

### Public API

- Main exports
- Key functions/classes
- Usage examples

### Internal API

- Private utilities
- Helper functions

## Development

### Setup

- Installation requirements
- Environment variables
- Configuration

### Commands

- Development commands
- Build commands
- Test commands

### Testing

- Test structure
- How to run tests
- Coverage expectations

## Deployment (if applicable)

### Infrastructure

- Where/how it's deployed
- Environment requirements
- Monitoring

### Release Process

- How updates are released
- Version management

## Integration Points

### Depends On

- Internal packages
- External services

### Used By

- Internal packages/apps
- External consumers

## Common Issues & Solutions

- Known gotchas
- Troubleshooting guide
- FAQ

## Future Considerations

- Planned improvements
- Technical debt
- Migration notes
```

## Information Gathering Approach

For each package/app, gather information from:

1. **package.json** - Dependencies, scripts, metadata
2. **README.md** - Existing documentation
3. **Source code structure** - Main files, exports, architecture
4. **Test files** - Understanding usage patterns
5. **Build configuration** - Build process and outputs
6. **Git history** - Recent changes and evolution
7. **Cross-references** - How other packages use it

## Validation Criteria

Each CONTEXT.md should:

- ✅ Be accurate and up-to-date with current code
- ✅ Provide clear value to AI agents and developers
- ✅ Follow consistent structure and formatting
- ✅ Include concrete examples where applicable
- ✅ Reference specific files and line numbers
- ✅ Explain both the "what" and "why"
- ✅ Be maintainable and easy to update

## Execution Timeline

**Original estimate**: 4-6 hours for all 26 files  
**Phase 1 completed**: ~1.25 hours for 5 files  
**Remaining estimate**: 3-4 hours for 21 files

**Time per file**: ~10-15 minutes (validated with Phase 1)

- 5 minutes: Information gathering
- 5 minutes: Writing core content
- 2-3 minutes: Examples and integration details
- 2-3 minutes: Review and refinement

## Success Metrics

- ✅ Phase 1: 5/5 core package CONTEXT.md files created
- ✅ Consistent quality and structure across all Phase 1 files
- ✅ Clear understanding of foundational package relationships
- ✅ Template validated and refined based on learnings
- 🔄 **In Progress**: All 21 remaining CONTEXT.md files
- 🔄 **Next**: Improved AI agent comprehension of codebase
- 🔄 **Next**: Easier onboarding for new developers

## Next Steps

1. ✅ ~~Begin with Phase 1 (Core Packages)~~
2. ✅ ~~Validate template with first few files~~
3. ✅ ~~Adjust approach based on learnings~~
4. **Next**: Continue with Phase 2 (Sync & Collaboration)
5. **Then**: Continue through remaining phases in order
6. **Finally**: Final review of all CONTEXT.md files
7. **Finally**: Update root CONTEXT.md with references
