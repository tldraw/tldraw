import { useBreakpoint } from '../../hooks/useBreakpoint'
import { kbd } from './shared'

/** @internal */
export interface KbdProps {
	children: string
}

/** @internal */
export function Kbd({ children }: KbdProps) {
	const breakpoint = useBreakpoint()
	if (breakpoint < 4) return null
	return (
		<kbd className="tlui-kbd">
			{kbd(children).map((k, i) => (
				<span key={i}>{k}</span>
			))}
		</kbd>
	)
}
