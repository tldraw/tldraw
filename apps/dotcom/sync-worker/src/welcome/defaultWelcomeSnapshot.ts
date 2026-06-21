// The committed *default* welcome document — the fallback content a new workspace's first
// file is seeded with when no file is marked as the welcome template (fresh dev/preview/prod,
// before an admin has set one). Once a welcome template file is marked, its published
// snapshot is used instead and this default is no longer consulted. Its canvas is a
// workspace onboarding walkthrough in the brand's illustration style (the Cloudy/Penta
// characters) covering creating a workspace, what a workspace is, inviting your team with an
// invite link, moving files in, pinning files, and managing members.
//
// Stored pre-serialized as the JSON of a RoomSnapshot: the worker writes the string to R2
// verbatim and parses a fresh snapshot per seed, so worker isolates don't pay object-graph
// evaluation at cold start and no mutable snapshot object is shared between rooms.
//
// Schema migrations are handled for you: welcome.test.ts keeps this file baked at the
// current schema, so when a migration touches these records the test fails and `yarn test -u`
// re-bakes the literal below. Only redesigning the default canvas needs a manual re-export:
// open a file in the app, build the content, run this in the console, and rebuild the
// RoomSnapshot JSON between the backticks below ({ documentClock: 0,
// tombstoneHistoryStartsAtClock: 0, schema, documents: records.map((state) => ({ state,
// lastChangedClock: 0 })) }):
//
//   JSON.stringify({
//     schema: editor.store.schema.serialize(),
//     records: Object.values(editor.store.serialize('document')),
//   })
//
// Keep only document/page/shape (and asset/binding) records: drop any `user` records and
// reset any `textFirstEditedBy` props to null, since those carry the authoring user's
// identity.
//
// Keep the content near the origin and inside roughly 1200×800 page units: new files open
// at the default camera (no zoom-to-fit on first visit), so the canvas must fit a typical
// editor viewport. welcome.test.ts asserts a coarse bounds envelope for this.
export const defaultWelcomeSnapshotJson = `{
	"documentClock": 0,
	"tombstoneHistoryStartsAtClock": 0,
	"schema": {
		"schemaVersion": 2,
		"sequences": {
			"com.tldraw.store": 5,
			"com.tldraw.asset": 1,
			"com.tldraw.camera": 1,
			"com.tldraw.document": 2,
			"com.tldraw.instance": 26,
			"com.tldraw.instance_page_state": 5,
			"com.tldraw.page": 1,
			"com.tldraw.instance_presence": 6,
			"com.tldraw.pointer": 1,
			"com.tldraw.shape": 4,
			"com.tldraw.user": 1,
			"com.tldraw.asset.image": 6,
			"com.tldraw.asset.video": 5,
			"com.tldraw.asset.bookmark": 2,
			"com.tldraw.shape.arrow": 8,
			"com.tldraw.shape.bookmark": 2,
			"com.tldraw.shape.draw": 4,
			"com.tldraw.shape.embed": 4,
			"com.tldraw.shape.frame": 1,
			"com.tldraw.shape.geo": 11,
			"com.tldraw.shape.group": 0,
			"com.tldraw.shape.highlight": 3,
			"com.tldraw.shape.image": 5,
			"com.tldraw.shape.line": 5,
			"com.tldraw.shape.note": 13,
			"com.tldraw.shape.text": 4,
			"com.tldraw.shape.video": 4,
			"com.tldraw.binding.arrow": 1
		}
	},
	"documents": [
		{
			"state": {
				"x": 64.16205352262674,
				"y": 35.6258760349715,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:-1MrRIPVHWPEZzBmE8KWm",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:yHgOIUpXOB5gz0YmXcFpf",
				"index": "a6zPZnkt",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1486.1757501700376,
				"y": 577.2940892007489,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:V1BFqleQbh6L9mbjAAnPY",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.506074251290214,
					"scaleY": 0.506074251290214
				},
				"parentId": "page:page",
				"index": "b0V6TtxxV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 169.18211057725216,
				"y": 17.230096903059916,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:4iRZc9lPWjGU2leq60YwO",
				"type": "image",
				"props": {
					"w": 21.19576615892475,
					"h": 20.27421110853672,
					"assetId": "asset:-857523386",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "aB3EJlTV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1278.82590113153,
				"y": 194.31034381570316,
				"rotation": 0,
				"isLocked": false,
				"opacity": 0.1,
				"meta": {},
				"id": "shape:_w7h19tPtoV-PKehqItgA",
				"type": "geo",
				"parentId": "page:page",
				"props": {
					"w": 178.37794982727587,
					"h": 15,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "grey",
					"labelColor": "black",
					"fill": "fill",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"index": "b0Ek35xlk5l",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 229.53563550995602,
				"y": 373.67185074726,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:y56ceL6ODJEoRYo1UuSK3",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/hTkAAAAAFD8AAAAAXEAAAAAAdkIAAAAAuEIAAAAAuEIAAAAAl0QAAAAAFEUAAAAA+0QAAAAACEUAAAAA/UQAAAAACEUAAAAAAEQAAAAALkIAAAAAJEMAAAAAF0YAAAAAe0AAAAAArkEAAAAAzUEUMgAAZkFmNgAA0kDhNgAAvUBcNwAAJEAKNwAACj64NgAAuDwUNgAAcTzsNQAAHzuaNQAAPThxMQAAUjgpMAAAcTl7MAAAZjgfKQAAPTZ7MAAAFDjNMAAAFDgfJQAAKTgAAAAAmjkAAAAAcTkAAAAAXD0AAAAA9joAAAAAcTwAAAAAmjwAAAAArjwAAAAAuDwAAAAAuDwAAAAAwzzDMQAAwzvDMQAAwzkfIQAAcTkfMQAA1zdxMQAArjMAAAAArjOuLwAA9jSuLwAA9jSuJwAAmjUfJQAA9jQAAAAAKTQAAAAAezQAAAAAzTQAAAAAHzUAAAAA9jTNsAAAHzX2tAAAzTQfsQAA1zdxsQAA4TYptAAArjMpsAAAzTTDsQAA9jQfsQAASDWupwAAHzUfsQAASDXNsAAAHzUfpQAAezQfoQAAUjQfoQAApDQpsAAAezR7sAAAezDNsAAAKTB7sAAAUjQAAAAAezB7sAAAzTDNsAAAzTAfsQAAHyH2tAAAKbAfsQAA"
						}
					],
					"color": "yellow",
					"size": "s",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "a7vsIGQV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 33.46042767316371,
				"y": 40.8940641697576,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:Mz-I0fvRWbuOyWvjMX6qR",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/Zq4AAAAAIKUAAAAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:UY73tKpPQTAsRRoNV48I-",
				"index": "a4dinZcw",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": -2.2124460045648675,
				"y": -2.409174463167915,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:yiDXFy4hI0WGlp_UEctkk",
				"type": "geo",
				"props": {
					"w": 101.09649694246673,
					"h": 101.09649694246673,
					"geo": "cloud",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "shape:UY73tKpPQTAsRRoNV48I-",
				"index": "a3FwHZWr",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 18,
				"y": 58,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:DmZlv_-_IsXHqkkVVmv3c",
				"type": "line",
				"props": {
					"dash": "solid",
					"size": "s",
					"color": "grey",
					"spline": "line",
					"points": {
						"a": {
							"id": "a",
							"index": "a1",
							"x": 0,
							"y": 0
						},
						"b": {
							"id": "b",
							"index": "a2",
							"x": 244,
							"y": 0
						}
					},
					"scale": 1
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "a4BXUAcG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 54,
				"y": 110.5,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:lfpFH7AAQHIINJVwcRvp7",
				"type": "text",
				"props": {
					"color": "black",
					"size": "l",
					"w": 92.94375,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.6,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "Search..."
									}
								]
							}
						]
					}
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "a69TsGBV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 64.16516239385282,
				"y": 73.64664885518835,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:cQzOUIFCqtK2jpysM6Sjy",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 230,
					"font": "draw",
					"textAlign": "start",
					"autoSize": false,
					"scale": 0.7,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "my files"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "a5NU8E5l",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1416.11857367,
				"y": 377.49172837992217,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:gXyLpDNNQFwwrgqzhIsa5",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/wzUAAAAAcTkAAAAACj0AAAAABUAAAAAAXEAAAAAA+0EAAAAA4UIAAAAASEIAAAAAPUIAAAAA10IftQAA8UH2tAAAwz/DsQAApECFtwAAUkHDtQAAvUBmrgAAqUCuqwAAXEEfpQAAcUEAAAAAuEAfoQAApEAfoQAAe0AAAAAAXEAfoQAAyEMAAAAAAD8AAAAAYUAAAAAAe0AAAAAAlEAAAAAAn0AAAAAAAEAAAAAA9j8AAAAAwz8AAAAAAD0AAAAAzTwAAAAACjwAAAAAPTgAAAAAcTkAAAAAXDkAAAAAADgAAAAAhTcAAAAACjcAAAAACjcAAAAA4TYAAAAA4TYAAAAAuDYAAAAA1zkAAAAAHzUAAAAAjzYAAAAAuDYAAAAAHzkAAAAASDkAAAAAmjkAAAAAmjkAAAAAmjkKMwAAcTlcMwAAjzYAAAAASDkKMwAAjzgKMwAASDUAAAAAjzYAAAAA"
						}
					],
					"color": "yellow",
					"size": "s",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "aSYATNvV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 975.5909864643908,
				"y": 179.74408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:2do0j0vq29ZZo--xyEapz",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "black",
					"size": "l",
					"w": 108.715,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Packing checklist"
									}
								]
							}
						]
					}
				},
				"index": "aLURwIDl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 33.46042767316371,
				"y": 40.8940641697576,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:dqX_VE-CB-Dkynkcd_xTK",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/Zq4AAAAAIKUAAAAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:yHgOIUpXOB5gz0YmXcFpf",
				"index": "a4xip7UU",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 454.1877124011787,
				"y": 213.20252798666849,
				"rotation": 5.969026041820607,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:4AACMc35JSYW8C5w_OMhb",
				"type": "image",
				"props": {
					"w": 28.48327860528218,
					"h": 23.356288456331388,
					"assetId": "asset:67548994",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "page:page",
				"index": "agntMk8V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 893.5909864643908,
				"y": 268.99408605949236,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:BPrZeW-v9cyBUqR1SFEYB",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.8924667937747233,
					"scaleY": 0.8924667937747233
				},
				"parentId": "page:page",
				"index": "aINCXirV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:-1343077252",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.47.40.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjEuNTIiIGhlaWdodD0iMTY0LjczNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQiIHZpZXdCb3g9IjE2MzIuOTcyIDQ5Mi4yMTMgMTYxLjUyIDE2NC43MzUiPjxwYXRoIGZpbGw9IiMxZDFkMWQiIGQ9Im0xNzIwLjAyIDU1NS45NjMtLjg5LS4wMjctMi41NjYtLjA5My0zLjQxMy0uMTEtMy40Mi0uMDYtMy40ODctLjAxLTMuMjMuNDQ1LTIuNDYgMS4xNTItMS45MjMgMS41MTYtMS43NzUgMS43NTYtMS43ODIgMi4wNDMtMS43MjUgMi4yOC0xLjU4IDIuNDUxLTEuNDIyIDIuNjA3LTEuMjY0IDIuNzU1LTEuMDU2IDIuNzU1LS44IDIuNjM2LS41NzkgMi41NjUtLjM1NCAyLjQ4NS0uMTUgMi4yNjgtLjA0IDIuMDY1LjAyIDIuMDc0LjE0IDIuMDgzLjM2MiAxLjk2Ny42MDMgMS44NiAxLjM0OCAyLjQxNCAyLjI5IDIuODA3IDIuMzA2IDIuMTI4IDEuOTI5IDEuNDIyIDEuODc4IDEuMTI1IDEuOTU4IDEuMDA1IDIuMDUuOTA2IDIuMDI3Ljc1OCAyLjg2My43ODggMi45MjUuNjU2IDIgLjI5MiAyLjY5MS4xNTMgMy4wMy0uMDEyIDIuNzMtLjQyNCAzLjA2OS0xLjA2NiAzLjI3NC0xLjY5OSAyLjUwMi0xLjU2OCAxLjYyOS0xLjExNiAxLjY3Ni0xLjIyOCAyLjA2My0xLjc1IDEuODk0LTEuODk0IDEuNC0xLjk5NiAxLjA1OC0yLjE4Mi44NzYtMi4zNTQuNzg1LTIuNDU1LjU3NC0yLjM4LjQzNy0yLjYwMi4yMjYtMi42Ny4wMzgtMi41MDMtLjI4Mi0yLjI0NS0uNjktMi4wNTctLjk0LTEuOTQtMS4xNDctMS44ODctMS40MTItMS45OS0xLjYwNS0yLjA1MS0xLjUzMi0xLjczMy0xLjY2Ni0xLjY1My0xLjg0Ny0xLjc0OC0xLjc4Mi0xLjQyNS0xLjg1MS0uOTk0LTEuOTE4LS44MDQtMS44Mi0uNzk3LTEuNjE2LS45MzctMS42NzMtLjk4NS0xLjg4My0uNjQtLjk3LS4yMDdhMi41NiAyLjU2IDAgMCAxIC43NDUtNS4wNjdsLjk0Ni4xNDUgMS45MjIuNTM0IDIuMDE5Ljk1NiAxLjk0MyAxLjI0IDEuNzg2IDEuMDg2IDEuODA3Ljc4OCAxLjg1OC45IDEuODg4IDEuMjkgMS44MzUgMS42NCAxLjgwNCAxLjgyNCAxLjc1IDEuODQ2IDEuNzI1IDEuOTc4IDEuNzMyIDIuMjAyIDEuNTczIDIuMjQgMS4zMjQgMi4yNTggMS4wOTMgMi4zOTkuNzc2IDIuMTc1LjM3NiAyLjI5NS4wNiAyLjcyOS0uMTY0IDIuOTE1LS4zOSAzLjA1My0uNjA1IDIuNzQ4LS43ODUgMi42NS0uOTgyIDIuNzA1LTEuMTEzIDIuNDQ4LTEuMzE2IDIuMDk5LTEuNjc0IDEuODY0LTIuMjIgMS45NjktMi4yNTcgMS44OS0xLjc1IDEuMzUtMS42NzcgMS4xNjUtMS44MTYgMS4yMzUtMS43OTYgMS4xMS0xLjg3NCAxLjAxNC0xLjk2NS44NjYtMS45MDMuNjE1LTIuNjUuNDA1LTMuMjM4LjA1Mi0yLjUyNi0uMTg1LTIuMDg3LS4yMTMtMi4yLS4zNDYtMi4xODItLjQ3NC0yLjAyNy0uNTYtMi4wMjMtLjY3OC0yLjE4Ny0uODQtMi4yMy0uOTgzLTIuMTQzLTEuMTA5LTIuMDcyLTEuMjUyLTIuMjMxLTEuNTI0LTEuOTg0LTEuNjA5LTEuNDc1LTEuNTcyLTEuMzQ0LTEuNzQ3LTEuMTUtMS45MzQtLjg5My0yLjExNi0uNjQtMi4yNzgtLjMzOS0yLjMzLS4wNjYtMi4yOTEuMTAyLTIuMTc5LjIwMi0yLjE1NS4yOTQtMi40Mi40NjMtMi42NjUuNjcyLTIuNzA4Ljg2Mi0yLjc3NiAxLjA2OC0yLjkxMSAxLjI1OC0yLjk0MSAxLjQwNS0yLjgxOCAxLjU1My0yLjcwMyAxLjY5NS0yLjU2NSAxLjgwNy0yLjM1NSAxLjkwNC0yLjA5NyAyLjMzMi0yLjEwNSAyLjQ1Ny0xLjU3MyAyLjEyMy0uNjE5IDEuOTYyLS4yMDkgMS44NzMtLjAzNiAyLjYzMi4wMDggMy40NzkuMDM3IDMuNDI0LjA4MiAyLjUzOC4wNjcuODkxLjAxYTIuMDY5IDIuMDY5IDAgMCAxLS4wODQgNC4xMzYiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTc1MS44MyA1MjkuOTg1LTEuMDQ1LS4wMTgtMi4wMi0uMDI0LTIuMDIxLS4wMi0yLjEyNS0uMDI5LTIuMjA1LS4wMzQtMi4xNTUtLjAyMi0yLjc1OC4wMjQtMy4xMTIuMDY3LTIuNzA1LS4xNTctMi4zMTUtMS4xNzMtMS4zMDMtMi40NjctLjM3NS0yLjc4Ny0uMDY5LTIuNjE3LjEwOS0yLjQyNy4yNTYtMi4wOC4yMTUtMi4zMzYuMDc1LTIuNDM4LS4xNjItMi4xOS0uODgyLTIuNjA4LTEuNzQ3LTIuODQ5LTIuMzA1LTIuNDU5LTIuNjU1LTEuOTM0LTIuODQtMS4yODgtMi43LS42NS0yLjUzMi0uMjM1LTIuNzMtLjA1NS0yLjYuMTQ4LTIuMjQyLjU2OC0yLjM3NCAxLjAxNS0yLjE3NSAxLjEwNC0yLjM3NSAxLjQ1My0yLjgxNiAxLjg4LTIuNTQgMS44MS0yLjE2OSAxLjY5OC0xLjcyIDEuNjk1LTEuMzkzIDEuNzk4LTEuMzQgMi4wODYtMS4zODMgMi40MTUtMS4zNDggMi41MTYtMS4wNjkgMi4yNi0uNjE4IDEuOTQzLS4yMzIgMi4wOC0uMDAyIDIuNTQ0LjAwNSAyLjUxOC0uMDEyIDIuMTEyLS4wODYgMi4wMDYtLjI0MyAyLjA3Ni0uNDEgMi4xMy0uNjI3IDIuMjQ4LS45MjEgMi4yNS0xLjE4NSAxLjc1MS0xLjU4IDEuMTE0LTEuODY3LjYwMy0yLjIxNS41Mi0yLjcwNi43NjctMi4zNDIuNzEzLTEuOTU4LjU2NC0yLjAxNy41NjYtMi43NTEuNzk3LTIuOTYyLjc4Mi0yLjExLjQ4Ni0xLjg3Mi40MjMtMi41OS41MjQtMy4wNTQuNjMzLTIuNy42MzYtMi4zMDYuNjEyLTEuOTQ2LjY0NS0xLjM3MSAxLjIzMS0uNDI3IDEuOTkuMDM4IDIuNDI2LjA5MiAyLjI5NS4yNTcgMi4yNi40NTIgMi4zMy44NTEgMS44NDMgMS42NzggMS4xMzMgMi4wMDQuNjAxIDEuODYxLjQ5NCAyLjEwNi42MTIgMi4xNjIuNzc1IDIuMDMyIDEuMDQ3IDEuNjgxIDEuMzM3IDEuMzQ5IDEuOTI0IDEuMTIzIDIuNDQyLjc2NyAyLjYxNy41OTIgMi44NDUuNDggMi43MjQuMzE0IDIuNTAzLjE0MyAyLjE4NC0uMTYyIDIuMDExLTEuMTU1IDEuODU5LTIuMTEyIDEuMTM4LTIuMDc4LjcxNy0xLjkyIDEuMDE4LTIuNDMyIDEuNjY2LTIuOTkgMi4zMTQtMi4yNSAxLjkxLTEuNzU1IDEuNzU3LTEuODUzIDIuMDk5LTEuMjI2IDEuOC0uNTg4IDIuMDM5LS4yMjkgMi42MjktLjEwOSAyLjc1MS0uMDQ1IDIuNjgyLS4wMjkgMi43NDMuMTQ2IDIuNTg4LjQ4NyAyLjIwNi45MyAxLjk5NyAxLjU0NSAxLjc1IDIuMDkgMS4zOTUgMi4xOCAxLjA3NSAyLjMxLjk1NiAyLjQ1Ljg1NiAyLjQwMS41MTQgMi43ODguMjU1IDIuNzk0LjAyNSAyLjMyLS4yODcgMi40MjEtLjY0IDIuOTI2LTEuMDE1IDMuMjYtMS4zMzIgMi45ODctMS40MDIgMi42NDktMS4zMyAyLjc5MS0xLjI1MyAyLjctMS4wNiAyLjI1NC0uNzY4IDIuMjAxLS40OCAyLjM3My0uMjI3IDIuNjI4LjAyNiAyLjY5LjMyIDIuNTQ0LjYxIDIuNTAyLjc4NyAyLjUxLjkzNyAyLjQ1IDEuMTIgMS45OTggMS4xNTIgMS42IDEuMjkyIDEuMzkxIDEuNjk3IDEuMTY4IDEuOTM3IDEuMDU5IDEuOTM0IDEuMDQ0IDEuODM0IDEuMjc0IDEuNzI0IDEuNDEzIDEuNTQyIDEuMzUzIDEuNDk4IDEuNDYzIDEuNjM3IDEuNDQzIDEuNjUgMS4zODIgMS42IDEuNDI4IDEuNDE1IDEuNjEtLjAzOCAxLjY4Mi0xLjE3IDEuOTIyLTEuMTgxIDIuMDM5LTEuMjM4IDEuODgyLTEuMjE5IDEuNzA4LTEuMjkyIDEuNTctMS4zMDcgMS42OTctMS4zNjIgMS42OC0xLjMzMiAxLjYxNy0xLjUwNiAxLjM2Mi0xLjc3LjczMy0yLjA0Mi4xODUtMi4zNzQuMTE0LTIuNjk4LjM0Mi0yLjU4My42ODktMi4yOC45MzYtMi4wNSAxLjA4Ni0xLjcyNyAxLjMwMi0xLjUxNyAxLjU1LTEuMjExIDEuODMtLjgyNyAyLjI3Mi0uNDY4IDIuNTIyLS4xODcgMi42MTItLjAxNCAyLjcyOC4wMjggMi43OTcuMTIyIDIuNzguNDExIDIuMzg0LjY5MiAyLjI3NS44NjkgMi4wODUuODQ4IDEuNzcyLjcxMiAyLjA3NS43MiAyLjIzLjUyIDEuNDU0LS43MzIgMS4xNzYtMS44NjYgMS43MTgtMi4yNDcgMS44NzktMi42NzQgMS40ODQtMi4yNCAxLjI5Mi0yLjA2NiAxLjI4Ny0yLjE5Ljk2OC0xLjg3OC42ODUtMi4wNC4yNzItMi4wNzkuMDE2LTIuMTY5LS4yOTMtMi4xMTMtMS4xNC0xLjk3My0xLjU1Mi0xLjgzMi0xLjQ2OC0xLjUwMi0xLjYyMy0xLjQ0NC0xLjkxNS0xLjQ1OS0xLjkwNS0xLjE4NC0xLjkxMi0uODYtMi4xNjgtLjY3My0yLjE3NS0uNTMtMS45NzgtLjcxLTEuNzItMS4yNi0xLjE5My0xLjkyOC0uNDE4LTIuMzczLS4wMzktMi40ODYuMDk4LTIuNTc3LjMzMS0yLjM5My42NTYtMi4zNy44MzctMi4yNzQuODU2LTEuODIgMS4xNTMtMi4wNDEgMS40NTYtMi4wOCAxLjY5Ni0xLjk1MyAxLjY5Mi0xLjc2NyAxLjQ5LTEuNTExIDEuNTgzLTEuNjA0IDEuNTM1LTEuNTcgMS4zNjItMS40OCAxLjM4MS0xLjU4IDEuNjA2LTEuNzczLjg4Mi0uOTMyYTIuMzQ4IDIuMzQ4IDAgMCAxIDMuNDQ0IDMuMTkxbC0uODI1LjkxLTEuNTM0IDEuNzUtMS40MDUgMS42MjktMS40MTggMS41NTUtMS41NzggMS42Ny0xLjU0NyAxLjYzNS0xLjQwOSAxLjQ3NS0xLjYwMiAxLjcxNC0xLjY1IDEuOTMtMS4zMTYgMS45NDQtMS4wODQgMi4xODMtLjg1NiAyLjIzOC0uNTQ0IDIuMTM0LS4yMzkgMi4yMTgtLjAwNyAyLjI3OC4yODQgMi4wNSAxLjE3NyAxLjE3NiAxLjg1Ny41MiAyLjA2LjYxIDIuMTMxLjg2OCAyLjE0IDEuMTgyIDEuOTk5IDEuMzQzIDEuODA1IDEuNDE4IDEuODUzIDEuNjI2IDEuNzIgMS43MjIgMS42MjIgMS44NDIgMS40MSAxLjk4Ljg0NCAyLjA3OS4yNzggMi4zNy0uMDM4IDIuNDc0LS4xNTQgMi4xMTktLjUyMyAyLjE0Ny0xLjAzIDIuMzg2LTEuMTggMi4wNzctMS4zMiAyLjE4OS0xLjY5MiAyLjg4LTEuODY0IDMuMTM0LTEuODA2IDIuODA2LTEuNzUgMi40MTgtMS41NiAxLjg4Ni0xLjkyIDEuMTE2LTIuMjYuMjUtMi4xNDYtLjQ1OC0yLjM5Ni0uODAyLTIuMjkyLS44NjItMi4xOTItLjkxNS0yLjM5My0uOTk4LTIuMTMtLjcwNi0yLjEzMi0uMjkyLTIuNTU3LS4wNDctMi42NzguMDU4LTIuNDUuMDg3LTIuMjcyLjI1NS0yLjA1Ni43NTgtMS40NzIgMS4zOTItMS4wNDggMS45MzUtLjY3OSAyLjMzOC0uMjIzIDIuMzcyLS4wMjQgMi4wNjYtLjA4NCAyLjAwOS0uNDQgMi4xOS0uODY3IDEuOTk0LTEuMTk1IDEuNzU0LTEuMzk5IDEuNjExLTEuNTM2IDEuNDE4LTEuNzYgMS4zOTgtMi4wNTcgMS42NS0xLjk5NiAxLjY1NC0xLjcwOCAxLjI4MS0xLjgxMSAxLjE2OS0xLjkxMSAxLjE5My0xLjg2OSAxLjE5My0xLjk5NyAxLjI2NS0yLjA3MSAxLjAwMy0xLjk1NS4yNjMtMS44MjItLjU3NS0xLjY1Mi0xLjE3NS0xLjQ1Mi0xLjQxNS0xLjM1LTEuNTA1LTEuNDM0LTEuNjY4LTEuNTA1LTEuNzgyLTEuMzk5LTEuNjE0LTEuMzc2LTEuNTEtMS4zMzctMS42MzgtMS4xMzMtMS44MzctLjk4OC0xLjkxLS45NDQtMS44OTktMS4wMTMtMS43NTQtMS42MTEtMS40ODUtMi4xMTctMS4xNzUtMi4yNTUtLjg5OC0yLjI1OC0uNzQ1LTIuMTc3LS41OS0yLjQ0LS40MzgtMi4yNTgtLjE4My0xLjkzNC0uMDEtMi4xMjMuMjU3LTIuMjc1LjYzMy0yLjQ4OS45My0yLjYzMSAxLjE1My0yLjY2MSAxLjI5NS0yLjI2MyAxLjEyMS0yLjU2NiAxLjE5Mi0yLjU2MyAxLjEwNi0yLjM4LjgzMi0yLjk0My43NTQtMi44ODcuMzMyLTMuMTYzLjAyOC0zLjMxMi0uMjM3LTMuMDE2LS42MTEtMi43NTgtLjktMi41MzctMS4wMDMtMi4xMDMtMS4wMDEtMS44NTctMS4xMi0xLjY4MS0xLjI5Mi0xLjM0Ni0xLjUzNC0xLjE2LTEuOTQzLS45MjctMi4zNjctLjYwMi0yLjI3Ny0uMjMzLTIuMzQ4LS4wMy0yLjc1OS4wMDItMi43NTIuMDMyLTIuNzIzLjE3Mi0yLjY3My4zMjUtMi4yMzcuNTYyLTEuODkuOTk1LTEuODI3IDEuNDgtMS44NjUgMi4wNDctMi4yNSAxLjg2OS0xLjkyNSAxLjUyLTEuNTE2IDEuNTczLTEuNTA4IDEuNDgtMS4zMDQgMS40Ni0xLjIyNiAyLTEuNDUyIDIuMzU5LTEuMzUyIDEuOTYxLS4xNi44NzQtLjc0NC0uMDc1LTIuMDMtLjMtMi4xNjYtLjUyOC0yLjU0Ny0uNjItMi41MDUtLjgzLTIuNDA4LTEuMTQtMi4wNTgtMS41My0xLjI2Mi0xLjc5LS43NTUtMi4xMzgtLjY1Mi0yLjE5My0uNjA3LTEuODU0LS41MjItMS43ODUtLjY5My0xLjcwMy0xLjE3OC0xLjQ0OC0xLjgwOS0uOTYtMi4yNTMtLjU4My0yLjYxLS4zNzQtMi41MzMtLjE5OC0yLjIxOS0uMDYyLTIuMjc3LjAyNC0yLjE0LjA5Ny0xLjk1OS43NTktMi4wMzcgMS42MzctMS42MjcgMS45ODMtLjkyNSAyLjAzLS42MjcgMi4xNzktLjUyIDIuNjM0LS41NTcgMi45NTMtLjU3NCAzLjIxLS42MTIgMi42MjEtLjU4NSAxLjk4OS0uNTYzIDIuODEzLS45IDIuNjY5LS45MDUgMS45Mi0uNzA0IDEuODY3LS43MTYgMi4zOS0uOTA0IDIuOTI0LS45NDYgMi4zODYtLjQ5MiAxLjQ1OC0xLjAyNC44NTItMi4wMzYuNi0yLjQ2NC4zMzgtMi42MS4wOTktMi4zNC4wMDQtMi4xNDcuMDI4LTIuMzk2LjEyNS0yLjQwOC4zMjUtMS45OS42MjYtMS45MTIgMS4wMjktMi4yNzUgMS4zMjQtMi41NzEgMS40NTktMi42NTQgMS41MzgtMi41IDEuNjY3LTIuMjQ1IDEuOTYtMi4wNzUgMi4yNTUtMS44NTcgMi41LTEuNzk2IDIuNzgyLTEuOTEgMi4yNS0xLjUwNiAxLjc2MS0xLjE1NCAyLjQzNS0xLjMyOCAyLjk2Ny0xLjIwMyAzLjA2OC0uNjgyIDMuMDQyLS4xMzUgMi45OTcuMTI4IDIuOTc3LjM4IDIuNDI1LjU0NCAxLjg1MS42MSAxLjc1NC44MDQgMS43MTUgMS4wMTggMS43IDEuMjEzIDEuNTgyIDEuMzM3IDEuNDM4IDEuNDc1IDEuMzE4IDEuNjE3IDEuMTY2IDEuNzM4IDEuMDc2IDIuMDUyLjc5MyAyLjgwNy4yNDQgMi43ODctLjA4MiAyLjIwNS0uMjEzIDIuMTQ4LS4zNjIgMi4zNjItLjIzMSAyLjQ4LjAxMiAyLjM2My41MzIgMi4wNzggMS44ODMuOTQzIDMuMTEyLjA2NyAyLjc1OC4wMjQgMi4xNTUtLjAyMiAyLjIwNS0uMDM0IDIuMTI1LS4wMyAyLjAyLS4wMiAyLjAyMS0uMDIzIDEuMDQ1LS4wMThhMS45NjEgMS45NjEgMCAwIDEgMCAzLjkyMyIvPjxwYXRoIGZpbGw9IiMxZDFkMWQiIGQ9Im0xNzg1Ljc5OCA1NDguNDE2LjUxLS42MTkgMS4wOTMtMS40MDQgMS4xMzQtMS42My4wOC0yLjAyMS0uOTQ3LTIuMTM3LS45OC0xLjgxNi0xLjA4OC0xLjYzLTEuMjgtMS41MDUtMS42NC0xLjI4MS0xLjk5Ni0uOTU4LTIuMTQ3LS43MzMtMi4xMDgtLjUyLTIuMDY2LS4zMDQtMi4wMTUtLjIxMS0yLjM0Mi0uMjIxLTIuNjAzLS4yMjgtMi4yMDYtLjEzNC0xLjk1Mi0uMDI4LTIuMDgzLjAwOS0yLjA0OC0uMDA4LTIuMDE4LS4xMy0yLjI0NS0uMTk2LTIuMTE4LS4wOTQtMi4zNzUtLjQ3Ni0xLjQyMi0uNDY0YTIuNTUyIDIuNTUyIDAgMCAxIDIuMDk0LTQuNjU0bDEuMTYuMjQgMi4xMDYuMjk0IDIuMDcxLjExNSAyLjE4OS4yMjYgMi4wODUuMTc1IDEuOTkuMDIxIDIuMDM3LjA0MSAyLjI2Ny4xMzUgMi4xMy4xNzcgMS44NzEuMTQ0IDIuMzI2LjE5MiAyLjU4OC4yOTYgMi40OS40OCAyLjUxMy43MDYgMi4xNDIuNzc3IDEuODcxLjg5OCAyLjE3NSAxLjU4OSAyLjA1NCAyLjEgMS40NjMgMi4wNjIgMS4xODIgMi4wODUgMS4wMTEgMi4wMjQuODI1IDEuOTI2LjI2MiAyLjE5Ny0uNTk2IDIuMDgxLTEuMDUzIDEuNjA0LTEuMTkxIDEuNTctMS4xMTIgMS40NDctLjQ4NC42MzlhMi4yOTcgMi4yOTcgMCAwIDEtMy42MDQtMi44NDgiLz48L3N2Zz4=",
					"w": 162,
					"h": 165,
					"fileSize": 11985,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 50,
				"y": 121.60000000000001,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:CgxkbvCMvVJa4ENt8mol1",
				"type": "geo",
				"props": {
					"w": 353.6,
					"h": 217.60000000000002,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a2xn1u4V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 752.1908135744923,
				"y": 157.64410545204407,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:mc6_U2WU_l4K7SQPcQCr3",
				"type": "image",
				"props": {
					"w": 15.782372204604252,
					"h": 13.86935739192495,
					"assetId": "asset:455614914",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "page:page",
				"index": "b0dMYoSFV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 48.67778428035788,
				"y": 45.845293550392626,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:HyuJQ7tCG2cyP6DRLHTAV",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/w60AAAAAAAAAAAAAwzEAAAAAuDIAAAAAezQAAAAAUjQAAAAARjUAAAAA2DcAAAAAfDgAAAAAPDoAAAAAzDoAAAAAuDoAAAAAsDkAAAAAIDkKrwAAsDkAtAAAuDiPtgAAEDg+tgAAEDgotAAAoDQYsgAAgCwYsQAAgDJ4sQAAQDMosAAAgC5wsQAAADCgrwAAADBwsQAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:yHgOIUpXOB5gz0YmXcFpf",
				"index": "a9gMeN4V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:455199171",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-17 12.00.32.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDQuMDMiIGhlaWdodD0iMTU0LjY5OSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQiIHZpZXdCb3g9IjEwMTMuODc0IDY3MS41NDggMTA0LjAzIDE1NC42OTkiPjxwYXRoIGZpbGw9IiM5ZmE4YjIiIGQ9Im0xMDg2LjU5NyA2OTMuMzI0LTIuNjY4LS4wMzgtNi42ODgtLjAyMi04LjUyLjA4Mi04LjY0MS4xNTYtNy43NjQuNDc3LTcuNTQzLjgxNC01LjgyMy44LTEuOTAyLjM3MWE5LjI0NyA5LjI0NyAwIDAgMS0yLjc4OS0xOC4yODNsMy4zNDEtLjM2NyA3LjExNS0uNzEgNy40OTgtLjQxIDcuODY3LjAyMiA4LjY0Mi4xNTYgOC41Mi4wODIgNi42ODctLjAyMiAyLjY2OC0uMDM4YTguNDY1IDguNDY1IDAgMCAxIDAgMTYuOTNtLTQzLjA2Mi0xMS4zMzggMS43MDUgMi44MjIgMi45NjMgNi40NDUgMi41OTEgNi44NDIgMS40NzQgNi45ODcuMTQ4IDcuMzA0LS4wMDggNy4zMi0uMDI4IDcuOTM2LS4wMiA3LjczNi4wMTQgNy4xMTkuMDQ1IDYuOTc5LTEuMDM3IDYuNzgtMi45MjkgNi4yODktMy45NjggNi4wMDctNC44NTggNS4zODUtNi4yNDMgMi44ODItNi4xOTIuNzMtMi43MDIuMTc1YTkuODIgOS44MiAwIDAgMS0xLjI0NS0xOS42MDJsMy4wMDMtLjgzMyA0Ljk1Ni00LjAyNCAxLjk3OC02Ljc4My4wMy03LjM0NS0uMDAxLTcuNTgtLjAyNy03Ljk4Ni0uMDIyLTguMjQzLS4yNDgtOC4xNDEtMS44MjgtOC40MjctMi40NDgtNS43MzQtLjg2Ni0xLjM2N2E5LjI0NyA5LjI0NyAwIDAgMSAxNS43NjMtOS42NzNtLTE4LjcyIDc2LjE2MiAyLjAzOC4yMTMgNS43Ny4yNDUgNy4yNjkuMjg3IDcuNjcuODQgNy45MzEgMS4yNSA4LjM0NCAxLjQwMyA5LjAzMyAxLjQ5IDguMzM1IDEuMjQ4IDcuMzkzLjY1NyA3LjE0NC41NTMgNy43NjQuMjgzIDQuMTYzLS4xMDdhOS42MTcgOS42MTcgMCAwIDEgLjQ2NyAxOS4yMjlsLTMuMjY3LjAxNi02LjgxNy0uMjMzLTcuMzA1LS42MzQtNy42ODMtLjg2Mi03LjY5Ny0xLjA2NS04LjM3NC0xLjI2Ny05LjMzOC0xLjM2Ny04LjQ1OC0xLjE2My04LjI4NS0uNzI4LTguMzItLjIyNC02LjcxNy0uMjQzLTIuOTU2LS4yNzFhOS44MiA5LjgyIDAgMCAxIDEuODk3LTE5LjU1bTc1LjA3IDIzLjI4OS0xLjU0NC0yLjMtMy41MTgtNS40OC00LjI5LTYuMjg0LTQuMzk5LTUuOTA1LTMuMTMzLTYuMTA0LTEuMTctNi44OS0uMTE2LTcuNDQ3LS4wMDgtNy41MjgtLjAyLTcuMzM5LS4wMDctNy4zMjUuMzc3LTcuNTIyLjg3My03LjYzLjk2My03LjM0IDEuMjU4LTYuOTA0IDQuMDktLjg2Ni0uNDYgMy4wMjQtMy43NTYuNTY4YTkuODYgOS44NiAwIDAgMS0yLjIzMS0xOS41OTJsMi40MDgtLjMwMiA1Ljk1Mi0uNDk3IDcuMTMyLjkxOCA1LjcyNiA1LjczIDEuNzY0IDguMDMxLTEuMjQ4IDcuMDEtMS40MDUgNy42MDMtLjk5NyA3LjYwNi0uNTg2IDcuMDI0LS4xMjYgNy4xNzctLjAxNyA3LjQ3My0uMDE0IDcuMzc4LS4zMjQgNy4yMTUgMi4wNjIgNi4zNzcgNC4yMTIgNS44MDYgMy43IDYuMDM1IDMuMzggNS4zNSAxLjUwNyAyLjMwNWE5LjYxNyA5LjYxNyAwIDAgMS0xNi4wMzQgMTAuNjI1Ii8+PHBhdGggZmlsbD0iIzlmYThiMiIgZD0ibTEwNzAuOTU2IDc3MS44MTguMDAyIDIuMTI5LjA3MyA2LjM3My4xNCA3LjcuMTE1IDcuNDk5LjA5MSA3LjYzNC4wNjggOC44OTYuMDIyIDUuMzAzYTguOTIgOC45MiAwIDAgMS0xNy44NCAwbC4wMjEtNS4zMDMuMDY4LTguODk2LjA5MS03LjYzNC4xMTUtNy40OTguMTQtNy43MDEuMDczLTYuMzczLjAwMi0yLjEyOWE4LjQxIDguNDEgMCAwIDEgMTYuODIgMCIvPjwvc3ZnPg==",
					"w": 104,
					"h": 155,
					"fileSize": 2967,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1442.0788356688236,
				"y": 628.6284636540245,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:tlFyNtEV_goUu74b8JdkV",
				"type": "text",
				"props": {
					"color": "grey",
					"size": "s",
					"w": 62.8125,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Owner"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "apU3VwPG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1452.5853250170514,
				"y": 548.0455294971175,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:W1eJ74IRSV95RJO_ddqnf",
				"type": "geo",
				"props": {
					"w": 51.16233399822226,
					"h": 51.16233399822226,
					"geo": "pentagon",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0TXguSBV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 536.0826439658169,
				"y": 594.0367422770219,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:goEOrbvAaCitb3BHiDhYZ",
				"type": "geo",
				"props": {
					"w": 32.188069667497075,
					"h": 32.188069667497075,
					"geo": "ellipse",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0KpTaXBV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 632,
				"y": 130,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:gswfF0O4MlAgYKCkpZu3n",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 150,
					"font": "draw",
					"textAlign": "start",
					"autoSize": false,
					"scale": 0.62,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Invite link"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "au1CmR8V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 829.5909864643908,
				"y": 155.99408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:lQOYWDxZRYO4Rmis_eMeJ",
				"type": "geo",
				"props": {
					"w": 134,
					"h": 56,
					"geo": "oval",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "so tidy"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aFnGdSQV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 430.79999999999995,
				"y": 741.1109146836736,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:SybEK3UEl5UlHjUHCY4ZO",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 532.7580356972542,
					"font": "draw",
					"textAlign": "middle",
					"autoSize": false,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Need to share with people outside your workspace? You can "
									},
									{
										"type": "text",
										"marks": [
											{
												"type": "bold"
											}
										],
										"text": "share a link"
									},
									{
										"type": "text",
										"text": " for a single file so guests can edit it without joining the workspace."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0Cvx0orV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 572.4025912587633,
				"y": 250.3067798250604,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:V2Qpy2tirIThzrOMK1LjK",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 63.625,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Cloudy"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aiejlzul",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 534.3393068478358,
				"y": 569.0908293321241,
				"rotation": 0.26179938779914913,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:pQ7ttlev3Jv-FJ7VHrNew",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/KTAAAAAAhTcAAAAAXDkAAAAAXDkAAAAAMzkAAAAAPTwAAAAASD0AAAAAjz0AAAAAcT8AAAAAzT8AAAAABUAAAAAABUAUsgAA7D5msgAAwz4fpQAAhT0UsgAA9kCFuQAAwzmktAAAXDu4sgAAXDtmsgAAhTuatQAAhTsUuAAAADopuAAA1znstQAAZjg9uAAAPTgpuAAAADgUuAAAADThtgAAFDYUtgAAMzdctwAAwzUAuAAAwzUUuAAAmjU9uAAAADhSuAAAKThSuAAA7DWauQAAcTUpuAAAHzUAuAAAADjXvAAA9jQKvAAAKTCPuAAAzTBSuAAAric9uAAAHyE9uAAAAAA9uAAAAAApuAAAAAAAuAAAAAAAuAAAAACuswAAAACuswAAAAD2tAAAAAD2tAAAAABItQAAAAAftQAAAABItQAAAABItQAAAAAftQAAAAD2tAAAZrYfsQAAALSurwAAzbQpsAAAH7UfqQAArrcfoQAAUrgfoQAAFLYfoQAAj7gAAAAAH7kAAAAAj7gAAAAA17cAAAAAmrUAAAAAj7YAAAAA7LUAAAAA17cAAAAAALgpMAAAw7V7MAAAcbUfMQAASLX2NAAASLX2NAAA9rQfMQAAXLc9NgAArq9cMwAA9rTsNQAAzbT2OAAAH7HNNAAAw7EKOQAAH7HNNAAAH6H2NAAAAAD2NAAAAADNNAAAAACuMwAAAACuMwAAAAD2NAAAAAD2NAAAAAD2NAAAAABINQAAAAAfNQAAAAAfNQAAzTAfNQAAzTT2NAAArjNSOAAArjOuLwAAzTRxMQAA9jQfMQAAHzUfMQAAHzUfMQAAHzUfJQAAwzEfMQAAcTHNMAAAzTQAAAAA9jTNMAAAKTTNMAAArjOuLwAAezQpMAAA9jSuJwAA9jQfIQAAHzUAAAAASDUAAAAAHzUAAAAA9jQAAAAA9jQAAAAAFDwAAAAAPTYAAAAAFDgAAAAASDkAAAAAPTgAAAAAUjgAAAAAcTkAAAAAmjkAAAAAwzkAAAAAFDgAAAAA1zcAAAAA1zcAAAAAmjUAAAAAZjYAAAAAFDgAAAAAADgAAAAAPTjNsAAAcTn2tAAAPThItQAAPTjDsQAAhTnDsQAAADhItQAAFDy4uAAAPTYAtAAAFDhItQAAMzlxtQAAPThxtQAAFDZItQAAFDgAuAAAFDgUuAAAKTjDtQAAADhxtQAA1zcftQAAXDkUuAAAPThSuAAAUjhSuAAAzTquuQAASDszuwAArjuauwAAwzwUvAAAKTzXvAAAKTzhvAAACj0UvQAA7Dz2vAAAwz4fwAAAKTpcuwAAADyuvAAAwzzsvAAAMzzhvAAAMzzsvAAAHzz2vAAAADwUvAAA1zsAvAAAFDzNvAAAhTuauwAAhTuFuwAAcTuPugAA7DnsuQAAPToKuwAAmjuuuwAArjvXuwAAmjtmugAAmjspugAAFDrsuQAAwzlmuAAAhTk9uAAAzTzXvAAAAD5xuwAAADoKtwAAFDoAuAAAezjstQAAADoUtgAAMzsUtgAA1znDtQAArjkUsgAAcTlxsQAAXDlxtQAAUjhxsQAAPTgpsAAAcTnNsAAAhTkfqQAArjkfpQAArjkfoQAAwzkfoQAAcTsAAAAAcTsAAAAAmjkfoQAAZjwAAAAA7DUAAAAAXDcAAAAAhTwAAAAA4TYAAAAA1zcAAAAAcTUAAAAAFDgAAAAAADgAAAAAHzUAAAAAzTQAAAAArjMAAAAArjMAAAAAzTQAAAAASDUAAAAAcTUAAAAAHzF7sAAAAABStAAAAAAfpQAAAACuMwAAAABSNAAAAAD2NAAAAAAfNQAA"
						}
					],
					"color": "light-blue",
					"fill": "fill",
					"dash": "dashed",
					"size": "s",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "b0HzOyrEl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 54,
				"y": 150.5,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:HsfUzpGWXgKPgvnh3HDeq",
				"type": "text",
				"props": {
					"color": "black",
					"size": "l",
					"w": 217.59375,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.6,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "Workspace settings"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "a7pYw5OV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 811.6,
				"y": 121.60000000000001,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:B_C5zXkYgtURD3tHZo1O9",
				"type": "geo",
				"props": {
					"w": 353.6,
					"h": 217.60000000000002,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a6LoYDUl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 444.40000000000003,
				"y": 363,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:mNRs-dGysnFu1oJEqs0R0",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 480,
					"font": "draw",
					"textAlign": "middle",
					"autoSize": false,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"marks": [
											{
												"type": "bold"
											}
										],
										"text": "Invite your team"
									},
									{
										"type": "text",
										"text": " with an invite link from the workspace menu in the sidebar. Shared it by accident? Revoke it there too."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aAzCZsIG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:67548994",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shape_SXsRDeohE0RI1yYgxjxec at 26-06-16 16.48.18.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MC4zMDYiIGhlaWdodD0iNDEuMzI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudCIgdmlld0JveD0iNTgyLjMwNSA2MjIuMTExIDUwLjMwNiA0MS4zMjYiPjxwYXRoIGZpbGw9IiNmY2ZmZmUiIGQ9Ik01ODYuMTM0IDY1Ni45NzJWNjI5LjE5cTAtLjI4My4xNjMtLjI4dC43MjYuNDY5IDMuMTIxIDIuOTE5IDQuNDI1IDQuMjUgMy4wNDQgMi45MzUgMS44MiAxLjc1NiAxLjEzNC43OCAxLjEyOC0uMTk0IDIuNzE1LTIuNjUgMy41NzktMy45ODYgMi40NTctMi43ODYgMS40ODItMS42OTIuODc3LS43MDMuNjYyLjE4IDEuMDEzIDIuMDk0IDEuMjA0IDMuMTM0Ljg0IDIuMjY4LjUyNyAxLjQ1LjQxNS42MDEuNjg5LS4zNTYgMi4zMDItMy4wMzggMy4xOC00LjQ5NiAyLjE5My0zLjEzIDEuMzIxLTEuODkuNzItLjgwMS4zOTQuOTEuMjMyIDYuOTIzLjE0NCAxMC4xOTMuMDgxIDYuODkxLjA0NSAzLjk3Ny0uMjAzIDIuMTYzLTEuNzA0IDEuMTc2LTguNzc0LjY0LTEyLjg1LjM0OS0xMi4xOS4yNjktNi43NzIuMTMxLS4xNC0yLjY3MyIvPjxwYXRoIGZpbGw9IiNmMWFjNGIiIGQ9Im01ODIuNDE2IDY1OS42My4xMDgtMi42NTguMjQtNS41NDYuMi01LjYxNC4wNS01LjAyNC0uMTYyLTUuNDEtLjI4NC00Ljc5Mi0uMTQxLTEuNjgyYTMuNzA3IDMuNzA3IDAgMCAxIDcuNDE0IDBsLS4xNDIgMS42ODItLjI4NCA0Ljc5My0uMTYxIDUuNDA5LjA1IDUuMDI0LjE5OCA1LjYxNC4yNDEgNS41NDYuMTA5IDIuNjU4YTMuNzE4IDMuNzE4IDAgMCAxLTcuNDM2IDBtNi4xODItMzMuNDk1IDMuMjQ0IDMuMDY1IDUuMDY3IDQuOTEyIDQuMDI0IDMuNDQ5IDIuMiAxLjZhMy42NiAzLjY2IDAgMCAxLTQuMTQ0IDYuMDM1bC0yLjQyNi0yLjIzMy00LjMzNS0zLjk4LTUuMjMzLTQuNTI5LTMuMzI2LTIuNzhhMy43MDcgMy43MDcgMCAwIDEgNC45MjktNS41NG05LjkwNiAxMy40MjQgMi43NC0yLjQ3NyA0LjIyOC00LjE1IDMuNDMzLTMuNzkzIDEuOTQzLTIuMTIzYTMuNjk2IDMuNjk2IDAgMCAxIDQuNjI1IDUuNzY2bC0xLjczMSAxLjQ3Ni0zLjIzNyAzLjE4Ni00LjE5NyA0LjUzMi0yLjY5IDIuODIyYTMuNjYgMy42NiAwIDAgMS01LjExNC01LjIzOW0xNy45ODMtMTEuMjcgMS4xMDEgMi4yMTMgMi4yNTcgNC45OTQgMS4xNTUgMi43OGE0LjAwNSA0LjAwNSAwIDAgMS03LjUyNyAyLjczOGwtLjg5NS0yLjc3OS0xLjgyLTQuNzUyLS45MjUtMS45NzRhMy42OTYgMy42OTYgMCAwIDEgNi42NTQtMy4yMm0yLjIwNSA3LjYyNS4yMzYuMDcxLjIzNi4wNzJhNC4wNDMgNC4wNDMgMCAwIDEtMi45MzggNy41MzNsLS4yMjItLjEwNy0uMjIyLS4xMDdhNC4wMDUgNC4wMDUgMCAwIDEgMi45MS03LjQ2Mm0tNC4yMiAxLjQ2NyAyLjQyNC0yLjg3NiAzLjc5LTQuNzQ3IDIuOTgtNC4xNDkgMS42MTEtMi4yNzhhMy44MjcgMy44MjcgMCAwIDEgNS42OTQgNS4xMTVsLTEuNTM3IDEuNzcyLTIuODQ2IDMuNzExLTMuNDg5IDUuMTM4LTIuMTgyIDMuMTk5YTQuMDQzIDQuMDQzIDAgMCAxLTYuNDQ0LTQuODg1bTE3LjQ0NS0xMi4wMDUuMTg3IDEuMDQuMDkgNy4xNTItLjIwNSAxMC40MzUtLjExMSA2LjkwMS0uMDYgNC45MTktLjA1NCAyLjM0YTMuNDM0IDMuNDM0IDAgMCAxLTYuODM4LS42NDNsLjM1Mi0xLjk4NS4yOS00LjU1OS0uMjc1LTYuODgtLjQ5MS05Ljk1My0uMzc1LTYuNjkzLS4wOTUtMS4wNWEzLjgyNyAzLjgyNyAwIDAgMSA3LjU4NS0xLjAyNG0tMi42NDkgMzUuNzczLTEuNDguNDcxLTkuMTg3LjU5Ny0xMy4yODIuMTI1LTEyLjIwOS4wNTUtNi42MzQuMDU1YTIuNzkzIDIuNzkzIDAgMCAxLS4xMjMtNS41ODRsNi42My0uMjM4IDEyLjE3MS0uNDgyIDEyLjQxNy0uNTcyIDguMzYyLS42ODQgMS40ODgtLjM1OGEzLjQzNCAzLjQzNCAwIDAgMSAxLjg0NyA2LjYxNSIvPjwvc3ZnPg==",
					"w": 50,
					"h": 41,
					"fileSize": 3133,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1294.7430635705782,
				"y": 177.67000819781413,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:9AKUXIWXK4Kh-nieFrPuW",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "grey",
					"size": "l",
					"w": 42.78953125,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Pinned"
									}
								]
							}
						]
					}
				},
				"index": "b0EjkzfbCi",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": -2.2124460045648675,
				"y": -2.409174463167915,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:v9UPVrYMezj8TZq-0HPe_",
				"type": "geo",
				"props": {
					"w": 101.09649694246673,
					"h": 101.09649694246673,
					"geo": "cloud",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "shape:yHgOIUpXOB5gz0YmXcFpf",
				"index": "a3yfVZgO",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 78.11524967460176,
				"y": -0.6499373065478267,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:TCcncoOEZ3slOa85zkaWc",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/"
						}
					],
					"color": "black",
					"fill": "none",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "b0mE0xnuV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 105.70000000000006,
				"y": 227.20000000000005,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:JcQ824JW6ZnGGqjecw9ze",
				"type": "group",
				"parentId": "page:page",
				"index": "aqBz9zfd",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1250.5659746263786,
				"y": 163.92000819781413,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:TOe4A6TOyd1e-cYXerdOE",
				"type": "geo",
				"props": {
					"w": 234.44013758668294,
					"h": 145.77951664952835,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0EjhL2FOp",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 15.054706464867195,
				"y": 241.35688531455935,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:FNTnbSWrpEBQ_Aa79YvZm",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 480,
					"font": "draw",
					"textAlign": "middle",
					"autoSize": false,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Create a new workspace"
									},
									{
										"type": "text",
										"text": " from the workspace menu in the sidebar. Click "
									},
									{
										"type": "text",
										"text": "New workspace",
										"marks": [
											{
												"type": "bold"
											}
										]
									},
									{
										"type": "text",
										"text": ", give it a name, and it’s ready to go."
									}
								]
							}
						]
					}
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "a2cIK01V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 472.9586359108573,
				"y": 168.4343589779321,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:zyE9Lc11N5hDr-Ma7LmJM",
				"type": "geo",
				"props": {
					"w": 150,
					"h": 58,
					"geo": "oval",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "join us!"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aczhfxnl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 658.6843076106913,
				"y": 659.146689854111,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:ARxpLQSKrPYl5p4xhnoZG",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 44.421875,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "neat"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0LIlENFV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 0,
				"y": 0,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:LvccJCoD1JiYvTG8kB9d2",
				"type": "geo",
				"props": {
					"w": 63.99999999999999,
					"h": 63.99999999999999,
					"geo": "arrow-down",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "shape:JcQ824JW6ZnGGqjecw9ze",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1323.9408031560263,
				"y": 623.364262687267,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:WRaUwEXLrVQmMkOUxY4cE",
				"type": "geo",
				"props": {
					"w": 196.67313508595362,
					"h": 78.83573731273304,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "grey",
					"labelColor": "black",
					"fill": "fill",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aZD9E2wV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 638,
				"y": 157,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:xe64eXHwEIhXp6yJaj9FN",
				"type": "text",
				"props": {
					"color": "grey",
					"size": "s",
					"w": 100,
					"font": "draw",
					"textAlign": "start",
					"autoSize": false,
					"scale": 0.58,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "https://..."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0cfSzL4l",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1436.0846775187026,
				"y": 546.6614103680689,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:JdgvoDjTbsWZV4834DA15",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 33.1875,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.5733759593376321,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "bye"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0XLMt3DV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1274.7430635705782,
				"y": 231.67000819781413,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:PmjNvBHnFZcJ85DnLkzTO",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "grey",
					"size": "l",
					"w": 37.330937500000005,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Today"
									}
								]
							}
						]
					}
				},
				"index": "b0EjvFGZFx",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:-1893437903",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-17 12.21.10.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNzYuMjkxIiBoZWlnaHQ9IjE2My4wMDciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50IiB2aWV3Qm94PSIxMDI2LjkwMSA3MDYuMTQzIDI3Ni4yOTEgMTYzLjAwNyI+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTExMDAuNDY3IDcwOS4zNzMgMy45NiAxLjQ2NiA4LjkyNSAzLjQyIDExLjUxMiA0LjMwOSAxNS4wNCA1LjE5NyAxOC40NzYgNi4xMjMgMTkuMzYgNi40NDIgMTguMDI1IDYuMDgyIDIwLjAwMyA2Ljc3NyAxOS40NSA2LjY2NiAxNC40ODUgNS4wNTcgMTEuODk1IDQuMjEgMTAuMTQ0IDMuNTQgOC4zMjkgMi43NzQgOC45MTIgMi45ODcgNy45OTIgMy4yNTcgMi43NzIgMS40NjVhNi4yNzUgNi4yNzUgMCAwIDEtNy4wNzMgMTAuMzY4bC0xLjUzMy0xLjQ3Mi02LjItMy44NjQtOC4xNTEtMy45MzMtOC4wMTUtMy4yOS0xMC4wMzYtMy42Ny0xMS44ODYtNC4xMTYtMTQuNDc1LTQuOTI4LTE5LjQ1NS02LjQ5NS0yMC4wNDItNi41NTMtMTguMDYzLTUuNzctMTkuNDM0LTYuMDI0LTE4LjY4Ny01LjU4OC0xNS4zOTYtNC40OTktMTEuOTgtMy40NTItOS4yMTctMi44Ni0zLjk5OC0xLjM2NGE2LjUwNyA2LjUwNyAwIDAgMSA0LjM2LTEyLjI2Mm0xOTguMDMgODAuOC0yLjQwMiAxLjA3OC03LjA5OCAyLjE1OS0xMS4wODIgMi40Ni0xMS41NDYgMi4zNC0xMS44MzkgMi4zNDUtMTQuMDM4IDIuOTgzLTE3LjI0IDMuODQtMTguOTQzIDQuMzg3LTE3LjQyNCA0LjIxNC0xNi4xMzYgMy45NzktMTQuNDk4IDMuNjE0LTEyLjY4MiAzLjI5Mi0xMS44MTUgMy4yMzgtMTEuMzg1IDMuMzQ2LTEwLjc2MiAzLjQyNS0xMC4wOTkgMy41NDctOC44MzggMy41NS03LjMzNSAzLjMwMi02LjQ3NiAzLjA1LTguNTU5IDQuMjE3LTguNzY0IDQuNjAzLTYuNzgzIDMuODYyLTYuNjI1IDMuODQ1LTcuMTY5IDIuMjUyLTcuNTEtMi42ODUtNC4xNTYtNy4zNi4xNjQtOC4yNjQgMi45MTgtNy4wMTIgNS4zNC02LjMxOCA1Ljg5LTUuNDcxIDUuNDktNC42NTMgNS41MS00Ljg5IDUuODc3LTUuMjAzIDYuMDcyLTUuNDY0IDYuMTc1LTUuNjU1IDYuNjc0LTUuODc2IDYuNDI2LTUuNDQgNi44NC01LjQ2NCA3LjAwNy01LjQ4NyA2LjYxMy01LjcxIDMuMzg1LTMuMTQ0YTkuMDk5IDkuMDk5IDAgMCAxIDEyLjY3MyAxMy4wNThsLTEuNjY0IDEuNTgxLTQuNjE1IDMuOTA3LTYuMTAyIDQuNjI3LTYuNjM2IDQuODk1LTYuMzYxIDQuOTg4LTYuMDYgNS4yMi02LjIyNCA1LjY1Ny02LjEzNSA1LjgyLTYuMTcxIDUuNzg1LTYuOTUzIDYuMzQ2LTcuMzg3IDYuMzc2LTYuNDE2IDUuMjA3LTQuNzI2IDUuNzUzLTQuOTA1IDEuODg0LjEzLTIuODEgNi44NS0yLjcwMSA3LjI0Ni0yLjc5NyA5LjQ5Mi0zLjY4NyA5LjE3NS0zLjQ1OCA2Ljg0Mi0yLjQxOCA3Ljc0LTIuNzA4IDkuMTk1LTMuMjYxIDEwLjMxNy0zLjU2OSAxMC45Mi0zLjU0IDExLjUwNS0zLjQ3MiAxMS44ODQtMy4zOCAxMi43MTQtMy40NyAxNC40NS0zLjgzNiAxNi4wNzctNC4yODMgMTcuMzg1LTQuNjQgMTguODE0LTQuOTQ4IDE3LjAwNy00LjU4MyAxMy43NzItMy45ODkgMTEuNjc1LTMuNTg2IDExLjcyNS0zLjA5NCAxMS43MDUtMi4xNCA2LjIwNy0uOTYgMS4xMDQtLjI5NGE2LjI3NSA2LjI3NSAwIDAgMSA0LjU3NSAxMS42ODciLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTA4Ni45NzYgNzA4LjUxNiAzLjA0MiAyLjY5OCA1Ljg5MSA1LjAzOSA1LjkyIDUuMDY4IDUuNzM2IDUuMjYyIDcuMjkxIDcuNDIzIDcuNzUyIDguNjUgNi4xMjcgOC40MjQgMyA0LjY2N2E3LjQwNCA3LjQwNCAwIDAgMS0xMi41NzggNy44MTNsLTEuNTYyLTIuNTM1LTMuNjEtNS44MTgtNS42OTUtNy43Mi04LjAwNS04LjcyMy03LjMxOC02Ljc0NS02LjAxMS00LjgyOS02LjIzNi00Ljg5Ni0zLjE4NS0yLjUyN2E3LjM0NCA3LjM0NCAwIDAgMSA5LjQ0MS0xMS4yNTEiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTEyMy40MjIgNzU4LjE2IDUuNzY1IDEuMjM1TDExNDEuODMgNzYybDE0LjY2MyAyLjc3NSAxNi43OTIgMi44MiAxOC45NjIgMi45MzQgMTguNDM4IDIuNzg0IDE3LjM2IDIuNjA3IDE0Ljk3NCAyLjI5NCAxMS4wOTYgMS43MDYgOS4wNzkgMS4yMTQgMTAuMjcgMS4wNjggMTAuMDcyIDEuMTgzIDMuODgzLjU4YTUuNzgzIDUuNzgzIDAgMCAxLTEuOTIzIDExLjQwNWwtMy44NTgtLjcyNS05Ljg2MS0yLjA3OS0xMC4wNTktMi4xNTctOC45ODQtMS42NjdMMTI0MS43MiA3ODdsLTE0Ljk2LTIuMTE2LTE3LjM4LTIuMzY4LTE4LjQ5My0yLjQ2LTE5LjEtMi41MDItMTYuOTkzLTIuMjM3LTE0LjgwMi0xLjk2NS0xMi43ODQtMS41MTktNS44NjMtLjYxN2E2LjYxIDYuNjEgMCAwIDEgMi4wNzgtMTMuMDU1Ii8+PC9zdmc+",
					"w": 276,
					"h": 163,
					"fileSize": 3763,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:-1785647319",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-17 16.03.02.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5IiBoZWlnaHQ9IjI3LjI1MSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6dHJhbnNwYXJlbnQiIHZpZXdCb3g9IjEyMTguNTk4IDY4LjM5IDkgMjcuMjUxIj48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJNMTIxOS43MzcgNzIuNTkyYTMuMzYgMy4zNiAwIDEgMSA2LjcyMSAwIDMuMzYgMy4zNiAwIDEgMS02LjcyMSAwbS0uMDAxIDkuNDM1YTMuMzYyIDMuMzYyIDAgMSAxIDYuNzI0IDAgMy4zNjIgMy4zNjIgMCAxIDEtNi43MjQgMG0tLjIyMiA5LjQxMmEzLjU4MyAzLjU4MyAwIDEgMSA3LjE2NyAwIDMuNTgzIDMuNTgzIDAgMSAxLTcuMTY3IDAiLz48L3N2Zz4=",
					"w": 9,
					"h": 27,
					"fileSize": 1276,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 504.55910617928635,
				"y": 628.1914718139948,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:qWpGI9Xq-ZBjC6dVuJeh9",
				"type": "geo",
				"props": {
					"w": 38.934123883142036,
					"h": 30.878490815928636,
					"geo": "triangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0JQkS5hV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1420.504084063627,
				"y": 633.7058632049041,
				"rotation": 6.265732014659645,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:7pMVKoH6HKC0qk4Azrx5B",
				"type": "image",
				"props": {
					"w": 17.270115857349463,
					"h": 14.161495003026559,
					"assetId": "asset:67548994",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "page:page",
				"index": "b00akFyPV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				},
				"id": "asset:1378765761",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "asset.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1Ni4xNTQiIGhlaWdodD0iNTcuNDQ2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudCIgdmlld0JveD0iMTY1MC45NDggNjgxLjM5OSA1Ni4xNTQgNTcuNDQ2Ij48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMxZDFkMWQiIHN0cm9rZS13aWR0aD0iMTAiIGQ9Ik0xNjU2LjEyMSA3MDYuOTY1YzIuNDEtMTIuODI0IDkuODU2LTIwLjU1NCAxOS4wNDEtMjAuNTU0IDEwLjEwNS4wODkgMTcuNTUxIDcuODE4IDE3LjU1MSAxNy4zNTQtLjQyNyAxMy4xMzgtNy44NzMgMjAuODY4LTE3LjA1OSAyMC44NjgtMTIuMDg2LS40MDItMTkuNTMzLTguMTMyLTE5LjUzMy0xNy42NjhtLjEwMy0uMzE5YzMuNzQ1LTkuODYyIDExLjE5Mi0xNy41OTIgMjAuMzc4LTE3LjU5MiA2LjM5My45MzUgMTMuODQgOC42NjUgMTMuODQgMTguMi0uNDUzIDguOTcxLTcuOSAxNi43MDEtMTcuMDg2IDE2LjcwMS05LjY4NS0uMDQzLTE3LjEzMi03Ljc3My0xNy4xMzItMTcuMzA5Ii8+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTE2ODYuOTk3IDcxNS44MTkgMS4zNTMgMS4yMTQgMy4wNSAyLjY5OSAzLjIzIDIuODg2IDMuMTY3IDIuNjc3IDMuMzAzIDIuMjg0IDIuNzMzIDEuNzAxIDEuMDY0LjY5MmE0LjkwNiA0LjkwNiAwIDAgMS01LjQ0IDguMTY3bC0xLjYxMS0xLjE0LTMuMzgzLTIuMjEzLTMuMjM1LTIuNTU3LTIuODYzLTIuOTMyLTIuOTE5LTIuODI3LTIuOTQ0LTIuNTA4LTEuNDI0LTEuMTNhNC41ODggNC41ODggMCAwIDEgNS45MTktNy4wMTMiLz48L3N2Zz4=",
					"w": 56,
					"h": 57,
					"fileSize": 1366,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 967.5909864643908,
				"y": 149.74408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:nD1q7HlxqRbjj7XveZqjw",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "grey",
					"size": "l",
					"w": 37.330937500000005,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Today"
									}
								]
							}
						]
					}
				},
				"index": "aKTd8qsV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:1814878790",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.41.16.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1NS40NjEiIGhlaWdodD0iNTguMzQxIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudCIgdmlld0JveD0iMTA0NC43NCA1MjEuODQxIDU1LjQ2MSA1OC4zNDEiPjxwYXRoIGZpbGw9IiM5ZmE4YjIiIGQ9Im0xMDc1LjI0IDUyNS42NzctLjAxNCAyLjExNC0uMDI1IDQuMjA4LS4wNDcgNC40MDItLjE1NiA1LjExNS0uMjUzIDUuOTg0LS4xOTEgNS45ODQuMDA3IDQuODUuMjA3IDUuNTE5LjI3MiA2LjI4NS4xNjQgNC41MS4wMzQgMS42OTlhMy42NjMgMy42NjMgMCAwIDEtNy4zMjUgMGwuMDM0LTEuNjk4LjE2NC00LjUxLjI3Mi02LjI4Ni4yMDctNS41MTguMDA3LTQuODUxLS4xOTEtNS45ODQtLjI1My01Ljk4NC0uMTU2LTUuMTE1LS4wNDctNC40MDItLjAyNS00LjIwOC0uMDE1LTIuMTE0YTMuNjY1IDMuNjY1IDAgMCAxIDcuMzMgMCIvPjxwYXRoIGZpbGw9IiM5ZmE4YjIiIGQ9Im0xMDQ4LjE0NSA1NTEuODg0IDMuMzY1LS4xNDMgNS43NjktLjQwOSA0LjU1OC0uNjQ4IDQuNDIzLS44OTMgNC40NDUtMS4xMTMgNC4yMDYtMS4xODQgMy44MjUtMS4xMjQgNC40MTktMS40NDcgNC42MDUtMS41MzYgNC40NDItMS4xMyAyLjQ2LS41YTQuMjA2IDQuMjA2IDAgMCAxIDEuNTMxIDguMjdsLTIuMzEuMTkxLTQuMTU4LjQ3MS00LjYyLjk3Ny00LjU5OCAxLjE1NC0zLjg2Ljk4NS00LjM0IDEuMTY3LTQuNzQzIDEuMjIyLTQuNzU1Ljk4NS00LjgwMi43NDMtNS44MTIuODQ5LTMuMzMuNTA4YTMuNzE1IDMuNzE1IDAgMCAxLS43Mi03LjM5NSIvPjwvc3ZnPg==",
					"w": 55,
					"h": 58,
					"fileSize": 1505,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1230.9586359108573,
				"y": 545.4343589779321,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:_ifQ1bw3jZQ-lw8gQATCJ",
				"type": "geo",
				"props": {
					"w": 150,
					"h": 58,
					"geo": "oval",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "bye bye"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "adOTdU3G",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 669.5027105731176,
				"y": 279.5137375706372,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:pPxGrmBJOfdyCyysteEjG",
				"type": "text",
				"props": {
					"color": "grey",
					"size": "s",
					"w": 77.0546875,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Member"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "amynFaeV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 464.17213433070356,
				"y": 550.0133480035936,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:1D5Ju_CiYxwhjywdzpIEY",
				"type": "geo",
				"props": {
					"w": 133.8185558686381,
					"h": 135,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aVfnxqLV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:-1345511735",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.48.28.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjYuNTM2IiBoZWlnaHQ9IjE2OC43NTMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50IiB2aWV3Qm94PSIxNjI5Ljk2MiA0OTAuMjA0IDE2Ni41MzYgMTY4Ljc1MyI+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTE3MTkuOTIyIDU1OC4yODMtMS42MjUtLjA3My00LjAwNi0uMTA0LTQuMjQyLS4wMTQtNC4xOTQuMi00LjI0NSAxLjc2NC0zLjQ4NyAzLjUtMyA0LjIyNC0yLjU5IDQuODg4LTEuOTE2IDUuMDM4LTEuMDgyIDQuNzA2LS40MSA0LjIwNC4wNCAzLjgzOS45OTIgNC4wMDcgMi40MjMgMy43NjIgMy4yOTcgMi44NyAzLjU0IDIuMTM3IDMuNjcgMS42MDYgNC41ODggMS4zMDggNS4xOTIuNzYxIDQuNzctLjE5MiA0LjM2Ny0xLjM4NiAzLjY5NC0yLjExNCAzLjE5Ni0yLjI1MyAzLjA1OS0yLjU1MiAyLjU4Ni0zLjQ0NyAxLjctMy44NTcgMS4wNjgtNC4wOC41OC00LjczLS40ODctNC40NDUtMS42MS0zLjY3OC0yLjE1NS0zLjEzNy0yLjQ2NS0yLjg4OC0yLjg0LTIuODY1LTMuNTEtMi4zOTEtMy43Mi0xLjgzLTMuNzY3LTEuNzUyLTIuMDQ3LS44NjNhNS4yMzMgNS4yMzMgMCAwIDEgMi40MTYtMTAuMTgzbDIuMzIyLjY5OCA0LjE1NCAxLjg3MiAzLjgyNSAyLjA2MyAzLjYyNiAxLjk2NiAzLjE3NSAyLjU4IDMuMDczIDMuMTEyIDIuOTA1IDMuMzI4IDIuNjA2IDMuNTM4IDIuMTc4IDMuNzUgMS41MjggMy43OTYuNjg4IDQuMTQ4LS4wNjQgNC43MTQtLjY0NyA0Ljc3Mi0xLjEzNiA0LjQzLTEuNTExIDQuMS0yLjA5MiAzLjg2My0yLjg1OCAzLjM5Ni0zLjQyMiAzLjAyMy0zLjUyOCAyLjY2OS0zLjY1OSAyLjM2LTQuMTU2IDIuMTItNC4zOCAxLjM5Mi00LjY0Mi4zOTEtNC43NDctLjI3Ny00LjU3Ni0uNzMtNC40OTMtMS4yMTgtNC41NjYtMS43OC00LjYzMi0yLjQzNi00LjQxNy0zLjIwMy0zLjcxMy0zLjg1MS0yLjU3My00LjQ3Ni0xLjQyMi01LjExNy0uMzE1LTQuOTQ4LjM1Ny00LjkwNS45ODctNS41MjIgMS44NDctNS45ODYgMi42NzEtNi4wNiAzLjQwNS01LjY3IDQuMDMyLTQuOTMgMy44NjMtMy40OCA0LjMxMi0xLjkyIDQuNTc4LS42NjkgMy44OC4wNjggNC4zNDcuMTM0IDQuMDY3LjEwNyAxLjYyNi4wMzFhNC4zOSA0LjM5IDAgMCAxLS4yODMgOC43NzciLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTc1MS44MyA1MzIuNTU2LTEuNDUzLS4wMTUtMy45NzgtLjAxNi00Ljc5OC4wMTItNC43OTYuMDU2LTQuOTQtLjI0Mi00LjExNC0xLjg3Mi0yLjE2Mi0zLjU5OC0uNTYzLTQuMDQuMDM4LTQuMDIzLjMzNi00LjE4Ny0uMjI0LTQuNTkzLTEuNjU4LTQuMDU3LTIuOTU1LTIuOTg5LTQuMDItMi4wNDMtNC42MDYtLjgxNy00LjI1LjE1MS00LjM0IDEuNDc3LTQuNTE4IDIuNjE2LTMuOTI4IDIuNjk1LTMuMjg4IDIuNzQ1LTIuNjg2IDMuMzI3LTIuMjA3IDMuNzQ0LTEuNzg0IDMuNjgzLS44MTYgMy45MTMtLjAyOCA0LjIyOS0uMTcgNC4zNjItLjcyNiA0LjU0My0xLjQ3IDQuMzgzLTIuMjk4IDMuMzc3LTMuMzY1IDEuODg5LTQuNTQgMS4zNDYtNC41MTUgMS4zODQtMy44MTQgMS4xODUtNC4wMTIgMS4xMzYtNC4wOTcgMS4wMDgtNC4zNTEuODk0LTQuMzIzLjkwNy0zLjY4Ny45OTktMS4zMjIgMi40NjQuNzEzIDQuMDQ1IDEuOSAzLjQgMy42MDYgMS43OTYgNC4wMDYgMS4zNzkgMy43NzIgMi4zNTMgMi44MjUgMy41ODcgMS43MzYgNC4zNTcgMS4wNSA0LjQyNi42MzMgNC4xOTktLjEzNCA0Ljc5OC0xLjkzNCA0LjE1Ni0zLjYzMyAyLjEwMi00LjIwNiAyLjI1Mi0zLjYwNyAyLjc5Ny0zLjEwOCAyLjg5Ni0yLjY5OCAzLjMzNC0xLjE3MiA0LjEzNy0uMTQ5IDQuNDQ3LS4wMDUgMy44OTQuODI0IDMuNzg1IDIuNzY5IDIuOTk2IDMuNzM0IDEuODIyIDMuOCAxLjExOCA0LjA4Ni40NjQgMy45MzgtLjMzNSA0LjA0OS0xLjE5MSA0LjQ2Ny0xLjg2NiA0LjI2NC0yLjAzIDQuMTktMS44NTYgNC41MjMtMS41MzUgNC40ODMtLjc3OSA0LjQzNC4wNjUgNC4zNzUuNzM3IDQuMDU4IDEuMjEzIDMuOTcgMS42NTQgNC4wMjMgMi42MiAzLjAyNiAzLjI2OCAxLjk1MyAzLjM4NCAyLjI5NCAzLjQxNiAyLjY0IDMuMDcyIDIuNTQzIDIuODggMy4yMjcuNzk0IDMuNjk3LTEuNzU2IDMuMzYtMi4zODMgMy4wNzYtMi40NjUgMi44MzktMi42MzIgMS41NTktMy41MDIuMzkyLTQuMjU4Ljg5My00LjMgMS45NS00LjEwMiAzLjMwNC0zLjYzIDMuODM5LTIuMTMgNC4wOTQtLjY1NCA0LjM1My0uMTI1IDQuMzUyLjExNiA0LjUzNi43IDQuMDI2IDEuMzAyIDMuNTEyIDEuNDE5IDMuNTg4IDEuMTQ2IDIuMjE4LTEuNDg0IDEuNjc1LTMuOTI2IDIuNTcyLTQuMDMxIDIuMTczLTMuNzM1IDEuMTA1LTMuNjExLS42MjItMy43NzItMi4xNDctMy4yMTktMy4wOC0yLjY4My0zLjQ3Mi0yLjA3OS0zLjc5OC0xLjI3NS0zLjcxLTEuNDUyLTIuODkyLTIuOTUtMS4zOTQtMy45OTYtLjEyMS00LjE0MS40NjMtNC4zNiAxLjI1Mi00LjMwNSAxLjc3My0zLjkxMyAyLjExMS0zLjMgMi41ODQtMy4wMDYgMi44ODYtMy4wMDIgMi44Ny0yLjk5NiAzLjM2My0zLjY0OSAxLjk0NS0yLjE0M2E1LjE2NCA1LjE2NCAwIDAgMSA3LjYyNCA2Ljk2NmwtMi4yMzQgMi41NTgtMy44NiA0LjI2NC0zLjAxIDMuMTQtMi43MzIgMi45NjctMi4zMTUgMy4zMjctMS41NjkgMy44MzMtLjUzMyA0LjA1OCAyLjAzMSAyLjU1MiAzLjg4MiAxLjQ1OCAzLjc0OSAyLjE5MSAzLjMxOCAyLjU0IDMuMTc2IDMuMDk4IDIuOTYgMy43ODYgMS42NTMgNC40MDEuMjk2IDQuNjMtLjY1NyA0LjMyNy0xLjUwMiAzLjg3NS0xLjk5NSAzLjU0OC0yLjAyOSAzLjQwNC0yLjQyMyAzLjgzNi0yLjgzOCA0LjA2My0yLjg2NiAzLjE2LTMuNTggMS42MDUtNC4wNzktLjIwNi0zLjg4LTEuMTU4LTMuOTY2LTEuNTUzLTMuOTA3LTEuMzU3LTMuNzQ3LS40OS0zLjc5NS4wMzUtMy43LjY2Mi0yLjUwNSAyLjYyLS43MDggNC4wMjYtLjI3OCAzLjk4LTEuMTcyIDMuODA1LTIuMjAyIDMuMzY1LTIuODI2IDIuODM5LTMuMDggMi41Ny0zLjAxNCAyLjQxNS0zLjA2NCAyLjE2Mi0zLjIzOSAyLjA1LTMuMzUgMi4wNjctMy45MSAxLjI2NC00LjA1Ny0uNjM5LTMuMzQtMi4zNy0yLjkxNS0zLjEyMy0yLjc2Ny0zLjIxNS0yLjcwOS0zLjE0NC0yLjMwOC0zLjMyLTEuODYxLTMuNTctMi42OTYtMi44MzUtMy45NDItMS43MjUtNC4yMi0xLjEyLTMuOTM1LS4zNzYtMy42OC41OS0zLjY5MyAxLjM2OC0zLjkxNSAxLjgyMS0zLjgxMSAxLjg1MS0zLjYyMiAxLjU3OC00LjI5NCAxLjQ1Mi00Ljg2OS44OS01LjIwMy4wNC01LjIxNi0uNzY3LTQuNDQ0LTEuNDA0LTQuMTgyLTEuOTQ0LTMuNjcxLTIuNDExLTIuNjIzLTIuOTM1LTEuODgxLTMuODQ4LTEuMDE2LTQuODItLjI1Mi00LjczOC4wNDgtNC4yMS4yNjYtNC4xLjg2LTMuODQgMS43Ni0zLjM5NSAyLjg4MS0zLjQ2NiAzLjM2NC0zLjQ3OSAzLjE2Mi0yLjg2NiAzLjgwMS0yLjg4MyA0LjUzNy0yLjM3IDEuMTczLjcyOC0xLjI3Ni0uNDE5LS41NTgtMy44OTMtMS4wNjgtNC4wMS0yLjI4LTIuOTk2LTMuNzU1LTEuNTI2LTMuOTI4LTEuMjI5LTMuMzQ4LTEuOTA4LTIuNTY0LTMuMjEyLTEuNDE4LTMuODg3LS42NTQtNC4xOC0uMjUtNC4zMTguMDg1LTQuMDIyIDEuMjk1LTMuODIyIDIuODMzLTIuODIyIDMuNTAxLTEuNTAxIDMuNzY4LTEuMDA3IDQuMTctLjg4MyA0Ljc5Mi0xLjAxOCA1LjI3MS0xLjQxNCA0LjY1MS0xLjQ5MyA0LjM2OC0xLjUyMiA0LjQxOS0xLjQwMyAyLjQ5LTIuNjg2LjYzLTQuMzY3LjExLTQuMjE4LjIyNC00LjE4NS44MjYtMy45NyAxLjYzLTMuNzg4IDIuMTg2LTQuMDk2IDIuNDUzLTMuOTMgMy4wNC0zLjU5NiAzLjYzNS0zLjE0MSA0LjA3MS0yLjg3OCA0LjA5OC0yLjcgNC4zNDQtMi4yNzggNS4xNzktMS41MyA1LjEwNi0uMzkxIDQuODMuNDMzIDQuNiAxLjA5NiA0LjA4NyAxLjg5NCAzLjcxNCAyLjcxIDMuMjE2IDMuMzc5IDIuNjMzIDQuMjkzIDEuNDY3IDQuNDM3LjE4NiA0LjMwNi0uNDUgNC41OTgtLjUzOCA0LjE2OCAyLjM0IDEuOTMzIDQuNzk1LjA1NiA0Ljc5OC4wMTIgMy45NzgtLjAxNiAxLjQ1My0uMDE1YTQuNTMzIDQuNTMzIDAgMCAxIDAgOS4wNjUiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTc4My44NDMgNTQ2Ljk0NC45NDEtMS4yNDUuNDMyLTMuMjQzLTEuODItMy43MjQtMy4zMDctMi41NjctMy44NC0xLjIyNS0zLjg3LS41NTktNC4yNy0uMzczLTQuMzUzLS4yMTUtNC4wMzktLjA0OC0zLjgwNy0uMjA0LTQuNTQ4LS42NC0yLjY3LS40NjVhNS4yNDggNS4yNDggMCAwIDEgMi41ODMtMTAuMTcybDIuNjQ4LjM2MSA0LjY0LjUzOCAzLjg5OC4xOTYgMy44NzIuMTUzIDQuMzUyLjMzOCA0LjYyOC40ODUgNC4wODMuNzU0IDMuNzY0IDEuMjE2IDMuNzQzIDEuODkgMy4yMDIgMi42ODIgMi41NCAzLjQxOCAxLjk5NiAzLjY1IDEuMzQzIDMuNTk1LjAzMyAzLjczOC0xLjU5OCAzLjQ0OC0yLjA5MyAyLjc3Ni0uOTY5IDEuMjM1YTQuNzQ0IDQuNzQ0IDAgMCAxLTcuNTE0LTUuNzkzIi8+PC9zdmc+",
					"w": 167,
					"h": 169,
					"fileSize": 7161,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1188.931336954853,
				"y": 121.60000000000002,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:n8F_szGu062-F7N09a833",
				"type": "geo",
				"props": {
					"w": 353.6,
					"h": 217.60000000000002,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0FKPUn9l",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 808.042537749974,
				"y": 497.41334800359357,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"type": "group",
				"parentId": "page:page",
				"index": "b0A1jmC6V",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 17.353511210723696,
				"y": 74.7826948926305,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:fHE5Q3vI-l3AFrv-2OWyZ",
				"type": "image",
				"props": {
					"w": 24.284565210605024,
					"h": 20.632750893220813,
					"assetId": "asset:91482524",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "aAiKlM7V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1483.2792513194647,
				"y": 582.3834034998108,
				"rotation": 3.0543261909900767,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:q0mTWDE7Ai7Hg8Xfh6jk0",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/w60AAAAAAAAAAAAAwzEAAAAAuDIAAAAAezQAAAAAUjQAAAAARjUAAAAA2DcAAAAAfDgAAAAAPDoAAAAAzDoAAAAAuDoAAAAAsDkAAAAAIDkKrwAAsDkAtAAAuDiPtgAAEDg+tgAAEDgotAAAoDQYsgAAgCwYsQAAgDJ4sQAAQDMosAAAgC5wsQAAADCgrwAAADBwsQAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.6391902089799094,
					"scaleY": 0.506074251290214
				},
				"parentId": "page:page",
				"index": "b0We5U9CG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:91482524",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-17 14.15.09.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMzIuNjM0IiBoZWlnaHQ9IjExMy4xNjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50IiB2aWV3Qm94PSIxNjk3LjI4NCA3ODEuOTU1IDEzMi42MzQgMTEzLjE2NCI+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTE4MDQuNTQ4IDc5OS44MDktLjUxOC0uNDIzLTMuNjg0IDEuNi01LjY1IDQuMzg2LTUuMzE0IDQuMzY0LTUuNTI4IDQuMDkzLTUuNTgzIDQuODMtNS40MyA1LjQ1My0yLjU5IDcuMDMtLjUwNSA3LjkyNi00LjI5NyAxLjItLjgwMi00LjI3NiA2LjQzMy0yLjk2OCA2LjI1OS0zLjMyNyA2LjAxNi00LjQyNyA1Ljk5MS00LjMxNiA1LjYzOS00LjQ4OCA1LjQ5Ni00LjcxMSA1LjQyLTQuNTg3IDQuMjEyLjk0MS0uODkyLjQwNC01LjA3Mi01LjAwNC0yLjY5NS0yLjIxMmE5Ljg0NCA5Ljg0NCAwIDAgMSAxMC4zMy0xNi43NjJsMy44MiAyLjc3IDYuMTA3IDUuMzY1IDQuNzEgNS43OCAyLjc5NyA2Ljk3LTEuNzM5IDcuMTczLTQuNjU1IDUuODQ1LTUuNDMgNC44MjQtNS42NTQgNC43NjQtNS40NzMgNC42MzUtNS44MTQgNC41MS02LjAwMyA0LjI4OS01Ljc2NiA0LjIxLTUuOTI3IDMuNzU1LTYuODE2IDIuODIzLTcuMTM1IDIuNTctNy40NTcgMS41MzYtNy4xNDItMS45NTYtMy41NjMtNy42MDgtLjAzLTkuNDkuNDcyLTguMDIyLjY3OS03LjM0MyAzLjM4Mi02LjQ5NyA1LjIxLTUuNzE5IDUuMDMxLTQuOTQ4IDUuMzI5LTQuNTUgNS42ODMtNC4xOTYgNS42NzctNC4zMDUgNS45NjQtNC4zMjYgNi45MDEtMy43NjggNy45Ny0xLjQ3IDQuMjM0LjI4N2E4Ljc4IDguNzggMCAwIDEtMi41OTggMTcuMzY2Ii8+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTE3NTYuMTcgODA2LjU4OC0zLjA2LS4wMzdoLTcuNTU1bC03Ljk0Mi4wOTYtNy4wNjIuMTIxLTcuNDExLjQwNS03LjE2Ljk5OC0xLjE0My0yLjM0NyAyLjU2OCAxLjA2LjMyIDguMDY4LS4zNTQgNy44MDctLjYyMSA4LjI3OC0uMzc2IDguNzkzLS4wOTYgOC4zMzguNDU2IDguMTA4IDEuMjQ0IDcuODA2IDEuNTg1IDcuMDk5IDQuODEyIDMuODc0IDcuODEuNTI1IDguMDgyLjEzOCA5LjA0OS4yMjQgOS45ODcuMjY5IDEwLjQyLjQ1OCA5LjA1LjQ5IDcuNzczLjIwOCA3LjM1LS4wNTggMS41MjctMy4xMy0yLjE3NC03LjIzNC0uNTc0LTcuNjUtLjAzOS02LjM2OC4yNS0yLjkwNmE5LjQ1OSA5LjQ1OSAwIDAgMSAxOC44MzUgMS43NjNsLS4xMTIgMy4xMzcuMTQ2IDYuNjA3LjMzMyA3LjY2Ny4wOTEgNy45MDQtLjUxNyA3LjIxLTQuMTA1IDUuODgzLTYuODk3IDMuNjMzLTYuODU2IDEuMTM4LTcuNzE1LS4yNDctOC4xLS4zMTktOC44MS0uMzA0LTkuOTkxLS4wMy05Ljg3Mi4yLTkuMDUuMjI0LTkuMDA0LjEzOC04LjM4Mi0uMDU5LTcuMjAyLS45MzgtNi43ODQtMy4zMi00LjYwOC01Ljc0Ni0yLjIzLTcuMDA0LTEuNjcyLTcuNzI0LTEuMzY3LTcuMzk0LS43MzgtNi44NS0uMTU4LTcuNTM3LjExNi04LjczMi4zNzMtOS4zOTguNTYyLTkuMzIuMjctOC42ODQtLjA2NC03LjkxNCAxLjYzMS02Ljg5NyA2LjA0Mi00LjUzIDguMjM5LTEuODkgNy42MDgtLjU3MyA3LjQ3OS0uMTE3IDcuMTc5LjA0IDcuODc0LjAyMiA3LjUxLS4xMTkgMy4wNTgtLjFhOC4zNzMgOC4zNzMgMCAwIDEgLjE3MiAxNi43NDciLz48L3N2Zz4=",
					"w": 133,
					"h": 113,
					"fileSize": 2822,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 975.5909864643908,
				"y": 217.74408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:gS5tRXlgMypqd4ZP6y5ev",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "black",
					"size": "l",
					"w": 81.9825,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Decision tree"
									}
								]
							}
						]
					}
				},
				"index": "aN7R4tEV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 435.8721343307036,
				"y": 497.41334800359357,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:w5k1MM5b6XZlUH89Pgdbs",
				"type": "geo",
				"props": {
					"w": 353.6,
					"h": 217.60000000000002,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a3COhs9V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 747.0333622163581,
				"y": 152.18282340745472,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:x3M38Y_DEvq9ekl6dth63",
				"type": "geo",
				"props": {
					"w": 26.714968877917837,
					"h": 23.66436033469958,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0fciBeEV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1282.7430635705782,
				"y": 245.67000819781413,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:r45POciGTPmrfiZg_VMdS",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "black",
					"size": "l",
					"w": 81.9825,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Decision tree"
									}
								]
							}
						]
					}
				},
				"index": "b0Ek0MIFZzG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1256.2890559308325,
				"y": 169.33061011915277,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:LrgRiOrpbbFQsYUeNcKiN",
				"type": "geo",
				"props": {
					"w": 234.44013758668294,
					"h": 145.77951664952835,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "grey",
					"labelColor": "black",
					"fill": "fill",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0EjYo3WQX",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 975.5909864643908,
				"y": 164.74408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:fb8rhgv5cVf536iDT2z85",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "black",
					"size": "l",
					"w": 86.59640625,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Regional map"
									}
								]
							}
						]
					}
				},
				"index": "aRxGkLWV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 64.16205352262674,
				"y": 35.6258760349715,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:vH6rDg6SScH7L2U2DkRCn",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:UY73tKpPQTAsRRoNV48I-",
				"index": "a6Pmy",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 195.99233782418597,
				"y": 227.20000000000005,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:zsO14CPjCHyna_7IRxlbp",
				"type": "group",
				"parentId": "page:page",
				"index": "aXy6TR9V",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 967.5909864643908,
				"y": 236.74408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:wS7vH9LU9IzxDDELQjv_r",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "grey",
					"size": "l",
					"w": 65.55625,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Last week"
									}
								]
							}
						]
					}
				},
				"index": "aO3I2ClV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:455614914",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 16.43.58 (1).svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMy4zNTYiIGhlaWdodD0iMjkuMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgdmlld0JveD0iNjk5LjgwNiA1MjYuMTg5IDMzLjM1NiAyOS4zIj48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtNzA0Ljc2MyA1MzIuNzQtLjA0IDEuMDE0LS4wMzQgMi4yNzMuMDQyIDIuMiAxLjA4MiAxLjA5OCAyLjI0NC0uMTM1IDEuMTk3LS4yOWEyLjM2NyAyLjM2NyAwIDAgMSAxLjE4IDQuNTg1bC0xLjMyLjM1OS0yLjQzOC41MzYtMi40NjMuMTIzLTIuMjMzLS44MTEtMS4xOTMtMS42NS0uNDM3LTEuODgxLS4wOTUtMS45MzMuMDQyLTIuMjAxLS4wMzUtMi4yNzMtLjA0LTEuMDE0YTIuMjcgMi4yNyAwIDAgMSA0LjU0MSAwIi8+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTcwMi42MzUgNTM3Ljg1Ni4yMzctLjY5LjYyNS0xLjY4MS45NDYtMS44OTQgMS41ODMtMS44MDMgMS43OTctMS40MzggMS43ODQtMS4wOCAyLjE0OC0xLjAyOSAyLjQ3Mi0uODY1IDIuNjkxLS41NDIgMi40NjYtLjIwNyAyLjQ5NS0uMDU1IDIuNDY3LjIzNyAyLjE2OC43OTIgMi4wMjEgMS4yMzIgMS42MTEgMS4zMzggMS4zOTIgMS44MzcgMS4wMDMgMi4zOC4zMjUgMi41MjYtLjAyIDMuMDg2LS4xOTcgMy40NzEtLjQ0MSAzLjAzLS44NTYgMi40NzctMS4yODYgMS44MDctMS42MSAxLjA0NS0yLjQxLjk2NC0yLjQxNy44NTYtMi4xNjYuNzY3LTIuNzQ5LjUzOC0xLjQ2Ny4wNjdhMi4yMzcgMi4yMzcgMCAwIDEgLjAwNy00LjQ3NWwuNzcyLjA3IDEuOTc0LS4zODYgMi4wNzYtLjgxMiAyLjIyLS45MTUgMi4zMS0xLjI2NiAxLjE5Ni0xLjYxNS4yOTQtMi4zODQtLjAwNC0zLjIxNC0uMTI0LTMuMTM4LS41MjYtMi4zMDUtMS4zNTQtMS42MTYtMS43MzUtMS4xNDUtMS44My0uNTA5LTEuOTE2LS4wNi0xLjk1Ni4wOC0xLjk5NC4yNTYtMS45OC41NjctMS44OTQuODA1LTEuOTI2IDEuMDgyLTEuODM2IDEuMzIxLTEuMjMgMS41OTctLjY1NCAxLjYyMi0uMjIzLjY5NmEyLjI1NCAyLjI1NCAwIDAgMS00LjI4LTEuNDIyIi8+PC9zdmc+",
					"w": 33,
					"h": 29,
					"fileSize": 1165,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 27.189599122229538,
				"y": 160.694529633995,
				"rotation": 0,
				"isLocked": false,
				"opacity": 0.25,
				"meta": {},
				"id": "shape:88VlmHwXLS5X8VDcJ7m66",
				"type": "geo",
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"props": {
					"w": 299.6208017555409,
					"h": 1,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "grey",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"index": "a89asGcV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 50.8248188701283,
				"y": 41.55206118546016,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:hqnnEJLVwCVS-RoQTYX-i",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/w60AAAAAAAAAAAAAwzEAAAAAuDIAAAAAezQAAAAAUjQAAAAARjUAAAAA2DcAAAAAfDgAAAAAPDoAAAAAzDoAAAAAuDoAAAAAsDkAAAAAIDkKrwAAsDkAtAAAuDiPtgAAEDg+tgAAEDgotAAAoDQYsgAAgCwYsQAAgDJ4sQAAQDMosAAAgC5wsQAAADCgrwAAADBwsQAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.8087283821064223,
					"scaleY": 0.8702608303666457
				},
				"parentId": "shape:ji1ypskcArcUIhudTDxla",
				"index": "a462tHDV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 54,
				"y": 70.5,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:MY49oHBm1MX8jYarAEvNT",
				"type": "text",
				"props": {
					"color": "black",
					"size": "l",
					"w": 95.296875,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.6,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "New file"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "a5ypT2CV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1330.4025912587633,
				"y": 658.9100300668188,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:em5JQja5nO2JXp5mYqr0P",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 54.5390625,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Penta"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "alBxZIUl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1282.7430635705782,
				"y": 192.67000819781413,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:boMcsKUseavr7nvC3aWGz",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "black",
					"size": "l",
					"w": 86.59640625,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Regional map"
									}
								]
							}
						]
					}
				},
				"index": "b0Ek3hmiBrG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1212.1877124011787,
				"y": 590.2025279866684,
				"rotation": 5.969026041820607,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:kwgqBKO9gQEPWgYTM_nsg",
				"type": "image",
				"props": {
					"w": 28.48327860528218,
					"h": 23.356288456331388,
					"assetId": "asset:67548994",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "page:page",
				"index": "ahmXfiAV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1470.6384478548785,
				"y": 579.9601835667169,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:JM8s8VrQXwZo_HjH0p8lq",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/Zq4AAAAAIKUAAAAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.506074251290214,
					"scaleY": 0.506074251290214
				},
				"parentId": "page:page",
				"index": "b0UsJn1jV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 48.67778428035788,
				"y": 45.845293550392626,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:RXovMvi4N9WriLrxnnezL",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/w60AAAAAAAAAAAAAwzEAAAAAuDIAAAAAezQAAAAAUjQAAAAARjUAAAAA2DcAAAAAfDgAAAAAPDoAAAAAzDoAAAAAuDoAAAAAsDkAAAAAIDkKrwAAsDkAtAAAuDiPtgAAEDg+tgAAEDgotAAAoDQYsgAAgCwYsQAAgDJ4sQAAQDMosAAAgC5wsQAAADCgrwAAADBwsQAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:UY73tKpPQTAsRRoNV48I-",
				"index": "a84NN",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1283.4298495601936,
				"y": 175.84109450823894,
				"rotation": 0.5585053606381853,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:arhdZr5VCMwfyt4jgggwG",
				"type": "image",
				"props": {
					"w": 11.19383149332775,
					"h": 16.68311424486347,
					"assetId": "asset:455199171",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "page:page",
				"index": "b0Ek5pgRQV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1427.5027105731176,
				"y": 656.5137375706372,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:-KZt3HsEYmPMgGnHqn-x9",
				"type": "text",
				"props": {
					"color": "red",
					"size": "s",
					"w": 72.734375,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "Remove"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "an2Aws2V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 9.668445266779372,
				"y": -0.4419122169217644,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:RuKr7yAVuXZBqvI5bkZMa",
				"type": "geo",
				"props": {
					"w": 81.75960640890798,
					"h": 87.98032137631014,
					"geo": "diamond",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "shape:ji1ypskcArcUIhudTDxla",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 15.953888197601032,
				"y": 155.33849683141227,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:GW4_OY7vE2FDWrNV-OE8O",
				"type": "image",
				"props": {
					"w": 26.534865788392416,
					"h": 26.987164637058196,
					"assetId": "asset:-1566116608",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "a9Y3wtAV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:-1566116608",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.53.39.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNzUuNTU5IiBoZWlnaHQ9IjE3OC43OTEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50IiB2aWV3Qm94PSIxNjI1Ljk0OSA0ODUuMTg5IDE3NS41NTkgMTc4Ljc5MSI+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTE3MTkuODUgNTYyLjMwMS0zLjQtLjA1MS03LjQ0NS4wMjctNi40MjQgMi44ODUtNC4xMzMgNS45NjctMi45MDcgNi41NjgtMS41MjQgNy4xMjkuOTgyIDcuMzAxIDQuNjg2IDUuNjU5IDcuMzQ0IDMuMjI4IDcuNzgyIDEuMDQ5IDYuNzQxLTEuODYgNS43Ni00LjA2OCA0LjA4Mi01LjY2IDEuNjU1LTYuOTU3LTEuNDk1LTYuODc3LTQuMjE3LTUuNzU3LTUuNTU4LTQuMjEzLTUuODUtMi45MzMtMi42NTEtMS4yMDlhOS43MjIgOS43MjIgMCAwIDEgNi40MzItMTguMzVsNC4wNCAxLjgyNyA3LjI0NyAzLjM5NCA2LjI0MyA0LjI5NyA1LjQxOCA1LjQzMyA0LjYyMiA2LjE0NSAzLjU5IDcuMjg4IDEuMzY0IDguMjEzLS42NDIgNy45NzctMS45OTcgNy4zNy0zLjMxIDYuODgtNC42MDcgNS41MzctNS42NTEgNC41ODYtNi41MjIgNC4wNjgtNy40MyAyLjg0LTcuOS43ODYtNy44NDEtLjkxMS03LjYxMS0yLjEzNi03LjU0Ni0zLjYxLTcuMTcyLTUuNTEtNS40NjktNy42NzYtMi40OTMtOC44NS4wMjUtOC41NTQgMS44MjQtOC45MSAyLjk0LTguMTUxIDMuNDc3LTYuMzkgNC4yNTMtNS43MzcgNS44MzktNS4yNjEgNi44NS0zLjM0OSA3Ljc1LS42NDggNy44NS4yNCAzLjQyNi4xMjJhOC40MDkgOC40MDkgMCAwIDEtLjQyOCAxNi44MTIiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTc1MS44MyA1MzYuNjI0LTIuMzQ3LS4wMjItNi43NjQuMDI4LTcuODQxLjA3NS03Ljc3My0yLjY2Ny01LjI3Ny02LjQxLS44NjktNy40NTItLjAzOC03LjIyLTIuOTItNS43MjctNi4yMzUtMi40OC02LjUxNSAxLjMxOS02LjIwNyAzLjcyMS01LjUxIDUuMzUzLTMuNjQ5IDYuNDMyLTEuMjUzIDYuODEzLS41OTQgNy40OTItMS45NDggNy4yMDUtNC4yMzkgNS43My02LjMyMSAzLjM5LTcuMTMzIDIuMTQzLTcuNzY3IDIuMzM1LTcuNjU5IDEuODQ3LTYuODkzIDEuNTY2LTEuNTA5LTIuMTQ5IDEuOTA5LjQ1IDMuMjcgNC44ODMgNi4zMDIgMy4zMzUgNS4yODggNS4zMTQgMy4wOTIgNi44NDYgMS40ODkgNy4yMDQuMDA0IDcuNjQ1LTMuMTM0IDYuMzkzLTUuNzE3IDMuOTk3LTUuNzMgMy43MjctNC4xMjggNS43NjgtMS41MyA3LjI2NSAyLjk3IDUuNDE0IDYuNTYzIDEuOTU2IDcuMTIyLS45ODUgNi45NjMtMi45MzMgNy4xNjEtMy4wNjggNy4zOC0xLjg5NyA3LjQ0OS0uMTAyIDcuNDIzIDEuNTE0IDYuNjcyIDIuNjc1IDUuNjY1IDQuMTQzIDQuMzIgNS43MTcgNC4wNTEgNS43MjYgNS4zOTcuODgxIDUuNjg1LTMuOTc4IDIuODU4LTYuNDY5IDEuOTg2LTcuOTYyIDQuOTY0LTYuNTg2IDYuODY2LTMuNzM1IDcuMTg1LS45NjYgNy4wMjcuMjA1IDcuMjY0IDEuNTc0IDYuNjMtMS4yNSA0LjUxOC01LjU0NC0uNTA1LTUuNzc4LTUuNDA0LTQuMDk5LTYuMzEzLTIuODQtNS4xMS00LjY3LTIuMy02LjU5NS4xMzctNy4wNyAxLjY4LTcuMDggMy4xMjItNi4zOTkgNC4zMS01LjYwOCA2LjY3Ny03LjE0MiA0LjIxMi00LjQ2N2E5Ljc2IDkuNzYgMCAwIDEgMTQuNTg4IDEyLjk3MmwtMy42MzYgNC4wNzUtNi4yMDcgNi43NjctNC41NDggNS41MyAxLjUyMiA0LjMyNSA2LjYzIDMuODIgNS41ODUgNC45MSA0LjQxOCA2LjMzNyAyLjA4IDcuNzYtLjcwMiA3LjM3OS0yLjU3MSA2LjU1Ny0zLjcyNCA2LjQtNC4wNzIgNi4xMDctNC44NCA1LjI5Ny02LjQzIDIuNzYtNy4xMzgtLjY5LTcuMTcyLTIuNDI3LTcuNDk3LTEuMzE1LTMuOTQ1IDMuNTQ4LTEuMjgyIDYuNzQ1LTMuNDcgNi4xNjgtNS4zMiA1LjI5LTUuODkzIDQuNDg1LTYuMTQ4IDQuMDgyLTcuMTI4IDIuODEzLTcuMTA1LS41OTktNS43ODMtNC4wOTUtNC44NS01LjIzLTQuNDExLTUuNzAzLTQuODk2LTUuNTk3LTYuMzc4LTMuMDQxLTYuODkuNjM4LTYuMzQgMi43NDQtNi45MjUgMy4wMDktNy43MTUgMi4xNTQtNy44NzQuNDUzLTguMjE3LTEuNDkzLTcuNDU3LTIuOTU0LTUuODA2LTQuMTQyLTQuMDgtNS43MDEtMi4wNC03LjI0OC0uNDktNy41NzkuNTE4LTcuMzkgMi4yMDktNy4wNTMgNC4wODUtNS44MjUgNC45MTEtNC45MjUgNS40MDEtNC43NzYuMTUtNC44MTMtNS45LTMuNjk3LTUuNTczLTQuMDk1LTMuNDMxLTYuNDU3LTEuMzI4LTcuMzE4LS4wOTYtNy4xMiAyLjgxMi03LjA1IDUuNzcyLTQuODkgNi42MzMtMi4xNiA3LjM3My0xLjY0MiA3LjQxNi0xLjkwOSA3LjM5MS0xLjM1MyA0LjM1OC0zLjk0OC41OTctNy4xNTMgMS4wODEtNi45NTMgMi44NjItNy4wMyAzLjgzNy02LjQ0IDQuNzM2LTUuNDczIDUuNTcyLTQuNTM1IDUuNzE0LTMuNzYgNi45MjUtMy4zMTMgNy44MTItMS42NyA3LjY0My4zNjUgNy42MTQgMi4xNSA2Ljg3MiA0LjIyNyA1LjQzIDYuMDk2IDMuMjcyIDguMjg3LjIxMiA4LjU2NCAzLjY4NyAzLjgxIDYuNzY0LjAyOCAyLjM0Ny0uMDIyYTguNiA4LjYgMCAwIDEgMCAxNy4yMDEiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTc4MC40NiA1NDQuNTU5IDEuNDA3LTEuOTctMi4xMTQtMi42NjQtNy4xMjUtMS4wODgtNy4yNTktLjUzOC03LjA3NS0uMjk5LTYuNjIxLS42NDQtMy4yMDItLjQ5YTkuNjM2IDkuNjM2IDAgMCAxIDMuMDI1LTE5LjAzMmw1LjEzMi41NjggOC41OTguNzQgNy4zNTQuNTYyIDcuNDc1IDEuMjg0IDYuNzI4IDIuNDQgNS45ODMgNC41NTYgNC40NCA2LjA1MiAyLjQ4NCA2LjY1Ny0uNTA1IDcuMDI0LTIuOTE4IDUuNDA4LTEuNTI3IDEuOTk2YTguODggOC44OCAwIDAgMS0xNC4yOC0xMC41NjIiLz48L3N2Zz4=",
					"w": 176,
					"h": 179,
					"fileSize": 4649,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 967.5909864643908,
				"y": 203.74408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:v3YxcpgVjgY8KjWd0uSPJ",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "grey",
					"size": "l",
					"w": 63.68359375000001,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Yesterday"
									}
								]
							}
						]
					}
				},
				"index": "aMVr0UBG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1317.072499932635,
				"y": 615.9875515437097,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:4srioR1tMIqxOvvyivVZc",
				"type": "geo",
				"props": {
					"w": 196.67313508595362,
					"h": 78.83573731273304,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "abl8vUPl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:1427379278",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.44.27.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4Ny40NDEiIGhlaWdodD0iODYuMzg5IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudCIgdmlld0JveD0iMTMzOC44NjEgNTM4LjgwNyA4Ny40NDEgODYuMzg5Ij48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTM5Mi44MjYgNTcxLjAyMS0xLjA0Ny0uNjMyLTIuNDctMS4yMTgtMy4wNjctLjgyNi0zLjI4NS0uMjQ2LTMuMi42MjItMi42OTQgMS45NjUtMS44NzcgMi42LTEuMzQ3IDIuNjExLTEuMTI5IDIuOTI1LS44OTUgMy4xNTktLjU1MyAzLjQ1Mi0uMTY0IDMuNDUyLjg3OSAyLjg2NCAyLjMwMiAyLjMwMyAyLjggMS41NiAyLjc0Mi43NDQgMy4wNDUuMjUgMy4yMTMtLjYxIDIuNTktMS42NjggMS45MzMtMi41MzUgMS40ODEtMi44NzMgMS4wMDMtMi44ODYuNTktMi45OS4xODYtMi44OC0uNC0yLjg2MS0xLjAxNC0yLjcxOC0xLjU2LTIuMzk4LTEuNjY4LTEuNDc5LS43MS0uMzY0YTMuODg4IDMuODg4IDAgMCAxIDMuMzg0LTcuMDAxbDEuNjc5IDEuMDIgMi42OTcgMi4xMjYgMS44NTcgMi40NDIgMS41IDIuODU3IDEuMDczIDIuODguNjI1IDMuMTE5LjE2IDMuNDAyLS4yOTggMy4yNDUtLjY4NCAzLjIwNC0xLjE2NCAzLjM3Mi0xLjQzOSAzLjE0NS0xLjcxOCAyLjgtMi4yMiAyLjU5OS0yLjggMi4yLTMuNDYyIDEuNTctMy44MTYuNTUtMy4zODYtLjEwOS0yLjg2LS40MjMtMi44NDQtLjg1NS0yLjg0NC0xLjM1OC0yLjg3MS0xLjk2LTIuNDk3LTIuNDQzLTEuNjczLTIuODEyLS43NjQtMy42MTYuMDQzLTQuMTQ3LjQ5NS0zLjk3OC44NjItMy44MzQgMS4yMzItMy43MjIgMS41NC0zLjQ1NyAyLjA3NC0zLjQ1NyAyLjU2LTMuMDY0IDIuNjkxLTEuOTkgMi43NjctMS4wODIgMy40NDQtLjM0OCAzLjQyOC4xMjEgMy4xMzMuNTM2IDMuNzAzIDEuMjU0IDMuMDMyIDEuNDQ2IDEuMDcuNTk0YTMuMzgyIDMuMzgyIDAgMCAxLTMuMzkzIDUuODUxIi8+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTEzNTkuOTcyIDU1OS4wMDgtMS4wNTMtLjAxNi0yLjUzMi0uMDA3LTIuOTkzLjA0NC0uOTEgMS41OS43NDYgMy4wNDYuNTExIDIuOTg1IDIuMDY4IDIuNTU5IDEuNjk5IDEuMDY1YTMuODczIDMuODczIDAgMCAxLTEuNDkyIDcuNjAybC0yLjUzMy0uODc5LTMuODMtMi4yNTYtMi4wNDgtMi44ODMtMS4xMy0zLjAwOC0uNjA3LTMuMTM5LS4yNjItMy4yMjUuMDA4LTMuMTE4LjMxNS0yLjkzNiAxLjM2Ny0yLjYzNSAyLjgzOS0xLjU1MiAzLjI1OS0uMjg1IDIuOTkzLjA0NSAyLjUzMi0uMDA3IDEuMDUzLS4wMTZhMy41MTMgMy41MTMgMCAwIDEgMCA3LjAyNm0tMi44NSAxOC45MjMtLjcwNy4wNDgtMi4yMzguNzAzLTMuMjU2IDEuNTk5LTMuMDg1IDEuODcyLS41NzMgMi43NCAxLjU5NiAzLjU0NCAxLjc1IDMuMTY2IDIuMTgzIDIuMzcgMi44NCAxLjM3NyAyLjYwMS4zMTMgMS4wMDItLjEyNWEzLjgzNCAzLjgzNCAwIDAgMSAyLjQwNiA3LjI4MWwtMS42Ny4zNjgtMy4zMzQuMTA4LTMuMjEtLjcxNy0yLjkwNi0xLjEyMy0yLjYyNC0xLjY3LTIuMjYtMi4xOTQtMS44NTYtMi41Ni0xLjU0OC0yLjcxLTEuMzQ1LTIuODMzLTEuMTc0LTMuMDU3LS42NjctMy4wODcuMzgtMi45OTYgMS43OTMtMi42NzQgMi42NDEtMi4xMTggMi43OTEtMS43NzIgMi43ODUtMS41NjYgMi43NTctMS4yMDQgMi43OTQtLjY0NSAxLjQxNC0uMTUxYTMuODczIDMuODczIDAgMCAxIC43MiA3LjcxM203LjA2NSAyMi4wNTQtLjE2NS43NDEtLjE4NCAyLjM4LS4wMTMgMy40NjcuMjYgMy4yOTcuOTA2IDIuODI2IDEuOTI1IDIuMSAyLjk2LjgzIDIuNTMzLTEuNjExIDIuMDM4LTIuOTUgMi43NTMtMS4xNzcgMi42NzcgMS4wOTYgMi4yMTMgMi4yMzQgMi40MDYgMi4xNTYgMi42MjEgMS40ODEgMi44MDUtLjE3NCAyLjcwMy0xLjQyNyAyLjA1NS0xLjk4OCAxLTIuOTM2LjE3Mi0yLjcyOC4wMTktMS4wNjNhMy45NCAzLjk0IDAgMCAxIDcuODc5LjIxOWwtLjA3MiAxLjU4NS0uMjMgMy4yMy0uNTA1IDMuMTQ3LTEuMTU0IDIuOC0xLjk2NiAyLjI1Ny0yLjQ4OCAxLjc5LTIuNzgzIDEuNjU5LTIuNzU4IDEuMzQ2LTMuMjAyLjQ5Mi0zLjMwOS0uNDktMi44My0xLjI0LTIuNTkxLTEuNjE1LTIuMzA4LTEuODgtMi4xMTMtMi4yODIuOTUtLjgyMiAzLjA5Mi0uNTMyLjguNTYzLTEuMjYgMi44NDgtMi4yNTUgMi4xMzEtMy4xMzYgMS4yMDUtMy40ODIuMzY0LTMuNDM4LS4zOTgtMy40NDMtMS4yODgtMi44MjktMi4xMzUtMS45NTYtMi43MzMtMS4zNDEtMy4zMTgtLjcyLTMuMjQzLS4yNi0zLjQ2NS0uMDI2LTMuOTM5LjI4OC0zLjE3My4yNjQtMS4yNWEzLjgzNCAzLjgzNCAwIDAgMSA3LjQ5OCAxLjYxM20zNi4wODQgMi43NSAxLjAwNi4xMTggMi40OTEuMDcgMi44NDUtLjYzNiAyLjY5LTEuNTc4IDIuNTE2LTIuMjI0IDIuMTQtMi41ODIgMS43My0yLjgyNiAxLjMzNS0yLjgxIDEuMDU1LTMuMTk4LjU4Ny0zLjQzNS0xLjMxLTIuMDAzLTMuMTYyLS40OTEtMS43NjUtLjA2YTMuODYyIDMuODYyIDAgMCAxLS4zNzktNy43MTVsMi4wMDMuMDQ0IDMuMzYuMzkzIDIuNzIuODcgMi41NjYgMS4zODIgMi4wNjYgMi4xMzIgMS4wOTQgMy4wNjMuMDIgMy42NC0uNTg4IDMuMzg1LS45MjQgMy4xNDMtMS4zNTMgMy40MjUtMS44NTMgMy43MDEtMi4yMTMgMy40MzItMi42NSAyLjk4OC0zLjAxNiAyLjUyNS0zLjEzMiAxLjg3LTMuMTggMS4xMzUtMy4yNjEuMzY3LTMuMDItLjE0LTEuMzQtLjE1OGEzLjk0IDMuOTQgMCAwIDEgLjkyMi03LjgyN204LjQ4LTI3LjE2OC41OS0xLjI1NiAxLjM2Ni0yLjk2MSAxLjMzLTMuNDEuODI2LTMuMTE1LS42NDYtMi43NDItMi4xNi0yLjI2OC0zLjE3My0uMDM3LTEuOTMuODk4YTMuOTYzIDMuOTYzIDAgMCAxLTUuNzQ1LTUuNDZsMS4wNTgtMS4xNjQgMi4zMzYtMi4wNTcgMy41MDctMS4wOTIgMy42NTkuMTU2IDIuOTcgMS4xOTYgMi45MzIgMi4wNSAyLjQ1NSAyLjU0NyAxLjg3IDMuMDI3Ljc5OSAzLjIwNC0uMzA1IDMuMDItLjcxIDIuODgyLS45ODkgMi45ODYtMS4yOTggMy4xNy0xLjI0MiAyLjY0OS0uNTIyIDEuMDg4YTMuODYyIDMuODYyIDAgMCAxLTYuOTc4LTMuMzEybS0xMC42MjgtMTcuNDM1LS4wNi0xLjE4MS0uNzMtMi40OTUtMS40ODEtMi40NTYtMS45MTctMi40MjItMi4zNTctMi4wMi0yLjcxNy0uODUtMS41MzIgMS40NzgtLjgyMSAzLjIyNS0uNzU2IDEuNjM2YTMuOTY2IDMuOTY2IDAgMCAxLTcuMTE3LTMuNTA1bC40Ny0uOTI3Ljk5NS0yLjM1LjkyNi0yLjc4NSAxLjM4OC0yLjUxNSAyLjQyLTEuNjY5IDMuMTQ2LS40ODQgMy4xNC4yNyAyLjg1My44NjYgMi44NzQgMS42NzYgMi42NjIgMi4zNDggMi4xMTcgMi40ODggMS44NTUgMi41NDYgMS41OTYgMi42NDkuNzYxIDIuNjk1LjE2IDIuNDA2LjA0MiAxLjAwM2EzLjk2MyAzLjk2MyAwIDAgMS03LjkxNy4zNzNtLTE2LjM4NS0yLjg5Ny0uMDItLjAwMi0uMDItLjAwMmEzLjk2NyAzLjk2NyAwIDAgMSAuOTExLTcuODgxbC4wMi4wMDIuMDIuMDAzYTMuOTY2IDMuOTY2IDAgMCAxLS45MTEgNy44OG0tMy40ODEtMy4yMDYtLjE3Ny0uOTU3LTEuNjQzLTEuNTQ4LTMuMDktLjYwNi0zLjA2My4wNDctLjQ5OC0uOTkzLjU1MS40MjMtMS4wOCAyLjcyMi0xLjY3NiAyLjUwNy0xLjIzIDIuMTQ4LS4yNDUuODlhNC4wMTcgNC4wMTcgMCAwIDEtNy4yMzUtMy40OTNsLjQ1Ny0xLjAzMyAxLjM1OC0yLjM5NyAxLjUzNS0yLjc2NSAxLjI0Ni0yLjc0IDIuMDM2LTIuMTQyIDIuODM2LS45NiAzLjExLS4xNzIgMy4zNzIuMDAzIDMuMTY2LjI2IDIuOTExLjk4OSAyLjQ1NSAxLjkxIDEuNjEyIDIuNDc4LjgzMyAyLjYzNC4yNTQgMS4zMTdhMy45NjcgMy45NjcgMCAwIDEtNy43OTUgMS40NzgiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJNMTM2MC4zNjkgNTU0LjkxYTIuMTIxIDIuMTIxIDAgMSAxIDQuMjQyIDAgMi4xMjEgMi4xMjEgMCAxIDEtNC4yNDIgMCIvPjwvc3ZnPg==",
					"w": 87,
					"h": 86,
					"fileSize": 6187,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 32.216494505131834,
				"y": 30.547902709481576,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:YQUwOMVOCnPdkAJDnCQta",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/w60AAAAAAAAAAAAAwzEAAAAAuDIAAAAAezQAAAAAUjQAAAAARjUAAAAA2DcAAAAAfDgAAAAAPDoAAAAAzDoAAAAAuDoAAAAAsDkAAAAAIDkKrwAAsDkAtAAAuDiPtgAAEDg+tgAAEDgotAAAoDQYsgAAgCwYsQAAgDJ4sQAAQDMosAAAgC5wsQAAADCgrwAAADBwsQAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.6330585325466017,
					"scaleY": 0.6330585325466017
				},
				"parentId": "shape:01N_iGBb4QuzLoUKH5_68",
				"index": "a4lLIJ5V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 880.5909864643908,
				"y": 277.99408605949236,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:o5t5t09DK9w6kvtxVHBLO",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/w60AAAAAAAAAAAAAwzEAAAAAuDIAAAAAezQAAAAAUjQAAAAARjUAAAAA2DcAAAAAfDgAAAAAPDoAAAAAzDoAAAAAuDoAAAAAsDkAAAAAIDkKrwAAsDkAtAAAuDiPtgAAEDg+tgAAEDgotAAAoDQYsgAAgCwYsQAAgDJ4sQAAQDMosAAAgC5wsQAAADCgrwAAADBwsQAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.8924667937747233,
					"scaleY": 0.8924667937747233
				},
				"parentId": "page:page",
				"index": "aJm9IefV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 283.90000000000003,
				"y": 227.20000000000005,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:01N_iGBb4QuzLoUKH5_68",
				"type": "group",
				"parentId": "page:page",
				"index": "aWU8iIxG",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 430.8,
				"y": 121.60000000000001,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:4P54IlA8NX3F84xpKmx2K",
				"type": "geo",
				"props": {
					"w": 353.6,
					"h": 217.60000000000002,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a468kMpV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:2029541850",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.59.24.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMzkuNzA0IiBoZWlnaHQ9IjE2My42NDMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50IiB2aWV3Qm94PSIxMDI5LjE0NCA1MjcuMjgyIDEzOS43MDQgMTYzLjY0MyI+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTExMDAuNjMzIDYwNS44OTItMy4yMDItLjI0Ny02LjgxNS0uMjczLTcuNjk5LjAxLTcuNS4wNDMtNy40MzkuNzYzLTcuNjYgMi4zMDYtNC43NTggNC43OTUtMS41MTUgNi42NjYtMS4xNjUgNy4xMzYtMS4zNyA3LjEwMi0xLjMxNCA4LjQwOC0xLjI5MiA5LjUzMS0uNjcxIDguNDMgMy44MDIgNi4yNyA3Ljk3NCAzLjE3MSA3LjkxMyAxLjE5OSA4LjE4Ni40OSA3LjgzOC4wODMgNS43NDItMi45NzggMy4yMjQtNy4xMTUuOTc2LTQuMTY2YTkuNDggOS40OCAwIDAgMSAxOC45Ni4wMjNsLS4wMTggMy41NzYtMS4wMzggNy4wOTYtMy4wNTggNi4zNi00LjM0OCA1LjgzOS01LjgwNyA1LjQzNy02Ljk0NSAzLjM1LTcuNDI3LjkzNi04LjczMi0uMDYyLTkuNjQtLjU0NS04LjI1Ni0xLjA1LTcuNjM5LTEuNzM5LTguMDM0LTIuNTIzLTYuODA3LTQuMjAzLTQuMTAzLTYuMDk5LTEuMDAyLTcuMzU0LjI0MS03Ljc0Ny44MDQtOC43MDUgMS4wODEtOC40MzguOTU4LTYuOTYzIDEuNDMzLTguNzUgMS40MTUtOS4wNjggMS4yMDYtNy41OTcgMy4wNjYtNy4zMDYgNS40NDQtNS42OSA2LjktMy42NzcgNy4xOS0yLjUyMSA3Ljg0LTEuNTIgNy44Ny0uNTU4IDcuNjE5LjA5MyA4LjM0Ny4yOCA3LjQ0NS41NDUgMy4yODguMzQzYTguMzQgOC4zNCAwIDAgMS0xLjUwOCAxNi42MTMiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTA5OC43ODMgNjE0LjQ1MSAyLjg3NS4wMDQgNi45MTkuNDkgNy41NiAxLjE1NyA3LjA0LjY3NSA3LjE2My0uMjA3IDUuODcxLTIuOTUgMy4yNzYtNi40MjEgMi4yOS03LjEgMi4zNDktNi44MjggMS45NTQtNi45NCAxLjYxMy03LjIyNyAxLjE3Ni03LjI4NC4wNTQtNy4yOTQtMi4zNTgtNi43Ny01LjI5NS01LjI5Ny02Ljc4My0zLjU5Mi02LjkwMy0xLjYxLTYuOTQ2LS4yNi03LjA5NSAxLjU3Mi02LjAzNSA0LjUyLTQuNzQgNS43MS0zLjY1MSA3LjAxNy0xLjM3NiA0LjI0OGE5Ljg1NiA5Ljg1NiAwIDAgMS0xOC45MTEtNS41NmwxLjY4MS00Ljc3IDMuMy03LjgyMiA0LjA3Ni02LjAzNSA0LjgwOC01Ljc4IDQuODU3LTUuNTA1IDUuODQ1LTQuNTYgNy40ODMtMi4yNDIgNy41NjUtLjM5IDYuOTI3LjAzMyA3LjUwMy43MzggNy4yMzMgMS44MjYgNi43MzIgMi44NDUgNi4zNzYgMy44MTUgNS4xNzUgNC42NjYgNC4yODQgNS42NjIgMy42MjEgNi44NzggMS45NDMgNy43MTQuMTA2IDcuNjk4LS44MSA3LjcxMS0xLjQxIDcuNzktMS44MjYgNy45MDQtMi40MjcgOC4xNDktMi42NiA3Ljk0Ny0yLjQ0NCA3LjM5My0yLjg2NiA2Ljc3Ny00LjI5NyA1LjYwNi01Ljk3MSAzLjk0My02Ljg2NyAyLjE4Ni03LjI5MS41OTctNy4zMjUtLjE4My02Ljg5OS0uODE1LTcuMjI3LTEuNDE4LTYuNjM4LS44Mi0yLjc2NS0uMDQ3YTguNzcyIDguNzcyIDAgMCAxIC4xNjEtMTcuNTQ0Ii8+PC9zdmc+",
					"w": 140,
					"h": 164,
					"fileSize": 2648,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 22.35465003053355,
				"y": 299.8998534350135,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:uAeIng3QCwtmyRSV9yfrE",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/ADgAAAAAHz4AAAAA3EIAAAAAE0gAAAAAsUkpuAAA4EjhuAAAeEkpsAAA00pmqgAAu0ofoQAAdkgfoQAAhUcAAAAAW0sAAAAAD0UAAAAAikQAAAAAD0MAAAAAAEMAAAAA0kEAAAAAV0AAAAAAmj17MAAAMz3NNAAA9jpSNAAA1zeuLwAAHzV7LAAAcTHDLQAAuDIfKQAAXDMfIQAArjMfIQAArjMAAAAAADQAAAAArjNmLgAACjOuLwAAZjIAAAAAZi7DLQAAri8KLwAAZjIAAAAAFDIAAAAACjMAAAAACjMAAAAAPTYAAAAAZjIAAAAACjMAAAAAXDMAAAAArjMAAAAACjMAAAAAXDMAAAAAXDMAAAAACjMAAAAAZjIAAAAACi/DLQAA"
						}
					],
					"color": "yellow",
					"size": "s",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 51.76825725127583,
				"y": 25.628966200188415,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:YeS_4JNIAtlbI38ro9ET8",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 134.3828125,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "My workspace"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "aBHnxMZV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1188.8,
				"y": 498.6,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:zn4yOkMh5GKecJEXyeUYP",
				"type": "geo",
				"props": {
					"w": 353.6,
					"h": 217.60000000000002,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a5z5Jpsl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 684.7216330754482,
				"y": 597.1751408471048,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:ji1ypskcArcUIhudTDxla",
				"type": "group",
				"parentId": "page:page",
				"index": "b0EmMvtpV",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 903.4138975201912,
				"y": 135.99408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:HYCB1y-1pT7IMstjiCcI8",
				"type": "geo",
				"props": {
					"w": 234.44013758668294,
					"h": 145.77951664952835,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aE8XXIjV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:-710787950",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.40.23.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MS40NjQiIGhlaWdodD0iNTIuMDY5IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudCIgdmlld0JveD0iMTE1OS4xOCA1MjAuMjY3IDUxLjQ2NCA1Mi4wNjkiPjxwYXRoIGZpbGw9IiMxZDFkMWQiIGQ9Im0xMTYxLjkxNyA1NDEuOTg2IDEuNzE2LjAyOCAzLjU3My4wNzIgNC4wMzguMTQzIDQuNjI3LjE4NyA1LjA3NC4xNTYgNS4wMTguMTE1IDQuNDY3LjA1IDQuMTAyLS4wMDYgMy42MDYtLjA3MiAzLjY3Ni0uMjEyIDQuMDk0LS4yNTggMi0uMTFhMi42NCAyLjY0IDAgMCAxIDAgNS4yODFsLTItLjEwOS00LjA5NC0uMjU4LTMuNjc2LS4yMTItMy42MDYtLjA3Mi00LjEwMS0uMDA2LTQuNDY4LjA1LTUuMDE4LjExNS01LjA3NC4xNTYtNC42MjguMTg3LTQuMDM3LjE0My0zLjU3My4wNzItMS43MTYuMDI4YTIuNzM0IDIuNzM0IDAgMCAxIDAtNS40NjgiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTE4NS45NzcgNTIzLjIyOC0uMTI4IDIuNTctLjIyNCA1LjAzNS0uMTY4IDUuMTg3LS4wNzkgNS42MS4wMjQgNS40MDkuMTM3IDQuNjguMyAzLjk3Mi4zNTggMy4yMi4zNzYgMy43MDIuMzQ0IDQuNTEyLjEzIDIuMjE0YTIuNjM1IDIuNjM1IDAgMCAxLTUuMjY5LjA3bC4wMjctMS4yLjExNi0zLjIyLjEyLTQuNTktLjA3OC00LjQ0LS4yNDgtNC4wOC0uMjQ5LTQuNzU1LS4yMDgtNS40NjItLjE3LTUuNjQyLS4xNjgtNS4xODctLjIyNC01LjAzNS0uMTI4LTIuNTdhMi43MDQgMi43MDQgMCAwIDEgNS40MDkgMCIvPjwvc3ZnPg==",
					"w": 51,
					"h": 52,
					"fileSize": 1508,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 541.1750176535236,
				"y": 978.3154671410399,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:Q_ib93MMvj7i6W98PrU6T",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 994.125,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "p.s. feel free to edit or delete this board now that you've mastered workspaces"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0YrBt7KV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 627.3872360782091,
				"y": 774.4675826150461,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:x7P-1CraTMRhp5I_ScWcM",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/hUwAAAAAhkwAAAAABk0AAAAAhkwAAAAAhUwAAAAA"
						}
					],
					"color": "yellow",
					"size": "s",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "b0Bh1qIZV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 68,
				"y": 172.40678836013603,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:gPZCqHxcToRWQPs_CgKUw",
				"type": "text",
				"props": {
					"color": "grey",
					"size": "m",
					"w": 220,
					"font": "draw",
					"textAlign": "start",
					"autoSize": false,
					"scale": 0.7,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "New workspace"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "a7JQoeIV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1282.7430635705782,
				"y": 207.67000819781413,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:P0nISYQdoNqkxxQYAilvQ",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "black",
					"size": "l",
					"w": 108.715,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Packing checklist"
									}
								]
							}
						]
					}
				},
				"index": "b0Ejpg9vgQ",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1113.533754205407,
				"y": 169.12475424680648,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:7aeWnqwUqZ1sKSYO9RKfD",
				"type": "image",
				"props": {
					"w": 2.613903273850582,
					"h": 7.8417098215517465,
					"assetId": "asset:-1785647319",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "page:page",
				"index": "b0nJRP5UG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:-857523386",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.33.51.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0Ni4xNTciIGhlaWdodD0iNDQuMDY2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudCIgdmlld0JveD0iMTA2My44MTQgNDg2LjI4NSA0Ni4xNTcgNDQuMDY2Ij48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTA3Mi40NzMgNTE0LjUzNy44NTMuNTU0IDIuMyAxLjQ0OSAzLjA3NiAxLjk0MyAyLjk3MSAxLjk1NiAyLjYzIDEuNjI5IDIuNzI4LS41ODIgMy4zNTItMi4yNDMgMy42NzYtMS43NiAzLjUxNC0xLjU4MiAzLjM1LTEuNDkgMi4yMTctMS4zNTQuNjE4LS42M2EzLjU4IDMuNTggMCAwIDEgNC42MTUgNS40NzNsLTEuNTEyIDEuMTY3LTMuMTEzIDEuODYyLTMuMiAxLjQyNy0zLjMxNiAxLjU5NC0zLjM4NSAxLjc3LTMuMzk3IDIuMTEzLTMuODI5IDEuNzE2LTMuNjAzLS4wOTItMi43OTYtMS40MTItMi42NDUtMS44MDUtMi43MzUtMS45NDctMi44OC0xLjg3LTIuMzYtMS40NTgtLjg2Ni0uNTM1YTMuNDkgMy40OSAwIDAgMSAzLjczNy01Ljg5M20yOS42ODctMTIuNzc3LS44NjItLjUzLTIuMzI2LTEuMzgzLTMuMTA1LTEuODUtMi45OTUtMS44NTgtMi42NTktMS41NTEtMi45NjcuNDktMy42MjIgMi4wMDktMy43NzIgMS41NTMtMy42MDUgMS4zOTYtMy40NCAxLjMxNy0yLjMwNCAxLjIyNi0uNjU4LjU4MmEzLjU4IDMuNTggMCAwIDEtNC4yNS01Ljc2MmwxLjU0NS0xLjA0NCAzLjE4OC0xLjY1NiAzLjI5NC0xLjI2NyAzLjQxNi0xLjQyMyAzLjQ5NC0xLjU5IDMuNTE4LTEuOTA3IDMuODMtMS41MDQgMy41MDUuMTYgMi43NjQgMS4zNCAyLjY2IDEuNzE3IDIuNzY2IDEuODU4IDIuOTEzIDEuNzg4IDIuMzg0IDEuMzkuODc0LjUxYTMuNDkgMy40OSAwIDAgMS0zLjU4NSA1Ljk4OSIvPjwvc3ZnPg==",
					"w": 46,
					"h": 44,
					"fileSize": 1641,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:871252900",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 17.48.08.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjMuNTI3IiBoZWlnaHQ9IjE2Ni43NDQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOnRyYW5zcGFyZW50IiB2aWV3Qm94PSIxNjMxLjk2OCA0OTEuMjA5IDE2My41MjcgMTY2Ljc0NCI+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTE3MTkuOTUzIDU1Ny4xNTQtMS4yMTctLjA1NS0zLjI3LS4xMDUtMy44NTYtLjA1Ny0zLjU5OC0uMDAxLTMuMjYyLjE3Mi0yLjg5NyAxLjA5OS0zLjA3NCAyLjYxNC0zLjI3MyAzLjg5NS0yLjM0NyAzLjQzNS0xLjM2NSAyLjUxNy0xLjIyNiAyLjY1OS0xLjM1NyAzLjkwMi0xLjEyOCA0LjkwMy0uNDE4IDQuMzcuMDYgMy45OS42ODIgMy42NTggMS40NDYgMy4wMDYgMi4wOTkgMi41MzUgMy4wNSAyLjUyIDMuNzE1IDIuMjc0IDMuODIzIDEuNjgzIDMuNzU4IDEuMTc3IDMuNzE4LjcyNiAzLjU5Mi4zNDIgMy41MjQtLjExMyAzLjI2NS0uNjcxIDIuOTA3LTEuMzA5IDMuMTUyLTEuOTEgMy4yOTEtMi4zMDMgMi43NTYtMi4yMjUgMi4wNjMtMi4xMDUgMS42NDgtMi43MyAxLjMzLTMuNDg4IDEuMDEyLTMuNTkxLjU4NS0zLjY3Mi4xOS0zLjY4OC0uNDI1LTMuMTItMS4xMTQtMi42OC0xLjY1NS0yLjcxLTIuMTY5LTIuODgxLTIuNS0yLjgtMi40OTQtMi40MzctMi40MzYtMS44NTUtMi42NzItMS4zMi0zLjE3OC0xLjY5MS0zLjMzNS0xLjUxLTEuNTg4LS40MjFhMy44OTcgMy44OTcgMCAwIDEgMS40NTgtNy42NTdsMS42MTcuMzg1IDIuOTc5IDEuMDc3IDIuNTIgMS40ODMgMi40OTggMS4zOCAyLjY2NyAxLjI4OSAyLjY2IDEuODE3IDIuNTY3IDIuMzUgMi40MjMgMi40OSAyLjEwMyAyLjM3IDEuNzY1IDIuMjU1IDEuNjIxIDIuMzIgMS42NyAzLjAxMyAxLjQ0OCAzLjU1Ni42NDQgMy44OC4wMjIgMy42Ni0uMjg5IDMuMTQ4LS43MTQgMy42ODUtLjk2OCAzLjQ4Mi0xLjI5MyAzLjM5MS0xLjU2MyAzLjE1OC0yLjExOCAyLjY2LTIuNjg0IDIuNTU2LTMuMTAzIDIuNDgtMy42NzMgMi42MjUtMy44NTkgMi4zMS00LjAyMSAxLjctMy44OTYuODItMy40MDYuMDg5LTMuNzIxLS4zMDYtNC40MjUtLjcwNy00LjM1My0xLjE4Mi00LjQxMy0xLjcxOS00LjQ3LTIuMzM4LTQuMjM1LTMuMDQyLTMuNTE4LTMuNjEyLTIuNDA4LTQuMTczLTEuMzMtNC43ODUtLjI4My00LjczMi4zNjQtNC43NTcuNTc0LTMuOTMuNjgzLTIuODEyLjg4My0yLjg3MiAxLjA5OS0zLjAwMiAxLjI5Ni0zLjAzOCAxLjQ2Mi0yLjkwOCAxLjYzNC0yLjc4MiAxLjc5MS0yLjYzMiAxLjkxOC0yLjQyIDIuMDM4LTIuMTcgMy44MzEtMi42NTkgNC44ODMtMS44NTIgMy45Mi0uMTc5IDMuNjYzLjA2NiAzLjkyNy4xMDYgMy4zMDUuMDkgMS4yMTguMDI4YTMuMjYgMy4yNiAwIDAgMS0uMjIgNi41MTgiLz48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtMTc1MS44MyA1MzEuMjMzLTEuNDUzLS4wMzUtMy45NzgtLjA1LTQuNzk4LS4wMDgtNC4wMzUuMDQyLTMuMTU4LjA3LTIuOTQzLS4yMS0yLjg4Ny0xLjUyMi0xLjcyNy0zLjAyLS40ODMtMy43MjguMDMyLTMuODcyLjMyNC0zLjY4Ni4yMDktMy4zMjUtLjQ1Ni0zLjE2My0xLjI4LTIuODctMS44NjYtMi4zMzYtMi4zNzYtMi4wNy0zLjIxNC0xLjY2MS0zLjU2OS0uOTA0LTMuMDk2LS4yMzktMy4xMzguMTEtMy4yOTMuNzgtMy4wMDQgMS40MzUtMi44OTIgMS43NDEtMi43NzIgMS44NTMtMi41MTYgMS43ODMtMi40NiAyLjAxMS0yLjE5NyAyLjQyNS0xLjk2IDMuMDI2LTEuNjkyIDMuMDA1LTEuMzU2IDIuNzg2LS44OSAyLjk5OC0uMjAyIDMuMjQ3LjAxMSAzLjM4NC0uMDg3IDMuMTY4LS4zNzIgMy4yMjItLjcyIDMuMTUyLTEuMTYyIDMuMDE2LTEuODY1IDIuNjI1LTIuNjI3IDEuNTIzLTMuMDM2LjgzMi0yLjk0Ljg0Ny0zLjM0NSAxLjA1LTMuODA4IDEuMTU2LTMuOTc0IDEuMTA0LTQuMDMuOTc2LTMuNTY2Ljc0NS0zLjA1Ny42MDgtMy4yNDkuNzQyLTMuMjc2Ljk4LTEuMjkgMi4xNjcuMjMgMy40ODcuMzY3IDMuNDUgMS4zMDMgMi43ODQgMi41MDYgMS41NjQgMi45NzIuODEzIDIuOTcuOTk0IDMuMDI4IDEuNjQyIDIuNDkgMi40MTIgMS42MzggMy4xMSAxLjA2OCAzLjIzOC42MzcgMi45MzEuNTcyIDMuMzkyLjM2IDMuMzQzLS4yMjkgMy4wNjctMS41NiAyLjc1My0yLjgyMyAxLjU1My0yLjk3NyAxLjI5NS0yLjc5NSAxLjg3OC0yLjg3NyAyLjI5Ni0yLjc2MSAyLjQ2NC0yLjQ4NyAyLjY0NS0xLjY4NSAzLjA3OS0uNTUzIDMuNjY2LS4xMTcgNC4wMzMtLjAwNyAzLjkzNy40MzkgMy4zNTIgMS40NCAyLjY3OCAyLjMyNCAxLjk5OCAyLjkxIDEuMzk2IDMuMzU0IDEuMjMxIDMuNDkyLjc1IDMuMjQ2LjIwNiAzLjAxNi0uMjI2IDMuNTY3LS45MzMgMy42MDgtMS4zMzUgMy4wOTEtMS4zODYgMy40OS0xLjY5NyAzLjQ1OS0xLjU4IDMuMzI4LTEuMjU1IDMuMzU1LS45MzEgMy4wNzMtLjM2NSAzLjA2Mi4wMTYgMy41OTQuNTQxIDMuOTEgMS4wNSAzLjE3NyAxLjEyNCAzLjA3NSAxLjQ5MyAzLjAxOSAyLjEwMyAyLjA2MSAyLjM0IDEuNTUzIDIuNjUxIDEuNTQyIDIuNzM3IDEuODA0IDIuNDA1IDEuOTg1IDIuMTkzIDIuMDUgMi4zMiAyLjE0MSAyLjQxNyAyLjUyNy41MTggMy4wMTQtMS41ODQgMi43NjItMS43MzUgMi40MzctMS43OSAyLjM2Ni0xLjk0NCAyLjMzNy0xLjkxMSAyLjA4Ni0yLjA1MSAxLjItMi41NTQuMzItMy4zMjYuMzU2LTMuNjkgMS4wNy0zLjYwMyAxLjY2My0zLjE1IDIuMTQ1LTIuNDY1IDIuOTAxLTEuNzYyIDMuMTA0LS44NSAzLjQxNC0uMjIxIDQuMDA5LS4wMiAzLjU0OC4xMjIgMi45ODUuNDQgMi45NTMuODkyIDIuODIgMS4xMjIgMi45NSAxLjE3MyAzLjAzMi45NzcgMi4yMzYtMS4yMDkgMS43MzQtMi44MjcgMS44MjYtMi42NTkgMS44NDctMi44ODUgMS44Mi0yLjk5MyAxLjQ2NC0yLjg3NC42MzYtMy4wMjktLjE0NS0zLjA2My0xLjMxMi0yLjY5Ni0yLjE3NS0yLjM1Ny0yLjI4LTIuMDQtMi42LTEuNzk5LTIuOTI2LTEuMzQyLTMuMTctLjkzMS0zLjA3LTEuMjA2LTIuMjg2LTEuOTU0LTEuMTQtMi43NTQtLjMwMi0zLjE0Mi4wOS0zLjM5Ny40NDctMy4zNjkuODk5LTMuMDE2IDEuMjIxLTIuOTAyIDEuNDM3LTIuNjM0IDEuODYtMi41NTQgMi4xODctMi40NDggMi4xNjYtMi4yNSAyLjI2NS0yLjMyNiAyLjE1NS0yLjI3NyAxLjkwNi0yLjExOSAxLjYyNy0xLjc2My42ODUtLjcxM2EzLjczNCAzLjczNCAwIDAgMSA1LjUxMyA1LjAzN2wtMS41MTMgMS43Ni0yLjU5NCAyLjk2Ni0yLjMxMyAyLjQ5LTIuMzIgMi40MzYtMi4yNjQgMi40MDMtMi4wNCAyLjM5MS0xLjU3OCAyLjU4NC0xLjI0NyAzLjExNi0uNjcyIDMuMzU2LS4xMyAzLjE3IDEuMzc4IDEuODIzIDIuODI0LjgxMiAyLjkyMiAxLjIwOCAyLjc0MyAxLjU3NyAyLjY3NSAxLjk4MSAyLjc3OCAyLjQ4NiAyLjY1OCAyLjg0NiAyLjEzNiAzLjI4MS45ODMgMy4zMzYuMDc3IDMuMjEtLjMwOSAzLjI1NS0uOTc0IDMuMjMzLTEuNDk3IDIuOTYxLTEuNTUgMi42MS0xLjcxMiAyLjg4Mi0xLjkyOCAzLjE2Mi0xLjg4NSAyLjg1Ni0xLjk0OCAyLjYyMi0yLjEzNSAyLjI4Ny0yLjgxMyAxLjE1OC0zLjE0LS4xMDUtMi43NTEtLjc1OC0yLjgwMy0xLjAyOC0zLjAxLTEuMjMzLTMuMDgtMS4xNDMtMy4zNzctLjU0OC0zLjgxMS0uMDIzLTMuNDI4LjA5OC0yLjgwNC43Ni0yLjA4NSAyLjEyOC0uOTUzIDIuODg1LS4yMjMgMy4xNi0uMjIxIDMuNDUyLS44NzggMy4xNTEtMS42MTcgMi42NjktMi4wNTEgMi4zNTgtMi4yNTUgMS45NTgtMi4zNCAxLjg1OS0yLjMwNyAxLjkwOC0yLjI4NSAxLjY4Ni0yLjUgMS41ODctMi41NjMgMS42MDQtMi42NDYgMS42NDgtMi45MjggMS4wOS0yLjk2LS4yMzgtMi41OTUtMS40NTMtMi4zNTgtMi4zMi0yLjI4NC0yLjU5Ny0yLjA5LTIuNDU0LTEuOTg3LTIuMjUtMS43ODEtMi4yNjMtMS41MzctMi41OS0xLjQ1LTIuODMzLTEuOTMtMi40MTYtMi44MDUtMS42MzktMy4xNzMtMS4xODEtMy4xMS0uODUzLTMuMTktLjQzMy0zLjA5Ni4wMjUtMy4wMDYuNjMtMi44NjUgMS4wNDEtMi41NjcgMS4xMzUtMi42NTMgMS4zMDctMy4xNCAxLjUyMS0zLjU0IDEuNTU3LTMuMzQ0IDEuMjI4LTMuMTE5Ljc5LTMuMDc0LjM2LTMuMjg1LjAxOC0zLjQ3Ni0uMjc4LTMuMjA2LS42NjQtMi44NDItLjk0Mi0zLjEyNi0xLjMxNi0zLjI0Ni0xLjczNC0yLjY2NS0yLjE2OS0yLjExLTIuOTEyLTEuMzMtMy4wNTQtLjY2Ny0zLjE5NS0uMjQ0LTMuMjIuMDA4LTMuNDUxLjA0NC0zLjQ0Ni4yNS0zLjI3OC43NzYtMy41MjIgMS42Mi0zLjA3NCAyLjEyNC0yLjY1IDIuNC0yLjU1MyAyLjk3LTIuODUyIDMuMTQ2LTIuNzUzIDIuODg2LTIuMTM3IDIuOTM4LS40MyAxLjUyMy0xLjA1Mi0uMzAzLTMuMTEtLjY5LTMuNDg2LS45MDEtMy4yODYtMS40NC0yLjQ3Ni0yLjUyLTEuNjMyLTMuMDczLS45NS0zLjA3NC0uODkyLTIuODYtMS4zNDctMi4xODUtMi4wNDItMS40OC0yLjkyOC0uODQ1LTMuMjI5LS40MTgtMy4xOTUtLjE5LTMuMTY0LjAwNC0yLjk4Mi4yNjMtMi45MjcgMS40MDctMi42MTIgMi42NDItMS45MiAyLjg0NC0xLjA5MSAzLjI3LS44MiAzLjM4Mi0uNzE5IDMuMDc0LS41OTcgMy4zMzctLjcyNyAzLjY1NS0uOTk2IDMuNzE0LTEuMTg2IDMuNjczLTEuMjkgMy40MTEtMS4yMyAzLjAwMy0uOTM4IDIuNTQtMS4zMzYgMS40NjMtMi40OS41MzYtMy4xNDQuMTYtMy4yMjQuMDMxLTMuNDkuMjEyLTMuNDcyLjc2NC0zLjI3MyAxLjIyOS0yLjk3OSAxLjM0OS0yLjYyMSAxLjQ5LTIuNjk4IDIuMDE3LTMuMTQgMi4zMjctMi45NDMgMi4yNDktMi4xMTYgMi40MDgtMS44MjQgMi42Ni0xLjg2NyAyLjk2NC0yLjAwMyAzLjQxNi0yLjEgMy4zNjUtMS42ODUgMy4yMzUtLjk5OCAzLjI1LS40MDcgMy4xMzEuMDE4IDMuMDQzLjIyMiAzLjM1NC42NCAzLjgxOSAxLjM0MSAzLjY5MSAyLjE3MyAzLjMxIDIuODgyIDIuNzUgMy40NjcgMS45ODMgNC4xMzQuODA3IDMuNjg0LS4wMzQgMy4xMDUtLjM5IDMuNTg3LS4zODYgMy40NjctLjE5OSAyLjk5MiAxLjI3NSAxLjQ3NCAzLjE1Ny4wNzEgNC4wMzUuMDQyIDQuNzk4LS4wMDggMy45NzgtLjA1IDEuNDUzLS4wMzVhMy4yMSAzLjIxIDAgMCAxIDAgNi40MiIvPjxwYXRoIGZpbGw9IiMxZDFkMWQiIGQ9Im0xNzg0LjgyIDU0Ny42OS41Ny0uNzI3IDEuNTAyLTIuMDQ3LjIwOC0yLjcwNy0xLjUzLTIuNzI1LTEuODIyLTIuNDYyLTIuNDUtMS44MTgtMi44MjctMS4xMTctMy0uNjgtMy4zMTktLjM5OC0zLjUyMy0uMjk4LTMuNDUzLS4yMjUtMy4xMzMtLjA2NC0zLjA2LS4wNzktMi45OTEtLjE5LTQuMjkyLS41OTMtMi44NjctLjQ4NWEzLjg5OSAzLjg5OSAwIDAgMSAyLjMtNy40NWwuNTk1LjI1IDIuMTI2LjMxNCAyLjkyMy4xNTggMi44NTUuMjIzIDMuMDg1LjE0NSAzLjIxMi4xMTIgMy4zMDEuMjQ1IDMuMTQuMjcyIDMuMTgyLjM0OCAzLjUxNy42NzcgMy4xMS45MzMgMi44NzkgMS4yNzcgMi44NTQgMS45NzEgMi4yMDggMi4yODIgMS43MjEgMi41MjMgMS40NzggMi43NyAxLjI0NiAyLjg3My40NjcgMy4wNTYtLjg5NSAyLjc4My0xLjY5NSAyLjQ2My0xLjUgMS45NTMtLjU2MS43MzZhMy41MTUgMy41MTUgMCAwIDEtNS41NjItNC4yOTgiLz48L3N2Zz4=",
					"w": 164,
					"h": 167,
					"fileSize": 8876,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 87.08918666696331,
				"y": 777.5875803198425,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:fIDjWK2ykMzqPuSHzu9-q",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/wzEAAAAAmjwAAAAAn0AAAAAA0kAAAAAAM0IAAAAALEQAAAAAoUQAAAAASEQAAAAABUEAAAAAZkAAAAAAD0AAAAAAhT0AAAAArj0AAAAArjsAAAAAPTgAAAAA9jQAAAAAUjQAAAAAZjIAAAAAcTEAAAAAwzEAAAAAHzUAAAAASDUAAAAArjMAAAAAXDMAAAAACjMAAAAACjMAAAAAuDIAAAAASDUAAAAApDQAAAAAHzEAAAAA9jQAAAAAHzUAAAAAXDMAAAAArjMAAAAAmjUKrwAAXDcKrwAACjkfoQAAKToAAAAAzT0foQAA7DkAAAAAhTsAAAAAmjsAAAAAzToAAAAAmjkAAAAAUjgAAAAAPTYAAAAAADQAAAAACjMAAAAAuDIAAAAAuDIAAAAAFDIAAAAAwy1mrgAAAABmsgAAAAC4sgAAw7FmrgAA"
						}
					],
					"color": "yellow",
					"size": "s",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "b0LZNxKEN",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 85.32000000000002,
				"y": 151.67812500000005,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:0jnFnLMQHaMDA1p2DVtWW",
				"type": "text",
				"props": {
					"color": "grey",
					"size": "s",
					"w": 100.5496875,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "your workspace"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aroHo9OV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 936.3413948263201,
				"y": 373.6794785153351,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:1LwySRXm4pYn2w9N1kpUG",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAAzTQKrwAAjzwAAAAAOEEAAAAAZkQAAAAAe0YAAAAAUkcAAAAAV0UAAAAAJEkAAAAAFEIAAAAA8UIAAAAAs0MAAAAA7EEAAAAAdkAAAAAApD4AAAAApDwAAAAA9jgAAAAAZjYAAAAAwzUAAAAAFDIAAAAAcTEAAAAAFDIAAAAAXDMAAAAArjMAAAAA1zcAAAAArjwAAAAAez4AAAAAUkAAAAAArj/NMAAAgEK4OAAAjz5SNAAAjz9INQAAPT64MgAAKT4UMgAAUj2kNAAArjt7NAAASDsfMQAA9jofJQAAhTkAAAAAXDkAAAAAMzkAAAAAZjYAAAAAhTcAAAAAzTgAAAAArjkAAAAA4ToAAAAA4ToAAAAA4ToAAAAA4ToAAAAA9joAAAAAzTopsAAAKTwKswAAPTZmrgAAPTZmqgAAezQfpQAAADQfoQAAHzEKrwAAHylmsgAAAABmsgAAZq5mrgAAuLIfoQAAZrIAAAAAw7EAAAAA"
						}
					],
					"color": "yellow",
					"size": "s",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "aAzO5Bu2O",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 65.4519590392913,
				"y": 128.898680379275,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:ppt-WSgYvX8ljtFGgVm6L",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 230,
					"font": "draw",
					"textAlign": "start",
					"autoSize": false,
					"scale": 0.7,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "serious business"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "aAlsDulV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1282.7430635705782,
				"y": 278.6700081978141,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:kINtILDRfQXBDPWItXjGu",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "black",
					"size": "l",
					"w": 141.174375,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Post-trip retrospective"
									}
								]
							}
						]
					}
				},
				"index": "b0Ek2ob4JWV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 37,
				"y": 101.40678836013592,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:76GhyUAVKL6DGSeX-RxUn",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 316.3537914442346,
					"font": "draw",
					"textAlign": "start",
					"autoSize": false,
					"scale": 0.7,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "✓  me and my friends"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "a6nao5Ul",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 572.4025912587633,
				"y": 281.91003006681876,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:NtAFTU0idPdg4i80omS6p",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 54.5390625,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Penta"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "akLtvrjV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 22,
				"y": 15,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:J5rz-Uc6_LivmWF4qtpQr",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 134.1328125,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.75,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "My workspace"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "a3oBB5UG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 866.5909864643908,
				"y": 273.99408605949236,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:KGCqon2X2jUu_-P5RUs9q",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/Zq4AAAAAIKUAAAAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.8924667937747233,
					"scaleY": 0.8924667937747233
				},
				"parentId": "page:page",
				"index": "aHOR7UYG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 631.6106160040639,
				"y": 152.18282340745472,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:tlHJDTMKYN43ivH9sWbyc",
				"type": "geo",
				"props": {
					"w": 109.84587570313896,
					"h": 23.66436033469958,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0eCp2nXV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 909.1369788246451,
				"y": 141.404687980831,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:kHzy0KzEZ-Tl6iQE6VJXq",
				"type": "geo",
				"props": {
					"w": 234.44013758668294,
					"h": 145.77951664952835,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "grey",
					"labelColor": "black",
					"fill": "fill",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aDercZlV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 12.831816252926274,
				"y": 60.98260204216217,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:ivumf6N4TujbksQ31nIxy",
				"type": "geo",
				"props": {
					"w": 329.03076665180606,
					"h": 143.78491733435268,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "a3KiH2wV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 42.01894326919904,
				"y": 24.07841325368804,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:DW26TLgezpPlK3l3bgBMn",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.6330585325466017,
					"scaleY": 0.6330585325466017
				},
				"parentId": "shape:01N_iGBb4QuzLoUKH5_68",
				"index": "a3KpYESV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 559.0724999326351,
				"y": 238.98755154370974,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:l7qI8vbK9AXimCIWi9LfA",
				"type": "geo",
				"props": {
					"w": 196.67313508595362,
					"h": 78.83573731273304,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aaNcHysV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 32.216494505131834,
				"y": 30.547902709481576,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:WJZGwFqqjjcYs8gGO2mtd",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/w60AAAAAAAAAAAAAwzEAAAAAuDIAAAAAezQAAAAAUjQAAAAARjUAAAAA2DcAAAAAfDgAAAAAPDoAAAAAzDoAAAAAuDoAAAAAsDkAAAAAIDkKrwAAsDkAtAAAuDiPtgAAEDg+tgAAEDgotAAAoDQYsgAAgCwYsQAAgDJ4sQAAQDMosAAAgC5wsQAAADCgrwAAADBwsQAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.6330585325466017,
					"scaleY": 0.6330585325466017
				},
				"parentId": "shape:JcQ824JW6ZnGGqjecw9ze",
				"index": "a4kgKzMl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 72.75261347315279,
				"y": 508.4774993415251,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"type": "group",
				"parentId": "page:page",
				"index": "b0PYhUvCl",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 202.73229441361286,
				"y": 27.945074568090376,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:5_zpqn_y1-LrGg1Y4EflH",
				"type": "image",
				"props": {
					"w": 21.19576615892475,
					"h": 20.27421110853672,
					"assetId": "asset:-857523386",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "a9zUJWCO",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 50,
				"y": 22.537567266503864,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:lC5iGWdiF2kYebPJxooPZ",
				"type": "text",
				"props": {
					"color": "black",
					"size": "xl",
					"w": 8,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.9759734361609516,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "Welcome to your workspace"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a1QPltFV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 283.26024815050204,
				"y": 755.2951763245295,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:_GJWGmxgPZ0LaONiOB5-u",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AACurwAApDiurwAAMzwAAAAAHz8AAAAACkIAAAAAvUMAAAAAYUQAAAAAg0QAAAAAO0QAAAAAdkEAAAAAe0AAAAAA0kQAAAAASDwAAAAAMzwAAAAAzTgAAAAAPTYAAAAAcTUAAAAApDQAAAAArjMAAAAArjMAAAAAXDMAAAAAKTQAAAAAXDMKrwAAZjJmrgAAXDMfoQAAKTQfpQAAZjYpsAAAwzkpsAAAcT0UsgAAez7DtQAAwz8UtgAAyEDNuAAAcT89tgAAcT2urwAArj4KtwAA9j4puAAACj4ptAAAUj0KswAAXDwftQAAzTrDsQAAADgfqQAA9jQfoQAAezQAAAAAADQfoQAA"
						}
					],
					"color": "yellow",
					"size": "m",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 1.3273446341819206,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "b0LToNWQr",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 447.8061172581525,
				"y": 377.67107399753957,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:AqB9aA14gRhGnG2XlOes5",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/zTQAAAAAcT0AAAAA7D4AAAAAgEAAAAAAn0QAAAAAXEQAAAAAvUNcswAAtkg9uAAAc0SPtgAATUVxsQAAVEV7rAAAIUWupwAAgEQfoQAAbkQfoQAAEkQAAAAAZkMAAAAAD0MfoQAASEIAAAAA8UAAAAAABUEAAAAAs0IAAAAA9kIAAAAA+0IAAAAAgEMAAAAAs0IAAAAAAEIAAAAArkIAAAAAH0IAAAAAs0AAAAAAZkMAAAAApD4AAAAAAEEAAAAAOEEAAAAAmj8AAAAAKUEAAAAAYUIAAAAAM0AAAAAAPT8AAAAAw0AAAAAAqUAAAAAAJEAAAAAAAD4AAAAAMz0AAAAAcT0AAAAA4TwAAAAAmjwAAAAAzToAAAAAHzkAAAAAuDYAAAAAUjQAAAAAXDMAAAAACjMAAAAAuDIAAAAAZi5mLgAAAAAUMgAAAABmMgAAwy0KLwAAuDIfIQAAXDMAAAAAXDMAAAAA7DUAAAAAADgAAAAA1zcAAAAA1zcAAAAAMzkAAAAAKToAAAAApDoAAAAA1zkAAAAA1zkAAAAA1zkAAAAAZjgAAAAAjzYAAAAAFDYAAAAAwzUAAAAAZjauqwAAFDIKrwAAzTCuKwAAH63DLQAA"
						}
					],
					"color": "yellow",
					"size": "s",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "a9aRS4KV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 486.5960404567261,
				"y": 579.8175067242918,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:_OFwtbv8N2uSP_3krZaZl",
				"type": "geo",
				"props": {
					"w": 30.503710026170605,
					"h": 26.50174044358154,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0IrzbnDl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 655.4824582082308,
				"y": 526.4022504453819,
				"rotation": 0.43633231299858277,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:SpVslqJzaRS4QlgY8S7vz",
				"type": "image",
				"props": {
					"w": 68.1763008326575,
					"h": 40.26353998450425,
					"assetId": "asset:-1893437903",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "page:page",
				"index": "b0GtrW4SV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 51.94047094431892,
				"y": 498.70259938713275,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:YheAd-LFP2XDh2XEZdiCI",
				"type": "geo",
				"props": {
					"w": 353.6,
					"h": 217.60000000000002,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0QVkAaVV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 20.48764116032075,
				"y": 26.174423770442814,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:fMcufeQNjU0q_1cPwDD6q",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/Zq4AAAAAIKUAAAAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.685919876085497,
					"scaleY": 0.685919876085497
				},
				"parentId": "shape:zsO14CPjCHyna_7IRxlbp",
				"index": "a2DpXERV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1202.3659746263784,
				"y": 365.9200081978141,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:6YQTFRGGE5PCu9pbeg8x_",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 480,
					"font": "draw",
					"textAlign": "middle",
					"autoSize": false,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Pin files you use most. "
									},
									{
										"type": "text",
										"marks": [
											{
												"type": "bold"
											}
										],
										"text": "Pinned files"
									},
									{
										"type": "text",
										"text": " stay at the top of the list, so they’re always easy to find."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aT92IHCV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 448.79772286143384,
				"y": 209.70570749458875,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:UY73tKpPQTAsRRoNV48I-",
				"type": "group",
				"parentId": "page:page",
				"index": "ae1onPjV",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"meta": {},
				"id": "page:page",
				"name": "Page 1",
				"index": "a1",
				"typeName": "page"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"gridSize": 10,
				"name": "",
				"meta": {
					"storageUsedPercentage": 1
				},
				"id": "document:document",
				"typeName": "document"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 834.5909864643908,
				"y": 234.99408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:eiW2fOCKrgtGLo508m7Za",
				"type": "geo",
				"props": {
					"w": 90,
					"h": 90,
					"geo": "pentagon",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aGSfnj2V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 63.60000000000001,
				"y": 363,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:H2UJSrDaKd8hwk_0Y3WR1",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 480,
					"font": "draw",
					"textAlign": "middle",
					"autoSize": false,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "A workspace is a "
									},
									{
										"type": "text",
										"marks": [
											{
												"type": "bold"
											}
										],
										"text": "shared space"
									},
									{
										"type": "text",
										"text": " for your team. Everyone in it sees the same list of files and can open and edit them."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a83TPnDV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 41.546496558607714,
				"y": 22.560868817835257,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:AIslmXSqzsoijvYS1cOYR",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.685919876085497,
					"scaleY": 0.685919876085497
				},
				"parentId": "shape:zsO14CPjCHyna_7IRxlbp",
				"index": "a3WkZwUG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 684.0788356688234,
				"y": 251.62846365402453,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:SVfAurjsff53EZiwNcRGB",
				"type": "text",
				"props": {
					"color": "grey",
					"size": "s",
					"w": 62.8125,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Owner"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aox9z7gl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 971.6738240253422,
				"y": 166.38442167738134,
				"rotation": 0,
				"isLocked": false,
				"opacity": 0.1,
				"meta": {},
				"id": "shape:DYBBYJovlYVz0y_YIjjNY",
				"type": "geo",
				"parentId": "page:page",
				"props": {
					"w": 150,
					"h": 15,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "grey",
					"labelColor": "black",
					"fill": "fill",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"index": "aQttzJpl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 20.4275209223905,
				"y": 115.55891309022036,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:pRGsfM3x2aFVd0l_qRkR4",
				"type": "image",
				"props": {
					"w": 17.850147058902063,
					"h": 18.168899684953885,
					"assetId": "asset:1378765761",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "shape:Xe4UktrGyB5MiqG7cTJvr",
				"index": "a8Ui8yAl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 22.583017062143142,
				"y": 27.41348470347515,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:S1OAPSiGK5ESxKyD654-s",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/Zq4AAAAAIKUAAAAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.6330585325466017,
					"scaleY": 0.6330585325466017
				},
				"parentId": "shape:01N_iGBb4QuzLoUKH5_68",
				"index": "a2czFd7G",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1274.7430635705782,
				"y": 264.6700081978141,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:3Au97FHr_KS0FpIxbno9W",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "grey",
					"size": "l",
					"w": 63.68359375000001,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Yesterday"
									}
								]
							}
						]
					}
				},
				"index": "b0Ek1AsAdtV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 62.332607129867256,
				"y": 741.4181754976953,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:pAm1WIeABAT1LGBQKRc7x",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 480,
					"font": "draw",
					"textAlign": "middle",
					"autoSize": false,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "Find everything in the "
									},
									{
										"type": "text",
										"text": "workspace menu",
										"marks": [
											{
												"type": "bold"
											}
										]
									},
									{
										"type": "text",
										"text": ": create files, search, switch workspaces, and open settings."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0LgtrKDt",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 30.925528518676202,
				"y": 29.570570413678865,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:kxwBtmXNqfJ968x59YZDi",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/w60AAAAAAAAAAAAAwzEAAAAAuDIAAAAAezQAAAAAUjQAAAAARjUAAAAA2DcAAAAAfDgAAAAAPDoAAAAAzDoAAAAAuDoAAAAAsDkAAAAAIDkKrwAAsDkAtAAAuDiPtgAAEDg+tgAAEDgotAAAoDQYsgAAgCwYsQAAgDJ4sQAAQDMosAAAgC5wsQAAADCgrwAAADBwsQAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.685919876085497,
					"scaleY": 0.685919876085497
				},
				"parentId": "shape:zsO14CPjCHyna_7IRxlbp",
				"index": "a4OzCnsG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": -3.9810919323204246,
				"y": -3.528128306754155,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:phqd-iUP5kIZPeUcI7KT8",
				"type": "geo",
				"props": {
					"w": 69.3440966554546,
					"h": 69.3440966554546,
					"geo": "cloud",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "shape:zsO14CPjCHyna_7IRxlbp",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 38.50843667040294,
				"y": 173.4010526707625,
				"rotation": 0.10471975511965947,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:B_XJNa5ryDd56ohDyP9n1",
				"type": "image",
				"props": {
					"w": 16.22080037471119,
					"h": 17.10557130424089,
					"assetId": "asset:1814878790",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "aCMuJB8V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 22.583017062143142,
				"y": 27.41348470347515,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:Mu61th8Aby-cgKZCXSVsG",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/Zq4AAAAAIKUAAAAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.6330585325466017,
					"scaleY": 0.6330585325466017
				},
				"parentId": "shape:JcQ824JW6ZnGGqjecw9ze",
				"index": "a263MQQV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 565.9408031560263,
				"y": 246.364262687267,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:TQQ4JItxoFtTqRqCcamZ-",
				"type": "geo",
				"props": {
					"w": 196.67313508595362,
					"h": 78.83573731273304,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "grey",
					"labelColor": "black",
					"fill": "fill",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aYI1An4V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 825.2,
				"y": 363,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:zYnof-9e8Q0So7eAUSWh7",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 480,
					"font": "draw",
					"textAlign": "middle",
					"autoSize": false,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "You can "
									},
									{
										"type": "text",
										"marks": [
											{
												"type": "bold"
											}
										],
										"text": "move files"
									},
									{
										"type": "text",
										"text": " into your workspace with a file's 'Move to' menu."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aAzwY1TUC",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 975.5909864643908,
				"y": 250.74408605949233,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:CMMgfwD3VhmOcKHbAjgEV",
				"type": "text",
				"parentId": "page:page",
				"props": {
					"color": "black",
					"size": "l",
					"w": 141.174375,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.34,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Post-trip retrospective"
									}
								]
							}
						]
					}
				},
				"index": "aPhmc76V",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1294.1885555037613,
				"y": 754.735276225546,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:1yNUPDRw7Ur08jBDocjT-",
				"type": "highlight",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/zTQAAAAAcT0AAAAA7D4AAAAAgEAAAAAAn0QAAAAAXEQAAAAAvUNcswAAtkg9uAAAc0SPtgAATUVxsQAAVEV7rAAAIUWupwAAgEQfoQAAbkQfoQAAEkQAAAAAZkMAAAAAD0MfoQAASEIAAAAA8UAAAAAABUEAAAAAs0IAAAAA9kIAAAAA+0IAAAAAgEMAAAAAs0IAAAAAAEIAAAAArkIAAAAAH0IAAAAAs0AAAAAAZkMAAAAApD4AAAAAAEEAAAAAOEEAAAAAmj8AAAAAKUEAAAAAYUIAAAAAM0AAAAAAPT8AAAAAw0AAAAAAqUAAAAAAJEAAAAAAAD4AAAAAMz0AAAAAcT0AAAAA4TwAAAAAmjwAAAAAzToAAAAAHzkAAAAAuDYAAAAAUjQAAAAAXDMAAAAACjMAAAAAuDIAAAAAZi5mLgAAAAAUMgAAAABmMgAAwy0KLwAAuDIfIQAAXDMAAAAAXDMAAAAA7DUAAAAAADgAAAAA1zcAAAAA1zcAAAAAMzkAAAAAKToAAAAApDoAAAAA1zkAAAAA1zkAAAAA1zkAAAAAZjgAAAAAjzYAAAAAFDYAAAAAwzUAAAAAZjauqwAAFDIKrwAAzTCuKwAAH63DLQAA"
						}
					],
					"color": "yellow",
					"size": "s",
					"isComplete": true,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.8918487014551457,
					"scaleY": 1
				},
				"parentId": "page:page",
				"index": "b0R2ZzSMG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 0,
				"y": 0,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:MOf-nT5Jwmw2deadeTi5K",
				"type": "geo",
				"props": {
					"w": 353.60000000000014,
					"h": 217.89285719334507,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "s",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": []
							}
						]
					}
				},
				"parentId": "shape:dgcWyk44ZTHFxW5gXZgFW",
				"index": "a4ibZOxV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1330.4025912587633,
				"y": 627.3067798250604,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:epG_lPK0tUwcUuXPWtJgB",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 63.625,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 1,
					"richText": {
						"type": "doc",
						"attrs": {
							"dir": "auto"
						},
						"content": [
							{
								"type": "paragraph",
								"attrs": {
									"dir": "auto"
								},
								"content": [
									{
										"type": "text",
										"text": "Cloudy"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "ajVYhSTV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1206.7977228614338,
				"y": 586.7057074945888,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:yHgOIUpXOB5gz0YmXcFpf",
				"type": "group",
				"parentId": "page:page",
				"index": "af2mx71V",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 63.34738688252855,
				"y": 32.65850241262626,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:QcRhYiNXR8n1nz3Go1LkC",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.8087283821064223,
					"scaleY": 0.8702608303666457
				},
				"parentId": "shape:ji1ypskcArcUIhudTDxla",
				"index": "a3HWC9JV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 38.51811068125551,
				"y": 37.243200193332996,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:mfexZmJ_oZpHaAdBxK8jQ",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/Zq4AAAAAIKUAAAAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.8087283821064223,
					"scaleY": 0.8702608303666457
				},
				"parentId": "shape:ji1ypskcArcUIhudTDxla",
				"index": "a20KqQIV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 0,
				"y": 0,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:oGMxNlLO7af5jfdrVx9rz",
				"type": "geo",
				"props": {
					"w": 63.99999999999999,
					"h": 63.99999999999999,
					"geo": "pentagon",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "semi",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "shape:01N_iGBb4QuzLoUKH5_68",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 662.5040840636271,
				"y": 256.70586320490406,
				"rotation": 6.265732014659645,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:K7RlC1l6x2h35TiYnzT1s",
				"type": "image",
				"props": {
					"w": 17.270115857349463,
					"h": 14.161495003026559,
					"assetId": "asset:67548994",
					"playing": true,
					"url": "",
					"crop": null,
					"flipX": false,
					"flipY": false,
					"altText": ""
				},
				"parentId": "page:page",
				"index": "azgAhNrV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 78.30000000000003,
				"y": 174.20000000000005,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:CEuDWcLPOmNVXMTH4bprx",
				"type": "geo",
				"props": {
					"w": 297,
					"h": 135,
					"geo": "rectangle",
					"dash": "dashed",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "black",
					"labelColor": "black",
					"fill": "none",
					"size": "m",
					"font": "draw",
					"align": "middle",
					"verticalAlign": "middle",
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph"
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aUiXHuiV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 1202.8,
				"y": 741,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:v1LgJFqRFgth6yiPcQDbv",
				"type": "text",
				"props": {
					"color": "black",
					"size": "m",
					"w": 480,
					"font": "draw",
					"textAlign": "middle",
					"autoSize": false,
					"scale": 0.68,
					"richText": {
						"type": "doc",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "Need to "
									},
									{
										"type": "text",
										"text": "remove someone",
										"marks": [
											{
												"type": "bold"
											}
										]
									},
									{
										"type": "text",
										"text": "? Owners can change roles or remove people in Manage workspace."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "b0S3pftNV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"id": "asset:1092903856",
				"type": "image",
				"typeName": "asset",
				"props": {
					"name": "shapes at 26-06-16 16.43.58.svg",
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMy4zNTYiIGhlaWdodD0iMjkuMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6I2Y5ZmFmYiIgdmlld0JveD0iNjk5LjgwNiA1MjYuMTg5IDMzLjM1NiAyOS4zIj48cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtNzA0Ljc2MyA1MzIuNzQtLjA0IDEuMDE0LS4wMzQgMi4yNzMuMDQyIDIuMiAxLjA4MiAxLjA5OCAyLjI0NC0uMTM1IDEuMTk3LS4yOWEyLjM2NyAyLjM2NyAwIDAgMSAxLjE4IDQuNTg1bC0xLjMyLjM1OS0yLjQzOC41MzYtMi40NjMuMTIzLTIuMjMzLS44MTEtMS4xOTMtMS42NS0uNDM3LTEuODgxLS4wOTUtMS45MzMuMDQyLTIuMjAxLS4wMzUtMi4yNzMtLjA0LTEuMDE0YTIuMjcgMi4yNyAwIDAgMSA0LjU0MSAwIi8+PHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTcwMi42MzUgNTM3Ljg1Ni4yMzctLjY5LjYyNS0xLjY4MS45NDYtMS44OTQgMS41ODMtMS44MDMgMS43OTctMS40MzggMS43ODQtMS4wOCAyLjE0OC0xLjAyOSAyLjQ3Mi0uODY1IDIuNjkxLS41NDIgMi40NjYtLjIwNyAyLjQ5NS0uMDU1IDIuNDY3LjIzNyAyLjE2OC43OTIgMi4wMjEgMS4yMzIgMS42MTEgMS4zMzggMS4zOTIgMS44MzcgMS4wMDMgMi4zOC4zMjUgMi41MjYtLjAyIDMuMDg2LS4xOTcgMy40NzEtLjQ0MSAzLjAzLS44NTYgMi40NzctMS4yODYgMS44MDctMS42MSAxLjA0NS0yLjQxLjk2NC0yLjQxNy44NTYtMi4xNjYuNzY3LTIuNzQ5LjUzOC0xLjQ2Ny4wNjdhMi4yMzcgMi4yMzcgMCAwIDEgLjAwNy00LjQ3NWwuNzcyLjA3IDEuOTc0LS4zODYgMi4wNzYtLjgxMiAyLjIyLS45MTUgMi4zMS0xLjI2NiAxLjE5Ni0xLjYxNS4yOTQtMi4zODQtLjAwNC0zLjIxNC0uMTI0LTMuMTM4LS41MjYtMi4zMDUtMS4zNTQtMS42MTYtMS43MzUtMS4xNDUtMS44My0uNTA5LTEuOTE2LS4wNi0xLjk1Ni4wOC0xLjk5NC4yNTYtMS45OC41NjctMS44OTQuODA1LTEuOTI2IDEuMDgyLTEuODM2IDEuMzIxLTEuMjMgMS41OTctLjY1NCAxLjYyMi0uMjIzLjY5NmEyLjI1NCAyLjI1NCAwIDAgMS00LjI4LTEuNDIyIi8+PC9zdmc+",
					"w": 33,
					"h": 29,
					"fileSize": 1879,
					"mimeType": "image/svg+xml",
					"isAnimated": false
				},
				"meta": {
					"fileId": "qv3i1CUS5pyX4ZpSv4Ji_"
				}
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 42.01894326919903,
				"y": 24.07841325368804,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:2zOx6Fj1qdZtgPq8OIVAB",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AAAKrwAA"
						}
					],
					"color": "black",
					"fill": "semi",
					"dash": "draw",
					"size": "m",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 0.6330585325466017,
					"scaleY": 0.6330585325466017
				},
				"parentId": "shape:JcQ824JW6ZnGGqjecw9ze",
				"index": "a3cmBpLV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		}
	]
}`
