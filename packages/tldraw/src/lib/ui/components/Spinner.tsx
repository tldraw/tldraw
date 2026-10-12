import { DefaultSpinner, defineMessages } from '@tldraw/editor'
import React from 'react'
import { useTranslation } from '../hooks/useTranslation/useTranslation'

const messages = defineMessages({
	appLoading: { id: 'app.loading', defaultMessage: 'Loading tldraw…' },
})

/** @internal */
export function Spinner(props: React.SVGProps<SVGSVGElement>) {
	const msg = useTranslation()

	return <DefaultSpinner aria-label={msg(messages.appLoading.id)} {...props} />
}
