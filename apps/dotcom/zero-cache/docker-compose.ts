/* eslint-disable no-console */
import { spawn } from 'child_process'
import { assertDockerDaemonRunning, getDotcomDevEnv } from './dev-env'

assertDockerDaemonRunning('docker compose')

const env = getDotcomDevEnv()
const composeCommand = process.argv[2] ?? 'up'
const extraArgs = process.argv.slice(3)

console.log(`Docker compose project: ${env.composeProjectName}`)

const child = spawn(
	'docker',
	[
		'compose',
		'--env-file',
		env.dockerEnvFile,
		'-f',
		env.dockerComposeFile,
		'--project-name',
		env.composeProjectName,
		composeCommand,
		...extraArgs,
	],
	{
		cwd: env.zeroCacheDir,
		stdio: 'inherit',
	}
)

child.once('exit', (code) => process.exit(code ?? 1))
child.once('error', (error) => {
	console.error(error)
	process.exit(1)
})
