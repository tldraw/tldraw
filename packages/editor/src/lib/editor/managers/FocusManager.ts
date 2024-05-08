import type { Editor } from '../Editor'

/**
 * A manager for ensuring correct focus across the editor.
 * It will listen for changes in the instance state to make sure the
 * container is focused when the editor is focused.
 * Also, it will make sure that the focus is on things like text
 * labels when the editor is in editing mode.
 *
 * @public
 */
export class FocusManager {
	private disposeStoreListener?: () => void

	constructor(
		public editor: Editor,
		autoFocus?: boolean
	) {
		this.disposeStoreListener = editor.store.listen(
			({ changes }) => {
				for (const [prev, next] of Object.values(changes.updated)) {
					if (prev.typeName !== 'instance' || next.typeName !== 'instance') continue

					if (prev.isFocused !== next.isFocused) {
						next.isFocused ? this.focus() : this.blur()
					}
				}
			},
			{ scope: 'session' }
		)

		const currentFocusState = editor.getInstanceState().isFocused
		if (autoFocus !== currentFocusState) {
			editor.updateInstanceState({ isFocused: !!autoFocus })
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
		this.disposeStoreListener?.()
	}
}
