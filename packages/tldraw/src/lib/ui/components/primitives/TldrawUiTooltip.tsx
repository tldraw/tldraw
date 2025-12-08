import { atom, tlenvReactive, useMaybeEditor, useValue } from '@tldraw/editor'
import { Tooltip as _Tooltip } from 'radix-ui'
import { forwardRef, useEffect, useState } from 'react'
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

// Track pointer down state to hide tooltips while pointer is down
const isPointerDown = atom<boolean>('tooltip pointer down', false)

/** @public */
export function hideAllTooltips() {
	// No-op: Radix tooltips handle their own state
}

/** @public */
export interface TldrawUiTooltipProviderProps {
	children: React.ReactNode
}

/** @public @react */
export function TldrawUiTooltipProvider({ children }: TldrawUiTooltipProviderProps) {
	// Hide tooltips and prevent new ones from opening while pointer is down
	useEffect(() => {
		function handlePointerDown() {
			isPointerDown.set(true)
		}

		function handlePointerUp() {
			isPointerDown.set(false)
		}

		document.addEventListener('pointerdown', handlePointerDown, { capture: true })
		document.addEventListener('pointerup', handlePointerUp, { capture: true })
		document.addEventListener('pointercancel', handlePointerUp, { capture: true })
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
			document.removeEventListener('pointerup', handlePointerUp, { capture: true })
			document.removeEventListener('pointercancel', handlePointerUp, { capture: true })
			// Reset pointer state on unmount to prevent stuck state
			isPointerDown.set(false)
		}
	}, [])

	return <_Tooltip.Provider skipDelayDuration={700}>{children}</_Tooltip.Provider>
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
		const enhancedA11yMode = useValue(
			'enhancedA11yMode',
			() => editor?.user.getEnhancedA11yMode(),
			[editor]
		)
		const pointerDown = useValue('pointer down', () => isPointerDown.get(), [])
		const isCoarsePointer = useValue('is coarse pointer', () => tlenvReactive.get().isCoarsePointer, [])
		const cameraState = useValue('camera state', () => editor?.getCameraState(), [editor])
		const [open, setOpen] = useState(false)

		const orientationCtx = useTldrawUiOrientation()
		const sideToUse = side ?? orientationCtx.tooltipSide

		// Close tooltip when pointer goes down
		useEffect(() => {
			if (pointerDown && open) {
				setOpen(false)
			}
		}, [pointerDown, open])

		// Close tooltip when camera is moving (panning/zooming)
		useEffect(() => {
			if (cameraState === 'moving' && open) {
				setOpen(false)
			}
		}, [cameraState, open])

		// Close tooltip on Escape key
		useEffect(() => {
			if (!open) return

			function handleKeyDown(event: KeyboardEvent) {
				if (event.key === 'Escape') {
					setOpen(false)
					event.stopPropagation()
				}
			}

			document.addEventListener('keydown', handleKeyDown, { capture: true })
			return () => {
				document.removeEventListener('keydown', handleKeyDown, { capture: true })
			}
		}, [open])

		// Don't show tooltip if disabled, no content, or on mobile unless showOnMobile is true
		if (disabled || !content || (isCoarsePointer && !showOnMobile)) {
			return <>{children}</>
		}

		let delayDurationToUse
		if (enhancedA11yMode) {
			delayDurationToUse = 0
		} else {
			delayDurationToUse =
				delayDuration ?? (editor?.options.tooltipDelayMs || DEFAULT_TOOLTIP_DELAY_MS)
		}

		const handleOpenChange = (newOpen: boolean) => {
			// Prevent opening when pointer is down
			if (newOpen && pointerDown) {
				return
			}
			setOpen(newOpen)
		}

		return (
			<_Tooltip.Root
				open={open}
				onOpenChange={handleOpenChange}
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
)
