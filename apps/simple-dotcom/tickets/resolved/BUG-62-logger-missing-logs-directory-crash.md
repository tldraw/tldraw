# [BUG-62]: Logger Crashes When .logs Directory Missing

Date reported: 2025-10-09
Date last updated: 2025-10-09
Date resolved: 2025-10-09

## Status

- [ ] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [x] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [x] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [x] Infrastructure

## Environment

- Browser: Chrome (Playwright tests)
- OS: macOS
- Environment: local/test
- Affected version/commit: Before fix on 2025-10-09

## Description

The pino logger was attempting to create a file stream to `/Users/.../simple-client/.logs/backend.log` but the `.logs` directory didn't exist, causing an ENOENT error that crashed the Next.js server during test runs.

## Steps to Reproduce

1. Delete the `.logs` directory if it exists
2. Start the Next.js dev server or run Playwright tests
3. Trigger any server-side code that initializes the logger

## Expected Behavior

The logger should either:
- Auto-create the `.logs` directory if file logging is enabled
- Gracefully handle missing directory and continue without file logging

## Actual Behavior

Server crashes with:
```
[Error: ENOENT: no such file or directory, open '/Users/stephenruiz/Documents/GitHub/tldraw/apps/simple-dotcom/simple-client/.logs/backend.log'] {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '/Users/stephenruiz/Documents/GitHub/tldraw/apps/simple-dotcom/simple-client/.logs/backend.log'
}
```

## Error Messages/Logs

```
[Error: ENOENT: no such file or directory, open '/Users/stephenruiz/Documents/GitHub/tldraw/apps/simple-dotcom/simple-client/.logs/backend.log'] {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '/Users/stephenruiz/Documents/GitHub/tldraw/apps/simple-dotcom/simple-client/.logs/backend.log'
}

⨯ uncaughtException: [Error: ENOENT: no such file or directory, open '.../.logs/backend.log']
```

## Related Files/Components

- `simple-client/src/lib/server/logger.ts:26-46`

## Possible Cause

The logger initialization code assumed the `.logs` directory already existed when file logging was enabled. The code was:

```typescript
const logPath = join(process.cwd(), logDir, 'backend.log')

if (shouldLogToFile) {
    streams.push({
        stream: require('fs').createWriteStream(logPath, {
            flags: 'a',
            encoding: 'utf8',
        }),
        level: 'debug' as pino.Level,
    })
}
```

This tries to create a write stream without checking if the parent directory exists.

## Proposed Solution

Add automatic directory creation before attempting to create the file stream:

```typescript
if (shouldLogToFile) {
    const fs = require('fs')
    const logDirPath = join(process.cwd(), logDir)
    if (!fs.existsSync(logDirPath)) {
        fs.mkdirSync(logDirPath, { recursive: true })
    }
}
```

## Related Issues

- Part of BUG-58: Workspace creation UI not updating realtime
- Part of BUG-60: Realtime document tests navigation timeout
- The logger crash was causing page crashes during workspace creation/rename tests

## Worklog

**2025-10-09:**
- Discovered error while investigating workspace creation test failures
- Identified that logger was crashing when `.logs` directory didn't exist
- Implemented fix to auto-create directory with `fs.mkdirSync(logDirPath, { recursive: true })`
- Verified fix resolves the crash

## Resolution

Added automatic directory creation in `logger.ts` at line 39-46:

```typescript
// Ensure log directory exists if file logging is enabled
if (shouldLogToFile) {
    const fs = require('fs')
    const logDirPath = join(process.cwd(), logDir)
    if (!fs.existsSync(logDirPath)) {
        fs.mkdirSync(logDirPath, { recursive: true })
    }
}
```

This ensures the `.logs` directory is created before attempting to open a file stream. The `recursive: true` option ensures parent directories are also created if needed.

**Test Results:**
- All workspace tests now pass without logger crashes
- Logger initializes successfully with or without existing `.logs` directory