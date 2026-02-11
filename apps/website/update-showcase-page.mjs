import { createClient } from '@sanity/client'

const client = createClient({
	projectId: 'ij3ytvrl',
	dataset: 'production',
	apiVersion: '2025-01-01',
	useCdn: false,
	token:
		'skHEbHR14tvOyz0mmBU3sL2xrFOrq7svor3dAreDAUtJK4bGnJbaJwc7DLF5Dw0FPUZuhwwyZbnXEuE3FBwFpS4qdRw1uCQHH3UP8gnJmRSNFuX1qjmuJq5mhtZm99EuzWE403iD3Hm3xLqq2RyZ4fVjAW1q0ASb924k1kQJru032uUSv9Hh',
})

async function updateShowcasePage() {
	try {
		const page = await client.fetch('*[_type == "showcasePage"][0]')
		console.log('Current page ID:', page._id)

		// Get all showcase entries for logo bar
		const entries = await client.fetch('*[_type == "showcaseEntry"] | order(order asc)[0...12]')

		const result = await client
			.patch(page._id)
			.set({
				projects: [
					{
						_type: 'object',
						_key: 'makereal',
						name: 'Make Real',
						description:
							'Draw a mockup of a user interface and Make Real brings it to life as working HTML.',
						url: 'https://makereal.tldraw.com',
						linkLabel: 'Try it',
					},
					{
						_type: 'object',
						_key: 'flowchart',
						name: 'Flowchart Maker',
						description:
							'An opinionated flowchart maker built with tldraw. Create professional flowcharts with a simple, focused interface.',
						url: 'https://www.tldraw.com/r/flowchart',
						linkLabel: 'Try it',
					},
					{
						_type: 'object',
						_key: 'wireframes',
						name: 'Wireframe Tool',
						description:
							'Create lo-fi wireframes and mockups quickly. Perfect for early-stage product design and brainstorming.',
						url: 'https://www.tldraw.com',
						linkLabel: 'Try it',
					},
				],
			})
			.commit()

		console.log('Updated showcase page')
	} catch (error) {
		console.error('Error:', error.message)
	}
}

updateShowcasePage()
