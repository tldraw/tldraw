import { useSync } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Editor,
	PageRecordType,
	Tldraw,
	UserRecordType,
	atom,
	createUserId,
	inlineBase64AssetStore,
	toRichText,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { actorFor, classroomPolicies, Person } from './classroom'
import { connectToLocalRoom } from './localRoom'
import './record-policies.css'

// There's a guide at the bottom of this file!

const people: Person[] = [
	{ id: 'teacher', name: 'Teacher', role: 'teacher' },
	{ id: 'sam', name: 'Sam', role: 'student' },
	{ id: 'ann', name: 'Ann', role: 'student' },
]

const ANSWERS_PAGE = PageRecordType.createId('answers')

export default function RecordPoliciesExample() {
	return (
		<div className="record-policies">
			{people.map((person) => (
				<Pane key={person.id} person={person} />
			))}
		</div>
	)
}

function Pane({ person }: { person: Person }) {
	// [1]
	const connect = useCallback(() => connectToLocalRoom(person), [person])
	const users = useMemo(
		() => ({
			currentUser: atom(
				'user',
				UserRecordType.create({ id: createUserId(person.id), name: person.name })
			),
		}),
		[person]
	)
	const store = useSync({
		connect,
		users,
		policies: classroomPolicies,
		assets: inlineBase64AssetStore,
	})
	const [editor, setEditor] = useState<Editor | null>(null)
	const [checkLocally, setCheckLocally] = useState(true)
	const [blocked, setBlocked] = useState(0)

	// [2]
	useEffect(() => {
		if (!editor) return
		const actor = actorFor(person)
		editor.setActor(checkLocally ? actor : null)
		editor.getInitialMetaForShape = () => ({ ownerId: person.id })
		return editor.store.addPolicyDeniedListener((denied) => setBlocked((n) => n + denied.length))
	}, [editor, person, checkLocally])

	return (
		<div className="record-policies__pane">
			<div className="record-policies__header">
				<strong>{person.name}</strong>
				<span className="record-policies__role">{person.role}</span>
				<label title="Run the policies in this editor too. Off: only the server checks, so denied changes snap back.">
					<input
						type="checkbox"
						checked={checkLocally}
						onChange={(e) => setCheckLocally(e.target.checked)}
					/>
					Check locally
				</label>
				{blocked > 0 && <span className="record-policies__blocked">{blocked} blocked</span>}
				{editor && person.role === 'teacher' && <TeacherControls editor={editor} />}
			</div>
			<div className="record-policies__editor">
				{store.status === 'synced-remote' ? (
					<Tldraw
						store={store.store}
						onMount={(editor) => {
							setEditor(editor)
							if (person.role === 'teacher') seedBoard(editor)
						}}
					/>
				) : (
					<div className="record-policies__loading">Connecting…</div>
				)}
			</div>
		</div>
	)
}

// [3]
function TeacherControls({ editor }: { editor: Editor }) {
	const isLocked = useValue('locked', () => !!editor.getDocumentSettings().meta.locked, [editor])
	const isPrivate = useValue('private', () => !!editor.getPage(ANSWERS_PAGE)?.meta.private, [
		editor,
	])
	return (
		<>
			<button
				onClick={() =>
					editor.updateDocumentSettings({
						meta: { ...editor.getDocumentSettings().meta, locked: !isLocked },
					})
				}
			>
				{isLocked ? 'Unlock board' : 'Lock board'}
			</button>
			<button
				onClick={() => {
					const page = editor.getPage(ANSWERS_PAGE)
					if (page) editor.updatePage({ id: page.id, meta: { ...page.meta, private: !isPrivate } })
				}}
			>
				{isPrivate ? 'Show answers' : 'Hide answers'}
			</button>
		</>
	)
}

function seedBoard(editor: Editor) {
	if (editor.getPage(ANSWERS_PAGE)) return
	const pageId = editor.getCurrentPageId()
	editor.run(() => {
		editor.createShapes([
			{
				type: 'frame',
				x: 0,
				y: 0,
				props: { w: 420, h: 260, name: 'Teacher’s area' },
			},
			{
				type: 'note',
				x: 40,
				y: 60,
				props: { richText: toRichText('Only the teacher changes this note.') },
			},
			{
				type: 'text',
				x: 0,
				y: 320,
				props: { richText: toRichText('Students: draw your answer below this line.') },
			},
		])
		editor.createPage({ id: ANSWERS_PAGE, name: 'Answers', meta: { private: true } })
		editor.createShapes([
			{
				type: 'text',
				parentId: ANSWERS_PAGE,
				x: 0,
				y: 0,
				props: { richText: toRichText('The answer is 42.') },
			},
		])
		editor.setCurrentPage(pageId)
	})
	editor.zoomToFit({ animation: { duration: 0 } })
}

/*
Three editors connect to one sync room that runs in this browser tab. Each editor and the room use
the same policies (classroom.ts): students add shapes and change only their own, the teacher
changes anything, and a private page is not sent to students.

[1]
`policies` goes into the client schema, and the room gets the same `policies` in its schema
(localRoom.ts). The policies sit next to the record types in the schema, so a custom shape can
bring its own rules with `static policy` on its ShapeUtil.

[2]
`editor.setActor` turns on the client check. A change that the policies deny is reverted in the
editor before it is sent, and the teacher's shapes behave like locked shapes for a student. Turn
"Check locally" off to see the server alone: the student can drag the teacher's shape, the room
discards the push, and the shape snaps back. `getInitialMetaForShape` stamps the owner on new
shapes; the policy only verifies it.

[3]
"Lock board" changes the document record, and the shape rules read it with `ctx.get`. "Hide
answers" changes the page record. The room then sends a delete for the page and its shapes to each
student, because their read rules depend on the page.
*/
