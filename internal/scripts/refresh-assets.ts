import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { SemVer } from 'semver'
import { optimize } from 'svgo'
import { publishDates, version } from '../../packages/editor/src/version'
import {
	readJsonIfExists,
	REPO_ROOT,
	writeCodeFile,
	writeFile,
	writeJsonFile,
	writeStringFile,
} from './lib/file'
import { nicelog } from './lib/nicelog'

// We'll need to copy the assets into these folders
const PUBLIC_FOLDER_PATHS = [join(REPO_ROOT, 'packages', 'assets')]

const FONT_MAPPING: Record<string, string> = {
	'IBMPlexMono-Medium': 'tldraw_mono',
	'IBMPlexMono-MediumItalic': 'tldraw_mono_italic',
	'IBMPlexMono-Bold': 'tldraw_mono_bold',
	'IBMPlexMono-BoldItalic': 'tldraw_mono_italic_bold',
	'IBMPlexSerif-Medium': 'tldraw_serif',
	'IBMPlexSerif-MediumItalic': 'tldraw_serif_italic',
	'IBMPlexSerif-Bold': 'tldraw_serif_bold',
	'IBMPlexSerif-BoldItalic': 'tldraw_serif_italic_bold',
	'IBMPlexSans-Medium': 'tldraw_sans',
	'IBMPlexSans-MediumItalic': 'tldraw_sans_italic',
	'IBMPlexSans-Bold': 'tldraw_sans_bold',
	'IBMPlexSans-BoldItalic': 'tldraw_sans_italic_bold',
	'Shantell_Sans-Informal_Regular': 'tldraw_draw',
	'Shantell_Sans-Informal_Regular_Italic': 'tldraw_draw_italic',
	'Shantell_Sans-Informal_Bold': 'tldraw_draw_bold',
	'Shantell_Sans-Informal_Bold_Italic': 'tldraw_draw_italic_bold',
}

const ASSETS_FOLDER_PATH = join(REPO_ROOT, 'assets')
const DOTCOM_FOLDER_PATH = join(REPO_ROOT, 'apps', 'dotcom')

const collectedAssetUrls: Record<
	'fonts' | 'icons' | 'translations' | 'embedIcons',
	Record<string, { file: string; hash?: string }>
> = {
	fonts: {},
	icons: {},
	translations: {},
	embedIcons: {},
}

const mergedIconFooter = '</svg>'

function optimizeAndMergeSvgs(
	icons: string[],
	sourceFolderPath: string,
	mergedIconName: string,
	mergedIconHeader: string
) {
	// Create the optimized SVGs
	const optimizedSvgs = icons.map((icon) => {
		const iconPath = join(sourceFolderPath, icon)
		const content = readFileSync(iconPath, 'utf8')
		const svg = optimize(content, { path: iconPath })
		return { fileName: icon, data: svg.data }
	})

	// Merge svgs into a single file
	const mergedSvgParts = [
		mergedIconHeader,
		'<style>',
		// in order to target individual icons with the URL hash, we need to hide all of them by
		// default...
		'svg > [id] { display: none; }',
		// ...then show the one that's targeted
		'svg > [id]:target { display: inline; }',
		'</style>',
	]
	for (const { fileName, data } of optimizedSvgs) {
		if (!data.startsWith(mergedIconHeader) || !data.endsWith(mergedIconFooter)) {
			nicelog('SVG does not match expected format for merging:', fileName)
			process.exit(1)
		}

		const id = fileName.replace('.svg', '')
		const svgContent = data.slice(mergedIconHeader.length, -mergedIconFooter.length)
		mergedSvgParts.push(`<g id="${id}">${svgContent}</g>`)
	}
	mergedSvgParts.push(mergedIconFooter)
	const mergedSvg = optimize(mergedSvgParts.join('\n')).data
	optimizedSvgs.push({ fileName: mergedIconName, data: mergedSvg })
	return optimizedSvgs
}

