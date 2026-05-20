import { useCallback } from 'react'
import { Editor, TLComponents, Tldraw } from 'tldraw'
import { AppLauncherShapeUtil } from './AppLauncherShape'
import { getLauncherSeedShapes } from './seedLaunchers'
import { Wallpaper } from './Wallpaper'
import { focusDesktop } from './WindowManager'

const customShapes = [AppLauncherShapeUtil]

const desktopComponents: TLComponents = {
	Background: Wallpaper,
}

export function DesktopCanvas({ onEditor }: { onEditor(editor: Editor): void }) {
	const handleMount = useCallback(
		(editor: Editor) => {
			// Seed before flipping readonly: programmatic mutations are
			// allowed in readonly mode, but we still want to be explicit
			// about the order of operations.
			editor.createShapes(getLauncherSeedShapes())
			editor.setCameraOptions({ isLocked: true, zoomSteps: [1] })
			editor.updateInstanceState({ isReadonly: true })

			// Release menu-bar focus to the desktop whenever the user
			// pointers down on the empty canvas. Pointer-downs on a shape
			// (a launcher) don't trigger this, so the click can still
			// open the window and focus follows.
			editor.on('event', (info) => {
				if (info.type === 'pointer' && info.name === 'pointer_down' && info.target === 'canvas') {
					focusDesktop()
				}
			})

			onEditor(editor)
		},
		[onEditor]
	)

	return (
		<div className="desktop__canvas tldraw__editor">
			<Tldraw
				hideUi
				shapeUtils={customShapes}
				components={desktopComponents}
				onMount={handleMount}
			/>
		</div>
	)
}
