import {
	atom,
	computed,
	createCachedUserResolve,
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
const currentUserSignal = computed('currentUser', () => {
	return usersAtom.get()[currentUserIdAtom.get()] ?? null
})

const users: TLUserStore = {
	currentUser: currentUserSignal,
	resolve: createCachedUserResolve((userId) => usersAtom.get()[createUserId(userId)] ?? null),
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

	const currentUser = useValue(editor.store.props.users.currentUser)
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

const components = {
	TopPanel: UserSwitcher,
	SharePanel: CustomUserPanel,
}

// [6]
export default function CustomUserExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="custom-user-example" users={users} components={components} />
		</div>
	)
}

/*
[1]
`TLUser.meta` is typed as `JsonObject`, so it accepts any JSON-compatible data. An
interface plus a cast on read gives you typed access. For runtime validation, pass
validators to `createTLSchema` (see the README).

[2]
A fake user directory in a reactive atom, with `isAdmin` and `department` in each
user's `meta`. In a real app this would come from your auth system.

[3]
The `TLUserStore`. `currentUser` and `resolve` are signals derived from the atoms, so
anything reading them re-evaluates when the data changes.

[4]
Switch which user is "logged in".

[5]
The panel reads the current user signal and shows both the standard fields (name,
color) and the custom meta (department, admin badge).

[6]
Pass the user store via the `users` prop. Custom metadata rides along on the same
`TLUser` records the editor already manages, so nothing else needs wiring.
*/