// 1. ICONS
async function copyIcons() {
	const sourceFolderPath = join(ASSETS_FOLDER_PATH, 'icons', 'icon')
	const mergedIconName = '0_merged.svg'

	// this is how `svgo` starts each one of our optimized icon SVGs. if they don't all start with this,
	// we can't merge them as it means they're of different size and are using different fill rules.
	const mergedIconHeader =
		'<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none">'

	// Get a list of all icons
	const icons = readdirSync(sourceFolderPath).filter((icon) => icon.endsWith('.svg'))
	// Write list of names into icon-names.json (just the name, not extension)
	const iconNames = icons.map((name) => name.replace('.svg', ''))

	const optimizedSvgs = optimizeAndMergeSvgs(
		icons,
		sourceFolderPath,
		mergedIconName,
		mergedIconHeader
	)

	// Optimize all of the svg icons and write them into the new folders
	for (const folderPath of PUBLIC_FOLDER_PATHS) {
		const publicIconsRootFolderPath = join(folderPath, 'icons')
		const publicIconsFolderPath = join(publicIconsRootFolderPath, 'icon')

		if (existsSync(publicIconsRootFolderPath)) {
			rmSync(publicIconsRootFolderPath, { recursive: true })
		}

		// Create the folders
		mkdirSync(publicIconsRootFolderPath, { recursive: true })
		mkdirSync(publicIconsFolderPath, { recursive: true })

		// Copy each optimized icons into the new folder
		for (const { fileName, data } of optimizedSvgs) {
			await writeStringFile(join(publicIconsFolderPath, fileName), data)
		}

		// Write the JSON file containing all of the names of the icons
		await writeJsonFile(join(publicIconsFolderPath, 'icon-names.json'), iconNames)
	}

	// Get the names of all of the svg icons and create a TypeScript file of valid icon names
	const iconTypeFile = `
		/** @public */
		export type TLUiIconType = 
			${icons.map((icon) => JSON.stringify(icon.replace('.svg', ''))).join(' | ')}

		/** @public */
		export const iconTypes = [
			${icons.map((icon) => JSON.stringify(icon.replace('.svg', ''))).join(', ')}
		] as const`

	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'packages', 'tldraw', 'src', 'lib', 'ui', 'icon-types.ts'),
		iconTypeFile
	)

	// add to the asset declaration file
	for (const icon of icons) {
		const name = icon.replace('.svg', '')
		collectedAssetUrls.icons[name] = {
			file: `icons/icon/${mergedIconName}`,
			hash: name,
		}
	}
}

async function optimizeAndMergeDotcomIcons() {
	const sourceFolderPath = join(DOTCOM_FOLDER_PATH, 'client', 'assets', 'icons', 'icon')
	const mergedIconName = '0_merged_tla.svg'

	// this is how `svgo` starts each one of our optimized icon SVGs. if they don't all start with this,
	// we can't merge them as it means they're of different size and are using different fill rules.
	const mergedIconHeader =
		'<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none">'

	// Get a list of all icons
	const icons = readdirSync(sourceFolderPath).filter((icon) => /icon-.*\.svg$/.test(icon))

	const optimizedSvgs = optimizeAndMergeSvgs(
		icons,
		sourceFolderPath,
		mergedIconName,
		mergedIconHeader
	)

	const mergedIconPath = join(DOTCOM_FOLDER_PATH, 'client', 'src', 'assets')

	for (const { fileName, data } of optimizedSvgs) {
		if (fileName.includes(mergedIconName)) {
			await writeStringFile(join(mergedIconPath, fileName), data)
		} else {
			await writeStringFile(join(sourceFolderPath, fileName), data)
		}
	}
}

