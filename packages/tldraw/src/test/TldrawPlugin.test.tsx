import { render } from '@testing-library/react'
import { BindingUtil } from '@tldraw/editor'
import { CustomRecordInfo } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { describe, expect, it, vi } from 'vitest'
import { Tldraw } from '../lib/Tldraw'
import {
	createPluginOnMount,
	mergePluginAssetUrls,
	mergePluginComponents,
	TldrawPlugin,
} from '../lib/TldrawPlugin'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from './testutils/renderTldrawComponent'

const A = () => <div data-testid="a" />
const B = () => <div data-testid="b" />
const U = () => <div data-testid="u" />

describe('mergePluginComponents', () => {
	it('stacks InFrontOfTheCanvas contributions in order, user last', () => {
		const merged = mergePluginComponents(
			[
				{ id: 'p1', components: { InFrontOfTheCanvas: A } },
				{ id: 'p2', components: { InFrontOfTheCanvas: B } },
			],
			{ InFrontOfTheCanvas: U }
		)

		const Stacked = merged.InFrontOfTheCanvas!
		const { getAllByTestId } = render(<Stacked />)
		const order = getAllByTestId(/^[abu]$/).map((el) => el.getAttribute('data-testid'))
		expect(order).toEqual(['a', 'b', 'u'])
	})

	it('stacks OnTheCanvas contributions in order, user last', () => {
		const merged = mergePluginComponents(
			[
				{ id: 'p1', components: { OnTheCanvas: A } },
				{ id: 'p2', components: { OnTheCanvas: B } },
			],
			{ OnTheCanvas: U }
		)

		const Stacked = merged.OnTheCanvas!
		const { getAllByTestId } = render(<Stacked />)
		const order = getAllByTestId(/^[abu]$/).map((el) => el.getAttribute('data-testid'))
		expect(order).toEqual(['a', 'b', 'u'])
	})

	it('user null hides a stacked slot entirely', () => {
		const merged = mergePluginComponents([{ id: 'p1', components: { InFrontOfTheCanvas: A } }], {
			InFrontOfTheCanvas: null,
		})
		expect(merged.InFrontOfTheCanvas).toBeNull()
	})

	it('user wins on non-stackable slots; plugin fills unset ones', () => {
		const merged = mergePluginComponents([{ id: 'p1', components: { Toolbar: A } }], {})
		expect(merged.Toolbar).toBe(A)
		const merged2 = mergePluginComponents([{ id: 'p1', components: { Toolbar: A } }], {
			Toolbar: U,
		})
		expect(merged2.Toolbar).toBe(U)
	})

	it('throws when two plugins set the same non-stackable slot', () => {
		expect(() =>
			mergePluginComponents([
				{ id: 'p1', components: { Toolbar: A } },
				{ id: 'p2', components: { Toolbar: B } },
			])
		).toThrow(/p1.*p2|p2.*p1/)
	})

	it('allows two plugins to set different non-stackable slots', () => {
		const merged = mergePluginComponents([
			{ id: 'p1', components: { Toolbar: A } },
			{ id: 'p2', components: { PageMenu: B } },
		])
		expect(merged.Toolbar).toBe(A)
		expect(merged.PageMenu).toBe(B)
	})

	it('user override wins over a plugin non-stackable slot without throwing', () => {
		expect(() =>
			mergePluginComponents([{ id: 'p1', components: { Toolbar: A } }], { Toolbar: U })
		).not.toThrow()
		const merged = mergePluginComponents([{ id: 'p1', components: { Toolbar: A } }], {
			Toolbar: U,
		})
		expect(merged.Toolbar).toBe(U)
	})
})

describe('mergePluginAssetUrls', () => {
	it('returns undefined when neither plugins nor user provide assetUrls', () => {
		expect(mergePluginAssetUrls([], undefined)).toBeUndefined()
		expect(mergePluginAssetUrls([{ id: 'p1' }], undefined)).toBeUndefined()
	})

	it('returns the single contribution unchanged', () => {
		const user = { icons: { 'my-icon': 'user.svg' } }
		expect(mergePluginAssetUrls([], user)).toBe(user)
		const plugin = { icons: { 'plugin-icon': 'plugin.svg' } }
		expect(mergePluginAssetUrls([{ id: 'p1', assetUrls: plugin }], undefined)).toBe(plugin)
	})

	it('merges categories key by key, later plugins and then the user winning', () => {
		const merged = mergePluginAssetUrls(
			[
				{ id: 'p1', assetUrls: { icons: { shared: 'p1.svg', 'p1-only': 'p1-only.svg' } } },
				{
					id: 'p2',
					assetUrls: { icons: { shared: 'p2.svg' }, fonts: { tldraw_mono: 'p2.woff2' } },
				},
			],
			{ icons: { shared: 'user.svg' } }
		)
		expect(merged).toEqual({
			icons: { shared: 'user.svg', 'p1-only': 'p1-only.svg' },
			fonts: { tldraw_mono: 'p2.woff2' },
		})
	})

	it('keeps plugin keys the user does not override', () => {
		const merged = mergePluginAssetUrls([{ id: 'p1', assetUrls: { icons: { pin: 'pin.svg' } } }], {
			translations: { en: 'en.json' },
		})
		expect(merged).toEqual({
			icons: { pin: 'pin.svg' },
			translations: { en: 'en.json' },
		})
	})
})

