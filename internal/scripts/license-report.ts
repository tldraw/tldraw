// For all package.jsons found in the monorepo, generate a license report
// by running the `license-report --output=html` script in each package.

import { writeFileSync } from 'fs'
import { exec } from './lib/exec'
import { getAllWorkspacePackages } from './lib/workspace'

async function main() {
	const devOnly = process.argv.includes('--dev')
	const prodOnly = process.argv.includes('--prod')

	const htmlTables: { title: string; content: string }[] = []

	const packages = await getAllWorkspacePackages()

	for (const pkg of packages) {
		const location = pkg.path
		try {
			console.log('running license-report in', location)
			const report = await exec('pnpm', [
				'license-report',
				`--package=${location}/package.json`,
				'--department.value=tldraw',
				'--relatedTo.label=Package',
				`--relatedTo.value=${location}`,
				'--output=html',
				`--only=${devOnly ? 'dev' : prodOnly ? 'prod' : 'dev,prod,peer,opt'}`,
			])
			// Extract the <table> contents from the report
			const table = report.match(/<tbody>.*<\/tbody>/gs)
			if (!table) {
				console.error('Error extracting table from license-report result.')
				process.exit(1)
			}
			htmlTables.push({ title: location, content: table[0] })
		} catch (e) {
			console.error(`Error running license-report in ${location}, ${e}`)
		}
	}

	const html = `
<html>
<body>
<table><thead><tr><th class="string">department</th><th class="string">related to</th><th class="string">name</th><th class="string">license period</th><th class="string">material / not material</th><th class="string">license type</th><th class="string">link</th><th class="string">remote version</th><th class="string">installed version</th><th class="string">defined version</th><th class="string">author</th></tr></thead><tbody>
${htmlTables.reduce((acc, { content }) => {
	acc += content + '<tr></tr>'
	return acc
}, '')}
</tbody></table>
</body>
</html>
`

	writeFileSync(
		prodOnly
			? 'license-report-prod.html'
			: devOnly
				? 'license-report-dev.html'
				: 'license-report.html',
		html
	)
}

main()
