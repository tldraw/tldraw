import { assertExists } from '@tldraw/utils'
import { TLAnyShapeUtilConstructor } from '../../config/defaultShapes'
import { KeyedSet, ReadonlyKeyedSet } from '../../utils/KeyedSet'
import { Editor } from '../Editor'
import { TLStateNodeConstructor } from '../tools/StateNode'
import { EditorExtension, EditorExtensionInstance } from './EditorExtension'

/** @alpha */
export class EditorExtensionManager {
	private readonly extensionInstances: ReadonlyMap<string, EditorExtensionInstance<any>>
	private readonly extensions: ReadonlyKeyedSet<'name', EditorExtension<any>>

	readonly shapes: ReadonlyKeyedSet<'name', TLAnyShapeUtilConstructor>
	readonly tools: ReadonlyKeyedSet<'name', TLStateNodeConstructor>

	constructor(editor: Editor | null, extensions: readonly EditorExtension<any>[]) {
		const extensionInstancesByName = new Map<string, EditorExtensionInstance<any>>()

		this.extensions = new KeyedSet('name', 'EditorExtension', extensions)

		const shapes = new KeyedSet<'name', TLAnyShapeUtilConstructor>('name', 'ShapeUtil')
		const tools = new KeyedSet<'name', TLStateNodeConstructor>('name', 'Tool')

		for (const extension of this.extensions) {
			const instance = new EditorExtensionInstance(editor, extension)
			extensionInstancesByName.set(instance.name, instance)

			if (instance.addShapes) shapes.addAll(instance.addShapes())
			if (instance.addTools) tools.addAll(instance.addTools())
		}

		this.extensionInstances = extensionInstancesByName
		this.shapes = shapes
		this.tools = tools
	}

	/**
	 * Get an extension instance
	 *
	 * @example
	 * ```ts
	 * editor.get(ChartExtension)
	 * ```
	 *
	 * @returns The extension with the given name.
	 * @public
	 */
	get<Options>(ext: EditorExtension<Options>): EditorExtensionInstance<Options> {
		const instance = assertExists(
			this.extensionInstances.get(ext.config.name),
			`Extension "${ext.config.name}" not found`
		)
		return instance as any
	}

	[Symbol.iterator]() {
		return this.extensionInstances.values()
	}
}
