import { getEmbedInfo, matchEmbedUrl, matchUrl } from './embeds'

interface MatchUrlTestMatchDef {
	url: string
	match: true
	output: {
		type: string
		embedUrl: string
	}
}
interface MatchUrlTestNoMatchDef {
	url: string
	match: false
}
const MATCH_URL_TEST_URLS: (MatchUrlTestNoMatchDef | MatchUrlTestMatchDef)[] = [
	// tldraw
	{
		url: 'https://beta.tldraw.com/r/choochoo',
		match: true,
		output: {
			type: 'tldraw',
			embedUrl: 'https://beta.tldraw.com/r/choochoo',
		},
	},
	{
		url: 'https://beta.tldraw.com/',
		match: false,
	},
	{
		url: 'https://beta.tldraw.com/r/invalid/room',
		match: false,
	},
	{
		url: 'https://beta.tldraw.com/something',
		match: false,
	},
	{
		url: 'https://lite.tldraw.com/r/choochoo',
		match: true,
		output: {
			type: 'tldraw',
			embedUrl: 'https://lite.tldraw.com/r/choochoo',
		},
	},
	{
		url: 'https://lite.tldraw.com/',
		match: false,
	},
	{
		url: 'https://lite.tldraw.com/something',
		match: false,
	},
	// codesandbox
	{
		url: 'https://codesandbox.io/s/breathing-dots-checkpoint-7-nor86',
		match: true,
		output: {
			type: 'codesandbox',
			embedUrl: 'https://codesandbox.io/embed/breathing-dots-checkpoint-7-nor86',
		},
	},
	{
		url: 'https://codesandbox.io/foobar',
		match: false,
	},
	// codepen
	{
		url: 'https://codepen.io/Rplus/pen/PWZYRM',
		match: true,
		output: {
			type: 'codepen',
			embedUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
		},
	},
	{
		url: 'https://codepen.io/foobar',
		match: false,
	},
	// scratch
	{
		url: 'https://scratch.mit.edu/projects/97246945',
		match: true,
		output: {
			type: 'scratch',
			embedUrl: 'https://scratch.mit.edu/projects/embed/97246945',
		},
	},
	{
		url: 'https://scratch.mit.edu/projects',
		match: false,
	},
	// youtube
	{
		url: 'https://www.youtube.com/watch?v=ZMklf0vUl18',
		match: true,
		output: {
			type: 'youtube',
			embedUrl: 'https://www.youtube.com/embed/ZMklf0vUl18',
		},
	},
	{
		url: 'https://m.youtube.com/watch?v=ZMklf0vUl18',
		match: true,
		output: {
			type: 'youtube',
			embedUrl: 'https://www.youtube.com/embed/ZMklf0vUl18',
		},
	},
	{
		url: 'https://youtu.be/ZMklf0vUl18',
		match: true,
		output: {
			type: 'youtube',
			embedUrl: 'https://www.youtube.com/embed/ZMklf0vUl18',
		},
	},
	{
		url: 'https://www.youtube.com/feed/subscriptions',
		match: false,
	},
	// TODO: Mapbox
	// figma
	{
		url: 'https://www.figma.com/file/Xj2Uly2KctVDGdXszHWRcF/Untitled?node-id=0%3A1&t=9O1ocaU18YZ0DoVF-1',
		match: true,
		output: {
			type: 'figma',
			embedUrl:
				'https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/Xj2Uly2KctVDGdXszHWRcF/Untitled?node-id=0%3A1&t=9O1ocaU18YZ0DoVF-1',
		},
	},
	{
		url: 'https://www.figma.com/foobar',
		match: false,
	},
	// google_maps
	{
		url: 'https://www.google.com/maps/@52.2449313,0.0813192,14z',
		match: true,
		output: {
			type: 'google_maps',
			embedUrl: `https://google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GC_API_KEY}&center=52.2449313,0.0813192&zoom=14`,
		},
	},
	{
		url: 'https://www.google.co.uk/maps/@52.2449313,0.0813192,14z',
		match: true,
		output: {
			type: 'google_maps',
			embedUrl: `https://google.co.uk/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GC_API_KEY}&center=52.2449313,0.0813192&zoom=14`,
		},
	},
	{
		url: 'https://www.google.com/maps/timeline',
		match: false,
	},
	// google_calendar
	{
		url: 'https://calendar.google.com/calendar/u/0?cid=FOOBAR',
		match: true,
		output: {
			type: 'google_calendar',
			embedUrl: `https://calendar.google.com/calendar/embed?src=FOOBAR`,
		},
	},
	{
		url: 'https://calendar.google.com/calendar/u?cid=FOOBAR',
		match: false,
	},
	// google_slides
	{
		url: 'https://docs.google.com/presentation/d/e/2PACX-1vSjHt04pIKxS9JgjPfeIDWLq1GPDZxG-8HZwl_q5m_booZhVrB7FbogTxz6tYnMHgsyx3c8oQ72iRsb/pub?start=false&loop=false&delayms=3000',
		match: true,
		output: {
			type: 'google_slides',
			embedUrl: `https://docs.google.com/presentation/d/e/2PACX-1vSjHt04pIKxS9JgjPfeIDWLq1GPDZxG-8HZwl_q5m_booZhVrB7FbogTxz6tYnMHgsyx3c8oQ72iRsb/embed`,
		},
	},
	{
		url: 'https://docs.google.com/presentation',
		match: false,
	},
	// gist
	{
		url: 'https://gist.github.com/steveruizok/3cf65a8545719674dcd48097ada5837e',
		match: true,
		output: {
			type: 'github_gist',
			embedUrl: `https://gist.github.com/steveruizok/3cf65a8545719674dcd48097ada5837e`,
		},
	},
	{
		url: 'https://gist.github.com/discover',
		match: false,
	},
	// replit
	{
		url: 'https://replit.com/@omar/Blob-Generator',
		match: true,
		output: {
			type: 'replit',
			embedUrl: `https://replit.com/@omar/Blob-Generator?embed=true`,
		},
	},
	{
		url: 'https://replit.com/foobar',
		match: false,
	},
	// observable
	{
		url: 'https://observablehq.com/d/0d995c9fce64461c',
		match: true,
		output: {
			type: 'observable',
			embedUrl: `https://observablehq.com/embed/0d995c9fce64461c?cell=*`,
		},
	},
	{
		url: 'https://observablehq.com/@jamie-tldraw-workspace/input-chart',
		match: true,
		output: {
			type: 'observable',
			embedUrl: `https://observablehq.com/embed/@jamie-tldraw-workspace/input-chart?cell=*`,
		},
	},
	{
		url: 'https://observablehq.com/foobar',
		match: false,
	},
	// felt
	{
		url: 'https://felt.com/map/Tutorial-Learn-to-Use-Felt-TAyrWamqQTqYCQfFNGw9AnC',
		match: true,
		output: {
			type: 'felt',
			embedUrl: `https://felt.com/embed/map/Tutorial-Learn-to-Use-Felt-TAyrWamqQTqYCQfFNGw9AnC`,
		},
	},
	{
		url: 'https://felt.com/foobar',
		match: false,
	},
	// spotify
	{
		url: 'https://open.spotify.com/artist/7r9FLm0Rxp8u9tfSZhFxtL',
		match: true,
		output: {
			type: 'spotify',
			embedUrl: `https://open.spotify.com/embed/artist/7r9FLm0Rxp8u9tfSZhFxtL`,
		},
	},
	{
		url: 'https://open.spotify.com/album/7AiWUyeSs0ICu0qqe0wowa',
		match: true,
		output: {
			type: 'spotify',
			embedUrl: `https://open.spotify.com/embed/album/7AiWUyeSs0ICu0qqe0wowa`,
		},
	},
	{
		url: 'https://open.spotify.com/foobar',
		match: false,
	},
	// vimeo
	{
		url: 'https://vimeo.com/59749737',
		match: true,
		output: {
			type: 'vimeo',
			embedUrl: `https://player.vimeo.com/video/59749737?title=0&byline=0`,
		},
	},
	{
		url: 'https://vimeo.com/foobar',
		match: false,
	},
	// excalidraw
	{
		url: 'https://excalidraw.com/#room=asdkjashdkjhaskdjh,sadkjhakjshdkjahd',
		match: true,
		output: {
			type: 'excalidraw',
			embedUrl: `https://excalidraw.com/#room=asdkjashdkjhaskdjh,sadkjhakjshdkjahd`,
		},
	},
	{
		url: 'https://excalidraw.com',
		match: false,
	},
	{
		url: 'https://excalidraw.com/help',
		match: false,
	},
	//desmos
	{
		url: 'https://www.desmos.com/calculator/js9hryvejc',
		match: true,
		output: {
			type: 'desmos',
			embedUrl: 'https://www.desmos.com/calculator/js9hryvejc?embed',
		},
	},
	{
		url: 'https://www.desmos.com/calculator',
		match: false,
	},
	{
		url: 'https://www.desmos.com/calculator/js9hryvejc?foobar',
		match: false,
	},
]

