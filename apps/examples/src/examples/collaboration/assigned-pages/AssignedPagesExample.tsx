import { createGrantsPolicy } from '@tldraw/permissions'
import { useEffect, useState } from 'react'
import {
	atom,
	Editor,
	PageRecordType,
	Tldraw,
	TldrawUiButton,
	TLWriteRuleSession,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './assigned-pages.css'

const pageA = PageRecordType.createId('A')
const pageB = PageRecordType.createId('B')

// [1]
const policy = createGrantsPolicy({
	requires: {
		'tl:shape:create': ['tl:shape:create', 'page:edit'],
		'tl:shape:update': ['tl:shape:update', 'page:edit'],
		'tl:shape:delete': ['tl:shape:delete', 'page:edit'],
	},
})

// [2]
const GRANTS = {
	teacher: ['tl:*', 'page:edit'],
	student: ['tl:shape:*', `page:edit@${pageA}`],
}
type Role = keyof typeof GRANTS
const role = atom<Role>('role', 'teacher')

// [3]
const authorize = {
	...policy,
	getSession: (): TLWriteRuleSession => ({
		sessionId: 'local',
		userId: role.get(),
		meta: undefined,
		access: { document: 'write', objects: 'write' },
		permissions: GRANTS[role.get()],
	}),
}

function RoleControls() {
	const editor = useEditor()
	const current = useValue('role', () => role.get(), [])
	const [refused, setRefused] = useState<string | null>(null)

	// [4]
	useEffect(() => {
		const onRefused = ({ reason }: { reason: string }) => setRefused(reason)
		editor.on('refused', onRefused)
		return () => {
			editor.off('refused', onRefused)
		}
	}, [editor])

	return (
		<div className="tlui-menu assigned-pages-controls">
			{(Object.keys(GRANTS) as Role[]).map((r) => (
				<TldrawUiButton
					key={r}
					type="normal"
					isActive={current === r}
					onClick={() => {
						role.set(r)
						setRefused(null)
					}}
				>
					{r === 'teacher' ? 'Teacher' : 'Student (page A)'}
				</TldrawUiButton>
			))}
			{/* [5] */}
			<TldrawUiButton
				type="normal"
				onClick={() => editor.createShape({ type: 'geo', parentId: pageB, x: 500, y: 200 })}
			>
				Push a shape onto page B
			</TldrawUiButton>
			<span className="assigned-pages-refused">{refused ? `Refused: ${refused}` : ''}</span>
		</div>
	)
}

function seedPages(editor: Editor) {
	if (editor.getPage(pageA)) return
	const first = editor.getPages()[0]
	editor.createPage({ id: pageA, name: 'Page A' })
	editor.createPage({ id: pageB, name: 'Page B' })
	editor.setCurrentPage(pageA)
	editor.deletePage(first.id)
	editor.createShape({ type: 'geo', parentId: pageB, x: 200, y: 200, props: { w: 200, h: 120 } })
}

export default function AssignedPagesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw authorize={authorize} onMount={seedPages} components={{ TopPanel: RoleControls }} />
		</div>
	)
}

/*
[1]
One policy for both sides. Its rule checks every change against the session's grants where the
change happens (a create where the shape ends up, a delete where it was, an update at both), and
its `requires` table says what each action needs. A typed action inherits the nearest entry:
the geo tool asks for `tl:shape:create:geo`, which needs `tl:shape:create:geo` and `page:edit`.

[2]
What a server would send at connect. `tl:*` doesn't cover `page:edit`, which is a name of this
app's own, so the teacher gets it too.

[3]
Without sync, the store's `authorize` takes the policy and a `getSession` that says who is
editing. It reads an atom, so switching roles updates every button that asks.

[4]
Refused changes are reverted before anything sees them, then reported as the `'refused'` event.

[5]
The buttons only advise. This writes straight to the store, like a modified client would: as the
student it's refused with `Needs tl:shape:create:geo`, as a room would refuse it.
*/
