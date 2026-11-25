import { execFileSync } from 'child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { nicelog } from '../../../../internal/scripts/lib/nicelog'

// Splits a starter pack, written as one LibraryPack JSON file with its items' content and data-URL
// thumbnails inline, into the files the client loads separately:
//
//   starterPackData/<pack id>/index.json              the pack and its items, without content
//   starterPackData/<pack id>/content/<item id>.json  each item's content
//   starterPackData/<pack id>/thumbnails/<item id>-light.webp, -dark.webp (or <item id>.webp)
//
// The WebPs are written without their colour profile, EXIF or XMP chunks: the image data is kept
// as it is, and a browser shows an image without a profile as sRGB.
//
// Replaces the pack's folder. Then run starterPacks.test.ts with `-u` to regenerate the manifest.
//
//   pnpm exec tsx scripts/split-starter-pack.ts path/to/pack.json [...]

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url))
const PACKS_DIR = join(SCRIPTS_DIR, '../src/tla/components/TlaLibraries/starterPackData')
const REPO_ROOT = join(SCRIPTS_DIR, '../../../..')

type Thumbnail = string | { light: string; dark: string }

interface PackItem {
	id: string
	name?: string
	content: unknown
	thumbnail?: Thumbnail
	meta?: unknown
}

interface Pack {
	id: string
	name: string
	version: number
	items: PackItem[]
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/

function writeJson(path: string, value: unknown) {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, JSON.stringify(value, null, '\t') + '\n')
}

// The VP8X chunk's flags for an ICC profile, EXIF and XMP metadata.
const VP8X_METADATA_FLAGS = 0x20 | 0x08 | 0x04
const METADATA_CHUNKS = new Set(['ICCP', 'EXIF', 'XMP '])

/** A WebP without its ICCP, EXIF and XMP chunks, its VP8X flags and RIFF size to match. */
function stripWebpMetadata(webp: Buffer): Buffer {
	if (webp.toString('ascii', 0, 4) !== 'RIFF' || webp.toString('ascii', 8, 12) !== 'WEBP') {
		throw new Error('Not a WebP')
	}
	const chunks: Buffer[] = []
	for (let offset = 12; offset < webp.length; ) {
		const fourCC = webp.toString('ascii', offset, offset + 4)
		const size = webp.readUInt32LE(offset + 4)
		const end = offset + 8 + size + (size & 1)
		if (end > webp.length) throw new Error(`Truncated ${fourCC} chunk`)
		if (!METADATA_CHUNKS.has(fourCC)) {
			const chunk = Buffer.from(webp.subarray(offset, end))
			if (fourCC === 'VP8X') chunk[8] &= ~VP8X_METADATA_FLAGS
			chunks.push(chunk)
		}
		offset = end
	}
	const body = Buffer.concat(chunks)
	const header = Buffer.alloc(12)
	header.write('RIFF', 0, 'ascii')
	header.writeUInt32LE(4 + body.length, 4)
	header.write('WEBP', 8, 'ascii')
	return Buffer.concat([header, body])
}

function writeImage(packDir: string, fileName: string, dataUrl: string) {
	const match = /^data:image\/webp;base64,(.+)$/.exec(dataUrl)
	if (!match) throw new Error(`${fileName}: expected a WebP data URL`)
	const path = join(packDir, 'thumbnails', fileName)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, stripWebpMetadata(Buffer.from(match[1], 'base64')))
	return `thumbnails/${fileName}`
}

function splitPack(pack: Pack) {
	if (!SAFE_ID.test(pack.id)) throw new Error(`Pack id ${pack.id} can't name a folder`)
	const packDir = join(PACKS_DIR, pack.id)
	rmSync(packDir, { recursive: true, force: true })
	const items = pack.items.map(({ id, name, content, thumbnail, meta }) => {
		if (!SAFE_ID.test(id)) throw new Error(`Item id ${id} in ${pack.id} can't name a file`)
		writeJson(join(packDir, 'content', `${id}.json`), content)
		const thumbnailFiles =
			thumbnail === undefined
				? undefined
				: typeof thumbnail === 'string'
					? writeImage(packDir, `${id}.webp`, thumbnail)
					: {
							light: writeImage(packDir, `${id}-light.webp`, thumbnail.light),
							dark: writeImage(packDir, `${id}-dark.webp`, thumbnail.dark),
						}
		return {
			id,
			...(name === undefined ? {} : { name }),
			...(thumbnailFiles === undefined ? {} : { thumbnail: thumbnailFiles }),
			...(meta === undefined ? {} : { meta }),
		}
	})
	writeJson(join(packDir, 'index.json'), {
		id: pack.id,
		name: pack.name,
		version: pack.version,
		items,
	})
	return `${pack.id}: ${items.length} items`
}

const packIds = process.argv.slice(2).map((path) => {
	const pack = JSON.parse(readFileSync(path, 'utf8')) as Pack
	nicelog(splitPack(pack))
	return pack.id
})
// Formatted as the repo formats JSON, so regenerating an unchanged pack changes nothing.
execFileSync('pnpm', ['exec', 'oxfmt', ...packIds.map((id) => join(PACKS_DIR, id))], {
	cwd: REPO_ROOT,
	stdio: 'inherit',
})
