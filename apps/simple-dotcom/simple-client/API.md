# Simple Dotcom API Documentation

This document describes the RESTful API endpoints for the Simple tldraw application.

## Base URL

All API endpoints are prefixed with `/api`.

## Authentication

Most endpoints require authentication via Supabase Auth session cookies. Public document endpoints support guest access based on sharing settings.

## Response Format

All responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... } // Optional
  }
}
```

## Error Codes

Common error codes and their HTTP status codes:

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `UNAUTHORIZED` | 401 | User is not authenticated |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `WORKSPACE_LIMIT_EXCEEDED` | 422 | Workspace limit reached |
| `DOCUMENT_LIMIT_EXCEEDED` | 422 | Document limit reached |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

See `src/lib/api/errors.ts` for the complete list.

## Endpoints

### Workspaces

#### List Workspaces
```
GET /api/workspaces
```
Returns all workspaces the authenticated user has access to (owned + member).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "owner_id": "uuid",
      "name": "My Workspace",
      "is_private": false,
      "is_deleted": false,
      "deleted_at": null,
      "created_at": "2025-10-04T00:00:00Z",
      "updated_at": "2025-10-04T00:00:00Z"
    }
  ]
}
```

#### Get Workspace
```
GET /api/workspaces/:workspaceId
```
Returns details for a specific workspace.

#### Create Workspace
```
POST /api/workspaces
```
**Body:**
```json
{
  "name": "New Workspace"
}
```

#### Update Workspace
```
PATCH /api/workspaces/:workspaceId
```
Owner only. Updates workspace properties.

**Body:**
```json
{
  "name": "Updated Name"
}
```

#### Delete Workspace
```
DELETE /api/workspaces/:workspaceId
```
Owner only. Soft deletes a workspace. Cannot delete private workspaces.

#### Leave Workspace
```
POST /api/workspaces/:workspaceId/leave
```
Members only. Owners must transfer ownership first.

#### Transfer Ownership
```
POST /api/workspaces/:workspaceId/transfer-ownership
```
Owner only. Transfers ownership to another member.

**Body:**
```json
{
  "new_owner_id": "uuid"
}
```

### Workspace Members

#### List Members
```
GET /api/workspaces/:workspaceId/members
```
Returns all members of a workspace with user details.

#### Remove Member
```
DELETE /api/workspaces/:workspaceId/members/:userId
```
Owner only. Removes a member from the workspace.

### Invitations

#### Get Invitation Link
```
GET /api/workspaces/:workspaceId/invite
```
Owner only. Returns the current invitation link (creates one if none exists).

**Note:** Private workspaces cannot have invitation links. This endpoint will return a 403 error for private workspaces.

#### Update Invitation Link
```
PATCH /api/workspaces/:workspaceId/invite
```
Owner only. Enable or disable the invitation link.

**Body:**
```json
{
  "enabled": true
}
```

#### Regenerate Invitation Link
```
POST /api/workspaces/:workspaceId/invite/regenerate
```
Owner only. Generates a new token, invalidating the old link.

**Note:** Cannot regenerate invitation links for private workspaces.

#### Join Workspace
```
POST /api/invite/:token/join
```
Authenticated users can join a workspace using a valid invitation token.

### Documents

#### List Documents
```
GET /api/workspaces/:workspaceId/documents
```
Returns documents in a workspace.

**Query Parameters:**
- `folder_id` (optional): Filter by folder. Use empty string for root documents.
- `archived` (optional): Include archived documents (`true`/`false`).
- `page` (optional): Page number (default: 1).
- `limit` (optional): Items per page (default: 20, max: 100).

#### Get Document
```
GET /api/documents/:documentId
```
Returns document details. Supports public sharing modes.

#### Create Document
```
POST /api/workspaces/:workspaceId/documents
```
**Body:**
```json
{
  "name": "New Document",
  "folder_id": "uuid" // Optional
}
```

#### Update Document
```
PATCH /api/documents/:documentId
```
**Body:**
```json
{
  "name": "Updated Name",
  "folder_id": "uuid", // Optional
  "is_archived": false // Optional
}
```

#### Delete Document
```
DELETE /api/documents/:documentId
```
Permanently deletes a document.

#### Update Sharing Mode
```
PATCH /api/documents/:documentId/share
```
Workspace members only.

**Body:**
```json
{
  "sharing_mode": "private" | "public_read_only" | "public_editable"
}
```

### Folders

#### List Folders
```
GET /api/workspaces/:workspaceId/folders
```
Returns all folders in a workspace.

#### Create Folder
```
POST /api/workspaces/:workspaceId/folders
```
**Body:**
```json
{
  "name": "New Folder",
  "parent_folder_id": "uuid" // Optional
}
```

### Search

#### Search Documents
```
GET /api/search
```
Search documents across all accessible workspaces.

**Query Parameters:**
- `q` (required): Search query.
- `workspace_id` (optional): Limit to specific workspace.
- `limit` (optional): Max results (default: 20, max: 50).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "document": { ... },
      "workspace": {
        "id": "uuid",
        "name": "Workspace Name"
      }
    }
  ]
}
```

### Presence

#### Get Presence
```
GET /api/presence/:documentId
```
Returns active presence sessions (last seen within 30 seconds).

#### Update Presence
```
POST /api/presence/:documentId
```
Updates presence for the current session.

**Headers:**
- `x-session-id` (optional): Session identifier for tracking.

**Body:**
```json
{
  "cursor_position": { "x": 100, "y": 200 } // Optional
}
```

## Rate Limiting

Rate limiting will be implemented per specification to prevent abuse. Limits will be applied per user/IP address.

## Versioning

The API uses URL versioning (currently implicit `/api/v1`). Future versions will be explicitly versioned.

## Usage Example

### Using the API Client

```typescript
import { apiClient } from '@/lib/api/client'

// List workspaces
const { data: workspaces } = await apiClient.getWorkspaces()

// Create document
const { data: document } = await apiClient.createDocument(workspaceId, {
  name: 'My Document',
  folder_id: null
})

// Update sharing
await apiClient.updateDocumentSharing(documentId, {
  sharing_mode: 'public_read_only'
})
```

### Direct Fetch

```typescript
const response = await fetch('/api/workspaces', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})

const result = await response.json()
if (result.success) {
  console.log(result.data)
} else {
  console.error(result.error)
}
```

## Security Considerations

1. **Authentication**: Most endpoints require valid Supabase Auth session.
2. **Authorization**: Row-Level Security (RLS) policies enforce access control at the database level.
3. **Input Validation**: All inputs are validated before processing.
4. **Rate Limiting**: Protects against abuse and DoS attacks.
5. **CSRF Protection**: Next.js provides built-in CSRF protection.

## Testing

Integration tests are located in `__tests__/api/`. Run tests with:

```bash
yarn test
```

## OpenAPI Specification

An OpenAPI/Swagger specification will be generated and available at `/api/docs` (future enhancement).
