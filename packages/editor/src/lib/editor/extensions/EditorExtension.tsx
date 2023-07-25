import { TLAnyShapeUtilConstructor } from '../../config/defaultShapes'
import { Editor } from '../Editor'
import { TLStateNodeConstructor } from '../tools/StateNode'

/** @alpha */
export interface EditorExtensionConfig<Options> {
	readonly name: string
	addOptions?(this: EditorExtensionInstance<never>): Options
	addShapes?(this: EditorExtensionInstance<Options>): readonly TLAnyShapeUtilConstructor[]
	addTools?(this: EditorExtensionInstance<Options>): readonly TLStateNodeConstructor[]
}

/** @alpha */
export class EditorExtension<Options> {
	/**
	 * Create a new extension.
	 *
	 * @example
	 * ```ts
	 * const myExtension = EditorExtension.create({
	 *   name: "my-extension",
	 *   addOptions() {
	 * 	   return {
	 *       kind: "banner",
	 *     }
	 *   },
	 * })
	 *```

	 * @param config - The extension's configuration
	 *
	 * @public
	 */
	static create<Options = undefined>(
		config: EditorExtensionConfig<Options>
	): EditorExtension<Options> {
		return new EditorExtension(config, null)
	}

	private constructor(
		public readonly config: EditorExtensionConfig<Options>,
		readonly parent: EditorExtensionConfig<Options> | null
	) {}

	get name() {
		return this.config.name
	}

	configure(options: Options | ((defaults: Options) => Options)) {
		const baseConfig = this.config
		return new EditorExtension(
			{
				...baseConfig,
				addOptions() {
					if (typeof options === 'function') {
						const baseOptions = baseConfig.addOptions?.call(this) as Options
						return (options as (defaults: Options) => Options)(baseOptions)
					}
					return options
				},
			},
			this
		)
	}
}

/** @alpha */
export class EditorExtensionInstance<Options> {
	readonly name: string
	readonly config: EditorExtensionConfig<Options>
	readonly options: Options

	constructor(editor: Editor | null, readonly extension: EditorExtension<Options>) {
		this.name = extension.name
		this.config = extension.config
		this.options = this.config.addOptions?.call(this as any) ?? (null as Options)

		if (this.config.addShapes) this.addShapes = this.config.addShapes.bind(this)
		if (this.config.addTools) this.addTools = this.config.addTools.bind(this)
	}

	private readonly _editor: Editor | null = null
	get editor() {
		if (!this._editor) {
			throw new Error('Extension is not attached to an editor')
		}
		return this._editor
	}

	addShapes?: () => readonly TLAnyShapeUtilConstructor[]
	addTools?: () => readonly TLStateNodeConstructor[]
}
