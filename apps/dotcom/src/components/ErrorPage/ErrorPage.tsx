import { Link } from 'react-router-dom'
import { isInIframe } from '../../utils/iFrame'

export function ErrorPage({
	icon,
	messages,
}: {
	icon?: boolean
	messages: { header: string; para1: string; para2?: string }
	redirectTo?: string
}) {
	const inIframe = isInIframe()
	return (
		<div className="error-page">
			<div className="error-page__container">
				{icon && (
					<img width={36} height={36} alt={'Not found'} src="/404-Sad-tldraw.svg" loading="lazy" />
				)}
				<div className="error-page__content">
					<h1>{messages.header}</h1>
					<p>{messages.para1}</p>
					{messages.para2 && <p>{messages.para2}</p>}
				</div>
				<Link to={'/'} target={inIframe ? '_blank' : '_self'}>
					{inIframe ? 'Open tldraw.' : 'Back to tldraw.'}
				</Link>
			</div>
		</div>
	)
}
