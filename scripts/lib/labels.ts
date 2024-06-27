import { join } from 'path'
import { REPO_ROOT, writeJsonFile } from './file'

interface Label {
	// this is what the label is 'called' on github
	name: string
	// this is how we describe the label in our pull request template
	description: string
	// this is the section title for the label in our changelogs
	changelogTitle: string
}

const TYPE_LABELS = [
	{
		name: `feature`,
		description: `New feature`,
		changelogTitle: '🎉 New Features',
	},
	{
		name: `improvement`,
		description: `Product improvement`,
		changelogTitle: '💄 Product Improvements',
	},
	{
		name: `api`,
		description: `API change`,
		changelogTitle: '🛠️ API Changes',
	},
	{ name: `bugfix`, description: `Bug fix`, changelogTitle: '🐛 Bug Fixes' },
	{
		name: `other`,
		description: `Changes that don't affect SDK users, e.g. internal or .com changes`,
		changelogTitle: '🤷 Other',
	},
] as const satisfies Label[]

export function getLabelNames() {
	return [...TYPE_LABELS].map((label) => label.name)
}

function formatTemplateOption(label: Label) {
	return `- [ ] \`${label.name}\` — ${label.description}`
}

export function formatLabelOptionsForPRTemplate() {
	let result = `\n<!-- ❗ Please select a 'Type' label ❗️ -->\n\n`
	for (const label of TYPE_LABELS) {
		result += formatTemplateOption(label) + '\n'
	}
	return result
}

export async function generateAutoRcFile() {
	const autoRcPath = join(REPO_ROOT, '.autorc')
	await writeJsonFile(autoRcPath, {
		plugins: ['npm', '../scripts/lib/auto-plugin.js'],
		labels: [...TYPE_LABELS.filter((l) => l.name !== 'other')].map(({ name, changelogTitle }) => ({
			name,
			changelogTitle,
			releaseType: 'none',
		})),
	})
}
