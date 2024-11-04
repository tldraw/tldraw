import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { TldrawUiButton, TldrawUiIcon, useContainer } from 'tldraw'
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
export function TlaMenuControl({ children }: { children: ReactNode }) {
	return <div className={styles.control}>{children}</div>
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
	const container = useContainer()
	return (
		<div className={styles.info}>
			<TooltipPrimitive.Root>
				<TooltipPrimitive.Trigger dir="ltr" asChild>
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
				</TooltipPrimitive.Trigger>
				<TooltipPrimitive.Portal container={container}>
					<TooltipPrimitive.Content
						avoidCollisions
						collisionPadding={8}
						dir="ltr"
						className={classNames('tlui-menu', styles.tooltip)}
					>
						{children}
						<TooltipPrimitive.Arrow className={styles.tooltipArrow} />
					</TooltipPrimitive.Content>
				</TooltipPrimitive.Portal>
			</TooltipPrimitive.Root>
		</div>
	)
}

// A label for a control
export function TlaMenuControlLabel({ children }: { children: ReactNode }) {
	return <div className={classNames(styles.label, 'tla-text_ui__medium')}>{children}</div>
}

// A detail
export function TlaMenuDetail({ children }: { children: ReactNode }) {
	return <div className={classNames(styles.detailCentered, 'tla-text_ui__small')}>{children}</div>
}
