import { computed } from '@tldraw/state'
import { InstancePageStateRecordType, TLInstancePageState } from '@tldraw/tlschema'
import { Editor } from '../Editor'
import { TLCommandHistoryOptions } from '../types/history-types'

/** @public */
export type CurrentPageStateUpdate = Partial<
	Omit<TLInstancePageState, 'selectedShapeIds' | 'editingShapeId' | 'pageId' | 'focusedGroupId'>
>

/** @public */
export class CurrentPageStateManager {
	constructor(private readonly editor: Editor) {
		this._update = this.editor.history.createCommand(
			'setInstancePageState',
			(
				partial: Partial<Omit<TLInstancePageState, 'selectedShapeIds'>>,
				historyOptions?: TLCommandHistoryOptions
			) => {
				const prev = this.get()
				return { data: { prev, partial }, ...historyOptions }
			},
			{
				do: ({ prev, partial }) => {
					this.editor.store.update(prev.id, (state) => ({ ...state, ...partial }))
				},
				undo: ({ prev }) => {
					this.editor.store.update(prev.id, () => prev)
				},
			}
		)
	}

	getId() {
		return InstancePageStateRecordType.createId(this.editor.getCurrentPageId())
	}
	get() {
		return this.editor.store.get(this.getId())!
	}

	/** @internal */
	_update: (
		partial: Partial<Omit<TLInstancePageState, 'selectedShapeIds'>>,
		historyOptions?:
			| Partial<{ squashing: boolean; ephemeral: boolean; preservesRedoStack: boolean }>
			| undefined
	) => Editor

	/**
	 * Update this instance's page state.
	 *
	 * @example
	 * ```ts
	 * editor.updateCurrentPageState({ id: 'page1', editingShapeId: 'shape:123' })
	 * editor.updateCurrentPageState({ id: 'page1', editingShapeId: 'shape:123' }, { ephemeral: true })
	 * ```
	 *
	 * @param partial - The partial of the page state object containing the changes.
	 * @param historyOptions - The history options for the change.
	 *
	 * @public
	 */
	update(partial: CurrentPageStateUpdate, historyOptions?: TLCommandHistoryOptions) {
		this._update(partial, historyOptions)
	}

	@computed getHintingShapeIds() {
		return this.get().hintingShapeIds
	}
	@computed getErasingShapeIds() {
		return this.get().erasingShapeIds
	}
	@computed getHoveredShapeId() {
		return this.get().hoveredShapeId
	}
	@computed getCroppingShapeId() {
		return this.get().croppingShapeId
	}
	@computed getMeta() {
		return this.get().meta
	}
}
