import { EMPTY_ARRAY, computed } from '@tldraw/state'
import {
	TLBinding,
	TLBindingCreate,
	TLBindingId,
	TLBindingUpdate,
	TLShape,
	TLShapeId,
	createBindingId,
} from '@tldraw/tlschema'
import { bindingsIndex } from '../../derivations/bindingsIndex'
import type { Editor } from '../../Editor'
import { applyPartialToRecordWithProps } from '../../editorHelpers'
import { EditorManager } from '../EditorManager'

/**
 * Bindings between shapes: lookup, create, update and delete.
 *
 * @public
 */
export class BindingsManager extends EditorManager {
	/* -------------------- Bindings -------------------- */

	@computed
	_getBindingsIndexCache() {
		const index = bindingsIndex(this.editor)
		return this.editor.store.createComputedCache<TLBinding[], TLShape>(
			'bindingsIndex',
			(shape) => {
				return index.get().get(shape.id)
			},
			// we can ignore the shape equality check here because the index is
			// computed incrementally based on what bindings are in the store
			{ areRecordsEqual: () => true }
		)
	}

	/**
	 * Get a binding from the store by its ID if it exists.
	 */
	getBinding(id: TLBindingId): TLBinding | undefined {
		return this.editor.store.get(id) as TLBinding | undefined
	}

	/**
	 * Get all bindings of a certain type _from_ a particular shape. These are the bindings whose
	 * `fromId` matched the shape's ID.
	 */
	getBindingsFromShape<K extends TLBinding['type']>(
		shape: TLShape | TLShapeId,
		type: K
	): Extract<TLBinding, { type: K }>[]
	getBindingsFromShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type: Binding['type']
	): Binding[]
	getBindingsFromShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type: Binding['type']
	): Binding[] {
		const id = typeof shape === 'string' ? shape : shape.id
		return this.editor
			.getBindingsInvolvingShape(id)
			.filter((b) => b.fromId === id && b.type === type) as Binding[]
	}

	/**
	 * Get all bindings of a certain type _to_ a particular shape. These are the bindings whose
	 * `toId` matches the shape's ID.
	 */
	getBindingsToShape<K extends TLBinding['type']>(
		shape: TLShape | TLShapeId,
		type: K
	): Extract<TLBinding, { type: K }>[]
	getBindingsToShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type: Binding['type']
	): Binding[]
	getBindingsToShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type: Binding['type']
	): Binding[] {
		const id = typeof shape === 'string' ? shape : shape.id
		return this.editor
			.getBindingsInvolvingShape(id)
			.filter((b) => b.toId === id && b.type === type) as Binding[]
	}

	/**
	 * Get all bindings involving a particular shape. This includes bindings where the shape is the
	 * `fromId` or `toId`. If a type is provided, only bindings of that type are returned.
	 */
	getBindingsInvolvingShape<K extends TLBinding['type']>(
		shape: TLShape | TLShapeId,
		type: K
	): Extract<TLBinding, { type: K }>[]
	getBindingsInvolvingShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type?: Binding['type']
	): Binding[]
	getBindingsInvolvingShape<Binding extends TLBinding = TLBinding>(
		shape: TLShape | TLShapeId,
		type?: Binding['type']
	): Binding[] {
		const id = typeof shape === 'string' ? shape : shape.id
		const result = this._getBindingsIndexCache().get(id) ?? EMPTY_ARRAY
		if (!type) return result as Binding[]
		return result.filter((b) => b.type === type) as Binding[]
	}

	/**
	 * Create bindings from a list of partial bindings. You can omit the ID and most props of a
	 * binding, but the `type`, `toId`, and `fromId` must all be provided.
	 */
	createBindings<B extends TLBinding = TLBinding>(partials: TLBindingCreate<B>[]) {
		if (this.editor.getIsReadonly()) return this.editor

		const bindings: TLBinding[] = []
		for (const partial of partials) {
			const fromShape = this.editor.getShape(partial.fromId)
			const toShape = this.editor.getShape(partial.toId)
			if (!fromShape || !toShape) continue
			if (!this.editor.canBindShapes({ fromShape, toShape, binding: partial })) continue

			const util = this.editor.getBindingUtil(partial.type)
			const defaultProps = util.getDefaultProps()
			const binding = this.editor.store.schema.types.binding.create({
				...partial,
				id: partial.id ?? createBindingId(),
				props: {
					...defaultProps,
					...partial.props,
				},
			}) as TLBinding

			bindings.push(binding)
		}

		this.editor.store.put(bindings)
		return this.editor
	}

	/**
	 * Create a single binding from a partial. You can omit the ID and most props of a binding, but
	 * the `type`, `toId`, and `fromId` must all be provided.
	 */
	createBinding<B extends TLBinding = TLBinding>(partial: TLBindingCreate<B>) {
		return this.editor.createBindings([partial])
	}

	/**
	 * Update bindings from a list of partial bindings. Each partial must include an ID, which will
	 * be used to match the binding to it's existing record. If there is no existing record, that
	 * binding is skipped. The changes from the partial are merged into the existing record.
	 */
	updateBindings(partials: (TLBindingUpdate | null | undefined)[]) {
		if (this.editor.getIsReadonly()) return this.editor

		const updated: TLBinding[] = []

		for (const partial of partials) {
			if (!partial) continue

			const current = this.editor.getBinding(partial.id)
			if (!current) continue

			const updatedBinding = applyPartialToRecordWithProps(current, partial)
			if (updatedBinding === current) continue

			const fromShape = this.editor.getShape(updatedBinding.fromId)
			const toShape = this.editor.getShape(updatedBinding.toId)
			if (!fromShape || !toShape) continue
			if (!this.editor.canBindShapes({ fromShape, toShape, binding: updatedBinding })) continue

			updated.push(updatedBinding)
		}

		this.editor.store.put(updated)

		return this.editor
	}

	/**
	 * Update a binding from a partial binding. Each partial must include an ID, which will be used
	 * to match the binding to it's existing record. If there is no existing record, that binding is
	 * skipped. The changes from the partial are merged into the existing record.
	 */
	updateBinding<B extends TLBinding = TLBinding>(partial: TLBindingUpdate<B>) {
		return this.editor.updateBindings([partial])
	}

	/**
	 * Delete a binding by its ID. If the binding doesn't exist, it's ignored.
	 */
	deleteBinding(binding: TLBinding | TLBindingId, opts?: Parameters<Editor['deleteBindings']>[1]) {
		return this.editor.deleteBindings([binding], opts)
	}
}
