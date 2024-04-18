import { ReadonlyStatus, lns } from '@tldraw/utils'
import { Environment } from '../types'

export async function getSlug(
	env: Environment,
	slug: string | null,
	readonlyStatus: ReadonlyStatus
) {
	if (!slug) return null
	switch (readonlyStatus) {
		case 'non-readonly':
			return slug
		case 'readonly':
			return await env.READONLY_SLUG_TO_SLUG.get(slug)
		case 'readonly-legacy':
			return lns(slug)
	}
}
