import { useState } from 'react'
import {
	Editor,
	TLShape,
	Tldraw,
	TldrawUiButton,
	createShapeId,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './allowables.css'

type Role = 'editor' | 'commenter' | 'viewer'

// [1]
function applyRole(editor: Editor, role: Role) {
	const { allow } = editor

	allow.changeDocument.removeRule('role')
	allow.changeShape.removeRule('role')
	allow.deleteShape.removeRule('role')
	allow.switchPage.removeRule('role')

	if (role === 'viewer') {
		allow.changeDocument.setRule({
			id: 'role',
			message: 'Viewers cannot change the document',
			test: () => false,
		})
		allow.switchPage.setRule({
			id: 'role',
			message: 'Viewers must stay on the first page',
			test: (page) => page.id === editor.getPages()[0].id,
		})
	}

	if (role === 'commenter') {
		const notProtected = (shape: TLShape) => !shape.meta.protected
		allow.changeShape.setRule({
			id: 'role',
			message: 'Commenters cannot change protected shapes',
			test: notProtected,
		})
		allow.deleteShape.setRule({
			id: 'role',
			message: 'Commenters cannot delete protected shapes',
			test: notProtected,
		})
	}
}

// [2]
function RoleControls() {
	const editor = useEditor()
	const [role, setRole] = useState<Role>('editor')

	// [3]
	const failures = useValue(
		'changeDocument failures',
		() => editor.allow.changeDocument.check().failures,
		[editor]
	)

	const selectRole = (next: Role) => {
		setRole(next)
		applyRole(editor, next)
	}

	return (
		<div className="tlui-menu allowables-controls">
			{(['editor', 'commenter', 'viewer'] as const).map((r) => (
				<TldrawUiButton key={r} type="normal" isActive={role === r} onClick={() => selectRole(r)}>
					{r}
				</TldrawUiButton>
			))}
			{failures.length > 0 && (
				<span className="allowables-controls__reason">{failures[0].message}</span>
			)}
		</div>
	)
}

export default function AllowablesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{ TopPanel: RoleControls }}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return
					// [4]
					editor.createShapes([
						{
							id: createShapeId('protected'),
							type: 'geo',
							x: 100,
							y: 100,
							props: {
								w: 280,
								h: 120,
								fill: 'solid',
								color: 'light-red',
								richText: toRichText('This shape is protected.\nCommenters cannot change it.'),
							},
							meta: { protected: true },
						},
						{
							id: createShapeId('ordinary'),
							type: 'geo',
							x: 440,
							y: 100,
							props: {
								w: 280,
								h: 120,
								richText: toRichText('This shape is ordinary.\nAnyone but viewers can change it.'),
							},
						},
					])
					editor.createPage({ name: 'Page 2' })
				}}
			/>
		</div>
	)
}

/*
[1]
Each role is expressed as rules on the editor's allowables. A rule has an id (used to
replace or remove it), a message explaining why it denies, and a test. We reuse the id
'role' for every rule so switching roles replaces the previous role's rules.

The viewer role denies changeDocument entirely, which the editor methods, tools, and
default UI all respect, and pins the user to the first page via switchPage. The
commenter role leaves the document editable but protects shapes whose meta has
`protected: true` from being changed or deleted. Rules are reactive: the UI updates as
soon as they change.

[2]
A small role switcher rendered in the TopPanel component slot.

[3]
check() returns { ok, failures }, where each failure carries the denying rule's id and
message. Reading it inside useValue makes the panel update reactively when rules or
the state they read change. Here we show why the document cannot be changed.

[4]
Create one protected shape (note its meta), one ordinary shape, and a second page so
the viewer's page-pinning rule has something to deny.
*/
