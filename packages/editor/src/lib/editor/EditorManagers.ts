import EventEmitter from 'eventemitter3'
import type { AssetsManager } from './managers/AssetsManager/AssetsManager'
import type { BindingsManager } from './managers/BindingsManager/BindingsManager'
import type { CameraManager } from './managers/CameraManager/CameraManager'
import type { ContentManager } from './managers/ContentManager/ContentManager'
import type { EventsManager } from './managers/EventsManager/EventsManager'
import type { HitTestManager } from './managers/HitTestManager/HitTestManager'
import type { LayoutManager } from './managers/LayoutManager/LayoutManager'
import type { PagesManager } from './managers/PagesManager/PagesManager'
import type { ResizeManager } from './managers/ResizeManager/ResizeManager'
import type { SelectionManager } from './managers/SelectionManager/SelectionManager'
import type { ShapeCommandsManager } from './managers/ShapeCommandsManager/ShapeCommandsManager'
import type { ShapesManager } from './managers/ShapesManager/ShapesManager'
import type { StylesManager } from './managers/StylesManager/StylesManager'
import type { TLEventMap } from './types/emit-types'

/**
 * The namespaces of the editor. Each groups one area of the editor's API, for example
 * `editor.camera` or `editor.selection`.
 *
 * @public
 */
export abstract class EditorManagers extends EventEmitter<TLEventMap> {
	/** @public */
	abstract readonly events: EventsManager

	/** @public */
	abstract readonly selection: SelectionManager

	/** @public */
	abstract readonly camera: CameraManager

	/** @public */
	abstract readonly shapes: ShapesManager

	/** @public */
	abstract readonly pages: PagesManager

	/** @public */
	abstract readonly assets: AssetsManager

	/** @public */
	abstract readonly hitTest: HitTestManager

	/** @public */
	abstract readonly bindings: BindingsManager

	/** @public */
	abstract readonly commands: ShapeCommandsManager

	/** @public */
	abstract readonly layout: LayoutManager

	/** @public */
	abstract readonly resize: ResizeManager

	/** @public */
	abstract readonly styles: StylesManager

	/** @public */
	abstract readonly content: ContentManager
}
