import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { APP_ID } from '../../TLAppDurableObject'
import { Environment } from '../../types'

export async function getTldrawAppFileRecord(
	slug: string,
	env: Environment
): Promise<TldrawAppFile | null> {
	const d1Result = await env.DB.prepare('select * from records where topicId = ?1 and id = ?2')
		.bind(APP_ID, `file:${slug}`)
		.first()
	if (!d1Result) return null
	return JSON.parse((d1Result as any).record)
}
