import { SpawnOptions, spawn } from 'child_process'
import kill from 'tree-kill'

export function promiseSpawn(command: string, args: string[], opts: SpawnOptions) {
	return new Promise<number>((resolve) => {
		const p = spawn(command, args, opts)
		p.on('close', (exitCode) => {
			resolve(exitCode ?? 0)
		})
		process.on('SIGINT', () => {
			if (p.pid) {
				kill(p.pid)
			}
		})
	})
}
