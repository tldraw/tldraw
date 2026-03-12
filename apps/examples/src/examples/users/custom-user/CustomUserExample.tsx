import {
	atom,
	createUserId,
	Tldraw,
	TldrawUiButton,
	TLUser,
	TLUserStore,
	useEditor,
	UserRecordType,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-user.css'

// There's a guide at the bottom of this file!

// [1]
interface CustomUserMeta {
	isAdmin: boolean
	department: string
}

function asCustomMeta(user: TLUser | null): CustomUserMeta | null {
	if (!user) return null
	return user.meta as unknown as CustomUserMeta
}

// [2]
const usersAtom = atom<Record<string, TLUser>>('users', {
	[createUserId('alice')]: UserRecordType.create({
		id: createUserId('alice'),
		name: 'Alice',
		color: '#e03131',
		meta: { isAdmin: true, department: 'Engineering' },
	}),
	[createUserId('bob')]: UserRecordType.create({
		id: createUserId('bob'),
		name: 'Bob',
		color: '#1971c2',
		meta: { isAdmin: false, department: 'Design' },
	}),
	[createUserId('carol')]: UserRecordType.create({
		id: createUserId('carol'),
		name: 'Carol',
		color: '#2f9e44',
		meta: { isAdmin: false, department: 'Product' },
	}),
})

const currentUserIdAtom = atom('currentUserId', createUserId('alice'))

// [3]
const users: TLUserStore = {
	getCurrentUser() {
		return usersAtom.get()[currentUserIdAtom.get()] ?? null
	},
	resolve(userId: string) {
		return usersAtom.get()[createUserId(userId)] ?? null
	},
}

// [4]
function UserSwitcher() {
	const allUsers = useValue(usersAtom)
	const activeUserId = useValue(currentUserIdAtom)

	return (
		<div className="tlui-menu custom-user-controls">
			{Object.values(allUsers).map((user) => (
				<TldrawUiButton
					key={user.id}
					type={activeUserId === user.id ? 'primary' : 'normal'}
					onClick={() => currentUserIdAtom.set(user.id)}
				>
					<span className="custom-user-dot" style={{ backgroundColor: user.color }} />
					{user.name}
				</TldrawUiButton>
			))}
		</div>
	)
}

// [5]
function CustomUserPanel() {
	const editor = useEditor()

	const currentUser = useValue('current-user', () => editor.store.props.users.getCurrentUser(), [
		editor,
	])
	const customMeta = asCustomMeta(currentUser)

	return (
		<div className="custom-user-panel">
			{currentUser && customMeta ? (
				<>
					<div className="custom-user-header">
						<span className="custom-user-dot-lg" style={{ backgroundColor: currentUser.color }} />
						<span className="custom-user-name">{currentUser.name}</span>
						{customMeta.isAdmin && <span className="custom-user-badge">Admin</span>}
					</div>
					<div className="custom-user-row">
						<span className="custom-user-label">Department</span>
						<span>{customMeta.department}</span>
					</div>
					<div className="custom-user-row">
						<span className="custom-user-label">Role</span>
						<span>{customMeta.isAdmin ? 'Administrator' : 'Member'}</span>
					</div>
				</>
			) : (
				<div className="custom-user-hint">No user selected</div>
			)}
		</div>
	)
}

// [6]
export default function CustomUserExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-user-example"
				users={users}
				components={{
					TopPanel: UserSwitcher,
					SharePanel: CustomUserPanel,
				}}
			/>
		</div>
	)
}

/*
[1]
Define a TypeScript interface for your custom user metadata. The TLUser
record's `meta` field is typed as JsonObject, which accepts any JSON-compatible
data. We define this interface for type safety and cast to it when reading.

For runtime validation of custom meta fields, pass validators to
createTLSchema:

    import { createTLSchema, T } from 'tldraw'

    const schema = createTLSchema({
      user: {
        meta: {
          isAdmin: T.boolean,
          department: T.string,
        },
      },
    })

[2]
A fake user directory stored in a reactive atom. Each user has custom metadata
in their `meta` object — `isAdmin` and `department`. In a real app this data
would come from your authentication system or user service.

[3]
The custom TLUserStore. `getCurrentUser` and `resolve` both read from the
atoms, making them reactive — any computed or useValue that calls these
functions will re-evaluate when the underlying data changes.

[4]
The top panel lets you switch which user is "logged in". Each button shows
the user's color dot and name.

[5]
The side panel reads the current user and displays both standard fields
(name, color) and custom metadata (department, admin badge). Because everything
reads from reactive atoms, switching users updates the panel immediately.

[6]
We pass the user store to Tldraw via the `users` prop. Custom metadata flows
through the same TLUser records the editor already manages — no extra wiring
needed.
*/
