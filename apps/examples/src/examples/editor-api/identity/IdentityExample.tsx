import {
	atom,
	Editor,
	getTldrawMetaFromShapeMeta,
	Tldraw,
	TldrawUiButton,
	TLShape,
	TLUser,
	TLUserStore,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './identity.css'

// There's a guide at the bottom of this file!

// [1]
const usersAtom = atom<Record<string, TLUser>>('users', {
	'user-alice': { id: 'user-alice', name: 'Alice', color: '#e03131', meta: {} },
	'user-bob': { id: 'user-bob', name: 'Bob', color: '#1971c2', meta: {} },
	'user-carol': { id: 'user-carol', name: 'Carol', color: '#2f9e44', meta: {} },
})

const currentUserIdAtom = atom('currentUserId', 'user-alice')

// [2]
const users: TLUserStore = {
	getCurrentUser() {
		return usersAtom.get()[currentUserIdAtom.get()] ?? null
	},
	resolve(userId: string) {
		return usersAtom.get()[userId] ?? null
	},
}

// [3]
function UserSwitcher() {
	const allUsers = useValue(usersAtom)
	const activeUserId = useValue(currentUserIdAtom)
	const activeUser = allUsers[activeUserId]

	return (
		<div className="tlui-menu identity-controls">
			{Object.values(allUsers).map((user) => (
				<TldrawUiButton
					key={user.id}
					type={activeUserId === user.id ? 'primary' : 'normal'}
					onClick={() => currentUserIdAtom.set(user.id)}
				>
					<span className="identity-dot" style={{ backgroundColor: user.color }} />
					{user.name}
				</TldrawUiButton>
			))}
			{activeUser && (
				<input
					className="identity-name-input"
					value={activeUser.name}
					onChange={(e) => {
						usersAtom.update((prev) => ({
							...prev,
							[activeUserId]: { ...prev[activeUserId], name: e.target.value },
						}))
					}}
					onPointerDown={(e) => e.stopPropagation()}
					placeholder="Edit name…"
				/>
			)}
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

	const currentUser = useValue('current-user', () => editor.store.props.users.getCurrentUser(), [
		editor,
	])

	return (
		<div className="identity-panel">
			<div className="identity-section">
				<div className="identity-section-title">Current user</div>
				<div className="identity-row">
					<span className="identity-label">Name</span>
					<span style={{ color: currentUser?.color }}>{currentUser?.name || '—'}</span>
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
	const { createdBy, updatedBy, createdAt, updatedAt } = getTldrawMetaFromShapeMeta(shape.meta)

	const createdByUser = createdBy ? editor.store.props.users.resolve(createdBy) : null
	const updatedByUser = updatedBy ? editor.store.props.users.resolve(updatedBy) : null

	return {
		type: shape.type,
		createdByName: createdByUser?.name ?? '(unknown)',
		createdByColor: createdByUser?.color,
		updatedByName: updatedByUser?.name ?? '(unknown)',
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
				users={users}
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
A fake user directory stored in a reactive atom. In a real app this would be
backed by your auth system or user service. Each user has an id, display name,
color, and a meta object for extra properties. Because it's an atom,
changes (like renaming a user) automatically propagate to anything reading
from the TLUserStore.

[2]
The custom TLUserStore. `getCurrentUser` and `resolve` both read from the
atoms, making them reactive — any computed or useValue that calls these
functions will re-evaluate when the underlying data changes.

[3]
The top panel lets you switch which user is "logged in" and edit the active
user's name. Try drawing a shape as Alice, then renaming her — the attribution
panel updates live. Switch to Bob and move the shape to see "Updated by"
change.

[4]
The panel reads `editor.store.props.users.getCurrentUser()` to show who is active,
and reads `shape.meta.__tldraw` for the selected shape to display attribution info.
Each attribution field (`createdBy`, `updatedBy`) is a user ID string — we call
`resolve(userId)` to get live display data. Because the user store reads from
atoms, renaming a user updates the resolved names everywhere reactively.

[5]
We pass the custom user store as the `users` prop on the Tldraw component.
The TopPanel shows the user-switcher with name editing, and the SharePanel
shows the attribution inspector.
*/
