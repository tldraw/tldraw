import { Helmet } from 'react-helmet-async'
import { Outlet } from 'react-router-dom'

export function Component() {
	return (
		<>
			<Helmet>
				<meta name="robots" content="noindex" />
			</Helmet>
			<Outlet />
		</>
	)
}
