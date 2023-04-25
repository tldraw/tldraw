import { execFile } from 'child_process'

type ExecOpts = {
	pwd?: string
	processStdoutLine?: (line: string) => void
	processStderrLine?: (line: string) => void
}

export async function exec(
	command: string,
	args: (string | null)[],
	{
		pwd = process.cwd(),
		processStdoutLine = (line) => process.stdout.write(`${line}\n`),
		processStderrLine = (line) => process.stderr.write(`${line}\n`),
	}: ExecOpts = {}
): Promise<string> {
	console.log(`> $ ${command} ${args.join(' ')} (in ${pwd}))`)
	return new Promise((resolve, reject) => {
		const data: string[] = []

		const childProcess = execFile(
			command,
			args.filter((arg): arg is string => !!arg),
			{ cwd: pwd },
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
