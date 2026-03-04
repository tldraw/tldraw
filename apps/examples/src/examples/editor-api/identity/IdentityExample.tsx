import { useState } from 'react'
import {
	Editor,
	Tldraw,
	TldrawUiButton,
	TLShape,
	TLShapeTLmeta,
	useEditor,
	useValue,
	type TLIdentityProvider,
	type TLIdentityUser,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './identity.css'

// There's a guide at the bottom of this file!

// [1]
const USERS: Record<string, TLIdentityUser> = {
	'user-alice': { id: 'user-alice', name: 'Alice', color: '#e03131' },
	'user-bob': { id: 'user-bob', name: 'Bob', color: '#1971c2' },
	'user-carol': { id: 'user-carol', name: 'Carol', color: '#2f9e44' },
}

let currentUserId = 'user-alice'

// [2]
const identity: TLIdentityProvider = {
	getCurrentUser() {
		return USERS[currentUserId] ?? null
	},
	resolveUser(userId: string) {
		return USERS[userId] ?? null
	},
}

// [3]
function UserSwitcher() {
	const [activeUserId, setActiveUserId] = useState(currentUserId)

	return (
		<div className="tlui-menu identity-controls">
			{Object.values(USERS).map((user) => (
				<TldrawUiButton
					key={user.id}
					type={activeUserId === user.id ? 'primary' : 'normal'}
					onClick={() => {
						currentUserId = user.id
						setActiveUserId(user.id)
					}}
				>
					<span className="identity-dot" style={{ backgroundColor: user.color }} />
					{user.name}
				</TldrawUiButton>
			))}
		</div>
	)
}

// [4]
function AttributionPanel() {
	const editor = useEditor()

	const info = useValue(
		'attribution-info',
		() => {
			const selected = editor.getOnlySelectedShape()
			if (!selected) return null
			return attributionSummary(editor, selected)
		},
		[editor]
	)

	const currentUser = useValue('current-user', () => editor.getIdentity().getCurrentUser(), [
		editor,
	])

	return (
		<div className="identity-panel">
			<div className="identity-section">
				<div className="identity-section-title">Current user</div>
				<div className="identity-row">
					<span className="identity-label">Name</span>
					<span style={{ color: currentUser?.color }}>{currentUser?.name ?? '—'}</span>
				</div>
				<div className="identity-row">
					<span className="identity-label">ID</span>
					<span className="identity-value">{currentUser?.id ?? '(anonymous)'}</span>
				</div>
			</div>
			{info ? (
				<div className="identity-section">
					<div className="identity-section-title">Selected shape</div>
					<div className="identity-row">
						<span className="identity-label">Type</span>
						<span>{info.type}</span>
					</div>
					<div className="identity-row">
						<span className="identity-label">Created by</span>
						<span style={{ color: info.createdByColor }}>{info.createdByName}</span>
					</div>
					<div className="identity-row">
						<span className="identity-label">Updated by</span>
						<span style={{ color: info.updatedByColor }}>{info.updatedByName}</span>
					</div>
					<div className="identity-row">
						<span className="identity-label">Created at</span>
						<span>{info.createdAt}</span>
					</div>
					<div className="identity-row">
						<span className="identity-label">Updated at</span>
						<span>{info.updatedAt}</span>
					</div>
				</div>
			) : (
				<div className="identity-hint">Select a shape to see its attribution</div>
			)}
		</div>
	)
}

function formatTime(ts: number | null) {
	if (!ts) return '—'
	return new Date(ts).toLocaleTimeString()
}

function attributionSummary(editor: Editor, shape: TLShape) {
	const { createdBy, updatedBy, createdAt, updatedAt }: TLShapeTLmeta = shape.tlmeta

	const createdByUser = createdBy ? editor.getIdentity().resolveUser(createdBy.id) : null
	const updatedByUser = updatedBy ? editor.getIdentity().resolveUser(updatedBy.id) : null

	return {
		type: shape.type,
		createdByName: createdByUser?.name ?? createdBy?.name ?? '(unknown)',
		createdByColor: createdByUser?.color,
		updatedByName: updatedByUser?.name ?? updatedBy?.name ?? '(unknown)',
		updatedByColor: updatedByUser?.color,
		createdAt: formatTime(createdAt),
		updatedAt: formatTime(updatedAt),
	}
}

// [5]
export default function IdentityExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="identity-example"
				identity={identity}
				components={{
					TopPanel: UserSwitcher,
					SharePanel: AttributionPanel,
				}}
			/>
		</div>
	)
}

/*
[1]
A fake user directory. In a real app this would be backed by your auth system
or user service. Each user has an id, display name, and optional color.

[2]
The custom TLIdentityProvider. `getCurrentUser` returns whoever is "logged in"
right now (controlled by the switcher buttons). `resolveUser` looks up any user
ID — the editor calls this when rendering attribution labels for shapes that
may have been created or edited by someone else.

[3]
Buttons that let you switch which user is "logged in". After switching, any new
shapes or edits will be attributed to the new user. Try drawing a shape as
Alice, switching to Bob, then moving the shape — the "Updated by" field will
change.

[4]
The panel reads `editor.getIdentity().getCurrentUser()` to show who is active, and
reads `shape.tlmeta` for the selected shape to display attribution info. Each
attribution field (`createdBy`, `updatedBy`) is a `{ id, name }` object — we try
`resolveUser(id)` for live data and fall back to the stored name.

[5]
We pass the custom identity provider via the `identity` prop. The TopPanel shows
the user-switcher and the SharePanel shows the attribution inspector.
*/
