import {
	atom,
	computed,
	createCachedUserResolve,
	createUserId,
	TLComponents,
	Tldraw,
	TLNoteShapeAttributionProps,
	TLUser,
	TLUserStore,
	UserRecordType,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const currentUser = UserRecordType.create({
	id: createUserId('alice'),
	name: 'Alice Mertnet',
	color: '#e03131',
})

const usersAtom = atom<Record<string, TLUser>>('users', { [currentUser.id]: currentUser })

const users: TLUserStore = {
	currentUser: computed('currentUser', () => usersAtom.get()[currentUser.id] ?? null),
	resolve: createCachedUserResolve((userId) => usersAtom.get()[createUserId(userId)] ?? null),
}

// [2]
function NoteAttribution({ firstName, color }: TLNoteShapeAttributionProps) {
	return (
		<div
			className="tl-note__attribution"
			style={{
				fontSize: 11,
				fontWeight: 600,
				color,
				display: 'flex',
				alignItems: 'center',
				gap: 2,
			}}
		>
			<span aria-hidden>✍️</span>
			{firstName}
		</div>
	)
}

// [3]
const components: TLComponents = {
	NoteShapeAttribution: NoteAttribution,
	// To hide the attribution badge entirely, set it to null instead:
	// NoteShapeAttribution: null,
}

export default function NoteAttributionComponentExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="note-attribution-component" users={users} components={components} />
		</div>
	)
}

/*
[1]
The attribution badge only appears once a note knows who first edited its text.
We provide a minimal custom `TLUserStore` with a single signed-in user so the
note shape has a display name to attribute. In a real app this comes from your
auth system or multiplayer presence.

[2]
`NoteShapeAttribution` is the replaceable component that renders the badge in the
corner of a note. It receives the resolved `name`/`firstName`, the note's label
`color`, the `shape`, and a `variant` ('canvas' or 'export'). Here we render a
custom badge — the same component is used both on the canvas and in image exports.

[3]
Pass the override through the `components` prop. Setting `NoteShapeAttribution`
to `null` hides the badge instead. Create a note and type into it to see the
custom attribution appear.
*/
