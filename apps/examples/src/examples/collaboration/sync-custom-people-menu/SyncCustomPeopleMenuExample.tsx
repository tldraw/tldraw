import { useSyncDemo } from '@tldraw/sync'
import { TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './sync-custom-people-menu.css'

// [1]
const components: TLComponents = {
	SharePanel: () => (
		<div className="tlui-share-zone" draggable={false}>
			<CustomPeopleMenu />
		</div>
	),
}

export default function SyncCustomPeopleMenuExample({ roomId }: { roomId: string }) {
	const store = useSyncDemo({ roomId })
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} options={{ deepLinks: true }} components={components} />
		</div>
	)
}

function CustomPeopleMenu() {
	const editor = useEditor()

	// [2]
	const myUserColor = useValue('user color', () => editor.user.getColor(), [editor])
	const myUserName = useValue('user name', () => editor.user.getName() || 'Guest', [editor])
	const myUserId = useValue('user id', () => editor.user.getExternalId(), [editor])

	// [3]
	const collaborators = useValue('collaborators', () => editor.getCollaborators(), [editor])

	return (
		<div className="custom-people-menu">
			<div className="user-section">
				<h4 className="section-title">Me</h4>
				<div className="user-info">
					<div className="user-avatar" style={{ background: myUserColor }} />
					<span className="user-name" style={{ color: myUserColor }}>
						{myUserName}, ID: {myUserId}
					</span>
				</div>
			</div>

			{collaborators.length > 0 && (
				<div className="other-users-section">
					<h4 className="section-title">Other connected users</h4>
					<div className="other-users-list">
						{collaborators.map(({ userId, userName, color, cursor }) => (
							<div key={userId} className="other-user-item">
								<div className="other-user-avatar" style={{ background: color }} />
								<span className="other-user-name" style={{ color }}>
									{userName || `ID: ${userId}`}
								</span>
								<span className="cursor-info">
									Cursor
									<br />
									{cursor ? `(${Math.round(cursor.x)}, ${Math.round(cursor.y)})` : 'unavailable'}
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
Replace the `SharePanel` slot (the top-right area where the default people menu lives) with a
custom component. Wrapping it in `tlui-share-zone` keeps the default panel styling.

[2]
The current user's own details come from `editor.user`. Reading them inside `useValue` keeps them
reactive, so the panel updates if the name or color changes.

[3]
`editor.getCollaborators()` returns a `TLInstancePresence` record for every other connected user:
name, color, cursor, camera, selection, and more. It's reactive, so calling it inside `useValue`
re-renders the panel as people join, leave, or move their cursor.
*/
