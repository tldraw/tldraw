import { Signal, atom } from '@tldraw/state'
import type { Editor } from '../editor/Editor'

const mounted = atom<readonly Editor[]>('mounted editors', [])

/**
 * A global registry of currently mounted editor instances. Use it to discover live editors from
 * outside the React tree, for example from sidebar chrome, keyboard shortcuts, or multi-editor
 * layouts.
 *
 * @example
 * ```ts
 * tleditors.getMounted() // readonly Editor[]
 *
 * const editors = useValue('mounted editors', () => tleditors.getMounted(), [])
 * ```
 *
 * @public
 */
export const tleditors = {
	/**
	 * A reactive list of currently mounted editor instances.
	 *
	 * An editor is added when it emits the `mount` event and removed when it emits `unmount`
	 * (including when the editor is disposed while still mounted).
	 *
	 * @public
	 */
	mounted: mounted as Signal<readonly Editor[]>,

	/**
	 * Get the currently mounted editor instances.
	 *
	 * @public
	 */
	getMounted(): readonly Editor[] {
		return mounted.get()
	},
}

/** @internal */
export function registerMountedEditor(editor: Editor) {
	const current = mounted.get()
	if (current.includes(editor)) return
	mounted.set([...current, editor])
}

/** @internal */
export function unregisterMountedEditor(editor: Editor) {
	const current = mounted.get()
	if (!current.includes(editor)) return
	mounted.set(current.filter((e) => e !== editor))
}
