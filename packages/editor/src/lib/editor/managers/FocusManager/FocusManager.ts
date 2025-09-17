import type { Editor } from '../../Editor'

/**
 * A manager for ensuring correct focus across the editor.
 * It will listen for changes in the instance state to make sure the
 * container is focused when the editor is focused.
 * Also, it will make sure that the focus is on things like text
 * labels when the editor is in editing mode.
 *
 * @internal
 */
export class FocusManager {
	private disposeSideEffectListener?: () => void

	constructor(
		public editor: Editor,
		autoFocus?: boolean
	) {
		this.disposeSideEffectListener = editor.sideEffects.registerAfterChangeHandler(
			'instance',
			(prev, next) => {
				if (prev.isFocused !== next.isFocused) {
					this.updateContainerClass()
				}
			}
		)

		const currentFocusState = editor.getInstanceState().isFocused
		if (autoFocus !== currentFocusState) {
			editor.updateInstanceState({ isFocused: !!autoFocus })
		}
		this.updateContainerClass()

		document.body.addEventListener('keydown', this.handleKeyDown.bind(this))
		document.body.addEventListener('mousedown', this.handleMouseDown.bind(this))
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

	private handleKeyDown(keyEvent: KeyboardEvent) {
		const container = this.editor.getContainer()
		const activeEl = document.activeElement
		// Edit mode should remove the focus ring, however if the active element's
		// parent is the contextual toolbar, then allow it.
		if (this.editor.isIn('select.editing_shape') && !activeEl?.closest('.tlui-contextual-toolbar'))
			return
		if (activeEl === container && this.editor.getSelectedShapeIds().length > 0) return
		if (['Tab', 'ArrowUp', 'ArrowDown'].includes(keyEvent.key)) {
			container.classList.remove('tl-container__no-focus-ring')
		}
	}

	private handleMouseDown() {
		const container = this.editor.getContainer()
		container.classList.add('tl-container__no-focus-ring')
	}

	focus() {
		this.editor.getContainer().focus()
	}

	blur() {
		this.editor.complete() // stop any interaction
		this.editor.getContainer().blur() // blur the container
	}

	dispose() {
		document.body.removeEventListener('keydown', this.handleKeyDown.bind(this))
		document.body.removeEventListener('mousedown', this.handleMouseDown.bind(this))
		this.disposeSideEffectListener?.()
	}
}
