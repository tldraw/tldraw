/* eslint-disable no-console */
import { spawnSync } from 'child_process'
import { existsSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { buildDotcomDevEnv, getDotcomDevCleanAllTargets, getDotcomDevCleanTargets } from './dev-env'
import { resolveDotcomDevInstance } from './dev-instance'

const env = buildDotcomDevEnv({ instance: resolveDotcomDevInstance({ allocate: false }) })
const targets = getDotcomDevCleanTargets(env)
const allTargets = getDotcomDevCleanAllTargets(env)

function runBestEffort(command: string, args: string[]) {
	const result = spawnSync(command, args, {
		cwd: env.zeroCacheDir,
		stdio: 'inherit',
	})

	if (result.error) {
		console.warn(`Could not run ${command}: ${result.error.message}`)
	}
}

function readCommandLines(command: string, args: string[]) {
	const result = spawnSync(command, args, {
		cwd: env.zeroCacheDir,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})

	if (result.error) {
		console.warn(`Could not run ${command}: ${result.error.message}`)
		return []
	}
	if (result.status !== 0) {
		const detail = result.stderr.trim()
		console.warn(`Could not run ${command} ${args.join(' ')}${detail ? `: ${detail}` : ''}`)
		return []
	}

	return result.stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
}

function removePath(path: string) {
	rmSync(path, { force: true, recursive: true })
	console.log(`Removed ${path}`)
}

function removeMatchingPaths(parentDir: string, shouldRemove: (entry: string) => boolean) {
	if (!existsSync(parentDir)) return
	for (const entry of readdirSync(parentDir)) {
		if (shouldRemove(entry)) {
			removePath(join(parentDir, entry))
		}
	}
}

function isDotcomComposeProject(projectName: string) {
	return (
		projectName.startsWith(allTargets.composeProjectNamePrefix) ||
		allTargets.legacyComposeProjectNames.includes(projectName)
	)
}

function isDotcomPostgresVolume(volumeName: string) {
	return (
		(volumeName.startsWith(allTargets.postgresVolumeNamePrefix) &&
			volumeName.endsWith(allTargets.postgresVolumeNameSuffix)) ||
		allTargets.legacyPostgresVolumeNames.includes(volumeName)
	)
}

function getComposeProjectForContainer(containerId: string) {
	const [projectName] = readCommandLines('docker', [
		'inspect',
		'--format',
		'{{ index .Config.Labels "com.docker.compose.project" }}',
		containerId,
	])
	return projectName ?? ''
}

function cleanCurrent() {
	console.log('Cleaning dotcom dev state...')

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
	removePath(targets.wranglerRegistryDir)

	console.log('')
	console.log('Server-side dotcom dev state is clean.')
	console.log(`Clear browser state at ${env.resetLocalStateUrl}`)
}

function cleanAll() {
	console.log('Cleaning dotcom dev state, including any leftover per-branch state...')

	const dotcomContainerIds = readCommandLines('docker', [
		'ps',
		'-aq',
		'--filter',
		'label=com.docker.compose.project',
	]).filter((containerId) => isDotcomComposeProject(getComposeProjectForContainer(containerId)))
	if (dotcomContainerIds.length) {
		runBestEffort('docker', ['rm', '-f', ...dotcomContainerIds])
	} else {
		console.log('No dotcom dev Docker containers found.')
	}

	for (const volumeName of readCommandLines('docker', ['volume', 'ls', '--format', '{{.Name}}'])) {
		if (isDotcomPostgresVolume(volumeName)) {
			runBestEffort('docker', ['volume', 'rm', '-f', volumeName])
		}
	}

	for (const networkName of readCommandLines('docker', [
		'network',
		'ls',
		'--format',
		'{{.Name}}',
	])) {
		if (
			networkName.startsWith(allTargets.composeProjectNamePrefix) ||
			allTargets.legacyComposeProjectNames.some(
				(projectName) => networkName === `${projectName}_default`
			)
		) {
			runBestEffort('docker', ['network', 'rm', networkName])
		}
	}

	removeMatchingPaths(
		allTargets.zeroReplicaDir,
		(entry) =>
			entry.startsWith(allTargets.zeroReplicaFilePrefix) &&
			(entry.endsWith('.db') || entry.endsWith('.db-shm') || entry.endsWith('.db-wal'))
	)
	removePath(allTargets.schemaFile)
	removeMatchingPaths(
		allTargets.wranglerStateDir,
		(entry) =>
			entry.startsWith(allTargets.wranglerPersistDirPrefix) ||
			entry.startsWith(allTargets.wranglerRegistryDirPrefix)
	)

	console.log('')
	console.log('Server-side dotcom dev state is clean.')
	console.log(`Clear browser state at ${env.resetLocalStateUrl}`)
}

if (process.argv.includes('--all')) {
	cleanAll()
} else {
	cleanCurrent()
}
