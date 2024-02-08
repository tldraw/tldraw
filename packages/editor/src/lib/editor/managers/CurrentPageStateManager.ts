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
				const prev = this.getRecord()
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
	@computed getRecord() {
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
		return this.getRecord().hintingShapeIds
	}
	@computed getErasingShapeIds() {
		return this.getRecord().erasingShapeIds
	}
	@computed getHoveredShapeId() {
		return this.getRecord().hoveredShapeId
	}
	@computed getCroppingShapeId() {
		return this.getRecord().croppingShapeId
	}
	@computed getMeta() {
		return this.getRecord().meta
	}
}
