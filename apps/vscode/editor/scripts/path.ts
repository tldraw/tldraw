import fs from 'fs'
import path from 'path'

export function getDirname(metaUrl: string, targetPath: string) {
	const dirname = path.dirname(metaUrl.replace('file://', ''))
	return path.normalize(path.join(dirname, targetPath))
}

export async function exists(targetFolder: string) {
	try {
		await fs.promises.access(targetFolder)
		return true
	} catch (err) {
		return false
	}
}
