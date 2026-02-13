import { useContainer } from '@tldraw/editor'
import classNames from 'classnames'
import { Popover as _Popover } from 'radix-ui'
import React from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'

/** @public */
export interface TLUiPopoverProps {
	id: string
	open?: boolean
	children: React.ReactNode
	onOpenChange?(isOpen: boolean): void
	className?: string
}

/** @public @react */
export function TldrawUiPopover({ id, children, onOpenChange, open, className }: TLUiPopoverProps) {
	const [isOpen, handleOpenChange] = useMenuIsOpen(id, onOpenChange)

	return (
		<_Popover.Root onOpenChange={handleOpenChange} open={open || isOpen /* allow debugging */}>
			<div className={classNames('tlui-popover', className)}>{children}</div>
		</_Popover.Root>
	)
}

/** @public */
export interface TLUiPopoverTriggerProps {
	children?: React.ReactNode
}

/** @public @react */
export function TldrawUiPopoverTrigger({ children }: TLUiPopoverTriggerProps) {
	return (
		<_Popover.Trigger asChild dir="ltr">
			{children}
		</_Popover.Trigger>
	)
}

/** @public */
export interface TLUiPopoverContentProps {
	children: React.ReactNode
	side: 'top' | 'bottom' | 'left' | 'right'
	align?: 'start' | 'center' | 'end'
	alignOffset?: number
	sideOffset?: number
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
	disableEscapeKeyDown = false,
	autoFocusFirstButton = true,
}: TLUiPopoverContentProps) {
	const container = useContainer()
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
			<_Popover.Content
				className="tlui-popover__content"
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				dir="ltr"
				ref={ref}
				onOpenAutoFocus={handleOpenAutoFocus}
				onEscapeKeyDown={(e) => disableEscapeKeyDown && e.preventDefault()}
			>
				{children}
				{/* <StyledArrow /> */}
			</_Popover.Content>
		</_Popover.Portal>
	)
}
