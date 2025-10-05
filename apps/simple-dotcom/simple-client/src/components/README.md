# Shared Component Library

This directory contains reusable UI components for the Simple Dotcom application. Components are organized by domain and follow consistent patterns for styling, accessibility, and interaction.

## Component Categories

### Documents (`/documents`)
- **DocumentListItem**: List view for documents with metadata and actions
- **DocumentCard**: Card/grid view for documents with thumbnail area
- **DocumentActions**: Dropdown menu with document-specific actions (rename, duplicate, archive, delete)
- **EmptyDocumentList**: Empty state for when no documents exist

### Folders (`/folders`)
- **FolderListItem**: Individual folder display with expand/collapse
- **FolderTree**: Hierarchical folder browser with nested structure
- **FolderBreadcrumbs**: Breadcrumb navigation for folder hierarchy
- **FolderActions**: Dropdown menu with folder-specific actions
- **EmptyFolderTree**: Empty state for when no folders exist

### Users (`/users`)
- **UserAvatar**: Avatar display with initials or image
- **UserBadge**: User name with avatar and optional role badge
- **formatUserDisplayName**: Utility to safely format user names (NEVER shows emails)
- **getUserInitials**: Extract initials from user name
- **getUserAvatarColor**: Generate consistent color based on user ID

### Shared (`/shared`)
- **EmptyState**: Reusable empty state with icon, title, description, and CTA
- **ActionMenu**: Dropdown menu component for contextual actions

## Usage Examples

### Document List
```tsx
import { DocumentListItem } from '@/components'

<DocumentListItem
  document={doc}
  onClick={() => router.push(`/d/${doc.id}`)}
  onRename={(name) => updateDocument(doc.id, { name })}
  onArchive={() => archiveDocument(doc.id)}
  canEdit={isWorkspaceMember}
  canDelete={isWorkspaceOwner}
/>
```

### User Display (CRITICAL)
```tsx
import { formatUserDisplayName, UserBadge } from '@/components'

// NEVER show raw email addresses
const displayName = formatUserDisplayName(user) // Safe display name

<UserBadge
  user={user}
  role={member.role}
  showAvatar={true}
/>
```

### Folder Navigation
```tsx
import { FolderTree, FolderBreadcrumbs } from '@/components'

<FolderBreadcrumbs
  folders={allFolders}
  currentFolderId={selectedFolder?.id}
  onFolderClick={setSelectedFolder}
/>

<FolderTree
  folders={allFolders}
  onFolderClick={navigateToFolder}
  canEdit={canEditWorkspace}
  canDelete={isOwner}
/>
```

### Empty States
```tsx
import { EmptyDocumentList, EmptyFolderTree } from '@/components'

{documents.length === 0 ? (
  <EmptyDocumentList
    onCreateDocument={handleCreateDocument}
    canCreate={canEdit}
  />
) : (
  <DocumentList documents={documents} />
)}
```

## Design Principles

1. **Accessibility First**
   - Keyboard navigation support
   - ARIA labels and roles
   - Focus management
   - Screen reader friendly

2. **Consistent Styling**
   - Tailwind CSS classes
   - Dark mode support
   - Responsive design
   - Hover/focus states

3. **Permission Aware**
   - Components accept `canEdit` and `canDelete` props
   - Actions are conditionally rendered based on permissions
   - Never expose data in DOM that user shouldn't see

4. **User Privacy**
   - **CRITICAL**: Never display raw email addresses
   - Always use `formatUserDisplayName()` utility
   - Fall back to "User {id}" if no display name

## Future Enhancements

- Add virtualization for long lists (when >100 items)
- Implement drag-and-drop for document/folder reordering
- Add skeleton loading states
- Consider Storybook for component documentation
- Add comprehensive unit tests

## Notes

- Components use client-side rendering (`'use client'`)
- No external UI library dependencies (pure React + Tailwind)
- Action menus use native browser prompts for simplicity (can upgrade to modals later)
- Components are optimized for the MVP scope