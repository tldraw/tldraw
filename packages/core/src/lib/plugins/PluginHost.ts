// This module is part of the headless core. It must not import React or touch the DOM.
import { Atom, atom } from '@tldraw/state'
import type { Editor, TLEditorOptions } from '../editor/Editor'
import type {
	TLCapability,
	TLChainHandler,
	TLContributionOrder,
	TLPipe,
	TLPlugin,
	TLPluginContext,
	TLSlot,
} from './plugin'

interface Contribution {
	readonly pluginId: string
	readonly value: unknown
	readonly order: TLContributionOrder | undefined
	readonly seq: number
}

/**
 * Installs plugins, holds their capabilities, and runs their slot contributions.
 *
 * @public
 */
export class TLPluginHost {
	private readonly plugins: readonly TLPlugin[]
	private readonly capabilities = new Map<string, unknown>()
	private readonly slots = new Map<string, Atom<readonly Contribution[]>>()
	private readonly disposers: (() => void)[] = []
	// Slots are read on hot paths (rendering, snapping), so `list` reuses one values array per
	// contribution list.
	private readonly valuesCache = new WeakMap<readonly Contribution[], readonly unknown[]>()
	private seq = 0

	/**
	 * @param plugins - Every plugin to install. Two of them must not share an id or a provided
	 * capability.
	 */
	constructor(
		private readonly editor: Editor,
		plugins: readonly TLPlugin[],
		private readonly editorOptions: Readonly<TLEditorOptions>
	) {
		this.plugins = sortPlugins(plugins)
	}

	/** All installed plugins, in setup order. */
	getPlugins(): readonly TLPlugin[] {
		return this.plugins
	}

	/** Whether a plugin with this id is installed. */
	has(pluginId: string): boolean {
		return this.plugins.some((p) => p.id === pluginId)
	}

	/** @internal Run `setup` for each plugin, in dependency order. */
	setup() {
		try {
			for (const plugin of this.plugins) {
				plugin.setup?.(this.createContext(plugin))
				for (const cap of plugin.provides ?? []) {
					if (!this.capabilities.has(cap.id)) {
						throw Error(`Plugin "${plugin.id}" declares that it provides "${cap.id}" but did not.`)
					}
				}
			}
		} catch (error) {
			// Undo the plugins that did set up, so that nothing they started (a frame loop, DOM
			// listeners) outlives an editor that failed to construct.
			this.dispose()
			throw error
		}
	}

	/** Get a capability. Throws when no installed plugin provides it. */
	get<T>(capability: TLCapability<T>): T {
		if (!this.capabilities.has(capability.id)) {
			throw Error(
				`No installed plugin provides "${capability.id}". Add a plugin that provides it to the editor.`
			)
		}
		return this.capabilities.get(capability.id) as T
	}

	/**
	 * An object for an editor field that predates plugins, such as `editor.snaps`.
	 *
	 * When the capability is provided, this returns `select(capability)` itself. Otherwise it
	 * returns a proxy: once a plugin provides the capability, the proxy forwards to
	 * `select(capability)`. Until then, any use of it throws the same error as
	 * {@link TLPluginHost.get}. So the field works in the setup of any plugin that
	 * runs after the provider, and in an editor without the provider it fails only when used.
	 * A plugin should read capabilities with `ctx.get` in setup. A facade that it keeps from
	 * setup stays a proxy.
	 *
	 * @internal
	 */
	facade<T, S extends object>(capability: TLCapability<T>, select: (capability: T) => S): S {
		if (this.capabilities.has(capability.id)) return select(this.get(capability))
		const resolve = () => select(this.get(capability))
		const isProvided = () => this.capabilities.has(capability.id)
		return new Proxy({} as S, {
			get(_target, key) {
				// Before the capability exists, let inspection (printing, promise resolution) see an
				// empty object.
				if (!isProvided() && (typeof key === 'symbol' || key === 'then')) return undefined
				const target = resolve()
				const value = Reflect.get(target, key, target)
				return typeof value === 'function' ? value.bind(target) : value
			},
			set: (_target, key, value) => Reflect.set(resolve(), key, value),
			has: (_target, key) => key in resolve(),
		})
	}

	/** Get a capability, or undefined when no installed plugin provides it. */
	getOptional<T>(capability: TLCapability<T>): T | undefined {
		return this.capabilities.get(capability.id) as T | undefined
	}

	/** The contributions to a slot, in run order. Reactive. */
	list<T>(slot: TLSlot<T>): readonly T[] {
		const contributions = this.getSlotAtom(slot.id).get()
		let values = this.valuesCache.get(contributions)
		if (!values) {
			values = contributions.map((c) => c.value)
			this.valuesCache.set(contributions, values)
		}
		return values as readonly T[]
	}

	/** Run the contributions to a pipe slot. Each one gets the result of the one before. */
	pipe<V, Args extends unknown[]>(slot: TLSlot<TLPipe<V, Args>>, value: V, ...args: Args): V {
		for (const fn of this.list(slot)) value = fn(value, ...args)
		return value
	}

