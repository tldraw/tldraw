// an extension could be anything... it can hook into the events in the
// editor, set keyboard shortcuts, etc. Maybe we can scope this down further...

import { atom, computed } from '@tldraw/state'
import { Editor } from './Editor'
import { EditorEventOptions } from './editor-react'

export type EditorExtensionConfigOf<
	E extends EditorExtension,
	X extends Editor<any>
> = E extends EditorExtension<infer Name, infer Options, infer Storage>
	? EditorExtensionConfig<Name, Options, Storage> & EditorEventOptions<X>
	: never

export type EditorExtensionConfig<Name extends string = any, Options = any, Storage = any> = {
	/**
	 * Additional options
	 */
	defaultOptions?: Options

	/**
	 * Name
	 */
	name: Name

	addOptions?: () => Options

	addStorage?: () => Storage
}

export class EditorExtension<Name extends string = any, Options = any, Storage = any> {
	type = 'extension'

	name = 'extension' as Name

	config: EditorExtensionConfig<Name, Options, Storage> &
		EditorEventOptions<Editor<EditorExtension<Name, Options, Storage>[]>> = {
		name: this.name,
		defaultOptions: {} as Options,
	}

	options = {} as Options

	_storage = atom(this.name + '_storage', {} as Storage)

	constructor(
		config = {} as EditorExtensionConfig<Name, Options, Storage> &
			EditorEventOptions<Editor<EditorExtension<Name, Options, Storage>[]>>
	) {
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

	static create<N extends string = any, O = any, S = any>(
		config = {} as EditorExtensionConfig<N, O, S> &
			EditorEventOptions<Editor<EditorExtension<N, O, S>[]>>
	) {
		return new EditorExtension(config)
	}
}

// export type ExtractStorage<E extends EditorExtension<string>> = E extends EditorExtension<
// 	infer N,
// 	infer _,
// 	infer S
// >
// 	? Record<N extends string ? N : never, S>
// 	: never

type Compute<T> = { [K in keyof T]: T[K] } & unknown
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never

export type ExtractStorage<T extends readonly EditorExtension[]> = Compute<
	UnionToIntersection<
		{
			[K in keyof T]: { [R in T[K]['name']]: T[K]['storage'] }
		}[number]
	>
>

export type ExtractExtensions<T extends readonly EditorExtension[]> = Compute<
	UnionToIntersection<
		{
			[K in keyof T]: { [R in T[K]['name']]: T[K] }
		}[number]
	>
>

export type ExtractCommands<T extends readonly EditorExtension[]> = Compute<
	{
		[K in keyof T]: { [R in T[K]['name']]: T[K]['storage'] }
	}[number]
>

export type ExtractStorageKey<T extends readonly EditorExtension[]> = keyof ExtractStorage<T>
