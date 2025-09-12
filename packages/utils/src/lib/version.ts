interface TldrawLibraryVersion {
	name: string
	version: string
	modules: string
}

interface TldrawLibraryVersionInfo {
	versions: TldrawLibraryVersion[]
	didWarn: boolean
	scheduledNotice: number | NodeJS.Timeout | null
}

const TLDRAW_LIBRARY_VERSION_KEY = '__TLDRAW_LIBRARY_VERSIONS__' as const

// eslint-disable-next-line @typescript-eslint/prefer-namespace-keyword, @typescript-eslint/no-namespace
declare module globalThis {
	export const __TLDRAW_LIBRARY_VERSIONS__: TldrawLibraryVersionInfo
}

function getLibraryVersions(): TldrawLibraryVersionInfo {
	if (globalThis[TLDRAW_LIBRARY_VERSION_KEY]) {
		return globalThis[TLDRAW_LIBRARY_VERSION_KEY]
	}

	const info: TldrawLibraryVersionInfo = {
		versions: [],
		didWarn: false,
		scheduledNotice: null,
	}

	Object.defineProperty(globalThis, TLDRAW_LIBRARY_VERSION_KEY, {
		value: info,
		writable: false,
		configurable: false,
		enumerable: false,
	})

	return info
}

/**
 * Clears all registered library versions and resets warning state.
 * This function is intended for testing purposes only to reset the global version tracking state.
 * @returns void
 * @example
 * ```ts
 * // In a test setup
 * beforeEach(() => {
 *   clearRegisteredVersionsForTests()
 * })
 *
 * // Now version tracking starts fresh for each test
 * registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
 * ```
 * @internal
 */
export function clearRegisteredVersionsForTests() {
	const info = getLibraryVersions()
	info.versions = []
	info.didWarn = false
	if (info.scheduledNotice) {
		clearTimeout(info.scheduledNotice)
		info.scheduledNotice = null
	}
}

/**
 * Registers a tldraw library version for conflict detection.
 * This function tracks different tldraw library versions to warn about potential conflicts
 * when multiple versions are loaded simultaneously.
 * @param name - The name of the tldraw library package (e.g., '\@tldraw/editor').
 * @param version - The semantic version string (e.g., '2.0.0').
 * @param modules - The module system being used ('esm' or 'cjs').
 * @returns void
 * @example
 * ```ts
 * // Register a library version during package initialization
 * registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
 * registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')
 *
 * // If conflicting versions are detected, warnings will be logged:
 * registerTldrawLibraryVersion('@tldraw/editor', '1.9.0', 'cjs')
 * // Console warning about version mismatch will appear
 * ```
 * @internal
 */
export function registerTldrawLibraryVersion(name?: string, version?: string, modules?: string) {
	if (!name || !version || !modules) {
		if ((globalThis as any).TLDRAW_LIBRARY_IS_BUILD) {
			throw new Error('Missing name/version/module system in built version of tldraw library')
		}
		return
	}

	const info = getLibraryVersions()
	info.versions.push({ name, version, modules })

	if (!info.scheduledNotice) {
		try {
			// eslint-disable-next-line no-restricted-globals
			info.scheduledNotice = setTimeout(() => {
				info.scheduledNotice = null
				checkLibraryVersions(info)
			}, 100)
		} catch {
			// some environments (e.g. cloudflare workers) don't support setTimeout immediately, only in a handler.
			// in this case, we'll just check immediately.
			checkLibraryVersions(info)
		}
	}
}

