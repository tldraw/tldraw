import classNames from 'classnames'
import { Link } from 'react-router-dom'
import { routes } from '../../../routeDefs'
import { F } from '../../utils/i18n'
import styles from './error.module.css'

type TlaPageErrorType =
	| 'file-not-found'
	| 'no-file-access'
	| 'no-workspace-access'
	| 'no-user-access'

function ErrorLinkHome() {
	return (
		<Link className={classNames(styles.link, 'tla-text_ui__regular')} to={routes.tlaRoot()}>
			<F defaultMessage="Take me home" />
		</Link>
	)
}

export function TlaErrorContent({ error }: { error: TlaPageErrorType }) {
	switch (error) {
		case 'file-not-found': {
			return (
				<div className={styles.container}>
					<p className="tla-text_ui__regular">
						<F defaultMessage="Sorry, that file doesn’t exist." />
					</p>
					<ErrorLinkHome />
				</div>
			)
		}
		case 'no-file-access': {
			return (
				<div className={styles.container}>
					<p className="tla-text_ui__regular">
						<F defaultMessage="Sorry, you don’t have access to that file. If you know who created the file, you can request a new invite link." />
					</p>
					<ErrorLinkHome />
				</div>
			)
		}
		case 'no-workspace-access': {
			return (
				<div className={styles.container}>
					<p className="tla-text_ui__regular">
						<F defaultMessage="Sorry, you don’t have access to that workspace." />
					</p>
					<ErrorLinkHome />
				</div>
			)
		}
		case 'no-user-access': {
			return (
				<div className={styles.container}>
					<p className="tla-text_ui__regular">
						<F defaultMessage="Sorry, you don’t have access to that user." />
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
