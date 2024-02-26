import { captureException } from '@sentry/react'
import { DefaultErrorFallback as ErrorFallback } from '@tldraw/tldraw'
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'

export function DefaultErrorFallback() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <ErrorFallback error={error} />
}
