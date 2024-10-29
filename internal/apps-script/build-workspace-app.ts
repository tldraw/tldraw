import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { exec } from '../../internal/scripts/lib/exec'
import { readFileIfExists } from '../../internal/scripts/lib/file'

async function build() {
	await exec('rm', ['-rf', 'dist'])
	mkdirSync('dist')

	const appsScriptPath = './appsscript.json'

	await exec('cp', ['-r', appsScriptPath, 'dist'])

	const isProduction = process.env.IS_PRODUCTION === '1'
	const scriptId = isProduction
		? '1FWcAvz7Rl4iPXQX3KmXm2mNG_RK2kryS7Bja8Y7RHvuAHnic51p_pqe7'
		: '1cJfZM0M_rGU-nYgG-4KR1DnERb7itkCsl1QmlqPxFvHnrz5n6Gfy8iht'
	writeFileSync('./.clasp.json', `{"scriptId":"${scriptId}","rootDir":"./dist"}`)

	const host = isProduction ? 'https://www.tldraw.com' : 'https://staging.tldraw.com'
	await replaceInFile(appsScriptPath, 'TLDRAW_HOST', host)
}

async function replaceInFile(filename: string, searchValue: string, replaceValue: string) {
	let contents = (await readFileIfExists(path.join('dist', filename))) ?? ''
	contents = contents.replaceAll(searchValue, replaceValue)
	writeFileSync(path.join('dist', filename), contents)
}

build()
