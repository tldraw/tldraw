import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { F, IntlProvider } from '../../tla/utils/i18n'
import { isInIframe } from '../../utils/iFrame'

const GoBackLink = () => {
	const inIframe = isInIframe()
	return (
		<Link to={'/'} target={inIframe ? '_blank' : '_self'}>
			{inIframe ? <F defaultMessage="Open tldraw." /> : <F defaultMessage="Back to tldraw." />}
		</Link>
	)
}

// This is inline because if you're offline you won't be able to get an image.
export const sadFaceIcon = (
	<svg
		data-testid="tla-error-icon"
		xmlns="http://www.w3.org/2000/svg"
		width="36"
		height="36"
		viewBox="0 0 36 36"
		fill="none"
	>
		<path
			d="M0 3.95604C0 1.77118 1.69661 0 3.78947 0H32.2105C34.3034 0 36 1.77118 36 3.95604V32.044C36 34.2288 34.3034 36 32.2105 36H3.78947C1.69661 36 0 34.2288 0 32.044V3.95604Z"
			fill="black"
		/>
		<path
			d="M15.9715 10.296C15.9715 11.166 15.6741 11.9042 15.0794 12.5106C14.4847 13.117 13.7606 13.4202 12.9073 13.4202C12.0282 13.4202 11.2912 13.117 10.6965 12.5106C10.1018 11.9042 9.80441 11.166 9.80441 10.296C9.80441 9.42601 10.1018 8.68781 10.6965 8.08144C11.2912 7.47506 12.0282 7.17188 12.9073 7.17188C13.7606 7.17188 14.4847 7.47506 15.0794 8.08144C15.6741 8.68781 15.9715 9.42601 15.9715 10.296ZM9.76563 21.2448C9.76563 20.3748 10.063 19.6366 10.6577 19.0302C11.2783 18.3975 12.0282 18.0811 12.9073 18.0811C13.7348 18.0811 14.4588 18.3975 15.0794 19.0302C15.7 19.6366 16.062 20.3221 16.1654 21.0866C16.3723 22.5103 16.1137 23.9208 15.3897 25.3181C14.6915 26.7154 13.6831 27.7831 12.3643 28.5213C11.6403 28.9432 11.0456 28.93 10.5801 28.4818C10.1406 28.06 10.2699 27.559 10.968 26.979C11.3559 26.689 11.6791 26.3199 11.9377 25.8717C12.1963 25.4236 12.3643 24.9622 12.4419 24.4876C12.4678 24.2767 12.3773 24.1713 12.1704 24.1713C11.6532 24.1449 11.1232 23.8549 10.5801 23.3012C10.0371 22.7476 9.76563 22.0621 9.76563 21.2448Z"
			fill="white"
		/>
		<path
			d="M20.5 18C20.5 22.5943 23.1625 25.9175 25.528 27.6736C26.2842 28.2349 27.0059 27.4082 26.5946 26.561C25.5508 24.4105 24.5 21.3553 24.5 18C24.5 14.6447 25.5508 11.5895 26.5946 9.43903C27.0059 8.59181 26.2842 7.76508 25.528 8.32643C23.1625 10.0825 20.5 13.4057 20.5 18Z"
			fill="white"
		/>
	</svg>
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
