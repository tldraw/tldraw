%% tldraw Authentication & Authorization
%% Security flows for tldraw.com - Clerk integration, JWT tokens, permissions
%% Covers sign-in, protected routes, file permissions, and API authorization

sequenceDiagram
    participant User
    participant Browser
    participant ClerkUI as Clerk UI
    participant ClerkAPI as Clerk API
    participant Frontend as React App
    participant Router as React Router
    participant SyncWorker as Sync Worker
    participant DB as PostgreSQL

    Note over User,DB: SIGN-IN FLOW

    User->>Browser: Visit tldraw.com
    Browser->>Frontend: Load app
    Frontend->>ClerkAPI: Check session
    ClerkAPI-->>Frontend: No session

    Frontend->>User: Show landing page
    User->>ClerkUI: Click "Sign In"
    ClerkUI->>ClerkUI: Show sign-in modal
    User->>ClerkUI: Enter credentials<br/>(or OAuth)

    ClerkUI->>ClerkAPI: Authenticate
    ClerkAPI->>ClerkAPI: Validate credentials
    ClerkAPI->>ClerkAPI: Create session
    ClerkAPI-->>ClerkUI: Session token + JWT

    ClerkUI->>Browser: Set session cookie
    ClerkUI->>Frontend: Session established
    Frontend->>Frontend: useAuth() hook<br/>updates

    Frontend->>ClerkAPI: Get user data
    ClerkAPI-->>Frontend: User object
    Frontend->>DB: Sync user to database<br/>(if new)
    DB-->>Frontend: User created/updated

    Frontend->>Router: Redirect to /new<br/>or dashboard

    Note over User,DB: PROTECTED ROUTE ACCESS

    User->>Router: Navigate to /f/:fileId
    Router->>Frontend: Route component loads
    Frontend->>Frontend: Check auth via useAuth()

    alt User not authenticated
        Frontend->>ClerkUI: Redirect to sign-in
        ClerkUI->>User: Show sign-in
    else User authenticated
        Frontend->>Frontend: Get JWT from Clerk
        Frontend->>SyncWorker: Request file<br/>Authorization: Bearer JWT
        SyncWorker->>SyncWorker: Verify JWT signature<br/>(Clerk public key)

        alt JWT invalid or expired
            SyncWorker-->>Frontend: 401 Unauthorized
            Frontend->>ClerkAPI: Refresh token
            ClerkAPI-->>Frontend: New JWT
            Frontend->>SyncWorker: Retry with new JWT
        end

        SyncWorker->>DB: Query file + permissions
        DB-->>SyncWorker: File data + user role

        alt User has access
            SyncWorker-->>Frontend: 200 OK + file data
            Frontend->>User: Show editor
        else User lacks access
            SyncWorker-->>Frontend: 403 Forbidden
            Frontend->>User: Show "No access" error
        end
    end

    Note over User,DB: FILE PERMISSION CHECK

    User->>Frontend: Open file editor
    Frontend->>SyncWorker: GET /api/file/:id<br/>Authorization: Bearer JWT
    SyncWorker->>SyncWorker: Extract user ID from JWT

    SyncWorker->>DB: Query permissions
    Note right of DB: SELECT files.*, file_shares.*<br/>FROM files<br/>LEFT JOIN file_shares<br/>WHERE file.id = :id<br/>AND (file.owner_id = :userId<br/>OR file_shares.user_id = :userId)

    DB-->>SyncWorker: Permission result

    alt User is owner
        SyncWorker->>SyncWorker: Grant full access<br/>(read + write + share)
    else User has share (editor)
        SyncWorker->>SyncWorker: Grant editor access<br/>(read + write)
    else User has share (viewer)
        SyncWorker->>SyncWorker: Grant viewer access<br/>(read only)
    else File is published
        SyncWorker->>SyncWorker: Grant public access<br/>(read only)
    else No access
        SyncWorker-->>Frontend: 403 Forbidden
        Frontend->>User: Error message
    end

    Note over User,DB: WEBSOCKET AUTH (Multiplayer)

    Frontend->>SyncWorker: Connect WebSocket<br/>wss://sync/.../connect?token=JWT
    SyncWorker->>SyncWorker: Extract JWT from query
    SyncWorker->>SyncWorker: Verify JWT signature

    alt JWT valid
        SyncWorker->>DB: Get user permissions
        DB-->>SyncWorker: User role for room

        SyncWorker->>SyncWorker: Establish connection
        SyncWorker-->>Frontend: Connection accepted

        alt Read-write permission
            SyncWorker->>Frontend: Set mode: 'readwrite'
            Frontend->>User: Can edit
        else Read-only permission
            SyncWorker->>Frontend: Set mode: 'readonly'
            Frontend->>User: View only
        end
    else JWT invalid
        SyncWorker-->>Frontend: Close connection<br/>Code: 1008 (Policy violation)
        Frontend->>User: Show auth error
    end

    Note over User,DB: SHARING FLOW

    User->>Frontend: Click "Share" button
    Frontend->>User: Show share dialog
    User->>Frontend: Enter email + role<br/>(viewer or editor)

    Frontend->>SyncWorker: POST /api/file/:id/share<br/>{ email, role }<br/>Authorization: Bearer JWT
    SyncWorker->>SyncWorker: Verify JWT
    SyncWorker->>DB: Check if user is owner

    alt User is owner
        SyncWorker->>DB: Get or create recipient user
        DB-->>SyncWorker: Recipient user ID

        SyncWorker->>DB: INSERT file_shares<br/>(file_id, user_id, role, granted_by)
        DB-->>SyncWorker: Share created

        SyncWorker->>SyncWorker: Send email notification<br/>(optional)
        SyncWorker-->>Frontend: 200 OK + share data
        Frontend->>User: "Shared successfully"
    else User not owner
        SyncWorker-->>Frontend: 403 Forbidden
        Frontend->>User: "Only owner can share"
    end

    Note over User,DB: API AUTHORIZATION PATTERNS

    Frontend->>SyncWorker: API request<br/>Authorization: Bearer JWT
    SyncWorker->>SyncWorker: Middleware: verifyAuth()

    alt JWT present
        SyncWorker->>SyncWorker: Verify signature<br/>(Clerk JWKS)
        SyncWorker->>SyncWorker: Check expiration
        SyncWorker->>SyncWorker: Extract claims<br/>(userId, email, etc.)

        alt Valid JWT
            SyncWorker->>SyncWorker: Attach user to request<br/>req.user = { id, email }
            SyncWorker->>SyncWorker: Continue to handler
        else Invalid/expired JWT
            SyncWorker-->>Frontend: 401 Unauthorized
        end
    else No JWT
        SyncWorker-->>Frontend: 401 Unauthorized
    end

    Note over User,DB: PERMISSION LEVELS

    rect rgb(200, 220, 250)
        Note over User,DB: OWNER<br/>• Full access to file<br/>• Can share with others<br/>• Can delete file<br/>• Can manage permissions<br/>• Can publish/unpublish
    end

    rect rgb(220, 240, 220)
        Note over User,DB: EDITOR<br/>• Can view file<br/>• Can edit shapes<br/>• Cannot share<br/>• Cannot delete<br/>• Cannot change permissions
    end

    rect rgb(255, 240, 220)
        Note over User,DB: VIEWER<br/>• Can view file (read-only)<br/>• Cannot edit<br/>• Cannot share<br/>• Cannot delete<br/>• Can export
    end

    rect rgb(240, 240, 240)
        Note over User,DB: PUBLIC (Published)<br/>• Anyone with link<br/>• Read-only access<br/>• No account required<br/>• Cannot comment
    end

    Note over User,DB: SESSION REFRESH FLOW

    Frontend->>Frontend: JWT expiring soon<br/>(detected by Clerk)
    Frontend->>ClerkAPI: Refresh token
    ClerkAPI->>ClerkAPI: Validate refresh token
    ClerkAPI->>ClerkAPI: Issue new JWT

    ClerkAPI-->>Frontend: New JWT + session
    Frontend->>Browser: Update session cookie
    Frontend->>Frontend: Update auth state

    Frontend->>SyncWorker: Reconnect WebSocket<br/>with new JWT
    SyncWorker->>SyncWorker: Verify new JWT
    SyncWorker-->>Frontend: Connection maintained

    Note over User,DB: SIGN-OUT FLOW

    User->>Frontend: Click "Sign Out"
    Frontend->>ClerkAPI: Sign out request
    ClerkAPI->>ClerkAPI: Invalidate session
    ClerkAPI->>Browser: Clear session cookie
    ClerkAPI-->>Frontend: Signed out

    Frontend->>SyncWorker: Close WebSocket
    Frontend->>Frontend: Clear auth state
    Frontend->>Router: Redirect to landing
    Frontend->>User: Show landing page