function checkLibraryVersions(info: TldrawLibraryVersionInfo) {
	if (!info.versions.length) return
	if (info.didWarn) return

	const sorted = info.versions.sort((a, b) => compareVersions(a.version, b.version))
	const latestVersion = sorted[sorted.length - 1].version

	const matchingVersions = new Set<string>()
	const nonMatchingVersions = new Map<string, Set<string>>()
	for (const lib of sorted) {
		if (nonMatchingVersions.has(lib.name)) {
			matchingVersions.delete(lib.name)
			entry(nonMatchingVersions, lib.name, new Set()).add(lib.version)
			continue
		}

		if (lib.version === latestVersion) {
			matchingVersions.add(lib.name)
		} else {
			matchingVersions.delete(lib.name)
			entry(nonMatchingVersions, lib.name, new Set()).add(lib.version)
		}
	}

	if (nonMatchingVersions.size > 0) {
		const message = [
			`${format('[tldraw]', ['bold', 'bgRed', 'textWhite'])} ${format('You have multiple versions of tldraw libraries installed. This can lead to bugs and unexpected behavior.', ['textRed', 'bold'])}`,
			'',
			`The latest version you have installed is ${format(`v${latestVersion}`, ['bold', 'textBlue'])}. The following libraries are on the latest version:`,
			...Array.from(matchingVersions, (name) => `  • ✅ ${format(name, ['bold'])}`),
			'',
			`The following libraries are not on the latest version, or have multiple versions installed:`,
			...Array.from(nonMatchingVersions, ([name, versions]) => {
				const sortedVersions = Array.from(versions)
					.sort(compareVersions)
					.map((v) => format(`v${v}`, v === latestVersion ? ['textGreen'] : ['textRed']))
				return `  • ❌ ${format(name, ['bold'])} (${sortedVersions.join(', ')})`
			}),
		]

		// eslint-disable-next-line no-console
		console.log(message.join('\n'))
		info.didWarn = true
		return
	}

	// at this point, we know that everything has the same version. there may still be duplicates though!
	const potentialDuplicates = new Map<string, { version: string; modules: string[] }>()
	for (const lib of sorted) {
		entry(potentialDuplicates, lib.name, { version: lib.version, modules: [] }).modules.push(
			lib.modules
		)
	}

	const duplicates = new Map<string, { version: string; modules: string[] }>()
	for (const [name, lib] of potentialDuplicates) {
		if (lib.modules.length > 1) duplicates.set(name, lib)
	}

	if (duplicates.size > 0) {
		const message = [
			`${format('[tldraw]', ['bold', 'bgRed', 'textWhite'])} ${format('You have multiple instances of some tldraw libraries active. This can lead to bugs and unexpected behavior. ', ['textRed', 'bold'])}`,
			'',
			'This usually means that your bundler is misconfigured, and is importing the same library multiple times - usually once as an ES Module, and once as a CommonJS module.',
			'',
			'The following libraries have been imported multiple times:',
			...Array.from(duplicates, ([name, lib]) => {
				const modules = lib.modules
					.map((m, i) => (m === 'esm' ? `      ${i + 1}. ES Modules` : `      ${i + 1}. CommonJS`))
					.join('\n')
				return `  • ❌ ${format(name, ['bold'])} v${lib.version}: \n${modules}`
			}),
			'',
			'You should configure your bundler to only import one version of each library.',
		]

		// eslint-disable-next-line no-console
		console.log(message.join('\n'))
		info.didWarn = true
		return
	}
}

function compareVersions(a: string, b: string) {
	const aMatch = a.match(/^(\d+)\.(\d+)\.(\d+)(?:-(\w+))?$/)
	const bMatch = b.match(/^(\d+)\.(\d+)\.(\d+)(?:-(\w+))?$/)

	if (!aMatch || !bMatch) return a.localeCompare(b)
	if (aMatch[1] !== bMatch[1]) return Number(aMatch[1]) - Number(bMatch[1])
	if (aMatch[2] !== bMatch[2]) return Number(aMatch[2]) - Number(bMatch[2])
	if (aMatch[3] !== bMatch[3]) return Number(aMatch[3]) - Number(bMatch[3])
	if (aMatch[4] && bMatch[4]) return aMatch[4].localeCompare(bMatch[4])
	if (aMatch[4]) return 1
	if (bMatch[4]) return -1
	return 0
}

const formats = {
	bold: '1',
	textBlue: '94',
	textRed: '31',
	textGreen: '32',
	bgRed: '41',
	textWhite: '97',
} as const
function format(value: string, formatters: (keyof typeof formats)[] = []) {
	return `\x1B[${formatters.map((f) => formats[f]).join(';')}m${value}\x1B[m`
}

function entry<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
	if (map.has(key)) {
		return map.get(key)!
	}
	map.set(key, defaultValue)
	return defaultValue
}
