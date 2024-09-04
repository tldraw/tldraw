import { useEditor } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'
import { TLTimerState } from './Timer'

const UPDATES_PER_SECOND = 10
const TIMEOUT = 1000 / UPDATES_PER_SECOND

export function useTimerCounter(state: TLTimerState) {
	const editor = useEditor()
	const [time, setTime] = useState(0)
	const timeoutRef = useRef<number | null>(null)
	if (state === 'running') {
		timeoutRef.current = editor.timers.setTimeout(() => {
			setTime(time + 1)
		}, TIMEOUT)
	} else if (state === 'paused' || state === 'stopped') {
		clearTimeout(timeoutRef.current as any)
	}

	useEffect(() => {
		return () => clearTimeout(timeoutRef.current as any)
	}, [])

	return time
}
