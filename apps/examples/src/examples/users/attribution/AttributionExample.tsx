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
					{info.createdByName && (
						<div className="attribution-row">
							<span className="attribution-label">Created by</span>
							<span style={{ color: info.createdByColor }}>{info.createdByName}</span>
						</div>
					)}
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
	const createdBy = typeof shape.meta.createdBy === 'string' ? shape.meta.createdBy : null
	const createdByUser = createdBy
		? (editor.store.props.users.resolve?.(createdBy).get() ?? null)
		: null

	const noteProps = shape.type === 'note' ? (shape as TLNoteShape).props : null
	const textFirstEditedBy = noteProps?.textFirstEditedBy ?? null
	const textFirstEditedByUser = textFirstEditedBy
		? (editor.store.props.users.resolve?.(textFirstEditedBy).get() ?? null)
		: null

	return {
		type: shape.type,
		createdByName: createdByUser?.name ?? null,
		createdByColor: createdByUser?.color,
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
				onMount={(editor) => {
					const stampWithCurrentUser = (shape: TLShape) => {
						if (typeof shape.meta.createdBy === 'string') return shape
						const userId = editor.getAttributionUserId()
						if (!userId) return shape
						return { ...shape, meta: { ...shape.meta, createdBy: userId } }
					}

					const toBackfill = editor
						.getCurrentPageShapes()
						.filter((s) => typeof s.meta.createdBy !== 'string')
						.map(stampWithCurrentUser)
					if (toBackfill.length) {
						editor.run(() => editor.updateShapes(toBackfill), { history: 'ignore' })
					}

					editor.sideEffects.registerBeforeCreateHandler('shape', stampWithCurrentUser)
				}}
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
panel updates live. Switch to Bob, create a note with text, and you'll also
see the built-in "Text first edited by" appear.

[4]
The panel reads `editor.store.props.users.currentUser.get()` to show who is
active, and resolves both `meta.createdBy` (set by our own side effect) and
`textFirstEditedBy` (built-in on notes) for the selected shape. Each attribution
field is a user id string — we call `resolve(userId).get()` to get live display
data, so renames flow through automatically.

[5]
Extracts attribution info from a shape. We read `meta.createdBy` for any
shape, and additionally read the built-in `textFirstEditedBy` prop for note
shapes.

[6]
We pass the custom user store as the `users` prop on the Tldraw component,
and use a `beforeCreate` side effect to stamp the current user's id onto
every new shape's `meta.createdBy`. Storing attribution in `meta` keeps the
data with the shape and lets you attribute any shape type, not just notes.
*/
