/* ---------------- Extension manager --------------- */

import { Computed, computed } from '@tldraw/state'
import { Editor } from './Editor'
import {
	EditorExtension,
	EditorExtensionConfigOf,
	ExtractExtensions,
	ExtractStorage,
} from './EditorExtension'

export class EditorExtensionManager<E extends readonly EditorExtension[]> {
	storage = {} as Computed<ExtractStorage<E>>

	extensions: ExtractExtensions<E>

	constructor(public readonly editor: Editor<E>, extensions: E) {
		this.storage = computed('extension storage', () => {
			return Object.fromEntries(extensions.map((e) => [e.name, e.storage])) as ExtractStorage<E>
		})

		this.extensions = Object.fromEntries(extensions.map((e) => [e.name, e]))

		for (const extension of extensions) {
			const config = extension.config as EditorExtensionConfigOf<E[number], Editor<E>>

			if (config.onBeforeCreate) {
				const handler = config.onBeforeCreate.bind(this.editor)
				this.editor.addListener('beforeCreate', handler)
			}
			if (config.onCreate) {
				const handler = config.onCreate.bind(this.editor)
				this.editor.addListener('create', handler)
			}
			if (config.onUpdate) {
				const handler = config.onUpdate.bind(this.editor)
				this.editor.addListener('update', handler)
			}
			if (config.onChange) {
				const handler = config.onChange.bind(this.editor)
				this.editor.addListener('change', handler)
			}
			if (config.onFocus) {
				const handler = config.onFocus.bind(this.editor)
				this.editor.addListener('focus', handler)
			}
			if (config.onBlur) {
				const handler = config.onBlur.bind(this.editor)
				this.editor.addListener('blur', handler)
			}
			if (config.onDestroy) {
				const handler = config.onDestroy.bind(this.editor)
				this.editor.addListener('destroy', handler)
			}
		}
	}

	/** Get an extension by its name.
	 *
	 * @example
	 * ```ts
	 * editor.getExtension('chart')
	 * ```
	 *
	 * @returns The extension with the given name.
	 * @public
	 */
	getExtension<Name extends keyof ExtractExtensions<E>>(name: Name) {
		return this.extensions[name]
	}

	static dedupe(extensions: EditorExtension[]) {
		const names = new Set()
		for (const {
			config: { name },
		} of extensions) {
			if (names.has(name)) {
				throw Error(`[Editor] Cannot have two extensions with the name: "${name}"`)
			}
			names.add(name)
		}
	}
}
