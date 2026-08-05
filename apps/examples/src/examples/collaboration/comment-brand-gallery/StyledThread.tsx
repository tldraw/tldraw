import {
	Avatar,
	CommentAuthor,
	CommentPin,
	CommentThread,
	formatRelativeTime,
	Reactions,
	ReactionSummary,
	SendButton,
} from '@tldraw/commenting'
import { useState } from 'react'

/**
 * The demo conversation every gallery tile renders. One shared script makes the styles directly
 * comparable — the only thing changing from tile to tile is the CSS.
 */
export interface DemoComment {
	author: CommentAuthor
	date: string
	text: string
	reactions?: ReactionSummary[]
}

const now = Date.now()
const MINUTE = 60 * 1000

export const DEMO_AUTHORS = {
	riley: { name: 'Riley Chen', color: '#EC5E41' },
	sam: { name: 'Sam Okafor', color: '#4465E9' },
} satisfies Record<string, CommentAuthor>

export const DEMO_COMMENTS: DemoComment[] = [
	{
		author: DEMO_AUTHORS.riley,
		date: new Date(now - 52 * MINUTE).toISOString(),
		text: 'Can we push the logo up a touch? It’s fighting the headline.',
		reactions: [
			{ emoji: '👍', count: 2, active: false, reactors: [] },
			{ emoji: '🔥', count: 1, active: true, reactors: [] },
		],
	},
	{
		author: DEMO_AUTHORS.sam,
		date: new Date(now - 31 * MINUTE).toISOString(),
		text: 'Good catch — moved it up 8px. How’s this?',
	},
]

/** Toggle the current user's reaction in a summary list: join a pill you're not part of, or back
 *  out of one you are — dropping the pill entirely when its count hits zero. */
function toggleReaction(list: ReactionSummary[], emoji: string): ReactionSummary[] {
	return list
		.map((reaction) =>
			reaction.emoji === emoji
				? {
						...reaction,
						active: !reaction.active,
						count: reaction.count + (reaction.active ? -1 : 1),
					}
				: reaction
		)
		.filter((reaction) => reaction.count > 0)
}

/**
 * The demo thread one style gets applied to, built from the SDK's presentational pieces:
 * `CommentPin`, `CommentThread`, `Avatar`, `Reactions`, and `SendButton`. These components take
 * plain props and know nothing about the editor, so a tile needs no store and no license — and
 * because they render the same markup and class names as the live canvas layer, one style
 * sheet covers both.
 *
 * The tiles stay interactive so each style can be tried with real content:
 * - Bodies and author names are `contentEditable`. Renamed authors flow into state so the avatar
 *   (and the pin, for the opening comment) re-render with the new initial.
 * - Reaction pills are live: click one to join or leave it, and a pill you back out of at count
 *   zero disappears.
 *
 * The PNG capture reads the DOM, so whatever a tile shows is what exports.
 */
export function StyledThread({ comments = DEMO_COMMENTS }: { comments?: DemoComment[] }) {
	// The editable spans stay uncontrolled — React never rewrites their text, so the caret holds
	// still — but the avatars derive from this state, so renaming "Riley" to "Kai" flips the
	// initials from R to K as you type.
	const [names, setNames] = useState(() => comments.map((comment) => comment.author.name))
	const [reactions, setReactions] = useState(() =>
		comments.map((comment) => comment.reactions ?? [])
	)

	const authorAt = (index: number): CommentAuthor => ({
		...comments[index].author,
		name: names[index]?.trim() || comments[index].author.name,
	})

	return (
		<>
			<CommentPin>
				<Avatar author={authorAt(0)} />
			</CommentPin>
			<CommentThread
				comments={comments.map((comment) => ({
					author: comment.author,
					body: null,
					date: comment.date,
					you: false,
				}))}
				renderComment={(_, index) => (
					<EditableComment
						comment={comments[index]}
						author={authorAt(index)}
						reactions={reactions[index]}
						onNameInput={(name) => setNames((prev) => prev.map((n, i) => (i === index ? name : n)))}
						onToggleReaction={(emoji) =>
							setReactions((prev) =>
								prev.map((list, i) => (i === index ? toggleReaction(list, emoji) : list))
							)
						}
					/>
				)}
				footer={<FakeComposer />}
			/>
		</>
	)
}

function EditableComment({
	comment,
	author,
	reactions,
	onNameInput,
	onToggleReaction,
}: {
	comment: DemoComment
	author: CommentAuthor
	reactions: ReactionSummary[]
	onNameInput(name: string): void
	onToggleReaction(emoji: string): void
}) {
	return (
		<div className="tlui-cmt-card">
			<div className="tlui-cmt-head">
				<Avatar author={author} />
				<span
					className="tlui-cmt-author bcg-editable"
					contentEditable
					suppressContentEditableWarning
					onInput={(event) => onNameInput(event.currentTarget.textContent ?? '')}
				>
					{comment.author.name}
				</span>
				<span className="tlui-cmt-time">{formatRelativeTime(comment.date)}</span>
			</div>
			<div className="tlui-cmt-body">
				<div className="tlui-cmt-text bcg-editable" contentEditable suppressContentEditableWarning>
					<p>{comment.text}</p>
				</div>
				<Reactions
					reactions={reactions}
					canReact
					onToggle={onToggleReaction}
					enableHoverList={false}
				/>
			</div>
		</div>
	)
}

/** A static stand-in for the reply composer — same classes, no editor behind it. The placeholder
 *  is editable too, so a brand can voice even its call-to-action. */
export function FakeComposer() {
	return (
		<div className="tlui-cmt-composer">
			<div className="tlui-cmt-composer__field">
				<div className="tlui-cmt-composer__input-wrap">
					<div
						className="tlui-cmt-input bcg-editable"
						contentEditable
						suppressContentEditableWarning
					>
						Reply…
					</div>
				</div>
				<SendButton label="Send" disabled />
			</div>
		</div>
	)
}
