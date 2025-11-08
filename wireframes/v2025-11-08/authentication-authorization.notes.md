# Authentication & Authorization - Detailed Notes

## Overview

tldraw.com uses **Clerk** for authentication and a custom authorization system for file permissions. This document details the security flows, permission models, and implementation patterns.

## Authentication System (Clerk)

### Why Clerk?

**Benefits:**
- Managed authentication service
- Multiple sign-in methods (email, OAuth, etc.)
- Pre-built UI components
- JWT-based sessions
- User management dashboard
- Security best practices built-in

**Integration:**
- Frontend: `@clerk/clerk-react`
- Backend: JWT verification with Clerk JWKS

---

### Sign-In Flow

**Step 1: User Visits tldraw.com**
```typescript
// Frontend checks auth on load
import { useAuth } from '@clerk/clerk-react'

function App() {
  const { isLoaded, isSignedIn, user } = useAuth()

  if (!isLoaded) return <Loading />
  if (!isSignedIn) return <LandingPage />
  return <Dashboard user={user} />
}
```

**Step 2: User Initiates Sign-In**
```typescript
import { SignIn } from '@clerk/clerk-react'

// Clerk provides pre-built modal
<SignIn routing="hash" />
```

**Step 3: Authentication**
- User enters credentials (or uses OAuth)
- Clerk validates credentials
- Session created with JWT
- Session cookie set in browser

**Step 4: User Synced to Database**
```typescript
// Webhook from Clerk when user created
app.post('/webhooks/clerk', async (req, res) => {
  const { type, data } = req.body

  if (type === 'user.created') {
    await db.users.create({
      id: data.id,
      email: data.email_addresses[0].email_address,
      name: data.first_name + ' ' + data.last_name,
      avatar: data.profile_image_url
    })
  }

  res.status(200).send('OK')
})
```

---

### Session Management

**JWT Structure:**
```json
{
  "sub": "user_2abc123def456",  // User ID
  "email": "alice@example.com",
  "iat": 1234567890,  // Issued at
  "exp": 1234571490,  // Expires at (1 hour)
  "iss": "https://clerk.tldraw.com",
  "aud": "tldraw-production"
}
```

**Token Lifecycle:**
- **Issued:** On sign-in
- **Duration:** 1 hour (configurable)
- **Refresh:** Automatic via Clerk
- **Revocation:** On sign-out or forced logout

**Storage:**
- Session cookie (httpOnly, secure, sameSite)
- Stored in browser by Clerk
- Sent with every request

---

### Token Refresh

**Automatic Refresh:**
```typescript
// Clerk handles refresh automatically
// When token near expiration:
// 1. Clerk detects expiration approaching
// 2. Requests new token from Clerk API
// 3. Updates session cookie
// 4. Application continues seamlessly
```

**Manual Refresh (if needed):**
```typescript
const { getToken } = useAuth()

// Get fresh token
const token = await getToken()
```

---

### Sign-Out Flow

**Process:**
1. User clicks "Sign Out"
2. Frontend calls Clerk sign-out
3. Clerk invalidates session
4. Session cookie cleared
5. WebSocket connections closed
6. Redirect to landing page

**Implementation:**
```typescript
import { useClerk } from '@clerk/clerk-react'

function SignOutButton() {
  const { signOut } = useClerk()

  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  )
}
```

---

## Authorization System (Custom)

### Permission Model

tldraw uses a **role-based access control (RBAC)** system with three levels:

#### 1. Owner
- **Full control** over file
- Can edit content
- Can share with others
- Can manage permissions
- Can delete file
- Can publish/unpublish

#### 2. Editor
- Can view file
- Can edit content
- **Cannot** share
- **Cannot** delete
- **Cannot** change permissions

#### 3. Viewer
- Can view file (read-only)
- **Cannot** edit
- **Cannot** share
- **Cannot** delete
- Can export to image/JSON

#### 4. Public (Published Files)
- Anyone with link
- Read-only access
- No account required
- Cannot comment or edit

---

### Permission Storage

