import { SearchEntry } from '@/utils/algolia'
import { Hit } from 'instantsearch.js'
import { getHighlightedParts, getPropertyByPath, unescape } from 'instantsearch.js/es/lib/utils'
import { memo } from 'react'

export const ContentHighlight = memo(function ContentHighlight({ hit }: { hit: Hit<SearchEntry> }) {
	const descriptionHighlight = getHighlights(hit, 'description', 40)
	const contentHighlight = getHighlights(hit, 'content', 40)

	let firstItem = null
	let secondItem = null

	if (descriptionHighlight.didMatch === contentHighlight.didMatch) {
		// if both either matched or didn't, show whatever has actual content:
		if (descriptionHighlight.parts.length && contentHighlight.parts.length) {
			firstItem = descriptionHighlight
			secondItem = contentHighlight
		} else if (descriptionHighlight.parts.length) {
			firstItem = descriptionHighlight
		} else if (contentHighlight.parts.length) {
			firstItem = contentHighlight
		}
	} else if (descriptionHighlight.didMatch && !contentHighlight.didMatch) {
		// if only the description matched, show both because the description is short:
		firstItem = descriptionHighlight
		secondItem = contentHighlight
	} else {
		// otherwise, only the content matched. show just the content:
		firstItem = contentHighlight
	}

	if (firstItem && !secondItem) {
		// if we only have the first item, show it over two lines:
		return (
			<HighlightContent
				didTruncateStart={firstItem.didTruncateStart}
				parts={firstItem.parts}
				className="line-clamp-2 text-sm"
			/>
		)
	} else {
		// otherwise, show both items on one line each:
		return (
			<>
				{firstItem && (
					<HighlightContent
						didTruncateStart={firstItem.didTruncateStart}
						parts={firstItem.parts}
						className="line-clamp-1 text-sm"
					/>
				)}
				{secondItem && (
					<HighlightContent
						didTruncateStart={secondItem.didTruncateStart}
						parts={secondItem.parts}
						className="line-clamp-1 text-sm"
					/>
				)}
			</>
		)
	}
})

function HighlightContent({
	parts,
	didTruncateStart,
	className,
}: {
	parts: { value: string; isHighlighted: boolean }[]
	didTruncateStart: boolean
	className: string
}) {
	return (
		<div className={className}>
			{didTruncateStart && '…'}
			{parts.map((part, index) =>
				part.isHighlighted ? <mark key={index}>{part.value}</mark> : part.value
			)}
		</div>
	)
}

function getHighlights(
	hit: Hit<SearchEntry>,
	attribute: 'description' | 'content',
	maxUnhighlightedPrefix: number
): {
	didTruncateStart: boolean
	didMatch: boolean
	parts: { value: string; isHighlighted: boolean }[]
} {
	const originalProperty = hit[attribute]?.trim()
	const highlightedProperty = getPropertyByPath(hit._highlightResult, attribute as string)
	if (!highlightedProperty) {
		return {
			didMatch: false,
			didTruncateStart: false,
			parts: originalProperty ? [{ value: originalProperty, isHighlighted: false }] : [],
		}
	}

	const parts = getHighlightedParts(unescape(highlightedProperty.value || ''))

	let didTruncateStart = false
	const didMatch = parts.some((part) => part.isHighlighted)

	const initialPart = parts[0]
	// if the first part is unhighlighted and too long, we should cut it short
	if (initialPart && !initialPart.isHighlighted && didMatch) {
		const words = initialPart.value.split(' ').reverse()

		let lengthSoFar = 0
		const wordsToInclude: string[] = []
		for (const word of words) {
			lengthSoFar += word.length
			if (lengthSoFar > maxUnhighlightedPrefix) {
				break
			}
			wordsToInclude.push(word)
		}

		if (wordsToInclude.length < words.length) {
			didTruncateStart = true
			parts[0].value = `${wordsToInclude.reverse().join(' ')}`
		}
	}

	return { didTruncateStart, didMatch, parts }
}
