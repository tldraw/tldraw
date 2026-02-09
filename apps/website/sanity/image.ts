import { createImageUrlBuilder } from '@sanity/image-url'
import { client } from './client'

const builder = client ? createImageUrlBuilder(client) : null

export function urlFor(source: { asset: { _ref: string } }) {
	if (!builder) throw new Error('Sanity client is not configured')
	return builder.image(source)
}