**Database Schema:**
```sql
-- File ownership
CREATE TABLE files (
  id UUID PRIMARY KEY,
  owner_id VARCHAR(255) NOT NULL REFERENCES users(id),
  is_published BOOLEAN DEFAULT FALSE,
  publish_slug VARCHAR(255) UNIQUE,
  ...
);

-- Shared access
CREATE TABLE file_shares (
  id UUID PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES files(id),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  granted_by VARCHAR(255) NOT NULL REFERENCES users(id),
  role ENUM('viewer', 'editor', 'owner'),
  created_at TIMESTAMP,
  revoked_at TIMESTAMP
);
```

---

### Protected Routes

**Implementation:**
```typescript
import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <Loading />
  if (!isSignedIn) return <Navigate to="/" />

  return children
}

// Usage
<Route path="/f/:fileId" element={
  <ProtectedRoute>
    <FileEditor />
  </ProtectedRoute>
} />
```

---

### API Authorization

**Middleware Pattern:**
```typescript
// Verify JWT middleware
async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' })
  }

  const token = authHeader.substring(7)

  try {
    // Verify JWT signature with Clerk public key
    const payload = await verifyJWT(token, clerkPublicKey)

    // Attach user to request
    req.user = {
      id: payload.sub,
      email: payload.email
    }

    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Usage
app.get('/api/file/:id', verifyAuth, async (req, res) => {
  // req.user is authenticated user
  const file = await getFile(req.params.id, req.user.id)
  res.json(file)
})
```

---

### Permission Checks

**Check User Access to File:**
```typescript
async function getUserFilePermission(fileId: string, userId: string) {
  // Query file and shares
  const file = await db.query(`
    SELECT
      f.*,
      CASE
        WHEN f.owner_id = $1 THEN 'owner'
        WHEN fs.role IS NOT NULL THEN fs.role
        WHEN f.is_published = TRUE THEN 'public'
        ELSE NULL
      END as user_role
    FROM files f
    LEFT JOIN file_shares fs ON fs.file_id = f.id
      AND fs.user_id = $1
      AND fs.revoked_at IS NULL
    WHERE f.id = $2
      AND f.deleted_at IS NULL
  `, [userId, fileId])

  if (!file || !file.user_role) {
    throw new Error('No access')
  }

  return {
    file,
    role: file.user_role,
    canRead: true,
    canWrite: ['owner', 'editor'].includes(file.user_role),
    canShare: file.user_role === 'owner',
    canDelete: file.user_role === 'owner'
  }
}
```

**Usage in Handler:**
```typescript
app.get('/api/file/:id', verifyAuth, async (req, res) => {
  try {
    const { file, canRead } = await getUserFilePermission(
      req.params.id,
      req.user.id
    )

    if (!canRead) {
      return res.status(403).json({ error: 'No access' })
    }

    res.json(file)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})
```

---

### WebSocket Authorization

**Connection Flow:**
```typescript
// Client-side
const { getToken } = useAuth()
const token = await getToken()

const ws = new WebSocket(
  `wss://sync.tldraw.com/connect?token=${token}&roomId=${roomId}`
)

