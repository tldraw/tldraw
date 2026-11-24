import { useEffect } from 'react'
import { atom, Editor, TLCheckDiff, Tldraw, TLShape, useEditor, useToasts, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './permissions-client-only.css'

// [1]
const currentUser = atom('current user', 'alice')

function canChange(shape: TLShape) {
	return shape.meta.owner === undefined || shape.meta.owner === currentUser.get()
}

// [2]
const checkDiff: TLCheckDiff = (diff) => {
	for (const [from] of Object.values(diff.updated)) {
		if (from.typeName === 'shape' && !canChange(from)) {
			return { reason: `This shape belongs to ${from.meta.owner}` }
		}
	}
	for (const record of Object.values(diff.removed)) {
		if (record.typeName === 'shape' && !canChange(record)) {
			return { reason: `This shape belongs to ${record.meta.owner}` }
		}
	}
	return null
}

// [3]
function registerChecks(editor: Editor) {
	editor.sideEffects.registerBeforeCreateHandler('shape', (shape) => ({
		...shape,
		meta: { ...shape.meta, owner: currentUser.get() },
	}))

	function canChangeSelection() {
		if (!editor.getSelectedShapes().every(canChange)) {
			return { reason: 'You can only change your own shapes' }
		}
		return null
	}
	editor.registerCapabilityCheck('edit-shape', canChangeSelection)
	editor.registerCapabilityCheck('delete-shape', canChangeSelection)
}

function Controls() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const user = useValue(currentUser)
	// [4]
	const status = useValue(
		'status',
		() => editor.checkCapability('edit-shape')?.reason ?? 'You can change the selection',
		[editor]
	)

	useEffect(() => {
		function onRejected({ reason }: { reason: string }) {
			addToast({ title: reason, severity: 'warning' })
		}
		editor.on('rejected', onRejected)
		return () => {
			editor.off('rejected', onRejected)
		}
	}, [editor, addToast])

	return (
		<div className="tlui-menu permissions-controls">
			<label>
				Act as{' '}
				<select value={user} onChange={(e) => currentUser.set(e.currentTarget.value)}>
					<option value="alice">alice</option>
					<option value="bob">bob</option>
				</select>
			</label>
			<span className="permissions-status" title={status}>
				{status}
			</span>
		</div>
	)
}

export default function PermissionsClientOnlyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="permissions-client-only"
				checkDiff={checkDiff}
				onMount={registerChecks}
				components={{ TopPanel: Controls }}
			/>
		</div>
	)
}

/*
[1]
Your app decides who the user is. Here an atom holds it, so that you can switch between two
users in one tab. Because the checks read the atom, the UI changes when you switch.

[2]
The diff check gets every document change of one operation. `from` is the record before the
change, so a user cannot take a shape over by changing its owner. Return nothing to allow.

[3]
A side effect stamps the owner on each new shape. The capability checks read the selection from
the editor: a capability carries no data.

[4]
`checkCapability` is reactive. It returns `null` when allowed, or the rejection.
*/
