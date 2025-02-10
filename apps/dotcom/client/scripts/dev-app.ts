import { exec } from '../../../../internal/scripts/lib/exec'

async function main() {
	if (process.env.VITE_PREVIEW === '1') {
		await exec('vite', ['preview', '--host', '--port', '3000'])
	} else {
		await exec('vite', ['dev', '--host', '--port', '3000'])
	}
}

main()
