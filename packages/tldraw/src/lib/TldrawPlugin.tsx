import {
	Editor,
	LicenseManager,
	TLAnyShapeUtilConstructor,
	TLOnMountHandler,
	TLSchemaPlugin,
	TLStateNodeConstructor,
	react,
} from '@tldraw/editor'
import { TLComponents } from './Tldraw'
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
	/** Tools to register with the editor's state chart. */
	tools?: readonly TLStateNodeConstructor[]
	/** Component overrides contributed by the plugin. */
	components?: TLComponents
	/** UI overrides contributed by the plugin. */
	overrides?: TLUiOverrides
	/**
	 * License feature flags (bits from {@link @tldraw/editor#FLAGS}) that must be present in the
	 * tldraw license key for this plugin to activate. When the license does not include the
	 * flags, the plugin's `components`, `overrides`, and `onMount` are disabled, but its
	 * `records`, `shapeUtils`, and `tools` are still registered so that existing documents keep
	 * working. When undefined, the plugin is not license-gated.
	 */
	requiredLicenseFlags?: number
	/** Called when the editor mounts. May return a cleanup function. */
	onMount?(editor: Editor): void | (() => void)
}

const STACKED_SLOTS = ['InFrontOfTheCanvas', 'OnTheCanvas'] as const

/**
 * Merges plugin components with the user's components.
 *
 * Most slots are "non-stackable": the first plugin that sets a slot wins among the plugins, but
 * the user's value (if set) always wins overall, including explicit `null` to hide a slot.
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

	// non-stackable slots: first plugin that sets one wins among plugins…
	for (const plugin of plugins) {
		for (const [key, value] of Object.entries(plugin.components ?? {})) {
			if ((STACKED_SLOTS as readonly string[]).includes(key)) continue
			if (!(key in result)) (result as any)[key] = value
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

/**
 * Wraps a gated plugin's `onMount` so it only runs once the license confirms the plugin's
 * required flags. License validation is async and the editor's mount handler only fires once,
 * so we watch the license manager's `features` atom and run the plugin's `onMount` when (and
 * if) entitlement arrives. `features` only ever transitions from 0 to the license's flags, so
 * the handler runs at most once.
 *
 * @internal
 */
export function createLicenseGatedOnMount(
	plugin: TldrawPlugin,
	licenseManager: LicenseManager
): (editor: Editor) => () => void {
	return (editor) => {
		let pluginCleanup: void | (() => void)
		let hasRun = false
		const stopReacting = react(`plugin ${plugin.id} license gate`, () => {
			if (hasRun) return
			if (!licenseManager.isFeatureEnabled(plugin.requiredLicenseFlags!)) return
			hasRun = true
			pluginCleanup = plugin.onMount!(editor)
		})
		return () => {
			stopReacting()
			if (typeof pluginCleanup === 'function') pluginCleanup()
		}
	}
}
