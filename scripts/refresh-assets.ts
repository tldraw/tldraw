import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { optimize } from 'svgo'
import {
	BUBLIC_ROOT,
	readJsonIfExists,
	writeFile,
	writeJsonFile,
	writeStringFile,
	writeTypescriptFile,
} from './lib/file'

// We'll need to copy the assets into these folders
const PUBLIC_FOLDER_PATHS = [
	join(BUBLIC_ROOT, 'packages', 'assets'),
	join(BUBLIC_ROOT, 'apps', 'examples', 'www'),
]

const FONT_MAPPING: Record<string, string> = {
	'IBMPlexMono-Medium': 'monospace',
	'IBMPlexSerif-Medium': 'serif',
	'IBMPlexSans-Medium': 'sansSerif',
	'Shantell_Sans-Normal-SemiBold': 'draw',
}

const ASSETS_FOLDER_PATH = join(BUBLIC_ROOT, 'assets')

const collectedAssetUrls: {
	imports: { name: string; from: string }[]
	assets: {
		fonts: Record<string, string>
		icons: Record<string, string>
		translations: Record<string, string>
		embedIcons: Record<string, string>
	}
} = {
	imports: [],
	assets: { fonts: {}, icons: {}, translations: {}, embedIcons: {} },
}

// 1. ICONS

async function copyIcons() {
	// Get a list of all icons
	const icons = readdirSync(join(ASSETS_FOLDER_PATH, 'icons', 'icon')).filter((icon) =>
		icon.endsWith('.svg')
	)

	// Write list of names into icon-names.json (just the name, not extension)
	const iconNames = icons.map((name) => name.replace('.svg', ''))

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, 'icons', 'icon')

	// Create the optimized SVGs
	const optimizedSvgs = icons.map((icon) => {
		const iconPath = join(sourceFolderPath, icon)
		const content = readFileSync(iconPath, 'utf8')
		const svg = optimize(content, { path: iconPath })
		return { fileName: icon, data: svg.data }
	})

	// Optimize all of the svg icons and write them into the new folders
	for (const folderPath of PUBLIC_FOLDER_PATHS) {
		const publicIconsRootFolderPath = join(folderPath, 'icons')
		const pulicIconsFolderPath = join(publicIconsRootFolderPath, 'icon')

		if (existsSync(publicIconsRootFolderPath)) {
			rmSync(publicIconsRootFolderPath, { recursive: true })
		}

		// Create the folders
		mkdirSync(publicIconsRootFolderPath, { recursive: true })
		mkdirSync(pulicIconsFolderPath, { recursive: true })

		// Copy each optimized icons into the new folder
		for (const { fileName, data } of optimizedSvgs) {
			await writeStringFile(join(pulicIconsFolderPath, fileName), data)
		}

		// Write the JSON file containing all of the names of the icons
		await writeJsonFile(join(pulicIconsFolderPath, 'icon-names.json'), iconNames)
	}

	// Get the names of all of the svg icons and create a TypeScript file of valid icon names
	const iconTypeFile = `
		/** @public */
		export type TLUiIconType = 
			${icons.map((icon) => JSON.stringify(icon.replace('.svg', ''))).join(' | ')}

		/** @public */
		export const TLUiIconTypes = [
			${icons.map((icon) => JSON.stringify(icon.replace('.svg', ''))).join(', ')}
		] as const`

	await writeTypescriptFile(
		join(BUBLIC_ROOT, 'packages', 'ui', 'src', 'lib', 'icon-types.ts'),
		iconTypeFile
	)

	// add to the asset declaration file
	for (const icon of icons) {
		const name = icon.replace('.svg', '')
		const variableName = camelCase(`${name}IconUrl`)
		collectedAssetUrls.imports.push({
			name: variableName,
			from: `icons/icon/${icon}`,
		})
		collectedAssetUrls.assets.icons[name] = variableName
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
		const variableName = camelCase(`${name}EmbedIconUrl`)
		collectedAssetUrls.imports.push({
			name: variableName,
			from: `${folderName}/${item}`,
		})
		collectedAssetUrls.assets.embedIcons[name] = variableName
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
			console.log('Font mapping not found for', itemWithoutExtension)
			process.exit(1)
		}
		const variableName = camelCase(`${name}FontUrl`)
		collectedAssetUrls.imports.push({
			name: variableName,
			from: `${folderName}/${item}`,
		})
		collectedAssetUrls.assets.fonts[name] = variableName
	}
}

