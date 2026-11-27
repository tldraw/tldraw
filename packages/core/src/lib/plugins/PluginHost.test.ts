// @vitest-environment node
import { computed } from '@tldraw/state'
import { approximateTextMeasurementPlugin } from './builtin/textMeasurement'
import { createEditor } from './createEditor'
import {
	TLChainHandler,
	TLPipe,
	TLPlugin,
	TLPluginContext,
	defineCapability,
	definePlugin,
	defineSlot,
} from './plugin'

const clock = defineCapability<{ now(): number }>('test.clock')
const numbers = defineSlot<TLPipe<number>>('test.numbers')
const handlers = defineSlot<TLChainHandler<string, string>>('test.handlers')

const clockPlugin = definePlugin({
	id: 'clock',
	provides: [clock],
	setup(ctx) {
		ctx.provide(clock, { now: () => 42 })
	},
})

function editorWith(...plugins: TLPlugin[]) {
	return createEditor({ plugins: [approximateTextMeasurementPlugin(), ...plugins] })
}

describe('plugin setup', () => {
	it('sets up providers before the plugins that require them, in any list order', () => {
		const order: string[] = []
		const user = definePlugin({
			id: 'user',
			requires: [clock],
			setup(ctx) {
				order.push(`user saw ${ctx.get(clock).now()}`)
			},
		})
		const provider = definePlugin({
			...clockPlugin,
			setup(ctx) {
				order.push('clock')
				clockPlugin.setup(ctx)
			},
		})
		editorWith(user, provider)
		expect(order).toEqual(['clock', 'user saw 42'])
	})

	it('throws when two plugins share an id', () => {
		expect(() => editorWith(clockPlugin, { id: 'clock' })).toThrow(
			'Two plugins have the id "clock"'
		)
	})

	it('throws when two plugins provide the same capability', () => {
		expect(() => editorWith(clockPlugin, { ...clockPlugin, id: 'otherClock' })).toThrow(
			'Plugins "clock" and "otherClock" both provide "test.clock"'
		)
	})

	it('throws when a required capability has no provider', () => {
		expect(() => editorWith({ id: 'user', requires: [clock] })).toThrow(
			'Plugin "user" requires "test.clock", but no installed plugin provides it.'
		)
	})

	it('throws on a dependency cycle', () => {
		const a = defineCapability('a')
		const b = defineCapability('b')
		expect(() =>
			editorWith(
				{ id: 'pa', provides: [a], requires: [b] },
				{ id: 'pb', provides: [b], requires: [a] }
			)
		).toThrow('Plugin dependency cycle: pa -> pb -> pa')
	})

	it('throws when a plugin uses a capability that it did not declare', () => {
		expect(() =>
			editorWith(clockPlugin, {
				id: 'sneaky',
				setup(ctx) {
					ctx.get(clock)
				},
			})
		).toThrow('Plugin "sneaky" uses "test.clock" but does not list it')
	})

	it('throws when a plugin declares a capability that it does not provide', () => {
		expect(() => editorWith({ id: 'liar', provides: [clock] })).toThrow(
			'Plugin "liar" declares that it provides "test.clock" but did not.'
		)
	})

	it('gives undefined for an optional capability without a provider', () => {
		let seen: unknown = 'unset'
		editorWith({
			id: 'user',
			optional: [clock],
			setup(ctx) {
				seen = ctx.getOptional(clock)
			},
		})
		expect(seen).toBeUndefined()
	})

	it('disposes the plugins that set up when a later plugin fails to set up', () => {
		const disposed: string[] = []
		expect(() =>
			editorWith(
				{
					id: 'loop',
					setup(ctx) {
						ctx.onDispose(() => disposed.push('loop'))
					},
				},
				{
					id: 'broken',
					setup() {
						throw Error('broken setup')
					},
				}
			)
		).toThrow('broken setup')
		expect(disposed).toEqual(['loop'])
	})

	it('runs disposers in reverse setup order when the editor is disposed', () => {
		const order: string[] = []
		const plugin = (id: string): TLPlugin => ({
			id,
			setup(ctx) {
				ctx.onDispose(() => order.push(id))
			},
		})
		const editor = editorWith(plugin('a'), plugin('b'))
		editor.dispose()
		expect(order).toEqual(['b', 'a'])
	})
})

describe('slots', () => {
	const contributor = (id: string, fn: TLPipe<number>, order?: object): TLPlugin => ({
		id,
		setup(ctx) {
			ctx.contribute(numbers, fn, order)
		},
	})

	it('runs pipes in install order without constraints', () => {
		const editor = editorWith(
			contributor('add', (n) => n + 1),
			contributor('double', (n) => n * 2)
		)
		expect(editor.plugins.pipe(numbers, 1)).toBe(4)
	})

	it('respects before and after constraints', () => {
		const editor = editorWith(
			contributor('add', (n) => n + 1),
			contributor('double', (n) => n * 2, { before: ['add'] })
		)
		expect(editor.plugins.pipe(numbers, 1)).toBe(3)
	})

	it('throws on conflicting order constraints', () => {
		expect(() =>
			editorWith(
				contributor('add', (n) => n + 1, { before: ['double'] }),
				contributor('double', (n) => n * 2, { before: ['add'] })
			)
		).toThrow('conflicting order constraints')
	})

	it('runs a chain until a handler does not call next', () => {
		const editor = editorWith(
			{
				id: 'shout',
				setup(ctx) {
					ctx.contribute(handlers, (s, next) => (s.startsWith('!') ? s.toUpperCase() : next(s)))
				},
			},
			{
				id: 'trim',
				setup(ctx) {
					ctx.contribute(handlers, (s, next) => next(s.trim()))
				},
			}
		)
		expect(editor.plugins.chain(handlers, '!hi', (s) => `default:${s}`)).toBe('!HI')
		expect(editor.plugins.chain(handlers, ' hi ', (s) => `default:${s}`)).toBe('default:hi')
	})

	it('is reactive: a computed that reads a slot updates when a contribution is added or removed', () => {
		let context!: TLPluginContext
		const editor = editorWith({
			id: 'late',
			setup(ctx) {
				context = ctx
			},
		})
		const result = computed('result', () => editor.plugins.pipe(numbers, 0))
		expect(result.get()).toBe(0)
		const remove = context.contribute(numbers, (n) => n + 10)
		expect(result.get()).toBe(10)
		remove()
		expect(result.get()).toBe(0)
	})
})
