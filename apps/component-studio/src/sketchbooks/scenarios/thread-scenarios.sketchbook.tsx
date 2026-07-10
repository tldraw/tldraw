import {
	CommentCard,
	CommentComposer,
	CommentPin,
	CommentText,
	CommentThread,
} from '@tldraw/commenting'
import { TldrawUiIcon, toRichText } from 'tldraw'
import { Sketch, Sketchbook } from '../../sketch'
import './thread-scenarios.css'

const NOW = Date.now()
const HOUR = 3_600_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

// The thread header's controls, shown static here (the wiring lives in the canvas overlay).
const threadActions = (
	<>
		<button className="cmt-thread__action" title="Resolve">
			<TldrawUiIcon icon="check" label="Resolve" small />
		</button>
		<button className="cmt-thread__action" title="Delete thread">
			<TldrawUiIcon icon="trash" label="Delete thread" small />
		</button>
		<button className="cmt-thread__action" title="Dismiss">
			<TldrawUiIcon icon="cross-2" label="Dismiss" small />
		</button>
	</>
)

const dismissOnly = (
	<button className="cmt-thread__action" title="Dismiss">
		<TldrawUiIcon icon="cross-2" label="Dismiss" small />
	</button>
)

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
 * Pins sitting near an open thread: the open thread's popover draws above them, so nearby markers
 * tuck behind it rather than overlapping it.
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
					headerActions={threadActions}
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

/** The dense case: several pins clustered around one open thread. */
function CrowdedScene() {
	return (
		<div className="scenario">
			<div className="scenario__pin" style={{ top: 24, left: 28 }}>
				<CommentPin open>J</CommentPin>
			</div>
			<div className="scenario__pin" style={{ top: 30, left: 92 }}>
				<CommentPin>A</CommentPin>
			</div>
			<div className="scenario__pin" style={{ top: 74, left: 52 }}>
				<CommentPin resolved>2</CommentPin>
			</div>
			<div className="scenario__pin" style={{ top: 20, left: 320 }}>
				<CommentPin>M</CommentPin>
			</div>
			<div className="scenario__thread" style={{ top: 56, left: 84 }}>
				<CommentThread
					header="Thread"
					headerActions={threadActions}
					comments={oneComment}
					composer={{ author: 'You', placeholder: 'Reply…' }}
				/>
			</div>
			<div className="scenario__pin" style={{ top: 252, left: 40 }}>
				<CommentPin>J</CommentPin>
			</div>
			<div className="scenario__pin" style={{ top: 262, left: 300 }}>
				<CommentPin>A</CommentPin>
			</div>
		</div>
	)
}

const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Scenarios/Thread',
}
export default sketchbook

/** Nearby pins near an open thread — its popover draws above them. */
export const Overlap: Sketch<Record<string, never>> = {
	render: () => <OverlapScene />,
}

/** Many pins clustered together with a thread open. */
export const Crowded: Sketch<Record<string, never>> = {
	render: () => <CrowdedScene />,
}

/** A thread that has grown to several comments. */
export const LongThread: Sketch<Record<string, never>> = {
	render: () => (
		<CommentThread
			header="Thread"
			headerActions={threadActions}
			comments={manyComments}
			composer={{ author: 'You', placeholder: 'Reply…' }}
		/>
	),
}

/** A resolved thread: the banner shows who resolved it; no composer. */
export const Resolved: Sketch<Record<string, never>> = {
	render: () => (
		<CommentThread
			header="Thread"
			headerActions={threadActions}
			comments={manyComments}
			resolvedBanner="Resolved by Ada Lovelace"
		/>
	),
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
			headerActions={threadActions}
			comments={longBody}
			composer={{ author: 'You', placeholder: 'Reply…' }}
		/>
	),
}

/** A guest / read-only view: existing comments are visible, but there's no reply composer. */
export const ReadOnly: Sketch<Record<string, never>> = {
	render: () => (
		<CommentThread header="Thread" headerActions={dismissOnly} comments={manyComments} />
	),
}

/** Editing a comment: the comment is swapped for a composer pre-filled with its body, saved with
 *  "Save". */
export const Editing: Sketch<Record<string, never>> = {
	render: () => (
		<CommentThread
			header="Thread"
			headerActions={threadActions}
			comments={manyComments}
			renderComment={(card, i) =>
				i === 1 ? (
					<CommentComposer
						author={card.author}
						placeholder="Edit comment…"
						value={toRichText('Good call — updating it now.')}
						onChange={() => {}}
						sendLabel="Save"
					/>
				) : (
					<CommentCard {...card} />
				)
			}
		/>
	),
}
