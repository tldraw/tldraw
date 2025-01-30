import { useEvent } from '@tldraw/editor'
import { useLayoutEffect, useRef } from 'react'

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
	const topLeftRef = useRef<HTMLDivElement>(null)
	const topCenterRef = useRef<HTMLDivElement>(null)
	const topRightRef = useRef<HTMLDivElement>(null)
	const bottomLeftRef = useRef<HTMLDivElement>(null)
	const bottomCenterRef = useRef<HTMLDivElement>(null)
	const bottomRightRef = useRef<HTMLDivElement>(null)

	const updateLayout = useEvent(() => {
		const topLeft = topLeftRef.current!
		const topCenter = topCenterRef.current!
		const topRight = topRightRef.current!
		const bottomLeft = bottomLeftRef.current!
		const bottomCenter = bottomCenterRef.current!
		const bottomRight = bottomRightRef.current!

		layoutX([topLeft, topCenter, topRight], squishTop)
		layoutX([bottomLeft, bottomCenter, bottomRight], squishBottom)
		layoutY([topLeft, topCenter, topRight], squishLeft)
		layoutY([bottomLeft, bottomCenter, bottomRight], squishRight)
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
		<div className="tlui-layout">
			<div className="tlui-layout__top__left" ref={topLeftRef}>
				{topLeft}
			</div>
			<div className="tlui-layout__top__center" ref={topCenterRef}>
				{topCenter}
			</div>
			<div className="tlui-layout__top__right" ref={topRightRef}>
				{topRight}
			</div>
			<div className="tlui-layout__bottom__left" ref={bottomLeftRef}>
				{bottomLeft}
			</div>
			<div className="tlui-layout__bottom__center" ref={bottomCenterRef}>
				{bottomCenter}
			</div>
			<div className="tlui-layout__bottom__right" ref={bottomRightRef}>
				{bottomRight}
			</div>
		</div>
	)
}

const indexes = {
	left: 0,
	top: 0,
	center: 1,
	right: 2,
	bottom: 2,
} as const

function layoutX(
	elements: [HTMLDivElement, HTMLDivElement, HTMLDivElement],
	squish: HorizontalSquish
) {
	layout('x', elements, indexes[squish])
}

function layoutY(
	elements: [HTMLDivElement, HTMLDivElement, HTMLDivElement],
	squish: VerticalSquish
) {
	layout('y', elements, indexes[squish])
}

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
	elements: [HTMLDivElement, HTMLDivElement, HTMLDivElement],
	squishIndex: 0 | 1 | 2
) {
	const { start, end } = properties[axis]
}
