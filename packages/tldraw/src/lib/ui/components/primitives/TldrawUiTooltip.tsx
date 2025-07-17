import { Editor, uniqueId, useEditor, useMaybeEditor, useValue, Vec } from '@tldraw/editor'
import { Tooltip as _Tooltip } from 'radix-ui'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

/** @public */
export interface TldrawUiTooltipProps {
	children: React.ReactNode
	content?: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	sideOffset?: number
	disabled?: boolean
}

// Singleton tooltip manager
class TooltipManager {
	private static instance: TooltipManager | null = null
	private currentTooltipId: string | null = null
	private currentContent: string = ''
	private currentSide: 'top' | 'right' | 'bottom' | 'left' = 'bottom'
	private currentSideOffset: number = 5
	private destroyTimeoutId: number | null = null
	private subscribers: Set<() => void> = new Set()
	private activeElement: HTMLElement | null = null
	private editor: Editor | null = null

	static getInstance(): TooltipManager {
		if (!TooltipManager.instance) {
			TooltipManager.instance = new TooltipManager()
		}
		return TooltipManager.instance
	}

	setEditor(editor: Editor | null) {
		this.editor = editor
	}

	subscribe(callback: () => void): () => void {
		this.subscribers.add(callback)
		return () => this.subscribers.delete(callback)
	}

	private notify() {
		this.subscribers.forEach((callback) => callback())
	}

	showTooltip(
		tooltipId: string,
		content: string,
		element: HTMLElement,
		side: 'top' | 'right' | 'bottom' | 'left' = 'bottom',
		sideOffset: number = 5
	) {
		// Clear any existing destroy timeout
		if (this.destroyTimeoutId) {
			clearTimeout(this.destroyTimeoutId)
			this.destroyTimeoutId = null
		}

		// Update current tooltip
		this.currentTooltipId = tooltipId
		this.currentContent = content
		this.currentSide = side
		this.currentSideOffset = sideOffset
		this.activeElement = element

		this.notify()
	}

	hideTooltip(tooltipId: string) {
		// Only hide if this is the current tooltip
		if (this.currentTooltipId === tooltipId) {
			// Start destroy timeout (1 second)
			if (this.editor) {
				this.destroyTimeoutId = this.editor.timers.setTimeout(() => {
					this.currentTooltipId = null
					this.currentContent = ''
					this.activeElement = null
					this.destroyTimeoutId = null
					this.notify()
				}, 300)
			}
		}
	}

	getCurrentTooltipData() {
		return {
			id: this.currentTooltipId,
			content: this.currentContent,
			side: this.currentSide,
			sideOffset: this.currentSideOffset,
			element: this.activeElement,
		}
	}
}

const tooltipManager = TooltipManager.getInstance()

// Context for the tooltip singleton
const TooltipSingletonContext = createContext<boolean>(false)

/** @public */
export interface TldrawUiTooltipProviderProps {
	children: React.ReactNode
}

/** @public @react */
export function TldrawUiTooltipProvider({ children }: TldrawUiTooltipProviderProps) {
	return (
		<_Tooltip.Provider skipDelayDuration={700}>
			<TooltipSingletonContext.Provider value={true}>
				{children}
				<TooltipSingleton />
			</TooltipSingletonContext.Provider>
		</_Tooltip.Provider>
	)
}

