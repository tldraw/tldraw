import { execFile } from 'child_process'
import { nicelog } from './nicelog'

interface ExecOpts {
	pwd?: string
	processStdoutLine?: (line: string) => void
	processStderrLine?: (line: string) => void
	env?: Partial<NodeJS.ProcessEnv>
}

export function prefixOutput(prefix: string) {
	return {
		processStdoutLine: (line: string) => process.stdout.write(`${prefix}${line}\n`),
		processStderrLine: (line: string) => process.stderr.write(`${prefix}${line}\n`),
	}
}

export async function exec(
	command: string,
	args: (string | null)[],
	{
		pwd = process.cwd(),
		processStdoutLine = (line) => process.stdout.write(`${line}\n`),
		processStderrLine = (line) => process.stderr.write(`${line}\n`),
		env,
	}: ExecOpts = {}
): Promise<string> {
	nicelog(`> $ ${command} ${args.join(' ')} (in ${pwd}))`)
	return new Promise((resolve, reject) => {
		const data: string[] = []

		const childProcess = execFile(
			command,
			args.filter((arg): arg is string => !!arg),
			{ cwd: pwd, env: { ...process.env, ...env } },
			(err) => {
				if (err) reject(err)
				else resolve(data.join(''))
			}
		)

		let pendingStdoutLine = ''
		childProcess.stdout!.on('data', (chunk) => {
			const chunkString: string = chunk.toString('utf-8')
			data.push(chunkString)

			const lines = chunkString.split('\n')
			lines[0] = pendingStdoutLine + lines[0]
			pendingStdoutLine = lines.pop() ?? ''

			for (const line of lines) {
				processStdoutLine(line)
			}
		})
		childProcess.stdout!.on('close', () => {
			processStdoutLine(pendingStdoutLine)
		})

		let pendingStderrLine = ''
		childProcess.stderr!.on('data', (chunk) => {
			const chunkString: string = chunk.toString('utf-8')
			data.push(chunkString)

			const lines = chunkString.split('\n')
			lines[0] = pendingStderrLine + lines[0]
			pendingStderrLine = lines.pop() ?? ''

			for (const line of lines) {
				processStderrLine(line)
			}
		})
		childProcess.stderr!.on('close', () => {
			processStderrLine(pendingStderrLine)
		})
	})
}
