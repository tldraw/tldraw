# Simple tldraw - Master Design Document

## OUTLINE

### 1. Executive Summary
- Product overview
- Key technologies stack
- Reference implementation purpose
- Target audience

### 2. Goals and Non-Goals

#### 2.1 MVP Goals (P0 Features)
- Authentication & Users
- Workspaces (private + shared)
- Documents & Organization
- Real-time Collaboration
- Permissions & Sharing
- UI/UX Requirements

#### 2.2 Non-Goals (Post-MVP)
- Deferred features list
- Future enhancements

#### 2.3 Constraints & Limits
- Technical limits (file size, nesting depth, etc.)
- Sanity limits (members, documents, workspaces)

### 3. System Architecture

#### 3.1 High-Level Architecture Diagram
- Client layer (Next.js/Vercel)
- Database layer (Supabase PostgreSQL + Realtime)
- Sync layer (Cloudflare Durable Objects)
- Storage layer (R2)

#### 3.2 Monorepo Structure
- simple-client (Next.js app)
- simple-worker (Cloudflare sync worker)
- simple-shared (shared types and utilities)

#### 3.3 Data Flow
- Client ’ API ’ Database
- Client ” Sync Worker ” R2
- Real-time updates flow

#### 3.4 Technology Choices & Rationale
- Why Better Auth
- Why Cloudflare Workers
- Why Supabase
- Why R2

### 4. Data Model

#### 4.1 Complete Database Schema
- Users table
- Workspaces table
- Workspace_members table
- Invitation_links table
- Folders table
- Documents table
- Document_access_log table (for recent documents)
- Presence table

#### 4.2 Relationships & Foreign Keys
- Entity relationship diagram
- Cascade behaviors

#### 4.3 Folder Hierarchy Implementation
- Adjacency list model details
- Cycle prevention algorithm
- Max depth enforcement
- Example validation pseudocode

#### 4.4 Indexes Strategy
- Primary indexes
- Performance indexes
- Search indexes (pg_trgm)

### 5. Authentication & Authorization

#### 5.1 Better Auth Integration
- Session management
- Token handling
- Email/password flow
- Session validation in API routes

#### 5.2 Authorization Layers
- Frontend (UI only)
- API layer validation
- RLS policies (database layer)
- Sync worker validation

#### 5.3 Row Level Security (RLS) Policies
- Users table policies
- Workspaces table policies
- Workspace_members policies
- Documents policies
- Folders policies
- Invitation_links policies

#### 5.4 Permission Model
- Owner vs Member roles
- Workspace-level permissions
- Document-level permissions
- Guest access rules

### 6. API Design

#### 6.1 Authentication Endpoints
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/session

#### 6.2 Workspace Endpoints
- GET /api/workspaces
- POST /api/workspaces
- GET /api/workspaces/:workspaceId
- PATCH /api/workspaces/:workspaceId
- DELETE /api/workspaces/:workspaceId
- POST /api/workspaces/:workspaceId/leave
- POST /api/workspaces/:workspaceId/transfer-ownership

#### 6.3 Invitation Endpoints
- GET /api/workspaces/:workspaceId/invite
- POST /api/workspaces/:workspaceId/invite/regenerate
- PATCH /api/workspaces/:workspaceId/invite
- POST /api/invite/:token/join

#### 6.4 Document Endpoints
- GET /api/workspaces/:workspaceId/documents
- POST /api/workspaces/:workspaceId/documents
- GET /api/documents/:documentId
- PATCH /api/documents/:documentId
- DELETE /api/documents/:documentId
- POST /api/documents/:documentId/duplicate
- PATCH /api/documents/:documentId/share
- POST /api/documents/:documentId/access

#### 6.5 Folder Endpoints
- GET /api/workspaces/:workspaceId/folders
- POST /api/workspaces/:workspaceId/folders
- PATCH /api/folders/:folderId
- DELETE /api/folders/:folderId

