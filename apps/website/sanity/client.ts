import { createClient, type SanityClient } from 'next-sanity'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

function createSanityClient(options?: { useCdn?: boolean; token?: string }): SanityClient | null {
	if (!projectId || !dataset) return null
	return createClient({
		projectId,
		dataset,
		apiVersion: '2025-01-01',
		useCdn: options?.useCdn ?? true,
		token: options?.token,
	})
}

export const client = createSanityClient({ useCdn: false })

export const previewClient = createSanityClient({
	useCdn: false,
	token: process.env.SANITY_API_TOKEN,
})
