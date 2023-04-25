// import { buildDocs } from './build-docs'
import { generateContent } from './generateContent'

async function main() {
	const { log } = console
	log('Creating content for www.')
	// await buildDocs()
	await generateContent()
}

main()
