/* eslint-disable no-console */
import { spawnSync } from 'child_process'
import path from 'path'

/**
 * In CI the Playwright `webServer` boots the full dotcom dev stack (`VITE_PREVIEW=1 yarn dev-app`),
 * which process-compose runs as host processes plus the postgres container. Playwright reaps the
 * process-compose process it spawned, but the postgres container is daemon-managed and can survive,
 * so `yarn dev-app:clean` removes the container, its volume, and the rest of the dev state.
 *
 * Gated to CI: locally `reuseExistingServer` means we are sharing the developer's own running stack,
 * which we must not tear down.
 */
async function globalTeardown() {
	if (!process.env.CI) return

	const repoRoot = path.join(__dirname, '../../../../')
	const result = spawnSync('yarn', ['dev-app:clean'], { cwd: repoRoot, stdio: 'inherit' })
	if (result.error) {
		console.warn(`Could not run yarn dev-app:clean: ${result.error.message}`)
	} else if (result.status !== 0) {
		console.warn(
			`yarn dev-app:clean exited with ${result.signal ? `signal ${result.signal}` : `code ${result.status}`}; dev state may have leaked`
		)
	}
}

export default globalTeardown
