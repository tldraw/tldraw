import { useEffect, useState } from 'react'

/** @public */
export function useKeyPressed(targetKey: string): boolean

/**
 * A hook that tracks whether a specific keyboard key is currently pressed.
 *
 * Subscribes to global `keydown` and `keyup` events on the window object. Returns `true` if the given
 * key is held down, and `false` otherwise. This is useful for conditional UI behaviors such as disabling
 * or modifying elements when modifier keys like `Shift` or `Control` are active.
 *
 * This hook is stateful and subscribes independently per component. You do not need to use this hook
 * inside components wrapped with {@link track}, unless you're wiring in local key-based logic.
 *
 * @example
 * ```ts
 * const HyperlinkButton = ({ url }: { url: string }) => {
 *   const shiftPressed = useKeyPressed('Shift')
 *
 *   return (
 *     <a
 *       href={url}
 *       className={classNames('tl-hyperlink-button', {
 *         'tl-hyperlink-pointer-event__none': shiftPressed,
 *       })}
 *       style={{
 *         pointerEvents: shiftPressed ? 'none' : 'auto',
 *       }}
 *     >
 *       Visit
 *     </a>
 *   )
 * }
 * ```
 *
 * @param targetKey The name of the key to track (e.g. `'Shift'`, `'Meta'`, `'Escape'`, `'a'`).
 * @returns A boolean indicating whether the specified key is currently pressed.
 *
 * @public
 */
export function useKeyPressed(targetKey: string): boolean {
	const [pressed, setPressed] = useState(false)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === targetKey) setPressed(true)
		}
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === targetKey) setPressed(false)
		}

		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)

		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
		}
	}, [targetKey])

	return pressed
}