interface MatchEmbedTestMatchDef {
	embedUrl: string
	match: true
	output: {
		type: string
		url: string
	}
}
interface MatchEmbedTestNoMatchDef {
	embedUrl: string
	match: false
}
const MATCH_EMBED_TEST_URLS: (MatchEmbedTestMatchDef | MatchEmbedTestNoMatchDef)[] = [
	// tldraw
	{
		embedUrl: 'https://beta.tldraw.com/r/choochoo',
		match: true,
		output: {
			type: 'tldraw',
			url: 'https://beta.tldraw.com/r/choochoo',
		},
	},
	{
		embedUrl: 'https://beta.tldraw.com/',
		match: false,
	},
	{
		embedUrl: 'https://beta.tldraw.com/r/invalid/room',
		match: false,
	},
	{
		embedUrl: 'https://beta.tldraw.com/something',
		match: false,
	},
	{
		embedUrl: 'https://lite.tldraw.com/r/choochoo',
		match: true,
		output: {
			type: 'tldraw',
			url: 'https://lite.tldraw.com/r/choochoo',
		},
	},
	{
		embedUrl: 'https://lite.tldraw.com/',
		match: false,
	},
	{
		embedUrl: 'https://lite.tldraw.com/something',
		match: false,
	},
	// codesandbox
	{
		embedUrl: 'https://codesandbox.io/embed/breathing-dots-checkpoint-7-nor86',
		match: true,
		output: {
			type: 'codesandbox',
			url: 'https://codesandbox.io/s/breathing-dots-checkpoint-7-nor86',
		},
	},
	{
		embedUrl: 'https://codesandbox.io/breathing-dots-checkpoint-7-nor86',
		match: false,
	},
	// codepen
	{
		embedUrl: 'https://codepen.io/Rplus/embed/PWZYRM',
		match: true,
		output: {
			type: 'codepen',
			url: 'https://codepen.io/Rplus/pen/PWZYRM',
		},
	},
	{
		embedUrl: 'https://codepen.io/Rplus/PWZYRM',
		match: false,
	},
	// scratch
	{
		embedUrl: 'https://scratch.mit.edu/projects/embed/97246945',
		match: true,
		output: {
			type: 'scratch',
			url: 'https://scratch.mit.edu/projects/97246945',
		},
	},
	{
		embedUrl: 'https://scratch.mit.edu/projects/97246945',
		match: false,
	},
	// youtube
	{
		embedUrl: 'https://www.youtube.com/embed/ZMklf0vUl18',
		match: true,
		output: {
			type: 'youtube',
			url: 'https://www.youtube.com/watch?v=ZMklf0vUl18',
		},
	},
	{
		embedUrl: 'https://www.youtube.com/embed/',
		match: false,
	},
	// TODO: Mapbox
	// figma
	{
		embedUrl:
			'https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/Xj2Uly2KctVDGdXszHWRcF/Untitled?node-id=0%3A1&t=9O1ocaU18YZ0DoVF-1',
		match: true,
		output: {
			type: 'figma',
			url: 'https://www.figma.com/file/Xj2Uly2KctVDGdXszHWRcF/Untitled?node-id=0:1',
		},
	},
	{
		embedUrl: 'https://www.figma.com/embed?foobar=baz',
		match: false,
	},
	// google_maps
	{
		embedUrl: `https://google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GC_API_KEY}&center=52.2449313,0.0813192&zoom=14`,
		match: true,
		output: {
			type: 'google_maps',
			url: 'https://www.google.com/maps/@52.2449313,0.0813192,14z',
		},
	},
	{
		embedUrl:
			'https://google.com/maps/embed?key=${process.env.NEXT_PUBLIC_GC_API_KEY}&center=52.2449313,0.0813192&zoom=14',
		match: false,
	},
	// google_calendar
	{
		embedUrl: `https://calendar.google.com/calendar/embed?src=FOOBAR`,
		match: true,
		output: {
			type: 'google_calendar',
			url: 'https://calendar.google.com/calendar/u/0?cid=FOOBAR',
		},
	},
	{
		embedUrl: 'https://calendar.google.com/calendar?src=FOOBAR',
		match: false,
	},
	// google_slides
	{
		embedUrl: `https://docs.google.com/presentation/d/e/2PACX-1vSjHt04pIKxS9JgjPfeIDWLq1GPDZxG-8HZwl_q5m_booZhVrB7FbogTxz6tYnMHgsyx3c8oQ72iRsb/embed`,
		match: true,
		output: {
			type: 'google_slides',
			url: 'https://docs.google.com/presentation/d/e/2PACX-1vSjHt04pIKxS9JgjPfeIDWLq1GPDZxG-8HZwl_q5m_booZhVrB7FbogTxz6tYnMHgsyx3c8oQ72iRsb/pub',
		},
	},
	{
		embedUrl: 'https://docs.google.com/presentation',
		match: false,
	},
	// gist
	{
		embedUrl: 'https://gist.github.com/steveruizok/3cf65a8545719674dcd48097ada5837e',
		match: true,
		output: {
			type: 'github_gist',
			url: `https://gist.github.com/steveruizok/3cf65a8545719674dcd48097ada5837e`,
		},
	},
	{
		embedUrl: 'https://gist.github.com/discover',
		match: false,
	},
	// replit
	{
		embedUrl: 'https://replit.com/@omar/Blob-Generator?embed=true',
		match: true,
		output: {
			type: 'replit',
			url: `https://replit.com/@omar/Blob-Generator`,
		},
	},
	{
		embedUrl: 'https://replit.com/@omar/Blob-Generator',
		match: false,
	},
	// observable
	{
		embedUrl: `https://observablehq.com/embed/0d995c9fce64461c?cell=*`,
		match: true,
		output: {
			type: 'observable',
			url: 'https://observablehq.com/d/0d995c9fce64461c#cell-*',
		},
	},
	{
		embedUrl: `https://observablehq.com/embed/@jamie-tldraw-workspace/input-chart?cell=*`,
		match: true,
		output: {
			type: 'observable',
			url: 'https://observablehq.com/@jamie-tldraw-workspace/input-chart#cell-*',
		},
	},
	{
		embedUrl: 'https://observablehq.com/embed/f/a',
		match: false,
	},
	// felt
	{
		embedUrl: 'https://felt.com/embed/map/Tutorial-Learn-to-Use-Felt-TAyrWamqQTqYCQfFNGw9AnC',
		match: true,
		output: {
			type: 'felt',
			url: `https://felt.com/map/Tutorial-Learn-to-Use-Felt-TAyrWamqQTqYCQfFNGw9AnC`,
		},
	},
	{
		embedUrl: 'https://felt.com/foobar',
		match: false,
	},
	// spotify
	{
		embedUrl: 'https://open.spotify.com/embed/artist/7r9FLm0Rxp8u9tfSZhFxtL',
		match: true,
		output: {
			type: 'spotify',
			url: `https://open.spotify.com/artist/7r9FLm0Rxp8u9tfSZhFxtL`,
		},
	},
	{
		embedUrl: 'https://open.spotify.com/embed/album/7AiWUyeSs0ICu0qqe0wowa',
		match: true,
		output: {
			type: 'spotify',
			url: `https://open.spotify.com/album/7AiWUyeSs0ICu0qqe0wowa`,
		},
	},
	{
		embedUrl: 'https://open.spotify.com/foobar',
		match: false,
	},
	// vimeo
	{
		embedUrl: 'https://player.vimeo.com/video/59749737?title=0&byline=0',
		match: true,
		output: {
			type: 'vimeo',
			url: `https://vimeo.com/59749737`,
		},
	},
	{
		embedUrl: 'https://vimeo.com/foobar',
		match: false,
	},
	// excalidraw
	{
		embedUrl: 'https://excalidraw.com/#room=asdkjashdkjhaskdjh,sadkjhakjshdkjahd',
		match: true,
		output: {
			type: 'excalidraw',
			url: `https://excalidraw.com/#room=asdkjashdkjhaskdjh,sadkjhakjshdkjahd`,
		},
	},
	{
		embedUrl: 'https://excalidraw.com',
		match: false,
	},
	{
		embedUrl: 'https://excalidraw.com/help',
		match: false,
	},
	// desmos
	{
		embedUrl: 'https://www.desmos.com/calculator/js9hryvejc?embed',
		match: true,
		output: {
			type: 'desmos',
			url: 'https://www.desmos.com/calculator/js9hryvejc',
		},
	},
	{
		embedUrl: 'https://www.desmos.com/calculator',
		match: false,
	},
	{
		embedUrl: 'https://www.desmos.com/calculator/js9hryvejc?foobar',
		match: false,
	},
]

