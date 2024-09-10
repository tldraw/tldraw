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
	}

	focus() {
		this.editor.getContainer().focus()
	}

	blur() {
		this.editor.complete() // stop any interaction
		this.editor.getContainer().blur() // blur the container
	}

	dispose() {
		this.disposeSideEffectListener?.()
	}
}