	/**
	 * Run the contributions to a chain slot. The first contribution gets the input. A contribution
	 * that does not handle the input passes it on with `next`. After the last contribution,
	 * `terminal` runs.
	 */
	chain<In, Out>(
		slot: TLSlot<TLChainHandler<In, Out>>,
		input: In,
		terminal: (input: In) => Out
	): Out {
		const handlers = this.list(slot)
		const run = (i: number, value: In): Out =>
			i < handlers.length ? handlers[i](value, (next) => run(i + 1, next)) : terminal(value)
		return run(0, input)
	}

	/** @internal */
	dispose() {
		for (let i = this.disposers.length - 1; i >= 0; i--) this.disposers[i]()
		this.disposers.length = 0
	}

	private createContext(plugin: TLPlugin): TLPluginContext {
		const declared = new Set(
			[...(plugin.requires ?? []), ...(plugin.optional ?? []), ...(plugin.provides ?? [])].map(
				(c) => c.id
			)
		)
		const assertDeclared = (cap: TLCapability<any>) => {
			if (!declared.has(cap.id)) {
				throw Error(
					`Plugin "${plugin.id}" uses "${cap.id}" but does not list it in requires, optional or provides.`
				)
			}
		}
		return {
			editor: this.editor,
			editorOptions: this.editorOptions,
			get: (cap) => {
				assertDeclared(cap)
				return this.get(cap)
			},
			getOptional: (cap) => {
				assertDeclared(cap)
				return this.getOptional(cap)
			},
			provide: (cap, impl) => {
				if (!plugin.provides?.some((c) => c.id === cap.id)) {
					throw Error(
						`Plugin "${plugin.id}" provides "${cap.id}" but does not list it in provides.`
					)
				}
				this.capabilities.set(cap.id, impl)
			},
			contribute: (slot, value, order) => this.contribute(plugin.id, slot, value, order),
			onDispose: (dispose) => {
				this.disposers.push(dispose)
			},
		}
	}

	private contribute<T>(
		pluginId: string,
		slot: TLSlot<T>,
		value: T,
		order: TLContributionOrder | undefined
	): () => void {
		const slotAtom = this.getSlotAtom(slot.id)
		const contribution: Contribution = { pluginId, value, order, seq: this.seq++ }
		slotAtom.set(sortContributions(slot.id, [...slotAtom.get(), contribution]))
		return () => {
			slotAtom.set(slotAtom.get().filter((c) => c !== contribution))
		}
	}

	private getSlotAtom(id: string) {
		let slotAtom = this.slots.get(id)
		if (!slotAtom) {
			slotAtom = atom<readonly Contribution[]>(`slot:${id}`, [])
			this.slots.set(id, slotAtom)
		}
		return slotAtom
	}
}

/** Order plugins so that each capability provider is set up before the plugins that use it. */
function sortPlugins(plugins: readonly TLPlugin[]): TLPlugin[] {
	const byId = new Map<string, TLPlugin>()
	const providerOf = new Map<string, TLPlugin>()
	for (const plugin of plugins) {
		if (byId.has(plugin.id)) throw Error(`Two plugins have the id "${plugin.id}".`)
		byId.set(plugin.id, plugin)
		for (const cap of plugin.provides ?? []) {
			const other = providerOf.get(cap.id)
			if (other) {
				throw Error(
					`Plugins "${other.id}" and "${plugin.id}" both provide "${cap.id}". Install only one.`
				)
			}
			providerOf.set(cap.id, plugin)
		}
	}

	const sorted: TLPlugin[] = []
	const state = new Map<TLPlugin, 'visiting' | 'done'>()
	const visit = (plugin: TLPlugin, path: string[]) => {
		const s = state.get(plugin)
		if (s === 'done') return
		if (s === 'visiting') {
			throw Error(`Plugin dependency cycle: ${[...path, plugin.id].join(' -> ')}`)
		}
		state.set(plugin, 'visiting')
		for (const cap of plugin.requires ?? []) {
			const provider = providerOf.get(cap.id)
			if (!provider) {
				throw Error(
					`Plugin "${plugin.id}" requires "${cap.id}", but no installed plugin provides it.`
				)
			}
			if (provider !== plugin) visit(provider, [...path, plugin.id])
		}
		for (const cap of plugin.optional ?? []) {
			const provider = providerOf.get(cap.id)
			if (provider && provider !== plugin) visit(provider, [...path, plugin.id])
		}
		state.set(plugin, 'done')
		sorted.push(plugin)
	}
	for (const plugin of plugins) visit(plugin, [])
	return sorted
}

/**
 * Sort contributions by their `before` and `after` constraints. Contributions without a
 * constraint between them keep the order in which they were added.
 */
function sortContributions(slotId: string, items: readonly Contribution[]): Contribution[] {
	const mustPrecede = (a: Contribution, b: Contribution) =>
		a.pluginId !== b.pluginId &&
		(!!a.order?.before?.includes(b.pluginId) || !!b.order?.after?.includes(a.pluginId))

	const remaining = [...items].sort((a, b) => a.seq - b.seq)
	const sorted: Contribution[] = []
	while (remaining.length) {
		const i = remaining.findIndex((c) => !remaining.some((o) => o !== c && mustPrecede(o, c)))
		if (i === -1) {
			throw Error(
				`Contributions to slot "${slotId}" have conflicting order constraints between plugins ${[
					...new Set(remaining.map((c) => `"${c.pluginId}"`)),
				].join(', ')}.`
			)
		}
		sorted.push(remaining.splice(i, 1)[0])
	}
	return sorted
}
