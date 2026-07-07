import { CommentPin, CommentText, CommentThread } from '@tldraw/commenting'
import { Sketch, Sketchbook } from '../../sketch'
import './thread-scenarios.css'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

const oneComment = [
	{
		author: 'Jessica Edwards',
		body: <CommentText text="my *cool* comment" />,
		date: ago(2 * HOUR),
		you: true,
	},
]

const manyComments = [
	{
		author: 'Ada Lovelace',
		body: (
			<CommentText text="Should this button be **primary**? See [the spec](https://tldraw.dev)." />
		),
		date: ago(3 * HOUR),
		you: false,
	},
	{
		author: 'You',
		body: (
			<CommentText text="Good call — updating it now:\n\n- swap the `variant` prop\n- ship it" />
		),
		date: ago(2 * HOUR),
		you: true,
	},
	{
		author: 'Ada Lovelace',
		body: <CommentText text="Thanks! One more thing — can we bump the radius too?" />,
		date: ago(HOUR),
		you: false,
	},
]

/**
 * Pins sitting near an open thread overlap its popover (the pin is on the canvas, the popover in
 * the UI layer above it). Captured here so we can decide how the popover and nearby pins should
 * stack — dodge, dim, or draw over.
 */
function OverlapScene() {
	return (
		<div className="scenario">
			<div className="scenario__pin" style={{ top: 20, left: 24 }}>
				<CommentPin open>J</CommentPin>
			</div>
			<div className="scenario__thread" style={{ top: 40, left: 68 }}>
				<CommentThread
					header="Thread"
					comments={oneComment}
					composer={{ author: 'You', placeholder: 'Reply…' }}
				/>
			</div>
			<div className="scenario__pin" style={{ top: 96, left: 330 }}>
				<CommentPin>J</CommentPin>
			</div>
			<div className="scenario__pin" style={{ top: 236, left: 24 }}>
				<CommentPin>J</CommentPin>
			</div>
		</div>
	)
}

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Scenarios/Thread',
}
export default sketchbook

/** Nearby pins overlapping an open thread's popover. */
export const Overlap: Sketch<Record<string, never>> = {
	render: () => <OverlapScene />,
}

/** A thread that has grown to several comments. */
export const LongThread: Sketch<Record<string, never>> = {
	render: () => (
		<CommentThread
			header="Thread"
			comments={manyComments}
			composer={{ author: 'You', placeholder: 'Reply…' }}
		/>
	),
}

/** A resolved thread: the banner shows who resolved it; no composer. */
export const Resolved: Sketch<Record<string, never>> = {
	render: () => <CommentThread header="Thread" comments={manyComments} resolvedBy="Ada Lovelace" />,
}

const longBody = [
	{
		author: 'Ada Lovelace',
		body: (
			<CommentText text="I've been staring at this for a while and I think the whole hierarchy is off: the primary action competes with the secondary one, the spacing between the label and the control is inconsistent with the rest of the panel, and on smaller viewports the whole thing wraps in a way that pushes the send button below the fold. Can we take a pass at the tokens before we ship?" />
		),
		date: ago(2 * HOUR),
		you: false,
	},
]

/** A single, wall-of-text comment — does the panel wrap it cleanly and stay a sensible width? */
export const LongBody: Sketch<Record<string, never>> = {
	render: () => (
		<CommentThread
			header="Thread"
			comments={longBody}
			composer={{ author: 'You', placeholder: 'Reply…' }}
		/>
	),
}

/** A guest / read-only view: existing comments are visible, but there's no reply composer. */
export const ReadOnly: Sketch<Record<string, never>> = {
	render: () => <CommentThread header="Thread" comments={manyComments} />,
}
