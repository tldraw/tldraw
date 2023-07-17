import fs from 'fs'
import fse from 'fs-extra'
import { join } from 'path'
import { exists, getDirname } from './path'

const vscodeDir = getDirname(import.meta.url, '../../')

export async function copyEditor({ log }: { log: (opts: any) => void }) {
	const editorRoot = join(vscodeDir, 'editor')
	const extensionRoot = join(vscodeDir, 'extension')

	const source = join(editorRoot, 'dist')
	const dest = join(extensionRoot, 'editor')

	log({ cmd: 'copy', args: { source, dest } })
	await fse.copy(source, dest)
}

export async function removeDistDirectory({ log }: { log: (opts: any) => void }) {
	const target = join(vscodeDir, 'extension', 'dist')
	if (await exists(target)) {
		log({ cmd: 'remove', args: { target } })
		await fs.promises.rm(target, { recursive: true })
	}
}
