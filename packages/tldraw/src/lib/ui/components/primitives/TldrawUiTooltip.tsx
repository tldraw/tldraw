import { assert, Editor, uniqueId, useMaybeEditor, Vec } from '@tldraw/editor'
import { Tooltip as _Tooltip } from 'radix-ui'
import React, { createContext, forwardRef, useContext, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../../shapes/shared/usePrefersReducedMotion'
import { useTldrawUiOrientation } from './layout'

const DEFAULT_TOOLTIP_DELAY_MS = 700

/** @public */
export interface TldrawUiTooltipProps {
	children: React.ReactNode
	content?: string | React.ReactNode
	side?: 'top' | 'right' | 'bottom' | 'left'
	sideOffset?: number
	disabled?: boolean
	delayDuration?: number
}

// Singleton tooltip manager
class TooltipManager {
	private static instance: TooltipManager | null = null
	private currentTooltipId: string | null = null
	private currentContent: string | React.ReactNode = ''
	private currentSide: 'top' | 'right' | 'bottom' | 'left' = 'bottom'
	private currentSideOffset: number = 5
	private destroyTimeoutId: number | null = null
	private subscribers: Set<() => void> = new Set()
	private activeElement: HTMLElement | null = null
	private editor: Editor | null = null
	private delayDuration: number | undefined = undefined

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
		content: string | React.ReactNode,
		element: HTMLElement,
		side: 'top' | 'right' | 'bottom' | 'left' = 'bottom',
		sideOffset: number = 5,
		delayDuration?: number
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
		this.delayDuration = delayDuration
		this.notify()
	}

	hideTooltip(tooltipId: string, instant: boolean = false) {
		const hide = () => {
			// Only hide if this is the current tooltip
			if (this.currentTooltipId === tooltipId) {
				this.currentTooltipId = null
				this.currentContent = ''
				this.activeElement = null
				this.destroyTimeoutId = null
				this.notify()
			}
		}

		if (instant) {
			hide()
		} else if (this.editor) {
			// Start destroy timeout (1 second)
			this.destroyTimeoutId = this.editor.timers.setTimeout(hide, 300)
		}
	}

	hideAllTooltips() {
		this.currentTooltipId = null
		this.currentContent = ''
		this.activeElement = null
		this.destroyTimeoutId = null
		this.notify()
	}

	getCurrentTooltipData() {
		return {
			id: this.currentTooltipId,
			content: this.currentContent,
			side: this.currentSide,
			sideOffset: this.currentSideOffset,
			element: this.activeElement,
			delayDuration: this.delayDuration,
		}
	}
}

export const tooltipManager = TooltipManager.getInstance()

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
	const prefersReducedMotion = usePrefersReducedMotion()
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
					!prefersReducedMotion &&
					isNearPrevious &&
					Math.abs(newPosition.y - previousPositionRef.current.y) < 50
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
				showTimeoutRef.current = editor.timers.setTimeout(() => {
					setIsOpen(true)
					isFirstShowRef.current = false
				}, tooltipData.delayDuration ?? editor.options.tooltipDelayMs)
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
	}, [tooltipData.id, tooltipData.element, editor, prefersReducedMotion, tooltipData.delayDuration])

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
				avoidCollisions
				collisionPadding={8}
				dir="ltr"
			>
				{tooltipData.content}
				<_Tooltip.Arrow className="tlui-tooltip__arrow" />
			</_Tooltip.Content>
		</_Tooltip.Root>
	)
}

/** @public @react */
export const TldrawUiTooltip = forwardRef<HTMLButtonElement, TldrawUiTooltipProps>(
	({ children, content, side, sideOffset = 5, disabled = false, delayDuration }, ref) => {
		const editor = useMaybeEditor()
		const tooltipId = useRef<string>(uniqueId())
		const hasProvider = useContext(TooltipSingletonContext)

		const orientationCtx = useTldrawUiOrientation()
		const sideToUse = side ?? orientationCtx.tooltipSide

		useEffect(() => {
			const currentTooltipId = tooltipId.current
			return () => {
				if (hasProvider) {
					tooltipManager.hideTooltip(currentTooltipId, true)
				}
			}
		}, [hasProvider])

		// Don't show tooltip if disabled, no content, or UI labels are disabled
		if (disabled || !content) {
			return <>{children}</>
		}

		// Fallback to old behavior if no provider
		if (!hasProvider) {
			return (
				<_Tooltip.Root
					delayDuration={
						delayDuration ?? (editor?.options.tooltipDelayMs || DEFAULT_TOOLTIP_DELAY_MS)
					}
					disableHoverableContent
				>
					<_Tooltip.Trigger asChild ref={ref}>
						{children}
					</_Tooltip.Trigger>
					<_Tooltip.Content
						className="tlui-tooltip"
						side={sideToUse}
						sideOffset={sideOffset}
						avoidCollisions
						collisionPadding={8}
						dir="ltr"
					>
						{content}
						<_Tooltip.Arrow className="tlui-tooltip__arrow" />
					</_Tooltip.Content>
				</_Tooltip.Root>
			)
		}

		const child = React.Children.only(children)
		assert(React.isValidElement(child), 'TldrawUiTooltip children must be a single element')

		const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
			child.props.onMouseEnter?.(event)
			tooltipManager.showTooltip(
				tooltipId.current,
				content,
				event.currentTarget as HTMLElement,
				sideToUse,
				sideOffset,
				delayDuration
			)
		}

		const handleMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
			child.props.onMouseLeave?.(event)
			tooltipManager.hideTooltip(tooltipId.current)
		}

		const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
			child.props.onFocus?.(event)
			tooltipManager.showTooltip(
				tooltipId.current,
				content,
				event.currentTarget as HTMLElement,
				sideToUse,
				sideOffset,
				delayDuration
			)
		}

		const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
			child.props.onBlur?.(event)
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
)
