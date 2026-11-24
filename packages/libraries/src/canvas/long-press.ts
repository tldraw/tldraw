import {
	type HTMLAttributes,
	type MouseEvent,
	type PointerEvent,
	type TouchEvent,
	useMemo,
} from 'react'
import { useEditor, Vec, type VecModel } from 'tldraw'

const LONG_PRESS_MS = 500
const LONG_PRESS_SLOP_SQUARED = 10 * 10

type PressProps = Pick<
	HTMLAttributes<HTMLElement>,
	| 'onPointerDown'
	| 'onPointerMove'
	| 'onPointerUp'
	| 'onPointerCancel'
	| 'onTouchEnd'
	| 'onClickCapture'
>

/**
 * Props that call `onLongPress` when a touch or pen rests on an element without moving, and swallow
 * the click its release would make, and the mouse events a browser makes for a touch, whose press
 * would move focus out of a menu just opened. Mouse presses are left alone: right-click opens the same menus.
 * With `enabled` false, no props.
 */
export function useLongPress(enabled: boolean): (onLongPress: () => void) => PressProps {
	const editor = useEditor()
	return useMemo(() => {
		let timer: number | undefined
		let start: VecModel | undefined
		let fired = false
		const cancel = () => {
			editor.timers.clearTimeout(timer)
			timer = undefined
			start = undefined
		}
		return (onLongPress) => {
			if (!enabled) return {}
			return {
				onPointerDown(e: PointerEvent<HTMLElement>) {
					cancel()
					fired = false
					if (e.pointerType === 'mouse') return
					start = { x: e.clientX, y: e.clientY }
					timer = editor.timers.setTimeout(() => {
						cancel()
						fired = true
						onLongPress()
					}, LONG_PRESS_MS)
				},
				onPointerMove(e: PointerEvent<HTMLElement>) {
					if (!start) return
					if (Vec.Dist2(start, { x: e.clientX, y: e.clientY }) > LONG_PRESS_SLOP_SQUARED) cancel()
				},
				onPointerUp: cancel,
				onPointerCancel: cancel,
				onTouchEnd(e: TouchEvent<HTMLElement>) {
					if (fired && e.cancelable) e.preventDefault()
				},
				onClickCapture(e: MouseEvent<HTMLElement>) {
					if (!fired) return
					fired = false
					e.preventDefault()
					e.stopPropagation()
				},
			}
		}
	}, [editor, enabled])
}

/** `props` with each of `extra`'s handlers called after the one it already has. */
export function withHandlers<T extends object>(props: T, extra: PressProps): T {
	const merged: Record<string, unknown> = { ...(props as Record<string, unknown>) }
	for (const [name, handler] of Object.entries(extra) as [string, (e: unknown) => void][]) {
		const own = merged[name]
		merged[name] =
			typeof own === 'function'
				? (e: unknown) => {
						own(e)
						handler(e)
					}
				: handler
	}
	return merged as T
}
