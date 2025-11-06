import { useCallback } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDefaultHelpers,
	useEditor,
	useValue,
} from 'tldraw'
import { FairyAgent, getFollowingFairyId } from './fairy-agent/agent/FairyAgent'
import { FairyConfigDialog } from './FairyConfigDialog'

export function FairyMenuContent({
	agent,
	menuType = 'menu',
}: {
	agent: FairyAgent
	menuType?: 'menu' | 'context-menu'
}) {
	const editor = useEditor()
	const { addDialog } = useDefaultHelpers()
	const configureFairy = useCallback(
		(agent: FairyAgent) => {
			addDialog({
				component: ({ onClose }) => <FairyConfigDialog agent={agent} onClose={onClose} />,
			})
		},
		[addDialog]
	)

	const deleteFairy = useCallback(() => {
		agent.dispose()
		agent.deleteFairyConfig()
	}, [agent])

	const isFollowing = useValue(
		'is following fairy',
		() => {
			return getFollowingFairyId(editor) === agent.id
		},
		[editor, agent]
	)

	const toggleFollow = useCallback(() => {
		if (isFollowing) {
			agent.stopFollowing()
		} else {
			agent.startFollowing()
		}
	}, [agent, isFollowing])

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="fairy-movement-menu">
				<TldrawUiMenuItem id="go-to-fairy" onSelect={() => agent.zoomTo()} label="Go to fairy" />
				<TldrawUiMenuItem id="summon-fairy" onSelect={() => agent.summon()} label="Summon fairy" />
				<TldrawUiMenuItem
					id="follow-fairy"
					onSelect={toggleFollow}
					label={isFollowing ? 'Unfollow fairy' : 'Follow fairy'}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-chat-menu">
				<TldrawUiMenuItem id="new-chat" onSelect={() => agent.reset()} label="Reset chat" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-config-menu">
				<TldrawUiMenuItem
					id="configure-fairy"
					onSelect={() => configureFairy(agent)}
					label="Customize fairy"
				/>
				<TldrawUiMenuItem id="delete-fairy" onSelect={deleteFairy} label="Delete fairy" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
