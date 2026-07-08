import { FLAGS } from 'tldraw'
import { commentsPlugin } from './commentsPlugin'

describe('commentsPlugin', () => {
	it('requires the comments license flag', () => {
		expect(commentsPlugin().requiredLicenseFlags).toBe(FLAGS.COMMENTS_PLUGIN)
	})
})
