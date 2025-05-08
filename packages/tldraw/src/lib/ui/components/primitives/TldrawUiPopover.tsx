import { useContainer } from '@tldraw/editor'
import { Popover as _Popover } from 'radix-ui'
import React from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'

/** @public */
export interface TLUiPopoverProps {
	id: string
	open?: boolean
	children: React.ReactNode
	onOpenChange?(isOpen: boolean): void
}

/** @public @react */
export function TldrawUiPopover({ id, children, onOpenChange, open }: TLUiPopoverProps) {
	const [isOpen, handleOpenChange] = useMenuIsOpen(id, onOpenChange)

	return (
		<_Popover.Root onOpenChange={handleOpenChange} open={open || isOpen /* allow debugging */}>
			<div className="tlui-popover">{children}</div>
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
}

/** @public @react */
export function TldrawUiPopoverContent({
	side,
	children,
	align = 'center',
	sideOffset = 8,
	alignOffset = 0,
	disableEscapeKeyDown = false,
}: TLUiPopoverContentProps) {
	const container = useContainer()
	return (
		<_Popover.Portal container={container}>
			<_Popover.Content
				className="tlui-popover__content"
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				dir="ltr"
				onEscapeKeyDown={(e) => disableEscapeKeyDown && e.preventDefault()}
			>
				{children}
				{/* <StyledArrow /> */}
			</_Popover.Content>
		</_Popover.Portal>
	)
}
