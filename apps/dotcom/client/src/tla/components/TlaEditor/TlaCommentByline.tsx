import { Avatar, BylineProps, formatFullDateTime, formatRelativeTime } from '@tldraw/commenting'
import { getMcpAgentFromCommentMeta } from '@tldraw/dotcom-shared'
import { ReactNode } from 'react'
import {
	defineMessages,
	F,
	TLComment,
	TldrawUiIcon,
	TldrawUiTooltip,
	useCurrentTranslation,
	useTranslation,
} from 'tldraw'
import { AgentLogo, getAgentLogo } from './agent-logos'
import styles from './comment-byline.module.css'

const messages = defineMessages({
	edited: { defaultMessage: 'Edited' },
	onBehalfOf: { defaultMessage: 'On behalf of {name}' },
})

/**
 * tldraw.com's `CommentByline` slot. Unlike the toolkit's default, the time sits at the right of
 * the row and an edit shows as a pencil. A comment an agent posted through the MCP server is
 * authored by the agent's owner, so the default would credit the owner alone: this names the agent
 * first, then the owner ("Claude / max"), and badges the owner's avatar with the agent's.
 */
export function TlaCommentByline({
	comment,
	author,
	date,
	edited,
	renderAvatar,
}: BylineProps & { comment: TLComment }) {
	const msg = useTranslation()
	const { locale } = useCurrentTranslation()
	const agent = getMcpAgentFromCommentMeta(comment.meta)

	const ownerAvatar = renderAvatar ? renderAvatar(author) : <Avatar author={author} />
	let avatar: ReactNode
	let name: ReactNode
	if (agent) {
		avatar = <AgentAvatar agentName={agent.name} ownerAvatar={ownerAvatar} />
		name = (
			<>
				{agent.name}{' '}
				<TldrawUiTooltip content={msg(messages.onBehalfOf, { name: author.name })}>
					<span className={styles.owner}>
						<F defaultMessage="/ {name}" values={{ name: author.name }} />
					</span>
				</TldrawUiTooltip>
			</>
		)
	} else {
		avatar = ownerAvatar
		name = author.name
	}

	return (
		<div className={`tlui-cmt-head ${styles.head}`}>
			{avatar}
			<span className="tlui-cmt-author">{name}</span>
			<TldrawUiTooltip content={formatFullDateTime(date, locale)}>
				<span className={`tlui-cmt-time ${styles.time}`}>
					{formatRelativeTime(date, locale)}
					{edited && (
						<span className={styles.edited}>
							<TldrawUiIcon icon="tool-pencil" label={msg(messages.edited)} small />
						</span>
					)}
				</span>
			</TldrawUiTooltip>
		</div>
	)
}

/** The owner's avatar, badged with the agent's logo, or a generic agent face when we don't know it. */
export function AgentAvatar({
	agentName,
	ownerAvatar,
}: {
	agentName: string
	ownerAvatar: ReactNode
}) {
	const logo = getAgentLogo(agentName)
	return (
		<span className={styles.agentAvatar}>
			{ownerAvatar}
			{logo ? (
				<span className={styles.agentBadge}>
					<AgentLogo logo={logo} className={styles.agentLogo} />
				</span>
			) : (
				<svg className={`${styles.agentBadge} ${styles.anon}`} viewBox="0 0 9 9" aria-hidden="true">
					<circle cx="3.5" cy="4.5" r="1" fill="currentColor" />
					<circle cx="6.68" cy="4.5" r="1" fill="currentColor" />
				</svg>
			)}
		</span>
	)
}
