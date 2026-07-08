import { atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'
import { uniqueId } from '@tldraw/utils'
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
import { useTlPlatform } from '../context/platform'
import { TlPortalScope, useTlPortalContainer } from '../context/portal'
import { useTlTranslation } from '../context/translation'
import { useTlOrientation } from './layout'

const DEFAULT_TOOLTIP_DELAY_MS = 700

/** @public */
export interface TlTooltipProps {
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

type TooltipState =
	| { name: 'idle' }
	| { name: 'pointer_down' }
	| { name: 'showing'; tooltip: TooltipData }
	| { name: 'waiting_to_hide'; tooltip: TooltipData; timeoutId: ReturnType<typeof setTimeout> }

type TooltipEvent =
	| { type: 'pointer_down' }
	| { type: 'pointer_up' }
	| { type: 'show'; tooltip: TooltipData }
	| { type: 'hide'; tooltipId: string; instant: boolean }
	| { type: 'hide_all' }

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
				if (currentState.name === 'waiting_to_hide') {
					clearTimeout(currentState.timeoutId)
				}
				this.state.set({ name: 'pointer_down' })
				break
			}

			case 'pointer_up': {
				if (currentState.name === 'pointer_down') {
					this.state.set({ name: 'idle' })
				}
				break
			}

			case 'show': {
				if (currentState.name === 'pointer_down') {
					return
				}

				if (currentState.name === 'waiting_to_hide') {
					clearTimeout(currentState.timeoutId)
				}

				this.state.set({ name: 'showing', tooltip: event.tooltip })
				break
			}

			case 'hide': {
				const { tooltipId, instant } = event

				if (currentState.name === 'showing' && currentState.tooltip.id === tooltipId) {
					if (!instant) {
						const timeoutId = setTimeout(() => {
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

		if (currentState.name === 'showing') {
			return currentState.tooltip
		}
		if (currentState.name === 'waiting_to_hide') {
			return currentState.tooltip
		}

		return null
	}
}

const tooltipManager = TooltipManager.getInstance()

/** @public */
export function hideAllTlTooltips() {
	tooltipManager.hideAllTooltips()
}

const TooltipSingletonContext = createContext<boolean>(false)

interface TlTooltipProviderContextValue {
	isMoving?(): boolean
}

const TlTooltipProviderContext = createContext<TlTooltipProviderContextValue>({})

/** @public */
export interface TlTooltipProviderProps {
	children: React.ReactNode
	isMoving?(): boolean
}

/** @public @react */
export function TlTooltipProvider({ children, isMoving }: TlTooltipProviderProps) {
	return (
		<TlTooltipProviderContext.Provider value={{ isMoving }}>
			<_Tooltip.Provider skipDelayDuration={700}>
				<TooltipSingletonContext.Provider value={true}>
					{children}
					<TooltipSingleton />
				</TooltipSingletonContext.Provider>
			</_Tooltip.Provider>
		</TlTooltipProviderContext.Provider>
	)
}

function getOwnerDocument(container?: HTMLElement): Document {
	if (container?.ownerDocument) return container.ownerDocument
	if (typeof document !== 'undefined') return document
	return globalThis.document
}

function TooltipSingleton() {
	const [isOpen, setIsOpen] = useState(false)
	const triggerRef = useRef<HTMLDivElement>(null)
	const isFirstShowRef = useRef(true)
	const { dir } = useTlTranslation()
	const { isCoarsePointer } = useTlPlatform()
	const portalContainer = useTlPortalContainer()
	const { isMoving } = useContext(TlTooltipProviderContext)

	const currentTooltip = useValue(
		'current tooltip',
		() => tooltipManager.getCurrentTooltipData(),
		[]
	)

	const filteredTooltip =
		currentTooltip && isCoarsePointer && !currentTooltip.showOnMobile ? null : currentTooltip

	useEffect(() => {
		if (!isMoving || !filteredTooltip || !isOpen) return

		let frame = 0
		const check = () => {
			if (isMoving()) {
				tooltipManager.handleEvent({
					type: 'hide',
					tooltipId: filteredTooltip.id,
					instant: true,
				})
				return
			}
			frame = requestAnimationFrame(check)
		}

		frame = requestAnimationFrame(check)
		return () => cancelAnimationFrame(frame)
	}, [isMoving, isOpen, filteredTooltip])

	useEffect(() => {
		const doc = getOwnerDocument(portalContainer)

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape' && filteredTooltip && isOpen) {
				hideAllTlTooltips()
				event.stopPropagation()
			}
		}

		doc.addEventListener('keydown', handleKeyDown, { capture: true })
		return () => {
			doc.removeEventListener('keydown', handleKeyDown, { capture: true })
		}
	}, [portalContainer, filteredTooltip, isOpen])

	useEffect(() => {
		const doc = getOwnerDocument(portalContainer)

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
			tooltipManager.handleEvent({ type: 'pointer_up' })
		}
	}, [portalContainer])

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | null = null

		if (filteredTooltip && triggerRef.current) {
			const activeRect = filteredTooltip.targetElement.getBoundingClientRect()
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

			if (isFirstShowRef.current) {
				timer = setTimeout(() => {
					setIsOpen(true)
					isFirstShowRef.current = false
				}, filteredTooltip.delayDuration)
			} else {
				setIsOpen(true)
			}
		} else {
			setIsOpen(false)
			isFirstShowRef.current = true
		}

		return () => {
			if (timer !== null) {
				clearTimeout(timer)
			}
		}
	}, [filteredTooltip])

	if (!filteredTooltip) {
		return null
	}

	return (
		<_Tooltip.Root open={isOpen} delayDuration={0}>
			<_Tooltip.Trigger asChild>
				<div ref={triggerRef} />
			</_Tooltip.Trigger>
			<_Tooltip.Portal container={portalContainer}>
				<TlPortalScope>
					<_Tooltip.Content
						className="tl-tooltip"
						side={filteredTooltip.side}
						sideOffset={filteredTooltip.sideOffset}
						avoidCollisions
						collisionPadding={8}
						dir={dir}
					>
						{filteredTooltip.content}
						<_Tooltip.Arrow className="tl-tooltip__arrow" />
					</_Tooltip.Content>
				</TlPortalScope>
			</_Tooltip.Portal>
		</_Tooltip.Root>
	)
}

