import { useEditor } from '@tldraw/editor'
import { useEffect, useRef } from 'react'
import { RumMonitor } from './RumMonitor'
import type { RumConfig } from './types'

/**
 * React hook that starts RUM monitoring for the current editor.
 *
 * Must be used inside `<Tldraw />` or `<TldrawEditor />`.
 * The monitor is created on mount and disposed on unmount.
 *
 * @example
 * ```tsx
 * function MyPerformanceMonitor() {
 *   useRum({ enabled: true, sinks: [new ConsoleSink()] })
 *   return null
 * }
 * ```
 *
 * @public
 */
export function useRum(config: Partial<RumConfig>): void {
	const editor = useEditor()
	const configRef = useRef(config)
	configRef.current = config

	useEffect(() => {
		const monitor = new RumMonitor(editor, configRef.current)
		monitor.start()
		return () => monitor.dispose()
	}, [editor])
}
