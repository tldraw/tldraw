import {
	assert,
	atom,
	Editor,
	tlenvReactive,
	uniqueId,
	useMaybeEditor,
	useValue,
} from '@tldraw/editor'
import React, {
	createContext,
	forwardRef,
	lazy,
	ReactNode,
	Suspense,
	useContext,
	useEffect,
	useRef,
} from 'react'
import { useDirection } from '../../hooks/useTranslation/useTranslation'
import { useTldrawUiOrientation } from './layout'

// Radix (and its react-remove-scroll graph) is loaded lazily so that importing this module —
// which every default shape util transitively does — costs nothing in processes that never
// render, like headless Node. Browsers kick the fetch off immediately at import time, so the
// Suspense fallbacks below show for at most a first-mount pass.
const LazyTooltipSingletonHost = lazy(async () => ({
	default: (await import('./TldrawUiTooltipRadix')).TooltipSingletonHost,
}))
const LazyFallbackTooltip = lazy(async () => ({
	default: (await import('./TldrawUiTooltipRadix')).FallbackTooltip,
}))
// A failed preload (stale chunk after a deploy, offline) must not surface as an unhandled
// rejection at import time — the lazy boundaries report the real failure when a tooltip renders.
// eslint-disable-next-line no-restricted-globals
if (typeof window !== 'undefined') import('./TldrawUiTooltipRadix').catch(() => {})

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

/** @internal */
export const tooltipManager = TooltipManager.getInstance()

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
	// The radix provider wraps only the lazily-loaded singleton, never `children` — wrapping
	// children in a component that appears after the lazy load would remount the whole app.
	return (
		<TooltipSingletonContext.Provider value={true}>
			{children}
			<Suspense fallback={null}>
				<LazyTooltipSingletonHost />
			</Suspense>
		</TooltipSingletonContext.Provider>
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
		const dir = useDirection()
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

		// Fallback to old behavior if no provider. The Suspense fallback renders the trigger
		// children plainly until radix resolves — at least one first-mount pass even when the
		// module is already loaded, so children briefly remount into the radix trigger.
		if (!hasProvider || enhancedA11yMode) {
			return (
				<Suspense fallback={<>{children}</>}>
					<LazyFallbackTooltip
						content={content}
						side={sideToUse}
						sideOffset={sideOffset}
						dir={dir}
						delayDuration={delayDurationToUse}
						enhancedA11yMode={enhancedA11yMode}
						triggerRef={ref}
					>
						{children}
					</LazyFallbackTooltip>
				</Suspense>
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
