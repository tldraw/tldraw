import { createClient } from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'ij3ytvrl'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

console.log('Project ID:', projectId)
console.log('Dataset:', dataset)

const client = createClient({
	projectId,
	dataset,
	apiVersion: '2025-01-01',
	useCdn: false,
})

async function test() {
	try {
		const entries = await client.fetch('*[_type == "showcaseEntry"] | order(order asc)')
		console.log('Showcase entries:', entries.length)
		if (entries.length > 0) {
			console.log('First entry:', entries[0].name)
		}

		const page = await client.fetch('*[_type == "showcasePage"][0]')
		console.log('Showcase page:', page?.heroTitle || 'NOT FOUND')
	} catch (error) {
		console.error('Error:', error.message)
	}
}

test()
