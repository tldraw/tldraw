import { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './ExternalLink.module.css'

export function ExternalLink(props: ComponentProps<typeof Link>) {
	return (
		<Link {...props} target="_blank" rel="noopener noreferrer">
			{props.children}
			<TlaIcon inline icon="external" className={styles.externalLinkIcon} />
		</Link>
	)
}
