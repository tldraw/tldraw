import { wd } from './app'

export function $element() {
	return $(wd('tools'))
}

export async function click(toolName: string) {
	// Check if `tools.mobile-more` exists
	// Check ifisExisting()
	const toolSelector = wd(`tools.${toolName}`)
	const moreSelector = wd(`tools.more`)

	if (await $(toolSelector).isExisting()) {
		await $(toolSelector).click()
	} else if (await $(moreSelector).isExisting()) {
		await $(moreSelector).click()
		await $(toolSelector).click()
	}

	return this
}
