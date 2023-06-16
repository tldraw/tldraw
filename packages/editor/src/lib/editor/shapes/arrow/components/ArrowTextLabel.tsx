import { VecLike } from '@tldraw/primitives'
import { TLArrowShape, TLShapeId } from '@tldraw/tlschema'
import * as React from 'react'
import { stopEventPropagation } from '../../../../utils/dom'
import { ARROW_LABEL_FONT_SIZES, TEXT_PROPS } from '../../shared/default-shape-constants'
import { useEditableText } from '../../shared/useEditableText'
import { TextHelpers } from '../../text/TextHelpers'

export const ArrowTextLabel = React.memo(function ArrowTextLabel({
	id,
	text,
	size,
	font,
	position,
	width,
	labelColor,
}: { id: TLShapeId; position: VecLike; width?: number; labelColor: string } & Pick<
	TLArrowShape['props'],
	'text' | 'size' | 'font'
>) {
	const { rInput, isEditing, handleFocus, handleBlur, handleKeyDown, handleChange, isEmpty } =
		useEditableText(id, 'arrow', text)

	if (!isEditing && isEmpty) {
		return null
	}

	return (
		<div
			className="tl-arrow-label"
			data-font={font}
			data-align={'center'}
			data-hastext={!isEmpty}
			data-isediting={isEditing}
			style={{
				textAlign: 'center',
				fontSize: ARROW_LABEL_FONT_SIZES[size],
				lineHeight: ARROW_LABEL_FONT_SIZES[size] * TEXT_PROPS.lineHeight + 'px',
				transform: `translate(${position.x}px, ${position.y}px)`,
				color: labelColor,
			}}
		>
			<div className="tl-arrow-label__inner">
				<p style={{ width: width ? width : '9px' }}>
					{text ? TextHelpers.normalizeTextForDom(text) : ' '}
				</p>
				{isEditing && (
					// Consider replacing with content-editable
					<textarea
						ref={rInput}
						className="tl-text tl-text-input"
						name="text"
						tabIndex={-1}
						autoComplete="false"
						autoCapitalize="false"
						autoCorrect="false"
						autoSave="false"
						autoFocus
						placeholder=""
						spellCheck="true"
						wrap="off"
						dir="auto"
						datatype="wysiwyg"
						defaultValue={text}
						onFocus={handleFocus}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						onContextMenu={stopEventPropagation}
					/>
				)}
			</div>
		</div>
	)
})
