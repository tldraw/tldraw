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
}: {
	title: ReactElement
	iconLeft?: string
	onePixelOfPaddingAtTheTop?: boolean
	children: ReactNode
}) {
	const id = useUniqueSafeId()
	return (
		<div
			className={classNames(styles.sidebarFileSectionWrapper, {
				[styles.sidebarFileSectionTitlePadding]: onePixelOfPaddingAtTheTop,
			})}
		>
			<div className={classNames('tla-text_ui__medium', styles.sidebarFileSectionTitle)}>
				{iconLeft ? <TlaIcon icon={iconLeft} /> : null}
				<span id={id} role="heading" aria-level={2}>
					{title}
				</span>
			</div>
			<div className={styles.sidebarFileSection} role="list" aria-labelledby={id}>
				{children}
			</div>
		</div>
	)
}
