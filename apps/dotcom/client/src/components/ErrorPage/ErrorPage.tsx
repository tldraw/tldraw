import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isInIframe } from '../../utils/iFrame'

const GoBackLink = () => {
	const inIframe = isInIframe()
	return (
		<Link to={'/'} target={inIframe ? '_blank' : '_self'}>
			{inIframe ? 'Open tldraw.' : 'Back to tldraw.'}
		</Link>
	)
}

const sadFaceIcon = (
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
	)
}