// The singleton tooltip component that renders once
function TooltipSingleton() {
	const editor = useMaybeEditor()
	const [, forceUpdate] = useState({})
	const [isOpen, setIsOpen] = useState(false)
	const triggerRef = useRef<HTMLDivElement>(null)
	const previousPositionRef = useRef<{ x: number; y: number } | null>(null)
	const [shouldAnimate, setShouldAnimate] = useState(false)
	const isFirstShowRef = useRef(true)
	const showTimeoutRef = useRef<number | null>(null)

	// Set editor in tooltip manager
	useEffect(() => {
		tooltipManager.setEditor(editor)
	}, [editor])

	// Subscribe to tooltip manager updates
	useEffect(() => {
		const unsubscribe = tooltipManager.subscribe(() => {
			forceUpdate({})
		})
		return unsubscribe
	}, [])

	const tooltipData = tooltipManager.getCurrentTooltipData()

	// Update open state and trigger position
	useEffect(() => {
		const shouldBeOpen = Boolean(tooltipData.id && tooltipData.element)

		// Clear any existing show timeout
		if (showTimeoutRef.current) {
			clearTimeout(showTimeoutRef.current)
			showTimeoutRef.current = null
		}

		if (shouldBeOpen && tooltipData.element && triggerRef.current) {
			// Position the invisible trigger element over the active element
			const activeRect = tooltipData.element.getBoundingClientRect()
			const trigger = triggerRef.current

			const newPosition = {
				x: activeRect.left + activeRect.width / 2,
				y: activeRect.top + activeRect.height / 2,
			}

			// Determine if we should animate
			let shouldAnimateCheck = false
			if (previousPositionRef.current) {
				const isNearPrevious = Vec.DistMin(previousPositionRef.current, newPosition, 200)
				// Only animate if the distance is less than 200px (nearby tooltips)
				shouldAnimateCheck =
					isNearPrevious && Math.abs(newPosition.y - previousPositionRef.current.y) < 50
			}
			// Don't animate on initial show (previousPositionRef.current is null)

			setShouldAnimate(isFirstShowRef.current ? false : shouldAnimateCheck)
			previousPositionRef.current = newPosition

			trigger.style.position = 'fixed'
			trigger.style.left = `${activeRect.left}px`
			trigger.style.top = `${activeRect.top}px`
			trigger.style.width = `${activeRect.width}px`
			trigger.style.height = `${activeRect.height}px`
			trigger.style.pointerEvents = 'none'
			trigger.style.zIndex = '9999'

			// Handle delay for first show
			if (isFirstShowRef.current && editor) {
				// First tooltip needs 300ms delay
				showTimeoutRef.current = editor.timers.setTimeout(() => {
					setIsOpen(true)
					isFirstShowRef.current = false
				}, 300)
			} else {
				// Subsequent tooltips show immediately
				setIsOpen(true)
			}
		} else if (!shouldBeOpen) {
			// Hide tooltip immediately
			setIsOpen(false)
			// Reset position tracking when tooltip closes
			previousPositionRef.current = null
			setShouldAnimate(false)
			// Reset first show state after tooltip is hidden
			isFirstShowRef.current = true
		}
	}, [tooltipData.id, tooltipData.element, editor])

	if (!tooltipData.id) {
		return null
	}

	return (
		<_Tooltip.Root open={isOpen} delayDuration={0}>
			<_Tooltip.Trigger asChild>
				<div ref={triggerRef} />
			</_Tooltip.Trigger>
			<_Tooltip.Content
				className="tlui-tooltip"
				data-should-animate={shouldAnimate}
				side={tooltipData.side}
				sideOffset={tooltipData.sideOffset}
			>
				{tooltipData.content}
				<_Tooltip.Arrow className="tlui-tooltip__arrow" />
			</_Tooltip.Content>
		</_Tooltip.Root>
	)
}

/** @public @react */
export function TldrawUiTooltip({
	children,
	content,
	side = 'bottom',
	sideOffset = 5,
	disabled = false,
}: TldrawUiTooltipProps) {
	const editor = useEditor()
	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])
	const tooltipId = useRef<string>(uniqueId())
	const hasProvider = useContext(TooltipSingletonContext)

	// Don't show tooltip if disabled, no content, or UI labels are disabled
	if (disabled || !content || !showUiLabels) {
		return <>{children}</>
	}

	// Fallback to old behavior if no provider
	if (!hasProvider) {
		return (
			<_Tooltip.Root delayDuration={300} disableHoverableContent>
				<_Tooltip.Trigger asChild>{children}</_Tooltip.Trigger>
				<_Tooltip.Content className="tlui-tooltip" side={side} sideOffset={sideOffset}>
					{content}
					<_Tooltip.Arrow className="tlui-tooltip__arrow" />
				</_Tooltip.Content>
			</_Tooltip.Root>
		)
	}

	const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
		tooltipManager.showTooltip(
			tooltipId.current,
			content,
			event.currentTarget as HTMLElement,
			side,
			sideOffset
		)
	}

	const handleMouseLeave = () => {
		tooltipManager.hideTooltip(tooltipId.current)
	}

	const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
		tooltipManager.showTooltip(
			tooltipId.current,
			content,
			event.currentTarget as HTMLElement,
			side,
			sideOffset
		)
	}

	const handleBlur = () => {
		tooltipManager.hideTooltip(tooltipId.current)
	}

	const childrenWithHandlers = React.cloneElement(children as React.ReactElement, {
		onMouseEnter: handleMouseEnter,
		onMouseLeave: handleMouseLeave,
		onFocus: handleFocus,
		onBlur: handleBlur,
	})

	return childrenWithHandlers
}
