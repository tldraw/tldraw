// import { buildDocs } from './build-docs'
import { generateContent } from './generateContent'

async function main() {
	const { log: nicelog } = console
	nicelog('Creating content for www.')
	await generateContent()
}

main()
