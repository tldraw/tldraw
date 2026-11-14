import { Editor, TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { ButtonFrameShapeUtil } from './ButtonFrameShapeUtil'
import { resetButtonTheme } from './buttonTheme'
import { BUTTON_VARIANT_IDS } from './buttonTokens'
import { TokenInspector } from './TokenInspector'
import { VariantToolbar } from './VariantToolbar'
import './button-variant-lab.css'

// There's a guide at the bottom of this file!

const shapeUtils = [ButtonFrameShapeUtil]

// [2]
const components: TLComponents = {
	TopPanel: VariantToolbar,
	StylePanel: TokenInspector,
}

// [1]
function handleMount(editor: Editor) {
	resetButtonTheme()
	if (editor.getCurrentPageShapes().some((s) => s.type === 'button-frame')) return
	editor.createShapes(
		BUTTON_VARIANT_IDS.map((variant, i) => ({
			type: 'button-frame',
			x: 100 + i * 260,
			y: 160,
			props: { variant },
		}))
	)
	editor.zoomToFit()
}

export default function ButtonVariantLabExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={shapeUtils} components={components} onMount={handleMount} />
		</div>
	)
}

/*
One React button component, rendered in four variants — primary, secondary,
danger, and ghost — each inside its own iframe on the canvas. Use the top
panel to create more variant frames, then pick a design token from the
dropdown and type a value to restyle the selected frames live.

[1]
On mount, reset the theme atom — it's module-level state that would
otherwise survive a remount while the store reseeds — then seed the canvas
with one frame per variant so the four base versions are visible side by
side.

[2]
The toolbar for creating variant frames docks top center, and the token
inspector extends tldraw's style panel in the top right. It renders the
default panel content alongside the token rows whenever ordinary shapes are
part of the picture.
*/
