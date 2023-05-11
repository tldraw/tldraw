import { promiseSpawn } from './util'

export default async function seleniumGrid() {
	// NOTE: This should work on non-macos, but it's only be tested on macos with M1 chipset
	const command = 'docker'
	let args: string[] = []
	if (process.arch === 'arm64') {
		args = [
			`run`,
			`-t`,
			`--platform`,
			`linux/amd64`,
			`-p`,
			`4444:4444`,
			`-p`,
			`7900:7900`,
			`--shm-size=2g`,
			`seleniarm/standalone-firefox:latest`,
		]
	} else {
		args = [
			'run',
			'-t',
			'-p',
			'4444:4444',
			'-p',
			'7900:7900',
			`--shm-size=2g`,
			`selenium/standalone-firefox:latest`,
		]
	}

	return promiseSpawn(command, args, {
		stdio: [0, 0, 0], // Use parent's [stdin, stdout, stderr]
	})
}
