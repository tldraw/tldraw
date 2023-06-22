// an extension could be anything... it can hook into the events in the
// editor, set keyboard shortcuts, etc. Maybe we can scope this down further...

import { atom, computed } from '@tldraw/state'
import { EditorEventOptions } from './editor-react'

export type EditorExtensionConfig<Options = any, Storage = any> = {
	/**
	 * Additional options
	 */
	defaultOptions?: Options

	/**
	 * Name
	 */
	name: string

	addOptions?: (this: { name: string }) => Options

	addStorage?: (this: { name: string }) => Storage
} & EditorEventOptions<any>

export class EditorExtension<Options = any, Storage = any> {
	type = 'extension'

	name = 'extension'

	config: EditorExtensionConfig<Options> = {
		name: this.name,
		defaultOptions: {} as Options,
	}

	options = {} as Options

	_storage = atom(this.name + '_storage', {} as Storage)

	constructor(config = {} as EditorExtensionConfig<Options, Storage>) {
		this.config = { ...this.config, ...config }

		// Options

		this.options = this.config.defaultOptions ?? ({} as Options)

		if (config.addOptions) {
			this.options = config.addOptions.bind(this)()
		}

		// Storage

		if (config.addStorage) {
			this.storage = config.addStorage.bind(this)()
		}
	}

	@computed get storage() {
		return this._storage.value
	}

	set storage(storage: Storage) {
		this._storage.set(storage)
	}

	static create<O = any, S = any>(config = {} as EditorExtensionConfig<O, S>) {
		return new EditorExtension<O, S>(config)
	}

	configure(options: Partial<Options>) {
		const extension = new EditorExtension()
		extension.options = options

		// todo

		return extension
	}
}

export type ExtractStorage<E extends EditorExtension> = E extends EditorExtension<infer _, infer S>
	? Record<E['name'] extends any ? E['name'] : never, S>
	: never
