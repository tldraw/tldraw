import { useCallback } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useDefaultHelpers,
	useEditor,
	useValue,
} from 'tldraw'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent, getFollowingFairyId } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
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

	const goToFairyLabel = useMsg(fairyMessages.goToFairy)
	const summonFairyLabel = useMsg(fairyMessages.summonFairy)
	const followFairyLabel = useMsg(fairyMessages.followFairy)
	const unfollowFairyLabel = useMsg(fairyMessages.unfollowFairy)
	const askForHelpLabel = useMsg(fairyMessages.askForHelp)
	const resetChatLabel = useMsg(fairyMessages.resetChat)
	const customizeFairyLabel = useMsg(fairyMessages.customizeFairy)
	const deleteFairyLabel = useMsg(fairyMessages.deleteFairy)

	return (
		<TldrawUiMenuContextProvider type={menuType} sourceId="fairy-panel">
			<TldrawUiMenuGroup id="fairy-movement-menu">
				<TldrawUiMenuItem id="go-to-fairy" onSelect={() => agent.zoomTo()} label={goToFairyLabel} />
				<TldrawUiMenuItem
					id="summon-fairy"
					onSelect={() => agent.summon()}
					label={summonFairyLabel}
				/>
				<TldrawUiMenuItem
					id="follow-fairy"
					onSelect={toggleFollow}
					label={isFollowing ? unfollowFairyLabel : followFairyLabel}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-chat-menu">
				<TldrawUiMenuItem id="help-out" onSelect={() => agent.helpOut()} label={askForHelpLabel} />
				<TldrawUiMenuItem id="new-chat" onSelect={() => agent.reset()} label={resetChatLabel} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="fairy-config-menu">
				<TldrawUiMenuItem
					id="configure-fairy"
					onSelect={() => configureFairy(agent)}
					label={customizeFairyLabel}
				/>
				<TldrawUiMenuItem id="delete-fairy" onSelect={deleteFairy} label={deleteFairyLabel} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuContextProvider>
	)
}
