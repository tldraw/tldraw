import { computed } from '@tldraw/state'
import { InstancePageStateRecordType, TLInstancePageState } from '@tldraw/tlschema'
import { Editor } from './Editor'
import { OptionalKeys } from './types/misc-types'

// Manages the CURRENT page state
export class PageStateManager {
	constructor(public editor: Editor) {
		this.editor.updatePageState(
			{
				id: this.id,
				editingShapeId: null,
				hoveredShapeId: null,
				erasingShapeIds: [],
			},
			true
		)
	}

	/**
	 * The current page state id.
	 *
	 * @example
	 * ```ts
	 * editor.currentPage.state.id
	 * ```
	 *
	 * @public
	 */
	@computed get id() {
		return InstancePageStateRecordType.createId(this.editor.currentPageId)
	}

	/**
	 * The current page state record.
	 *
	 * @example
	 * ```ts
	 * editor.currentPage.state.record
	 * ```
	 *
	 * @public
	 */
	@computed get record(): TLInstancePageState {
		return this.editor.store.get(this.id)!
	}

	/**
	 * Update this instance's page state.
	 *
	 * @example
	 * ```ts
	 * editor.currentPage.state.update({ id: 'page1', editingShapeId: 'shape:123' })
	 * editor.currentPage.state.update({ id: 'page1', editingShapeId: 'shape:123' }, true)
	 * ```
	 *
	 * @param partial - The partial of the page state object containing the changes.
	 * @param ephemeral - Whether the command is ephemeral.
	 *
	 * @public
	 */
	update(partial: OptionalKeys<TLInstancePageState, 'id'>, ephemeral = false): this {
		this.editor.updatePageState({ ...partial, id: this.id }, ephemeral)
		return this
	}
}
