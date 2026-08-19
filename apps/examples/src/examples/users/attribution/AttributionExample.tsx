import {
	atom,
	computed,
	createCachedUserResolve,
	createUserId,
	Editor,
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

	const currentUser = useValue(editor.store.props.users.currentUser)

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
					{info.textLastEditedByName && (
						<div className="attribution-row">
							<span className="attribution-label">Text last edited by</span>
							<span style={{ color: info.textLastEditedByColor }}>{info.textLastEditedByName}</span>
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
function attributionSummary(editor: Editor, shape: TLShape) {
	const createdBy = typeof shape.meta.createdBy === 'string' ? shape.meta.createdBy : null
	const createdByUser = createdBy
		? (editor.store.props.users.resolve?.(createdBy).get() ?? null)
		: null

	const noteProps = shape.type === 'note' ? (shape as TLNoteShape).props : null
	const textLastEditedBy = noteProps?.textLastEditedBy ?? null
	const textLastEditedByUser = textLastEditedBy
		? (editor.store.props.users.resolve?.(textLastEditedBy).get() ?? null)
		: null

	return {
		type: shape.type,
		createdByName: createdByUser?.name ?? null,
		createdByColor: createdByUser?.color,
		textLastEditedByName: textLastEditedByUser?.name ?? null,
		textLastEditedByColor: textLastEditedByUser?.color,
	}
}

const components = {
	TopPanel: UserSwitcher,
	SharePanel: AttributionPanel,
}

// [6]
function handleMount(editor: Editor) {
	const stampWithCurrentUser = (shape: TLShape) => {
		if (typeof shape.meta.createdBy === 'string') return shape
		const userId = editor.getAttributionUserId()
		if (!userId) return shape
		return { ...shape, meta: { ...shape.meta, createdBy: userId } }
	}

	// Shapes persisted before this example started stamping get attributed to whoever is
	// current on load, without polluting the undo stack
	const toBackfill = editor
		.getCurrentPageShapes()
		.filter((s) => typeof s.meta.createdBy !== 'string')
		.map(stampWithCurrentUser)
	if (toBackfill.length) {
		editor.run(() => editor.updateShapes(toBackfill), { history: 'ignore' })
	}

	editor.sideEffects.registerBeforeCreateHandler('shape', stampWithCurrentUser)
}

export default function AttributionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="attribution-example"
				users={users}
				onMount={handleMount}
				components={components}
			/>
		</div>
	)
}

/*
[1]
A fake user directory in a reactive atom. In a real app this would be backed by your
auth system. Because it's an atom, changes (like renaming a user) propagate to anything
reading through the `TLUserStore`.

[2]
The `TLUserStore`. `currentUser` and `resolve` are signals, so `useValue` and computeds
that read them re-evaluate when the underlying data changes. `createCachedUserResolve`
returns the same signal for repeated lookups of the same id, which the editor relies on
to avoid recomputation.

[3]
Switch which user is "logged in" and edit the active user's name. Draw a shape as Alice,
rename her, and the attribution panel updates live. Switch to Bob and edit a note's text
to see the built-in "Text last edited by" appear.

[4]
The panel shows the current user and, for the selected shape, resolves `meta.createdBy`
(set by our side effect) and `textLastEditedBy` (built into note shapes). Both are user
id strings; `resolve(userId).get()` turns them into live display data.

[5]
Read `meta.createdBy` for any shape, plus the built-in `textLastEditedBy` prop on notes.

[6]
`editor.getAttributionUserId()` returns the current user's id (and makes sure a `user:`
record exists for them). A `beforeCreate` side effect stamps it onto every new shape's
`meta.createdBy`, which lets you attribute any shape type, not just notes.
*/
