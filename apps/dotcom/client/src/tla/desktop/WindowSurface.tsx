import { useValue } from 'tldraw'
import { AppWindow } from './AppWindow'
import { windowsAtom } from './WindowManager'

export function WindowSurface() {
	const windows = useValue('windows', () => windowsAtom.get(), [])
	const visible = windows.filter((w) => !w.minimized)

	return (
		<div className="desktop__windows" aria-label="Open windows">
			{visible.map((w) => (
				<AppWindow key={w.id} id={w.id} />
			))}
		</div>
	)
}
