import { animationFrameTickPlugin } from '../plugins/builtin/animationFrameTick'
import { domFocusPlugin } from '../plugins/builtin/domFocus'
import { domTextMeasurementPlugin } from '../plugins/builtin/domTextMeasurement'
import { externalContentPlugin } from '../plugins/builtin/externalContent'
import { snappingPlugin } from '../plugins/builtin/snappingPlugin'
import type { TLPlugin } from '../plugins/plugin'
import { reactRenderingPlugins } from './reactRenderingPlugins'

/**
 * The plugins that `new Editor()` installs unless the caller replaces them. They give the editor
 * the behavior that it had before plugins existed: a browser frame loop, DOM text measurement and
 * focus, snapping, external content, and React rendering and SVG export.
 *
 * @public
 */
export const legacyEditorPlugins: readonly TLPlugin[] = [
	animationFrameTickPlugin,
	domTextMeasurementPlugin,
	domFocusPlugin,
	snappingPlugin,
	externalContentPlugin,
	...reactRenderingPlugins,
]