// Server-side (Cloudflare Worker)
async function handleWebSocket(request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const roomId = url.searchParams.get('roomId')

  // Verify JWT
  try {
    const payload = await verifyJWT(token)
    const userId = payload.sub

    // Check room permissions
    const permission = await getRoomPermission(roomId, userId)

    if (!permission.canRead) {
      return new Response('Forbidden', { status: 403 })
    }

    // Upgrade to WebSocket
    const [client, server] = Object.values(new WebSocketPair())

    // Store user info and permission
    server.accept()
    server.addEventListener('message', (event) => {
      handleMessage(event.data, {
        userId,
        canWrite: permission.canWrite
      })
    })

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  } catch (err) {
    return new Response('Unauthorized', { status: 401 })
  }
}
```

**Read-Only Enforcement:**
```typescript
function handleMessage(message, context) {
  const { userId, canWrite } = context
  const data = JSON.parse(message)

  if (data.type === 'PUT_RECORDS') {
    if (!canWrite) {
      // Reject write attempt from read-only user
      return send({ type: 'ERROR', message: 'Read-only' })
    }

    // Allow write
    applyRecords(data.records)
  }
}
```

---

## File Sharing

### Sharing Flow

**Step 1: Owner Initiates Share**
```typescript
function ShareDialog({ fileId }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')

  async function handleShare() {
    const response = await fetch(`/api/file/${fileId}/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, role })
    })

    if (response.ok) {
      alert('Shared successfully!')
    }
  }

  return (
    <form onSubmit={handleShare}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter email"
      />
      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
      </select>
      <button type="submit">Share</button>
    </form>
  )
}
```

**Step 2: Server Processes Share**
```typescript
app.post('/api/file/:id/share', verifyAuth, async (req, res) => {
  const { email, role } = req.body
  const fileId = req.params.id

  // Check if requester is owner
  const permission = await getUserFilePermission(fileId, req.user.id)
  if (permission.role !== 'owner') {
    return res.status(403).json({ error: 'Only owner can share' })
  }

  // Get or create recipient user
  let recipient = await db.users.findOne({ email })
  if (!recipient) {
    recipient = await db.users.create({
      email,
      name: email.split('@')[0]  // Default name
    })
  }

  // Create share
  await db.file_shares.create({
    file_id: fileId,
    user_id: recipient.id,
    granted_by: req.user.id,
    role
  })

  // Optional: Send email notification
  await sendShareEmail(recipient.email, {
    fileName: permission.file.name,
    sharedBy: req.user.email,
    role
  })

  res.status(200).json({ success: true })
})
```

---

### Revoke Access

**Implementation:**
```typescript
app.delete('/api/file/:fileId/share/:userId', verifyAuth, async (req, res) => {
  const { fileId, userId } = req.params

  // Verify requester is owner
  const permission = await getUserFilePermission(fileId, req.user.id)
  if (permission.role !== 'owner') {
    return res.status(403).json({ error: 'Only owner can revoke' })
  }

  // Soft delete share (mark as revoked)
  await db.file_shares.update(
    { file_id: fileId, user_id: userId },
    { revoked_at: new Date() }
  )

  // Close active WebSocket connections for this user
  await closeUserConnections(fileId, userId)

  res.status(200).json({ success: true })
})
```

---

## Published Files

### Publishing Flow

**Enable Public Access:**
```typescript
app.post('/api/file/:id/publish', verifyAuth, async (req, res) => {
  const fileId = req.params.id

  // Verify ownership
  const permission = await getUserFilePermission(fileId, req.user.id)
  if (permission.role !== 'owner') {
    return res.status(403).json({ error: 'Only owner can publish' })
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(permission.file.name)

  // Update file
  await db.files.update(
    { id: fileId },
    {
      is_published: true,
      publish_slug: slug
    }
  )

  const publicUrl = `https://tldraw.com/p/${slug}`
  res.json({ publicUrl })
})
```

**Access Published File:**
```typescript
app.get('/p/:slug', async (req, res) => {
  const file = await db.files.findOne({
    publish_slug: req.params.slug,
    is_published: true
  })

  if (!file) {
    return res.status(404).send('Not found')
  }

  // Render editor in read-only mode
  res.render('editor', {
    fileId: file.id,
    readOnly: true,
    requireAuth: false
  })
})
```

---

## Security Best Practices

### JWT Verification

**Always verify:**
1. Signature (using Clerk public key)
2. Expiration (`exp` claim)
3. Issuer (`iss` claim)
4. Audience (`aud` claim)

**Implementation:**
```typescript
import { verifyToken } from '@clerk/backend'

async function verifyJWT(token: string) {
  try {
    const payload = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_KEY,
      authorizedParties: ['tldraw.com']
    })

    return payload
  } catch (err) {
    throw new Error('Invalid token')
  }
}
```

---

### Rate Limiting

**Prevent abuse:**
```typescript
import rateLimit from 'express-rate-limit'

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: 'Too many requests'
})

