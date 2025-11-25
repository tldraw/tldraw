import { useSyncDemo } from '@tldraw/sync'
import { Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './sync-custom-people-menu.css'

// [1]
const components = {
	SharePanel: () => (
		<div className="tlui-share-zone" draggable={false}>
			<CustomPeopleMenu />
		</div>
	),
}

// [2]
export default function SyncCustomPeopleMenuExample({ roomId }: { roomId: string }) {
	const store = useSyncDemo({ roomId })
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} deepLinks components={components} />
		</div>
	)
}

// [3]
function CustomPeopleMenu() {
	const editor = useEditor()

	// [a]
	const myUserColor = useValue('user', () => editor.user.getColor(), [editor])
	const myUserName = useValue('user', () => editor.user.getName() || 'Guest', [editor])
	const myUserId = useValue('user', () => editor.user.getId(), [editor])

	// [b]
	const allOtherPresences = useValue('presences', () => editor.getCollaborators(), [editor])

	return (
		<div className="custom-people-menu">
			{/* [c] */}
			<div className="user-section">
				<h4 className="section-title">Me</h4>
				<div className="user-info">
					<div className="user-avatar" style={{ background: myUserColor }} />
					<span className="user-name" style={{ color: myUserColor }}>
						{myUserName}, ID: {myUserId}
					</span>
				</div>
			</div>

			{/* [d] */}
			{allOtherPresences.length > 0 && (
				<div className="other-users-section">
					<h4 className="section-title">Other connected users:</h4>
					<div className="other-users-list">
						{allOtherPresences.map(({ userId, userName, color, cursor }) => (
							<div key={userId} className="other-user-item">
								<div className="other-user-avatar" style={{ background: color }} />
								<span className="other-user-name" style={{ color: color }}>
									{userName || `ID: ${userId}`}
								</span>
								<span className="cursor-info">
									Cursor
									<br />
									{cursor && Number.isFinite(cursor.x) && Number.isFinite(cursor.y)
										? `(${Math.round(cursor.x)}, ${Math.round(cursor.y)})`
										: 'cursor data unavailable'}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

/*
[1]
We define custom components to override tldraw's default UI. Here we're replacing the SharePanel with our own CustomPeopleMenu component.

[2]
This is the main component that sets up a synced tldraw editor. It uses the useSyncDemo hook to create a multiplayer store and passes our custom components to replace the default UI elements.

[3]
The CustomPeopleMenu component displays information about all connected users. It uses tldraw's collaboration hooks to access real-time presence data. You can do whatever you like in here, see the TLInstancePresence interface to see what informatino you have access to.

	[a]
	We use the useValue hook to reactively get the current user's information (color, name, and ID). These values will automatically update if the user changes their name or the system assigns a new color (note: the examlpe doesn't allow for name changing).

	[b]
	We get the live presence of all other users information using the editor's getCollaborators() method. We need to call getCollaborators() in a useValue hook in order for the presence info to be reactive.

	[c]
	Display the current user's information with their color indicator and name. We show both the display name and the internal user ID for debugging purposes.

	[d]
	For each connected collaborator, we display their name (or ID if no name is set), their color indicator, and their current cursor position.
*/
