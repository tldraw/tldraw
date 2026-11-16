import {
	Avatar,
	CommentAuthor,
	CommentListItem,
	CommentListItemRenderProps,
} from '@tldraw/commenting'
import { getMcpAgentFromCommentMeta } from '@tldraw/dotcom-shared'
import { createContext, CSSProperties, useContext } from 'react'
import { defineMessages, TLComment, TLCommentThread, useTranslation } from 'tldraw'
import { AgentAvatar } from './TlaCommentByline'
import styles from './comment-byline.module.css'

/**
 * The author resolver, from `CommentsOnCanvas`. Component slots get only the records (a pin gets its
 * thread and comments), and React context crosses the portals pins and threads render in.
 */
export const ResolveCommentAuthorContext = createContext<(id: string) => CommentAuthor | undefined>(
	() => undefined
)

const messages = defineMessages({
	unknownAuthor: { defaultMessage: 'Someone' },
	ownerSuffix: { defaultMessage: '/ {name}' },
})

/** The agent that started a thread, read from its first comment. The toolkit sorts oldest first. */
function getThreadAgent(comments: TLComment[]) {
	return comments.length ? getMcpAgentFromCommentMeta(comments[0].meta) : null
}

/**
 * `text` as a CSS string literal. The owner's name is user-controlled, so a quote or backslash in it
 * would otherwise end the string early and break the `content` it feeds. JSON's escapes aren't CSS's
 * (CSS has no `\n` or `\u0022`), so everything outside printable ASCII is written as a hex escape.
 */
function toCssString(text: string) {
	let out = '"'
	for (const char of text) {
		const code = char.codePointAt(0)!
		out +=
			char === '"' || char === '\\' || code < 0x20 || code > 0x7e ? `\\${code.toString(16)} ` : char
	}
	return out + '"'
}

/**
 * tldraw.com's `ThreadRow` slot: the toolkit's own row, except that a thread an agent started
 * names the agent and its owner ("Claude / max") and badges the owner's avatar, as the byline does.
 */
export function TlaThreadRow({
	thread: _thread,
	comments,
	...props
}: CommentListItemRenderProps & { thread: TLCommentThread; comments: TLComment[] }) {
	const msg = useTranslation()
	const agent = getThreadAgent(comments)
	if (!agent) return <CommentListItem {...props} />

	const owner = props.author
	const ownerAvatar = props.renderAvatar ? props.renderAvatar(owner) : <Avatar author={owner} />
	// The row's byline takes the name as a string, so the grey "/ owner" after it is drawn by CSS
	// from this property rather than by forking the toolkit's row.
	const style = {
		'--tla-agent-owner': toCssString(msg(messages.ownerSuffix, { name: owner.name })),
	} as CSSProperties
	return (
		<div className={styles.agentRow} style={style}>
			<CommentListItem
				{...props}
				author={{ ...owner, name: agent.name }}
				renderAvatar={() => <AgentAvatar client={agent.client} ownerAvatar={ownerAvatar} />}
			/>
		</div>
	)
}

/** tldraw.com's `PinContent` slot: the author's avatar, badged with the agent that started it. */
export function TlaPinContent({
	thread,
	comments,
}: {
	thread: TLCommentThread
	comments: TLComment[]
}) {
	const msg = useTranslation()
	const resolveAuthor = useContext(ResolveCommentAuthorContext)
	const author = resolveAuthor(thread.createdBy) ?? { name: msg(messages.unknownAuthor) }
	const avatar = <Avatar author={author} />
	const agent = getThreadAgent(comments)
	if (!agent) return avatar
	return (
		<span className={styles.pinAvatar}>
			<AgentAvatar client={agent.client} ownerAvatar={avatar} />
		</span>
	)
}
