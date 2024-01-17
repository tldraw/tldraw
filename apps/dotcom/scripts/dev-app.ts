import { writeFileSync } from 'fs'
import { exec } from '../../../scripts/lib/exec'
import { readFileIfExists } from '../../../scripts/lib/file'
import { nicelog } from '../../../scripts/lib/nicelog'

async function main() {
	await writeEnvFileVars('../dotcom-worker/.dev.vars', {
		APP_ORIGIN: 'http://localhost:3000',
	})
	if (process.env.VITE_PREVIEW === '1') {
		await exec('vite', ['preview', '--host', '--port', '3000'])
	} else {
		await exec('vite', ['dev', '--host', '--port', '3000'])
	}
}

async function writeEnvFileVars(filePath: string, vars: Record<string, string>) {
	nicelog(`Writing env vars to ${filePath}: ${Object.keys(vars).join(', ')}`)
	let envFileContents = (await readFileIfExists(filePath)) ?? ''

	const KEYS_TO_SKIP: string[] = []

	for (const key of Object.keys(vars)) {
		envFileContents = envFileContents.replace(new RegExp(`(\n|^)${key}=.*(?:\n|$)`), '$1')
	}

	if (envFileContents && !envFileContents.endsWith('\n')) envFileContents += '\n'

	for (const [key, value] of Object.entries(vars)) {
		if (KEYS_TO_SKIP.includes(key)) {
			continue
		}
		envFileContents += `${key}=${value}\n`
	}

	writeFileSync(filePath, envFileContents)

	nicelog(`Wrote env vars to ${filePath}`)
}

main()
