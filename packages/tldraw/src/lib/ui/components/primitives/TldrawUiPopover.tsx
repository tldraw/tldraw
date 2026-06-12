import { Popover as _Popover } from '@base-ui/react/popover'
import { useContainer } from '@tldraw/editor'
import classNames from 'classnames'
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

// Options that TldrawUiPopoverContent needs to communicate up to the root, where Base UI
// handles dismissal.
interface PopoverOptions {
	disableEscapeKeyDown: boolean
}

const PopoverOptionsContext = React.createContext<PopoverOptions | null>(null)

/** @public @react */
export function TldrawUiPopover({ id, children, onOpenChange, open, className }: TLUiPopoverProps) {
	const [isOpen, handleOpenChange] = useMenuIsOpen(id, onOpenChange)
	const [options] = React.useState<PopoverOptions>(() => ({ disableEscapeKeyDown: false }))

	const handleOpenChangeWithDetails = React.useCallback(
		(isOpen: boolean, eventDetails: _Popover.Root.ChangeEventDetails) => {
			if (!isOpen && eventDetails.reason === 'escape-key' && options.disableEscapeKeyDown) {
				eventDetails.cancel()
				return
			}
			handleOpenChange(isOpen)
		},
		[handleOpenChange, options]
	)

	return (
		<_Popover.Root
			onOpenChange={handleOpenChangeWithDetails}
			open={open || isOpen /* allow debugging */}
		>
			<PopoverOptionsContext.Provider value={options}>
				<div className={classNames('tlui-popover', className)}>{children}</div>
			</PopoverOptionsContext.Provider>
		</_Popover.Root>
	)
}

/** @public */
export interface TLUiPopoverTriggerProps {
	children?: React.ReactNode
}

/** @public @react */
export function TldrawUiPopoverTrigger({ children }: TLUiPopoverTriggerProps) {
	return <_Popover.Trigger render={children as React.ReactElement} />
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

	const options = React.useContext(PopoverOptionsContext)
	React.useEffect(() => {
		if (options) options.disableEscapeKeyDown = disableEscapeKeyDown
	}, [options, disableEscapeKeyDown])

	const handleInitialFocus = React.useCallback(() => {
		if (!autoFocusFirstButton) return true
		const buttons = (ref.current?.querySelectorAll('button:not([disabled])') ?? []) as HTMLElement[]
		const visibleButtons = [...buttons].filter(
			(button) => button.offsetWidth || button.offsetHeight
		)
		return visibleButtons[0] ?? true
	}, [autoFocusFirstButton])

	return (
		<_Popover.Portal container={container}>
			<_Popover.Positioner
				className="tlui-popover__positioner"
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
			>
				<_Popover.Popup
					className="tlui-popover__content"
					ref={ref}
					initialFocus={handleInitialFocus}
				>
					{children}
				</_Popover.Popup>
			</_Popover.Positioner>
		</_Popover.Portal>
	)
}
