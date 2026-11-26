// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import type { TLAnyBindingUtilConstructor } from '../config/defaultBindings'
import type { TLAnyShapeUtilConstructor } from '../config/defaultShapes'
import type { Editor, TLEditorOptions } from '../editor/Editor'
import type { TLStateNodeConstructor } from '../editor/tools/StateNode'

/**
 * A typed key for a service that one plugin provides and other plugins use. Two plugins can
 * provide the same capability with different implementations, for example a DOM text measurer
 * and a headless one. The editor installs exactly one provider per capability.
 *
 * @public
 */
export interface TLCapability<T> {
	readonly id: string
	/** @internal Phantom field that carries the service type. It has no runtime value. */
	readonly __type?: T
}

/**
 * Define a capability.
 *
 * @example
 * ```ts
 * const clockCapability = defineCapability<{ now(): number }>('clock')
 * ```
 *
 * @public
 */
export function defineCapability<T>(id: string): TLCapability<T> {
	return { id }
}

/**
 * A typed extension point. The plugin that owns a behavior defines the slot. Other plugins add
 * contributions to it, and the owner decides how to run them, see {@link TLPluginHost}.
 *
 * @public
 */
export interface TLSlot<T> {
	readonly id: string
	/** @internal Phantom field that carries the contribution type. It has no runtime value. */
	readonly __type?: T
}

/**
 * Define a slot.
 *
 * @example
 * ```ts
 * const canSnapToShapeSlot = defineSlot<TLPipe<boolean, [TLShape]>>('snapping.canSnapToShape')
 * ```
 *
 * @public
 */
export function defineSlot<T>(id: string): TLSlot<T> {
	return { id }
}

/**
 * A slot contribution that transforms a value. Contributions run in order and each one gets the
 * previous result. Run with {@link TLPluginHost.pipe}.
 *
 * @public
 */
export type TLPipe<V, Args extends unknown[] = []> = (value: V, ...args: Args) => V

/**
 * A slot contribution in a chain of responsibility. A contribution either handles the input and
 * returns a result, or passes the input to the next contribution with `next`. Run with
 * {@link TLPluginHost.chain}.
 *
 * @public
 */
export type TLChainHandler<In, Out> = (input: In, next: (input: In) => Out) => Out

/**
 * Where a contribution goes relative to the contributions of other plugins. Without constraints,
 * contributions run in plugin install order.
 *
 * @public
 */
export interface TLContributionOrder {
	/** Run before the contributions of these plugin ids. */
	before?: readonly string[]
	/** Run after the contributions of these plugin ids. */
	after?: readonly string[]
}

/**
 * What a plugin gets during setup.
 *
 * @public
 */
export interface TLPluginContext {
	readonly editor: Editor
	/**
	 * The options that the editor was created with. Plugins read their configuration from here,
	 * for example `themes` or `fontAssetUrls`.
	 */
	readonly editorOptions: Readonly<TLEditorOptions>
	/** Get a capability. The plugin must list it in `requires` or `optional`, or provide it. */
	get<T>(capability: TLCapability<T>): T
	/** Get a capability that the plugin lists in `optional`, or undefined when no plugin provides it. */
	getOptional<T>(capability: TLCapability<T>): T | undefined
	/** Provide a capability that the plugin lists in `provides`. */
	provide<T>(capability: TLCapability<T>, implementation: T): void
	/** Add a contribution to a slot. Returns a function that removes it. */
	contribute<T>(slot: TLSlot<T>, value: T, order?: TLContributionOrder): () => void
	/** Run a function when the editor is disposed. Disposers run in reverse install order. */
	onDispose(dispose: () => void): void
}

/**
 * A unit of editor behavior.
 *
 * Records (shape, binding and tool definitions) are static, because the store schema must be
 * known before the store exists. Everything else happens in `setup`.
 *
 * @public
 */
export interface TLPlugin {
	/** A unique id. Contribution ordering and error messages use it. */
	readonly id: string
	/** Capabilities that this plugin provides in `setup`. */
	readonly provides?: readonly TLCapability<any>[]
	/** Capabilities that must be present. Their providers are set up before this plugin. */
	readonly requires?: readonly TLCapability<any>[]
	/** Capabilities that this plugin uses when present. Their providers are set up first. */
	readonly optional?: readonly TLCapability<any>[]
	/** Shape utils that this plugin adds to the editor and to the store schema. */
	readonly shapeUtils?: readonly TLAnyShapeUtilConstructor[]
	/** Binding utils that this plugin adds to the editor and to the store schema. */
	readonly bindingUtils?: readonly TLAnyBindingUtilConstructor[]
	/** Tools that this plugin adds to the editor's root state. */
	readonly tools?: readonly TLStateNodeConstructor[]
	setup?(ctx: TLPluginContext): void
}

/**
 * Define a plugin. This is an identity function that gives type inference.
 *
 * @public
 */
export function definePlugin<const P extends TLPlugin>(plugin: P): P {
	return plugin
}
