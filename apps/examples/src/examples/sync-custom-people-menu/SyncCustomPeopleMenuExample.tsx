import { useSyncDemo } from '@tldraw/sync'
import { Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

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
	const myUserName = useValue('user', () => editor.user.getName(), [editor]) || 'Huppy'
	const myUserId = useValue('user', () => editor.user.getId(), [editor])

	// [b]
	const allOtherPresences = useValue('presences', () => editor.getCollaborators(), [editor])

	return (
		<div
			style={{
				background: '#f5f5f5',
				padding: 4,
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				width: 320,
			}}
		>
			{/* [c] */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<h4 style={{ margin: 0 }}>Me</h4>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						padding: '8px 12px',
						gap: 8,
					}}
				>
					<div
						style={{
							width: 16,
							height: 16,
							borderRadius: '50%',
							background: myUserColor,
							marginRight: 8,
						}}
					/>
					<span style={{ color: myUserColor }}>
						{myUserName}, ID: {myUserId}
					</span>
				</div>
			</div>

			{/* [d] */}
			{allOtherPresences.length > 0 && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<h4 style={{ margin: 0 }}>Other connected users:</h4>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						{allOtherPresences.map(({ userId, userName, color, cursor }) => (
							<div
								key={userId}
								style={{
									display: 'flex',
									alignItems: 'center',
									padding: '6px 12px',
									gap: 8,
								}}
							>
								<div
									style={{
										width: 16,
										height: 16,
										borderRadius: '50%',
										background: color,
										marginRight: 8,
									}}
								/>
								<span style={{ wordBreak: 'break-word', width: 170, color: color }}>
									{userName || `ID: ${userId}`}
								</span>
								<span style={{ width: 80, color: '#aaa', fontSize: 12, marginLeft: 8 }}>
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
