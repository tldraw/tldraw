// an extension could be anything... it can hook into the events in the
// editor, set keyboard shortcuts, etc. Maybe we can scope this down further...

import { atom, computed } from '@tldraw/state'
import { EditorEventOptions } from './editor-react'

export type EditorExtensionConfig<Name, Options = any, Storage = any> = {
	/**
	 * Additional options
	 */
	defaultOptions?: Options

	/**
	 * Name
	 */
	name: Name

	addOptions?: (this: { name: Name }) => Options

	addStorage?: (this: { name: Name }) => Storage
} & EditorEventOptions<EditorExtension<unknown, any, any>[]>

export class EditorExtension<Name, Options = any, Storage = any> {
	type = 'extension'

	name = 'extension' as Name

	config: EditorExtensionConfig<Name, Options, Storage> = {
		name: this.name,
		defaultOptions: {} as Options,
	}

	options = {} as Options

	_storage = atom(this.name + '_storage', {} as Storage)

	constructor(config = {} as EditorExtensionConfig<Name, Options, Storage>) {
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

	static create<Name, O = any, S = any>(config = {} as EditorExtensionConfig<Name, O, S>) {
		return new EditorExtension(config)
	}
}

export type ExtractStorage<E extends EditorExtension<string>> = E extends EditorExtension<
	infer N,
	infer _,
	infer S
>
	? Record<N extends string ? N : never, S>
	: never
