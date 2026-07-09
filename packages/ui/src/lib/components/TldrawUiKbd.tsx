import classNames from 'classnames'
import { TL_PORTRAIT_BREAKPOINT, useTldrawUiBreakpoint } from '../context/breakpoint'
import { useTldrawUiPlatform } from '../context/platform'
import { kbd } from '../kbd'

/** @public */
export interface TldrawUiKbdProps {
	children: string
	visibleOnMobileLayout?: boolean
	className?: string
}

/** @public @react */
export function TldrawUiKbd({
	children,
	visibleOnMobileLayout = false,
	className,
}: TldrawUiKbdProps) {
	const breakpoint = useTldrawUiBreakpoint()
	const { isDarwin } = useTldrawUiPlatform()

	if (!visibleOnMobileLayout && breakpoint < TL_PORTRAIT_BREAKPOINT.MOBILE) return null

	return (
		<kbd className={classNames('tl-kbd', className)}>
			{kbd(children, isDarwin).map((k, i) => (
				<span key={i}>{k}</span>
			))}
		</kbd>
	)
}
