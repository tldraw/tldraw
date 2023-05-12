import { ChildProcess, spawn } from 'node:child_process'
import kill from 'tree-kill'
import { exec } from '../../lib/exec'
import { promiseSpawn } from './util'

export default async function testCi({ testEnv }: { testEnv: string }) {
	await promiseSpawn('yarn', ['workspace', '@tldraw/tldraw', 'prebuild'], {
		env: {
			...process.env,
		},
		stdio: [0, 0, 0], // Use parent's [stdin, stdout, stderr]
	})

	const { success: foundStartMessage, commandProcess } = await new Promise<{
		success: boolean
		commandProcess: ChildProcess
	}>((resolve, reject) => {
		const p = spawn('yarn', ['dev-webdriver'], {
			env: {
				...process.env,
				ENABLE_SSL: '1',
				ENABLE_NETWORK_CACHING: '1',
			},
		})

		const endHandler = () => {
			p.stdout.off('end', endHandler)
			reject({ success: false, commandProcess: p })
		}

		const dataHandler = (data: any) => {
			if (data.toString().match(/\[tldraw:process_ready\]/gm)) {
				// p.stdout.off('data', dataHandler)
				resolve({ success: true, commandProcess: p })
			}
			console.log(`stdout: ${data}`)
		}
		p.stdout.on('data', dataHandler)
		p.stdout.on('close', endHandler)
	})

	console.log('>>> STEP 1')
	if (!foundStartMessage) {
		console.error('Failed to start server')
		process.exit(1)
	}

	const cmdArgs = ['workspace', '@tldraw/e2e', `test:${testEnv}`]
	console.log('>>> STEP 2', cmdArgs)
	const exitCode = await exec('yarn', cmdArgs, {
		env: {
			...process.env,
			BROWSERS: ['chrome'].join(','),
			// OS: [process.platform].join(','),
		},
	})

	console.log('>>> STEP 3')
	if (commandProcess.pid) {
		kill(commandProcess.pid)
	}

	return exitCode
}
