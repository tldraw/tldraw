import classNames from 'classnames'
import { Link } from 'react-router-dom'
import { useRaw } from '../../hooks/useRaw'
import styles from './error.module.css'

type TlaPageErrorType =
	| 'file-not-found'
	| 'no-file-access'
	| 'no-workspace-access'
	| 'no-user-access'

function ErrorLinkHome() {
	const raw = useRaw()
	return (
		<Link className={classNames(styles.link, 'tla-text_ui__regular')} to="/">
			{raw('Take me home')}
		</Link>
	)
}

export function TlaErrorContent({ error }: { error: TlaPageErrorType }) {
	const raw = useRaw()
	switch (error) {
		case 'file-not-found': {
			return (
				<div className={styles.container}>
					<p className="tla-text_ui__regular">{raw('Sorry, that file doesn’t exist.')}</p>
					<ErrorLinkHome />
				</div>
			)
		}
		case 'no-file-access': {
			return (
				<div className={styles.container}>
					<p className="tla-text_ui__regular">
						{raw(
							'Sorry, you don’t have access to that file. If you know whose created the file, you can request a new invite link.'
						)}
					</p>
					<ErrorLinkHome />
				</div>
			)
		}
		case 'no-workspace-access': {
			return (
				<div className={styles.container}>
					<p className="tla-text_ui__regular">
						{raw('Sorry, you don’t have access to that workspace.')}
					</p>
					<ErrorLinkHome />
				</div>
			)
		}
		case 'no-user-access': {
			return (
				<div className={styles.container}>
					<p className="tla-text_ui__regular">
						{raw('Sorry, you don’t have access to that user.')}
					</p>
					<ErrorLinkHome />
				</div>
			)
		}
		default: {
			throw Error(`No handler for error: ${error}`)
		}
	}
}