// 2. EMBED-ICONS
async function copyEmbedIcons() {
	const folderName = 'embed-icons'
	const extension = '.png'

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, folderName)
	const itemsToCopy = readdirSync(sourceFolderPath).filter((icon) => icon.endsWith(extension))

	for (const publicFolderPath of PUBLIC_FOLDER_PATHS) {
		const destinationFolderPath = join(publicFolderPath, folderName)

		// Delete the folder if it exists
		if (existsSync(destinationFolderPath)) {
			rmSync(destinationFolderPath, { recursive: true })
		}

		// Make the new folder
		mkdirSync(destinationFolderPath, { recursive: true })

		// Copy all items into the new folder
		for (const item of itemsToCopy) {
			await writeFile(join(destinationFolderPath, item), readFileSync(join(sourceFolderPath, item)))
		}
	}

	// add to the asset declaration file
	for (const item of itemsToCopy) {
		const name = item.replace(extension, '')
		collectedAssetUrls.embedIcons[name] = { file: `${folderName}/${item}` }
	}
}

// 3. FONTS
async function copyFonts() {
	const folderName = 'fonts'
	const extension = '.woff2'

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, folderName)
	const itemsToCopy = readdirSync(sourceFolderPath).filter((icon) => icon.endsWith(extension))

	for (const publicFolderPath of PUBLIC_FOLDER_PATHS) {
		const destinationFolderPath = join(publicFolderPath, folderName)

		// Delete the folder if it exists
		if (existsSync(destinationFolderPath)) {
			rmSync(destinationFolderPath, { recursive: true })
		}

		// Make the new folder
		mkdirSync(destinationFolderPath)

		// Copy all items into the new folder
		for (const item of itemsToCopy) {
			await writeFile(join(destinationFolderPath, item), readFileSync(join(sourceFolderPath, item)))
		}
	}

	// add to the asset declaration file
	for (const item of itemsToCopy) {
		const itemWithoutExtension = item.replace(extension, '')
		const name = FONT_MAPPING[itemWithoutExtension]
		if (!name) {
			nicelog('Font mapping not found for', itemWithoutExtension)
			process.exit(1)
		}
		collectedAssetUrls.fonts[name] = { file: `${folderName}/${item}` }
	}
}

// 4. TRANSLATIONS
async function copyTranslations() {
	const folderName = 'translations'
	const extension = '.json'

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, folderName)
	const itemsToCopy = readdirSync(sourceFolderPath).filter((item) => item.endsWith(extension))

	for (const publicFolderPath of PUBLIC_FOLDER_PATHS) {
		const destinationFolderPath = join(publicFolderPath, folderName)

		// Delete the folder if it exists
		if (existsSync(destinationFolderPath)) {
			rmSync(destinationFolderPath, { recursive: true })
		}

		// Make the new folder
		mkdirSync(destinationFolderPath)

		// Copy all items into the new folder
		for (const item of itemsToCopy) {
			await writeFile(join(destinationFolderPath, item), readFileSync(join(sourceFolderPath, item)))
		}
	}

	// Create hardcoded files
	const uiPath = join(
		REPO_ROOT,
		'packages',
		'tldraw',
		'src',
		'lib',
		'ui',
		'hooks',
		'useTranslation'
	)

	// languages.ts

	const languagesSource = await readJsonIfExists(join(sourceFolderPath, 'languages.json'))!
	interface Language {
		label: string
		locale: string
	}
	const languagesFile = `
		/** @public */
		export const LANGUAGES = ${JSON.stringify(
			languagesSource.sort((a: Language, b: Language) => a.label.localeCompare(b.label, 'en'))
		)} as const
	`
	const schemaPath = join(REPO_ROOT, 'packages', 'tlschema', 'src', 'translations')
	const schemaLanguagesFilePath = join(schemaPath, 'languages.ts')
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		schemaLanguagesFilePath,
		languagesFile
	)

	// main.ts

	const defaultTranslation = await readJsonIfExists(join(sourceFolderPath, 'main.json'))!
	const defaultTranslationFilePath = join(uiPath, 'defaultTranslation.ts')
	const defaultTranslationFile = `
		/** @internal */
		export const DEFAULT_TRANSLATION = ${JSON.stringify(defaultTranslation)}
	`
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		defaultTranslationFilePath,
		defaultTranslationFile
	)

	// translationKeys.ts

	const translationKeys = Object.keys(defaultTranslation).map((key) => `'${key}'`)
	const translationKeysFilePath = join(uiPath, 'TLUiTranslationKey.ts')
	const translationKeysFile = `
		/** @public */
		export type TLUiTranslationKey = ${translationKeys.join(' | ')}
	`
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		translationKeysFilePath,
		translationKeysFile
	)

	// add to the asset declaration file
	for (const item of itemsToCopy) {
		const name = item.replace(extension, '')
		collectedAssetUrls.translations[name] = { file: `${folderName}/${item}` }
	}
}

