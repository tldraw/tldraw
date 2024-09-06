import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

export function CanonicalUrl() {
	const location = useLocation()

	return (
		<Helmet>
			<link rel="canonical" href={`${window.location.origin}${location.pathname}`} />
		</Helmet>
	)
}
