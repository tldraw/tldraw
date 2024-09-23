import '../../styles/globals.css'
import { TlaLoggedOutWrapper } from '../components-tla/TlaLoggedOutWrapper'
import { LocalEditor } from '../components/LocalEditor'

export function Component() {
	return (
		<TlaLoggedOutWrapper>
			<LocalEditor />
		</TlaLoggedOutWrapper>
	)
}
