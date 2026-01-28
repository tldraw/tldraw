import { AgentIcon, AgentIconType } from '../../shared/icons/AgentIcon'

export function PromptTag({
	text,
	icon,
	onClick,
}: {
	text: string
	icon: AgentIconType
	onClick?: () => void
}) {
	return onClick ? (
		<button type="button" className="prompt-tag" onClick={onClick}>
			<AgentIcon type={icon} /> <span>{text}</span>
		</button>
	) : (
		<div className="prompt-tag">
			<AgentIcon type={icon} /> <span>{text}</span>
		</div>
	)
}
