import * as PopoverPrimitive from '@radix-ui/react-popover'
import { useContainer } from '@tldraw/editor'
import React from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'

/** @public */
export interface TLUiPopoverProps {
	id: string
	open?: boolean
	children: React.ReactNode
	onOpenChange?: (isOpen: boolean) => void
}

/** @public */
export function TldrawUiPopover({ id, children, onOpenChange, open }: TLUiPopoverProps) {
	const [isOpen, handleOpenChange] = useMenuIsOpen(id, onOpenChange)

	return (
		<PopoverPrimitive.Root
			onOpenChange={handleOpenChange}
			open={open || isOpen /* allow debugging */}
		>
			<div className="tlui-popover">{children}</div>
		</PopoverPrimitive.Root>
	)
}

/** @public */
export interface TLUiPopoverTriggerProps {
	children?: React.ReactNode
}

/** @public */
export function TldrawUiPopoverTrigger({ children }: TLUiPopoverTriggerProps) {
	return (
		<PopoverPrimitive.Trigger asChild dir="ltr">
			{children}
		</PopoverPrimitive.Trigger>
	)
}

/** @public */
export interface TLUiPopoverContentProps {
	children: React.ReactNode
	side: 'top' | 'bottom' | 'left' | 'right'
	align?: 'start' | 'center' | 'end'
	alignOffset?: number
	sideOffset?: number
}

/** @public */
export function TldrawUiPopoverContent({
	side,
	children,
	align = 'center',
	sideOffset = 8,
	alignOffset = 0,
}: TLUiPopoverContentProps) {
	const container = useContainer()
	return (
		<PopoverPrimitive.Portal container={container}>
			<PopoverPrimitive.Content
				className="tlui-popover__content"
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				dir="ltr"
			>
				{children}
				{/* <StyledArrow /> */}
			</PopoverPrimitive.Content>
		</PopoverPrimitive.Portal>
	)
}
