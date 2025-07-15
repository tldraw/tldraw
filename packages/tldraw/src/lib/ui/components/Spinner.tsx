import { useEditorComponents } from '@tldraw/editor'
import React from 'react'
import { useTranslation } from '../hooks/useTranslation/useTranslation'

/** @internal */
export function Spinner(props: React.SVGProps<SVGSVGElement>) {
	const { Spinner } = useEditorComponents()
	const msg = useTranslation()

	return Spinner && <Spinner aria-label={msg('app.loading')} {...props} />
}
