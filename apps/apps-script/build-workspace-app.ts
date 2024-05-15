import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { exec } from '../../scripts/lib/exec'
import { readFileIfExists } from '../../scripts/lib/file'

async function build() {
	await exec('rm', ['-rf', 'dist'])
	mkdirSync('dist')

	const indexHtmlPath = './index.html'

	await exec('cp', ['-r', './appsscript.json', 'dist'])
	await exec('cp', ['-r', indexHtmlPath, 'dist'])
	await exec('cp', ['-r', './main.js', 'dist'])

	const isProduction = process.env.IS_PRODUCTION === '1'
	const scriptId = isProduction
		? '1FWcAvz7Rl4iPXQX3KmXm2mNG_RK2kryS7Bja8Y7RHvuAHnic51p_pqe7'
		: '1cJfZM0M_rGU-nYgG-4KR1DnERb7itkCsl1QmlqPxFvHnrz5n6Gfy8iht'
	writeFileSync('./.clasp.json', `{"scriptId":"${scriptId}","rootDir":"./dist"}`)

	let indexHtmlContents = (await readFileIfExists(path.join('dist', indexHtmlPath))) ?? ''
	indexHtmlContents = indexHtmlContents.replace(
		'TLDRAW_IFRAME_URL',
		isProduction ? 'https://www.tldraw.com/tc' : 'https://staging.tldraw.com/tc'
	)
	writeFileSync(path.join('dist', indexHtmlPath), indexHtmlContents)
}

build()
