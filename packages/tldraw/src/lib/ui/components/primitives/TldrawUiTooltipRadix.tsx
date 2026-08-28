import { getGlobalDocument, useMaybeEditor, useValue } from '@tldraw/editor'
import { Tooltip as _Tooltip } from 'radix-ui'
import React, { useEffect, useRef, useState } from 'react'
import { useDirection } from '../../hooks/useTranslation/useTranslation'
import { hideAllTooltips, tooltipManager } from './TldrawUiTooltip'

// Everything that touches radix lives in this module, which TldrawUiTooltip loads lazily at
// render time. Importing radix at module scope would pull the react-remove-scroll graph into
// every consumer of the shape utils — including headless Node processes that never render.

/** @internal */
export function TooltipSingletonHost() {
	return (
		<_Tooltip.Provider skipDelayDuration={700}>
			<TooltipSingleton />
		</_Tooltip.Provider>
	)
}

// The singleton tooltip component that renders once
function TooltipSingleton() {
	const [isOpen, setIsOpen] = useState(false)
	const triggerRef = useRef<HTMLDivElement>(null)
	const isFirstShowRef = useRef(true)
	const editor = useMaybeEditor()
	const dir = useDirection()

	const currentTooltip = useValue(
		'current tooltip',
		() => tooltipManager.getCurrentTooltipData(),
		[]
	)

	const cameraState = useValue('camera state', () => editor?.getCameraState(), [editor])

	// Hide tooltip when camera is moving (panning/zooming)
	useEffect(() => {
		if (cameraState === 'moving' && isOpen && currentTooltip) {
			tooltipManager.handleEvent({
				type: 'hide',
				tooltipId: currentTooltip.id,
				editor,
				instant: true,
			})
		}
	}, [cameraState, isOpen, currentTooltip, editor])

	useEffect(() => {
		const doc = editor?.getContainerDocument() ?? getGlobalDocument()
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape' && currentTooltip && isOpen) {
				hideAllTooltips()
				event.stopPropagation()
			}
		}

		doc.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			doc.removeEventListener('keydown', handleKeyDown, { capture: true })
		}
	}, [editor, currentTooltip, isOpen])

	// Hide tooltip and prevent new ones from opening while pointer is down
	useEffect(() => {
		const doc = editor?.getContainerDocument() ?? getGlobalDocument()
		function handlePointerDown() {
			tooltipManager.handleEvent({ type: 'pointer_down' })
		}

		function handlePointerUp() {
			tooltipManager.handleEvent({ type: 'pointer_up' })
		}

		doc.addEventListener('pointerdown', handlePointerDown, { capture: true })
		doc.addEventListener('pointerup', handlePointerUp, { capture: true })
		doc.addEventListener('pointercancel', handlePointerUp, { capture: true })
		return () => {
			doc.removeEventListener('pointerdown', handlePointerDown, { capture: true })
			doc.removeEventListener('pointerup', handlePointerUp, { capture: true })
			doc.removeEventListener('pointercancel', handlePointerUp, { capture: true })
			// Reset pointer state on unmount to prevent stuck state
			tooltipManager.handleEvent({ type: 'pointer_up' })
		}
	}, [editor])

	// Update open state and trigger position
	useEffect(() => {
		// eslint-disable-next-line no-restricted-globals
		let timer: ReturnType<typeof setTimeout> | null = null
		if (currentTooltip && triggerRef.current) {
			// Position the invisible trigger element over the active element
			const activeRect = currentTooltip.targetElement.getBoundingClientRect()
			const trigger = triggerRef.current

			trigger.style.position = 'fixed'
			trigger.style.left = '0px'
			trigger.style.top = '0px'
			const cbOffset = trigger.getBoundingClientRect()

			trigger.style.left = `${activeRect.left - cbOffset.left}px`
			trigger.style.top = `${activeRect.top - cbOffset.top}px`

			trigger.style.width = `${activeRect.width}px`
			trigger.style.height = `${activeRect.height}px`
			trigger.style.pointerEvents = 'none'
			trigger.style.zIndex = '9999'

			// Handle delay for first show
			if (isFirstShowRef.current) {
				// eslint-disable-next-line no-restricted-globals
				timer = setTimeout(() => {
					setIsOpen(true)
					isFirstShowRef.current = false
				}, currentTooltip.delayDuration)
			} else {
				// Subsequent tooltips show immediately
				setIsOpen(true)
			}
		} else {
			// Hide tooltip immediately
			setIsOpen(false)
			// Reset first show state after tooltip is hidden
			isFirstShowRef.current = true
		}

		return () => {
			if (timer !== null) {
				clearTimeout(timer)
			}
		}
	}, [currentTooltip])

	if (!currentTooltip) {
		return null
	}

	return (
		<_Tooltip.Root open={isOpen} delayDuration={0}>
			<_Tooltip.Trigger asChild>
				<div ref={triggerRef} />
			</_Tooltip.Trigger>
			<_Tooltip.Content
				className="tlui-tooltip"
				side={currentTooltip.side}
				sideOffset={currentTooltip.sideOffset}
				avoidCollisions
				collisionPadding={8}
				dir={dir}
			>
				{currentTooltip.content}
				<_Tooltip.Arrow className="tlui-tooltip__arrow" />
			</_Tooltip.Content>
		</_Tooltip.Root>
	)
}

/** @internal */
export interface FallbackTooltipProps {
	children: React.ReactNode
	content: React.ReactNode
	side: 'top' | 'right' | 'bottom' | 'left'
	sideOffset: number
	dir: 'ltr' | 'rtl'
	delayDuration: number
	enhancedA11yMode: boolean | undefined
	triggerRef: React.ForwardedRef<HTMLButtonElement>
}

/**
 * The standalone (non-singleton) tooltip, used when no TldrawUiTooltipProvider is present or
 * in enhanced accessibility mode.
 *
 * @internal
 */
export function FallbackTooltip({
	children,
	content,
	side,
	sideOffset,
	dir,
	delayDuration,
	enhancedA11yMode,
	triggerRef,
}: FallbackTooltipProps) {
	return (
		// Local provider: radix's Tooltip.Root throws without one, and the app-level provider now
		// wraps only the singleton — this branch (enhanced a11y, or no provider at all) is on its own.
		<_Tooltip.Provider>
			<_Tooltip.Root delayDuration={delayDuration} disableHoverableContent={!enhancedA11yMode}>
				<_Tooltip.Trigger asChild ref={triggerRef}>
					{children}
				</_Tooltip.Trigger>
				<_Tooltip.Content
					className="tlui-tooltip"
					side={side}
					sideOffset={sideOffset}
					avoidCollisions
					collisionPadding={8}
					dir={dir}
				>
					{content}
					<_Tooltip.Arrow className="tlui-tooltip__arrow" />
				</_Tooltip.Content>
			</_Tooltip.Root>
		</_Tooltip.Provider>
	)
}
