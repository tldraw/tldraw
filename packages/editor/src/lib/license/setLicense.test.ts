import { computed, react } from '@tldraw/state'
import { afterEach, describe, expect, it } from 'vitest'
import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'
import { LicenseManager } from './LicenseManager'
import {
	resetLicenseForTest,
	getDefaultLicenseKey,
	getSharedLicenseManager,
	setLicense,
} from './setLicense'

const KEY = 'tldraw-test-key'
const OTHER_KEY = 'tldraw-other-test-key'

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
	resetLicenseForTest()
})

function makeEditor(licenseKey?: string) {
	const editor = new Editor({
		shapeUtils: [],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [], bindingUtils: [] }),
		getContainer: () => document.body,
		licenseKey,
	})
	editors.push(editor)
	return editor
}

describe('getSharedLicenseManager', () => {
	it('reuses one manager per key, so a key is validated and tracked once', () => {
		expect(getSharedLicenseManager(KEY)).toBe(getSharedLicenseManager(KEY))
		expect(getSharedLicenseManager(KEY)).not.toBe(getSharedLicenseManager(OTHER_KEY))
	})

	it('gives an unlicensed editor a manager, shared with every other unlicensed editor', () => {
		const manager = getSharedLicenseManager(undefined)
		expect(manager).toBeInstanceOf(LicenseManager)
		expect(getSharedLicenseManager(undefined)).toBe(manager)
	})
})

describe('setLicense', () => {
	// No assertion that the key starts undefined: with none set, it falls through to the
	// environment, and a contributor with TLDRAW_LICENSE_KEY in their shell would fail that.
	it('sets the key used when none was passed explicitly', () => {
		setLicense({ licenseKey: KEY })
		expect(getDefaultLicenseKey()).toBe(KEY)
		setLicense({ licenseKey: OTHER_KEY })
		expect(getDefaultLicenseKey()).toBe(OTHER_KEY)
	})

	it('is reactive, so a signal reading the license recomputes when the key is set', () => {
		const key = computed('key', () => getDefaultLicenseKey())
		const seen: (string | undefined)[] = []
		const stop = react('seen', () => seen.push(key.get()))
		setLicense({ licenseKey: KEY })
		stop()
		expect(seen.at(-1)).toBe(KEY)
		expect(seen).toHaveLength(2)
	})
})

describe('the license an editor resolves', () => {
	it('uses the key set by setLicense when the editor was given none', () => {
		setLicense({ licenseKey: KEY })
		expect(makeEditor().getLicenseManager()).toBe(getSharedLicenseManager(KEY))
	})

	it('applies a key set after the editor was created', () => {
		const editor = makeEditor()
		const unlicensed = editor.getLicenseManager()
		setLicense({ licenseKey: KEY })
		expect(editor.getLicenseManager()).not.toBe(unlicensed)
		expect(editor.getLicenseManager()).toBe(getSharedLicenseManager(KEY))
	})

	it("prefers the editor's own key, so two editors can hold different licenses", () => {
		setLicense({ licenseKey: KEY })
		const withOwnKey = makeEditor(OTHER_KEY)
		expect(withOwnKey.getLicenseManager()).toBe(getSharedLicenseManager(OTHER_KEY))
		// and a later setLicense doesn't move it
		setLicense({ licenseKey: KEY })
		expect(withOwnKey.getLicenseManager()).toBe(getSharedLicenseManager(OTHER_KEY))
		expect(makeEditor().getLicenseManager()).toBe(getSharedLicenseManager(KEY))
	})

	it('resolves the same manager the React tree above it does, for the same key', () => {
		// <TldrawEditor /> renders <LicenseProvider licenseKey={licenseKey} /> around an editor built
		// with that same key, and both go through the shared cache.
		expect(makeEditor(KEY).getLicenseManager()).toBe(getSharedLicenseManager(KEY))
	})
})

describe('isLicensedFeatureEnabled', () => {
	it('reads the resolved license manager', () => {
		const editor = makeEditor()
		editor.getLicenseManager().featureFlags.set({ collaboration: false, commenting: false })
		expect(editor.isLicensedFeatureEnabled('commenting')).toBe(false)
		editor.getLicenseManager().featureFlags.set({ collaboration: true, commenting: true })
		expect(editor.isLicensedFeatureEnabled('commenting')).toBe(true)
	})

	it('is reactive', () => {
		const editor = makeEditor()
		editor.getLicenseManager().featureFlags.set({ collaboration: false, commenting: false })
		const seen: boolean[] = []
		const stop = react('seen', () => seen.push(editor.isLicensedFeatureEnabled('commenting')))
		editor.getLicenseManager().featureFlags.set({ collaboration: false, commenting: true })
		stop()
		expect(seen).toEqual([false, true])
	})
})
