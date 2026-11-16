import { defineMessages, TldrawUiIcon, useTranslation } from 'tldraw'
import type { TLLibraryOwner } from '../lib/LibrarySource'

const messages = defineMessages({
	other: { id: 'libraries.tabs.other', defaultMessage: 'Other' },
})

/** @public */
export interface LibraryTabLabelProps {
	/** The tab's owner. Undefined for the tab of libraries without a known owner. */
	owner?: TLLibraryOwner
}

/**
 * An owner's icon and name, or "Other" for libraries without a known owner. The default for
 * {@link LibrariesComponents.LibraryTabLabel}.
 * @public @react
 */
export function LibraryTabLabel({ owner }: LibraryTabLabelProps) {
	const msg = useTranslation()
	return (
		<>
			{owner?.icon && (
				<TldrawUiIcon icon={owner.icon} label="" small className="tlui-libraries-tabs__icon" />
			)}
			<span className="tlui-libraries-tabs__label">{owner ? owner.name : msg(messages.other)}</span>
		</>
	)
}
