import { useParams } from 'react-router-dom'
import {
	DefaultMainMenu,
	DefaultMainMenuContent,
	TLComponents,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
} from 'tldraw'
import { LocalEditor } from '../../components/LocalEditor'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	SharePanel: null,
	MainMenu: () => (
		<DefaultMainMenu>
			<TldrawUiMenuGroup id="download">
				<TldrawUiMenuActionItem actionId={'save-file-copy'} />
			</TldrawUiMenuGroup>
			<DefaultMainMenuContent />
		</DefaultMainMenu>
	),
}

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<LocalEditor persistenceKey={fileSlug} components={components} />
		</div>
	)
}
