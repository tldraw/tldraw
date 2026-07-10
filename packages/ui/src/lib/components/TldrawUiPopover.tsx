import classNames from 'classnames'
import { Popover as _Popover } from 'radix-ui'
import React from 'react'
import { useTldrawUiMenuIsOpen } from '../context/menu-state'
import { TldrawUiPortalScope, useTldrawUiPortalContainer } from '../context/portal'
import { useTldrawUiTranslation } from '../context/translation'

/** @public */
export interface TldrawUiPopoverProps {
	id: string
	open?: boolean
	children: React.ReactNode
	onOpenChange?(isOpen: boolean): void
	className?: string
}

/** @public @react */
export function TldrawUiPopover({
	id,
	children,
	onOpenChange,
	open,
	className,
}: TldrawUiPopoverProps) {
	const [isOpen, setOpen] = useTldrawUiMenuIsOpen(id)

	const handleOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen)
			onOpenChange?.(nextOpen)
		},
		[setOpen, onOpenChange]
	)

	const resolvedOpen = open !== undefined ? open : isOpen

	return (
		<_Popover.Root onOpenChange={handleOpenChange} open={resolvedOpen}>
			<div className={classNames('tl-popover', className)}>{children}</div>
		</_Popover.Root>
	)
}

/** @public */
export interface TldrawUiPopoverTriggerProps {
	children?: React.ReactNode
}

/** @public @react */
export function TldrawUiPopoverTrigger({ children }: TldrawUiPopoverTriggerProps) {
	const { dir } = useTldrawUiTranslation()

	return (
		<_Popover.Trigger asChild dir={dir}>
			{children}
		</_Popover.Trigger>
	)
}

/** @public */
export interface TldrawUiPopoverContentProps {
	children: React.ReactNode
	side: 'top' | 'bottom' | 'left' | 'right'
	align?: 'start' | 'center' | 'end'
	alignOffset?: number
	sideOffset?: number
	className?: string
	/**
	 * Minimum distance to keep between the popover and the viewport edge before it
	 * shifts to stay in view. Defaults to Radix's `0`.
	 */
	collisionPadding?: number
	disableEscapeKeyDown?: boolean
	autoFocusFirstButton?: boolean
}

/** @public @react */
export function TldrawUiPopoverContent({
	side,
	children,
	align = 'center',
	sideOffset = 8,
	alignOffset = 0,
	className,
	collisionPadding,
	disableEscapeKeyDown = false,
	autoFocusFirstButton = true,
}: TldrawUiPopoverContentProps) {
	const container = useTldrawUiPortalContainer()
	const { dir } = useTldrawUiTranslation()
	const ref = React.useRef<HTMLDivElement>(null)

	const handleOpenAutoFocus = React.useCallback(() => {
		if (!autoFocusFirstButton) return
		const buttons = (ref.current?.querySelectorAll('button:not([disabled])') ?? []) as HTMLElement[]
		const visibleButtons = [...buttons].filter(
			(button) => button.offsetWidth || button.offsetHeight
		)
		const firstButton = visibleButtons[0]
		if (firstButton) firstButton.focus()
	}, [autoFocusFirstButton])

	return (
		<_Popover.Portal container={container}>
			<TldrawUiPortalScope>
				<_Popover.Content
					className={classNames('tl-popover__content', className)}
					side={side}
					sideOffset={sideOffset}
					align={align}
					alignOffset={alignOffset}
					collisionPadding={collisionPadding}
					dir={dir}
					ref={ref}
					onOpenAutoFocus={handleOpenAutoFocus}
					onEscapeKeyDown={(e) => disableEscapeKeyDown && e.preventDefault()}
				>
					{children}
				</_Popover.Content>
			</TldrawUiPortalScope>
		</_Popover.Portal>
	)
}
