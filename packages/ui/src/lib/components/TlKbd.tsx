import classNames from 'classnames'
import { TL_PORTRAIT_BREAKPOINT, useTlBreakpoint } from '../context/breakpoint'
import { useTlPlatform } from '../context/platform'
import { kbd } from '../kbd'

/** @public */
export interface TlKbdProps {
	children: string
	visibleOnMobileLayout?: boolean
	className?: string
}

/** @public @react */
export function TlKbd({ children, visibleOnMobileLayout = false, className }: TlKbdProps) {
	const breakpoint = useTlBreakpoint()
	const { isDarwin } = useTlPlatform()

	if (!visibleOnMobileLayout && breakpoint < TL_PORTRAIT_BREAKPOINT.MOBILE) return null

	return (
		<kbd className={classNames('tl-kbd', className)}>
			{kbd(children, isDarwin).map((k, i) => (
				<span key={i}>{k}</span>
			))}
		</kbd>
	)
}
