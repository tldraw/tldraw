// an extension could be anything... it can hook into the events in the
// editor, set keyboard shortcuts, etc. Maybe we can scope this down further...

import { atom, computed } from '@tldraw/state'
import { Editor } from './Editor'
import { CommandFn, EditorCommandHandler, ExtractData } from './EditorHistoryManager/history-types'
import { EditorEventOptions } from './editor-react'

export type EditorExtensionConfigOf<
	E extends EditorExtension,
	X extends Editor<any>
> = E extends EditorExtension<infer Name, infer Options, infer Storage>
	? EditorExtensionConfig<Name, Options, Storage> & EditorEventOptions<X>
	: never

export type EditorExtensionConfig<
	Name extends string = any,
	Options = any,
	Storage = any,
	Commands = any
> = {
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

	// Add record types to the store, possibly a duplicate of addStorage
	addRecords?: () => any
	// Add commands to the store. This is a hard one to get right in TypeScript
	// as commands may need to access other commands, and I don't really know
	// how to do that. Maybe we can just have a generic type that is the
	// commands object, and then the user can type it themselves.
	addCommands?: (
		editor: Editor<EditorExtension<Name, Options, Storage>[]>,
		createCommand: <Name extends string, Constructor extends CommandFn<any>>(
			name: Name,
			constructor: Constructor,
			handle: EditorCommandHandler<ExtractData<Constructor>>
		) => void
	) => Commands
}

export class EditorExtension<Name extends string = any, Options = any, Storage = any> {
	/**
	 * The extension's type.
	 *
	 * @public
	 * @readonly
	 */
	readonly type = 'extension'

	/**
	 * The extension's name.
	 *
	 * @public
	 * @readonly
	 */
	readonly name = 'extension' as Name

	/**
	 * The extension's configuration.
	 *
	 * @public
	 * @readonly
	 */
	readonly config: EditorExtensionConfig<Name, Options, Storage> &
		EditorEventOptions<Editor<EditorExtension<Name, Options, Storage>[]>> = {
		name: this.name,
		defaultOptions: {} as Options,
	}

	/**
	 * The extension's options.
	 *
	 * @public
	 * @readonly
	 */
	readonly options = {} as Options

	/**
	 * A local in-memory atom, not part of the editor's store.
	 *
	 * @private
	 * @readonly
	 */
	private readonly _storage = atom(this.name + '_storage', {} as Storage)

	constructor(
		config = {} as EditorExtensionConfig<Name, Options, Storage> &
			EditorEventOptions<Editor<EditorExtension<Name, Options, Storage>[]>>
	) {
		this.config = { ...this.config, ...config }

		this.options = this.config.defaultOptions ?? ({} as Options)

		if (config.addOptions) {
			this.options = config.addOptions.bind(this)()
		}

		if (config.addStorage) {
			this.storage = config.addStorage.bind(this)()
		}
	}

	/**
	 * Create a new extension.
	 *
	 * @example
	 * ```ts
	 * const myExtension = EditorExtension.create({
	 *   name: "my-extension",
	 *   addOptions() {
	 * 	   return {
	 *       kind: "banner",
	 *     }
	 *   },
	 *   addStorage() {
	 * 	   return {
	 *       clicks: 0,
	 *     }
	 *   }
	 * })
	 *```

	 * @param config - The extension's configuration
	 *
	 * @public
	 * @readonly
	 */
	static create<N extends string = any, O = any, S = any>(
		config = {} as EditorExtensionConfig<N, O, S> &
			EditorEventOptions<Editor<EditorExtension<N, O, S>[]>>
	) {
		return new EditorExtension(config)
	}

	/**
	 * The extension's storage.
	 *
	 * @example
	 * ```ts
	 * myExtension.storage
	 * ```
	 *
	 * @public
	 */
	@computed get storage() {
		return this._storage.value
	}

	set storage(storage: Storage) {
		this._storage.set(storage)
	}

	/**
	 * Get the extension's current storage.
	 *
	 * @example
	 * ```ts
	 * myExtension.getStorage()
	 * ```
	 *
	 * @public
	 * @returns The extension's storage
	 */
	getStorage() {
		return this.storage
	}

	/**
	 * Set the extension's storage.
	 *
	 * @example
	 * ```ts
	 * myExtension.setStorage({ age: 32 })
	 * ```
	 *
	 * @public
	 * @returns The extension
	 */
	setStorage(storage: Storage) {
		this.storage = storage
		return this
	}
}

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
