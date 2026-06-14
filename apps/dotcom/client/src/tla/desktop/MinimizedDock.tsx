import { useValue } from 'tldraw'
import { apps } from './apps'
import { getLauncherScreenPosition, LAUNCHER_H, LAUNCHER_W } from './seedLaunchers'
import { restoreWindow, windowsAtom } from './WindowManager'

// Minimized windows collapse to a chip pinned over their launcher icon
// on the canvas. The chip overlays the launcher's bottom-right corner so
// the user can see at a glance which apps are tucked away, classic-OS
// style. Clicking the chip restores the window above all others.
export function MinimizedDock() {
	const minimized = useValue(
		'minimized-windows',
		() => windowsAtom.get().filter((w) => w.minimized),
		[]
	)

	if (minimized.length === 0) return null

	return (
		<div className="desktop__minimized-layer" aria-label="Minimized windows">
			{minimized.map((w) => {
				const pos = getLauncherScreenPosition(w.appId)
				if (!pos) return null
				const app = apps[w.appId]
				return (
					<button
						key={w.id}
						type="button"
						className="desktop-minimized-icon hoverable"
						style={{
							transform: `translate(${pos.x + LAUNCHER_W - 18}px, ${pos.y + LAUNCHER_H - 18}px)`,
						}}
						onClick={() => restoreWindow(w.id)}
						title={`Restore ${app.title}`}
						aria-label={`Restore ${app.title}`}
					>
						<svg viewBox="0 0 12 12" aria-hidden="true">
							<rect x="2" y="3" width="8" height="6" fill="none" strokeWidth="1.5" />
							<rect x="2" y="3" width="8" height="2" />
						</svg>
					</button>
				)
			})}
		</div>
	)
}