// 5. WATERMARKS
async function copyWatermarks() {
	const folderName = 'watermarks'
	const extension = '.svg'

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, folderName)
	const itemsToCopy = readdirSync(sourceFolderPath).filter((watermark) =>
		watermark.endsWith(extension)
	)

	const optimizedItems = itemsToCopy.map((watermark) => {
		const watermarkPath = join(sourceFolderPath, watermark)
		const content = readFileSync(watermarkPath, 'utf8')
		const svg = optimize(content, { path: watermarkPath })
		return { fileName: watermark, data: svg.data }
	})

	const assetsDestinationPath = join(REPO_ROOT, 'packages', 'assets', folderName)
	if (existsSync(assetsDestinationPath)) {
		rmSync(assetsDestinationPath, { recursive: true })
	}
	mkdirSync(assetsDestinationPath)

	const file = new CodeFile()
	for (const { fileName, data } of optimizedItems) {
		const varName = file.formatName(fileName)
		file.append(`export const ${varName} = ${JSON.stringify(data)};`)
		await writeStringFile(join(assetsDestinationPath, fileName), data)
	}

	const codeDestinationPath = join(REPO_ROOT, 'packages', 'editor', 'src', 'lib', 'watermarks.ts')
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		codeDestinationPath,
		file.toString()
	)
}

// 6. ASSET DECLARATION FILES
async function writeUrlBasedAssetDeclarationFile() {
	const codeFilePath = join(REPO_ROOT, 'packages', 'assets', 'urls.js')
	const codeFile = new CodeFile(`
		// eslint-disable-next-line @typescript-eslint/triple-slash-reference
		/// <reference path="./modules.d.ts" />
		import { formatAssetUrl } from './utils.js'
	`)

	const fn = codeFile.appendFn(`
		/**
		 * @param {AssetUrlOptions} [opts]
		 * @public
		 */
		export function getAssetUrlsByMetaUrl(opts) {
	`)

	fn.append('return {')
	for (const [type, assets] of Object.entries(collectedAssetUrls)) {
		fn.append(`${type}: {`)
		for (const [name, { file, hash }] of Object.entries(assets)) {
			const href = JSON.stringify(`./${file}`)
			const fileUrl = fn.memo(file, `formatAssetUrl(new URL(${href}, import.meta.url).href, opts)`)
			const value = hash ? `${fileUrl} + ${JSON.stringify('#' + hash)}` : fileUrl
			fn.append(`${JSON.stringify(name)}: ${value},`)
		}
		fn.append('},')
	}
	fn.append('}')

	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'javascript',
		codeFilePath,
		codeFile.toString()
	)
}

