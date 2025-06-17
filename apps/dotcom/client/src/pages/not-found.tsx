import { IntlProvider } from 'react-intl'
import { TlaFileErrorContent } from '../tla/components/TlaFileError/TlaFileError'
import { F } from '../tla/utils/i18n'

export function Component() {
	return notFound()
}

export function notFound() {
	return (
		<IntlProvider defaultLocale="en" locale="en" messages={{}}>
			<div className="error-page">
				<TlaFileErrorContent>
					<h1>
						<F defaultMessage="Page not found" />
					</h1>
					<p>
						<F defaultMessage="The page you are looking does not exist or has been moved." />
					</p>
				</TlaFileErrorContent>
			</div>
		</IntlProvider>
	)
}
