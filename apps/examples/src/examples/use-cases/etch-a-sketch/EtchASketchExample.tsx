import { defaultOverlayUtils, TLAnyOverlayUtilConstructor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { EtchASketchOverlayUtil } from './EtchASketchOverlayUtil'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [
	...defaultOverlayUtils,
	EtchASketchOverlayUtil,
]

export default function EtchASketchExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} />
		</div>
	)
}
