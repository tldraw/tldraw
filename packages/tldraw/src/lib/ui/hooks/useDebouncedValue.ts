import { useEditor } from '@tldraw/editor'
import { useEffect, useState } from 'react'

/** @public */
export function useDebouncedValue<T>(value: T, delay: number): T {
	const editor = useEditor()
	const [debouncedValue, setDebouncedValue] = useState(value)

	useEffect(() => {
		const timeout = editor.timers.setTimeout(() => {
			setDebouncedValue(value)
		}, delay)

		return () => {
			clearTimeout(timeout)
		}
	}, [editor, value, delay])

	return debouncedValue
}
