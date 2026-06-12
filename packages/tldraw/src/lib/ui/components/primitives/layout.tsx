import { useRender } from '@base-ui/react/use-render'
import classNames from 'classnames'
import {
	HTMLAttributes,
	ReactElement,
	ReactNode,
	Ref,
	createContext,
	forwardRef,
	useContext,
} from 'react'

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

// When `asChild` is set, the single child element is rendered with the layout props merged
// onto it (the Radix Slot pattern, implemented with Base UI's useRender).
function useLayoutElement(
	layoutClassName: string,
	{ asChild, className, children, ...props }: Omit<TLUiLayoutProps, 'tooltipSide'>,
	ref: Ref<HTMLDivElement>
) {
	const mergedProps: Record<string, unknown> = {
		...props,
		className: classNames(layoutClassName, className),
	}
	if (!asChild) mergedProps.children = children
	return useRender({
		render: asChild ? (children as ReactElement) : undefined,
		ref,
		props: mergedProps,
	})
}

/**
 * A row, usually of UI controls like buttons, select dropdown, checkboxes, etc.
 *
 * @public @react
 */
export const TldrawUiRow = forwardRef<HTMLDivElement, TLUiLayoutProps>(
	({ tooltipSide, ...props }, ref) => {
		const element = useLayoutElement('tlui-row', props, ref)
		return (
			<TldrawUiOrientationProvider orientation="horizontal" tooltipSide={tooltipSide}>
				{element}
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
	({ tooltipSide, ...props }, ref) => {
		const element = useLayoutElement('tlui-column', props, ref)
		return (
			<TldrawUiOrientationProvider orientation="vertical" tooltipSide={tooltipSide}>
				{element}
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
	({ tooltipSide, ...props }, ref) => {
		const element = useLayoutElement('tlui-grid', props, ref)
		return (
			<TldrawUiOrientationProvider orientation="horizontal" tooltipSide={tooltipSide}>
				{element}
			</TldrawUiOrientationProvider>
		)
	}
)
