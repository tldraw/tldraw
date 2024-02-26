import { nicelog } from '@/utils/nicelog'
import { check } from 'linkinator'

export async function checkBrokenLinks() {
	const results = await check({
		path: 'http://localhost:3001',
		recurse: true,
	})

	// All good
	if (results.passed) return

	// There seems to be a porblem
	nicelog(
		`𐄂 Broken links detected!\n\n` +
			results.links
				.filter((result) => result.state !== 'OK')
				.map(
					(result, i) =>
						`${i + 1}.\t${result.url}\n\tFrom: ${result.parent}\n\tStatus: ${result.status}`
				)
				.join('\n\n') +
			'\n\n'
	)
}
