import {
	assert,
	atom,
	Editor,
	tlenvReactive,
	uniqueId,
	useMaybeEditor,
	useValue,
} from '@tldraw/editor'
import { Tooltip as _Tooltip } from 'radix-ui'
import React, {
	createContext,
	forwardRef,
	ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useTldrawUiOrientation } from './layout'

const DEFAULT_TOOLTIP_DELAY_MS = 700

/** @public */
export interface TldrawUiTooltipProps {
	children: React.ReactNode
	content?: string | React.ReactNode
	side?: 'top' | 'right' | 'bottom' | 'left'
	sideOffset?: number
	disabled?: boolean
	showOnMobile?: boolean
	delayDuration?: number
}

interface TooltipData {
	id: string
	content: ReactNode
	side: 'top' | 'right' | 'bottom' | 'left'
	sideOffset: number
	showOnMobile: boolean
	targetElement: HTMLElement
	delayDuration: number
}

// State machine states
type TooltipState =
	| { name: 'idle' }
	| { name: 'pointer_down' }
	| { name: 'showing'; tooltip: TooltipData }
	| { name: 'waiting_to_hide'; tooltip: TooltipData; timeoutId: number }

// State machine events
type TooltipEvent =
	| { type: 'pointer_down' }
	| { type: 'pointer_up' }
	| { type: 'show'; tooltip: TooltipData }
	| { type: 'hide'; tooltipId: string; editor: Editor | null; instant: boolean }
	| { type: 'hide_all' }

// Singleton tooltip manager using explicit state machine
class TooltipManager {
	private static instance: TooltipManager | null = null
	private state = atom<TooltipState>('tooltip state', { name: 'idle' })

	static getInstance(): TooltipManager {
		if (!TooltipManager.instance) {
			TooltipManager.instance = new TooltipManager()
		}
		return TooltipManager.instance
	}

	hideAllTooltips() {
		this.handleEvent({ type: 'hide_all' })
	}

	handleEvent(event: TooltipEvent) {
		const currentState = this.state.get()

		switch (event.type) {
			case 'pointer_down': {
				// Transition to pointer_down from any state
				if (currentState.name === 'waiting_to_hide') {
					clearTimeout(currentState.timeoutId)
				}
				this.state.set({ name: 'pointer_down' })
				break
			}

			case 'pointer_up': {
				// Only transition from pointer_down to idle
				if (currentState.name === 'pointer_down') {
					this.state.set({ name: 'idle' })
				}
				break
			}

			case 'show': {
				// Don't show tooltips while pointer is down
				if (currentState.name === 'pointer_down') {
					return
				}

				// Clear any existing timeout if transitioning from waiting_to_hide
				if (currentState.name === 'waiting_to_hide') {
					clearTimeout(currentState.timeoutId)
				}

				// Transition to showing state
				this.state.set({ name: 'showing', tooltip: event.tooltip })
				break
			}

			case 'hide': {
				const { tooltipId, editor, instant } = event

				// Only hide if the tooltip matches
				if (currentState.name === 'showing' && currentState.tooltip.id === tooltipId) {
					if (editor && !instant) {
						// Transition to waiting_to_hide state
						const timeoutId = editor.timers.setTimeout(() => {
							const state = this.state.get()
							if (state.name === 'waiting_to_hide' && state.tooltip.id === tooltipId) {
								this.state.set({ name: 'idle' })
							}
						}, 300)
						this.state.set({
							name: 'waiting_to_hide',
							tooltip: currentState.tooltip,
							timeoutId,
						})
					} else {
						this.state.set({ name: 'idle' })
					}
				} else if (
					currentState.name === 'waiting_to_hide' &&
					currentState.tooltip.id === tooltipId
				) {
					// Already waiting to hide, make it instant if requested
					if (instant) {
						clearTimeout(currentState.timeoutId)
						this.state.set({ name: 'idle' })
					}
				}
				break
			}

			case 'hide_all': {
				if (currentState.name === 'waiting_to_hide') {
					clearTimeout(currentState.timeoutId)
				}
				// Preserve pointer_down state if that's the current state
				if (currentState.name === 'pointer_down') {
					return
				}
				this.state.set({ name: 'idle' })
				break
			}
		}
	}

	getCurrentTooltipData(): TooltipData | null {
		const currentState = this.state.get()
		let tooltip: TooltipData | null = null

		if (currentState.name === 'showing') {
			tooltip = currentState.tooltip
		} else if (currentState.name === 'waiting_to_hide') {
			tooltip = currentState.tooltip
		}

		if (!tooltip) return null
		if (tlenvReactive.get().isCoarsePointer && !tooltip.showOnMobile) return null
		return tooltip
	}
}

const tooltipManager = TooltipManager.getInstance()

