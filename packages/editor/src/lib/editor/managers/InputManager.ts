import { AtomVec } from '../../primitives/Vec'
import { Editor } from '../Editor'

export class InputManager {
	constructor(private readonly editor: Editor) {}

	/** The most recent pointer down's position in the current page space. */
	readonly originPagePoint = new AtomVec()
	/** The most recent pointer down's position in screen space. */
	readonly originScreenPoint = new AtomVec()
	/** The previous pointer position in the current page space. */
	readonly previousPagePoint = new AtomVec()
	/** The previous pointer position in screen space. */
	readonly previousScreenPoint = new AtomVec()
	/** The most recent pointer position in the current page space. */
	readonly currentPagePoint = new AtomVec()
	/** The most recent pointer position in screen space. */
	readonly currentScreenPoint = new AtomVec()
	/** Velocity of mouse pointer, in pixels per millisecond */
	readonly pointerVelocity = new AtomVec()
}