// 3. TRANSLATIONS

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
	const uiPath = join(BUBLIC_ROOT, 'packages', 'ui', 'src', 'lib', 'hooks', 'useTranslation')

	// languages.ts
	const languagesSource = await readJsonIfExists(join(sourceFolderPath, 'languages.json'))!
	const languagesFilePath = join(uiPath, 'languages.ts')
	const languagesFile = `
		/** @public */
		export const LANGUAGES = ${JSON.stringify(languagesSource)} as const
	`
	await writeTypescriptFile(languagesFilePath, languagesFile)

	const schemaPath = join(BUBLIC_ROOT, 'packages', 'tlschema', 'src')
	const schemaLanguagesFilePath = join(schemaPath, 'languages.ts')
	await writeTypescriptFile(schemaLanguagesFilePath, languagesFile)

	// main.ts

	const defaultTranslation = await readJsonIfExists(join(sourceFolderPath, 'main.json'))!
	const defaultTranslationFilePath = join(uiPath, 'defaultTranslation.ts')
	const defaultTranslationFile = `
		/** @internal */
		export const DEFAULT_TRANSLATION = ${JSON.stringify(defaultTranslation)}
	`
	await writeTypescriptFile(defaultTranslationFilePath, defaultTranslationFile)

	// translationKeys.ts

	const translationKeys = Object.keys(defaultTranslation).map((key) => `'${key}'`)
	const translationKeysFilePath = join(uiPath, 'TLTranslationKey.ts')
	const translationKeysFile = `
		/** @public */
		export type TLTranslationKey = ${translationKeys.join(' | ')}
	`
	await writeTypescriptFile(translationKeysFilePath, translationKeysFile)

	// add to the asset declaration file
	for (const item of itemsToCopy) {
		const name = item.replace(extension, '')
		const variableName = camelCase(`${name}TranslationUrl`)
		collectedAssetUrls.imports.push({
			name: variableName,
			from: `${folderName}/${item}`,
		})
		collectedAssetUrls.assets.translations[name] = variableName
	}
}

// 4. ASSET DECLARATION FILE
async function writeAssetDeclarationFile() {
	const assetDeclarationFilePath = join(BUBLIC_ROOT, 'packages', 'assets', 'src', 'index.ts')
	let assetDeclarationFile = `
		// eslint-disable-next-line @typescript-eslint/triple-slash-reference
		/// <reference path="../modules.d.ts" />
		import {formatAssetUrl, AssetUrlOptions} from './utils';
	`

	for (const { name, from } of collectedAssetUrls.imports) {
		assetDeclarationFile += `import ${name} from '../${from}';\n`
	}

	assetDeclarationFile += `
		/** @public */
		export function getBundlerAssetUrls(opts?: AssetUrlOptions) {
			return {
				${Object.entries(collectedAssetUrls.assets)
					.flatMap(([type, assets]) => [
						`${type}: {`,
						...Object.entries(assets).map(
							([name, variableName]) =>
								`${JSON.stringify(name)}: formatAssetUrl(${variableName}, opts),`
						),
						'},',
					])
					.join('\n')}
			} as const
		}
	`

	await writeTypescriptFile(assetDeclarationFilePath, assetDeclarationFile)
}

function camelCase(name: string) {
	return name.replace(/[_-]([a-z0-9])/gi, (g) => g[1].toUpperCase())
}

// --- RUN
async function main() {
	console.log('Copying icons...')
	await copyIcons()
	console.log('Copying embed icons...')
	await copyEmbedIcons()
	console.log('Copying fonts...')
	await copyFonts()
	console.log('Copying translations...')
	await copyTranslations()
	console.log('Writing asset declaration file...')
	await writeAssetDeclarationFile()
	console.log('Done!')
}

main()
