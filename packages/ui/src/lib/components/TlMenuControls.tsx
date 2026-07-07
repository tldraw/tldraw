import classNames from 'classnames'
import { ReactNode } from 'react'
import { useTlTranslation } from '../context/translation'
import { TlButton } from './TlButton'
import { TlIcon } from './TlIcon'
import { TlTooltip } from './TlTooltip'

/** @public @react */
export function TlMenuSection({ children }: { children: ReactNode }) {
	return <div className="tl-menu-section">{children}</div>
}

/** @public @react */
export function TlMenuControlGroup({ children }: { children: ReactNode }) {
	return <div className="tl-menu-control-group">{children}</div>
}

/** @public */
export interface TlMenuControlProps {
	children: ReactNode
	title?: string
	className?: string
}

/** @public @react */
export function TlMenuControl({ children, title, className }: TlMenuControlProps) {
	return (
		<div className={classNames('tl-menu-control', className)} title={title}>
			{children}
		</div>
	)
}

/** @public */
export interface TlMenuControlInfoTooltipProps {
	href?: string
	onClick?(): void
	children: ReactNode
	showOnMobile?: boolean
}

/** @public @react */
export function TlMenuControlInfoTooltip({
	href,
	children,
	onClick,
	showOnMobile,
}: TlMenuControlInfoTooltipProps) {
	const { msg } = useTlTranslation()
	const helpMsg = msg('ui.help', 'Help')

	return (
		<div className="tl-menu-control__info-container">
			<TlTooltip content={children} showOnMobile={showOnMobile} delayDuration={0}>
				{href ? (
					<a
						onClick={onClick}
						href={href}
						target="_blank"
						rel="nofollow noreferrer"
						className="tl-menu-control__info"
					>
						<TlIcon label={helpMsg} icon="help-circle" small />
					</a>
				) : (
					<TlButton type="icon" className="tl-menu-control__info" onClick={onClick}>
						<TlIcon label={helpMsg} icon="help-circle" small />
					</TlButton>
				)}
			</TlTooltip>
		</div>
	)
}

/** @public */
export interface TlMenuControlLabelProps {
	children: ReactNode
	htmlFor: string
}

/** @public @react */
export function TlMenuControlLabel({ children, htmlFor }: TlMenuControlLabelProps) {
	return (
		<label className="tl-menu-control__label" htmlFor={htmlFor}>
			{children}
		</label>
	)
}

/** @public @react */
export function TlMenuDetail({ children }: { children: ReactNode }) {
	return <div className="tl-menu-detail">{children}</div>
}
