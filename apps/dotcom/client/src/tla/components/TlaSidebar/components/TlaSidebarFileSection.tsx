import classNames from 'classnames'
import { ReactElement, ReactNode } from 'react'
import { useUniqueSafeId } from 'tldraw'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

export function TlaSidebarFileSection({
	title,
	iconLeft,
	onePixelOfPaddingAtTheTop,
	children,
	className,
	iconButton,
}: {
	title: ReactElement
	iconLeft?: string
	onePixelOfPaddingAtTheTop?: boolean
	children: ReactNode
	className?: string
	iconButton?: {
		icon: string
		onClick(): void
		title?: string
	}
}) {
	const id = useUniqueSafeId()
	return (
		<div
			className={classNames(
				styles.sidebarFileSectionWrapper,
				{
					[styles.sidebarFileSectionTitlePadding]: onePixelOfPaddingAtTheTop,
				},
				className
			)}
		>
			<div className={classNames('tla-text_ui__medium', styles.sidebarFileSectionTitle)}>
				{iconLeft ? <TlaIcon icon={iconLeft} /> : null}
				<span id={id} className={styles.sidebarFileSectionTitleText} role="heading" aria-level={2}>
					{title}
				</span>
				{iconButton && (
					<button
						className={styles.sidebarCreateFileButton}
						onClick={iconButton.onClick}
						title={iconButton.title}
						type="button"
					>
						<TlaIcon icon={iconButton.icon} />
					</button>
				)}
			</div>
			<div className={styles.sidebarFileSection} role="list" aria-labelledby={id}>
				{children}
			</div>
		</div>
	)
}
