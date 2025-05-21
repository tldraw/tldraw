import { atom } from '@tldraw/state'
import { useValue } from '@tldraw/state-react'
import { useEffect } from 'react'

/**
 * A hook that tracks whether a specific keyboard key is currently pressed.
 *
 * Uses signals to efficiently track key states and only trigger re-renders when the tracked keys change.
 *
 * @example
 * ```ts
 * const HyperlinkButton = ({ url }: { url: string }) => {
 *   const shiftPressed = useReactiveKeyPressed(['Shift', "CMD"])
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
 * @param keys - Array of key names to track (e.g. `['Shift', 'Meta', 'Escape', 'a']`).
 * @returns A boolean indicating whether any of the specified keys are currently pressed.
 *
 * @public
 */
export const pressedKeysSignal = atom('pressedKeys', {} as { [key: string]: boolean })

export function useReactiveKeyPressed(keys: string[]) {
	useEffect(() => {
		const handleKey = (isPressed: boolean) => (e: KeyboardEvent) => {
			const prev = pressedKeysSignal.get()
			if (keys.includes(e.key) && prev[e.key] !== isPressed) {
				pressedKeysSignal.set({ ...prev, [e.key]: isPressed })
			}
		}

		window.addEventListener('keydown', handleKey(true))
		window.addEventListener('keyup', handleKey(false))

		return () => {
			window.removeEventListener('keydown', handleKey(true))
			window.removeEventListener('keyup', handleKey(false))
		}
	}, [keys])

	return useValue('pressedKeys', () => pressedKeysSignal.get(), [pressedKeysSignal])
}
