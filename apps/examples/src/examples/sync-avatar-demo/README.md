---
title: Multiplayer sync with user avatars
component: ./SyncAvatarDemoExample.tsx
category: collaboration
priority: 4
keywords: [avatar, user, profile, image, multiplayer, sync, collaboration, presence, people]
multiplayer: true
---

Demonstrate avatar integration with tldraw's synchronization system.

---

# Sync Avatar Demo

This example demonstrates how to integrate user avatars with tldraw's synchronization system. Each user gets a randomly assigned avatar from Pravatar.cc, and avatars are displayed in the share panel and synchronized across all connected users in real-time.

## Key Features

- **Random Avatar Assignment**: Users automatically get a random avatar when they join
- **Large Avatar Display**: Uses a custom SharePanel with large avatar display
- **Real-time Synchronization**: Avatars are synchronized across all connected users
- **Multiple Avatar Sources**: Uses Pravatar.cc for diverse avatar options

## How It Works

1. **Avatar Generation**: When a user joins, they're assigned a random avatar from a predefined set of Pravatar.cc URLs
2. **User Preferences**: The avatar is stored as part of the user preferences along with name and color
3. **Sync Integration**: The avatar data is included in the sync system's user info
4. **UI Display**: The custom SharePanel component displays avatars in large size for better visibility

## Code Structure

- `generateRandomUser()`: Creates a user with random avatar, name, and other preferences
- `components`: Custom UI components including the SharePanel with large avatars
- `useSyncDemo()`: Handles multiplayer synchronization with avatar support
- `useTldrawUser()`: Manages user state and preferences updates

## Testing the Example

1. Open the example in your browser
2. Open the same URL in multiple browser windows or tabs
3. Each window will show a different user with a unique avatar
4. Observe how avatars appear in the people menu/share panel
5. All users should see each other's avatars in real-time

## Avatar Sources

This example uses Pravatar.cc, which provides placeholder avatars. In a production application, you might want to:

- Use actual user profile pictures
- Integrate with authentication systems
- Provide avatar upload functionality
- Cache avatar images for better performance

## Related Examples

- `sync-custom-user`: Shows basic user customization
- `sync-custom-people-menu`: Demonstrates custom people menu UI
- `user-presence`: Basic user presence without avatars
