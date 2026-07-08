import {
	Editor,
	TLAnyBindingUtilConstructor,
	TLAnyShapeUtilConstructor,
	TLOnMountHandler,
	TLSchemaPlugin,
	TLStateNodeConstructor,
} from '@tldraw/editor'
import { MigrationSequence } from '@tldraw/store'
import { TLComponents } from './Tldraw'
import { TLUiAssetUrlOverrides } from './ui/assetUrls'
import { TLUiOverrides } from './ui/overrides'

/**
 * A plugin that extends {@link tldraw#Tldraw} with custom shapes, tools, UI components,
 * overrides, and store setup logic.
 *
 * @public
 */
export interface TldrawPlugin extends TLSchemaPlugin {
	/** Shape utils to register with the editor. */
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]
	/** Binding utils to register with the editor. */
	bindingUtils?: readonly TLAnyBindingUtilConstructor[]
	/** Tools to register with the editor's state chart. */
	tools?: readonly TLStateNodeConstructor[]
	/** Migrations to register with the store's schema. */
	migrations?: readonly MigrationSequence[]
	/**
	 * Asset url overrides contributed by the plugin, e.g. icons for the plugin's tools. Later
	 * plugins win over earlier ones on a key collision, and the user's `assetUrls` prop wins over
	 * any plugin, silently.
	 */
	assetUrls?: TLUiAssetUrlOverrides
	/**
	 * Component overrides contributed by the plugin. Non-stackable slots (every slot except
	 * `InFrontOfTheCanvas` and `OnTheCanvas`) may only be set by one plugin - two plugins setting
	 * the same non-stackable slot throws. The user's `components` always wins over any plugin,
	 * silently.
	 */
	components?: TLComponents
	/** UI overrides contributed by the plugin. */
	overrides?: TLUiOverrides
	/** Called when the editor mounts. May return a cleanup function. */
	onMount?(editor: Editor): void | (() => void)
}

const STACKED_SLOTS = ['InFrontOfTheCanvas', 'OnTheCanvas'] as const

/**
 * Merges plugin components with the user's components.
 *
 * Most slots are "non-stackable": only one plugin may set a slot. If two different plugins
 * contribute the same non-stackable slot, this throws. The user's value (if set) always wins
 * overall, silently, including explicit `null` to hide a slot.
 *
 * A few slots (`InFrontOfTheCanvas`, `OnTheCanvas`) are "stackable": every plugin's contribution
 * renders, in plugin order, followed by the user's contribution (if any). Setting a stackable
 * slot to `null` in the user's components hides it entirely, including the plugins'
 * contributions.
 *
 * @public
 */
export function mergePluginComponents(
	plugins: readonly TldrawPlugin[],
	userComponents: TLComponents = {}
): TLComponents {
	const result: TLComponents = {}

	// non-stackable slots: only one plugin may set a given slot
	const slotOwners = new Map<string, string>()
	for (const plugin of plugins) {
		for (const [key, value] of Object.entries(plugin.components ?? {})) {
			if ((STACKED_SLOTS as readonly string[]).includes(key)) continue
			const owner = slotOwners.get(key)
			if (owner !== undefined) {
				throw new Error(
					`Plugin components conflict: both '${owner}' and '${plugin.id}' set the '${key}' component slot. Only the stackable slots (InFrontOfTheCanvas, OnTheCanvas) accept contributions from multiple plugins.`
				)
			}
			slotOwners.set(key, plugin.id)
			;(result as any)[key] = value
		}
	}
	// …and the user always wins overall
	Object.assign(result, userComponents)

	// stackable slots: all plugin contributions render in order, then the user's
	for (const slot of STACKED_SLOTS) {
		if (userComponents[slot] === null) {
			result[slot] = null
			continue
		}
		const stack = plugins
			.map((p) => p.components?.[slot])
			.filter((c): c is NonNullable<typeof c> => c != null)
		const user = userComponents[slot]
		if (user) stack.push(user)
		if (stack.length === 0) {
			delete result[slot]
			continue
		}
		result[slot] =
			stack.length === 1
				? stack[0]
				: function StackedPluginSlot() {
						return (
							<>
								{stack.map((Component, i) => (
									<Component key={i} />
								))}
							</>
						)
					}
	}

	return result
}

/**
 * Merges plugin `assetUrls` with the user's `assetUrls`, one category (`icons`, `fonts`,
 * `translations`, `embedIcons`) at a time. Plugins apply in order, so later plugins win over
 * earlier ones on a key collision, and the user's value always wins overall, silently.
 *
 * @public
 */
export function mergePluginAssetUrls(
	plugins: readonly TldrawPlugin[],
	userAssetUrls?: TLUiAssetUrlOverrides
): TLUiAssetUrlOverrides | undefined {
	const allOverrides = [...plugins.map((plugin) => plugin.assetUrls), userAssetUrls].filter(
		(overrides): overrides is TLUiAssetUrlOverrides => overrides != null
	)
	if (allOverrides.length === 0) return undefined
	if (allOverrides.length === 1) return allOverrides[0]

	const result: { [key: string]: { [key: string]: unknown } } = {}
	for (const overrides of allOverrides) {
		for (const [category, urls] of Object.entries(overrides)) {
			if (urls == null) continue
			result[category] = { ...result[category], ...urls }
		}
	}
	return result as TLUiAssetUrlOverrides
}

/**
 * Combines plugin `onMount` handlers with the user's `onMount` handler. Plugin handlers run
 * first, in order, followed by the user's handler. Cleanups run in the same order they were
 * registered when the returned handler's cleanup is invoked.
 *
 * @public
 */
export function createPluginOnMount(
	plugins: readonly TldrawPlugin[],
	userOnMount?: TLOnMountHandler
): TLOnMountHandler {
	return (editor) => {
		const cleanups: Array<() => void> = []
		for (const plugin of plugins) {
			const cleanup = plugin.onMount?.(editor)
			if (typeof cleanup === 'function') cleanups.push(cleanup)
		}
		const userCleanup = userOnMount?.(editor)
		if (typeof userCleanup === 'function') cleanups.push(userCleanup)
		return () => {
			for (const cleanup of cleanups) cleanup()
		}
	}
}
