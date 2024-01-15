import { nicelog } from '@/utils/nicelog'
import blc from 'broken-link-checker'

const IGNORED_URLS = ['https://twitter.com/tldraw', 'https://tldraw.com']

export async function checkBrokenLinks() {
	nicelog('Checking broken links...')
	const checked = new Set<string>()
	const checker = new blc.SiteChecker(
		{
			filterLevel: 1,
		},
		{
			link(result) {
				if (IGNORED_URLS.includes(result.url.original)) return
				if (checked.has(result.url.resolved)) return
				// nicelog('Checking', result.url.resolved.replace('http://localhost:3001', ''))
				if (result.broken) {
					nicelog(`BROKEN: ${result.url.resolved} on page ${result.base.resolved}`)
				}
				checked.add(result.url.resolved)
			},
			end() {
				nicelog('done')
			},
		}
	)
	checker.enqueue('http://localhost:3001/docs/assets', null)
}
