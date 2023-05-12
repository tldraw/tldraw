import { ui } from '../helpers/index'
import './arrange'
import './camera'
import './export'
import './grouping'
import './pages'
import './reorder'
import './screenshots'
import './shortcuts'
import './smoke'
import './styling'
import './text'

before(async () => {
	await browser.waitUntil(
		async () => {
			try {
				await ui.app.open()
			} catch (err) {
				console.error(err)
				return false
			}
			return true
		},
		{ timeout: 30 * 1000 }
	)
})