/** @public */
export function hideAllTooltips() {
	tooltipManager.hideAllTooltips()
}

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
	const [isOpen, setIsOpen] = useState(false)
	const triggerRef = useRef<HTMLDivElement>(null)
	const isFirstShowRef = useRef(true)
	const editor = useMaybeEditor()

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
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape' && currentTooltip && isOpen) {
				hideAllTooltips()
				event.stopPropagation()
			}
		}

		document.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			document.removeEventListener('keydown', handleKeyDown, { capture: true })
		}
	}, [currentTooltip, isOpen])

	// Hide tooltip and prevent new ones from opening while pointer is down
	useEffect(() => {
		function handlePointerDown() {
			tooltipManager.handleEvent({ type: 'pointer_down' })
		}

		function handlePointerUp() {
			tooltipManager.handleEvent({ type: 'pointer_up' })
		}

		document.addEventListener('pointerdown', handlePointerDown, { capture: true })
		document.addEventListener('pointerup', handlePointerUp, { capture: true })
		document.addEventListener('pointercancel', handlePointerUp, { capture: true })
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
			document.removeEventListener('pointerup', handlePointerUp, { capture: true })
			document.removeEventListener('pointercancel', handlePointerUp, { capture: true })
			// Reset pointer state on unmount to prevent stuck state
			tooltipManager.handleEvent({ type: 'pointer_up' })
		}
	}, [])

	// Update open state and trigger position
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | null = null
		if (currentTooltip && triggerRef.current) {
			// Position the invisible trigger element over the active element
			const activeRect = currentTooltip.targetElement.getBoundingClientRect()
			const trigger = triggerRef.current

			trigger.style.position = 'fixed'
			trigger.style.left = `${activeRect.left}px`
			trigger.style.top = `${activeRect.top}px`
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
				dir="ltr"
			>
				{currentTooltip.content}
				<_Tooltip.Arrow className="tlui-tooltip__arrow" />
			</_Tooltip.Content>
		</_Tooltip.Root>
	)
}

/** @public @react */
export const TldrawUiTooltip = forwardRef<HTMLButtonElement, TldrawUiTooltipProps>(
	(
		{
			children,
			content,
			side,
			sideOffset = 5,
			disabled = false,
			showOnMobile = false,
			delayDuration,
		},
		ref
	) => {
		const editor = useMaybeEditor()
		const tooltipId = useRef<string>(uniqueId())
		const hasProvider = useContext(TooltipSingletonContext)
		const enhancedA11yMode = useValue(
			'enhancedA11yMode',
			() => editor?.user.getEnhancedA11yMode(),
			[editor]
		)

		const orientationCtx = useTldrawUiOrientation()
		const sideToUse = side ?? orientationCtx.tooltipSide

		useEffect(() => {
			const currentTooltipId = tooltipId.current
			return () => {
				if (hasProvider) {
					tooltipManager.handleEvent({
						type: 'hide',
						tooltipId: currentTooltipId,
						editor,
						instant: true,
					})
				}
			}
		}, [editor, hasProvider])

		// Don't show tooltip if disabled, no content, or enhanced accessibility mode is disabled
		if (disabled || !content) {
			return <>{children}</>
		}

		let delayDurationToUse
		if (enhancedA11yMode) {
			delayDurationToUse = 0
		} else {
			delayDurationToUse =
				delayDuration ?? (editor?.options.tooltipDelayMs || DEFAULT_TOOLTIP_DELAY_MS)
		}

		// Fallback to old behavior if no provider
		if (!hasProvider || enhancedA11yMode) {
			return (
				<_Tooltip.Root
					delayDuration={delayDurationToUse}
					disableHoverableContent={!enhancedA11yMode}
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

		const childElement = child as React.ReactElement<{
			onMouseEnter?(event: React.MouseEvent<HTMLElement>): void
			onMouseLeave?(event: React.MouseEvent<HTMLElement>): void
			onFocus?(event: React.FocusEvent<HTMLElement>): void
			onBlur?(event: React.FocusEvent<HTMLElement>): void
		}>

		const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
			childElement.props.onMouseEnter?.(event)
			tooltipManager.handleEvent({
				type: 'show',
				tooltip: {
					id: tooltipId.current,
					content,
					targetElement: event.currentTarget as HTMLElement,
					side: sideToUse,
					sideOffset,
					showOnMobile,
					delayDuration: delayDurationToUse,
				},
			})
		}

		const handleMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
			childElement.props.onMouseLeave?.(event)
			tooltipManager.handleEvent({
				type: 'hide',
				tooltipId: tooltipId.current,
				editor,
				instant: false,
			})
		}

		const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
			childElement.props.onFocus?.(event)
			tooltipManager.handleEvent({
				type: 'show',
				tooltip: {
					id: tooltipId.current,
					content,
					targetElement: event.currentTarget as HTMLElement,
					side: sideToUse,
					sideOffset,
					showOnMobile,
					delayDuration: delayDurationToUse,
				},
			})
		}

		const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
			childElement.props.onBlur?.(event)
			tooltipManager.handleEvent({
				type: 'hide',
				tooltipId: tooltipId.current,
				editor,
				instant: false,
			})
		}

		const childrenWithHandlers = React.cloneElement(childElement, {
			onMouseEnter: handleMouseEnter,
			onMouseLeave: handleMouseLeave,
			onFocus: handleFocus,
			onBlur: handleBlur,
		})

		return childrenWithHandlers
	}
)
