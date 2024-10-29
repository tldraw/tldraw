import { ButtonHTMLAttributes, DetailedHTMLProps, forwardRef } from 'react'
import { useTranslation } from 'tldraw'

export type ShareButtonProps = DetailedHTMLProps<
	ButtonHTMLAttributes<HTMLButtonElement>,
	HTMLButtonElement
> & { title: string; label: string }

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(function ShareButton(
	{ label, title, ...props },
	ref
) {
	const msg = useTranslation()
	const titleStr = msg(title)
	const labelStr = msg(label)
	return (
		<button
			ref={ref}
			draggable={false}
			type="button"
			title={titleStr}
			className="tlui-share-zone__button-wrapper"
			{...props}
		>
			<div className="tlui-button tlui-button__normal tlui-share-zone__button">
				<span className="tlui-button__label" draggable={false}>
					{labelStr}
				</span>
			</div>
		</button>
	)
})
