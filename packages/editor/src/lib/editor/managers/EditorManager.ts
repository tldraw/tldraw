import type { Editor } from '../Editor'
import type { TLEventMap } from '../types/emit-types'

/**
 * Base class for editor-attached managers that need to clean up after themselves.
 *
 * Extending `EditorManager` gives a manager one consistent teardown contract: register
 * anything that needs undoing, and it runs automatically on `dispose()`. This keeps
 * subscription lifecycle symmetric — whatever sets a thing up is what tears it down — so
 * it can't be forgotten (the failure mode behind the strict-mode camera bug, #8892).
 *
 * Register cleanup by what you're creating:
 *
 * - Editor bus event (`tick`, `frame`, `change`, …): {@link EditorManager.addEditorEvent}
 * - Store side effect (`editor.sideEffects.register…`): `this.register(disposer)`
 * - Reaction (`react(...)` from `@tldraw/state`): `this.register(react(...))`
 * - DOM listener: `this.register(() => el.removeEventListener(...))`
 * - Other resource (cache, index, child manager): `this.register(() => x.dispose())`
 *
 * For timeouts, intervals, and animation frames prefer `editor.timers` (context-grouped
 * and auto-disposed) over raw `setTimeout`. For cleanup on the editor itself rather than a
 * manager, use `editor.disposables`.
 *
 * If a manager needs ordered teardown (e.g. pause a loop before cancelling it), override
 * `dispose()` and call `super.dispose()` last — see `TickManager`.
 *
 * @public
 */
export abstract class EditorManager {
	protected readonly disposables = new Set<() => void>()

	constructor(protected readonly editor: Editor) {}

	/**
	 * Register a teardown function to run on `dispose()`. The universal way for a manager to
	 * make a resource "see itself out". Returns the same function for convenience.
	 */
	protected register(dispose: () => void): () => void {
		this.disposables.add(dispose)
		return dispose
	}

	/**
	 * Subscribe to an editor bus event and register the matching unsubscribe, so the listener
	 * is removed automatically on `dispose()`.
	 */
	protected addEditorEvent<E extends keyof TLEventMap>(
		event: E,
		fn: (...args: TLEventMap[E]) => void
	): void {
		this.editor.on(event, fn as any)
		this.register(() => this.editor.off(event, fn as any))
	}

	/** @internal */
	dispose(): void {
		this.disposables.forEach((d) => d())
		this.disposables.clear()
	}
}
