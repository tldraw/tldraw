import { useSyncDemo } from '@tldraw/sync'
import { useState } from 'react'
import { DefaultSharePanel, TLUserPreferences, Tldraw, useTldrawUser } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const avatarUrls = [
	'https://i.pravatar.cc/150?img=1',
	'https://i.pravatar.cc/150?img=2',
	'https://i.pravatar.cc/150?img=3',
	'https://i.pravatar.cc/150?img=4',
	'https://i.pravatar.cc/150?img=5',
	'https://i.pravatar.cc/150?img=6',
	'https://i.pravatar.cc/150?img=7',
	'https://i.pravatar.cc/150?img=8',
	'https://i.pravatar.cc/150?img=9',
	'https://i.pravatar.cc/150?img=10',
]

// [2]
function generateRandomUser(): TLUserPreferences {
	const randomAvatarIndex = Math.floor(Math.random() * avatarUrls.length)
	const randomUserId = Math.floor(Math.random() * 1000)

	return {
		id: 'user-' + Math.random(),
		name: `User ${randomUserId}`,
		avatar: avatarUrls[randomAvatarIndex],
		color: 'palevioletred',
		colorScheme: 'light',
	}
}

// [3]
const components = {
	SharePanel: () => <DefaultSharePanel avatarSize="lg" />,
}

export default function SyncAvatarDemoExample({ roomId }: { roomId: string }) {
	// [4]
	const [userPreferences, setUserPreferences] = useState<TLUserPreferences>(generateRandomUser())

	// [5]
	const store = useSyncDemo({ roomId, userInfo: userPreferences })

	// [6]
	const user = useTldrawUser({ userPreferences, setUserPreferences })

	// [7]
	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				user={user}
				components={components}
				deepLinks
			/>
		</div>
	)
}

/**
 * # Sync Avatar Demo
 *
 * This example demonstrates how to use avatars with the sync system.
 * Each user gets a random avatar from Pravatar.cc when they join.
 *
 * Key features demonstrated:
 * - Random avatar assignment using Pravatar.cc
 * - Custom SharePanel with large avatar display
 * - Avatar synchronization across multiple users
 * - Integration with the sync demo system
 *
 * How it works:
 *
 * 1. We define an array of avatar URLs from Pravatar.cc for variety
 * 2. The `generateRandomUser` function creates a user with a random avatar and name
 * 3. We customize the SharePanel component to use large avatars
 * 4. User preferences are initialized with avatar data on component mount
 * 5. The sync demo store handles multiplayer synchronization including avatar data
 * 6. We use the `useTldrawUser` hook to manage user state updates
 * 7. The Tldraw component renders with avatar support enabled
 *
 * Open this example in multiple browser windows to see avatars synchronized
 * between different users in real-time.
 */