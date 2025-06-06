import { captureException } from '@sentry/react'
import { FILE_PREFIX } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { fetch } from 'tldraw'
import { BoardHistoryLog } from '../../components/BoardHistoryLog/BoardHistoryLog'
import { defineLoader } from '../../utils/defineLoader'
import { TlaFileError } from '../components/TlaFileError/TlaFileError'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { toggleSidebar } from '../utils/local-session-state'

const { loader, useData } = defineLoader(async (args) => {
	const fileSlug = args.params.fileSlug

	if (!fileSlug) return null

	const result = await fetch(`/api/${FILE_PREFIX}/${fileSlug}/history`, {
		headers: {},
	})
	if (!result.ok) return null
	const data = await result.json()

	return { data, fileSlug } as { data: string[]; fileSlug: string }
})

export { loader }

export function ErrorBoundary() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <Component error={error} />
}

export function Component({ error: _error }: { error?: unknown }) {
	const data = useData()

	const userId = useMaybeApp()?.userId

	const error = _error || !data

	useEffect(() => {
		if (error && userId) {
			// force sidebar open
			toggleSidebar(true)
		}
	}, [error, userId])

	return (
		<>
			{error ? (
				<TlaFileError error={error} />
			) : (
				<TlaAnonLayout>
					<BoardHistoryLog data={data.data} />
				</TlaAnonLayout>
			)}
		</>
	)
}
