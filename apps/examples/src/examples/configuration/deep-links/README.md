---
title: Deep links
component: ./DeepLinksExample.tsx
priority: 4
keywords:
  [
    deep links,
    url,
    navigation,
    viewport,
    search params,
    createdeeplink,
    navigatetodeeplink,
    routing,
  ]
---

Keep the camera position in the URL so links open at the same view.

---

Deep links are URLs that point to a specific part of a document: a viewport, a page, or a set of shapes. Try it here: create a shape, then pan or zoom. The `d` search param in the URL updates as you go, and opening that URL in a new tab returns to the same view.

## The `deepLinks` option

The simplest way to use deep links is the `deepLinks` key of the `Tldraw` component's `options` prop. It keeps `window.location` in sync with a search param that tldraw can navigate to, e.g. `https://my-app.com/document-name?d=v1234.-234.3.21`.

Setting `deepLinks: true` enables the default behavior:

1. When the editor initializes, before the initial render, it checks `window.location` for a search param called `d`. If found, it parses the value as a deep link and navigates there.
2. 500 milliseconds after each camera or page change, it updates `window.location` with the latest `d` param.

You can customize this behavior by passing an options object instead:

```tsx
<Tldraw
	options={{
		deepLinks: {
			// change the param name to `page`
			param: 'page',
			// only link to the current page
			getTarget(editor) {
				return { type: 'page', pageId: editor.getCurrentPageId() }
			},
			// log the new search params to the console instead of updating `window.location`
			onChange(url) {
				console.log('the new search params are', url.searchParams)
			},
			// set the debounce interval to 100ms instead of 500ms
			debounceMs: 100,
		},
	}}
/>
```

For full options see the [`TLDeepLinkOptions`](?) API reference.

## Handling deep links manually

The same functionality is exposed as methods and utilities, which gives you more control if, for example, you prefer not to use search params in the URL.

### Creating a deep link

You can create an isolated deep link string using the [`createDeepLinkString`](?) helper which takes a [`TLDeepLink`](?) descriptor object.

```tsx
createDeepLinkString({ type: 'page', pageId: 'page:abc123' })
// => 'pabc123'
createDeepLinkString({ type: 'shapes', shapeIds: ['shape:foo', 'shape:bar'] })
// => 'sfoo.bar'
createDeepLinkString({
	type: 'viewport',
	pageId: 'page:abc123',
	bounds: {
		x: 0,
		y: 0,
		w: 1024,
		h: 768,
	},
})
// => 'v0.0.1024.768.abc123'
```

If you do prefer to put this in a URL as a query param, you can use the [`Editor#createDeepLink`](?) method.

```tsx
editor.createDeepLink({ to: { type: 'page', pageId: 'page:abc123' } })
// => 'https://my-app.com/document-name?d=pabc123'
```

### Handling a deep link

You can parse a deep link string with [`parseDeepLinkString`](?) which returns a [`TLDeepLink`](?) descriptor object.

You can then call [`Editor#navigateToDeepLink`](?) with this descriptor to navigate to the part of the document described by the deep link.

`Editor#navigateToDeepLink` also can take a plain URL if the deep link is encoded as a query param.

```tsx
editor.navigateToDeepLink(parseDeepLinkString('pabc123'))
// or pass in a url
editor.navigateToDeepLink({ url: 'https://my-app.com/document-name?d=pabc123' })
// or call without options to use the current `window.location`
editor.navigateToDeepLink()
```

### Listening for deep link changes

You can listen for deep link changes with the [`Editor#registerDeepLinkListener`](?) method, which takes the same options as the `deepLinks` option.

```tsx
useEffect(() => {
	const unlisten = editor.registerDeepLinkListener({
		param: 'page',
		getTarget(editor) {
			return { type: 'page', pageId: editor.getCurrentPageId() }
		},
		onChange(url) {
			console.log('the new search params are', url.searchParams)
		},
		debounceMs: 100,
	})
	return () => {
		unlisten()
	}
}, [editor])
```
