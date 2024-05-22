import {
	Editor,
	PageRecordType,
	TLArrowBinding,
	TLPage,
	TLPageId,
	TLShape,
	TLShapeId,
	TLStore,
	VecModel,
	createShapeId,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
} from 'tldraw'
import { RandomSource } from './RandomSource'

export type Op =
	| {
			type: 'create-box'
			parentId?: TLShapeId
			x: number
			y: number
			width: number
			height: number
	  }
	| {
			type: 'create-frame'
			x: number
			y: number
			width: number
			height: number
	  }
	| {
			type: 'group-selection'
	  }
	| {
			type: 'ungroup-selection'
	  }
	| {
			type: 'create-arrow'
			start: TLArrowBinding | VecModel
			end: TLArrowBinding | VecModel
	  }
	| {
			type: 'delete-shape'
			id: TLShapeId
	  }
	| {
			type: 'create-page'
			id: TLPageId
	  }
	| {
			type: 'delete-page'
			id: TLPageId
	  }
	| {
			type: 'undo'
	  }
	| {
			type: 'redo'
	  }
	| {
			type: 'switch-page'
			id: TLPageId
	  }
	| {
			type: 'select-shape'
			id: TLShapeId
	  }
	| {
			type: 'deselect-shape'
			id: TLShapeId
	  }
	| {
			type: 'move-selection'
			dx: number
			dy: number
	  }
	| {
			type: 'delete-selection'
	  }
	| {
			type: 'move-selected-shapes-to-page'
			pageId: TLPageId
	  }
	| {
			type: 'mark-stopping-point'
	  }

export class FuzzEditor extends RandomSource {
	editor: Editor

	constructor(
		public readonly id: string,
		_seed: number,
		public readonly store: TLStore
	) {
		super(_seed)
		this.editor = new Editor({
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: defaultTools,
			initialState: 'select',
			store,
			getContainer: () => document.createElement('div'),
		})
	}

	ops: Op[] = []

	getRandomShapeId({ selected }: { selected?: boolean } = {}): TLShapeId | undefined {
		return this.randomElement<TLShape>(
			selected ? this.editor.getSelectedShapes() : this.editor.getCurrentPageShapes()
		)?.id
	}

	getRandomOp(): Op {
		const op = this.randomAction<Op>(
			[
				() => {
					const x = this.randomInt(1000)
					const y = this.randomInt(1000)
					const width = this.randomInt(1, 1000)
					const height = this.randomInt(1, 1000)
					let parentId: TLShapeId | undefined
					if (this.randomInt(2) === 0) {
						parentId = this.randomElement<TLShape>(
							this.editor.getCurrentPageShapes().filter((s) => s.type === 'frame')
						)?.id
					}
					return { type: 'create-box', x, y, width, height, parentId }
				},
				() => {
					const x = this.randomInt(1000)
					const y = this.randomInt(1000)
					const width = this.randomInt(1, 1000)
					const height = this.randomInt(1, 1000)
					return { type: 'create-frame', x, y, width, height }
				},
				// Need to disable arrows for the time being, the cleanup logic leads to state inconsistency.
				// We need a better way to handle state updates.
				// () => {
				// 	let start: TLArrowTerminal = {
				// 		type: 'point',
				// 		x: this.randomInt(1000),
				// 		y: this.randomInt(1000),
				// 	}
				// 	let end: TLArrowTerminal = {
				// 		type: 'point',
				// 		x: this.randomInt(1000),
				// 		y: this.randomInt(1000),
				// 	}

				// 	if (this.randomInt(2) === 0) {
				// 		const boundShapeId = this.getRandomShapeId()
				// 		if (boundShapeId) {
				// 			start = {
				// 				type: 'binding',
				// 				boundShapeId: boundShapeId,
				// 				isExact: true,
				// 				normalizedAnchor: { x: 0.5, y: 0.5 },
				// 			}
				// 		}
				// 	}

				// 	if (this.randomInt(2) === 0) {
				// 		const boundShapeId = this.getRandomShapeId()
				// 		if (boundShapeId) {
				// 			end = {
				// 				type: 'binding',
				// 				boundShapeId: boundShapeId,
				// 				isExact: true,
				// 				normalizedAnchor: { x: 0.5, y: 0.5 },
				// 			}
				// 		}
				// 	}

				// 	return { type: 'create-arrow', start, end }
				// },
				() => {
					const id = this.getRandomShapeId()
					if (id) {
						return { type: 'delete-shape', id }
					}
					return this.getRandomOp()
				},
				() => {
					return { type: 'create-page', id: PageRecordType.createId() }
				},
				() => {
					const id = this.randomElement<TLPage>(this.editor.getPages())?.id
					if (id) {
						return { type: 'delete-page', id }
					}
					return this.getRandomOp()
				},
				() => {
					return { type: 'undo' }
				},
				() => {
					return { type: 'redo' }
				},
				() => {
					return { type: 'mark-stopping-point' }
				},
				() => {
					if (this.editor.getSelectedShapes().length > 1) {
						return { type: 'group-selection' }
					}
					return this.getRandomOp()
				},
				() => {
					if (this.editor.getSelectedShapes().some((s) => s.type === 'group')) {
						return { type: 'ungroup-selection' }
					}
					return this.getRandomOp()
				},
				() => {
					const id = this.randomElement<TLPage>(this.editor.getPages())?.id
					if (id) {
						return { type: 'switch-page', id }
					}
					return this.getRandomOp()
				},
				() => {
					const id = this.getRandomShapeId()
					if (id) {
						return { type: 'select-shape', id }
					}
					return this.getRandomOp()
				},
				() => {
					const id = this.getRandomShapeId({ selected: true })
					if (id) {
						return { type: 'deselect-shape', id }
					}
					return this.getRandomOp()
				},
				() => {
					if (this.editor.getSelectedShapes().length) {
						const dx = this.randomInt(1000)
						const dy = this.randomInt(1000)
						return { type: 'move-selection', dx, dy }
					}
					return this.getRandomOp()
				},
				() => {
					if (this.editor.getSelectedShapes().length) {
						return { type: 'delete-selection' }
					}
					return this.getRandomOp()
				},
				() => {
					if (this.editor.getSelectedShapes().length) {
						const pageId = this.randomElement<TLPage>(
							this.editor.getPages().filter((p) => p.id !== this.editor.getCurrentPageId())
						)?.id
						if (pageId) {
							return { type: 'move-selected-shapes-to-page', pageId }
						}
					}
					return this.getRandomOp()
				},
			],
			true
		)
		this.ops.push(op)
		return op
	}

