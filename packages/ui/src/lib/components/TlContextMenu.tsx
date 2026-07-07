import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { ReactNode } from 'react'
import { useTlPortalContainer } from '../context/portal'
import { useTlTranslation } from '../context/translation'

/** @public */
export interface TlContextMenuRootProps {
	children: ReactNode
	modal?: boolean
	onOpenChange?(open: boolean): void
}

/** @public @react */
export function TlContextMenuRoot({
	children,
	modal = false,
	onOpenChange,
}: TlContextMenuRootProps) {
	const { dir } = useTlTranslation()

	return (
		<_ContextMenu.Root dir={dir} modal={modal} onOpenChange={onOpenChange}>
			{children}
		</_ContextMenu.Root>
	)
}

/** @public */
export interface TlContextMenuTriggerProps {
	children: ReactNode
	disabled?: boolean
}

/** @public @react */
export function TlContextMenuTrigger({ children, disabled }: TlContextMenuTriggerProps) {
	return (
		<_ContextMenu.Trigger asChild disabled={disabled}>
			{children}
		</_ContextMenu.Trigger>
	)
}

/** @public */
export interface TlContextMenuContentProps {
	children: ReactNode
	className?: string
	alignOffset?: number
	collisionPadding?: number
	'aria-label'?: string
	'data-testid'?: string
}

/** @public @react */
export function TlContextMenuContent({
	children,
	className,
	alignOffset = -4,
	collisionPadding = 4,
	'aria-label': ariaLabel,
	'data-testid': dataTestId,
}: TlContextMenuContentProps) {
	const container = useTlPortalContainer()

	return (
		<_ContextMenu.Portal container={container}>
			<_ContextMenu.Content
				className={classNames('tl-menu', className)}
				alignOffset={alignOffset}
				collisionPadding={collisionPadding}
				aria-label={ariaLabel}
				data-testid={dataTestId}
			>
				{children}
			</_ContextMenu.Content>
		</_ContextMenu.Portal>
	)
}
