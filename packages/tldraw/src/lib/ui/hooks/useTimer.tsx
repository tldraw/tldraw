import { Editor, useEditor, useValue } from '@tldraw/editor'
import React, { useCallback } from 'react'
import { TLTimerProps } from '../components/Timer/Timer'

/** @public */
export interface ServerOffsetProviderProps {
	children: React.ReactNode
	offset?: number
}

/** @public */
export const ServerOffsetContext = React.createContext<number>(0)

/** @public @react */
export function ServerOffsetProvider({ children, offset = 0 }: ServerOffsetProviderProps) {
	return <ServerOffsetContext.Provider value={offset}>{children}</ServerOffsetContext.Provider>
}

function useServerOffset() {
	const ctx = React.useContext(ServerOffsetContext)
	if (ctx === undefined) {
		throw new Error('useServerOffset must be used within a ServerOffsetProvider')
	}

	return ctx
}

/** @public @react */
export function useTimer() {
	const editor = useEditor()
	const timerProps = useValue(
		'timer props',
		() => editor.getDocumentSettings().meta.timer as any as TLTimerProps | undefined,
		[editor]
	)
	const serverOffset = useServerOffset()
	const getCurrentServerTime = useCallback(() => {
		return Date.now() + serverOffset
	}, [serverOffset])

	const getElapsedTime = useCallback(
		(props: TLTimerProps) => {
			if (props.state.state !== 'running') return 0
			return getCurrentServerTime() - props.state.lastStartTime
		},
		[getCurrentServerTime]
	)

	return {
		getCurrentServerTime,
		getElapsedTime,
		timerProps,
	}
}

const DEFAULT_TIMER_DURATION = 5 * 60 * 1000

/** @public */
export function initializeTimer(editor: Editor) {
	let meta = editor.getDocumentSettings().meta as any
	if (!meta.timer || meta.timer.initialTime === undefined) {
		meta = {
			...meta,
			timer: {
				initialTime: DEFAULT_TIMER_DURATION,
				remainingTime: DEFAULT_TIMER_DURATION,
				state: { state: 'stopped' },
			},
		}
		editor.updateDocumentSettings({
			meta,
		})
	}
}
