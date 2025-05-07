import classNames from 'classnames'
import { ReactNode } from 'react'
import { TldrawUiButton, TldrawUiIcon } from 'tldraw'
import {
	TlaTooltipArrow,
	TlaTooltipContent,
	TlaTooltipPortal,
	TlaTooltipRoot,
	TlaTooltipTrigger,
} from '../TlaTooltip/TlaTooltip'
import styles from './menu.module.css'

// Used to section areas of the menu, ie links vs snapshots
export function TlaMenuSection({ children }: { children: ReactNode }) {
	return <div className={styles.section}>{children}</div>
}

// Used to group together adjacent controls, ie switches or selects
export function TlaMenuControlGroup({ children }: { children: ReactNode }) {
	return <div className={styles.controlGroup}>{children}</div>
}

// A row for a single control, usually label + input
export function TlaMenuControl({ children, title }: { children: ReactNode; title?: string }) {
	return (
		<div className={classNames('tla-control', styles.control)} title={title}>
			{children}
		</div>
	)
}

// An info button for a single control
export function TlaMenuControlInfoTooltip({
	href,
	children,
	onClick,
}: {
	href?: string
	onClick?(): void
	children: ReactNode
}) {
	return (
		<div className={styles.info}>
			<TlaTooltipRoot>
				<TlaTooltipTrigger dir="ltr" asChild>
					{href ? (
						<a
							onClick={onClick}
							href={href}
							target="_blank nofollow noreferrer"
							className={classNames('tlui-button tlui-button__icon', styles.info)}
						>
							<TldrawUiIcon icon="help-circle" small />
						</a>
					) : (
						<TldrawUiButton type="icon" className={styles.info}>
							<TldrawUiIcon icon="help-circle" small />
						</TldrawUiButton>
					)}
				</TlaTooltipTrigger>
				<TlaTooltipPortal>
					<TlaTooltipContent>
						{children}
						<TlaTooltipArrow />
					</TlaTooltipContent>
				</TlaTooltipPortal>
			</TlaTooltipRoot>
		</div>
	)
}

// A label for a control
export function TlaMenuControlLabel({ children }: { children: ReactNode }) {
	return <label className={classNames(styles.label, 'tla-text_ui__medium')}>{children}</label>
}

// A detail
export function TlaMenuDetail({ children }: { children: ReactNode }) {
	return <div className={classNames(styles.detailCentered, 'tla-text_ui__small')}>{children}</div>
}
