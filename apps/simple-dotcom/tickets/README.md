# Ticket Tracking

This folder contains all tickets for the simple-dotcom project, including feature tickets, technical debt, and bug reports.

## Folder Structure

- `tickets/` - Active tickets (features, bugs, technical debt, etc.)
- `tickets/resolved/` - Resolved tickets (completed, cannot reproduce, or won't fix)
- `BUG_TEMPLATE.md` - Template for creating bug report tickets
- `TEMPLATE.md` - Template for creating feature tickets

## Ticket Types

Tickets are organized by prefix:

- **BUG-XX** - Bug reports and fixes
- **AUTH-XX** - Authentication features
- **WS-XX** - Workspace features
- **DOC-XX** - Document features
- **COLLAB-XX** - Collaboration features
- **NAV-XX** - Navigation and routing
- **PERM-XX** - Permissions and security
- **MEM-XX** - Member management
- **TEST-XX** - Testing infrastructure
- **TECH-XX** - Technical infrastructure
- **DESIGN-XX** - Design and UI/UX
- **M##-XX** - Milestone-specific tasks

## Bug Report Lifecycle

### Creating a Bug Report

Use the `/bug-report` slash command to create a new bug report ticket. The command will:
1. Investigate the issue description and check logs
2. Determine the next available bug number
3. Create a comprehensive bug report using the BUG_TEMPLATE.md
4. Save it as `BUG-XX-description-slug.md` in the `tickets/` folder

### Ticket Statuses

- **New** - Just reported, not yet investigated
- **Investigating** - Actively researching the issue
- **In Progress** - Work is being implemented
- **Blocked** - Cannot proceed due to dependencies or blockers
- **Resolved** - Ticket has been completed
- **Cannot Reproduce** - Unable to reproduce the issue (bugs only)
- **Won't Fix** - Decision made not to fix this issue

### Resolving a Ticket

When a ticket is resolved (status changed to "Resolved", "Cannot Reproduce", or "Won't Fix"):

1. Update the ticket with:
   - Status checkbox checked
   - "Date resolved" field filled in
   - Resolution section completed explaining how it was fixed or why it was closed

2. **Move the file to `tickets/resolved/`**:
   ```bash
   git mv tickets/BUG-XX-description.md tickets/resolved/
   ```

This keeps the main `tickets/` folder focused on active work while preserving the history of resolved tickets.

## Naming Convention

Tickets follow this pattern: `PREFIX-XX-brief-description-slug.md`

- Prefix indicating ticket type (BUG-, AUTH-, WS-, etc.)
- Two-digit zero-padded number (01, 02, etc.)
- Brief description in kebab-case
- `.md` extension

Bug report examples:
- `BUG-01-workspace-creation-foreign-key-constraint.md`
- `BUG-12-workspace-creation-modal-not-opening.md`
- `BUG-31-workspace-rename-dialog-closes-before-update.md`

Feature ticket examples:
- `AUTH-01-implement-email-authentication-flows.md`
- `WS-02-owner-deletion-constraints.md`
- `DOC-05-archive-hard-delete-policies.md`

## Viewing Tickets

To see all active bug tickets:
```bash
ls tickets/BUG-*.md
```

To see all active tickets:
```bash
ls tickets/*.md | grep -v TEMPLATE | grep -v README
```

To see resolved tickets:
```bash
ls tickets/resolved/
```

To search for tickets by keyword:
```bash
grep -r "keyword" tickets/
```
