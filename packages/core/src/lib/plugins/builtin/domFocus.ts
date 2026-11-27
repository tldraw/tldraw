import { bind } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { EditorManager } from '../../editor/managers/EditorManager'
import { defineCapability, definePlugin } from '../plugin'

/**
 * Moves DOM focus to and from the editor's container. `editor.focus()` and `editor.blur()` use it
 * when it is present. The editor's focused state itself is instance data and needs no plugin.
 *
 * @public
 */
export interface TLContainerFocus {
	focus(): void
	blur(): void
}

/** @public */
export const containerFocusCapability = defineCapability<TLContainerFocus>('containerFocus')

/**
 * Ensures correct focus across the editor.
 * It will listen for changes in the instance state to make sure the
 * container is focused when the editor is focused.
 * Also, it will make sure that the focus is on things like text
 * labels when the editor is in editing mode.
 *
 * @internal
 */
export class DomContainerFocus extends EditorManager implements TLContainerFocus {
	constructor(editor: Editor) {
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

	blur() {
		this.editor.getContainer().blur()
	}
}

/**
 * Keeps the container's DOM focus and focus classes in sync with the editor's focused state.
 *
 * @public
 */
export const domFocusPlugin = definePlugin({
	id: 'domFocus',
	provides: [containerFocusCapability],
	setup(ctx) {
		const focus = new DomContainerFocus(ctx.editor)
		ctx.provide(containerFocusCapability, focus)
		ctx.onDispose(() => focus.dispose())
	},
})
