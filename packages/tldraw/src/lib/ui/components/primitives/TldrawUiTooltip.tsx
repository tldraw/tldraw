import { assert, Atom, atom, Editor, uniqueId, useMaybeEditor, useValue } from '@tldraw/editor'
import { Tooltip as _Tooltip } from 'radix-ui'
import React, {
	createContext,
	forwardRef,
	ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
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

interface CurrentTooltip {
	id: string
	content: ReactNode
	side: 'top' | 'right' | 'bottom' | 'left'
	sideOffset: number
	showOnMobile: boolean
	targetElement: HTMLElement
	delayDuration: number
}

// Singleton tooltip manager
class TooltipManager {
	private static instance: TooltipManager | null = null
	private currentTooltip = atom<CurrentTooltip | null>('current tooltip', null)
	private destroyTimeoutId: number | null = null

	static getInstance(): TooltipManager {
		if (!TooltipManager.instance) {
			TooltipManager.instance = new TooltipManager()
		}
		return TooltipManager.instance
	}

	showTooltip(
		tooltipId: string,
		content: string | React.ReactNode,
		targetElement: HTMLElement,
		side: 'top' | 'right' | 'bottom' | 'left',
		sideOffset: number,
		showOnMobile: boolean,
		delayDuration: number
	) {
		// Clear any existing destroy timeout
		if (this.destroyTimeoutId) {
			clearTimeout(this.destroyTimeoutId)
			this.destroyTimeoutId = null
		}

		// Update current tooltip
		this.currentTooltip.set({
			id: tooltipId,
			content,
			side,
			sideOffset,
			showOnMobile,
			targetElement,
			delayDuration,
		})
	}

	updateCurrentTooltip(tooltipId: string, update: (tooltip: CurrentTooltip) => CurrentTooltip) {
		this.currentTooltip.update((tooltip) => {
			if (tooltip?.id === tooltipId) {
				return update(tooltip)
			}
			return tooltip
		})
	}

	hideTooltip(editor: Editor | null, tooltipId: string, instant: boolean = false) {
		const hide = () => {
			// Only hide if this is the current tooltip
			if (this.currentTooltip.get()?.id === tooltipId) {
				this.currentTooltip.set(null)
				this.destroyTimeoutId = null
			}
		}

		if (editor && !instant) {
			// Start destroy timeout (1 second)
			this.destroyTimeoutId = editor.timers.setTimeout(hide, 300)
		} else {
			hide()
		}
	}

	hideAllTooltips() {
		this.currentTooltip.set(null)
		this.destroyTimeoutId = null
	}

	getCurrentTooltipData() {
		const currentTooltip = this.currentTooltip.get()
		if (!currentTooltip) return null
		if (!this.supportsHover() && !currentTooltip.showOnMobile) return null
		return currentTooltip
	}

	private supportsHoverAtom: Atom<boolean> | null = null
	supportsHover() {
		if (!this.supportsHoverAtom) {
			const mediaQuery = window.matchMedia('(hover: hover)')
			const supportsHover = atom('has hover', mediaQuery.matches)
			this.supportsHoverAtom = supportsHover
			mediaQuery.addEventListener('change', (e) => {
				supportsHover.set(e.matches)
			})
		}
		return this.supportsHoverAtom.get()
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
			tooltipManager.hideTooltip(editor, currentTooltip.id, true)
		}
	}, [cameraState, isOpen, currentTooltip, editor])

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape' && currentTooltip && isOpen) {
				tooltipManager.hideTooltip(editor, currentTooltip.id)
				event.stopPropagation()
			}
		}

		document.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			document.removeEventListener('keydown', handleKeyDown, { capture: true })
		}
	}, [editor, currentTooltip, isOpen])

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
					tooltipManager.hideTooltip(editor, currentTooltipId, true)
				}
			}
		}, [editor, hasProvider])

		useLayoutEffect(() => {
			if (hasProvider && tooltipManager.getCurrentTooltipData()?.id === tooltipId.current) {
				tooltipManager.updateCurrentTooltip(tooltipId.current, (tooltip) => ({
					...tooltip,
					content,
					side: sideToUse,
					sideOffset,
					showOnMobile,
				}))
			}
		}, [content, sideToUse, sideOffset, showOnMobile, hasProvider])

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

		const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
			child.props.onMouseEnter?.(event)
			tooltipManager.showTooltip(
				tooltipId.current,
				content,
				event.currentTarget as HTMLElement,
				sideToUse,
				sideOffset,
				showOnMobile,
				delayDurationToUse
			)
		}

		const handleMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
			child.props.onMouseLeave?.(event)
			tooltipManager.hideTooltip(editor, tooltipId.current)
		}

		const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
			child.props.onFocus?.(event)
			tooltipManager.showTooltip(
				tooltipId.current,
				content,
				event.currentTarget as HTMLElement,
				sideToUse,
				sideOffset,
				showOnMobile,
				delayDurationToUse
			)
		}

		const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
			child.props.onBlur?.(event)
			tooltipManager.hideTooltip(editor, tooltipId.current)
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
