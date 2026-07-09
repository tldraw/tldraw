import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { ReactNode } from 'react'
import { TldrawUiPortalScope, useTldrawUiPortalContainer } from '../context/portal'
import { useTldrawUiTranslation } from '../context/translation'

/** @public */
export interface TldrawUiContextMenuRootProps {
	children: ReactNode
	modal?: boolean
	onOpenChange?(open: boolean): void
}

/** @public @react */
export function TldrawUiContextMenuRoot({
	children,
	modal = false,
	onOpenChange,
}: TldrawUiContextMenuRootProps) {
	const { dir } = useTldrawUiTranslation()

	return (
		<_ContextMenu.Root dir={dir} modal={modal} onOpenChange={onOpenChange}>
			{children}
		</_ContextMenu.Root>
	)
}

/** @public */
export interface TldrawUiContextMenuTriggerProps {
	children: ReactNode
	disabled?: boolean
}

/** @public @react */
export function TldrawUiContextMenuTrigger({
	children,
	disabled,
}: TldrawUiContextMenuTriggerProps) {
	return (
		<_ContextMenu.Trigger asChild disabled={disabled}>
			{children}
		</_ContextMenu.Trigger>
	)
}

/** @public */
export interface TldrawUiContextMenuContentProps {
	children: ReactNode
	className?: string
	alignOffset?: number
	collisionPadding?: number
	'aria-label'?: string
	'data-testid'?: string
}

/** @public @react */
export function TldrawUiContextMenuContent({
	children,
	className,
	alignOffset = -4,
	collisionPadding = 4,
	'aria-label': ariaLabel,
	'data-testid': dataTestId,
}: TldrawUiContextMenuContentProps) {
	const container = useTldrawUiPortalContainer()

	return (
		<_ContextMenu.Portal container={container}>
			<TldrawUiPortalScope>
				<_ContextMenu.Content
					className={classNames('tl-menu', className)}
					alignOffset={alignOffset}
					collisionPadding={collisionPadding}
					aria-label={ariaLabel}
					data-testid={dataTestId}
				>
					{children}
				</_ContextMenu.Content>
			</TldrawUiPortalScope>
		</_ContextMenu.Portal>
	)
}
