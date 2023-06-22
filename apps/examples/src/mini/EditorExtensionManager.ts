/* ---------------- Extension manager --------------- */

import { Computed, computed } from '@tldraw/state'
import { Editor } from './Editor'
import { EditorExtension } from './EditorExtension'

export class EditorExtensionManager<E extends EditorExtension[]> {
	storage = {} as Computed<
		E[number]['name'] extends string ? Record<E[number]['name'], E[number]['storage']> : never
	>

	constructor(public readonly editor: Editor<E>, public readonly extensions: E) {
		this.storage = computed('extension storage', () => {
			return Object.fromEntries(
				extensions.map((e) => [e.name, e.storage])
			) as E[number]['name'] extends string
				? Record<E[number]['name'], E[number]['storage']>
				: never
		})

		for (const extension of extensions) {
			const { config } = extension

			if (config.onBeforeCreate) {
				this.editor.addListener('beforeCreate', config.onBeforeCreate)
			}
			if (config.onCreate) {
				this.editor.addListener('create', config.onCreate)
			}
			if (config.onUpdate) {
				this.editor.addListener('update', config.onUpdate)
			}
			if (config.onChange) {
				this.editor.addListener('change', config.onChange)
			}
			if (config.onFocus) {
				this.editor.addListener('focus', config.onFocus)
			}
			if (config.onBlur) {
				this.editor.addListener('blur', config.onBlur)
			}
			if (config.onDestroy) {
				this.editor.addListener('destroy', config.onDestroy)
			}
		}
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
