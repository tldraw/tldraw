import * as PopoverPrimitive from '@radix-ui/react-popover'
import { useContainer } from '@tldraw/editor'
import React, { FC } from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'

type PopoverProps = {
	id: string
	open?: boolean
	children: React.ReactNode
	onOpenChange?: (isOpen: boolean) => void
}

export const Popover: FC<PopoverProps> = ({ id, children, onOpenChange, open }) => {
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

export const PopoverTrigger: FC<{
	children: React.ReactNode
	disabled?: boolean
	className?: string
	'data-testid'?: string
}> = ({ children, disabled, 'data-testid': testId }) => {
	return (
		<PopoverPrimitive.Trigger data-testid={testId} disabled={disabled} asChild dir="ltr">
			{children}
		</PopoverPrimitive.Trigger>
	)
}
export const PopoverContent: FC<{
	children: React.ReactNode
	side: 'top' | 'bottom' | 'left' | 'right'
	align?: 'start' | 'center' | 'end'
	alignOffset?: number
	sideOffset?: number
}> = ({ side, children, align = 'center', sideOffset = 8, alignOffset = 0 }) => {
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
