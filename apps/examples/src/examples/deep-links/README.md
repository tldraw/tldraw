---
title: Deep links
component: ./DeepLinksExample.tsx
category: configuration
priority: 4
keywords: [basic, intro, simple, quick, start]
---

Allow linking to specific parts of a tldraw canvas.

---

Deep Links are URLs which point to a specific part of a document. We provide a comprehensive set of tools to help you create and manage deep links in your application.

## The `deepLinks` prop

The highest-level API for managing deep links is the `deepLinks` prop on the `<Tldraw />` component. This prop is designed for manipulating `window.location` to add a search param which tldraw can use to navigate to a specific part of the document.

e.g. `https://my-app.com/document-name?d=v1234.-234.3.21`

If you set `deepLinks` to `true` e.g. `<Tldraw deepLinks />` the following default behavior will be enabled:

1. When the editor initializes, before the initial render, it will check the current `window.location` for a search param called `d`. If found, it will try to parse the value of this param as a deep link and navigate to that part of the document.
2. 500 milliseconds after every time the editor finishes navigating to a new part of the document, it will update `window.location` to add the latest version of the `d` param.

You can customize this behavior by passing a configuration object as the `deepLinks` prop. e.g.

```tsx
<Tldraw
	deepLinks={{
		// change the param name to `page`
		paramName: 'page',
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
	}}
/>
```

For full options see the [`TLDeepLinkOptions`](?) API reference.

## Handling deep links manually

We expose the core functionality for managing deep links as a set of methods and utilities. This gives you more control e.g. if you prefer not to use search params in the URL.

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

You can listen for deep link changes with the [`Editor#registerDeepLinkListener`](?) method, which takes the same options as the `deepLinks` prop.

```tsx
useEffect(() => {
	const unlisten = editor.registerDeepLinkListener({
		paramName: 'page',
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
}, [])
```
