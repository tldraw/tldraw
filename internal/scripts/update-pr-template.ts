import { Octokit } from '@octokit/rest'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './lib/file'
import { formatLabelOptionsForPRTemplate, getLabelNames } from './lib/labels'

const prTemplatePath = join(REPO_ROOT, '.github', 'pull_request_template.md')

const octo = process.env.GH_TOKEN ? new Octokit({ auth: process.env.GH_TOKEN }) : new Octokit()

async function updatePRTemplate(check: boolean) {
	if (!existsSync(prTemplatePath)) {
		console.error('❌ Could not find PR template at', prTemplatePath)
		process.exit(1)
	}

	const prTemplate = readFileSync(prTemplatePath).toString()
	const labelsPart = prTemplate.match(/(### Change type(.|\s)*?\n)###/)?.[1]
	if (!labelsPart) {
		console.error(
			'❌ Could not find the labels section of the pull request template! It should start with "### Change type"'
		)
		process.exit(1)
	}
	const updated = prTemplate.replace(
		labelsPart,
		`### Change type\n\n${formatLabelOptionsForPRTemplate()}\n\n`
	)
	if (check && updated !== prTemplate) {
		console.error(
			'❌ PR template labels section is out of date. Run `yarn update-pr-template` to fix it.'
		)
		console.error(
			'💡 Were you trying to change the labels section manually? Update internal/scripts/lib/labels.ts instead.'
		)
		process.exit(1)
	}

	// make sure all labels exist
	const repoLabels = new Set(
		(
			await octo.issues.listLabelsForRepo({
				owner: 'tldraw',
				repo: 'tldraw',
				per_page: 100,
			})
		).data.map((x) => x.name)
	)

	const missingLabels = getLabelNames().filter((x) => !repoLabels.has(x))
	if (missingLabels.length > 0) {
		console.error(
			'❌ The following labels do not exist in the tldraw repo:',
			missingLabels.map((l) => JSON.stringify(l)).join(', ')
		)
		console.error(
			`Add them yourself or update internal/scripts/lib/labels.ts and re-run \`yarn update-pr-template\` to remove them.`
		)
		process.exit(1)
	}

	if (!check) {
		console.log('Writing template to', prTemplatePath)
		writeFileSync(prTemplatePath, updated)
	} else {
		console.log('All good!')
	}
}

updatePRTemplate(process.argv.includes('--check'))
