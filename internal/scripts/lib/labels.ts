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
	{ name: `bugfix`, description: `Bug fix`, changelogTitle: '🐛 Bug Fixes' },
	{
		name: `improvement`,
		description: `Product improvement`,
		changelogTitle: '💄 Product Improvements',
	},
	{
		name: `feature`,
		description: `New feature`,
		changelogTitle: '🎉 New Features',
	},
	{
		name: `api`,
		description: `API change`,
		changelogTitle: '🛠️ API Changes',
	},
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
	return `- [ ] \`${label.name}\``
}

export function formatLabelOptionsForPRTemplate() {
	return TYPE_LABELS.map(formatTemplateOption).join('\n')
}

export async function generateAutoRcFile() {
	const autoRcPath = join(REPO_ROOT, '.autorc')
	await writeJsonFile(autoRcPath, {
		plugins: ['npm', '../internal/scripts/lib/auto-plugin.js'],
		labels: [...TYPE_LABELS.filter((l) => l.name !== 'other')].map(({ name, changelogTitle }) => ({
			name,
			changelogTitle,
			releaseType: 'none',
		})),
	})
}
