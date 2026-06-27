import { StateNode, TLStateNodeConstructor, react } from '@tldraw/editor'
import { Drawing } from '../../shapes/draw/toolStates/Drawing'
import { Idle } from '../../shapes/draw/toolStates/Idle'
import { MagicWandDrawing } from './MagicWandDrawing'
import { MagicWandLineTuning } from './MagicWandLineTuning'
import { MagicWandMorphTuning } from './MagicWandMorphTuning'

/**
 * The magic wand tool. It draws like the draw tool, but recognizes gestures: a
 * stroke that circles existing shapes lasso-selects them instead of leaving a
 * drawing behind. It is intended to grow into a "multitool" that matches more
 * gestures to dispatch to different tools.
 *
 * After a lasso, it hands off to the select tool but keeps itself masked over it
 * (so it stays the displayed active tool); once the selection is cleared, control
 * returns to the magic wand instead of staying in select.
 *
 * @public
 */
export class MagicWandTool extends StateNode {
	static override id = 'magic-wand'
	static override initial = 'idle'
	static override isLockable = false
	static override useCoalescedEvents = true
	static override children(): TLStateNodeConstructor[] {
		return [Idle, MagicWandDrawing, MagicWandMorphTuning, MagicWandLineTuning]
	}

	override shapeType = 'draw'

	// Whether a lasso has handed off to a select session that the magic wand is
	// masking over (see maskSelectAfterLasso).
	private isMaskingSelect = false
	// A single editor-lifetime reactor that keeps the mask applied and returns to
	// the magic wand once the masked selection is cleared. Created lazily; gated by
	// isMaskingSelect so it's a no-op the rest of the time.
	private maskReactor?: () => void

	override onExit() {
		const drawingState = this.children!['drawing'] as Drawing
		drawingState.initialShape = undefined
	}

	// Called right after a lasso hands off to the select tool. Masks the magic wand
	// over select so it remains the displayed active tool, and arms the reactor that
	// returns here once the selection is cleared.
	maskSelectAfterLasso() {
		this.isMaskingSelect = true
		this.editor.getStateDescendant('select')?.setCurrentToolIdMask('magic-wand')
		this.ensureMaskReactor()
	}

	private stopMaskingSelect() {
		this.isMaskingSelect = false
		this.editor.getStateDescendant('select')?.setCurrentToolIdMask(undefined)
	}

	private ensureMaskReactor() {
		if (this.maskReactor) return
		this.maskReactor = react('magic wand select mask', () => {
			const select = this.editor.getStateDescendant('select')
			// Track the relevant reactive state before bailing, so the reactor stays
			// subscribed even while idle.
			const actualToolId = this.editor.getCurrentTool()?.id
			const mask = select?.getCurrentToolIdMask()
			const isSelectIdle = this.editor.isIn('select.idle')
			const hasSelection = this.editor.getSelectedShapeIds().length > 0

			if (!this.isMaskingSelect) return

			if (actualToolId !== 'select') {
				// The user navigated away from select another way; stop masking.
				this.stopMaskingSelect()
			} else if (isSelectIdle && !hasSelection) {
				// Selection cleared (deselected): return to the magic wand.
				this.stopMaskingSelect()
				this.editor.setCurrentTool('magic-wand')
			} else if (isSelectIdle && mask !== 'magic-wand') {
				// A select interaction (e.g. resize) cleared the mask on the way back
				// to idle; restore it so the magic wand stays the displayed tool.
				select!.setCurrentToolIdMask('magic-wand')
			}
		})
		this.editor.disposables.add(this.maskReactor)
	}
}
