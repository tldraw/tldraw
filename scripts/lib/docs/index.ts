// import { buildDocs } from './build-docs'
import { generateApiContent } from './generateApiContent'
import { generateContent } from './generateContent'

async function main() {
	const { log: nicelog } = console
	nicelog('Creating content for www.')
	// await buildDocs()
	await generateApiContent()
	await generateContent()
}

main()
