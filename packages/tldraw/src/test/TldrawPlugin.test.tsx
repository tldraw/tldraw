import { render } from '@testing-library/react'
import { CustomRecordInfo } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { describe, expect, it, vi } from 'vitest'
import { Tldraw } from '../lib/Tldraw'
import { createPluginOnMount, mergePluginComponents, TldrawPlugin } from '../lib/TldrawPlugin'
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
