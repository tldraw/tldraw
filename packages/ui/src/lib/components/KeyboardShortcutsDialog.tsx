import { MenuChild } from '../hooks/menuHelpers'
import { useKeyboardShortcutsSchema } from '../hooks/useKeyboardShortcutsSchema'
import { useReadonly } from '../hooks/useReadonly'
import { TLTranslationKey } from '../hooks/useTranslation/TLTranslationKey'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import * as Dialog from './primitives/Dialog'
import { Kbd } from './primitives/Kbd'

export const KeyboardShortcutsDialog = () => {
	const msg = useTranslation()
	const isReadonly = useReadonly()
	const shortcutsItems = useKeyboardShortcutsSchema()

	function getKeyboardShortcutItem(item: MenuChild) {
		if (isReadonly && !item.readonlyOk) return null

		switch (item.type) {
			case 'group': {
				return (
					<div className="tlui-shortcuts-dialog__group" key={item.id}>
						<h2 className="tlui-shortcuts-dialog__group__title">
							{msg(item.id as TLTranslationKey)}
						</h2>
						<div className="tlui-shortcuts-dialog__group__content">
							{item.children
								.filter((item) => item.type === 'item' && item.actionItem.kbd)
								.map(getKeyboardShortcutItem)}
						</div>
					</div>
				)
			}
			case 'item': {
				const { id, label, shortcutsLabel, kbd } = item.actionItem

				return (
					<div className="tlui-shortcuts-dialog__key-pair" key={id}>
						<div className="tlui-shortcuts-dialog__key-pair__key">
							{msg((shortcutsLabel ?? label)!)}
						</div>
						<div className="tlui-shortcuts-dialog__key-pair__value">
							<Kbd>{kbd!}</Kbd>
						</div>
					</div>
				)
			}
		}
	}

	return (
		<>
			<Dialog.Header className="tlui-shortcuts-dialog__header">
				<Dialog.Title>{msg('shortcuts-dialog.title')}</Dialog.Title>
				<Dialog.CloseButton />
			</Dialog.Header>
			<Dialog.Body className="tlui-shortcuts-dialog__body">
				{shortcutsItems.map(getKeyboardShortcutItem)}
			</Dialog.Body>
			<div className="tlui-dialog__scrim" />
		</>
	)
}
