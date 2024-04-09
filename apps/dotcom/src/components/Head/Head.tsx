import { Helmet } from 'react-helmet-async'
import { isPreviewEnv, isStagingEnv } from '../../utils/env'

const showStagingFavicon = isStagingEnv || isPreviewEnv

export function Head() {
	return (
		<Helmet>
			<link
				rel="icon"
				type="image/png"
				sizes="32x32"
				href={showStagingFavicon ? '/staging-favicon-32.png' : '/favicon-32x32.png'}
			/>
			<link
				rel="icon"
				type="image/png"
				sizes="16x16"
				href={showStagingFavicon ? '/staging-favicon-16.png' : '/favicon-16x16.png'}
			/>
			<link
				rel="shortcut icon"
				href={showStagingFavicon ? '/staging-favicon.svg' : '/favicon.svg'}
			/>
		</Helmet>
	)
}
