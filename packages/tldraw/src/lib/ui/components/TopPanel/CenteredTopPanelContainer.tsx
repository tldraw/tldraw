import { ReactNode, useCallback, useLayoutEffect, useRef } from 'react'
import { useBreakpoint } from '../../context/breakpoints'

/** @public */
export interface CenteredTopPanelContainerProps {
	children: ReactNode
	maxWidth?: number
	ignoreRightWidth?: number
	stylePanelWidth?: number
	marginBetweenZones?: number
	squeezeAmount?: number
}

/** @public @react */
export function CenteredTopPanelContainer({
	maxWidth = 420,
	ignoreRightWidth = 0,
	stylePanelWidth = 148,
	marginBetweenZones = 12,
	squeezeAmount = 52,
	children,
}: CenteredTopPanelContainerProps) {
	const ref = useRef<HTMLDivElement>(null)
	const breakpoint = useBreakpoint()

	const updateLayout = useCallback(() => {
		const element = ref.current
		if (!element) return

		const layoutTop = element.parentElement!.parentElement!
		const leftPanel = layoutTop.querySelector('.tlui-layout__top__left')! as HTMLElement
		const rightPanel = layoutTop.querySelector('.tlui-layout__top__right')! as HTMLElement

		const totalWidth = layoutTop.offsetWidth
		const leftWidth = leftPanel.offsetWidth
		const rightWidth = rightPanel.offsetWidth

		// Ignore button width
		const selfWidth = element.offsetWidth - ignoreRightWidth

		let xCoordIfCentered = (totalWidth - selfWidth) / 2

		// Prevent subpixel bullsh
		if (totalWidth % 2 !== 0) {
			xCoordIfCentered -= 0.5
		}

		const xCoordIfLeftAligned = leftWidth + marginBetweenZones

		const left = element.offsetLeft
		const maxWidthProperty = Math.min(
			totalWidth - rightWidth - leftWidth - 2 * marginBetweenZones,
			maxWidth
		)
		const xCoord = Math.max(xCoordIfCentered, xCoordIfLeftAligned) - left

		// Squeeze the title if the right panel is too wide on small screens
		if (rightPanel.offsetWidth > stylePanelWidth && breakpoint <= 6) {
			element.style.setProperty('max-width', maxWidthProperty - squeezeAmount + 'px')
		} else {
			element.style.setProperty('max-width', maxWidthProperty + 'px')
		}
		element.style.setProperty('transform', `translate(${xCoord}px, 0px)`)
	}, [breakpoint, ignoreRightWidth, marginBetweenZones, maxWidth, squeezeAmount, stylePanelWidth])

	useLayoutEffect(() => {
		const element = ref.current
		if (!element) return

		const layoutTop = element.parentElement!.parentElement!
		const leftPanel = layoutTop.querySelector('.tlui-layout__top__left')! as HTMLElement
		const rightPanel = layoutTop.querySelector('.tlui-layout__top__right')! as HTMLElement

		// Update layout when the things change
		const observer = new ResizeObserver(updateLayout)
		observer.observe(leftPanel)
		observer.observe(rightPanel)
		observer.observe(layoutTop)
		observer.observe(element)

		// Also update on first layout
		updateLayout()

		return () => {
			observer.disconnect()
		}
	}, [updateLayout])

	// Update after every render, too
	useLayoutEffect(() => {
		updateLayout()
	})

	return (
		<div ref={ref} className="tlui-top-panel__container">
			{children}
		</div>
	)
}
