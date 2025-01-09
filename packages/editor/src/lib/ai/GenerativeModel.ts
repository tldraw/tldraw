import { RecordProps, TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { exhaustiveSwitchError, mapObjectMapValues } from '@tldraw/utils'
import { useMemo } from 'react'
import { TLAnyShapeUtilConstructor } from '../config/defaultShapes'
import { Editor } from '../editor/Editor'
import { useEditor } from '../hooks/useEditor'
import { useShallowObjectIdentity } from '../hooks/useIdentity'
import { Box } from '../primitives/Box'

/** @internal */
export interface GenerativeAiInput {
	prompt: string
	shapes: TLShape[]
	contextBounds: Box
	promptBounds: Box
	shapeTypes: { [key: string]: RecordProps<any> | undefined }
	image: 'todo'
}

/** @internal */
export interface GenerativeAiGenerateOptions {
	shapes?: TLShape[]
	contextBounds?: Box
	promptBounds?: Box
}

/** @internal */
export interface GenerativeAiTransform {
	create(input: GenerativeAiInput): {
		transformInput?(): GenerativeAiInput
		transformChange?(change: GenerativeAiChange): GenerativeAiChange
	}
}

/** @internal */
export interface GenerativeAiAdapter {
	// an adapter is mostly a generate function - it gets the input, image, etc
	generate(input: GenerativeAiInput): AsyncGenerator<GenerativeAiChange>
	// idk if we want something like this but i imagine we could have a way of providing some
	// special utilities that we provide that might make sense for a particular adapter
	transforms?: GenerativeAiTransform[]
}

/** @internal */
export interface CreateShapeChange {
	type: 'createShape'
	shape: TLShape
}

/** @internal */
export interface UpdateShapeChange {
	type: 'updateShape'
	shape: TLShapePartial
}

/** @internal */
export interface DeleteShapeChange {
	type: 'deleteShape'
	shapeId: TLShapeId
}

/** @internal */
export type GenerativeAiChange = CreateShapeChange | UpdateShapeChange | DeleteShapeChange

/** @internal */
export class GenerativeAiChangeset {
	constructor(
		public readonly editor: Editor,
		public readonly changes: GenerativeAiChange[]
	) {}

	addChange(change: GenerativeAiChange) {
		this.changes.push(change)
		this._onNewChange?.(change)
	}

	private _onNewChange: ((change: GenerativeAiChange) => void) | undefined
	onNewChange(handler: (change: GenerativeAiChange) => void) {
		this._onNewChange = handler
	}
}

/** @internal */
export interface GenerativeModelOptions {
	transforms?: GenerativeAiTransform[]
}

/** @internal */
export class GenerativeModel {
	constructor(
		public readonly editor: Editor,
		public readonly adapter: GenerativeAiAdapter,
		public readonly options: GenerativeModelOptions = {}
	) {}

	private makeInput(prompt: string, options?: GenerativeAiGenerateOptions): GenerativeAiInput {
		const shapes = options?.shapes ?? this.editor.getCurrentPageShapes()
		const contextBounds = options?.contextBounds ?? this.editor.getViewportPageBounds()
		const promptBounds = options?.promptBounds ?? this.editor.getViewportPageBounds()
		const shapeTypes = mapObjectMapValues(
			this.editor.shapeUtils,
			(_, shapeUtil) => (shapeUtil?.constructor as TLAnyShapeUtilConstructor).props
		)
		return { prompt, shapes, contextBounds, promptBounds, shapeTypes, image: 'todo' }
	}

	async generate(prompt: string, options?: GenerativeAiGenerateOptions) {
		let input = this.makeInput(prompt, options)

		const transforms = []
		for (const transformConstructor of [
			...(this.options.transforms ?? []),
			...(this.adapter.transforms ?? []),
		]) {
			const transform = transformConstructor.create(input)
			transforms.push(transform)
			input = transform.transformInput?.() ?? input
		}

		transforms.reverse()

		const changeset = new GenerativeAiChangeset(this.editor, [])
		for await (let change of this.adapter.generate(input)) {
			for (const helper of transforms) {
				change = helper.transformChange?.(change) ?? change
			}
			applyChange(this.editor, change)
			changeset.addChange(change)
		}
	}

	// async generate(input: GenerativeAiInput) {
	// 	const changeset = new GenerativeAiChangeset(this.editor, [])
	// 	for await (const change of this.adapter.generate(input)) {
	// 		changeset.addChange(change)
	// 	}
	// 	for (const change of changeset.changes) {
	// 		applyChange(this.editor, change)
	// 	}
	// }
}

function applyChange(editor: Editor, change: GenerativeAiChange) {
	switch (change.type) {
		case 'createShape':
			editor.createShape(change.shape)
			break
		case 'updateShape':
			editor.updateShape(change.shape)
			break
		case 'deleteShape':
			editor.deleteShape(change.shapeId)
			break
		default:
			exhaustiveSwitchError(change)
	}
}

/** @internal */
export function useGenerativeAi(
	adapter: GenerativeAiAdapter,
	options: GenerativeModelOptions = {}
) {
	const editor = useEditor()

	const stableOptions = useShallowObjectIdentity(options)
	const model = useMemo(
		() => new GenerativeModel(editor, adapter, stableOptions),
		[editor, adapter, stableOptions]
	)

	return model
}
