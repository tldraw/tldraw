import { useEffect, useRef, useState } from 'react'
import { Editor } from 'tldraw'
import { DesktopCanvas } from './DesktopCanvas'
import './desktop.css'
import { DesktopDialog } from './DesktopDialog'
import { DesktopFloppy } from './DesktopFloppy'
import { DesktopMenuBar } from './DesktopMenuBar'
import { MinimizedDock } from './MinimizedDock'
import { openWindow, windowsAtom } from './WindowManager'
import { WindowSurface } from './WindowSurface'

export function DesktopPage() {
	const [, setEditor] = useState<Editor | null>(null)
	const didSeed = useRef(false)

	useEffect(() => {
		// Open the tldraw.com window pre-maximized on first mount, but only
		// if no windows have already been seeded (e.g. on a hot reload the
		// atom may still hold previous state).
		if (didSeed.current) return
		didSeed.current = true
		if (windowsAtom.get().length === 0) {
			openWindow('tldraw', { maximized: true })
		}
	}, [])

	return (
		<div className="desktop">
			<DesktopMenuBar />
			<DesktopCanvas onEditor={setEditor} />
			<MinimizedDock />
			<DesktopFloppy />
			<WindowSurface />
			<DesktopDialog />
		</div>
	)
}
