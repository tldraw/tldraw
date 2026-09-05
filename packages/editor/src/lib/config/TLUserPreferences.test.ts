import { deleteFromLocalStorage, getFromLocalStorage, setInLocalStorage } from '@tldraw/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	USER_COLORS,
	defaultUserPreferences,
	getFreshUserPreferences,
	userTypeValidator,
} from './TLUserPreferences'

describe('TLUserPreferences consistency', () => {
	// When adding a new user preference, add it to this list AND update:
	// 1. TLUserPreferences interface
	// 2. userTypeValidator
	// 3. defaultUserPreferences
	// 4. Versions enum and migrateSnapshot()
	const interfaceKeys = [
		'name',
		'color',
		'locale',
		'animationSpeed',
		'areKeyboardShortcutsEnabled',
		'edgeScrollSpeed',
		'colorScheme',
		'isSnapMode',
		'isWrapMode',
		'isDynamicSizeMode',
		'isPasteAtCursorMode',
		'enhancedA11yMode',
		'inputMode',
		'isZoomDirectionInverted',
	] as const

	it('defaultUserPreferences contains all TLUserPreferences keys (except id)', () => {
		const defaultKeys = Object.keys(defaultUserPreferences).sort()
		const expected = [...interfaceKeys].sort()

		expect(defaultKeys).toEqual(expected)
	})

	it('userTypeValidator validates all TLUserPreferences keys', () => {
		// Access the internal config property to check which keys the validator covers
		const validatorKeys = Object.keys((userTypeValidator as any).config).sort()
		const expected = ['id', ...interfaceKeys].sort()

		expect(validatorKeys).toEqual(expected)
	})
})

describe('loading stored preferences', () => {
	afterEach(() => {
		deleteFromLocalStorage('TLDRAW_USER_DATA_v3')
		vi.resetModules()
	})

	it.each([
		['corrupt json', '{not json'],
		['a snapshot whose user is not an object', JSON.stringify({ version: 1, user: null })],
	])('falls back to fresh preferences for %s', async (_label, stored) => {
		setInLocalStorage('TLDRAW_USER_DATA_v3', stored)
		const { getUserPreferences } = await import('./TLUserPreferences')
		expect(getUserPreferences().id).toEqual(expect.any(String))
	})
})

describe('defaults', () => {
	it('ships light mode, snapping off, and every feature flag at its documented default', () => {
		expect(defaultUserPreferences).toMatchObject({
			name: '',
			edgeScrollSpeed: 1,
			animationSpeed: 1,
			areKeyboardShortcutsEnabled: true,
			isSnapMode: false,
			isWrapMode: false,
			isDynamicSizeMode: false,
			isPasteAtCursorMode: false,
			enhancedA11yMode: false,
			colorScheme: 'light',
			inputMode: null,
			isZoomDirectionInverted: false,
		})
		expect(USER_COLORS).toContain(defaultUserPreferences.color)
		expect(defaultUserPreferences.locale).toEqual(expect.any(String))
		expect(Object.isFrozen(defaultUserPreferences)).toBe(true)
	})

	it('creates fresh preferences with only an id and a palette color', () => {
		const fresh = getFreshUserPreferences()
		expect(Object.keys(fresh).sort()).toEqual(['color', 'id'])
		expect(fresh.id).toEqual(expect.any(String))
		expect(USER_COLORS).toContain(fresh.color)
		expect(getFreshUserPreferences().id).not.toEqual(fresh.id)
	})
})

describe('userTypeValidator', () => {
	it('accepts nullable optional fields', () => {
		const prefs = {
			id: 'u1',
			name: null,
			color: null,
			locale: null,
			animationSpeed: null,
			areKeyboardShortcutsEnabled: null,
			edgeScrollSpeed: null,
			isSnapMode: null,
			isWrapMode: null,
			isDynamicSizeMode: null,
			isPasteAtCursorMode: null,
			enhancedA11yMode: null,
			inputMode: null,
			isZoomDirectionInverted: null,
		}
		expect(userTypeValidator.validate(prefs)).toEqual(prefs)
	})

	it.each([
		['a missing id', {}],
		['an unknown color scheme', { id: 'u1', colorScheme: 'sepia' }],
		['a null color scheme', { id: 'u1', colorScheme: null }],
		['an unknown input mode', { id: 'u1', inputMode: 'touch' }],
		['a non-numeric animation speed', { id: 'u1', animationSpeed: 'fast' }],
		['unknown keys', { id: 'u1', isDarkMode: true }],
	])('rejects %s', (_label, prefs) => {
		expect(() => userTypeValidator.validate(prefs)).toThrow()
	})
})

