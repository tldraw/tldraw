import { DefaultSpinner } from '@tldraw/editor'
import React from 'react'
import { useTranslation } from '../hooks/useTranslation/useTranslation'

/** @internal */
export function Spinner(props: React.SVGProps<SVGSVGElement>) {
	const msg = useTranslation()

	return <DefaultSpinner aria-label={msg('app.loading')} {...props} />
}
