import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Readable } from 'stream'

// We are just using the filesystem to store assets
const DIR = './.assets'

export async function storeAsset(id: string, stream: Readable) {
	await mkdir(DIR, { recursive: true })
	await writeFile(join(DIR, id), stream)
}

export async function loadAsset(id: string) {
	return await readFile(join(DIR, id))
}
