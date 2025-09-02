import { T } from '@tldraw/validate'
import { Editor } from '../Editor'

/** @public */
export interface TLStyleUtilConstructor<
	T,
	Id extends string,
	U extends StyleUtil<T, Id> = StyleUtil<T, Id>,
> {
	new (editor: Editor): U
	id: Id
	validator: T.Validatable<T>
}

/** @public */
export abstract class StyleUtil<Style, Id extends string = string> {
	/** Configure this shape utils {@link ShapeUtil.options | `options`}. */
	static configure<T extends TLStyleUtilConstructor<any, any>>(
		this: T,
		options: T extends new (...args: any[]) => { options: infer Options } ? Partial<Options> : never
	): T {
		// @ts-expect-error -- typescript has no idea what's going on here but it's fine
		return class extends this {
			// @ts-expect-error
			options = { ...this.options, ...options }
		}
	}

	constructor(public readonly editor: Editor) {
		const ctor = this.constructor as TLStyleUtilConstructor<Style, Id>
		this.validator = ctor.validator
		this.id = ctor.id
	}

	readonly id: Id

	/**
	 * The validator for this style util.
	 */
	readonly validator: T.Validatable<Style>

	/**
	 * Options for this style util. If you're implementing a custom style util, you can override
	 * this to provide customization options for your style. If using an existing style util, you
	 * can customizing this by calling {@link StyleUtil.configure}.
	 */
	readonly options = {}

	abstract getDefaultValue(): Style

	read(value: unknown): Style {
		return this.validator.validate(value)
	}
}