describe('createPluginOnMount', () => {
	it('runs plugin onMounts before the user onMount and chains cleanups', () => {
		const order: string[] = []
		const cleanup1 = vi.fn()
		const onMount = createPluginOnMount(
			[{ id: 'p1', onMount: () => (order.push('p1'), cleanup1) }],
			() => void order.push('user')
		)
		const cleanup = onMount({} as any)
		expect(order).toEqual(['p1', 'user'])
		;(cleanup as () => void)()
		expect(cleanup1).toHaveBeenCalledOnce()
	})
})

describe('<Tldraw plugins />', () => {
	// A plugin's `InFrontOfTheCanvas` overlay is host-installed content, analogous to a
	// user-supplied `InFrontOfTheCanvas`. It renders even when `hideUi` hides tldraw's own
	// chrome — `hideUi` only suppresses the default UI, not installed content.
	it('renders plugin InFrontOfTheCanvas content but no default UI when hideUi is set', async () => {
		const plugin: TldrawPlugin = {
			id: 'overlay-plugin',
			components: { InFrontOfTheCanvas: A },
		}

		await renderTldrawComponent(<Tldraw hideUi plugins={[plugin]} />, { waitForPatterns: false })

		// The plugin's overlay is installed content, so it renders even under hideUi.
		expect(document.querySelector('[data-testid="a"]')).toBeTruthy()
		// tldraw's own default UI chrome does not render.
		expect(document.querySelector('.tlui-layout')).toBeNull()
	})

	it('throws when two plugins share an id', async () => {
		const plugins: TldrawPlugin[] = [{ id: 'dup' }, { id: 'dup' }]

		expect(() => render(<Tldraw plugins={plugins} />)).toThrow(/duplicate plugin id/i)
	})
})

describe('<Tldraw records />', () => {
	const userRecordConfig: CustomRecordInfo = { scope: 'document', validator: T.any }
	const pluginRecordConfig: CustomRecordInfo = { scope: 'document', validator: T.any }

	it('keeps user records alongside plugin records', async () => {
		const plugin: TldrawPlugin = {
			id: 'records-plugin',
			records: { pluginRecord: pluginRecordConfig },
		}

		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw records={{ userRecord: userRecordConfig }} plugins={[plugin]} onMount={onMount} />
			),
			{ waitForPatterns: false }
		)

		// custom record types aren't part of the default TLRecord union, so index untyped
		const types = editor.store.schema.types as Record<string, { scope: string } | undefined>
		expect(types.userRecord).toBeTruthy()
		expect(types.pluginRecord).toBeTruthy()
	})

	it('keeps user records when there are no plugins', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw records={{ userRecord: userRecordConfig }} onMount={onMount} />,
			{ waitForPatterns: false }
		)

		const types = editor.store.schema.types as Record<string, { scope: string } | undefined>
		expect(types.userRecord).toBeTruthy()
	})
})

describe('<Tldraw plugins /> schema contributions', () => {
	class TestBindingUtil extends BindingUtil {
		static override type = 'test-plugin-binding' as const
		static override props = {}
		override getDefaultProps() {
			return {}
		}
	}

	it('registers plugin bindingUtils alongside the defaults', async () => {
		const plugin: TldrawPlugin = {
			id: 'bindings-plugin',
			bindingUtils: [TestBindingUtil],
		}

		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw plugins={[plugin]} onMount={onMount} />,
			{ waitForPatterns: false }
		)

		expect(editor.bindingUtils['test-plugin-binding']).toBeInstanceOf(TestBindingUtil)
		// the default binding utils are still registered
		expect(editor.bindingUtils['arrow']).toBeTruthy()
	})

	it('merges plugin migrations into the store schema alongside user migrations', async () => {
		const plugin: TldrawPlugin = {
			id: 'migrations-plugin',
			migrations: [{ sequenceId: 'test.plugin-sequence', retroactive: false, sequence: [] }],
		}

		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw
					plugins={[plugin]}
					migrations={[{ sequenceId: 'test.user-sequence', retroactive: false, sequence: [] }]}
					onMount={onMount}
				/>
			),
			{ waitForPatterns: false }
		)

		const sequences = editor.store.schema.serialize().sequences
		expect(sequences['test.plugin-sequence']).toBeDefined()
		expect(sequences['test.user-sequence']).toBeDefined()
	})
})
