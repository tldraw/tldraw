import classNames from 'classnames'
import { Slot } from 'radix-ui'
import { HTMLAttributes, ReactNode, createContext, forwardRef, useContext } from 'react'

/** @public */
export interface TldrawUiOrientationContext {
	orientation: 'horizontal' | 'vertical'
	tooltipSide: 'top' | 'right' | 'bottom' | 'left'
}

const TldrawUiOrientationContext = createContext<TldrawUiOrientationContext>({
	orientation: 'horizontal',
	tooltipSide: 'bottom',
})

/** @public */
export interface TldrawUiOrientationProviderProps {
	children: ReactNode
	orientation: 'horizontal' | 'vertical'
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}
/** @public @react */
export function TldrawUiOrientationProvider({
	children,
	orientation,
	tooltipSide,
}: TldrawUiOrientationProviderProps) {
	const prevContext = useTldrawUiOrientation()
	// generally, we want tooltip side to cascade down through the layout - apart from when the
	// orientation changes. If the tooltip side is "bottom", and then I include some vertical layout
	// elements, keeping the tooltip side as bottom will cause the tooltip to overlap elements
	// stacked on top of each other. In the absence of a tooltip side, we pick a default side based
	// on the orientation whenever the orientation changes.
	const tooltipSideToUse =
		tooltipSide ??
		(orientation === prevContext.orientation
			? prevContext.tooltipSide
			: orientation === 'horizontal'
				? 'bottom'
				: 'right')

	return (
		<TldrawUiOrientationContext.Provider value={{ orientation, tooltipSide: tooltipSideToUse }}>
			{children}
		</TldrawUiOrientationContext.Provider>
	)
}

/** @public */
export function useTldrawUiOrientation() {
	return useContext(TldrawUiOrientationContext)
}

/** @public */
export interface TLUiLayoutProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
	asChild?: boolean
}

/**
 * A row, usually of UI controls like buttons, select dropdown, checkboxes, etc.
 *
 * @public @react
 */
export const TldrawUiRow = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ asChild, className, tooltipSide, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return (
			<TldrawUiOrientationProvider orientation="horizontal" tooltipSide={tooltipSide}>
				<Component ref={ref} className={classNames('tlui-row', className)} {...props} />
			</TldrawUiOrientationProvider>
		)
	}
)

/**
 * A column, usually of UI controls like buttons, select dropdown, checkboxes, etc.
 *
 * @public @react
 */
export const TldrawUiColumn = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ asChild, className, tooltipSide, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return (
			<TldrawUiOrientationProvider orientation="vertical" tooltipSide={tooltipSide}>
				<Component ref={ref} className={classNames('tlui-column', className)} {...props} />
			</TldrawUiOrientationProvider>
		)
	}
)

/**
 * A tight grid 4 elements wide, usually of UI controls like buttons, select dropdown, checkboxes,
 * etc.
 *
 * @public @react */
export const TldrawUiGrid = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ asChild, className, tooltipSide, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return (
			<TldrawUiOrientationProvider orientation="horizontal" tooltipSide={tooltipSide}>
				<Component ref={ref} className={classNames('tlui-grid', className)} {...props} />
			</TldrawUiOrientationProvider>
		)
	}
)
