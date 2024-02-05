import { exec as execute } from 'child_process'
import { nicelog } from './nicelog'

type ExecOpts = {
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
		const childProcess = execute(
			`${command} ${args.filter((arg): arg is string => !!arg).join(' ')}`,
			{ cwd: pwd, env: { ...process.env, ...env } },
			(err, stdout, stderr) => {
				if (err) {
					reject(err)
				} else {
					const combinedOutput = `${stdout}${stderr}`
					resolve(combinedOutput.trim())
				}
			}
		)

		if (childProcess.stdout) {
			childProcess.stdout.on('data', (data) => {
				processStdoutLine(data)
			})
		}

		if (childProcess.stderr) {
			childProcess.stderr.on('data', (data) => {
				processStderrLine(data)
			})
		}
	})
}
