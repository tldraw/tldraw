import { Dialog as _Dialog } from 'radix-ui'
import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { defineMessages, useContainer, useEditor, useTranslation } from 'tldraw'
import { librariesPanelOpen } from './state'
import { getVisibleViewport } from './visible-viewport'

const messages = defineMessages({
	resize: { id: 'libraries.sheet.resize', defaultMessage: 'Resize libraries' },
})

/** Below tldraw's top bar, which stays in view at the full detent. */
const TOP_GAP = 48
/** The half detent never drops below this, so a landscape phone still shows a row or two. */
const MIN_HALF_HEIGHT = 280
/** The visual viewport this much shorter than the window means the keyboard is up. */
const KEYBOARD_MIN_HEIGHT = 120
const SETTLE_MS = 200
/** Dragged below this share of the half detent, the sheet closes on release. */
const CLOSE_FRACTION = 0.6
/** Pointer speed, in px per ms, past which a drag's release follows its direction. */
const FLING_SPEED = 0.5
/** A press on the handle that moves less than this is a tap. */
const DRAG_SLOP = 4

type Detent = 'half' | 'full'

interface SheetViewport {
	/** The visible bottom edge, from the container's top. */
	bottom: number
	half: number
	full: number
	keyboardOpen: boolean
}

function measure(container: HTMLElement): SheetViewport {
	const win = container.ownerDocument.defaultView ?? window
	const rect = container.getBoundingClientRect()
	const vp = getVisibleViewport(win)
	const top = Math.max(rect.top, vp.top)
	const bottom = Math.min(rect.bottom, vp.bottom)
	const visible = Math.max(0, bottom - top)
	const full = Math.max(0, visible - TOP_GAP)
	return {
		bottom: bottom - rect.top,
		full,
		half: Math.min(full, Math.max(visible / 2, MIN_HALF_HEIGHT)),
		keyboardOpen: win.innerHeight - vp.height > KEYBOARD_MIN_HEIGHT,
	}
}

function useSheetViewport() {
	const container = useContainer()
	const [viewport, setViewport] = useState(() => measure(container))
	useLayoutEffect(() => {
		const win = container.ownerDocument.defaultView ?? window
		const update = () =>
			setViewport((prev) => {
				const next = measure(container)
				return prev.bottom === next.bottom &&
					prev.full === next.full &&
					prev.half === next.half &&
					prev.keyboardOpen === next.keyboardOpen
					? prev
					: next
			})
		update()
		const ro = new ResizeObserver(update)
		ro.observe(container)
		const vv = win.visualViewport
		if (vv) {
			vv.addEventListener('resize', update)
			vv.addEventListener('scroll', update)
		}
		win.addEventListener('resize', update)
		return () => {
			ro.disconnect()
			if (vv) {
				vv.removeEventListener('resize', update)
				vv.removeEventListener('scroll', update)
			}
			win.removeEventListener('resize', update)
		}
	}, [container])
	return viewport
}

/**
 * The sheet's height and offset while it's dragged or moving between heights. A move from one
 * height to another keeps the taller of the two and slides with a transform, then settles.
 */
interface Motion {
	height: number
	offset: number
	animate: boolean
}

interface Drag {
	pointerId: number
	startY: number
	startHeight: number
	height: number
	lastY: number
	lastTime: number
	speed: number
	moved: boolean
}

/**
 * The {@link LibrariesPanel} on a phone: a modal sheet along the bottom of the visible viewport,
 * half its height or reaching up to the top bar. Dragging or tapping the handle moves between the
 * two, and dragging it down closes the sheet, as does Escape or a tap on the scrim.
 */