	applyOp(op: Op) {
		switch (op.type) {
			case 'create-box': {
				this.editor.createShape({
					type: 'geo',
					id: createShapeId(),
					x: op.x,
					y: op.y,
					parentId: op.parentId,
					props: {
						w: op.width,
						h: op.height,
					},
				})
				break
			}

			case 'create-frame': {
				this.editor.createShape({
					type: 'frame',
					id: createShapeId(),
					x: op.x,
					y: op.y,
					props: {
						w: op.width,
						h: op.height,
					},
				})
				break
			}

			case 'create-arrow': {
				this.editor.createShape({
					type: 'arrow',
					id: createShapeId(),
					x: 0,
					y: 0,
					props: {
						start: op.start,
						end: op.end,
					},
				})
				break
			}

			case 'delete-shape': {
				this.editor.deleteShape(op.id)
				break
			}

			case 'create-page': {
				this.editor.createPage({ id: op.id, name: op.id })
				break
			}

			case 'delete-page': {
				this.editor.deletePage(op.id)
				break
			}

			case 'undo': {
				this.editor.undo()
				break
			}

			case 'redo': {
				this.editor.redo()
				break
			}

			case 'group-selection': {
				this.editor.groupShapes(this.editor.getSelectedShapeIds())
				break
			}

			case 'ungroup-selection': {
				this.editor.ungroupShapes(this.editor.getSelectedShapeIds())
				break
			}

			case 'mark-stopping-point': {
				this.editor.mark()
				break
			}

			case 'switch-page': {
				this.editor.setCurrentPage(op.id)
				break
			}

			case 'select-shape': {
				this.editor.select(op.id)
				break
			}

			case 'deselect-shape': {
				this.editor.deselect(op.id)
				break
			}

			case 'move-selection': {
				this.editor.updateShapes(
					this.editor.getSelectedShapes().map((s) => ({
						...s,
						x: s.x + op.dx,
						y: s.y + op.dy,
					}))
				)
				break
			}

			case 'delete-selection': {
				this.editor.deleteShapes(this.editor.getSelectedShapeIds())
				break
			}

			case 'move-selected-shapes-to-page': {
				this.editor.moveShapesToPage(this.editor.getSelectedShapeIds(), op.pageId)
				break
			}

			default:
				throw new Error(`Unknown op type: ${JSON.stringify((op as any).type)}`)
		}
	}
}
