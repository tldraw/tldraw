import type { AgentLogoMark } from './agent-logos'

export function AgentLogo({ logo, className }: { logo: AgentLogoMark; className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" style={{ color: logo.color }} aria-hidden="true">
			<path fill="currentColor" d={logo.path} />
		</svg>
	)
}
