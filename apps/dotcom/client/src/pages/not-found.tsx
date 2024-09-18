import { ErrorPage } from '../components/ErrorPage/ErrorPage'

export function Component() {
	return (
		<ErrorPage
			messages={{
				header: 'Page not found',
				para1: 'The page you are looking does not exist or has been moved.',
			}}
		/>
	)
}
