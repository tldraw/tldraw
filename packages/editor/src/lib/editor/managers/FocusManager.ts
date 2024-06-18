import type { Editor } from '../Editor'

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

	static create(editor: Editor, autoFocus?: boolean) {
		const container = editor.getContainer()
		if (!container) return null

		return new FocusManager(editor, container, autoFocus)
	}

	constructor(
		public editor: Editor,
		private container: HTMLElement,
		autoFocus?: boolean
	) {
		this.disposeSideEffectListener = editor.sideEffects.registerAfterChangeHandler(
			'instance',
			(prev, next) => {
				if (prev.isFocused !== next.isFocused) {
					next.isFocused ? this.focus() : this.blur()
					this.updateContainerClass()
				}
			}
		)

		const currentFocusState = editor.getInstanceState().isFocused
		if (autoFocus !== currentFocusState) {
			editor.updateInstanceState({ isFocused: !!autoFocus })
		}
		this.updateContainerClass()
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
		const instanceState = this.editor.getInstanceState()

		if (instanceState.isFocused) {
			this.container.classList.add('tl-container__focused')
		} else {
			this.container.classList.remove('tl-container__focused')
		}
	}

	focus() {
		this.container.focus()
	}

	blur() {
		this.editor.complete() // stop any interaction
		this.container.blur() // blur the container
	}

	dispose() {
		this.disposeSideEffectListener?.()
	}
}
