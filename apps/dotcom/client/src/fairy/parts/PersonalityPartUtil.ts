import { PersonalityPart } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class PersonalityPartUtil extends PromptPartUtil<PersonalityPart> {
	static override type = 'personality' as const

	override getPart(): PersonalityPart {
		const config = this.agent.$fairyConfig.get()
		return {
			type: 'personality',
			personality: config.personality || '',
			sign: config.sign || { sun: '', moon: '', rising: '' },
		}
	}
}