app.use('/api/', apiLimiter)
```

---

### SQL Injection Prevention

**Use parameterized queries:**
```typescript
// ❌ BAD - Vulnerable to SQL injection
const files = await db.query(
  `SELECT * FROM files WHERE owner_id = '${userId}'`
)

// ✅ GOOD - Parameterized query
const files = await db.query(
  `SELECT * FROM files WHERE owner_id = $1`,
  [userId]
)
```

---

### CSRF Protection

**Double submit cookie pattern:**
```typescript
// Client sends CSRF token in header
fetch('/api/file', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken
  }
})

// Server verifies token
app.use((req, res, next) => {
  const tokenFromHeader = req.headers['x-csrf-token']
  const tokenFromCookie = req.cookies.csrfToken

  if (tokenFromHeader !== tokenFromCookie) {
    return res.status(403).send('Invalid CSRF token')
  }

  next()
})
```

**Note:** Clerk handles CSRF protection automatically for auth flows.

---

### Content Security Policy

**HTTP Headers:**
```typescript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.tldraw.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' wss://sync.tldraw.com https://clerk.tldraw.com;"
  )
  next()
})
```

---

## Error Handling

### Auth Errors

**401 Unauthorized:**
```typescript
// Missing or invalid token
res.status(401).json({
  error: 'Unauthorized',
  message: 'Please sign in to access this resource'
})
```

**403 Forbidden:**
```typescript
// Valid auth but insufficient permissions
res.status(403).json({
  error: 'Forbidden',
  message: 'You do not have permission to access this file'
})
```

**Frontend Handling:**
```typescript
async function fetchFile(fileId: string) {
  const response = await fetch(`/api/file/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (response.status === 401) {
    // Token expired or invalid
    // Clerk will automatically refresh
    const newToken = await getToken()
    // Retry with new token
    return fetchFile(fileId)
  }

  if (response.status === 403) {
    // User doesn't have access
    throw new Error('No access to this file')
  }

  return response.json()
}
```

---

## Monitoring & Auditing

### Access Logs

**Log all file access:**
```typescript
app.use('/api/file/:id', async (req, res, next) => {
  // Log access attempt
  await db.access_logs.create({
    user_id: req.user?.id,
    file_id: req.params.id,
    action: req.method,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    timestamp: new Date()
  })

  next()
})
```

---

### Permission Change Audit

**Track permission changes:**
```typescript
await db.audit_logs.create({
  user_id: req.user.id,
  action: 'SHARE_FILE',
  resource_type: 'file',
  resource_id: fileId,
  details: {
    shared_with: recipient.email,
    role: role
  },
  timestamp: new Date()
})
```

---

## Testing Authentication

### Unit Tests

**Mock Clerk:**
```typescript
jest.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: 'user-123', email: 'test@example.com' }
  })
}))

test('protected route allows authenticated user', () => {
  render(<ProtectedRoute><FileEditor /></ProtectedRoute>)
  expect(screen.getByText('Editor')).toBeInTheDocument()
})
```

---

### E2E Tests

**Clerk Testing Integration:**
```typescript
import { test } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

test('user can access their file', async ({ page }) => {
  // Sign in with test user
  await setupClerkTestingToken({ page })

  await page.goto('/f/test-file-id')
  await page.waitForSelector('.tldraw-editor')

  // Verify editor loaded
  expect(await page.isVisible('.tldraw-editor')).toBe(true)
})
```

---

## Summary

### Authentication (Clerk)
- Managed auth service
- JWT-based sessions
- Automatic token refresh
- Multiple sign-in methods

### Authorization (Custom)
- Role-based access control (owner, editor, viewer, public)
- File-level permissions
- Share management
- Audit logging

### Security
- JWT verification
- Rate limiting
- CSRF protection
- SQL injection prevention
- Content Security Policy

### Best Practices
- Always verify tokens server-side
- Check permissions for every operation
- Log access attempts
- Handle errors gracefully
- Test auth flows thoroughly
