# tldraw Wireframes & Architecture Documentation

**Version:** v2025-11-08
**tldraw Version:** 3.15.1

## Overview

This directory contains comprehensive Mermaid diagram documentation for the tldraw codebase. Each topic has two files:
- **`.mermaid.md`** - Pure Mermaid diagram (paste directly into mermaid.live)
- **`.notes.md`** - Extended documentation with implementation details

## How to Use These Diagrams

### View in Browser

**Option 1: Mermaid.live**
1. Go to [mermaid.live](https://mermaid.live)
2. Copy contents of any `.mermaid.md` file
3. Paste into the editor
4. Diagram renders immediately

**Option 2: GitHub**
- GitHub renders Mermaid diagrams automatically
- Simply view the `.mermaid.md` files on GitHub

**Option 3: VS Code**
- Install "Markdown Preview Mermaid Support" extension
- Open `.mermaid.md` file
- Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)

### Reading the Notes

The `.notes.md` files provide:
- Detailed explanations of the architecture shown
- Key architectural decisions and rationale
- Important patterns and conventions
- Areas of technical debt or complexity
- Common workflows and use cases
- Where to make changes for specific tasks

## Documentation Topics

### 1. Repository Structure
**Files:** `repo-structure.mermaid.md`, `repo-structure.notes.md`

**What it covers:**
- Complete directory tree visualization
- Package organization (packages/, apps/, templates/, internal/)
- Purpose of each directory
- Code organization patterns
- Where to find different types of code

**When to use:**
- New contributors learning the codebase
- Understanding where code lives
- Deciding where to add new features
- Reviewing package dependencies

---

### 2. Architecture Overview
**Files:** `architecture-overview.mermaid.md`, `architecture-overview.notes.md`

**What it covers:**
- High-level system design
- Layered architecture (Foundation → SDK → Applications)
- Core components and their interactions
- Technology stack and design patterns

**When to use:**
- Understanding overall system design
- Onboarding new developers
- Making architectural decisions
- Planning major features

---

### 3. Component Map
**Files:** `component-map.mermaid.md`, `component-map.notes.md`

**What it covers:**
- Detailed component breakdown
- Module boundaries and responsibilities
- Dependencies between packages
- Public APIs and entry points
- Shared utilities

**When to use:**
- Understanding component relationships
- Finding the right package for a task
- Avoiding circular dependencies
- API design decisions

---

### 4. Data Flow
**Files:** `data-flow.mermaid.md`, `data-flow.notes.md`

**What it covers:**
- How data moves through the system
- State management and reactive updates
- Multiplayer synchronization protocol
- Request/response cycles
- Event flows and execution paths

**When to use:**
- Debugging data flow issues
- Understanding state updates
- Implementing new features
- Performance optimization

---

### 5. Entry Points
**Files:** `entry-points.mermaid.md`, `entry-points.notes.md`

**What it covers:**
- All ways to interact with the codebase
- SDK integration patterns
- Development servers
- CLI commands
- API endpoints
- Environment configuration

**When to use:**
- Getting started with development
- SDK integration
- Setting up environments
- Understanding available commands

---

### 6. Database Schema
**Files:** `database-schema.mermaid.md`, `database-schema.notes.md`

**What it covers:**
- PostgreSQL schema (tldraw.com server)
- IndexedDB schema (client-side)
- TLStore record types (in-memory)
- Entity relationships
- Indexes and migrations

**When to use:**
- Database queries
- Schema changes
- Data migrations
- Understanding persistence

---

### 7. Authentication & Authorization
**Files:** `authentication-authorization.mermaid.md`, `authentication-authorization.notes.md`

**What it covers:**
- Clerk authentication integration
- JWT token flows
- Permission model (owner, editor, viewer, public)
- Protected routes
- File sharing

**When to use:**
- Implementing auth features
- Debugging auth issues
- Adding new permissions
- Security reviews

---

### 8. Deployment Infrastructure
**Files:** `deployment-infrastructure.mermaid.md`, `deployment-infrastructure.notes.md`

**What it covers:**
- How the code runs in production
- Vercel (frontend hosting)
- Cloudflare Workers (backend)
- CI/CD pipeline (GitHub Actions)
- Monitoring and observability

**When to use:**
- Deployment planning
- Infrastructure changes
- Debugging production issues
- Cost optimization

---

## Quick Reference

### For New Developers

**Start here:**
1. **Repository Structure** - Learn where code lives
2. **Architecture Overview** - Understand the system
3. **Entry Points** - Get started developing

**Then explore:**
4. **Component Map** - Understand packages
5. **Data Flow** - Learn how data moves

### For SDK Users

**Essential reading:**
1. **Entry Points** - How to integrate tldraw
2. **Component Map** - Public APIs
3. **Architecture Overview** - How it works

### For Contributors

**Key diagrams:**
1. **Repository Structure** - Where to add code
2. **Component Map** - Dependencies
3. **Data Flow** - How to implement features
4. **Entry Points** - Development workflow

### For System Architects

**Strategic documentation:**
1. **Architecture Overview** - System design
2. **Deployment Infrastructure** - How it runs
3. **Database Schema** - Data model
4. **Authentication & Authorization** - Security

---

## Diagram Types Used

### Graph Diagrams
Used for hierarchical relationships and flows.
- **Repository Structure** - Tree hierarchy
- **Architecture Overview** - Layered architecture
- **Entry Points** - Access patterns
- **Deployment Infrastructure** - Infrastructure map

### Class Diagrams
Used for component relationships and APIs.
- **Component Map** - Packages and dependencies

### Sequence Diagrams
Used for temporal interactions and flows.
- **Data Flow** - Request/response cycles
- **Authentication & Authorization** - Auth flows

### ER Diagrams
Used for data modeling.
- **Database Schema** - Entity relationships

---

## Keeping Documentation Updated

### When to Update

**Update diagrams when:**
- Major architectural changes occur
- New packages are added
- Deployment infrastructure changes
- Database schema changes
- Authentication system changes

### How to Update

1. Edit the `.mermaid.md` file
2. Update the `.notes.md` file
3. Test in mermaid.live
4. Commit with descriptive message
5. Create PR with "docs: update wireframes" title

### Version Tags

Each version is tagged with date: `v2025-11-08`

When making major updates, create a new version folder to preserve history.

---

## Additional Resources

### Mermaid Documentation
- [Mermaid.js Official Docs](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live)
- [Mermaid Syntax Guide](https://mermaid.js.org/intro/)

### tldraw Documentation
- [tldraw.dev](https://tldraw.dev) - Official documentation
- [GitHub Repository](https://github.com/tldraw/tldraw)
- [CONTEXT.md](../CONTEXT.md) - Root context file
- [CLAUDE.md](../CLAUDE.md) - Claude Code instructions

### Related Files
- `/apps/examples/writing-examples.md` - Example writing guide
- Each package has its own `CONTEXT.md` file

---

## Contributing

### Reporting Issues

If you find errors or outdated information:
1. Open an issue on GitHub
2. Tag with "documentation" label
3. Reference specific diagram

### Suggesting Improvements

For new diagrams or improvements:
1. Discuss in GitHub Discussions
2. Create draft in issue
3. Submit PR when ready

---

## Credits

**Created by:** Claude Code (AI Agent)
**Date:** November 8, 2025
**tldraw Version:** 3.15.1
**Purpose:** Comprehensive architecture documentation for human developers

---

## License

This documentation follows the same license as the tldraw repository.

See the root LICENSE file for details.
