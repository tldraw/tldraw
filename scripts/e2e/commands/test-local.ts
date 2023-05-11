import { promiseSpawn } from './util'

export default async function testLocal({ os, browser }: { os: string; browser: string[] }) {
	const command = `yarn`
	const args = [`workspace`, `@tldraw/e2e`, `test:local`]
	return promiseSpawn(command, args, {
		env: {
			...process.env,
			BROWSERS: browser.join(','),
			OS: os,
		},
		stdio: [0, 0, 0], // Use parent's [stdin, stdout, stderr]
	})
}
