# Ticket Tracking

This folder contains all tickets for the simple-dotcom project, including feature tickets, technical debt, and bug reports.

## Folder Structure

- `tickets/` - Active tickets currently being worked on
- `tickets/backlog/` - New tickets not yet started (default location for new bugs and features)
- `tickets/in-progress/` - Tickets actively in development (optional, can also use tickets/)
- `tickets/resolved/` - Resolved tickets (completed, cannot reproduce, or won't fix)
- `BUG_TEMPLATE.md` - Template for creating bug report tickets
- `TEMPLATE.md` - Template for creating feature tickets

## Ticket Workflow

Tickets move through folders as they progress:

1. **New**: Created in `tickets/backlog/`
2. **Started**: Moved to `tickets/` (or optionally `tickets/in-progress/`) when work begins
3. **Completed**: Moved to `tickets/resolved/` when done

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
4. Save it as `BUG-XX-description-slug.md` in the `tickets/backlog/` folder

### Ticket Statuses

- **New** - Just reported, not yet investigated
- **Investigating** - Actively researching the issue
- **In Progress** - Work is being implemented
- **Blocked** - Cannot proceed due to dependencies or blockers
- **Resolved** - Ticket has been completed
- **Cannot Reproduce** - Unable to reproduce the issue (bugs only)
- **Won't Fix** - Decision made not to fix this issue

### Starting Work on a Ticket

When beginning work on a ticket from the backlog:

```bash
git mv tickets/backlog/BUG-XX-description.md tickets/
# or optionally
git mv tickets/backlog/BUG-XX-description.md tickets/in-progress/
```

Update the ticket status to "In Progress".

### Resolving a Ticket

When a ticket is resolved (status changed to "Resolved", "Cannot Reproduce", or "Won't Fix"):

1. Update the ticket with:
   - Status checkbox checked
   - "Date resolved" field filled in
   - Resolution section completed explaining how it was fixed or why it was closed

2. **Move the file to `tickets/resolved/`**:
   ```bash
   # From main tickets folder
   git mv tickets/BUG-XX-description.md tickets/resolved/
   # Or from in-progress
   git mv tickets/in-progress/BUG-XX-description.md tickets/resolved/
   ```

This keeps the `tickets/` and `tickets/backlog/` folders focused on active or upcoming work while preserving the history of resolved tickets.

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

To see all bug tickets in backlog:
```bash
ls tickets/backlog/BUG-*.md
```

To see all active bug tickets:
```bash
ls tickets/BUG-*.md tickets/in-progress/BUG-*.md 2>/dev/null
```

To see all tickets in backlog:
```bash
ls tickets/backlog/*.md
```

To see all active tickets:
```bash
ls tickets/*.md tickets/in-progress/*.md 2>/dev/null | grep -v TEMPLATE | grep -v README
```

To see resolved tickets:
```bash
ls tickets/resolved/
```

To search for tickets by keyword across all folders:
```bash
grep -r "keyword" tickets/
```