#### 6.6 Member Management Endpoints
- GET /api/workspaces/:workspaceId/members
- DELETE /api/workspaces/:workspaceId/members/:userId

#### 6.7 Search Endpoints
- GET /api/search

#### 6.8 Presence Endpoints
- POST /api/presence/:documentId
- GET /api/presence/:documentId

#### 6.9 Error Responses & Status Codes

### 7. Sync Worker Architecture

#### 7.1 Cloudflare Durable Objects
- TLSyncDurableObject implementation
- One instance per document pattern
- WebSocket connection management

#### 7.2 Worker Entry Point
- Request routing
- Session validation
- CORS handling
- WebSocket upgrade flow

#### 7.3 Permission Validation in Worker
- Connection authorization flow
- Permission check logic
- Read vs write access
- Guest vs member handling

#### 7.4 R2 Snapshot Strategy
- Snapshot frequency
- Snapshot path structure
- Snapshot metadata
- Backup and retention

#### 7.5 Integration with Supabase
- Service role key usage
- Permission queries
- Metadata updates

### 8. Frontend Architecture

#### 8.1 Route Structure
- Public routes (/, /login, /signup, etc.)
- Authenticated routes (/dashboard, /workspace/*, /d/*)
- Route guards and middleware

#### 8.2 Component Structure
- Layout components
- Workspace components
- Document components
- Folder components
- Search components
- Shared/common components

#### 8.3 State Management
- React Context providers
- Server state (React Query)
- Local state patterns
- Form state management

#### 8.4 Real-Time Updates
- Supabase Realtime subscriptions
- Channel strategy
- Optimistic updates
- Conflict resolution

#### 8.5 tldraw Canvas Integration
- Editor initialization
- Permission enforcement in canvas
- Custom UI components
- Tool configuration

### 9. Real-Time Collaboration

#### 9.1 Canvas Sync (tldraw sync)
- WebSocket connection to worker
- State synchronization
- Conflict resolution
- Offline behavior

#### 9.2 Presence System
- Supabase Realtime presence
- Document-level presence
- User cursor tracking
- Active user indicators

#### 9.3 Application Data Sync
- Document list updates
- Workspace changes
- Folder structure updates
- Permission changes

#### 9.4 Channel Separation Strategy
- Canvas channel (high frequency)
- App data channel (lower frequency)
- Presence channel

### 10. Performance & Optimization

#### 10.1 Database Query Optimization
- Efficient joins
- Batch queries
- Pagination strategy
- Index usage

#### 10.2 Caching Strategy
- Application-level cache
- Cache TTL
- Cache invalidation triggers
- Cache key patterns

#### 10.3 Real-Time Channel Optimization
- Subscribe/unsubscribe patterns
- Channel cleanup
- Connection pooling

#### 10.4 Frontend Performance
- Code splitting
- Lazy loading
- Virtual scrolling
- Debouncing/throttling

#### 10.5 R2 Optimization
- Snapshot compression
- Retention policies
- Access patterns

### 11. Security Considerations

#### 11.1 Authentication Security
- Session management
- Cookie security
- CSRF protection
- Password policies

#### 11.2 Authorization Defense in Depth
- Multi-layer security
- RLS as final boundary
- Worker permission checks

#### 11.3 Input Validation
- Server-side validation
- Schema validation (Zod)
- SQL injection prevention
- XSS prevention

#### 11.4 Rate Limiting
- Per-user limits
- Per-endpoint limits
- Invitation link limits
- DDoS protection

#### 11.5 Data Privacy
- Email privacy (never show to other users)
- Guest data handling
- Soft delete implications

### 12. Testing Strategy

#### 12.1 End-to-End Testing with Playwright
- Test environment setup
- Test data management
- Cleanup strategy

#### 12.2 Critical Test Flows
- Authentication flows
- Workspace management
- Document operations
- Folder hierarchy
- Real-time collaboration
- Permission enforcement
- Search functionality

#### 12.3 Multiplayer Testing
- Multiple browser contexts
- Concurrent editing scenarios
- Presence verification

#### 12.4 Performance Benchmarks
- Target metrics
- Load time goals
- Sync latency goals
- Measurement approach

#### 12.5 Test Data Seeding
- Seed scripts
- Fixture management
- Isolation strategies

### 13. Deployment Architecture

#### 13.1 Environment Setup
- Development environment
- Staging environment
- Production environment

#### 13.2 Next.js App Deployment (Vercel)
- Build configuration
- Environment variables
- Domain setup

#### 13.3 Cloudflare Worker Deployment
- Wrangler configuration
- Durable Objects setup
- R2 bucket configuration
- Secrets management

#### 13.4 Supabase Configuration
- Project setup
- Migration strategy
- RLS enablement
- Realtime configuration
- Extension setup (pg_trgm)

#### 13.5 CI/CD Pipeline
- Build steps
- Test execution
- Deployment triggers
- Rollback strategy

### 14. Implementation Phases

#### Phase 1: Foundation
- Monorepo setup
- Auth implementation
- Basic database schema

#### Phase 2: Workspace & Document Core
- Workspace CRUD
- Document CRUD
- Basic tldraw integration

#### Phase 3: Organization & Folders
- Folder system
- Hierarchy validation
- Drag-and-drop

#### Phase 4: Real-Time Sync
- Sync worker integration
- Presence system
- Real-time updates

#### Phase 5: Permissions & Sharing
- Document sharing
- Guest access
- Archive/restore

#### Phase 6: Search & Polish
- Search implementation
- Error handling
- Performance optimization

#### Phase 7: Testing & Launch
- E2E tests
- Performance testing
- Production deployment

### 15. Edge Cases & User Scenarios

#### 15.1 Invitation Flow Edge Cases
- Unauthenticated user clicks invite
- Disabled invitation link
- Regenerated invitation link
- Already a member

#### 15.2 Document Sharing Edge Cases
- Document made private while guests editing
- Workspace deleted while guests viewing document
- Document moved while being edited

#### 15.3 Workspace Management Edge Cases
- Owner tries to leave (must transfer first)
- Last member leaves workspace
- Transfer ownership scenarios

#### 15.4 Folder Operations Edge Cases
- Cycle prevention validation
- Max depth exceeded
- Move folder with many descendants
- Delete folder with contents

#### 15.5 Offline & Connection Issues
- Network interruption during edit
- Worker downtime
- Supabase connection loss
- Recovery strategies

### 16. Open Questions & Design Decisions

#### 16.1 Resolved Questions
- List of decisions already made

#### 16.2 Pending Decisions
- Folder deletion behavior (cascade vs prevent)
- Document duplication scope
- Workspace deletion retention
- Rate limiting specifics
- Recent documents UI placement

#### 16.3 Technical Risks
- Better Auth integration complexity
- Cloudflare Worker scalability
- Supabase rate limits
- R2 storage costs
- Folder hierarchy performance

### 17. Success Metrics

#### 17.1 MVP Launch Criteria
- Functional requirements checklist
- Performance requirements
- Security requirements
- Documentation requirements

#### 17.2 Post-Launch Metrics
- Usage metrics (DAU, documents created, etc.)
- Performance metrics (latencies, error rates)
- Business metrics (retention, conversion)

### 18. Reference Implementations

#### 18.1 Code to Leverage from apps/dotcom
- Auth patterns
- Sync worker architecture
- Supabase integration
- Error handling

#### 18.2 Code to Leverage from Templates
- Basic tldraw setup
- Canvas initialization

#### 18.3 Key Files to Reference
- Specific file paths from dotcom
- Migration examples

### 19. Appendix

#### 19.1 Glossary
- Key terms and definitions

#### 19.2 Workspace Permissions Matrix
- Full permissions table (from product.md)

#### 19.3 Route Map
- Complete site map with roles

#### 19.4 Additional Resources
- Links to external documentation

---

**Document Status**: Outline Draft - Awaiting Review
**Next Steps**: Review outline, then expand each section with detailed content
