import { useParams } from 'react-router-dom'
import { TLComponents } from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'
import { TlaEditorTopLeftPanel } from '../components/TlaEditor/TlaEditorTopLeftPanel'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	MenuPanel: () => <TlaEditorTopLeftPanel isAnonUser />,
	SharePanel: null,
}

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<LocalEditor persistenceKey={fileSlug} components={components} />
		</div>
	)
}