describe('stored preferences', () => {
	const KEY = 'TLDRAW_USER_DATA_v3'

	function readStored() {
		return JSON.parse(getFromLocalStorage(KEY)!)
	}

	afterEach(() => {
		deleteFromLocalStorage(KEY)
		vi.resetModules()
	})

	async function loadModule() {
		return await import('./TLUserPreferences')
	}

	it('starts with fresh preferences and persists them', async () => {
		const { getUserPreferences } = await loadModule()
		const prefs = getUserPreferences()

		expect(Object.keys(prefs).sort()).toEqual(['color', 'id'])
		expect(readStored()).toEqual({ version: 13, user: prefs })
		expect(getUserPreferences()).toBe(prefs)
	})

	it('round-trips preferences through local storage', async () => {
		const first = await loadModule()
		first.setUserPreferences({
			id: 'user-1',
			name: 'Ada',
			colorScheme: 'dark',
			isSnapMode: true,
			inputMode: 'trackpad',
		})
		expect(readStored()).toEqual({
			version: 13,
			user: {
				id: 'user-1',
				name: 'Ada',
				colorScheme: 'dark',
				isSnapMode: true,
				inputMode: 'trackpad',
			},
		})

		vi.resetModules()
		const second = await loadModule()
		expect(second.getUserPreferences()).toEqual({
			id: 'user-1',
			name: 'Ada',
			colorScheme: 'dark',
			isSnapMode: true,
			inputMode: 'trackpad',
		})
	})

	it('rejects invalid preferences without touching storage', async () => {
		const { setUserPreferences, getUserPreferences } = await loadModule()
		setUserPreferences({ id: 'user-1', name: 'Ada' })

		expect(() => setUserPreferences({ id: 'user-1', colorScheme: 'sepia' as 'light' })).toThrow()
		expect(getUserPreferences()).toEqual({ id: 'user-1', name: 'Ada' })
		expect(readStored().user).toEqual({ id: 'user-1', name: 'Ada' })
	})

	it('migrates a version 0 snapshot to the current version', async () => {
		setInLocalStorage(KEY, JSON.stringify({ version: 0, user: { id: 'old', isDarkMode: true } }))
		const { getUserPreferences } = await loadModule()

		expect(getUserPreferences()).toEqual({
			id: 'old',
			animationSpeed: 1,
			isSnapMode: false,
			edgeScrollSpeed: 1,
			isWrapMode: false,
			colorScheme: 'dark',
			isDynamicSizeMode: false,
			isPasteAtCursorMode: false,
			areKeyboardShortcutsEnabled: true,
			enhancedA11yMode: false,
			inputMode: null,
			isZoomDirectionInverted: false,
		})
		expect(readStored().version).toBe(13)
	})

	it.each([
		['true', true, 'dark'],
		['false', false, 'light'],
		['absent', undefined, undefined],
	])(
		'turns the legacy isDarkMode=%s flag into a color scheme',
		async (_label, isDarkMode, colorScheme) => {
			setInLocalStorage(KEY, JSON.stringify({ version: 6, user: { id: 'old', isDarkMode } }))
			const { getUserPreferences } = await loadModule()

			const prefs = getUserPreferences()
			expect(prefs.colorScheme).toBe(colorScheme)
			expect('isDarkMode' in prefs).toBe(false)
		}
	)

	it('renames showUiLabels to enhancedA11yMode', async () => {
		setInLocalStorage(
			KEY,
			JSON.stringify({ version: 11, user: { id: 'old', showUiLabels: true, inputMode: 'mouse' } })
		)
		const { getUserPreferences } = await loadModule()

		expect(getUserPreferences()).toEqual({
			id: 'old',
			enhancedA11yMode: true,
			inputMode: 'mouse',
			isZoomDirectionInverted: false,
		})
	})

	it('leaves a current-version snapshot untouched', async () => {
		const user = { id: 'current', name: 'Bo', colorScheme: 'system' }
		setInLocalStorage(KEY, JSON.stringify({ version: 13, user }))
		const { getUserPreferences } = await loadModule()

		expect(getUserPreferences()).toEqual(user)
	})

	it.each([
		['a snapshot without a version', JSON.stringify({ user: { id: 'old' } })],
		[
			'a snapshot with a non-numeric version',
			JSON.stringify({ version: '1', user: { id: 'old' } }),
		],
		['a snapshot whose user fails validation', JSON.stringify({ version: 13, user: { id: 1 } })],
		['a non-object snapshot', JSON.stringify('hello')],
	])('falls back to fresh preferences for %s', async (_label, stored) => {
		setInLocalStorage(KEY, stored)
		const { getUserPreferences } = await loadModule()

		const prefs = getUserPreferences()
		expect(prefs.id).not.toBe('old')
		expect(Object.keys(prefs).sort()).toEqual(['color', 'id'])
	})
})

