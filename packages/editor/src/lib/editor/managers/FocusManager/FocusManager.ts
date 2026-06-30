import { bind } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * A manager for ensuring correct focus across the editor.
 * It will listen for changes in the instance state to make sure the
 * container is focused when the editor is focused.
 * Also, it will make sure that the focus is on things like text
 * labels when the editor is in editing mode.
 *
 * @internal
 */
export class FocusManager extends EditorManager {
	constructor(editor: Editor, autoFocus?: boolean) {
		super(editor)

		const disposeSideEffectListener = editor.sideEffects.registerAfterChangeHandler(
			'instance',
			(prev, next) => {
				if (prev.isFocused !== next.isFocused) {
					this.updateContainerClass()
				}
			}
		)
		this.register(() => disposeSideEffectListener?.())

		const currentFocusState = editor.getInstanceState().isFocused
		if (autoFocus !== currentFocusState) {
			editor.updateInstanceState({ isFocused: !!autoFocus })
		}
		this.updateContainerClass()

		const body = editor.getContainerDocument().body
		body.addEventListener('keydown', this.handleKeyDown)
		body.addEventListener('mousedown', this.handleMouseDown)
		this.register(() => {
			body.removeEventListener('keydown', this.handleKeyDown)
			body.removeEventListener('mousedown', this.handleMouseDown)
		})
	}

	/**
	 * The editor's focus state and the container's focus state
	 * are not necessarily always in sync. For that reason we
	 * can't rely on the css `:focus` or `:focus-within` selectors to style the
	 * editor when it is in focus.
	 *
	 * For that reason we synchronize the editor's focus state with a
	 * special class on the container: tl-container__focused
	 */
	private updateContainerClass() {
		const container = this.editor.getContainer()
		const instanceState = this.editor.getInstanceState()

		if (instanceState.isFocused) {
			container.classList.add('tl-container__focused')
		} else {
			container.classList.remove('tl-container__focused')
		}
		container.classList.add('tl-container__no-focus-ring')
	}

	@bind private handleKeyDown(keyEvent: KeyboardEvent) {
		const container = this.editor.getContainer()
		const activeEl = container.ownerDocument.activeElement
		// Edit mode should remove the focus ring, however if the active element's
		// parent is the contextual toolbar, then allow it.
		if (this.editor.getEditingShapeId() && !activeEl?.closest('.tlui-contextual-toolbar')) return
		if (activeEl === container && this.editor.getSelectedShapeIds().length > 0) return
		if (['Tab', 'ArrowUp', 'ArrowDown'].includes(keyEvent.key)) {
			container.classList.remove('tl-container__no-focus-ring')
		}
	}

	@bind private handleMouseDown() {
		const container = this.editor.getContainer()
		container.classList.add('tl-container__no-focus-ring')
	}

	focus() {
		this.editor.getContainer().focus()
	}

	blur({ blurContainer = true } = {}) {
		this.editor.complete() // stop any interaction
		if (blurContainer) this.editor.getContainer().blur() // blur the container
	}
}