for (const testDef of MATCH_URL_TEST_URLS) {
	test(`matchUrl("${testDef.url}")`, () => {
		const result = matchUrl(testDef.url)
		if (testDef.match) {
			expect(result).toBeDefined()
			expect(result?.definition.type).toBe(testDef.output.type)
			expect(result?.embedUrl).toBe(testDef.output.embedUrl)
		} else {
			expect(result).toBeUndefined()
		}
	})

	test(`getEmbedInfo("${testDef.url}")`, () => {
		const result = getEmbedInfo(testDef.url)
		if (testDef.match) {
			expect(result).toBeDefined()
			expect(result?.definition.type).toBe(testDef.output.type)
			expect(result?.embedUrl).toBe(testDef.output.embedUrl)
		} else {
			expect(result).toBeUndefined()
		}
	})
}

for (const testDef of MATCH_EMBED_TEST_URLS) {
	test(`matchEmbedUrl("${testDef.embedUrl}")`, () => {
		const result = matchEmbedUrl(testDef.embedUrl)
		if (testDef.match) {
			expect(result).toBeDefined()
			expect(result?.definition.type).toBe(testDef.output.type)
			expect(result?.url).toBe(testDef.output.url)
		} else {
			expect(result).toBeUndefined()
		}
	})

	test(`getEmbedInfo("${testDef.embedUrl}")`, () => {
		const result = matchEmbedUrl(testDef.embedUrl)
		if (testDef.match) {
			expect(result).toBeDefined()
			expect(result?.definition.type).toBe(testDef.output.type)
			expect(result?.url).toBe(testDef.output.url)
		} else {
			expect(result).toBeUndefined()
		}
	})
}
