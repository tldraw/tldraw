import { exec } from './lib/exec'
import { nicelog } from './lib/nicelog'
import { getLatestTldrawVersionFromNpm, setAllVersions } from './lib/publishing'

async function main() {
	const latestVersion = await getLatestTldrawVersionFromNpm()
	nicelog('Bumping all package versions to', latestVersion.format())

	await setAllVersions(latestVersion.format(), { stageChanges: true })

	// Commit the changes with [skip ci] to prevent triggering other workflows
	await exec('git', ['commit', '-m', `Bump versions to ${latestVersion.format()} [skip ci]`])

	// Push the changes
	await exec('git', ['push'])

	nicelog('Successfully bumped versions and pushed changes')
}

main().catch((error) => {
	nicelog('Error:', error)
	process.exit(1)
})
