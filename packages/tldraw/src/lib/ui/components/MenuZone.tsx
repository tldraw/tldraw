import { track, useEditor } from '@tldraw/editor'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useReadonly } from '../hooks/useReadonly'
import { useTldrawUiComponents } from '../hooks/useTldrawUiComponents'
import { DuplicateButton } from './DuplicateButton'
import { RedoButton } from './RedoButton'
import { TrashButton } from './TrashButton'
import { UndoButton } from './UndoButton'

export const MenuZone = track(function MenuZone() {
	const editor = useEditor()

	const breakpoint = useBreakpoint()
	const isReadonly = useReadonly()

	const { MainMenu, ActionsMenu, PageMenu } = useTldrawUiComponents()

	return (
		<div className="tlui-menu-zone">
			<div className="tlui-buttons__horizontal">
				{MainMenu && <MainMenu />}
				{PageMenu && <PageMenu />}
				{breakpoint >= 6 && !isReadonly && !editor.isInAny('hand', 'zoom') && (
					<>
						<UndoButton />
						<RedoButton />
						<TrashButton />
						<DuplicateButton />
						{ActionsMenu && <ActionsMenu />}
					</>
				)}
			</div>
		</div>
	)
})
