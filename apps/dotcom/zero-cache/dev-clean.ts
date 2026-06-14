/* eslint-disable no-console */
import { spawnSync } from 'child_process'
import { rmSync } from 'fs'
import { getDotcomDevCleanTargets, getDotcomDevEnv } from './dev-env'

const env = getDotcomDevEnv()
const targets = getDotcomDevCleanTargets(env)

function runBestEffort(command: string, args: string[]) {
	const result = spawnSync(command, args, {
		cwd: env.zeroCacheDir,
		stdio: 'inherit',
	})

	if (result.error) {
		console.warn(`Could not run ${command}: ${result.error.message}`)
	}
}

function removePath(path: string) {
	rmSync(path, { force: true, recursive: true })
	console.log(`Removed ${path}`)
}

console.log(`Cleaning dotcom dev state for branch key "${env.branchKey}"...`)

runBestEffort('docker', [
	'compose',
	'--env-file',
	env.dockerEnvFile,
	'-f',
	env.dockerComposeFile,
	'--project-name',
	targets.composeProjectName,
	'down',
	'--volumes',
	'--remove-orphans',
])
runBestEffort('docker', ['volume', 'rm', '-f', targets.postgresVolumeName])

for (const file of targets.zeroReplicaFiles) {
	removePath(file)
}
removePath(targets.schemaFile)
removePath(targets.wranglerPersistDir)
removePath(targets.legacyWranglerStateDir)

console.log('')
console.log('Server-side dotcom dev state is clean for this branch.')
console.log(`Clear browser state at ${env.resetLocalStateUrl}`)
