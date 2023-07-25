import { expectType, noop } from '@tldraw/utils'
import { createTLStore } from '../config/createTLStore'
import { Editor, TLEditorOptions } from '../editor/Editor'
import { EditorExtension, EditorExtensionInstance } from '../editor/extensions/EditorExtension'

function makeEditor(opts: Partial<TLEditorOptions>) {
	return new Editor({
		...opts,
		getContainer: () => ({ addEventListener: noop } as any),
		store: opts.store ?? createTLStore({ shapeUtils: [], extensions: [] }),
		shapeUtils: opts.shapeUtils ?? [],
		tools: opts.tools ?? [],
	})
}

describe('ExtensionManager', () => {
	it('throws if two extensions have the same name', () => {
		const extension1 = EditorExtension.create({ name: 'test' })
		const extension2 = EditorExtension.create({ name: 'test' })

		expect(() =>
			makeEditor({ extensions: [extension1, extension2] })
		).toThrowErrorMatchingInlineSnapshot(
			`"Cannot have two EditorExtensions with the name \\"test\\""`
		)
	})

	it('allows the same extension to be specified twice', () => {
		const extension = EditorExtension.create({ name: 'test' })

		const editor = makeEditor({ extensions: [extension, extension] })
		expect(Array.from(editor.extensions, (ext) => ext.name)).toStrictEqual(['__core__', 'test'])
	})

	it('only initializes duplicated extensions once', () => {
		const extension = EditorExtension.create({
			name: 'test',
			addOptions: jest.fn(() => null),
		})

		makeEditor({ extensions: [extension, extension] })
		expect(extension.config.addOptions).toHaveBeenCalledTimes(1)
	})

	it('allows retrieving extensions', () => {
		const extension = EditorExtension.create({ name: 'test' })

		const editor = makeEditor({ extensions: [extension] })
		const instance = editor.extensions.get(extension)
		expect(instance).toBeInstanceOf(EditorExtensionInstance)
		expect(instance.name).toBe('test')
		expectType<EditorExtensionInstance<undefined>>(instance)
	})

	it('throws when trying to retrieve an extension that doesnt exist', () => {
		const extension = EditorExtension.create({ name: 'test' })
		const editor = makeEditor({ extensions: [] })
		expect(() => editor.extensions.get(extension)).toThrowErrorMatchingInlineSnapshot(
			`"Extension \\"test\\" not found"`
		)
	})

	it('initializes options on the extension', () => {
		const extension = EditorExtension.create({
			name: 'test',
			addOptions() {
				expect(this).toBeInstanceOf(EditorExtensionInstance)
				expectType<EditorExtensionInstance<never>>(this)
				expect(this.options).toEqual(undefined)
				return 'here are my options' as const
			},
		})

		const editor = makeEditor({ extensions: [extension] })
		const instance = editor.extensions.get(extension)
		expect(instance.options).toEqual('here are my options')
		expectType<EditorExtensionInstance<'here are my options'>>(instance)
	})

	it('allows overriding options with `configure`', () => {
		const addOptions = jest.fn(() => ({
			a: 1,
			b: 2,
		}))
		const extension = EditorExtension.create({
			name: 'test',
			addOptions,
		})

		const editor1 = makeEditor({ extensions: [extension] })
		const instance1 = editor1.extensions.get(extension)
		expect(instance1.options).toEqual({ a: 1, b: 2 })
		expect(addOptions).toHaveBeenCalledTimes(1)
		expect((addOptions as any).mock.contexts[0]).toBe(instance1)

		const editor2 = makeEditor({ extensions: [extension.configure({ a: 2, b: 3 })] })
		const instance2 = editor2.extensions.get(extension)
		expect(instance2.options).toEqual({ a: 2, b: 3 })
		expect(addOptions).toHaveBeenCalledTimes(1)

		const editor3 = makeEditor({
			extensions: [extension.configure((opts) => ({ ...opts, a: 1000 }))],
		})
		const instance3 = editor3.extensions.get(extension)
		expect(instance3.options).toEqual({ a: 1000, b: 2 })
		expect(addOptions).toHaveBeenCalledTimes(2)
		expect((addOptions as any).mock.contexts[1]).toBe(instance3)
	})

	it('gets a configured extension either by the configured version or by the original', () => {
		const extension1 = EditorExtension.create({
			name: 'test',
			addOptions: () => 1,
		})
		const extension2 = extension1.configure(() => 2)
		const extension3 = extension2.configure(() => 3)

		const editor = makeEditor({ extensions: [extension3] })
		const instance = editor.extensions.get(extension3)
		expect(instance.options).toEqual(3)

		expect(editor.extensions.get(extension2)).toStrictEqual(instance)
		expect(editor.extensions.get(extension1)).toStrictEqual(instance)
	})
})
