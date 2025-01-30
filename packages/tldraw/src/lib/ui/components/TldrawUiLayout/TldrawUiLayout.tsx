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
	bottomLeft?: React.ReactNode
	bottomCenter?: React.ReactNode
	bottomRight?: React.ReactNode
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
	bottomLeft,
	bottomCenter,
	bottomRight,
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
	const bottomLeftRef = useRef<HTMLDivElement>(null)
	const bottomCenterRef = useRef<HTMLDivElement>(null)
	const bottomRightRef = useRef<HTMLDivElement>(null)

	const updateLayout = useEvent(() => {
		const container = containerRef.current!
		const topLeft = topLeftRef.current!
		const topCenter = topCenterRef.current!
		const topRight = topRightRef.current!
		const bottomLeft = bottomLeftRef.current!
		const bottomCenter = bottomCenterRef.current!
		const bottomRight = bottomRightRef.current!

		layout('x', container, [topLeft, topCenter, topRight], squishIndexes[squishTop])
		layout('x', container, [bottomLeft, bottomCenter, bottomRight], squishIndexes[squishBottom])
		layout('y', container, [topLeft, topCenter, topRight], squishIndexes[squishLeft])
		layout('y', container, [bottomLeft, bottomCenter, bottomRight], squishIndexes[squishRight])
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
		start: 'left',
		end: 'right',
	},
	y: {
		start: 'top',
		end: 'bottom',
	},
} as const

function layout(
	axis: 'x' | 'y',
	container: HTMLDivElement,
	elements: [HTMLDivElement, HTMLDivElement, HTMLDivElement],
	squishIndex: 0 | 1 | 2
) {
	const { start, end } = properties[axis]

	const [first, middle, last] = elements
}
