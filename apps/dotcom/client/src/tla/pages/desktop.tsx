import { Helmet } from 'react-helmet-async'
import { DesktopPage } from '../desktop/DesktopPage'

const PAGE_TITLE = 'tldraw OS'
const PAGE_DESCRIPTION = 'A virtual desktop for tldraw and its friends. Drag, draw, and explore.'

export function Component() {
	return (
		<>
			<Helmet title={PAGE_TITLE}>
				<meta name="description" content={PAGE_DESCRIPTION} />
			</Helmet>
			<DesktopPage />
		</>
	)
}
