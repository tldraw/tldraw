import classNames from 'classnames'
import { ReactNode } from 'react'
import { useTldrawUiTranslation } from '../context/translation'
import { TldrawUiButton } from './TldrawUiButton'
import { TldrawUiIcon } from './TldrawUiIcon'
import { TldrawUiTooltip } from './TldrawUiTooltip'

/** @public @react */
export function TldrawUiMenuSection({ children }: { children: ReactNode }) {
	return <div className="tl-menu-section">{children}</div>
}

/** @public @react */
export function TldrawUiMenuControlGroup({ children }: { children: ReactNode }) {
	return <div className="tl-menu-control-group">{children}</div>
}

/** @public */
export interface TldrawUiMenuControlProps {
	children: ReactNode
	title?: string
	className?: string
}

/** @public @react */
export function TldrawUiMenuControl({ children, title, className }: TldrawUiMenuControlProps) {
	return (
		<div className={classNames('tl-menu-control', className)} title={title}>
			{children}
		</div>
	)
}

/** @public */
export interface TldrawUiMenuControlInfoTooltipProps {
	href?: string
	onClick?(): void
	children: ReactNode
	showOnMobile?: boolean
}

/** @public @react */
export function TldrawUiMenuControlInfoTooltip({
	href,
	children,
	onClick,
	showOnMobile,
}: TldrawUiMenuControlInfoTooltipProps) {
	const { msg } = useTldrawUiTranslation()
	const helpMsg = msg('ui.help', 'Help')

	return (
		<div className="tl-menu-control__info-container">
			<TldrawUiTooltip content={children} showOnMobile={showOnMobile} delayDuration={0}>
				{href ? (
					<a
						onClick={onClick}
						href={href}
						target="_blank"
						rel="nofollow noreferrer"
						className="tl-menu-control__info"
					>
						<TldrawUiIcon label={helpMsg} icon="help-circle" small />
					</a>
				) : (
					<TldrawUiButton type="icon" className="tl-menu-control__info" onClick={onClick}>
						<TldrawUiIcon label={helpMsg} icon="help-circle" small />
					</TldrawUiButton>
				)}
			</TldrawUiTooltip>
		</div>
	)
}

/** @public */
export interface TldrawUiMenuControlLabelProps {
	children: ReactNode
	htmlFor: string
}

/** @public @react */
export function TldrawUiMenuControlLabel({ children, htmlFor }: TldrawUiMenuControlLabelProps) {
	return (
		<label className="tl-menu-control__label" htmlFor={htmlFor}>
			{children}
		</label>
	)
}

/** @public @react */
export function TldrawUiMenuDetail({ children }: { children: ReactNode }) {
	return <div className="tl-menu-detail">{children}</div>
}
