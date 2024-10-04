import { ROOM_PREFIX, Snapshot } from '@tldraw/dotcom-shared'
import { Navigate } from 'react-router-dom'
import { createTLSchema } from 'tldraw'
import '../../styles/globals.css'
import { ErrorPage } from '../components/ErrorPage/ErrorPage'
import { defineLoader } from '../utils/defineLoader'
import { isInIframe } from '../utils/iFrame'
import { getNewRoomResponse } from '../utils/sharing'

const schema = createTLSchema()

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

// Using this directly in Navigate caused a "Maximum update depth exceeded" error in dev
const state = {
	shouldOpenShareMenu: true,
}

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

	return <Navigate replace state={state} to={`/${ROOM_PREFIX}/${data.slug}`} />
}
