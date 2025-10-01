import { vi } from 'vitest'
import { clearRegisteredVersionsForTests, registerTldrawLibraryVersion } from './version'

vi.useFakeTimers()

describe('registerTldrawLibraryVersion', () => {
	afterEach(() => {
		clearRegisteredVersionsForTests()
		vi.restoreAllMocks()
	})

	it('doesnt log anything if all versions are the same', () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

		registerTldrawLibraryVersion('tldraw', '1.0.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/editor', '1.0.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/utils', '1.0.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/tlschema', '1.0.0', 'esm')

		vi.runAllTimers()

		expect(consoleLogSpy).toHaveBeenCalledTimes(0)
	})

	it('logs if not all versions match', () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

		registerTldrawLibraryVersion('tldraw', '1.0.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/editor', '1.1.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/utils', '1.1.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/utils', '1.2.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/tlschema', '1.2.0', 'esm')

		vi.runAllTimers()

		expect(consoleLogSpy).toHaveBeenCalledTimes(1)
		expect(consoleLogSpy.mock.lastCall).toMatchInlineSnapshot(`
		[
		  "[1;41;97m[tldraw][m [31;1mYou have multiple versions of tldraw libraries installed. This can lead to bugs and unexpected behavior.[m

		The latest version you have installed is [1;94mv1.2.0[m. The following libraries are on the latest version:
		  • ✅ [1m@tldraw/tlschema[m

		The following libraries are not on the latest version, or have multiple versions installed:
		  • ❌ [1mtldraw[m ([31mv1.0.0[m)
		  • ❌ [1m@tldraw/editor[m ([31mv1.1.0[m)
		  • ❌ [1m@tldraw/utils[m ([31mv1.1.0[m, [32mv1.2.0[m)",
		]
	`)
	})

	it('logs if multiple versions of te same library are installed', () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

		registerTldrawLibraryVersion('tldraw', '1.1.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/editor', '1.1.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/editor', '1.1.0', 'cjs')
		registerTldrawLibraryVersion('@tldraw/utils', '1.1.0', 'esm')
		registerTldrawLibraryVersion('@tldraw/utils', '1.1.0', 'cjs')
		registerTldrawLibraryVersion('@tldraw/tlschema', '1.1.0', 'esm')

		vi.runAllTimers()

		expect(consoleLogSpy).toHaveBeenCalledTimes(1)
		expect(consoleLogSpy.mock.lastCall).toMatchInlineSnapshot(`
		[
		  "[1;41;97m[tldraw][m [31;1mYou have multiple instances of some tldraw libraries active. This can lead to bugs and unexpected behavior. [m

		This usually means that your bundler is misconfigured, and is importing the same library multiple times - usually once as an ES Module, and once as a CommonJS module.

		The following libraries have been imported multiple times:
		  • ❌ [1m@tldraw/editor[m v1.1.0: 
		      1. ES Modules
		      2. CommonJS
		  • ❌ [1m@tldraw/utils[m v1.1.0: 
		      1. ES Modules
		      2. CommonJS

		You should configure your bundler to only import one version of each library.",
		]
	`)
	})
})
