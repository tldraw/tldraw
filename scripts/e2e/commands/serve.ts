import { promiseSpawn } from './util'

export default async function serve() {
	return promiseSpawn('yarn', ['dev-webdriver'], {
		stdio: [0, 0, 0],
		env: { ...process.env },
	})
}
