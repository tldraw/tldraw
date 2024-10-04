import { captureException } from '@sentry/react'
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { DefaultErrorFallback as ErrorFallback } from 'tldraw'

export function DefaultErrorFallback() {
	const error = useRouteError()
	useEffect(() => {
		captureException(error)
	}, [error])
	return <ErrorFallback error={error} />
}