describe('cross-tab sync', () => {
	const KEY = 'TLDRAW_USER_DATA_v3'

	class FakeBroadcastChannel {
		static instances: FakeBroadcastChannel[] = []
		listeners: ((e: { data: unknown }) => void)[] = []
		postMessage = vi.fn()
		constructor(public name: string) {
			FakeBroadcastChannel.instances.push(this)
		}
		addEventListener(_type: string, listener: (e: { data: unknown }) => void) {
			this.listeners.push(listener)
		}
		receive(data: unknown) {
			for (const listener of this.listeners) listener({ data })
		}
	}

	beforeEach(() => {
		// The channel is only created outside of test builds, so pretend this
		// module was loaded in a real browser.
		vi.stubEnv('NODE_ENV', 'development')
		vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
		FakeBroadcastChannel.instances = []
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.unstubAllGlobals()
		deleteFromLocalStorage(KEY)
		vi.resetModules()
	})

	it('does not open a channel in test builds', async () => {
		vi.stubEnv('NODE_ENV', 'test')
		await import('./TLUserPreferences')
		expect(FakeBroadcastChannel.instances).toEqual([])
	})

	it('broadcasts preference changes to other tabs', async () => {
		const { setUserPreferences } = await import('./TLUserPreferences')
		const [channel] = FakeBroadcastChannel.instances
		expect(channel.name).toBe('tldraw-user-sync')

		setUserPreferences({ id: 'user-1', name: 'Ada' })

		expect(channel.postMessage).toHaveBeenCalledTimes(1)
		const message = channel.postMessage.mock.calls[0][0]
		expect(message).toEqual({
			type: 'tldraw-user-preferences-change',
			origin: expect.any(String),
			data: { version: 13, user: { id: 'user-1', name: 'Ada' } },
		})

		setUserPreferences({ id: 'user-1', name: 'Bo' })
		expect(channel.postMessage.mock.calls[1][0].origin).toBe(message.origin)
	})

	it('applies changes broadcast from other tabs, migrating as needed', async () => {
		const { setUserPreferences, getUserPreferences } = await import('./TLUserPreferences')
		const [channel] = FakeBroadcastChannel.instances
		setUserPreferences({ id: 'user-1', name: 'Ada' })

		channel.receive({
			type: 'tldraw-user-preferences-change',
			origin: 'another-tab',
			data: { version: 6, user: { id: 'user-1', name: 'Remote', isDarkMode: true } },
		})

		expect(getUserPreferences()).toEqual({
			id: 'user-1',
			name: 'Remote',
			colorScheme: 'dark',
			isPasteAtCursorMode: false,
			areKeyboardShortcutsEnabled: true,
			enhancedA11yMode: false,
			inputMode: null,
			isZoomDirectionInverted: false,
		})
	})

	it('ignores its own broadcasts and unrelated messages', async () => {
		const { setUserPreferences, getUserPreferences } = await import('./TLUserPreferences')
		const [channel] = FakeBroadcastChannel.instances
		setUserPreferences({ id: 'user-1', name: 'Ada' })
		const origin = channel.postMessage.mock.calls[0][0].origin

		channel.receive({
			type: 'tldraw-user-preferences-change',
			origin,
			data: { version: 13, user: { id: 'user-1', name: 'Echo' } },
		})
		channel.receive({ type: 'something-else', origin: 'other', data: {} })
		channel.receive(undefined)

		expect(getUserPreferences()).toEqual({ id: 'user-1', name: 'Ada' })
	})
})
