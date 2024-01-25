import { useTranslation } from '@tldraw/tldraw'
import { ButtonHTMLAttributes, DetailedHTMLProps, forwardRef } from 'react'

export type ShareButtonProps = DetailedHTMLProps<
	ButtonHTMLAttributes<HTMLButtonElement>,
	HTMLButtonElement
>

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(
	function ShareButton(props, ref) {
		const msg = useTranslation()
		return (
			<button
				ref={ref}
				draggable={false}
				type="button"
				title={msg('share-menu.title')}
				className="tlui-share-zone__button-wrapper"
				{...props}
			>
				<div className="tlui-button tlui-button__normal tlui-share-zone__button">
					<span className="tlui-button__label" draggable={false}>
						{msg('share-menu.title')}
					</span>
				</div>
			</button>
		)
	}
)
