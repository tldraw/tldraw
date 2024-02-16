import { useBreakpoint } from '../../context/breakpoints'
import { kbd } from '../../kbd-utils'

/** @public */
export interface TLUiKbdProps {
	children: string
}

/** @public */
export function TldrawUiKbd({ children }: TLUiKbdProps) {
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
