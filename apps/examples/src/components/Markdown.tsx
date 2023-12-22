import classNames from 'classnames'

export function Markdown({
	sanitizedHtml,
	className = '',
}: {
	sanitizedHtml: string
	className?: string
}) {
	return (
		<div
			className={classNames('examples__markdown', className)}
			dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
		/>
	)
}
