import * as _ContextMenu from '@radix-ui/react-context-menu'
import { PageRecordType, TLPageId, track, useContainer, useEditor } from '@tldraw/editor'
import { useToasts } from '../hooks/useToastsProvider'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'

export const MoveToPageMenu = track(function MoveToPageMenu() {
	const editor = useEditor()
	const container = useContainer()
	const pages = editor.getPages()
	const currentPageId = editor.getCurrentPageId()
	const msg = useTranslation()
	const { addToast } = useToasts()

	return (
		<_ContextMenu.Sub>
			<_ContextMenu.SubTrigger dir="ltr" asChild>
				<Button
					type="menu"
					label="context-menu.move-to-page"
					data-testid="menu-item.move-to-page"
					icon="chevron-right"
				/>
			</_ContextMenu.SubTrigger>
			<_ContextMenu.Portal container={container}>
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
									editor.moveShapesToPage(editor.getSelectedShapeIds(), page.id as TLPageId)

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
									type="menu"
									title={page.name}
									className="tlui-context-menu__move-to-page__name"
								>
									<span className="tlui-button__label">{page.name}</span>
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
								const ids = editor.getSelectedShapeIds()
								editor.batch(() => {
									editor.mark('move_shapes_to_page')
									editor.createPage({ name: msg('page-menu.new-page-initial-name'), id: newPageId })
									editor.moveShapesToPage(ids, newPageId)
								})
							}}
							asChild
						>
							<Button
								type="menu"
								title={msg('context.pages.new-page')}
								className="tlui-context-menu__move-to-page__name"
							>
								<span className="tlui-button__label">{msg('context.pages.new-page')}</span>
							</Button>
						</_ContextMenu.Item>
					</_ContextMenu.Group>
				</_ContextMenu.SubContent>
			</_ContextMenu.Portal>
		</_ContextMenu.Sub>
	)
})
