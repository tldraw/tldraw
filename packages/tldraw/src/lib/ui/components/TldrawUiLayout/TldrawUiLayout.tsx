import { clamp } from '@tldraw/editor'
import classNames from 'classnames'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'

/** @public */
export type TldrawUiLayoutHorizontalPosition = 'left' | 'center' | 'right'

/** @public */
export type TldrawUiLayoutVerticalPosition = 'top' | 'center' | 'bottom'

/** @public */
export interface TldrawUiLayoutProps {
	topLeft?: React.ReactNode
	topCenter?: React.ReactNode
	topRight?: React.ReactNode
	centerLeft?: React.ReactNode
	centerRight?: React.ReactNode
	bottomLeft?: React.ReactNode
	bottomCenter?: React.ReactNode
	bottomRight?: React.ReactNode
	spacingPx?: number
	squishTop?: TldrawUiLayoutHorizontalPosition
	squishBottom?: TldrawUiLayoutHorizontalPosition
	squishLeft?: TldrawUiLayoutVerticalPosition
	squishRight?: TldrawUiLayoutVerticalPosition
	children?: React.ReactNode
}

/** @public @react */
export function TldrawUiLayout({
	topLeft,
	topCenter,
	topRight,
	centerLeft,
	centerRight,
	bottomLeft,
	bottomCenter,
	bottomRight,
	spacingPx = 8,
	squishTop = 'center',
	squishBottom = 'center',
	squishLeft = 'center',
	squishRight = 'top',
	children,
}: TldrawUiLayoutProps) {
	const breakpoint = useBreakpoint()

	const containerRef = useRef<HTMLDivElement>(null)
	const topLeftRef = useRef<HTMLDivElement>(null)
	const topCenterRef = useRef<HTMLDivElement>(null)
	const topRightRef = useRef<HTMLDivElement>(null)
	const centerLeftRef = useRef<HTMLDivElement>(null)
	const centerRightRef = useRef<HTMLDivElement>(null)
	const bottomLeftRef = useRef<HTMLDivElement>(null)
	const bottomCenterRef = useRef<HTMLDivElement>(null)
	const bottomRightRef = useRef<HTMLDivElement>(null)

	const updateLayout = useCallback(() => {
		const container = containerRef.current!
		const topLeft = topLeftRef.current!
		const topCenter = topCenterRef.current!
		const topRight = topRightRef.current!
		const centerLeft = centerLeftRef.current!
		const centerRight = centerRightRef.current!
		const bottomLeft = bottomLeftRef.current!
		const bottomCenter = bottomCenterRef.current!
		const bottomRight = bottomRightRef.current!

		const elements = [
			topLeft,
			topCenter,
			topRight,
			centerLeft,
			centerRight,
			bottomLeft,
			bottomCenter,
			bottomRight,
		]
		const rects = elements.map((element) => element.getBoundingClientRect())
		const containerRect = container.getBoundingClientRect()

		// we use this weird set up with indexes so that we can do all the measurements in one go,
		// then apply all the changes in one go. This prevents layout thrashing.
		const info = { spacingPx, containerRect, elements, rects }

		layout('x', [0, 1, 2], squishIndexes[squishTop], info)
		layout('x', [5, 6, 7], squishIndexes[squishBottom], info)
		layout('y', [0, 3, 5], squishIndexes[squishLeft], info)
		layout('y', [2, 4, 7], squishIndexes[squishRight], info)
	}, [spacingPx, squishTop, squishBottom, squishLeft, squishRight])

	useLayoutEffect(() => {
		const observer = new ResizeObserver(updateLayout)
		observer.observe(containerRef.current!)
		observer.observe(topLeftRef.current!)
		observer.observe(topCenterRef.current!)
		observer.observe(topRightRef.current!)
		observer.observe(centerLeftRef.current!)
		observer.observe(centerRightRef.current!)
		observer.observe(bottomLeftRef.current!)
		observer.observe(bottomCenterRef.current!)
		observer.observe(bottomRightRef.current!)

		updateLayout()

		return () => {
			observer.disconnect()
		}
	}, [updateLayout])

	return (
		<div
			ref={containerRef}
			className={classNames('tlui-layout', {
				'tlui-layout__mobile': breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM,
			})}
			data-breakpoint={breakpoint}
		>
			<div className="tlui-layout__top-left" ref={topLeftRef}>
				{topLeft}
			</div>
			<div className="tlui-layout__top-center" ref={topCenterRef}>
				{topCenter}
			</div>
			<div className="tlui-layout__top-right" ref={topRightRef}>
				{topRight}
			</div>
			<div className="tlui-layout__center-left" ref={centerLeftRef}>
				{centerLeft}
			</div>
			<div className="tlui-layout__center-right" ref={centerRightRef}>
				{centerRight}
			</div>
			<div className="tlui-layout__bottom-left" ref={bottomLeftRef}>
				{bottomLeft}
			</div>
			<div className="tlui-layout__bottom-center" ref={bottomCenterRef}>
				{bottomCenter}
			</div>
			<div className="tlui-layout__bottom-right" ref={bottomRightRef}>
				{bottomRight}
			</div>
			{children}
		</div>
	)
}

const squishIndexes = {
	left: 0,
	top: 0,
	center: 1,
	right: 2,
	bottom: 2,
} as const

const properties = {
	x: {
		size: 'width',
		maxSize: 'maxWidth',
		start: 'left',
	},
	y: {
		size: 'height',
		maxSize: 'maxHeight',
		start: 'top',
	},
} as const

function layout(
	axis: 'x' | 'y',
	elementIndexes: [number, number, number],
	squishIndex: 0 | 1 | 2,
	{
		spacingPx,
		containerRect,
		elements,
		rects,
	}: {
		spacingPx: number
		containerRect: DOMRect
		elements: HTMLDivElement[]
		rects: DOMRect[]
	}
) {
	const props = properties[axis]

	const squishingElementIndex = elementIndexes[squishIndex]
	const nonSquishingElementIndexes = elementIndexes.filter(
		(index) => index !== squishingElementIndex
	) as [number, number]

	const containerSize = containerRect[props.size]
	const nonSquishingSize =
		addSpaceIfNeeded(rects[nonSquishingElementIndexes[0]][props.size], spacingPx) +
		addSpaceIfNeeded(rects[nonSquishingElementIndexes[1]][props.size], spacingPx)

	const maxSquishingSize = containerSize - nonSquishingSize

	elements[squishingElementIndex].style[props.maxSize] = `${maxSquishingSize}px`

	const firstElementIndex = elementIndexes[0]
	const centerElementIndex = elementIndexes[1]

	const firstElementSize = rects[firstElementIndex][props.size]
	const lastElementSize = rects[nonSquishingElementIndexes[1]][props.size]
	const centerElementSize =
		centerElementIndex === squishingElementIndex
			? Math.min(rects[centerElementIndex][props.size], maxSquishingSize)
			: rects[centerElementIndex][props.size]

	const idealCenterPosition = (containerSize - centerElementSize) / 2
	const minCenterPosition = addSpaceIfNeeded(firstElementSize, spacingPx)
	const maxCenterPosition =
		containerSize -
		addSpaceIfNeeded(lastElementSize, spacingPx) -
		addSpaceIfNeeded(centerElementSize, spacingPx)
	const centerPosition = Math.round(
		clamp(idealCenterPosition, minCenterPosition, maxCenterPosition)
	)

	elements[centerElementIndex].style[props.start] = `${centerPosition}px`
}

function addSpaceIfNeeded(size: number, spacingPx: number) {
	return size === 0 ? 0 : size + spacingPx
}
