import { TldrawUiSpinner } from '@tldraw/ui'

/** @public @react */
export function DefaultSpinner(props: React.SVGProps<SVGSVGElement>) {
	return <TldrawUiSpinner aria-hidden={false} {...props} />
}
