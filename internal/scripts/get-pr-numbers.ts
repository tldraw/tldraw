import { execSync } from 'child_process'
import { join } from 'path'
import { REPO_ROOT, writeCodeFile } from './lib/file'

const NUMBER_OF_COMMITS = 100
const gitLogOutput = execSync(`git log --oneline --max-count=${NUMBER_OF_COMMITS}`).toString()
const prRegex = /#(\d+)/g

const prNumbers: number[] = []
let match

gitLogOutput.split('\n').forEach((line) => {
	while ((match = prRegex.exec(line)) !== null) {
		prNumbers.push(parseInt(match[1]))
	}
})

const bisectPath = join(REPO_ROOT, 'internal', 'dev-tools', 'src', 'Bisect', 'pr-numbers.ts')

const code = `
	/** @public */
	export const prNumbers = ${JSON.stringify(prNumbers, null, 2)}
`

writeCodeFile('internal/scripts/get-pr-numbers.ts', 'typescript', bisectPath, code)
