import * as _ContextMenu from '@radix-ui/react-context-menu'
import { PageRecordType, TLPageId, track, useContainer, useEditor } from '@tldraw/editor'
import { useToasts } from '../hooks/useToastsProvider'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'

export const MoveToPageMenu = track(function MoveToPageMenu() {
	const editor = useEditor()
	const container = useContainer()
	const pages = editor.pages
	const currentPageId = editor.currentPageId
	const msg = useTranslation()
	const { addToast } = useToasts()

	return (
		<_ContextMenu.Sub>
			<_ContextMenu.SubTrigger dir="ltr" asChild>
				<Button
					className="tlui-menu__button"
					label="context-menu.move-to-page"
					data-testid="menu-item.move-to-page"
					icon="chevron-right"
				/>
			</_ContextMenu.SubTrigger>
			<_ContextMenu.Portal container={container} dir="ltr">
				<_ContextMenu.SubContent className="tlui-menu" sideOffset={-4} collisionPadding={4}>
					<_ContextMenu.Group
						dir="ltr"
						className={'tlui-menu__group'}
						data-testid={`menu-item.pages`}
						key="pages"
					>
						{pages.map((page) => (
							<_ContextMenu.Item
								key={page.id}
								disabled={currentPageId === page.id}
								onSelect={() => {
									editor.mark('move_shapes_to_page')
									editor.moveShapesToPage(editor.selectedShapeIds, page.id as TLPageId)

									const toPage = editor.getPage(page.id)

									if (toPage) {
										addToast({
											title: 'Changed Page',
											description: `Moved to ${toPage.name}.`,
											actions: [
												{
													label: 'Go Back',
													type: 'primary',
													onClick: () => {
														editor.mark('change-page')
														editor.setCurrentPage(currentPageId)
													},
												},
											],
										})
									}
								}}
								asChild
							>
								<Button
									title={page.name}
									className="tlui-menu__button tlui-context-menu__move-to-page__name"
								>
									<span>{page.name}</span>
								</Button>
							</_ContextMenu.Item>
						))}
					</_ContextMenu.Group>
					<_ContextMenu.Group
						dir="ltr"
						className={'tlui-menu__group'}
						data-testid={`menu-item.new-page`}
						key="new-page"
					>
						<_ContextMenu.Item
							key="new-page"
							onSelect={() => {
								const newPageId = PageRecordType.createId()
								const ids = editor.selectedShapeIds
								editor.batch(() => {
									editor.mark('move_shapes_to_page')
									editor.createPage({ name: 'Page', id: newPageId })
									editor.moveShapesToPage(ids, newPageId)
								})
							}}
							asChild
						>
							<Button
								title={msg('context.pages.new-page')}
								className="tlui-menu__button tlui-context-menu__move-to-page__name"
							>
								{msg('context.pages.new-page')}
							</Button>
						</_ContextMenu.Item>
					</_ContextMenu.Group>
				</_ContextMenu.SubContent>
			</_ContextMenu.Portal>
		</_ContextMenu.Sub>
	)
})
