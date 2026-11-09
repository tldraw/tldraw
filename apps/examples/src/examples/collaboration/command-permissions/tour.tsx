import { atom, useValue } from 'tldraw'

// A step-by-step guide over the four panes. Each step names one use case, says what to do and
// what to look for, and outlines the panes it is about.

export interface TourStep {
	title: string
	panes: string[]
	try: string
	see: string
	why: string
}

export const TOUR: TourStep[] = [
	{
		title: 'Students edit only their own shapes',
		panes: ['alice'],
		try: "In Alice's pane, drag the teacher's yellow note. Then draw a box inside Alice's area.",
		see: 'The note does not move and shows a lock. The box stays, labeled alice.',
		why: 'Each new shape gets its creator as owner. One edit policy, shared by client and server, allows a student to change only shapes they own, and to draw only in a frame assigned to them.',
	},
	{
		title: 'Arrows between owners',
		panes: ['alice', 'bob'],
		try: "Bob draws a box in his area. Alice draws an arrow from her box to Bob's box. Then Bob deletes his box.",
		see: "Alice can point at Bob's box, but not move it. When the box goes, her arrow stays and its end comes free.",
		why: "Binding to a shape does not change it, so it is allowed. When Bob deletes his box, the server lets Bob unbind Alice's arrow end, and nothing more.",
	},
	{
		title: 'A plugin action: votes',
		panes: ['alice', 'bob'],
		try: "In Alice's pane, select the teacher's note and click Vote on selection. Do the same as Bob.",
		see: 'The vote count shows on every pane. Your own vote is red.',
		why: 'Votes change a shape the student cannot edit. So voting is a command: the server runs votes.toggle with the actor it trusts, and the command writes only the votes.',
	},
	{
		title: 'Comments: add your own, manage any',
		panes: ['alice', 'bob', 'teacher'],
		try: "Click Comment as Alice. As Bob, click 🔒 on Alice's comment. Then click × as the teacher.",
		see: "Bob's pane shows 🔒 before he tries, and the server says “Not allowed” when he does. The teacher's delete works.",
		why: 'Comments are command-only records. comments.delete lets the author or a user with comments:manage remove a comment. The 🔒 comes from canRun, which runs that same command rule on the client.',
	},
	{
		title: 'Undo sends the inverse command',
		panes: ['alice', 'teacher'],
		try: 'As Alice, vote and press Cmd+Z. As the teacher, open the Answers page, click Delete page, then press Cmd+Z.',
		see: 'The vote goes away. The page comes back with its note, and it is still hidden from students.',
		why: 'Each command returns its inverse. pages.delete returns pages.restore with the removed records, and the server checks the restore again.',
	},
	{
		title: 'Take away write access live',
		panes: ['teacher', 'alice'],
		try: 'As the teacher, turn off "Alice can edit".',
		see: "Alice's canvas turns read-only at once. She can still vote and comment.",
		why: "The host changes the session's actor while it is open. The new permissions reach the client at once, and the server checks each later push with them.",
	},
	{
		title: 'A page only some people can read',
		panes: ['teacher', 'alice', 'bob'],
		try: 'As the teacher, turn on "Share answers with Alice". Then turn it off.',
		see: "The Answers page appears in Alice's page menu, not in Bob's. Turning it off removes it again.",
		why: 'The server sends each session only what its read policy allows. A page with readers takes its shapes, bindings, assets, comments, and cursors with it.',
	},
	{
		title: 'Take away file access',
		panes: ['teacher', 'carol'],
		try: 'As the teacher, turn off "Carol has access". Then turn it on again.',
		see: "Carol's pane closes with “You no longer have access”. It opens again when access is back.",
		why: 'An actor that can read nothing is refused, at connect and while connected.',
	},
	{
		title: 'Offline, then back',
		panes: ['bob'],
		try: "Turn off Online in Bob's pane. Vote and comment, then turn Online on.",
		see: 'His changes show at once for him, and reach the others when he is back. Each applies once.',
		why: 'The client keeps the commands with their ids and sends them again on reconnect. The server stores the ids it applied, so a resend does nothing twice.',
	},
	{
		title: 'An agent with one tool',
		panes: ['teacher'],
		try: 'As the teacher, click Ask the agent.',
		see: 'A violet note appears in the agent area.',
		why: "The agent's session has one permission, agent:notes. It can run agent.addNote and nothing else, not even a drag.",
	},
]

export const tourStep = atom('tour step', 0)

export function useFocusedPanes(): string[] {
	return useValue('focused panes', () => TOUR[tourStep.get()].panes, [])
}

export function Tour() {
	const index = useValue(tourStep)
	const step = TOUR[index]
	return (
		<div className="cp-tour">
			<div className="cp-tour-nav">
				<button disabled={index === 0} onClick={() => tourStep.set(index - 1)}>
					←
				</button>
				<span>
					{index + 1} / {TOUR.length}
				</span>
				<button disabled={index === TOUR.length - 1} onClick={() => tourStep.set(index + 1)}>
					→
				</button>
			</div>
			<div className="cp-tour-body">
				<strong>{step.title}</strong>
				<div>
					<b>Try:</b> {step.try}
				</div>
				<div>
					<b>See:</b> {step.see}
				</div>
				<div className="cp-tour-why">
					<b>Why:</b> {step.why}
				</div>
			</div>
		</div>
	)
}
