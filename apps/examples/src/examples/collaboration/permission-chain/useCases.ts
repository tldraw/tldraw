import rulesSource from './classroomPermissions.ts?raw'

// The use cases of the permissions research, each with the layers of classroomPermissions.ts that
// solve it and the steps to see it in the demo.

export interface UseCase {
	id: string
	title: string
	/** Names of the layers in classroomPermissions.ts that solve it. */
	layers: string[]
	how: string
	steps: string[]
}

export const USE_CASES: UseCase[] = [
	{
		id: 'file-read',
		title: 'File read control',
		layers: ['closedClass'],
		how: 'The room asks the chain for the action `room.open` when a session connects, and again on `refreshReads` and `updateSessionMeta`. A session that may not open the room is closed with FORBIDDEN.',
		steps: [
			'As the teacher, click "Close class". The student panes close.',
			'Click "Try again" in a student pane. The room refuses again.',
			'Click "Open class", then "Try again". The student is back.',
		],
	},
	{
		id: 'file-write',
		title: 'File write control',
		layers: ['viewersReadOnly'],
		how: 'A viewer writes nothing. The room lane (`isReadonly`) stops it before the chain. The same layer on the client gives the reason.',
		steps: [
			'Set the third pane to "Visitor".',
			'Point at the star: "Locked for you: read only". It cannot be selected.',
		],
	},
	{
		id: 'page-read',
		title: 'Page read control',
		layers: ['privatePages'],
		how: 'A read layer. A private page, and every shape, binding, comment and cursor on it, is not sent to a student. When a frame moves onto a private page, the host refreshes reads, so its children go too. A write may not move a record into or out of a hidden page.',
		steps: [
			'Students have no "Answers" page.',
			'As the teacher, go to the "Answers" page. The students stop seeing the teacher\'s cursor.',
			'Click "Show answers". The page appears for the students.',
		],
	},
	{
		id: 'page-write',
		title: 'Page write control',
		layers: ['lockedPages'],
		how: 'Only a teacher changes the file and its pages. A locked page is read only for students.',
		steps: [
			'As the teacher, click "Lock page".',
			'As Alice, point at a shape: "Locked for you: page is locked".',
			'Draw. The shape goes away with "page is locked".',
			'As Alice, rename the page. It is put back with "only teachers change pages".',
		],
	},
	{
		id: 'shape-read',
		title: 'Shape read control',
		layers: ['grades'],
		how: 'A read layer on one shape type. A student receives only their own grade. The teacher receives all of them.',
		steps: ['Alice sees only her grade, and Bob sees only his. The teacher sees both.'],
	},
	{
		id: 'shape-write',
		title: 'Shape write control',
		layers: ['stampOwner', 'ownShapes', 'ownBindings', 'ownAssets', 'closedByDefault'],
		how: 'The chain stamps the owner of a new shape or asset, on the client and on the server. A student changes only their own shapes, assets, and arrow bindings, and cannot put a shape into a frame of someone else. A shape created in the same operation counts as their own, so a pasted frame keeps its children. A record type with no rules is closed. The editor asks the chain about each shape with a dry run, and a shape that the user may not change acts as locked.',
		steps: [
			'As Alice, point at the star: "Locked for you: not your shape". She cannot select it.',
			'As Alice, draw a rectangle and move it. It syncs.',
			'Drag it into "Agent area". It snaps back with "not your frame".',
		],
	},
	{
		id: 'atomic',
		title: 'No half-applied pushes',
		layers: ['atomic', 'ownShapes'],
		how: 'The editor checks each editor operation as one batch when it ends, and the room runs the chain once per push. `atomic()` denies the whole batch if it denies one write, so an operation is never applied in part. A push can hold several operations, so a denied push undoes all of them.',
		steps: [
			'As Alice, check "Skip client checks". Her editor now sends what it likes.',
			'Draw a rectangle. Select it and the star, and move both.',
			'The room denies both writes (see "Room"), and both snap back.',
		],
	},
	{
		id: 'comments',
		title: 'Comments',
		layers: ['comments'],
		how: '`createCommentAuthorizers` from `@tldraw/sync-collaboration` as one layer: post as yourself, edit and delete your own, a teacher deletes any. A comment that follows its thread to another page is not an edit, so the teacher can move a shape with student comments. The comment menu asks the same chain, so it shows only what the chain allows.',
		steps: [
			'Use the comment tool as Alice to post a comment.',
			'As Bob, open it: there is no "Delete". As the teacher: there is.',
			'As "Visitor", there is no composer.',
		],
	},
	{
		id: 'share-links',
		title: 'Share links',
		layers: ['viewersReadOnly'],
		how: 'A link guest connects with the role of the link. When the teacher changes the link, the host calls `room.updateSessionMeta`, and the next write and read use the new role, with no reconnect.',
		steps: [
			'Set the third pane to "Guest (share link)". The link is view only.',
			'As the teacher, set the link to "can edit". The guest can now draw.',
			'Set it back to "can view". The next draw is denied at once.',
		],
	},
	{
		id: 'agents',
		title: 'Agents',
		layers: ['agentScope'],
		how: 'An agent writes only shapes inside its frame, and the bindings of its arrows there, at most 50 writes per batch. A limit per batch needs the whole batch, which a per-record hook does not see. An agent reads what a student reads.',
		steps: ['Set the third pane to "Agent", and try each button.'],
	},
	{
		id: 'plugins',
		title: 'Plugin types and actions',
		layers: ['grades', 'teacherActions'],
		how: 'A plugin adds a shape type and a layer for it. Named actions (`page.lock`, `grade.change`, `file.share`) use `chain.can`, so the UI and a server endpoint ask the same question.',
		steps: [
			'"Change grades" is disabled for students: `chain.can` says no.',
			'As Alice, point at her grade: "Locked for you: only teachers grade".',
		],
	},
]

/** The source of one layer in classroomPermissions.ts, with its doc comment. */
export function layerSource(name: string): string {
	const blocks = rulesSource.split(/\n\n(?=\/\*\*|export )/)
	const block = blocks.find(
		(b) =>
			b.includes(`export const ${name}:`) ||
			b.includes(`export const ${name} =`) ||
			b.includes(`export function ${name}(`)
	)
	if (block) return block.trim()
	if (name === 'atomic')
		return '// from tldraw (@tldraw/store), first in the chain:\natomic<TLRecord, ClassroomActor>()'
	return `// ${name}: not found`
}
