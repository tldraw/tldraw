%% tldraw Database Schema
%% Data model visualization for tldraw.com and local storage
%% Covers PostgreSQL (server), IndexedDB (client), and TLStore records

erDiagram
    %% PostgreSQL Schema (tldraw.com server-side)

    User ||--o{ File : owns
    User ||--o{ FileShare : grants
    User ||--o{ Session : has
    User {
        string id PK "Clerk user ID"
        string email "User email"
        string name "Display name"
        string avatar "Avatar URL"
        timestamp createdAt "Account creation"
        timestamp updatedAt "Last update"
        jsonb metadata "Additional user data"
    }

    File ||--o{ FileVersion : has
    File ||--o{ FileShare : shared
    File ||--|| FileState : current
    File {
        string id PK "File UUID"
        string ownerId FK "User.id"
        string name "File name"
        boolean isPublished "Public visibility"
        string publishSlug "Public URL slug"
        timestamp createdAt "File creation"
        timestamp updatedAt "Last modified"
        timestamp deletedAt "Soft delete"
        jsonb metadata "File metadata"
    }

    FileVersion {
        string id PK "Version UUID"
        string fileId FK "File.id"
        string userId FK "User.id who created"
        jsonb snapshot "TLStore snapshot"
        string description "Version description"
        timestamp createdAt "Version timestamp"
        int snapshotSize "Snapshot byte size"
    }

    FileState {
        string fileId PK "File.id"
        jsonb state "Current TLStore state"
        timestamp updatedAt "Last state update"
        int version "State version number"
    }

    FileShare {
        string id PK "Share UUID"
        string fileId FK "File.id"
        string userId FK "User.id shared with"
        string grantedBy FK "User.id who shared"
        enum role "viewer, editor, owner"
        timestamp createdAt "Share creation"
        timestamp revokedAt "Share revocation"
    }

    Session {
        string id PK "Session UUID"
        string userId FK "User.id"
        string token "Session token hash"
        timestamp createdAt "Session start"
        timestamp expiresAt "Session expiration"
        jsonb metadata "Session metadata"
    }

    Asset ||--o{ File : referenced
    Asset {
        string id PK "Asset hash (SHA256)"
        string url "R2 object URL"
        string type "image, video, etc"
        int size "File size bytes"
        int width "Image width"
        int height "Image height"
        string mimeType "MIME type"
        timestamp createdAt "Upload timestamp"
        string uploadedBy FK "User.id"
    }

    Room ||--o{ RoomPresence : has
    Room {
        string id PK "Room ID (Durable Object)"
        string fileId FK "File.id (nullable)"
        jsonb state "Room document state"
        timestamp createdAt "Room creation"
        timestamp lastActivity "Last edit"
        int participantCount "Active users"
    }

    RoomPresence {
        string id PK "Presence UUID"
        string roomId FK "Room.id"
        string userId FK "User.id"
        string sessionId "Browser tab ID"
        jsonb presence "Cursor, selection"
        timestamp updatedAt "Last presence update"
    }

    %% IndexedDB Schema (Client-side local storage)

    LocalStore {
        string key PK "Store persistence key"
        jsonb snapshot "TLStore snapshot"
        timestamp updatedAt "Last save"
        int version "Store version"
    }

    LocalAsset {
        string id PK "Asset ID"
        blob data "Asset binary data"
        string type "MIME type"
        int size "Size in bytes"
        timestamp cachedAt "Cache timestamp"
    }

    UserPreferences {
        string key PK "Preference key"
        jsonb value "Preference value"
        timestamp updatedAt "Last update"
    }

    %% TLStore Record Types (In-memory/synced data model)

    TLShape {
        string id PK "Shape ID"
        string type "text, geo, arrow, etc"
        string parentId FK "Parent shape ID"
        int index "Z-index ordering"
        number x "X position"
        number y "Y position"
        number rotation "Rotation radians"
        boolean isLocked "Lock state"
        jsonb props "Shape-specific props"
        jsonb meta "User metadata"
    }

    TLBinding {
        string id PK "Binding ID"
        string type "arrow, etc"
        string fromId FK "TLShape.id"
        string toId FK "TLShape.id"
        jsonb props "Binding props"
        jsonb meta "User metadata"
    }

    TLPage {
        string id PK "Page ID"
        string name "Page name"
        int index "Page order"
        jsonb meta "User metadata"
    }

    TLAsset_Record {
        string id PK "Asset ID"
        string type "image, video, bookmark"
        jsonb props "Asset properties"
        jsonb meta "User metadata"
    }

    TLCamera {
        string id PK "Camera ID"
        number x "Camera X"
        number y "Camera Y"
        number z "Zoom level"
    }

    TLInstancePresence {
        string id PK "Instance ID"
        string userId "User identifier"
        string userName "Display name"
        string userColor "Cursor color"
        jsonb cursor "Cursor position"
        array selectedShapeIds "Selected shapes"
        jsonb brush "Brush selection"
        jsonb meta "Custom presence"
    }

    TLPointer {
        string id PK "Pointer ID"
        number x "Pointer X"
        number y "Pointer Y"
    }

    TLDocument {
        string id PK "Document ID"
        string name "Document name"
        jsonb meta "Document metadata"
    }

    TLInstancePageState {
        string id PK "Page state ID"
        string pageId FK "TLPage.id"
        array selectedShapeIds "Selection"
        array erasingShapeIds "Erasing"
        array editingShapeId "Editing"
        number cameraX "Camera X"
        number cameraY "Camera Y"
        number cameraZ "Zoom"
    }

    %% Relationships between TLStore record types
    TLPage ||--o{ TLShape : contains
    TLPage ||--|| TLInstancePageState : state
    TLShape ||--o{ TLBinding : from
    TLShape ||--o{ TLBinding : to
    TLShape ||--o{ TLShape : parent
    TLAsset_Record ||--o{ TLShape : used