/** @public @react */
export const TlTooltip = forwardRef<HTMLButtonElement, TlTooltipProps>(
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
		const { dir } = useTlTranslation()
		const portalContainer = useTlPortalContainer()
		const tooltipId = useRef<string>(uniqueId())
		const hasProvider = useContext(TooltipSingletonContext)
		const orientationCtx = useTlOrientation()
		const sideToUse = side ?? orientationCtx.tooltipSide

		const delayDurationToUse = delayDuration ?? DEFAULT_TOOLTIP_DELAY_MS

		useEffect(() => {
			const currentTooltipId = tooltipId.current
			return () => {
				if (hasProvider) {
					tooltipManager.handleEvent({
						type: 'hide',
						tooltipId: currentTooltipId,
						instant: true,
					})
				}
			}
		}, [hasProvider])

		if (disabled || !content) {
			return <>{children}</>
		}

		if (!hasProvider) {
			return (
				<_Tooltip.Root delayDuration={delayDurationToUse}>
					<_Tooltip.Trigger asChild ref={ref}>
						{children}
					</_Tooltip.Trigger>
					<_Tooltip.Portal container={portalContainer}>
						<TlPortalScope>
							<_Tooltip.Content
								className="tl-tooltip"
								side={sideToUse}
								sideOffset={sideOffset}
								avoidCollisions
								collisionPadding={8}
								dir={dir}
							>
								{content}
								<_Tooltip.Arrow className="tl-tooltip__arrow" />
							</_Tooltip.Content>
						</TlPortalScope>
					</_Tooltip.Portal>
				</_Tooltip.Root>
			)
		}

		const child = React.Children.only(children)
		if (!React.isValidElement(child)) {
			return <>{children}</>
		}

		const childElement = child as React.ReactElement<{
			onMouseEnter?(event: React.MouseEvent<HTMLElement>): void
			onMouseLeave?(event: React.MouseEvent<HTMLElement>): void
			onFocus?(event: React.FocusEvent<HTMLElement>): void
			onBlur?(event: React.FocusEvent<HTMLElement>): void
		}>

		const showTooltip = (targetElement: HTMLElement) => {
			tooltipManager.handleEvent({
				type: 'show',
				tooltip: {
					id: tooltipId.current,
					content,
					targetElement,
					side: sideToUse,
					sideOffset,
					showOnMobile,
					delayDuration: delayDurationToUse,
				},
			})
		}

		const hideTooltip = (instant: boolean) => {
			tooltipManager.handleEvent({
				type: 'hide',
				tooltipId: tooltipId.current,
				instant,
			})
		}

		return React.cloneElement(childElement, {
			onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
				childElement.props.onMouseEnter?.(event)
				showTooltip(event.currentTarget as HTMLElement)
			},
			onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
				childElement.props.onMouseLeave?.(event)
				hideTooltip(false)
			},
			onFocus: (event: React.FocusEvent<HTMLElement>) => {
				childElement.props.onFocus?.(event)
				showTooltip(event.currentTarget as HTMLElement)
			},
			onBlur: (event: React.FocusEvent<HTMLElement>) => {
				childElement.props.onBlur?.(event)
				hideTooltip(false)
			},
		})
	}
)