export function LibrariesSheet({ label, children }: { label: string; children: ReactNode }) {
	const editor = useEditor()
	const container = useContainer()
	const msg = useTranslation()
	const viewport = useSheetViewport()
	const [detent, setDetent] = useState<Detent>('half')
	const [motion, setMotion] = useState<Motion>()
	const contentRef = useRef<HTMLDivElement>(null)
	const returnFocusRef = useRef<HTMLElement | null>(null)
	const dragRef = useRef<Drag | undefined>(undefined)
	const tappedAfterDrag = useRef(false)
	const settleFrames = useRef<number[]>([])
	const settleTimeouts = useRef<number[]>([])

	const heightOf = (d: Detent) =>
		d === 'full' || viewport.keyboardOpen ? viewport.full : viewport.half
	const restHeight = heightOf(detent)
	const height = motion ? motion.height : restHeight

	const clearSettle = useCallback(() => {
		for (const id of settleFrames.current) editor.timers.cancelAnimationFrame(id)
		for (const id of settleTimeouts.current) editor.timers.clearTimeout(id)
		settleFrames.current = []
		settleTimeouts.current = []
	}, [editor])
	useEffect(() => clearSettle, [clearSettle])

	const settle = useCallback(
		(from: number, to: number, done?: () => void) => {
			clearSettle()
			if (editor.user.getAnimationSpeed() === 0 || from === to) {
				setMotion(undefined)
				if (done) done()
				return
			}
			const tallest = Math.max(from, to)
			setMotion({ height: tallest, offset: tallest - from, animate: false })
			const { timers } = editor
			settleFrames.current.push(
				timers.requestAnimationFrame(() => {
					settleFrames.current.push(
						timers.requestAnimationFrame(() => {
							setMotion({ height: tallest, offset: tallest - to, animate: true })
							settleTimeouts.current.push(
								timers.setTimeout(() => {
									setMotion(undefined)
									if (done) done()
								}, SETTLE_MS)
							)
						})
					)
				})
			)
		},
		[editor, clearSettle]
	)

	const close = (from: number) => settle(from, 0, () => librariesPanelOpen.set(editor, false))

	const moveTo = (next: Detent, from = height) => {
		setDetent(next)
		settle(from, heightOf(next))
	}

	useLayoutEffect(() => {
		settle(0, restHeight)
		// oxlint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const onHandlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
		if (e.button !== 0) return
		e.currentTarget.setPointerCapture(e.pointerId)
		clearSettle()
		dragRef.current = {
			pointerId: e.pointerId,
			startY: e.clientY,
			startHeight: height,
			height,
			lastY: e.clientY,
			lastTime: e.timeStamp,
			speed: 0,
			moved: false,
		}
	}

	const onHandlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
		const drag = dragRef.current
		if (!drag || drag.pointerId !== e.pointerId) return
		const dy = e.clientY - drag.startY
		if (!drag.moved && Math.abs(dy) < DRAG_SLOP) return
		drag.moved = true
		const elapsed = e.timeStamp - drag.lastTime
		if (elapsed > 0) drag.speed = (e.clientY - drag.lastY) / elapsed
		drag.lastY = e.clientY
		drag.lastTime = e.timeStamp
		drag.height = Math.min(viewport.full, Math.max(0, drag.startHeight - dy))
		setMotion({ height: drag.height, offset: 0, animate: false })
	}

	const onHandlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
		const drag = dragRef.current
		if (!drag || drag.pointerId !== e.pointerId) return
		dragRef.current = undefined
		e.currentTarget.releasePointerCapture(e.pointerId)
		if (!drag.moved) return
		tappedAfterDrag.current = true
		const flungDown = drag.speed > FLING_SPEED
		const flungUp = drag.speed < -FLING_SPEED
		if (
			drag.height < viewport.half * CLOSE_FRACTION ||
			(flungDown && drag.height < viewport.half)
		) {
			close(drag.height)
			return
		}
		let next: Detent = drag.height > (viewport.half + viewport.full) / 2 ? 'full' : 'half'
		if (flungUp) next = 'full'
		if (flungDown) next = 'half'
		moveTo(next, drag.height)
	}

	const onHandlePointerCancel = () => {
		const drag = dragRef.current
		dragRef.current = undefined
		if (drag && drag.moved) settle(drag.height, restHeight)
	}

	const onHandleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		const next = ({ ArrowUp: 'full', ArrowDown: 'half' } as const)[e.key as 'ArrowUp' | 'ArrowDown']
		if (!next) return
		e.preventDefault()
		if (next !== detent) moveTo(next)
	}

	return (
		<_Dialog.Root
			open
			onOpenChange={(open) => {
				if (!open) close(height)
			}}
		>
			<_Dialog.Portal container={container}>
				<_Dialog.Overlay className="tlui-libraries-sheet__overlay" />
				<_Dialog.Content
					ref={contentRef}
					className="tlui-libraries-panel tlui-libraries-sheet"
					data-detent={detent}
					aria-describedby={undefined}
					style={{
						top: viewport.bottom - height,
						height,
						transform: motion && motion.offset ? `translateY(${motion.offset}px)` : undefined,
						transition: motion && motion.animate ? `transform ${SETTLE_MS}ms ease-out` : undefined,
					}}
					onOpenAutoFocus={(e) => {
						const active = editor.getContainerDocument().activeElement
						returnFocusRef.current = active instanceof HTMLElement ? active : null
						e.preventDefault()
						if (contentRef.current) contentRef.current.focus()
					}}
					onCloseAutoFocus={(e) => {
						e.preventDefault()
						const target = returnFocusRef.current
						if (target && target.isConnected) target.focus()
						else editor.getContainer().focus()
					}}
					onEscapeKeyDown={(e) => {
						const active = editor.getContainerDocument().activeElement
						if (active instanceof HTMLInputElement && active.value !== '') e.preventDefault()
					}}
					onInteractOutside={(e) => {
						const target = e.detail.originalEvent.target
						if (target instanceof Element && target.closest('.tlui-dialog__content')) {
							e.preventDefault()
						}
					}}
					onContextMenu={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
				>
					<_Dialog.Title className="tlui-libraries-sheet__title">{label}</_Dialog.Title>
					<button
						type="button"
						className="tlui-libraries-sheet__handle"
						aria-label={msg(messages.resize)}
						aria-expanded={detent === 'full'}
						onPointerDown={onHandlePointerDown}
						onPointerMove={onHandlePointerMove}
						onPointerUp={onHandlePointerUp}
						onPointerCancel={onHandlePointerCancel}
						onKeyDown={onHandleKeyDown}
						onClick={() => {
							if (tappedAfterDrag.current) {
								tappedAfterDrag.current = false
								return
							}
							moveTo(detent === 'full' ? 'half' : 'full')
						}}
					/>
					{children}
				</_Dialog.Content>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}
