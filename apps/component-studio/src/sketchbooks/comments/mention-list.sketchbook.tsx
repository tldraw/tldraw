import { MentionList, MentionMember } from '@tldraw/commenting'
import { ReactNode } from 'react'
import { Sketch, Sketchbook } from '../../sketch'

const members: MentionMember[] = [
	{ id: 'u1', name: 'Ada Lovelace', color: '#6c5ce7', you: true },
	{ id: 'u2', name: 'Alan Turing', color: '#00b894' },
	{ id: 'u3', name: 'Grace Hopper', color: '#e17055' },
	{ id: 'u4', name: 'Katherine Johnson', color: '#0984e3' },
]

// The list fills its container's width (it matches the composer field in use); frame it here so the
// isolated demo reads like a real picker rather than stretching to the sketch canvas.
const frame = (node: ReactNode) => <div style={{ width: 280 }}>{node}</div>

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Comments/Mention picker',
}
export default sketchbook

/** The picker as it opens after `@` — the first row highlighted, ready for Enter. */
export const Default: Sketch<Record<string, never>> = {
	render: () => frame(<MentionList members={members} activeIndex={0} />),
}

/** A row further down highlighted, as arrow-key navigation would leave it. */
export const Navigated: Sketch<Record<string, never>> = {
	render: () => frame(<MentionList members={members} activeIndex={2} />),
}

/** The query narrowed to a single match. */
export const Filtered: Sketch<Record<string, never>> = {
	render: () => frame(<MentionList members={members.slice(0, 1)} activeIndex={0} />),
}

/** No member matches the typed query. */
export const NoMatches: Sketch<Record<string, never>> = {
	render: () => frame(<MentionList members={[]} />),
}

/** A host-supplied row via `renderMember` — the SDK still owns the selectable button + keyboard. */
export const CustomRows: Sketch<Record<string, never>> = {
	render: () =>
		frame(
			<MentionList
				members={members}
				activeIndex={0}
				renderMember={(m) => (
					<div style={{ padding: '4px 2px', fontWeight: 600, color: m.color }}>{m.name}</div>
				)}
			/>
		),
}
