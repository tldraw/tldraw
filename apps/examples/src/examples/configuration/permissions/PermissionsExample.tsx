import { createPermissionPolicy, TL_PERMISSIONS } from '@tldraw/permissions'
import { atom, Tldraw, TLPermission, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './permissions.css'

// [1]
const granted = atom<readonly TLPermission[]>('granted permissions', TL_PERMISSIONS)

// [2]
const policy = createPermissionPolicy(() => granted.get())

// [3]
function PermissionsPanel() {
	const current = useValue(granted)

	return (
		<div className="tlui-menu permissions-panel">
			{TL_PERMISSIONS.map((permission) => (
				<label key={permission}>
					<input
						type="checkbox"
						checked={current.includes(permission)}
						onChange={(e) =>
							granted.set(
								e.target.checked
									? [...current, permission]
									: current.filter((p) => p !== permission)
							)
						}
					/>
					{permission}
				</label>
			))}
		</div>
	)
}

export default function PermissionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="permissions-example"
				// [4]
				can={policy.can}
				canChangeRecord={policy.canChangeRecord}
				components={{ TopPanel: PermissionsPanel }}
			/>
		</div>
	)
}

/*
[1]
The permissions this user holds. It's an atom so the editor and its UI react when it changes. In an
app this would usually be read from a record the server syncs to the client.

[2]
A policy turns the list into the two answers the editor asks for. The function is called on every
question, so it always sees the current list.

[3]
A checkbox per permission. Unticking one takes it away.

[4]
`can` is asked by the UI, by name: without `tl:page:create` the new page button is disabled.
`canChangeRecord` is asked inside editor methods with the actual change, so `editor.createPage()`
does nothing either. Neither enforces anything: a server has to refuse the same changes.
*/
