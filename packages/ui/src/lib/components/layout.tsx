import classNames from 'classnames'
import { Slot } from 'radix-ui'
import { HTMLAttributes, ReactNode, createContext, forwardRef, useContext } from 'react'

/** @public */
export interface TlOrientationContext {
	orientation: 'horizontal' | 'vertical'
	tooltipSide: 'top' | 'right' | 'bottom' | 'left'
}

const TlOrientationContext = createContext<TlOrientationContext>({
	orientation: 'horizontal',
	tooltipSide: 'bottom',
})

/** @public */
export interface TlOrientationProviderProps {
	children: ReactNode
	orientation: 'horizontal' | 'vertical'
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}

/** @public @react */
export function TlOrientationProvider({
	children,
	orientation,
	tooltipSide,
}: TlOrientationProviderProps) {
	const prevContext = useTlOrientation()
	const tooltipSideToUse =
		tooltipSide ??
		(orientation === prevContext.orientation
			? prevContext.tooltipSide
			: orientation === 'horizontal'
				? 'bottom'
				: 'right')

	return (
		<TlOrientationContext.Provider value={{ orientation, tooltipSide: tooltipSideToUse }}>
			{children}
		</TlOrientationContext.Provider>
	)
}

/** @public */
export function useTlOrientation(): TlOrientationContext {
	return useContext(TlOrientationContext)
}

/** @public */
export interface TlLayoutProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
	asChild?: boolean
}

/**
 * A row, usually of UI controls like buttons, select dropdown, checkboxes, etc.
 *
 * @public @react
 */
export const TlRow = forwardRef<HTMLDivElement, TlLayoutProps>(
	({ asChild, className, tooltipSide, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return (
			<TlOrientationProvider orientation="horizontal" tooltipSide={tooltipSide}>
				<Component ref={ref} className={classNames('tl-row', className)} {...props} />
			</TlOrientationProvider>
		)
	}
)

/**
 * A column, usually of UI controls like buttons, select dropdown, checkboxes, etc.
 *
 * @public @react
 */
export const TlColumn = forwardRef<HTMLDivElement, TlLayoutProps>(
	({ asChild, className, tooltipSide, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return (
			<TlOrientationProvider orientation="vertical" tooltipSide={tooltipSide}>
				<Component ref={ref} className={classNames('tl-column', className)} {...props} />
			</TlOrientationProvider>
		)
	}
)

/**
 * A tight grid 4 elements wide, usually of UI controls like buttons, select dropdown, checkboxes,
 * etc.
 *
 * @public @react
 */
export const TlGrid = forwardRef<HTMLDivElement, TlLayoutProps>(
	({ asChild, className, tooltipSide, ...props }, ref) => {
		const Component = asChild ? Slot.Root : 'div'
		return (
			<TlOrientationProvider orientation="horizontal" tooltipSide={tooltipSide}>
				<Component ref={ref} className={classNames('tl-grid', className)} {...props} />
			</TlOrientationProvider>
		)
	}
)
