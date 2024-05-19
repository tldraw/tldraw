import { ROOM_PREFIX, Snapshot } from '@tldraw/dotcom-shared'
import { schema } from '@tldraw/tlsync'
import { Navigate } from 'react-router-dom'
import '../../styles/globals.css'
import { ErrorPage } from '../components/ErrorPage/ErrorPage'
import { defineLoader } from '../utils/defineLoader'
import { isInIframe } from '../utils/iFrame'
import { getNewRoomResponse } from '../utils/sharing'

const { loader, useData } = defineLoader(async (_args) => {
	if (isInIframe()) return null

	const res = await getNewRoomResponse({
		schema: schema.serialize(),
		snapshot: {},
	} satisfies Snapshot)

	const response = (await res.json()) as { error: boolean; slug?: string }
	if (!res.ok || response.error || !response.slug) {
		return null
	}
	return { slug: response.slug }
})

export { loader }

export function Component() {
	const data = useData()
	if (!data)
		return (
			<ErrorPage
				messages={{
					header: 'Page not found',
					para1: 'The page you are looking does not exist or has been moved.',
				}}
			/>
		)
	return <Navigate to={`/${ROOM_PREFIX}/${data.slug}`} />
}
