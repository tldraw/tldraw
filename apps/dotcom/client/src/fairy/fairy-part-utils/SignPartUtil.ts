import { SignPart } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class SignPartUtil extends PromptPartUtil<SignPart> {
	static override type = 'sign' as const

	override getPart(): SignPart {
		const config = this.agent.$fairyConfig.get()
		return {
			type: 'sign',
			sign: config.sign || { sun: '', moon: '', rising: '' },
		}
	}
}
