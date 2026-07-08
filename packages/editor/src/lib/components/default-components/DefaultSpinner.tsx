import { TlSpinner } from '@tldraw/ui'

/** @public @react */
export function DefaultSpinner(props: React.SVGProps<SVGSVGElement>) {
	return <TlSpinner aria-hidden={false} {...props} />
}