async function writeImportBasedAssetDeclarationFile(
	importSuffix: string,
	fileName: string
): Promise<void> {
	const codeFile = new CodeFile(`
		// eslint-disable-next-line @typescript-eslint/triple-slash-reference
		/// <reference path="./modules.d.ts" />
		import { formatAssetUrl } from './utils.js'
	`)

	const fn = codeFile.appendFn(`
		/**
		 * @param {AssetUrlOptions} [opts]
		 * @public
		 */
		export function getAssetUrlsByImport(opts) {
	`)

	fn.append('return {')
	for (const [type, assets] of Object.entries(collectedAssetUrls)) {
		fn.append(`${type}: {`)
		for (const [name, { file, hash }] of Object.entries(assets)) {
			const variableName = codeFile.import(`./${file}${importSuffix}`)
			const formattedUrl = fn.memo(file, `formatAssetUrl(${variableName}, opts)`)
			const value = hash ? `${formattedUrl} + ${JSON.stringify('#' + hash)}` : formattedUrl
			fn.append(`${JSON.stringify(name)}: ${value},`)
		}
		fn.append('},')
	}
	fn.append('}')

	const codeFilePath = join(REPO_ROOT, 'packages', 'assets', fileName)
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'javascript',
		codeFilePath,
		codeFile.toString()
	)
}

async function writeSelfHostedAssetDeclarationFile(): Promise<void> {
	const codeFilePath = join(REPO_ROOT, 'packages', 'assets', 'selfHosted.js')
	const codeFile = new CodeFile(`
		// eslint-disable-next-line @typescript-eslint/triple-slash-reference
		/// <reference path="./modules.d.ts" />
		import { formatAssetUrl } from './utils.js'
	`)

	const fn = codeFile.appendFn(`
		/**
		 * @param {AssetUrlOptions} [opts]
		 * @public
		 */
		export function getAssetUrls(opts) {
	`)

	fn.append('return {')
	for (const [type, assets] of Object.entries(collectedAssetUrls)) {
		fn.append(`${type}: {`)
		for (const [name, { file, hash }] of Object.entries(assets)) {
			const href = JSON.stringify(`./${file}`)
			const formattedUrl = fn.memo(file, `formatAssetUrl(${href}, opts)`)
			const value = hash ? `${formattedUrl} + ${JSON.stringify('#' + hash)}` : formattedUrl
			fn.append(`${JSON.stringify(name)}: ${value},`)
		}
		fn.append('},')
	}
	fn.append('}')

	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'javascript',
		codeFilePath,
		codeFile.toString()
	)
}

async function writeAssetDeclarationDTSFile() {
	let dts = `
		export type AssetUrl = string | { src: string }
		export type AssetUrlOptions = { baseUrl?: string } | ((assetUrl: string) => string)
		export type AssetUrls = {
	`

	for (const [type, assets] of Object.entries(collectedAssetUrls)) {
		dts += `${type}: {\n`
		for (const name of Object.keys(assets)) {
			dts += `${JSON.stringify(name)}: string,\n`
		}
		dts += '},\n'
	}

	dts += `
		}
	`

	const assetDeclarationFilePath = join(REPO_ROOT, 'packages', 'assets', 'types.d.ts')
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		assetDeclarationFilePath,
		dts
	)
}

function getNewPublishDates(packageVersion: string) {
	const currentVersion = new SemVer(version)
	const currentPackageVersion = new SemVer(packageVersion)
	const now = new Date().toISOString()
	if (currentPackageVersion.major > currentVersion.major) {
		return {
			major: now,
			minor: now,
			patch: now,
		}
	} else if (currentPackageVersion.minor > currentVersion.minor) {
		return {
			major: publishDates.major,
			minor: now,
			patch: now,
		}
	} else if (currentPackageVersion.patch > currentVersion.patch) {
		return {
			major: publishDates.major,
			minor: publishDates.minor,
			patch: now,
		}
	}
	return publishDates
}

