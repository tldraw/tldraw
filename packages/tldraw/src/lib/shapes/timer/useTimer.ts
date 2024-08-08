import { TLTimerState, useEditor } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

export function useTimer(state: TLTimerState) {
	const editor = useEditor()
	const [time, setTime] = useState(0)
	const timeoutRef = useRef<number | null>(null)
	if (state === 'running') {
		timeoutRef.current = editor.timers.setTimeout(() => {
			return setTime(time + 1)
		}, 1000)
	} else if (state === 'paused' || state === 'stopped') {
		clearTimeout(timeoutRef.current as any)
	}

	useEffect(() => {
		return () => clearTimeout(timeoutRef.current as any)
	}, [])

	return time
}
