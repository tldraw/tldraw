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

const SCOPE_LABELS = [
	{
		name: `sdk`,
		description: `Changes the tldraw SDK`,
		changelogTitle: '📚 SDK Changes',
	},
	{
		name: `dotcom`,
		description: `Changes the tldraw.com web app`,
		changelogTitle: '🖥️ tldraw.com Changes',
	},
	{
		name: `docs`,
		description: `Changes to the documentation, examples, or templates.`,
		changelogTitle: '📖 Documentation changes',
	},
	{
		name: `vs code`,
		description: `Changes to the vscode plugin`,
		changelogTitle: '👩‍💻 VS Code Plugin Changes',
	},
	{
		name: `internal`,
		description: `Does not affect user-facing stuff`,
		changelogTitle: '🕵️‍♀️ Internal Changes',
	},
] as const satisfies Label[]

const TYPE_LABELS = [
	{ name: `bugfix`, description: `Bug fix`, changelogTitle: '🐛 Bug Fixes' },
	{ name: `feature`, description: `New feature`, changelogTitle: '🚀 Features' },
	{
		name: `improvement`,
		description: `Improving existing features`,
		changelogTitle: '💄 Improvements',
	},
	{
		name: `chore`,
		description: `Updating dependencies, other boring stuff`,
		changelogTitle: '🧹 Chores',
	},
	{
		name: `galaxy brain`,
		description: `Architectural changes`,
		changelogTitle: '🤯 Architectural changes',
	},
	{ name: `tests`, description: `Changes to any test code`, changelogTitle: '🧪 Tests' },
	{
		name: `tools`,
		description: `Changes to infrastructure, CI, internal scripts, debugging tools, etc.`,
		changelogTitle: '🛠️ Tools',
	},
	{ name: `dunno`, description: `I don't know`, changelogTitle: '🤷 Dunno' },
] as const satisfies Label[]

export function getLabelNames() {
	return [...SCOPE_LABELS, ...TYPE_LABELS].map((label) => label.name)
}

function formatTemplateOption(label: Label) {
	return `- [ ] \`${label.name}\` — ${label.description}`
}

export function formatLabelOptionsForPRTemplate() {
	let result = `<!-- ❗ Please select a 'Scope' label ❗️ -->\n\n`
	for (const label of SCOPE_LABELS) {
		result += formatTemplateOption(label) + '\n'
	}
	result += `\n<!-- ❗ Please select a 'Type' label ❗️ -->\n\n`
	for (const label of TYPE_LABELS) {
		result += formatTemplateOption(label) + '\n'
	}
	return result
}

export async function generateAutoRcFile() {
	const autoRcPath = join(REPO_ROOT, '.autorc')
	await writeJsonFile(autoRcPath, {
		plugins: ['npm'],
		labels: [...SCOPE_LABELS, ...TYPE_LABELS].map(({ name, changelogTitle }) => ({
			name,
			changelogTitle,
			releaseType: 'none',
		})),
	})
}
