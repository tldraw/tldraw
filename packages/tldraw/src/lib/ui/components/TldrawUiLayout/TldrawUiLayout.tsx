import { useEvent } from '@tldraw/editor'
import classNames from 'classnames'
import { useLayoutEffect, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'

export type HorizontalSquish = 'left' | 'center' | 'right'
export type VerticalSquish = 'top' | 'center' | 'bottom'

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
	squishTop?: HorizontalSquish
	squishBottom?: HorizontalSquish
	squishLeft?: VerticalSquish
	squishRight?: VerticalSquish
	children?: React.ReactNode
}

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

	const updateLayout = useEvent(() => {
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

		const info = { spacingPx, container, containerRect, elements, rects }

		layout('x', [0, 1, 2], squishIndexes[squishTop], info)
		layout('x', [5, 6, 7], squishIndexes[squishBottom], info)
		layout('y', [0, 3, 5], squishIndexes[squishLeft], info)
		layout('y', [2, 4, 7], squishIndexes[squishRight], info)
	})

	useLayoutEffect(() => {
		const observer = new ResizeObserver(updateLayout)
		observer.observe(topLeftRef.current!)
		observer.observe(topCenterRef.current!)
		observer.observe(topRightRef.current!)
		observer.observe(bottomLeftRef.current!)
		observer.observe(bottomCenterRef.current!)
		observer.observe(bottomRightRef.current!)
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
			<div className="tlui-layout__topLeft" ref={topLeftRef}>
				{topLeft}
			</div>
			<div className="tlui-layout__topCenter" ref={topCenterRef}>
				{topCenter}
			</div>
			<div className="tlui-layout__topRight" ref={topRightRef}>
				{topRight}
			</div>
			<div className="tlui-layout__bottomLeft" ref={bottomLeftRef}>
				{bottomLeft}
			</div>
			<div className="tlui-layout__bottomCenter" ref={bottomCenterRef}>
				{bottomCenter}
			</div>
			<div className="tlui-layout__bottomRight" ref={bottomRightRef}>
				{bottomRight}
			</div>
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
		end: 'right',
	},
	y: {
		size: 'height',
		maxSize: 'maxHeight',
		start: 'top',
		end: 'bottom',
	},
} as const

function layout(
	axis: 'x' | 'y',
	elementIndexes: [number, number, number],
	squishIndex: 0 | 1 | 2,
	{
		spacingPx,
		container,
		containerRect,
		elements,
		rects,
	}: {
		spacingPx: number
		container: HTMLDivElement
		containerRect: DOMRect
		elements: HTMLDivElement[]
		rects: DOMRect[]
	}
) {
	const props = properties[axis]

	const squishingElementIndex = elementIndexes[squishIndex]
	const nonSquishingElementIndexes = elementIndexes.filter((index) => index !== squishIndex) as [
		number,
		number,
	]

	const totalSize = containerRect[props.size]
	const nonSquishingSize =
		rects[nonSquishingElementIndexes[0]][props.size] +
		rects[nonSquishingElementIndexes[1]][props.size]

	const maxSquishingSize = totalSize - nonSquishingSize
	const currentSquishingSize = Math.min(rects[squishingElementIndex][props.size], maxSquishingSize)

	container.style[props.maxSize] = `${maxSquishingSize}px`
}
