import { atom } from '@tldraw/state'
import type { Editor } from '../editor/Editor'

/** @public */
export const tleditors = {
	/**
	 * A reactive list of currently mounted editor instances.
	 *
	 * An editor is added when its component emits the `mount` event and removed when it emits
	 * `unmount` (including when the editor is disposed while still mounted).
	 */
	mounted: atom<readonly Editor[]>('mounted editors', []),

	/**
	 * Get the currently mounted editor instances.
	 *
	 * @public
	 */
	getMounted(): readonly Editor[] {
		return this.mounted.get()
	},

	/** @internal */
	add(editor: Editor) {
		const current = this.mounted.get()
		if (current.includes(editor)) return
		this.mounted.set([...current, editor])
	},

	/** @internal */
	remove(editor: Editor) {
		const current = this.mounted.get()
		if (!current.includes(editor)) return
		this.mounted.set(current.filter((e) => e !== editor))
	},
}
