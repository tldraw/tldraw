import {
	atom,
	computed,
	createCachedUserResolve,
	createUserId,
	Tldraw,
	TldrawUiButton,
	TLNoteShape,
	TLShape,
	TLUser,
	TLUserStore,
	useEditor,
	UserRecordType,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './attribution.css'

// There's a guide at the bottom of this file!

// [1]
const usersAtom = atom<Record<string, TLUser>>('users', {
	[createUserId('alice')]: UserRecordType.create({
		id: createUserId('alice'),
		name: 'Alice',
		color: '#e03131',
	}),
	[createUserId('bob')]: UserRecordType.create({
		id: createUserId('bob'),
		name: 'Bob',
		color: '#1971c2',
	}),
	[createUserId('carol')]: UserRecordType.create({
		id: createUserId('carol'),
		name: 'Carol',
		color: '#2f9e44',
	}),
})

const currentUserIdAtom = atom('currentUserId', createUserId('alice'))

// [2]
const currentUserSignal = computed('currentUser', () => {
	return usersAtom.get()[currentUserIdAtom.get()] ?? null
})

const users: TLUserStore = {
	currentUser: currentUserSignal,
	resolve: createCachedUserResolve((userId) => usersAtom.get()[createUserId(userId)] ?? null),
}

// [3]
function UserSwitcher() {
	const allUsers = useValue(usersAtom)
	const activeUserId = useValue(currentUserIdAtom)
	const activeUser = allUsers[activeUserId]

	return (
		<div className="tlui-menu attribution-controls">
			{Object.values(allUsers).map((user) => (
				<TldrawUiButton
					key={user.id}
					type={activeUserId === user.id ? 'primary' : 'normal'}
					onClick={() => currentUserIdAtom.set(user.id)}
				>
					<span className="attribution-dot" style={{ backgroundColor: user.color }} />
					{user.name}
				</TldrawUiButton>
			))}
			{activeUser && (
				<input
					className="attribution-name-input"
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

	const currentUser = useValue('current-user', () => editor.store.props.users.currentUser.get(), [
		editor,
	])

	return (
		<div className="attribution-panel">
			<div className="attribution-section">
				<div className="attribution-section-title">Current user</div>
				<div className="attribution-row">
					<span className="attribution-label">Name</span>
					<span style={{ color: currentUser?.color }}>{currentUser?.name || '—'}</span>
				</div>
				<div className="attribution-row">
					<span className="attribution-label">ID</span>
					<span className="attribution-value">{currentUser?.id ?? '(anonymous)'}</span>
				</div>
			</div>
			{info ? (
				<div className="attribution-section">
					<div className="attribution-section-title">Selected shape</div>
					<div className="attribution-row">
						<span className="attribution-label">Type</span>
						<span>{info.type}</span>
					</div>
					{info.textFirstEditedByName && (
						<div className="attribution-row">
							<span className="attribution-label">Text first edited by</span>
							<span style={{ color: info.textFirstEditedByColor }}>
								{info.textFirstEditedByName}
							</span>
						</div>
					)}
				</div>
			) : (
				<div className="attribution-hint">Select a shape to see its attribution</div>
			)}
		</div>
	)
}

// [5]
function attributionSummary(editor: { store: { props: { users: TLUserStore } } }, shape: TLShape) {
	const noteProps = shape.type === 'note' ? (shape as TLNoteShape).props : null
	const textFirstEditedBy = noteProps?.textFirstEditedBy ?? null
	const textFirstEditedByUser = textFirstEditedBy
		? (editor.store.props.users.resolve?.(textFirstEditedBy).get() ?? null)
		: null

	return {
		type: shape.type,
		textFirstEditedByName: textFirstEditedByUser?.name ?? null,
		textFirstEditedByColor: textFirstEditedByUser?.color,
	}
}

// [6]
export default function AttributionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="attribution-example"
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
and color. Because it's an atom, changes (like renaming a user) automatically
propagate to anything reading from the TLUserStore.

[2]
The custom TLUserStore. `currentUser` and `resolve` return reactive Signals
derived from the atoms — any computed or useValue that reads `.get()` on these
signals will re-evaluate when the underlying data changes.

[3]
The top panel lets you switch which user is "logged in" and edit the active
user's name. Try drawing a shape as Alice, then renaming her — the attribution
panel updates live. Switch to Bob and create a note with text to see
"Text first edited by" appear.

[4]
The panel reads `editor.store.props.users.currentUser.get()` to show who is
active, and reads shape-specific props (like `textFirstEditedBy` on notes) for
per-shape attribution. Each attribution field is a user ID string — we call
`resolve(userId).get()` to get live display data.

[5]
Extracts attribution info from a shape. Note shapes have a `textFirstEditedBy`
prop that tracks who first edited the note text.

[6]
We pass the custom user store as the `users` prop on the Tldraw component.
The TopPanel shows the user-switcher with name editing, and the SharePanel
shows the attribution inspector.
*/
