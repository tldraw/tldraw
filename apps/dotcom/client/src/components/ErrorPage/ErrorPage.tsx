import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { F, IntlProvider } from '../../tla/app/i18n'
import { isInIframe } from '../../utils/iFrame'

const GoBackLink = () => {
	const inIframe = isInIframe()
	return (
		<Link to={'/'} target={inIframe ? '_blank' : '_self'}>
			{inIframe ? <F defaultMessage="Open tldraw." /> : <F defaultMessage="Back to blah." />}
		</Link>
	)
}

export const sadFaceIcon = (
	<img width={36} height={36} src="/404-Sad-tldraw.svg" loading="lazy" role="presentation" />
)

export function ErrorPage({
	messages,
	icon = sadFaceIcon,
	cta = <GoBackLink />,
}: {
	icon?: ReactNode
	messages: { header: string; para1: string; para2?: string }
	cta?: ReactNode
}) {
	return (
		// This sits outside the regular providers, it needs to be able to have the intl object in the app context.
		<IntlProvider defaultLocale="en" locale="en" messages={{}}>
			<div className="error-page">
				<div className="error-page__container">
					{icon}
					<div className="error-page__content">
						<h1>{messages.header}</h1>
						<p>{messages.para1}</p>
						{messages.para2 && <p>{messages.para2}</p>}
					</div>
					{cta}
				</div>
			</div>
		</IntlProvider>
	)
}