async function createVersionFiles() {
	const packageJson = await readJsonIfExists(join(REPO_ROOT, 'packages', 'tldraw', 'package.json'))
	const packageVersion = packageJson.version
	const publishDates = getNewPublishDates(packageVersion)
	const file = `export const version = '${packageVersion}'
	export const publishDates = {
		major: '${publishDates.major}',
		minor: '${publishDates.minor}',
		patch: '${publishDates.patch}',
	}`

	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'apps', 'docs', 'version.ts'),
		file
	)
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'apps', 'dotcom', 'client', 'version.ts'),
		file
	)
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'packages', 'editor', 'src', 'version.ts'),
		file
	)
	await writeCodeFile(
		'internal/scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'packages', 'tldraw', 'src', 'lib', 'ui', 'version.ts'),
		file
	)
}

class Code {
	protected parts: (string | { toString(): string })[] = []

	toString() {
		return this.parts.map((part) => (typeof part === 'string' ? part : part.toString())).join('')
	}

	append(...parts: string[]): this {
		for (const part of parts) {
			this.parts.push(part + '\n')
		}
		return this
	}
}
class CodeFile extends Code {
	private imports = new Map<string, string>()

	constructor(private header: string = '') {
		super()
	}

	override toString(): string {
		return [
			this.header,
			Array.from(this.imports, ([file, name]) => {
				return `import ${name} from ${JSON.stringify(file)};`
			}).join('\n'),
			super.toString(),
		].join('\n')
	}

	import(file: string) {
		let name = this.imports.get(file)
		if (!name) {
			name = this.getName(file)
			this.imports.set(file, name)
		}
		return name
	}

	formatName(name: string) {
		return `$_${name.replace(/\W+/g, '_')}`
			.replace(/^\$_+(\D)/, (_, s) => s.toLowerCase())
			.replace(/_+(.)/g, (_, s) => s.toUpperCase())
	}

	getName(name: string, suffix?: number): string {
		const formatted = this.formatName(`${name}${suffix ?? ''}`)

		if (this.toString().match(formatted)) {
			return this.getName(name, (suffix ?? 1) + 1)
		}

		return formatted
	}

	appendFn(header: string): CodeFunction {
		const fn = new CodeFunction(this, header)
		this.parts.push(fn)
		return fn
	}
}

class CodeFunction extends Code {
	constructor(
		private file: CodeFile,
		private header: string
	) {
		super()
	}

	private consts = new Map<string, string>()

	override toString(): string {
		let body = super.toString()

		const lines = [this.header]
		for (const [name, expr] of this.consts) {
			const firstFoundIndex = body.indexOf(name)
			const secondFoundIndex = body.indexOf(name, firstFoundIndex + 1)
			if (secondFoundIndex === -1) {
				// only exists once, we don't need to declare it:
				body = body.replace(name, expr)
			} else {
				lines.push(`const ${name} = ${expr};`)
			}
		}

		lines.push(body)
		lines.push('}')
		return lines.join('\n')
	}

	private memos = new Map<unknown, string>()
	memo(key: string, expr: string) {
		const existing = this.memos.get(key)
		if (existing) return existing

		const varName = this.file.getName(key)
		this.consts.set(varName, expr)
		this.memos.set(key, varName)
		return varName
	}
}

// --- RUN
async function main() {
	nicelog('Copying icons...')
	await copyIcons()
	nicelog('Copying dotcom icons...')
	await optimizeAndMergeDotcomIcons()
	nicelog('Copying embed icons...')
	await copyEmbedIcons()
	nicelog('Copying fonts...')
	await copyFonts()
	nicelog('Copying translations...')
	await copyTranslations()
	nicelog('Copying watermarks...')
	await copyWatermarks()
	nicelog('Writing asset declaration file...')
	await writeAssetDeclarationDTSFile()
	await writeUrlBasedAssetDeclarationFile()
	await writeImportBasedAssetDeclarationFile('', 'imports.js')
	await writeImportBasedAssetDeclarationFile('?url', 'imports.vite.js')
	await writeSelfHostedAssetDeclarationFile()
	await createVersionFiles()
	nicelog('Done!')
}

main()
