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
			"com.tldraw.shape.note": 12,
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMTYxLjUyMDM2NDc2ODkyNzMiIGhlaWdodD0iMTY0LjczNDY0MzMwOTE1NDYyIiB2aWV3Qm94PSIxNjMyLjk3MTU4NTg5Nzc2MTggNDkyLjIxMzIzODkzMzk2MjU0IDE2MS41MjAzNjQ3Njg5MjczIDE2NC43MzQ2NDMzMDkxNTQ2MiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50OyI+PGRlZnMvPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDE3MjAuMDYzMSwgNTUzLjg5NDkpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNLTAuMDQyMywyLjA2OCBULTAuOTMzNiwyLjA0MDkgLTMuNDk5MSwxLjk0ODMgLTYuOTEyNSwxLjgzODkgLTEwLjMzMjksMS43Nzg4IC0xMy44MTkzLDEuNzY4MyAtMTcuMDQ5MywyLjIxMzQgLTE5LjUwODksMy4zNjUxIC0yMS40MzI1LDQuODgwNyAtMjMuMjA3NCw2LjYzNzMgLTI0Ljk4OTIsOC42OCAtMjYuNzEzOSwxMC45NjA1IC0yOC4yOTQxLDEzLjQxMTMgLTI5LjcxNTgsMTYuMDE4MSAtMzAuOTgwMywxOC43NzM0IC0zMi4wMzY2LDIxLjUyOCAtMzIuODM2NywyNC4xNjQxIC0zMy40MTUxLDI2LjcyOTMgLTMzLjc2OTUsMjkuMjEzOCAtMzMuOTE5NCwzMS40ODIzIC0zMy45NTk4LDMzLjU0NzUgLTMzLjkzOTUsMzUuNjIxMyAtMzMuNzk4OSwzNy43MDQzIC0zMy40MzY4LDM5LjY3MDggLTMyLjgzNCw0MS41MzE0IC0zMS40ODYzLDQzLjk0NTEgLTI5LjE5NTUsNDYuNzUyNSAtMjYuODksNDguODgwNCAtMjQuOTYxMyw1MC4zMDIzIC0yMy4wODI5LDUxLjQyNzQgLTIxLjEyNTEsNTIuNDMyNiAtMTkuMDc1OSw1My4zMzg1IC0xNy4wNDgzLDU0LjA5NjEgLTE0LjE4NDksNTQuODg0NSAtMTEuMjYwMSw1NS41Mzk4IC05LjI2MDUsNTUuODMyIC02LjU2OSw1NS45ODQ4IC0zLjUzODUsNTUuOTcyOSAtMC44MDg4LDU1LjU0OTIgMi4yNTk4LDU0LjQ4MjYgNS41MzM2LDUyLjc4NDIgOC4wMzU1LDUxLjIxNjMgOS42NjQ2LDUwLjEwMDMgMTEuMzQwOSw0OC44NzIxIDEzLjQwMzgsNDcuMTIxMyAxNS4yOTgxLDQ1LjIyODIgMTYuNjk4Miw0My4yMzIxIDE3Ljc1NTgsNDEuMDQ5NiAxOC42MzIzLDM4LjY5NjMgMTkuNDE2NiwzNi4yNDA3IDE5Ljk5MDgsMzMuODYxOSAyMC40MjgsMzEuMjU5NSAyMC42NTM0LDI4LjU4OTUgMjAuNjkxOSwyNi4wODY0IDIwLjQwOTUsMjMuODQwOCAxOS43MTk4LDIxLjc4NDMgMTguNzgwMywxOS44NDQ3IDE3LjYzMjYsMTcuOTU3IDE2LjIyMDUsMTUuOTY3MyAxNC42MTU5LDEzLjkxNTYgMTMuMDgzNSwxMi4xODM2IDExLjQxNzgsMTAuNTI5NyA5LjU3MDYsOC43ODI1IDcuNzg4NSw3LjM1NzIgNS45Mzc5LDYuMzYzNCA0LjAyLDUuNTU5MSAyLjIsNC43NjIxIDAuNTgzNCwzLjgyNDkgLTEuMDg4OCwyLjg0MDUgLTIuOTcyNCwyLjIwMDUgLTMuOTQxMiwxLjk5MzMgQTIuNTYwOSwyLjU2MDkgMCAwIDEgLTMuMTk3MywtMy4wNzQyIFQtMi4yNTExLC0yLjkyOTMgLTAuMzI5MiwtMi4zOTQ0IDEuNjg5OSwtMS40Mzg3IDMuNjMzLC0wLjE5ODkgNS40MTkzLDAuODg3MSA3LjIyNTksMS42NzU0IDkuMDgzNSwyLjU3NTQgMTAuOTcyMywzLjg2NDQgMTIuODA2Nyw1LjUwNDMgMTQuNjEwNSw3LjMyOTQgMTYuMzYwOCw5LjE3NTIgMTguMDg2MSwxMS4xNTMzIDE5LjgxODEsMTMuMzU1NSAyMS4zOTA1LDE1LjU5NTUgMjIuNzE0OSwxNy44NTI5IDIzLjgwNzUsMjAuMjUxOSAyNC41ODM5LDIyLjQyNzUgMjQuOTU5OSwyNC43MjE3IDI1LjAyLDI3LjQ1MDggMjQuODU1OCwzMC4zNjYyIDI0LjQ2NjUsMzMuNDE5NiAyMy44NjA0LDM2LjE2NjYgMjMuMDc1OCwzOC44MTc1IDIyLjA5NDEsNDEuNTIyIDIwLjk4MDUsNDMuOTcwMSAxOS42NjUyLDQ2LjA2ODYgMTcuOTkwNiw0Ny45MzM1IDE1Ljc3MTQsNDkuOTAyMSAxMy41MTQzLDUxLjc5MjEgMTEuNzY0MSw1My4xNDE1IDEwLjA4NzQsNTQuMzA3MiA4LjI3MDksNTUuNTQyMyA2LjQ3NDYsNTYuNjUyNyA0LjYwMDYsNTcuNjY1OSAyLjYzNiw1OC41MzIxIDAuNzMyNSw1OS4xNDY2IC0xLjkxNzcsNTkuNTUyMyAtNS4xNTUxLDU5LjYwNDUgLTcuNjgxMiw1OS40MTk2IC05Ljc2NzcsNTkuMjA1OSAtMTEuOTY3OSw1OC44NTk3IC0xNC4xNDk4LDU4LjM4NjMgLTE2LjE3NzYsNTcuODI2IC0xOC4xOTk3LDU3LjE0NzkgLTIwLjM4NzMsNTYuMzA4MiAtMjIuNjE2Nyw1NS4zMjU0IC0yNC43NjAxLDU0LjIxNjUgLTI2LjgzMiw1Mi45NjQgLTI5LjA2MzIsNTEuNDQwMiAtMzEuMDQ2OSw0OS44MzExIC0zMi41MjIsNDguMjU4OCAtMzMuODY1Nyw0Ni41MTIxIC0zNS4wMTU4LDQ0LjU3OCAtMzUuOTA5MSw0Mi40NjE4IC0zNi41NDk0LDQwLjE4NDIgLTM2Ljg4NzgsMzcuODU0OSAtMzYuOTUzNywzNS41NjI5IC0zNi44NTIsMzMuMzg0MyAtMzYuNjUwNiwzMS4yMjk1IC0zNi4zNTYsMjguODA4OCAtMzUuODkzMiwyNi4xNDQzIC0zNS4yMjExLDIzLjQzNTYgLTM0LjM1OTMsMjAuNjU5NyAtMzMuMjkxLDE3Ljc0ODkgLTMyLjAzMywxNC44MDggLTMwLjYyODYsMTEuOTg5NiAtMjkuMDc1Niw5LjI4NzUgLTI3LjM3OTcsNi43MjI1IC0yNS41NzMxLDQuMzY2OSAtMjMuNjY5MywyLjI3MDQgLTIxLjMzNjksMC4xNjUgLTE4Ljg4MDYsLTEuNDA3NyAtMTYuNzU3NSwtMi4wMjY2IC0xNC43OTUzLC0yLjIzNTkgLTEyLjkyMjQsLTIuMjcxNSAtMTAuMjg5NywtMi4yNjQzIC02LjgxMTUsLTIuMjI3MiAtMy4zODY5LC0yLjE0NTEgLTAuODQ5MywtMi4wNzc0IDAuMDQyMywtMi4wNjggQTIuMDY4NSwyLjA2ODUgMCAwIDEgLTAuMDQyMywyLjA2OCBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDE3NTEuODMsIDUyOC4wMjM0KSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTTAsMS45NjE0IFQtMS4wNDQ2LDEuOTQzNiAtMy4wNjU1LDEuOTE5NSAtNS4wODYsMS44OTk5IC03LjIxMTIsMS44NzA4IC05LjQxNiwxLjgzNjIgLTExLjU3MDYsMS44MTQ2IC0xNC4zMjg5LDEuODM4OCAtMTcuNDQxLDEuOTA1NCAtMjAuMTQ1NiwxLjc0ODMgLTIyLjQ2MTQsMC41NzUyIC0yMy43NjM3LC0xLjg5MTcgLTI0LjEzODgsLTQuNjc4NCAtMjQuMjA3NSwtNy4yOTUzIC0yNC4wOTkzLC05LjcyMjcgLTIzLjg0MjUsLTExLjgwMjggLTIzLjYyNzcsLTE0LjEzODYgLTIzLjU1MjUsLTE2LjU3NiAtMjMuNzE1MywtMTguNzY1NSAtMjQuNTk3MiwtMjEuMzc0OCAtMjYuMzQzOCwtMjQuMjIzIC0yOC42NDg4LC0yNi42ODIyIC0zMS4zMDM2LC0yOC42MTY4IC0zNC4xNDMyLC0yOS45MDQ2IC0zNi44NDM2LC0zMC41NTQ0IC0zOS4zNzU5LC0zMC43ODkzIC00Mi4xMDU1LC0zMC44NDQxIC00NC43MDY4LC0zMC42OTYzIC00Ni45NDgzLC0zMC4xMjg2IC00OS4zMjE1LC0yOS4xMTM1IC01MS40OTczLC0yOC4wMDk2IC01My44NzI0LC0yNi41NTYxIC01Ni42ODc5LC0yNC42NzY1IC01OS4yMjgxLC0yMi44NjYyIC02MS4zOTY4LC0yMS4xNjggLTYzLjExNjUsLTE5LjQ3MzIgLTY0LjUwOTksLTE3LjY3NTUgLTY1Ljg0OTIsLTE1LjU4OTUgLTY3LjIzMjksLTEzLjE3NDYgLTY4LjU4MDksLTEwLjY1ODUgLTY5LjY1LC04LjM5NzUgLTcwLjI2ODQsLTYuNDU1NSAtNzAuNDk5OCwtNC4zNzU1IC03MC41MDIyLC0xLjgzMSAtNzAuNDk2OSwwLjY4NjEgLTcwLjUwOTIsMi43OTkxIC03MC41OTUzLDQuODA0OSAtNzAuODM4MSw2Ljg4MSAtNzEuMjQ3OSw5LjAxMTEgLTcxLjg3NDUsMTEuMjU4MiAtNzIuNzk2MywxMy41MDc3IC03My45ODExLDE1LjI1OTkgLTc1LjU2MDcsMTYuMzczMSAtNzcuNDI3OSwxNi45NzY3IC03OS42NDM0LDE3LjQ5NzUgLTgyLjM0ODgsMTguMjYzNyAtODQuNjkxNSwxOC45NzY4IC04Ni42NDkyLDE5LjU0MDEgLTg4LjY2NTgsMjAuMTA2MiAtOTEuNDE3LDIwLjkwMzYgLTk0LjM3OTEsMjEuNjg1NCAtOTYuNDg5OSwyMi4xNzEyIC05OC4zNjA3LDIyLjU5NDUgLTEwMC45NTEyLDIzLjExODkgLTEwNC4wMDUzLDIzLjc1MiAtMTA2LjcwNDYsMjQuMzg3MyAtMTA5LjAxMSwyNC45OTk4IC0xMTAuOTU2NiwyNS42NDQ0IC0xMTIuMzI4MiwyNi44NzU2IC0xMTIuNzU0NSwyOC44NjUxIC0xMTIuNzE3LDMxLjI5MiAtMTEyLjYyNSwzMy41ODcxIC0xMTIuMzY4MSwzNS44NDY2IC0xMTEuOTE1OCwzOC4xNzcgLTExMS4wNjQ3LDQwLjAxOTMgLTEwOS4zODY2LDQxLjE1MjQgLTEwNy4zODM0LDQxLjc1MzcgLTEwNS41MjE4LDQyLjI0NzcgLTEwMy40MTU1LDQyLjg1OTYgLTEwMS4yNTM1LDQzLjYzNDggLTk5LjIyMjMsNDQuNjgxNyAtOTcuNTQwNSw0Ni4wMTg5IC05Ni4xOTIsNDcuOTQyNCAtOTUuMDY4NSw1MC4zODQ4IC05NC4zMDIyLDUzLjAwMTggLTkzLjcxLDU1Ljg0NyAtOTMuMjMwMiw1OC41NzA4IC05Mi45MTU4LDYxLjA3MzIgLTkyLjc3MzMsNjMuMjU3MSAtOTIuOTM0NSw2NS4yNjg5IC05NC4wOTAxLDY3LjEyNzEgLTk2LjIwMTcsNjguMjY1MyAtOTguMjgwNCw2OC45ODI0IC0xMDAuMjAwNCw3MC4wMDA2IC0xMDIuNjMyNCw3MS42NjYzIC0xMDUuNjIxNCw3My45ODAzIC0xMDcuODcxOSw3NS44ODk4IC0xMDkuNjI2Nyw3Ny42NDczIC0xMTEuNDgwMyw3OS43NDYyIC0xMTIuNzA1Niw4MS41NDc0IC0xMTMuMjkzOCw4My41ODU1IC0xMTMuNTIyNSw4Ni4yMTQyIC0xMTMuNjMxNiw4OC45NjU4IC0xMTMuNjc3NCw5MS42NDc3IC0xMTMuNzA1Nyw5NC4zOTAyIC0xMTMuNTYwMiw5Ni45Nzg2IC0xMTMuMDcyNSw5OS4xODQzIC0xMTIuMTQzNCwxMDEuMTgyIC0xMTAuNTk3OCwxMDIuOTMyNSAtMTA4LjUwNzYsMTA0LjMyNjQgLTEwNi4zMjc0LDEwNS40MDE5IC0xMDQuMDE3OSwxMDYuMzU3NSAtMTAxLjU2NzMsMTA3LjIxMzUgLTk5LjE2NjcsMTA3LjcyNzkgLTk2LjM3OTEsMTA3Ljk4MjEgLTkzLjU4NDksMTA4LjAwNzcgLTkxLjI2NTEsMTA3LjcyMDUgLTg4Ljg0MzcsMTA3LjA4MDUgLTg1LjkxOCwxMDYuMDY1MSAtODIuNjU4NywxMDQuNzM0MSAtNzkuNjcxLDEwMy4zMzEzIC03Ny4wMjIzLDEwMi4wMDIyIC03NC4yMzA1LDEwMC43NDgzIC03MS41MzA4LDk5LjY4OTEgLTY5LjI3Nyw5OC45MjA5IC02Ny4wNzU1LDk4LjQ0MDMgLTY0LjcwMjUsOTguMjEzNCAtNjIuMDc1MSw5OC4yMzk0IC01OS4zODQ3LDk4LjU2MDUgLTU2Ljg0MTEsOTkuMTY5NiAtNTQuMzM4Nyw5OS45NTY5IC01MS44Mjg1LDEwMC44OTM0IC00OS4zNzk0LDEwMi4wMTI4IC00Ny4zODA1LDEwMy4xNjU5IC00NS43ODAzLDEwNC40NTcyIC00NC4zODk1LDEwNi4xNTQ5IC00My4yMjIxLDEwOC4wOTE2IC00Mi4xNjM0LDExMC4wMjUyIC00MS4xMTk0LDExMS44NTkzIC0zOS44NDU1LDExMy41ODM5IC0zOC40MzIyLDExNS4xMjU2IC0zNy4wNzkxLDExNi42MjM5IC0zNS42MTYyLDExOC4yNjA1IC0zNC4xNzMyLDExOS45MTEzIC0zMi43OTEsMTIxLjUxMTIgLTMxLjM2MjksMTIyLjkyNTcgLTI5Ljc1MzMsMTIyLjg4NzEgLTI4LjA3MDUsMTIxLjcxODUgLTI2LjE0OTMsMTIwLjUzNjMgLTI0LjExMDQsMTE5LjI5ODYgLTIyLjIyNzUsMTE4LjA3OTYgLTIwLjUxOTUsMTE2Ljc4OCAtMTguOTUwNCwxMTUuNDgwOCAtMTcuMjUyNywxMTQuMTE4MSAtMTUuNTcyNywxMTIuNzg3MSAtMTMuOTU2NCwxMTEuMjgwMSAtMTIuNTk0LDEwOS41MTA4IC0xMS44NjEzLDEwNy40Njg1IC0xMS42NzU2LDEwNS4wOTQyIC0xMS41NjIzLDEwMi4zOTcgLTExLjIyMDMsOTkuODEzNSAtMTAuNTMxMiw5Ny41MzQzIC05LjU5NDcsOTUuNDgzNCAtOC41MDg4LDkzLjc1NjkgLTcuMjA2OSw5Mi4yMzk2IC01LjY1NjksOTEuMDI4MiAtMy44Mjc4LDkwLjIwMTUgLTEuNTU0OCw4OS43MzM0IDAuOTY3Miw4OS41NDY0IDMuNTc5Myw4OS41MzI2IDYuMzA3NCw4OS41NjAyIDkuMTA0Miw4OS42ODIzIDExLjg4NDUsOTAuMDk0IDE0LjI2ODEsOTAuNzg1NCAxNi41NDM0LDkxLjY1NDUgMTguNjI4Miw5Mi41MDI5IDIwLjM5OTksOTMuMjE0NSAyMi40NzUzLDkzLjkzNTMgMjQuNzA0Miw5NC40NTQxIDI2LjE1OTIsOTMuNzIyOCAyNy4zMzQ2LDkxLjg1NjEgMjkuMDUzNSw4OS42MDkyIDMwLjkzMTgsODYuOTM1OCAzMi40MTU4LDg0LjY5NjMgMzMuNzA4LDgyLjYyOTIgMzQuOTk1MSw4MC40MzkzIDM1Ljk2MzQsNzguNTYxNSAzNi42NDc2LDc2LjUyMTQgMzYuOTIwMyw3NC40NDMgMzYuOTM1OCw3Mi4yNzQgMzYuNjQyNyw3MC4xNjA3IDM1LjUwMzcsNjguMTg3NyAzMy45NTEzLDY2LjM1NiAzMi40ODI3LDY0Ljg1MzYgMzAuODYwNSw2My40MDk2IDI4Ljk0NDgsNjEuOTUwNiAyNy4wNCw2MC43NjcgMjUuMTI4Myw1OS45MDU4IDIyLjk2MDQsNTkuMjMzMyAyMC43ODUsNTguNzAzNSAxOC44MDY4LDU3Ljk5MzcgMTcuMDg2OSw1Ni43MzM5IDE1Ljg5NCw1NC44MDYgMTUuNDc1Niw1Mi40MzIyIDE1LjQzNyw0OS45NDY4IDE1LjUzNTIsNDcuMzY5OSAxNS44NjYyLDQ0Ljk3NjggMTYuNTIyMSw0Mi42MDY5IDE3LjM1OSw0MC4zMzI0IDE4LjIxNSwzOC41MTI4IDE5LjM2NzYsMzYuNDcxMSAyMC44MjM3LDM0LjM5MjQgMjIuNTIwMywzMi40Mzg1IDI0LjIxMTksMzAuNjcxMiAyNS43MDExLDI5LjE2MDQgMjcuMjg0NiwyNy41NTY5IDI4LjgyMDMsMjUuOTg2MSAzMC4xODE5LDI0LjUwNjUgMzEuNTYzNCwyMi45MjY2IDMzLjE2OTUsMjEuMTUzNCAzNC4wNTEzLDIwLjIyMTYgQTIuMzQ3NiwyLjM0NzYgMCAwIDEgMzcuNDk1MSwyMy40MTI4IFQzNi42Njk4LDI0LjMyMzMgMzUuMTM2NSwyNi4wNzMzIDMzLjczMDcsMjcuNzAxMyAzMi4zMTMsMjkuMjU2NiAzMC43MzU1LDMwLjkyNjkgMjkuMTg4MiwzMi41NjIxIDI3Ljc3OTEsMzQuMDM2OSAyNi4xNzY2LDM1Ljc1MDggMjQuNTI2OCwzNy42ODA5IDIzLjIxMTUsMzkuNjI0NSAyMi4xMjczLDQxLjgwNzUgMjEuMjcxLDQ0LjA0NTcgMjAuNzI3LDQ2LjE3OTMgMjAuNDg4Miw0OC4zOTc3IDIwLjQ4MSw1MC42NzU1IDIwLjc2NDUsNTIuNzI1MyAyMS45NDIyLDUzLjkwMTQgMjMuNzk5MSw1NC40MjEzIDI1Ljg1ODMsNTUuMDMwOSAyNy45OTAxLDU1Ljg5OTkgMzAuMTMwNiw1Ny4wODE5IDMyLjEyODcsNTguNDI0MiAzMy45MzQxLDU5Ljg0MjMgMzUuNzg3Myw2MS40Njg2IDM3LjUwNjUsNjMuMTkwNyAzOS4xMjg2LDY1LjAzMjYgNDAuNTM4Miw2Ny4wMTE3IDQxLjM4MzIsNjkuMDkxNiA0MS42NjA3LDcxLjQ2MTMgNDEuNjIzNCw3My45MzU5IDQxLjQ2ODcsNzYuMDU0NCA0MC45NDU4LDc4LjIwMiAzOS45MTUzLDgwLjU4NzIgMzguNzM2OCw4Mi42NjQyIDM3LjQxNjMsODQuODUzNiAzNS43MjM4LDg3LjczMjcgMzMuODYwMiw5MC44NjcyIDMyLjA1NDQsOTMuNjczNiAzMC4zMDQsOTYuMDkxMSAyOC43NDQzLDk3Ljk3NzkgMjYuODI0NCw5OS4wOTM3IDI0LjU2MzQsOTkuMzQ0IDIyLjQxODIsOTguODg1MiAyMC4wMjIyLDk4LjA4MzggMTcuNzI5Niw5Ny4yMjExIDE1LjUzODMsOTYuMzA2MyAxMy4xNDUyLDk1LjMwODYgMTEuMDE1LDk0LjYwMjQgOC44ODI3LDk0LjMxMDQgNi4zMjU4LDk0LjI2MzYgMy42NDc2LDk0LjMyMTEgMS4xOTc1LDk0LjQwODIgLTEuMDczNSw5NC42NjM0IC0zLjEzMDMsOTUuNDIxNiAtNC42MDE5LDk2LjgxMzkgLTUuNjQ5OCw5OC43NDgzIC02LjMyODgsMTAxLjA4NjYgLTYuNTUyMiwxMDMuNDU4NyAtNi41NzYsMTA1LjUyNDEgLTYuNjYwMiwxMDcuNTMzNSAtNy4wOTk4LDEwOS43MjM3IC03Ljk2NzEsMTExLjcxOCAtOS4xNjE1LDExMy40NzE3IC0xMC41NjA3LDExNS4wODI5IC0xMi4wOTY2LDExNi41MDA2IC0xMy44NTcyLDExNy44OTg1IC0xNS45MTM2LDExOS41NDkxIC0xNy45MDk4LDEyMS4yMDI1IC0xOS42MTc1LDEyMi40ODM5IC0yMS40Mjk0LDEyMy42NTI1IC0yMy4zNDAxLDEyNC44NDU5IC0yNS4yMDg4LDEyNi4wMzkgLTI3LjIwNiwxMjcuMzA0IC0yOS4yNzcsMTI4LjMwNjMgLTMxLjIzMjEsMTI4LjU2OTIgLTMzLjA1MzgsMTI3Ljk5NDkgLTM0LjcwNiwxMjYuODE5OCAtMzYuMTU3NywxMjUuNDA0MiAtMzcuNTA4NCwxMjMuODk5MiAtMzguOTQyNCwxMjIuMjMyMSAtNDAuNDQ2OSwxMjAuNDQ5OSAtNDEuODQ1NiwxMTguODM1OSAtNDMuMjIyMiwxMTcuMzI1OCAtNDQuNTU4NywxMTUuNjg4MSAtNDUuNjkxOCwxMTMuODUwMyAtNDYuNjgwMSwxMTEuOTQxNSAtNDcuNjIzOCwxMTAuMDQyIC00OC42MzczLDEwOC4yODc2IC01MC4yNDg1LDEwNi44MDI4IC01Mi4zNjU0LDEwNS42Mjc0IC01NC42MiwxMDQuNzI5MiAtNTYuODc3NywxMDMuOTg0NyAtNTkuMDU1MSwxMDMuMzkzNyAtNjEuNDk1NywxMDIuOTU2OSAtNjMuNzUyNywxMDIuNzczMSAtNjUuNjg3NCwxMDIuNzY0NSAtNjcuODA5NywxMDMuMDIwNSAtNzAuMDg1NSwxMDMuNjUzOCAtNzIuNTc0LDEwNC41ODM4IC03NS4yMDU0LDEwNS43MzY1IC03Ny44NjYzLDEwNy4wMzE1IC04MC4xMjksMTA4LjE1MjkgLTgyLjY5NDYsMTA5LjM0NDMgLTg1LjI1OCwxMTAuNDUwNiAtODcuNjM3MywxMTEuMjgyMiAtOTAuNTgwNywxMTIuMDM2OSAtOTMuNDY3NSwxMTIuMzY4OSAtOTYuNjMxMSwxMTIuMzk2NiAtOTkuOTQyOCwxMTIuMTU5MyAtMTAyLjk1OTQsMTExLjU0ODYgLTEwNS43MTY2LDExMC42NDg1IC0xMDguMjU0MywxMDkuNjQ1NCAtMTEwLjM1NjgsMTA4LjY0NDYgLTExMi4yMTQxLDEwNy41MjUyIC0xMTMuODk1NCwxMDYuMjMzIC0xMTUuMjQxNCwxMDQuNjk4MSAtMTE2LjQwMTUsMTAyLjc1NTMgLTExNy4zMjc2LDEwMC4zODgyIC0xMTcuOTI5Nyw5OC4xMTE4IC0xMTguMTYzNCw5NS43NjMzIC0xMTguMTkyMiw5My4wMDQ5IC0xMTguMTkxMSw5MC4yNTI4IC0xMTguMTU5Miw4Ny41Mjk3IC0xMTcuOTg3Miw4NC44NTY0IC0xMTcuNjYxNiw4Mi42MTk3IC0xMTcuMTAwNCw4MC43MzA1IC0xMTYuMTA0NSw3OC45MDI4IC0xMTQuNjI0Myw3Ny4wMzgxIC0xMTIuNTc3OCw3NC43ODg1IC0xMTAuNzA5NSw3Mi44NjIyIC0xMDkuMTg5OCw3MS4zNDY5IC0xMDcuNjE2NCw2OS44Mzg0IC0xMDYuMTM2OCw2OC41MzQ2IC0xMDQuNjc2Myw2Ny4zMDg3IC0xMDIuNjc2OCw2NS44NTY0IC0xMDAuMzE3Miw2NC41MDQ5IC05OC4zNTU4LDY0LjM0NTQgLTk3LjQ4MTgsNjMuNjAwNSAtOTcuNTU3MSw2MS41Njk5IC05Ny44NTY1LDU5LjQwNDUgLTk4LjM4NSw1Ni44NTc1IC05OS4wMDQzLDU0LjM1MjcgLTk5LjgzNTMsNTEuOTQ0NSAtMTAwLjk3NDMsNDkuODg2MSAtMTAyLjUwNTQsNDguNjI0OCAtMTA0LjI5NDgsNDcuODY5MyAtMTA2LjQzMzMsNDcuMjE3NyAtMTA4LjYyNTcsNDYuNjEwNSAtMTEwLjQ3OTcsNDYuMDg5IC0xMTIuMjY1Myw0NS4zOTU0IC0xMTMuOTY4Miw0NC4yMTggLTExNS40MTYxLDQyLjQwODcgLTExNi4zNzUyLDQwLjE1NTkgLTExNi45NTg2LDM3LjU0NDkgLTExNy4zMzMsMzUuMDEyNSAtMTE3LjUzMTEsMzIuNzkzNyAtMTE3LjU5MjgsMzAuNTE2OSAtMTE3LjU2ODcsMjguMzc2OCAtMTE3LjQ3MjIsMjYuNDE3OSAtMTE2LjcxMywyNC4zODExIC0xMTUuMDc1NiwyMi43NTMzIC0xMTMuMDkyNiwyMS44Mjg5IC0xMTEuMDYzNywyMS4yMDE5IC0xMDguODg0MSwyMC42ODIgLTEwNi4yNSwyMC4xMjQ0IC0xMDMuMjk2NiwxOS41NTAyIC0xMDAuMDg2MSwxOC45Mzg1IC05Ny40NjU1LDE4LjM1NCAtOTUuNDc3MiwxNy43OTA1IC05Mi42NjQxLDE2Ljg4OTggLTg5Ljk5NTMsMTUuOTg1NyAtODguMDc1NCwxNS4yODEzIC04Ni4yMDc3LDE0LjU2NTYgLTgzLjgxNzYsMTMuNjYxNyAtODAuODkzOSwxMi43MTU2IC03OC41MDg1LDEyLjIyMzkgLTc3LjA0OTYsMTEuMTk5OCAtNzYuMTk4MSw5LjE2MzcgLTc1LjU5NzMsNi42OTk4IC03NS4yNTk3LDQuMDg4NyAtNzUuMTYxNCwxLjc0OTQgLTc1LjE1NywtMC4zOTcgLTc1LjEyODUsLTIuNzkzIC03NS4wMDM2LC01LjIwMTQgLTc0LjY3ODUsLTcuMTkyMSAtNzQuMDUzMiwtOS4xMDM2IC03My4wMjQsLTExLjM3ODggLTcxLjcwMDIsLTEzLjk0OTQgLTcwLjI0MSwtMTYuNjAzNSAtNjguNzAzMSwtMTkuMTAyOSAtNjcuMDM1OCwtMjEuMzQ4IC02NS4wNzY0LC0yMy40MjM2IC02Mi44MjA5LC0yNS4yODA3IC02MC4zMjAxLC0yNy4wNzY3IC01Ny41Mzg1LC0yOC45ODcxIC01NS4yODk0LC0zMC40OTI3IC01My41Mjc3LC0zMS42NDYxIC01MS4wOTM0LC0zMi45NzQ0IC00OC4xMjU5LC0zNC4xNzcgLTQ1LjA1ODEsLTM0Ljg1OTMgLTQyLjAxNjMsLTM0Ljk5NDMgLTM5LjAxOTEsLTM0Ljg2NjkgLTM2LjA0MTYsLTM0LjQ4NiAtMzMuNjE3LC0zMy45NDI5IC0zMS43NjYsLTMzLjMzMiAtMzAuMDEyLC0zMi41Mjg5IC0yOC4yOTY3LC0zMS41MTA2IC0yNi41OTc3LC0zMC4yOTcxIC0yNS4wMTU0LC0yOC45NjAxIC0yMy41NzY4LC0yNy40ODU5IC0yMi4yNTk1LC0yNS44NjggLTIxLjA5MjgsLTI0LjEzMDggLTIwLjAxNjYsLTIyLjA3ODggLTE5LjIyMzYsLTE5LjI3MSAtMTguOTgwMywtMTYuNDg0NSAtMTkuMDYxOSwtMTQuMjc5OSAtMTkuMjc1LC0xMi4xMzE3IC0xOS42MzY4LC05Ljc2OSAtMTkuODY4MywtNy4yODk4IC0xOS44NTU4LC00LjkyNjYgLTE5LjMyNCwtMi44NDgzIC0xNy40NDA2LC0xLjkwNTQgLTE0LjMyODksLTEuODM4OCAtMTEuNTcwNiwtMS44MTQ2IC05LjQxNiwtMS44MzYyIC03LjIxMTIsLTEuODcwOCAtNS4wODYsLTEuODk5OSAtMy4wNjU1LC0xLjkxOTUgLTEuMDQ0NiwtMS45NDM2IDAsLTEuOTYxNCBBMS45NjE0LDEuOTYxNCAwIDAgMSAwLDEuOTYxNCBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDE3ODcuNiwgNTQ5Ljg0KSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTS0xLjgwMiwtMS40MjM5IFQtMS4yOTIxLC0yLjA0MjkgLTAuMTk4OCwtMy40NDY1IDAuOTM1MywtNS4wNzYzIDEuMDE1LC03LjA5OCAwLjA2OCwtOS4yMzQ5IC0wLjkxMTksLTExLjA1MTQgLTEuOTk5NiwtMTIuNjgxNiAtMy4yNzk5LC0xNC4xODYxIC00LjkxOTEsLTE1LjQ2NzUgLTYuOTE1NywtMTYuNDI0NyAtOS4wNjI1LC0xNy4xNTgxIC0xMS4xNzExLC0xNy42NzczIC0xMy4yMzY2LC0xNy45ODIgLTE1LjI1MTUsLTE4LjE5MzEgLTE3LjU5MzYsLTE4LjQxNCAtMjAuMTk2NiwtMTguNjQxOSAtMjIuNDAzNCwtMTguNzc1NyAtMjQuMzU1NSwtMTguODA0MiAtMjYuNDM3OSwtMTguNzk1NCAtMjguNDg2MywtMTguODAzMyAtMzAuNTAzNywtMTguOTMyOCAtMzIuNzQ5NSwtMTkuMTI4NiAtMzQuODY3NCwtMTkuMjIzMiAtMzcuMjQxOCwtMTkuNjk4OCAtMzguNjYzOSwtMjAuMTYyOCBBMi41NTIxLDIuNTUyMSAwIDAgMSAtMzYuNTY5NSwtMjQuODE3NSBULTM1LjQxMDUsLTI0LjU3NjEgLTMzLjMwNDQsLTI0LjI4MyAtMzEuMjMyNywtMjQuMTY3OSAtMjkuMDQ0MSwtMjMuOTQxNSAtMjYuOTU5LC0yMy43NjczIC0yNC45Njg2LC0yMy43NDU5IC0yMi45MzE3LC0yMy43MDUgLTIwLjY2NTQsLTIzLjU3MDUgLTE4LjUzNDMsLTIzLjM5MjcgLTE2LjY2MzcsLTIzLjI0ODYgLTE0LjMzODMsLTIzLjA1NjcgLTExLjc1MDIsLTIyLjc2MSAtOS4yNjA2LC0yMi4yODExIC02Ljc0NjksLTIxLjU3NDkgLTQuNjA1MywtMjAuNzk3OCAtMi43MzM1LC0xOS45IC0wLjU1ODgsLTE4LjMxMSAxLjQ5NTUsLTE2LjIxMDMgMi45NTgzLC0xNC4xNDk0IDQuMTQwMSwtMTIuMDY0MyA1LjE1MSwtMTAuMDM5NyA1Ljk3NiwtOC4xMTQgNi4yMzgxLC01LjkxNyA1LjY0MTksLTMuODM1NiA0LjU4ODUsLTIuMjMyIDMuMzk3OSwtMC42NjI4IDIuMjg2NCwwLjc4NDYgMS44MDIsMS40MjM5IEEyLjI5NjcsMi4yOTY3IDAgMCAxIC0xLjgwMiwtMS40MjM5IFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzFkMWQxZCIvPjwvZz48L2c+PC9zdmc+",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMTA0LjAyOTg1MTkwOTYyOTM0IiBoZWlnaHQ9IjE1NC42OTkxNjU0MDg4OTgzIiB2aWV3Qm94PSIxMDEzLjg3Mzk0NDk4MzA0NzYgNjcxLjU0ODEyNzY4Mjk3MTcgMTA0LjAyOTg1MTkwOTYyOTM0IDE1NC42OTkxNjU0MDg4OTgzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7Ij48ZGVmcy8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTA4Ni41OTcyLCA2ODQuODU4OCkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0wLDguNDY1IFQtMi42NjgsOC40MjY4IC05LjM1NTksOC40MDQ3IC0xNy44NzUzLDguNDg3IC0yNi41MTczLDguNjQzMSAtMzQuMjgxMyw5LjExOTggLTQxLjgyNDYsOS45MzQxIC00Ny42NDc3LDEwLjczMzUgLTQ5LjU0OTEsMTEuMTA1NCBBOS4yNDcxLDkuMjQ3MSAwIDAgMSAtNTIuMzM3NywtNy4xNzc0IFQtNDguOTk2OCwtNy41NDQ1IC00MS44ODIyLC04LjI1NDMgLTM0LjM4NDEsLTguNjY1IC0yNi41MTczLC04LjY0MzEgLTE3Ljg3NTMsLTguNDg3IC05LjM1NTksLTguNDA0NyAtMi42NjgsLTguNDI2OCAwLC04LjQ2NSBBOC40NjUsOC40NjUgMCAwIDEgMCw4LjQ2NSBaTS00My4wNjE5LC0yLjg3MjQgVC00MS4zNTc0LC0wLjA1MDkgLTM4LjM5MzcsNi4zOTQgLTM1LjgwMzIsMTMuMjM2NyAtMzQuMzI4NywyMC4yMjM0IC0zNC4xODE0LDI3LjUyNyAtMzQuMTg5MSwzNC44NDY4IC0zNC4yMTc1LDQyLjc4MzEgLTM0LjIzNjksNTAuNTE4OCAtMzQuMjIyOCw1Ny42MzgxIC0zNC4xNzc5LDY0LjYxNyAtMzUuMjE0OSw3MS4zOTgxIC0zOC4xNDM4LDc3LjY4NjIgLTQyLjExMjMsODMuNjkzMSAtNDYuOTcwMiw4OS4wNzc5IC01My4yMTMxLDkxLjk1OTggLTU5LjQwNDgsOTIuNjg5OCAtNjIuMTA3LDkyLjg2NTIgQTkuODIwOCw5LjgyMDggMCAwIDEgLTYzLjM1MjEsNzMuMjYzIFQtNjAuMzQ5Miw3Mi40MzAxIC01NS4zOTI4LDY4LjQwNTkgLTUzLjQxNSw2MS42MjI5IC01My4zODQ1LDU0LjI3ODcgLTUzLjM4NjUsNDYuNjk5MSAtNTMuNDEzMywzOC43MTIgLTUzLjQzNDksMzAuNDY5NiAtNTMuNjgzMiwyMi4zMjc5IC01NS41MTEzLDEzLjkwMDggLTU3Ljk1OTUsOC4xNjY4IC01OC44MjQ5LDYuODAwNSBBOS4yNDcxLDkuMjQ3MSAwIDAgMSAtNDMuMDYxOSwtMi44NzI0IFpNLTYxLjc4MTMsNzMuMjg5MSBULTU5Ljc0NDIsNzMuNTAxOCAtNTMuOTczOCw3My43NDcgLTQ2LjcwNTYsNzQuMDM0NSAtMzkuMDM0OSw3NC44NzM2IC0zMS4xMDQyLDc2LjEyMzggLTIyLjc2MDIsNzcuNTI3IC0xMy43MjY4LDc5LjAxNjQgLTUuMzkyMiw4MC4yNjQ4IDIuMDAxLDgwLjkyMjUgOS4xNDQ4LDgxLjQ3NDcgMTYuOTA4Nyw4MS43NTgyIDIxLjA3MTgsODEuNjUxMSBBOS42MTcyLDkuNjE3MiAwIDAgMSAyMS41MzkzLDEwMC44Nzk5IFQxOC4yNzE1LDEwMC44OTYxIDExLjQ1NDMsMTAwLjY2MzEgNC4xNSwxMDAuMDI5NCAtMy41MzMsOTkuMTY3NSAtMTEuMjI5Nyw5OC4xMDI2IC0xOS42MDQxLDk2LjgzNTIgLTI4Ljk0MTksOTUuNDY4NSAtMzcuNDAwMSw5NC4zMDU1IC00NS42ODQ5LDkzLjU3NzEgLTU0LjAwNTMsOTMuMzUzNiAtNjAuNzIyNSw5My4xMTA3IC02My42Nzc4LDkyLjgzOSBBOS44MjA4LDkuODIwOCAwIDAgMSAtNjEuNzgxMyw3My4yODkxIFpNMTMuMjg4Nyw5Ni41Nzc5IFQxMS43NDM2LDk0LjI3NzUgOC4yMjU5LDg4Ljc5ODkgMy45MzYxLDgyLjUxNDIgLTAuNDYzMiw3Ni42MDkzIC0zLjU5NjYsNzAuNTA1NiAtNC43NjY4LDYzLjYxNTkgLTQuODgyMyw1Ni4xNjggLTQuODkwMyw0OC42NDA3IC00LjkwOTgsNDEuMzAxNiAtNC45MTcyLDMzLjk3NjQgLTQuNTQwMywyNi40NTQyIC0zLjY2NjcsMTguODI0NSAtMi43MDM4LDExLjQ4NDcgLTEuNDQ1OSw0LjU4IDIuNjQyOSwzLjcxMzcgMi4xODM0LDYuNzM3OCAtMS41NzI3LDcuMzA1OSBBOS44NTkzLDkuODU5MyAwIDAgMSAtMy44MDMzLC0xMi4yODYxIFQtMS4zOTU0LC0xMi41ODgxIDQuNTU3MywtMTMuMDg1MiAxMS42ODksLTEyLjE2NjQgMTcuNDE1MiwtNi40MzYgMTkuMTc4OSwxLjU5NDYgMTcuOTMwNCw4LjYwNDMgMTYuNTI2MSwxNi4yMDcyIDE1LjUyOTMsMjMuODEzNyAxNC45NDMxLDMwLjgzNzMgMTQuODE3MiwzOC4wMTQ2IDE0LjgsNDUuNDg3NyAxNC43ODU0LDUyLjg2NTUgMTQuNDYxNyw2MC4wODAzIDE2LjUyNDIsNjYuNDU2OCAyMC43MzU2LDcyLjI2MzYgMjQuNDM2Nyw3OC4yOTc5IDI3LjgxNjMsODMuNjQ4OSAyOS4zMjI0LDg1Ljk1MzEgQTkuNjE3Miw5LjYxNzIgMCAwIDEgMTMuMjg4Nyw5Ni41Nzc5IFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzlmYThiMiIvPjwvZz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTA2Mi41NDY1LCA3NzEuODE4MSkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik04LjQwOTksMCBUOC40MTEzLDIuMTI4NSA4LjQ4NDcsOC41MDE5IDguNjI0NywxNi4yMDI3IDguNzM5MiwyMy43MDA1IDguODMxLDMxLjMzNDggOC44OTgyLDQwLjIzMDUgOC45Miw0NS41MzM2IEE4LjkyLDguOTIgMCAwIDEgLTguOTIsNDUuNTMzNiBULTguODk4Miw0MC4yMzA1IC04LjgzMSwzMS4zMzQ4IC04LjczOTIsMjMuNzAwNSAtOC42MjQ3LDE2LjIwMjcgLTguNDg0Nyw4LjUwMTkgLTguNDExMywyLjEyODUgLTguNDA5OSwwIEE4LjQwOTksOC40MDk5IDAgMCAxIDguNDA5OSwwIFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzlmYThiMiIvPjwvZz48L2c+PC9zdmc+",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iNTAuMzA2NDUxOTE0NzM5MDg1IiBoZWlnaHQ9IjQxLjMyNjE4NzczMTU1MDc3IiB2aWV3Qm94PSI1ODIuMzA1MTYzMzA0Mzc1IDYyMi4xMTEwMDAwOTM5NTQ3IDUwLjMwNjQ1MTkxNDczOTA4NSA0MS4zMjYxODc3MzE1NTA3NyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50OyI+PGRlZnMvPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDU4Ni4xMzM2LCA2NTkuNjMpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBmaWxsPSIjZmNmZmZlIiBkPSJNMCwtMi42NTc2IFEwLC01LjMxNTIgMCwtOC4yMDM4IFQwLC0xMy44MTggMCwtMTguODQyMiAwLC0yMi45MzYyIDAsLTI2LjA0NjggMCwtMjguMjM0MiAwLC0yOS42MzA4IDAsLTMwLjQ0MDQgMC4xNjMxLC0zMC43MjE1IDAuODg5MSwtMzAuMjUyIDQuMDEwNiwtMjcuMzMzNCA4LjQzNTEsLTIzLjA4MjUgMTEuNDc5MywtMjAuMTQ3NiAxMy4yOTg1LC0xOC4zOTE3IDE0LjQzMzMsLTE3LjYxMjIgMTUuNTYxNCwtMTcuODA2NCAxOC4yNzY1LC0yMC40NTYxIDIxLjg1NSwtMjQuNDQxNiAyNC4zMTI0LC0yNy4yMjggMjUuNzk0NSwtMjguOTE5NSAyNi42NzE2LC0yOS42MjMgMjcuMzMzMywtMjkuNDQyMSAyOC4zNDYyLC0yNy4zNDg4IDI5LjU1MDMsLTI0LjIxNTIgMzAuMzg5OCwtMjEuOTQ2OSAzMC45MTc0LC0yMC40OTYyIDMxLjMzMjQsLTE5Ljg5NTggMzIuMDIxMywtMjAuMjUyNCAzNC4zMjM2LC0yMy4yOTAxIDM3LjUwMzcsLTI3Ljc4NjMgMzkuNjk2OCwtMzAuOTE1NSA0MS4wMTc4LC0zMi44MDY2IDQxLjczNzEsLTMzLjYwNzMgNDIuMTMxOSwtMzIuNjk3IDQyLjM2MzksLTI1Ljc3NDMgNDIuNTA3MywtMTUuNTgwOCA0Mi41ODg4LC04LjY4OTcgNDIuNjMzOCwtNC43MTMyIDQyLjQzMDMsLTIuNTUwMyA0MC43MjY4LC0xLjM3MzcgMzEuOTUyMiwtMC43MzM2IDE5LjEwMzEsLTAuMzg1NCA2LjkxMjgsLTAuMTE2NCAwLjE0MDYsMC4wMTUgMCwtMi42NTc2IFoiLz48cGF0aCBkPSJNLTMuNzE4LDAgVC0zLjYwOTUsLTIuNjU3NiAtMy4zNjg3LC04LjIwMzggLTMuMTY5NiwtMTMuODE4IC0zLjEyMDQsLTE4Ljg0MjIgLTMuMjgxMiwtMjQuMjUxNCAtMy41NjU3LC0yOS4wNDM4IC0zLjcwNzEsLTMwLjcyNTYgQTMuNzA3MSwzLjcwNzEgMCAwIDEgMy43MDcxLC0zMC43MjU2IFQzLjU2NTcsLTI5LjA0MzggMy4yODEyLC0yNC4yNTE0IDMuMTIwNCwtMTguODQyMiAzLjE2OTYsLTEzLjgxOCAzLjM2ODcsLTguMjAzOCAzLjYwOTUsLTIuNjU3NiAzLjcxOCwwIEEzLjcxOCwzLjcxOCAwIDAgMSAtMy43MTgsMCBaTTIuNDY0NCwtMzMuNDk1MSBUNS43MDgxLC0zMC40MzAyIDEwLjc3NTQsLTI1LjUxNzYgMTQuNzk5MiwtMjIuMDY5MiAxNi45OTk1LC0yMC40Njg2IEEzLjY2MDMsMy42NjAzIDAgMCAxIDEyLjg1NDksLTE0LjQzNDMgVDEwLjQyOTIsLTE2LjY2NyA2LjA5NDgsLTIwLjY0NzQgMC44NjA5LC0yNS4xNzU2IC0yLjQ2NDQsLTI3Ljk1NjIgQTMuNzA3MSwzLjcwNzEgMCAwIDEgMi40NjQ0LC0zMy40OTUxIFpNMTIuMzcwOCwtMjAuMDcxIFQxNS4xMDk5LC0yMi41NDg0IDE5LjMzODIsLTI2LjY5NzMgMjIuNzcwOSwtMzAuNDkxMiAyNC43MTQzLC0zMi42MTM1IEEzLjY5NTcsMy42OTU3IDAgMCAxIDI5LjMzODksLTI2Ljg0NzYgVDI3LjYwODMsLTI1LjM3MTcgMjQuMzcxOCwtMjIuMTg2IDIwLjE3NDgsLTE3LjY1MzkgMTcuNDgzNywtMTQuODMxOSBBMy42NjAzLDMuNjYwMyAwIDAgMSAxMi4zNzA4LC0yMC4wNzEgWk0zMC4zNTMzLC0zMS4zNDA0IFQzMS40NTQ1LC0yOS4xMjc2IDMzLjcxMTMsLTI0LjEzNDQgMzQuODY2OSwtMjEuMzU0IEE0LjAwNDcsNC4wMDQ3IDAgMCAxIDI3LjMzOTgsLTE4LjYxNjMgVDI2LjQ0NDUsLTIxLjM5NDcgMjQuNjI0NiwtMjYuMTQ2OSAyMy42OTk5LC0yOC4xMjA4IEEzLjY5NTcsMy42OTU3IDAgMCAxIDMwLjM1MzMsLTMxLjM0MDQgWk0zMi41NTgyLC0yMy43MTYyIFQzMi43OTQyLC0yMy42NDQ4IDMzLjAzMDMsLTIzLjU3MzQgQTQuMDQzMiw0LjA0MzIgMCAwIDEgMzAuMDkyNiwtMTYuMDM5NiBUMjkuODcwNSwtMTYuMTQ2OCAyOS42NDg1LC0xNi4yNTQgQTQuMDA0Nyw0LjAwNDcgMCAwIDEgMzIuNTU4MiwtMjMuNzE2MiBaTTI4LjMzOTIsLTIyLjI0ODcgVDMwLjc2MjEsLTI1LjEyNSAzNC41NTI3LC0yOS44NzE3IDM3LjUzMjIsLTM0LjAyMDYgMzkuMTQzOCwtMzYuMjk5IEEzLjgyNjksMy44MjY5IDAgMCAxIDQ0LjgzNzksLTMxLjE4NDQgVDQzLjMsLTI5LjQxMTkgNDAuNDU0NywtMjUuNzAwOSAzNi45NjU1LC0yMC41NjM0IDM0Ljc4MzcsLTE3LjM2NDMgQTQuMDQzMiw0LjA0MzIgMCAwIDEgMjguMzM5MiwtMjIuMjQ4NyBaTTQ1Ljc4MzQsLTM0LjI1MzggVDQ1Ljk3MDcsLTMzLjIxMzcgNDYuMDU5NiwtMjYuMDYyMSA0NS44NTUyLC0xNS42MjczIDQ1Ljc0NDIsLTguNzI1OCA0NS42ODQ1LC0zLjgwNzEgNDUuNjI5OSwtMS40NjY1IEEzLjQzNDEsMy40MzQxIDAgMCAxIDM4Ljc5MTksLTIuMTEgVDM5LjE0NDQsLTQuMDk1MyAzOS40MzM1LC04LjY1MzYgMzkuMTU5MywtMTUuNTM0MyAzOC42NjgyLC0yNS40ODY2IDM4LjI5MzEsLTMyLjE4MDQgMzguMTk4NCwtMzMuMjI5NyBBMy44MjY5LDMuODI2OSAwIDAgMSA0NS43ODM0LC0zNC4yNTM4IFpNNDMuMTM0OCwxLjUxOTIgVDQxLjY1MzcsMS45OTA1IDMyLjQ2NywyLjU4NjcgMTkuMTg1NywyLjcxMTcgNi45NzY0LDIuNzY3IDAuMzQyOSwyLjgyMjEgQTIuNzkyOCwyLjc5MjggMCAwIDEgMC4yMTk2LC0yLjc2MjEgVDYuODQ5MSwtMi45OTk3IDE5LjAyMDUsLTMuNDgyNSAzMS40Mzc0LC00LjA1MzkgMzkuNzk5OCwtNC43Mzc5IDQxLjI4NzEsLTUuMDk1NyBBMy40MzQxLDMuNDM0MSAwIDAgMSA0My4xMzQ4LDEuNTE5MiBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiNmMWFjNGIiLz48L2c+PC9nPjwvc3ZnPg==",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMjc2LjI5MDY0OTY0NTgzNTg2IiBoZWlnaHQ9IjE2My4wMDY3OTk0MDYyNTQyNiIgdmlld0JveD0iMTAyNi45MDExNzU4NjY1MzM1IDcwNi4xNDI2MTAxNDg1MjM4IDI3Ni4yOTA2NDk2NDU4MzU4NiAxNjMuMDA2Nzk5NDA2MjU0MjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDsiPjxkZWZzLz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjc2NiwgMC42NDI4LCAtMC42NDI4LCAwLjc2NiwgMTA5OC4yODY0LCA3MTUuNTA0MikiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0tMi4yNzEzLC02LjA5ODIgVDEuNzA1MywtNy41MjExIDEwLjc0MDcsLTEwLjYzODIgMjIuMzI4OCwtMTQuNzM4MiAzNy4xOTEzLC0yMC40MjUyIDU1LjI4MDQsLTI3LjYxMiA3NC4yNTIzLC0zNS4xMjIxIDkxLjk2OTYsLTQyLjA1MDQgMTExLjY0ODgsLTQ5LjcxNzEgMTMwLjgzNDMsLTU3LjExNDggMTQ1LjE4MDcsLTYyLjU1MTYgMTU3LC02Ni45NzI0IDE2Ny4wNDYsLTcwLjc4MiAxNzUuMjA4NywtNzQuMDExMiAxODMuOTU2NywtNzcuNDUxOCAxOTIuMTcyMywtODAuMDk0MSAxOTUuMjM3LC04MC43NTQyIEE2LjI3NTUsNi4yNzU1IDAgMCAxIDE5Ni40ODM5LC02OC4yNjUzIFQxOTQuMzYzNCwtNjguNDA3NyAxODcuMTI5OSwtNjcuMzgxNiAxNzguMzU3NiwtNjUuMTU0MyAxNzAuMTAzMywtNjIuNTIyNSAxNjAuMDU2MywtNTguODgyNiAxNDguMzA1MiwtNTQuMzk1IDEzNC4wNDg0LC00OC44NjUyIDExNC45NzAxLC00MS4zMzM2IDk1LjQwNDksLTMzLjQ3MDIgNzcuODU4MywtMjYuMjc4OCA1OS4wOTg3LC0xOC40MDAzIDQxLjE5MTYsLTEwLjY2ODcgMjYuNTA1OSwtNC4yMTc3IDE1LjEwOTIsMC44Mzg5IDYuMjA5OSw0LjU3MyAyLjI3MTMsNi4wOTgyIEE2LjUwNzUsNi41MDc1IDAgMCAxIC0yLjI3MTMsLTYuMDk4MiBaTTIwMS4zNjkyLC03MS41MDM4IFQyMDAuMjIyLC02OS4xMzI1IDE5Ni4xNzIxLC02Mi45MTY2IDE4OS4yNjQ0LC01My45MDc4IDE4MS45MjQxLC00NC42OTMzIDE3NC4zNjI1LC0zNS4yODY3IDE2NS41MjY3LC0yMy45NzcyIDE1NC43ODc1LC05Ljk1MzEgMTQzLjA5Nyw1LjU4NDUgMTMyLjQ1ODgsMjAuMDEzNCAxMjIuNjU1NSwzMy40MzQzIDExMy44NzMzLDQ1LjUyMjYgMTA2LjI3MzcsNTYuMTk2OCA5OS4zMDQ2LDY2LjI3MjQgOTIuNzM0NCw3Ni4xNTQyIDg2LjY5MTcsODUuNjk2NCA4MS4yMzYsOTQuOTA1MyA3Ni43NDc4LDEwMy4zMDY3IDczLjI1MDcsMTEwLjU1MDYgNzAuMjUxNiwxMTcuMDUwOSA2Ni40MDYsMTI1Ljc4MjYgNjIuNjUxMiwxMzQuOTQyMyA1OS45MzczLDE0Mi4yNjA2IDU3LjMzNCwxNDkuNDY1NiA1My4yOTAxLDE1NS43OTg1IDQ1LjgxMTMsMTU4LjU2OTggMzcuODk2MywxNTUuNjA0IDMyLjcwOTYsMTQ5LjE2NzEgMzAuNDM3NCwxNDEuOTIwMyAzMC40NjU5LDEzMy42NDgxIDMxLjQ2MDgsMTI1LjY3MDQgMzIuNjc2MSwxMTguNTc2NiAzMy43NTI2LDExMS4yODkgMzQuOTEwOSwxMDMuNTI0NyAzNi4wNDk2LDk1LjQzNiAzNy4xNDQyLDg3LjEzNDUgMzguNDc5OSw3OC4zNDM2IDM5LjkwNTcsNzAuMDQ2IDQxLjYzMjksNjEuNDYyMyA0My40NzI4LDUyLjc1NDkgNDQuODY4Myw0NC4xMzAzIDQ1LjQ0MDMsMzkuNTQ1IEE5LjA5ODksOS4wOTg5IDAgMCAxIDYzLjU0MzEsNDEuNDAxNyBUNjMuMjg0NSw0My42ODI2IDYyLjI2MDksNDkuNjQxOSA2MC41NjA0LDU3LjEwODYgNTguNjIzNCw2NS4xMjQzIDU2Ljk1NjgsNzMuMDM0NyA1NS42Njk5LDgwLjkyOTQgNTQuNTQsODkuMjYzNSA1My41ODAzLDk3LjY2NTUgNTIuNTcyMywxMDYuMDY0IDUxLjMyNTksMTE1LjM5NDcgNDkuNzY1NiwxMjUuMDI4MSA0OC4xOTc3LDEzMy4xNDEgNDguMjc2MSwxNDAuNTg2IDQ1LjczLDE0NS4xODI1IDQ0LjAyMjgsMTQyLjk0NzIgNDcuNTM0MSwxMzYuNDczMiA1MS4yODcxLDEyOS42NzM0IDU2LjE4ODEsMTIwLjc0NjkgNjAuOTkzNSwxMTIuMTk5OSA2NC42ODA1LDEwNS45NDk4IDY4Ljg2ODYsOTguOSA3My44MTYsOTAuNDkwNyA3OS40MjUsODEuMTI0NSA4NS41MTQyLDcxLjM5MzYgOTIuMDk2MSw2MS4zMzggOTkuMDI2NSw1MS4xMDgyIDEwNi41MzUyLDQwLjI3NzcgMTE1LjEzOTQsMjguMDUwMiAxMjQuNzAxNSwxNC40MzQ4IDEzNS4wMzU5LC0wLjI5NTMgMTQ2LjI2NzQsLTE2LjE4MDEgMTU2LjM0OTUsLTMwLjYyMyAxNjQuMzM1NCwtNDIuNTMyNiAxNzAuOTczNCwtNTIuNzg0NSAxNzcuOTY3LC02Mi42OTE4IDE4NS41NTc1LC03MS44NTUxIDE4OS42OTUxLC03Ni41ODE0IDE5MC4zNTE3LC03Ny41MTU3IEE2LjI3NTUsNi4yNzU1IDAgMCAxIDIwMS4zNjkyLC03MS41MDM4IFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzFkMWQxZCIvPjwvZz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMC43NjYsIDAuNjQyOCwgLTAuNjQyOCwgMC43NjYsIDEwODIuMjU1NSwgNzE0LjE0MTYpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNMCwtNy4zNDQ0IFQ0LjA2NDQsLTcuMjMyMSAxMS44MTYxLC03LjE1OTkgMTkuNjA5NSwtNy4wODI4IDI3LjM4NjEsLTYuNzM5IDM3Ljc0MywtNS43Mzk1IDQ5LjI0MSwtNC4wOTc0IDU5LjM1MDUsLTEuNTgyMSA2NC42NDg0LDAuMDY0IEE3LjQwMzcsNy40MDM3IDAgMCAxIDYwLjAzNjIsMTQuMTM0NyBUNTcuMjEwMSwxMy4xOTc0IDUwLjcwNDUsMTEuMDYxMSA0MS4zNzg1LDguODA4IDI5LjYzOTEsNy4yNzE1IDE5LjY5NzIsNi44MDkgMTEuOTg4NSw2Ljk3NDMgNC4wNjQ0LDcuMjMyMSAwLDcuMzQ0NCBBNy4zNDQ0LDcuMzQ0NCAwIDAgMSAwLC03LjM0NDQgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjc2NiwgMC42NDI4LCAtMC42NDI4LCAwLjc2NiwgMTEyMi4zODMyLCA3NjQuNjg4NSkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0tMy40MDAyLC01LjY2ODYgVDEuODA5LC04LjQyOTEgMTMuMTY4MSwtMTQuNTU5NiAyNi4xODQ0LC0yMS44NjA1IDQwLjg2MSwtMzAuNDk0IDU3LjI3MjUsLTQwLjQzNiA3My4xODYyLC01MC4xNTY1IDg4LjE1OTUsLTU5LjMxODIgMTAxLjEwNTcsLTY3LjE4NyAxMTAuNzAyNiwtNzMuMDEzMyAxMTguNDM3NiwtNzcuOTE5IDEyNi45OTA2LC04My43MDMgMTM1LjQ2NzcsLTg5LjI3MTQgMTM4LjgxNTEsLTkxLjMyMyBBNS43ODI4LDUuNzgyOCAwIDAgMSAxNDQuNjczMiwtODEuMzUwOCBUMTQxLjI1MTQsLTc5LjQyNTkgMTMyLjM2MTYsLTc0LjY3ODkgMTIzLjI2OTQsLTY5Ljg2NTkgMTE1LjMxNTIsLTY1LjM2NzIgMTA1Ljc1ODcsLTU5LjYyMTYgOTIuOTM5LC01MS42MjYyIDc4LjEwMTUsLTQyLjI2NzEgNjIuMzU0LC0zMi4yNjQgNDYuMTE1MywtMjEuOTAzMSAzMS42NTk4LC0xMi42OTIgMTkuMDU4LC00LjY4MjEgOC4yODgyLDIuMzcyNSAzLjQwMDIsNS42Njg2IEE2LjYxMDIsNi42MTAyIDAgMCAxIC0zLjQwMDIsLTUuNjY4NiBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjwvc3ZnPg==",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iOSIgaGVpZ2h0PSIyNy4yNTEzMDMzMTEyOTU4MSIgdmlld0JveD0iMTIxOC41OTc1ODA1MjU5ODc3IDY4LjM4OTc3MjQ0Mjk2Mzc2IDkgMjcuMjUxMzAzMzExMjk1ODEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDsiPjxkZWZzLz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxMjIzLjA5NzYsIDcyLjU5MTkpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNIDAgMCBtIC0zLjM2MDc5NDA3OTI1MDM5NTQsIDAgYSAzLjM2MDc5NDA3OTI1MDM5NTQsMy4zNjA3OTQwNzkyNTAzOTU0IDAgMSwxIDYuNzIxNTg4MTU4NTAwNzkxLDAgYSAzLjM2MDc5NDA3OTI1MDM5NTQsMy4zNjA3OTQwNzkyNTAzOTU0IDAgMSwxIC02LjcyMTU4ODE1ODUwMDc5MSwwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDEyMjMuMDk3NiwgODIuMDI3MSkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0gMCAwIG0gLTMuMzYxOTk1NjUxMTYzMjE4MywgMCBhIDMuMzYxOTk1NjUxMTYzMjE4MywzLjM2MTk5NTY1MTE2MzIxODMgMCAxLDEgNi43MjM5OTEzMDIzMjY0MzcsMCBhIDMuMzYxOTk1NjUxMTYzMjE4MywzLjM2MTk5NTY1MTE2MzIxODMgMCAxLDEgLTYuNzIzOTkxMzAyMzI2NDM3LDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzFkMWQxZCIvPjwvZz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTIyMy4wOTc2LCA5MS40Mzg5KSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTSAwIDAgbSAtMy41ODMyMDgzMDI5MjQ0ODY4LCAwIGEgMy41ODMyMDgzMDI5MjQ0ODY4LDMuNTgzMjA4MzAyOTI0NDg2OCAwIDEsMSA3LjE2NjQxNjYwNTg0ODk3MzYsMCBhIDMuNTgzMjA4MzAyOTI0NDg2OCwzLjU4MzIwODMwMjkyNDQ4NjggMCAxLDEgLTcuMTY2NDE2NjA1ODQ4OTczNiwwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjwvc3ZnPg==",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iNTYuMTU0NDkzOTYyOTY3MzE1IiBoZWlnaHQ9IjU3LjQ0NTc2MjQ3MjA4MzUzIiB2aWV3Qm94PSIxNjUwLjk0NzU2Nzc4MDIyNSA2ODEuMzk4NTYyNjk1NDg2MSA1Ni4xNTQ0OTM5NjI5NjczMTUgNTcuNDQ1NzYyNDcyMDgzNTMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDsiPjxkZWZzLz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxNjU3Ljg3ODYsIDY4OC4yMDMxKSIgb3BhY2l0eT0iMSI+PHBhdGggc3Ryb2tlLXdpZHRoPSIxMCIgZD0iTSAtMS43NTc1IDE4Ljc2MjQgQyAwLjY1MTUgNS45MzggOC4wOTggLTEuNzkyIDE3LjI4MzYgLTEuNzkyIEMgMjcuMzg4MyAtMS43MDM1IDM0LjgzNDcgNi4wMjY0IDM0LjgzNDcgMTUuNTYxOSBDIDM0LjQwNzUgMjguNjk5NSAyNi45NjEgMzYuNDI5NSAxNy43NzU0IDM2LjQyOTUgQyA1LjY4OSAzNi4wMjc4IC0xLjc1NzUgMjguMjk3OCAtMS43NTc1IDE4Ljc2MjQgTSAtMS42NTQyIDE4LjQ0MzIgQyAyLjA5MDkgOC41ODEzIDkuNTM3NCAwLjg1MTMgMTguNzIzIDAuODUxMyBDIDI1LjExNjkgMS43ODYxIDMyLjU2MzMgOS41MTYxIDMyLjU2MzMgMTkuMDUxNiBDIDMyLjExIDI4LjAyMTkgMjQuNjYzNSAzNS43NTE5IDE1LjQ3NzggMzUuNzUxOSBDIDUuNzkyMiAzNS43MDg2IC0xLjY1NDIgMjcuOTc4NyAtMS42NTQyIDE4LjQ0MzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFkMWQxZCIvPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxNjg0LjAzNzQsIDcxOS4zMjUzKSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTTIuOTU5NiwtMy41MDYzIFQ0LjMxMjYsLTIuMjkyMyA3LjM2MTgsMC40MDY1IDEwLjU5MiwzLjI5MjYgMTMuNzU5Niw1Ljk2OTYgMTcuMDYyMSw4LjI1MzkgMTkuNzk1Miw5Ljk1NDcgMjAuODU5MywxMC42NDcxIEE0LjkwNjIsNC45MDYyIDAgMCAxIDE1LjQxOSwxOC44MTMzIFQxMy44MDgyLDE3LjY3MzggMTAuNDI2MSwxNS40NjA3IDcuMTkwOSwxMi45MDM1IDQuMzI3OSw5Ljk3MTkgMS40MDg2LDcuMTQ1MSAtMS41MzU1LDQuNjM2MyAtMi45NTk2LDMuNTA2MyBBNC41ODg0LDQuNTg4NCAwIDAgMSAyLjk1OTYsLTMuNTA2MyBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjwvc3ZnPg==",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iNTUuNDYwOTM3NSIgaGVpZ2h0PSI1OC4zNDA4Mzc0NDUxNzU0NCIgdmlld0JveD0iMTA0NC43NDAwNzg5OTI1NjI1IDUyMS44NDE0MTU2MzAyNDg4IDU1LjQ2MDkzNzUgNTguMzQwODM3NDQ1MTc1NDQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDsiPjxkZWZzLz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxMDcxLjU3NTUsIDUyNS42NzY5KSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTTMuNjY1MSwwIFQzLjY1MDEsMi4xMTM5IDMuNjI1NSw2LjMyMTggMy41Nzg3LDEwLjcyNDQgMy40MjIzLDE1LjgzOTMgMy4xNjk5LDIxLjgyMjggMi45NzgxLDI3LjgwNjcgMi45ODUyLDMyLjY1NzkgMy4xOTI4LDM4LjE3NTcgMy40NjQ5LDQ0LjQ2MTQgMy42Mjg4LDQ4Ljk3MTggMy42NjI3LDUwLjY2OTkgQTMuNjYyNywzLjY2MjcgMCAwIDEgLTMuNjYyNyw1MC42Njk5IFQtMy42Mjg4LDQ4Ljk3MTggLTMuNDY0OSw0NC40NjE0IC0zLjE5MjgsMzguMTc1NyAtMi45ODUyLDMyLjY1NzkgLTIuOTc4MSwyNy44MDY3IC0zLjE2OTksMjEuODIyOCAtMy40MjIzLDE1LjgzOTMgLTMuNTc4NywxMC43MjQ0IC0zLjYyNTUsNi4zMjE4IC0zLjY1MDEsMi4xMTM5IC0zLjY2NTEsMCBBMy42NjUxLDMuNjY1MSAwIDAgMSAzLjY2NTEsMCBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiM5ZmE4YjIiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDEwNDguNTA1NCwgNTU1LjU4MTYpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNLTAuMzYwMSwtMy42OTczIFQzLjAwNDcsLTMuODQwOSA4Ljc3MzIsLTQuMjQ5NiAxMy4zMzEyLC00Ljg5NzUgMTcuNzU0NCwtNS43OTA1IDIyLjE5OTMsLTYuOTAzMiAyNi40MDUyLC04LjA4NzggMzAuMjMwNywtOS4yMTE1IDM0LjY0OTUsLTEwLjY1ODQgMzkuMjU0NSwtMTIuMTk0NCA0My42OTYxLC0xMy4zMjUyIDQ2LjE1NjIsLTEzLjgyNTEgQTQuMjA1Niw0LjIwNTYgMCAwIDEgNDcuNjg3NiwtNS41NTQ1IFQ0NS4zNzc4LC01LjM2MzUgNDEuMjE5OSwtNC44OTIxIDM2LjYwMDUsLTMuOTE1OSAzMi4wMDEyLC0yLjc2MTggMjguMTQwOSwtMS43NzY0IDIzLjgwMTQsLTAuNjEgMTkuMDU4NSwwLjYxMjMgMTQuMzAzNiwxLjU5NzUgOS41MDE1LDIuMzQwMyAzLjY4OTQsMy4xODkgMC4zNjAxLDMuNjk3MyBBMy43MTQ4LDMuNzE0OCAwIDAgMSAtMC4zNjAxLC0zLjY5NzMgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjOWZhOGIyIi8+PC9nPjwvZz48L3N2Zz4=",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMTY2LjUzNjM3NTM1MTA3OTk1IiBoZWlnaHQ9IjE2OC43NTI1NjE0Mzg2NDYyIiB2aWV3Qm94PSIxNjI5Ljk2MTg2NjE5NDkyNiA0OTAuMjA0Mjc5ODY5MjE2NzUgMTY2LjUzNjM3NTM1MTA3OTk1IDE2OC43NTI1NjE0Mzg2NDYyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7Ij48ZGVmcy8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTcyMC4wNjMxLCA1NTMuODk0OSkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0tMC4xNDE2LDQuMzg4NSBULTEuNzY2NCw0LjMxNSAtNS43NzIxLDQuMjEwOSAtMTAuMDEzOSw0LjE5NjggLTE0LjIwODMsNC4zOTc1IC0xOC40NTMsNi4xNjE0IC0yMS45NDA2LDkuNjYxMyAtMjQuOTQsMTMuODg1MSAtMjcuNTMwNiwxOC43NzI2IC0yOS40NDU4LDIzLjgxMTEgLTMwLjUyNzgsMjguNTE2OCAtMzAuOTM4NiwzMi43MjE1IC0zMC44OTc5LDM2LjU2IC0yOS45MDYyLDQwLjU2NzEgLTI3LjQ4MzUsNDQuMzI5MiAtMjQuMTg1Nyw0Ny4xOTgyIC0yMC42NDUzLDQ5LjMzNTcgLTE2Ljk3NjYsNTAuOTQxNyAtMTIuMzg4Miw1Mi4yNSAtNy4xOTY0LDUzLjAxMTUgLTIuNDI2MSw1Mi44MTkyIDEuOTQxMSw1MS40MzMzIDUuNjM0OSw0OS4zMTg4IDguODMwOSw0Ny4wNjYzIDExLjg4OTYsNDQuNTE0IDE0LjQ3NjIsNDEuMDY3NiAxNi4xNzY1LDM3LjIwOTggMTcuMjQzNywzMy4xMjk3IDE3LjgyMzYsMjguNDAwNiAxNy4zMzcsMjMuOTU0OCAxNS43MjY4LDIwLjI3NzEgMTMuNTcxNywxNy4xNDA0IDExLjEwNywxNC4yNTE4IDguMjY2NCwxMS4zODY3IDQuNzU2Niw4Ljk5NjEgMS4wMzc1LDcuMTY1NyAtMi43MzA1LDUuNDE0MSAtNC43NzY5LDQuNTUxNCBBNS4yMzMxLDUuMjMzMSAwIDAgMSAtMi4zNjE2LC01LjYzMjMgVC0wLjAzOSwtNC45MzM1IDQuMTE0OSwtMy4wNjIgNy45Mzk4LC0wLjk5OSAxMS41NjYxLDAuOTY3NSAxNC43NDA1LDMuNTQ3NyAxNy44MTM4LDYuNjU5NCAyMC43MTg3LDkuOTg2NyAyMy4zMjQ2LDEzLjUyNTIgMjUuNTAyNCwxNy4yNzQ0IDI3LjAzMSwyMS4wNzA5IDI3LjcxOTIsMjUuMjE5NCAyNy42NTQ5LDI5LjkzMzMgMjcuMDA4MywzNC43MDQ5IDI1Ljg3MTksMzkuMTM0OSAyNC4zNjA5LDQzLjIzNDMgMjIuMjY4Nyw0Ny4wOTc2IDE5LjQxMDUsNTAuNDkzOCAxNS45ODkzLDUzLjUxNjggMTIuNDYxMSw1Ni4xODU3IDguODAyMSw1OC41NDU5IDQuNjQ1OCw2MC42NjcgMC4yNjU5LDYyLjA1ODIgLTQuMzc2Miw2Mi40NDkzIC05LjEyMzIsNjIuMTcyNCAtMTMuNjk5Miw2MS40NDI2IC0xOC4xOTE4LDYwLjIyMzYgLTIyLjc1ODQsNTguNDQzNyAtMjcuMzkwNCw1Ni4wMDg0IC0zMS44MDcyLDUyLjgwNTEgLTM1LjUxOTgsNDguOTUzNyAtMzguMDkzMSw0NC40NzgyIC0zOS41MTUyLDM5LjM2MTUgLTM5LjgzMDYsMzQuNDEyNyAtMzkuNDczNCwyOS41MDc5IC0zOC40ODU3LDIzLjk4NjEgLTM2LjYzOSwxOC4wMDAxIC0zMy45NjgxLDExLjk0MDcgLTMwLjU2MzEsNi4yNjk5IC0yNi41MzE0LDEuMzQwMyAtMjIuNjY3NywtMi4xMzkxIC0xOC4zNTU5LC00LjA1OTEgLTEzLjc3ODMsLTQuNzI4NiAtOS44OTg0LC00LjY2MTEgLTUuNTUxNiwtNC41MjczIC0xLjQ4NDYsLTQuNDE5OSAwLjE0MTYsLTQuMzg4NSBBNC4zOTA4LDQuMzkwOCAwIDAgMSAtMC4xNDE2LDQuMzg4NSBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDE3NTEuODMsIDUyOC4wMjM0KSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTTAsNC41MzI1IFQtMS40NTI3LDQuNTE3MSAtNS40MzA2LDQuNTAxNCAtMTAuMjI4OSw0LjUxMzcgLTE1LjAyNDUsNC41NjkxIC0xOS45NjU0LDQuMzI3NiAtMjQuMDc5NCwyLjQ1NTQgLTI2LjI0MTQsLTEuMTQyMiAtMjYuODA0MiwtNS4xODI1IC0yNi43NjU2LC05LjIwNTcgLTI2LjQzMDQsLTEzLjM5MjEgLTI2LjY1NDEsLTE3Ljk4NTYgLTI4LjMxMTgsLTIyLjA0MjMgLTMxLjI2NjUsLTI1LjAzMTIgLTM1LjI4NzksLTI3LjA3NDQgLTM5Ljg5MzIsLTI3Ljg5MTMgLTQ0LjE0MjgsLTI3Ljc0MDQgLTQ4LjQ4MzksLTI2LjI2MzggLTUzLjAwMSwtMjMuNjQ3OSAtNTYuOTI4NSwtMjAuOTUyNiAtNjAuMjE3MSwtMTguMjA3OCAtNjIuOTAzMiwtMTQuODgwMyAtNjUuMTEsLTExLjEzNjMgLTY2Ljg5NCwtNy40NTM3IC02Ny43MSwtMy41NDAyIC02Ny43Mzc5LDAuNjg4NSAtNjcuOTA4OCw1LjA1MDkgLTY4LjYzNCw5LjU5MzEgLTcwLjEwMzEsMTMuOTc2OCAtNzIuNDAxNiwxNy4zNTMxIC03NS43NjY1LDE5LjI0MjYgLTgwLjMwNjYsMjAuNTg4MyAtODQuODIxNywyMS45NzI2IC04OC42MzYsMjMuMTU3MyAtOTIuNjQ4MywyNC4yOTM4IC05Ni43NDQ4LDI1LjMwMTUgLTEwMS4wOTYzLDI2LjE5NTcgLTEwNS40MTkzLDI3LjEwMjQgLTEwOS4xMDYyLDI4LjEwMTQgLTExMC40MjgxLDMwLjU2NTMgLTEwOS43MTUsMzQuNjEwOCAtMTA3LjgxNTEsMzguMDEwNiAtMTA0LjIwODksMzkuODA3IC0xMDAuMjAyOSw0MS4xODU2IC05Ni40MzEsNDMuNTM4OSAtOTMuNjA2LDQ3LjEyNTkgLTkxLjg2OTksNTEuNDgyNCAtOTAuODE5MSw1NS45MDgxIC05MC4xODc0LDYwLjEwNzMgLTkwLjMyMSw2NC45MDU1IC05Mi4yNTQ5LDY5LjA2MTQgLTk1Ljg4NzgsNzEuMTY0IC0xMDAuMDk0MSw3My40MTU0IC0xMDMuNzAwNyw3Ni4yMTIxIC0xMDYuODA4Niw3OS4xMDkgLTEwOS41MDY2LDgyLjQ0MjEgLTExMC42Nzg3LDg2LjU3OTUgLTExMC44Mjc2LDkxLjAyNjcgLTExMC44MzMxLDk0LjkyMDkgLTExMC4wMDg3LDk4LjcwNTEgLTEwNy4yNDAyLDEwMS43MDE3IC0xMDMuNTA2MiwxMDMuNTIzNiAtOTkuNzA2NCwxMDQuNjQxMiAtOTUuNjE5OSwxMDUuMTA1NCAtOTEuNjgxOCwxMDQuNzcwOCAtODcuNjMzMSwxMDMuNTc5NSAtODMuMTY1NiwxMDEuNzEzMiAtNzguOTAyLDk5LjY4MyAtNzQuNzExNSw5Ny44Mjc1IC03MC4xODg3LDk2LjI5MjIgLTY1LjcwNiw5NS41MTM3IC02MS4yNzE4LDk1LjU3OSAtNTYuODk2Nyw5Ni4zMTU5IC01Mi44MzkzLDk3LjUyODggLTQ4Ljg2OTcsOTkuMTgyNyAtNDQuODQ2MSwxMDEuODAzMSAtNDEuODE5OCwxMDUuMDcwNCAtMzkuODY3LDEwOC40NTQ3IC0zNy41NzI4LDExMS44NzA1IC0zNC45MzIzLDExNC45NDI3IC0zMi4zOTAzLDExNy44MjE4IC0yOS4xNjMsMTE4LjYxNyAtMjUuNDY2MiwxMTYuODYwNSAtMjIuMTA1MiwxMTQuNDc3MiAtMTkuMDI5NiwxMTIuMDEzIC0xNi4xOTE1LDEwOS4zODAxIC0xNC42MzIxLDEwNS44NzgyIC0xNC4yMzk1LDEwMS42MjA0IC0xMy4zNDY4LDk3LjMyMDYgLTExLjM5NjQsOTMuMjE4MiAtOC4wOTI3LDg5LjU4ODEgLTQuMjU0Miw4Ny40NTg0IC0wLjE2MDEsODYuODA0MiA0LjE5MzIsODYuNjc5MiA4LjU0NDYsODYuNzk1OCAxMy4wODA4LDg3LjQ5NDcgMTcuMTA3LDg4Ljc5NzMgMjAuNjE4Nyw5MC4yMTYyIDI0LjIwNzUsOTEuMzYyNyAyNi40MjQ3LDg5Ljg3ODcgMjguMDk5OCw4NS45NTIyIDMwLjY3MTcsODEuOTIxMyAzMi44NDQ3LDc4LjE4NjMgMzMuOTUsNzQuNTc1NSAzMy4zMjc1LDcwLjgwMzQgMzEuMTgwNyw2Ny41ODUgMjguMTAwOCw2NC45MDE5IDI0LjYyODcsNjIuODIzIDIwLjgzMTQsNjEuNTQ3NSAxNy4xMjAyLDYwLjA5NTMgMTQuMjI4Nyw1Ny4xNDQ5IDEyLjgzNTMsNTMuMTQ5MyAxMi43MTM3LDQ5LjAwODUgMTMuMTc3LDQ0LjY0OCAxNC40Mjg5LDQwLjM0NCAxNi4yMDIzLDM2LjQzMDYgMTguMzEzLDMzLjEzMTEgMjAuODk2OSwzMC4xMjQxIDIzLjc4MzIsMjcuMTIyOCAyNi42NTI5LDI0LjEyNjIgMzAuMDE1NiwyMC40Nzc2IDMxLjk2MTEsMTguMzM0MSBBNS4xNjM3LDUuMTYzNyAwIDAgMSAzOS41ODUzLDI1LjMwMDIgVDM3LjM1MDYsMjcuODU4MyAzMy40OTAzLDMyLjEyMjUgMzAuNDgxNywzNS4yNjM0IDI3Ljc0ODYsMzguMjI5NiAyNS40MzM5LDQxLjU1NjYgMjMuODY1MSw0NS4zODk3IDIzLjMzMTgsNDkuNDQ3MyAyNS4zNjMxLDUxLjk5OTkgMjkuMjQ1NCw1My40NTc0IDMyLjk5MzgsNTUuNjQ4OCAzNi4zMTE4LDU4LjE4OCAzOS40ODgyLDYxLjI4NjUgNDIuNDQ4Myw2NS4wNzI2IDQ0LjEwMDksNjkuNDczOSA0NC4zOTY2LDc0LjEwNDUgNDMuNzM5OSw3OC40MzA3IDQyLjIzODMsODIuMzA2IDQwLjI0MjksODUuODUzOSAzOC4yMTQ1LDg5LjI1NzggMzUuNzkwNiw5My4wOTMyIDMyLjk1MjksOTcuMTU2MyAzMC4wODY3LDEwMC4zMTYxIDI2LjUwNzUsMTAxLjkyMiAyMi40Mjg0LDEwMS43MTYxIDE4LjU0ODcsMTAwLjU1ODEgMTQuNTgxOCw5OS4wMDQ1IDEwLjY3NTIsOTcuNjQ3NyA2LjkyNzYsOTcuMTU3MyAzLjEzMjYsOTcuMTkzMSAtMC41NjY1LDk3Ljg1NDIgLTMuMDcxNiwxMDAuNDc1MyAtMy43OCwxMDQuNTAwMyAtNC4wNTc3LDEwOC40ODA0IC01LjIzMDQsMTEyLjI4NTMgLTcuNDMxNywxMTUuNjUwNiAtMTAuMjU4MywxMTguNDg5MSAtMTMuMzM3MiwxMjEuMDU5IC0xNi4zNTIxLDEyMy40NzQ4IC0xOS40MTU1LDEyNS42MzY3IC0yMi42NTQ1LDEyNy42ODcxIC0yNi4wMDUxLDEyOS43NTMzIC0yOS45MTU2LDEzMS4wMTggLTMzLjk3MTgsMTMwLjM3ODcgLTM3LjMxMjUsMTI4LjAwODggLTQwLjIyNzEsMTI0Ljg4NTMgLTQyLjk5NDMsMTIxLjY3MDYgLTQ1LjcwMjgsMTE4LjUyNjggLTQ4LjAxMDksMTE1LjIwNzIgLTQ5Ljg3MjIsMTExLjYzNTggLTUyLjU2ODIsMTA4LjgwMTkgLTU2LjUwOTksMTA3LjA3NjcgLTYwLjcyOTMsMTA1Ljk1NyAtNjQuNjY1MSwxMDUuNTgwMiAtNjguMzQ1NCwxMDYuMTcwNSAtNzIuMDM4MiwxMDcuNTM4NyAtNzUuOTUyOSwxMDkuMzYgLTc5Ljc2NCwxMTEuMjEwOCAtODMuMzg2LDExMi43ODkgLTg3LjY4LDExNC4yNDA3IC05Mi41NDg4LDExNS4xMzAzIC05Ny43NTIzLDExNS4xNyAtMTAyLjk2ODUsMTE0LjQwMzkgLTEwNy40MTIyLDExMi45OTk5IC0xMTEuNTk0LDExMS4wNTU5IC0xMTUuMjY1MywxMDguNjQ0NiAtMTE3Ljg4NzUsMTA1LjcwOTcgLTExOS43NjkyLDEwMS44NjEzIC0xMjAuNzg1NSw5Ny4wNDIyIC0xMjEuMDM2OSw5Mi4zMDM3IC0xMjAuOTg4OSw4OC4wOTM0IC0xMjAuNzIzNCw4My45OTMgLTExOS44NjM0LDgwLjE1NCAtMTE4LjEwMzYsNzYuNzU4NiAtMTE1LjIyMiw3My4yOTMgLTExMS44NTgzLDY5LjgxMzYgLTEwOC42OTU2LDY2Ljk0NzUgLTEwNC44OTQ2LDY0LjA2NDIgLTEwMC4zNTg0LDYxLjY5NTUgLTk5LjE4NTIsNjIuNDIyMyAtMTAwLjQ2MTQsNjIuMDAzOSAtMTAxLjAxOTUsNTguMTEwNyAtMTAyLjA4NjYsNTQuMTAwMiAtMTA0LjM2NjcsNTEuMTA0NCAtMTA4LjEyMjMsNDkuNTc4OCAtMTEyLjA0OTYsNDguMzQ5OSAtMTE1LjM5OCw0Ni40NDE5IC0xMTcuOTYyLDQzLjIyOTggLTExOS4zODA1LDM5LjM0MjQgLTEyMC4wMzM4LDM1LjE2MjcgLTEyMC4yODQ4LDMwLjg0NDEgLTEyMC4xOTg5LDI2LjgyMjYgLTExOC45MDM5LDIzLjAwMDkgLTExNi4wNzE0LDIwLjE3ODcgLTExMi41Njk3LDE4LjY3NzMgLTEwOC44MDI0LDE3LjY3MDYgLTEwNC42MzIzLDE2Ljc4NzYgLTk5Ljg0MDQsMTUuNzY5NyAtOTQuNTY4NywxNC4zNTU4IC04OS45MTc5LDEyLjg2MjUgLTg1LjU0OTcsMTEuMzQwMSAtODEuMTMxMSw5LjkzNzkgLTc4LjY0MDMsNy4yNTE2IC03OC4wMTEyLDIuODg1IC03Ny45MDE2LC0xLjMzMzcgLTc3LjY3NjcsLTUuNTE4NyAtNzYuODUxMSwtOS40ODkyIC03NS4yMjA5LC0xMy4yNzY1IC03My4wMzQ2LC0xNy4zNzI0IC03MC41ODE4LC0yMS4zMDMzIC02Ny41NDI0LC0yNC44OTggLTYzLjkwNzMsLTI4LjAzOTkgLTU5LjgzNTYsLTMwLjkxNzIgLTU1LjczNzksLTMzLjYxNzUgLTUxLjM5NCwtMzUuODk1MiAtNDYuMjE1LC0zNy40MjQ2IC00MS4xMDg5LC0zNy44MTY1IC0zNi4yNzk2LC0zNy4zODM5IC0zMS42NzgxLC0zNi4yODczIC0yNy41OTIxLC0zNC4zOTMyIC0yMy44Nzc4LC0zMS42ODQxIC0yMC42NjE1LC0yOC4zMDQ2IC0xOC4wMjkzLC0yNC4wMTEzIC0xNi41NjE2LC0xOS41NzQ4IC0xNi4zNzU2LC0xNS4yNjgyIC0xNi44MjYyLC0xMC42NzAxIC0xNy4zNjM5LC02LjUwMjkgLTE1LjAyNDUsLTQuNTY5MSAtMTAuMjI4OSwtNC41MTM3IC01LjQzMDYsLTQuNTAxNCAtMS40NTI3LC00LjUxNzEgMCwtNC41MzI1IEE0LjUzMjUsNC41MzI1IDAgMCAxIDAsNC41MzI1IFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzFkMWQxZCIvPjwvZz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTc4Ny42LCA1NDkuODQpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNLTMuNzU3NSwtMi44OTY1IFQtMi44MTU5LC00LjE0MDkgLTIuMzg0MSwtNy4zODQ1IC00LjIwNDgsLTExLjEwODMgLTcuNTEwNSwtMTMuNjc1IC0xMS4zNTA0LC0xNC44OTk5IC0xNS4yMjE4LC0xNS40NTkgLTE5LjQ5MTksLTE1LjgzMjIgLTIzLjg0MzksLTE2LjA0NzMgLTI3Ljg4MjcsLTE2LjA5NTIgLTMxLjY4OTgsLTE2LjI5OTIgLTM2LjIzNzYsLTE2LjkzODcgLTM4LjkwODksLTE3LjQwNDIgQTUuMjQ3NSw1LjI0NzUgMCAwIDEgLTM2LjMyNDUsLTI3LjU3NjEgVC0zMy42NzY3LC0yNy4yMTQ1IC0yOS4wMzYxLC0yNi42NzY4IC0yNS4xMzg2LC0yNi40ODA5IC0yMS4yNjc0LC0yNi4zMjgzIC0xNi45MTQ2LC0yNS45ODk4IC0xMi4yODY3LC0yNS41MDUyIC04LjIwNDMsLTI0Ljc1MDcgLTQuNDQwNCwtMjMuNTM1MyAtMC42OTY5LC0yMS42NDU0IDIuNTA0OCwtMTguOTYzIDUuMDQ1NSwtMTUuNTQ1MSA3LjA0MDksLTExLjg5NTggOC4zODM3LC04LjI5OTggOC40MTcsLTQuNTYxNiA2LjgxOTUsLTEuMTEzNiA0LjcyNjUsMS42NjI0IDMuNzU3NSwyLjg5NjUgQTQuNzQ0Myw0Ljc0NDMgMCAwIDEgLTMuNzU3NSwtMi44OTY1IFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzFkMWQxZCIvPjwvZz48L2c+PC9zdmc+",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMTMyLjYzMzYxNzExMTkzNzQ0IiBoZWlnaHQ9IjExMy4xNjQ0NDY1Mjc3MTM4NCIgdmlld0JveD0iMTY5Ny4yODQwMjA0MjM2NTMxIDc4MS45NTUzNTAwNTM2ODk0IDEzMi42MzM2MTcxMTE5Mzc0NCAxMTMuMTY0NDQ2NTI3NzEzODQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDsiPjxkZWZzLz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxODA1Ljg0NzIsIDc5MS4xMjYpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNLTEuMjk5MSw4LjY4MjkgVC0xLjgxNzQsOC4yNTk3IC01LjUwMTEsOS44NTkyIC0xMS4xNTE5LDE0LjI0NjQgLTE2LjQ2NSwxOC42MDk4IC0yMS45OTI4LDIyLjcwMjYgLTI3LjU3NjQsMjcuNTMzOSAtMzMuMDA1OSwzMi45ODYxIC0zNS41OTY2LDQwLjAxNjQgLTM2LjEwMTcsNDcuOTQxOSAtNDAuMzk4Miw0OS4xNDExIC00MS4yMDA0LDQ0Ljg2NjUgLTM0Ljc2NzIsNDEuODk4NCAtMjguNTA4NSwzOC41NzE1IC0yMi40OTE5LDM0LjE0MzcgLTE2LjUwMDcsMjkuODI4MiAtMTAuODYyNywyNS4zNDAzIC01LjM2NTksMjAuNjI4OCAwLjA1MzYsMTYuMDQxOCA0LjI2NTUsMTYuOTgzNCAzLjM3MzQsMTcuMzg2NiAtMS42OTg0LDEyLjM4MjkgLTQuMzkyOCwxMC4xNzEyIEE5Ljg0NDMsOS44NDQzIDAgMCAxIDUuOTM1OSwtNi41OTA3IFQ5Ljc1NjMsLTMuODIwNCAxNS44NjQsMS41NDM1IDIwLjU3NDIsNy4zMjQ1IDIzLjM3MTMsMTQuMjkzNyAyMS42MzIyLDIxLjQ2NzQgMTYuOTc2NCwyNy4zMTIxIDExLjU0NjEsMzIuMTM1NyA1Ljg5MywzNi45MDAxIDAuNDIwMyw0MS41MzU1IC01LjM5MzgsNDYuMDQ1NyAtMTEuMzk3LDUwLjMzMzYgLTE3LjE2MzIsNTQuNTQzNSAtMjMuMDkwNCw1OC4yOTg3IC0yOS45MDYyLDYxLjEyMTkgLTM3LjA0MTEsNjMuNjkxMyAtNDQuNDk4MSw2NS4yMjc4IC01MS42Mzk5LDYzLjI3MTcgLTU1LjIwMzEsNTUuNjY0IC01NS4yMzI3LDQ2LjE3MzcgLTU0Ljc2MDksMzguMTUyMSAtNTQuMDgyNSwzMC44MDg4IC01MC42OTk4LDI0LjMxMjEgLTQ1LjQ4OTYsMTguNTkzMSAtNDAuNDU4OCwxMy42NDQ3IC0zNS4xMzA1LDkuMDk1NSAtMjkuNDQ3NCw0Ljg5OTMgLTIzLjc3MDUsMC41OTQ0IC0xNy44MDU3LC0zLjczMiAtMTAuOTA0OSwtNy40OTk4IC0yLjkzNjEsLTguOTcwOSAxLjI5OTEsLTguNjgyOSBBOC43Nzk1LDguNzc5NSAwIDAgMSAtMS4yOTkxLDguNjgyOSBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDE3NTYuMDgzOCwgNzk4LjIxNDcpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNMC4wODU5LDguMzcyOSBULTIuOTczMSw4LjMzNiAtMTAuNTI5MSw4LjMzNjQgLTE4LjQ3MTMsOC40MzI3IC0yNS41MzMyLDguNTUzNiAtMzIuOTQzOSw4Ljk1ODYgLTQwLjEwNDYsOS45NTYzIC00MS4yNDcxLDcuNjA5MiAtMzguNjc4Niw4LjY2OTIgLTM4LjM1NzksMTYuNzM3MyAtMzguNzEyNiwyNC41NDQ2IC0zOS4zMzQyLDMyLjgyMjIgLTM5LjcwOTUsNDEuNjE1NyAtMzkuODA1OCw0OS45NTM4IC0zOS4zNTAyLDU4LjA2MTggLTM4LjEwNjEsNjUuODY3NyAtMzYuNTIwNyw3Mi45NjYgLTMxLjcwODgsNzYuODQwMiAtMjMuODk4Miw3Ny4zNjUxIC0xNS44MTcyLDc3LjUwMzggLTYuNzY3OCw3Ny43MjY5IDMuMjE4OCw3Ny45OTU4IDEzLjYzOTIsNzguNDU0NSAyMi42ODg2LDc4Ljk0NCAzMC40NjIxLDc5LjE1MjIgMzcuODExNCw3OS4wOTM5IDM5LjMzOTUsNzUuOTY0OCAzNy4xNjUzLDY4LjczMDYgMzYuNTkwOSw2MS4wODExIDM2LjU1MjQsNTQuNzEyMiAzNi44MDE3LDUxLjgwNjggQTkuNDU4OCw5LjQ1ODggMCAwIDEgNTUuNjM3MSw1My41Njk0IFQ1NS41MjU2LDU2LjcwNjQgNTUuNjcxMSw2My4zMTMgNTYuMDA0Nyw3MC45ODA3IDU2LjA5NTIsNzguODg0MyA1NS41Nzg2LDg2LjA5NCA1MS40NzI5LDkxLjk3NyA0NC41NzYzLDk1LjYxMDEgMzcuNzIwNSw5Ni43NDg4IDMwLjAwNDgsOTYuNTAxMSAyMS45MDYxLDk2LjE4MjYgMTMuMDk0NSw5NS44Nzg0IDMuMTA0Miw5NS44NDc4IC02Ljc2NzksOTYuMDQ5MiAtMTUuODE3Nyw5Ni4yNzIxIC0yNC44MjE3LDk2LjQxMDMgLTMzLjIwNDEsOTYuMzUxNCAtNDAuNDA1NSw5NS40MTMxIC00Ny4xODk1LDkyLjA5MyAtNTEuNzk4Miw4Ni4zNDcgLTU0LjAyNjksNzkuMzQzMiAtNTUuNzAwMiw3MS42MTkzIC01Ny4wNjcsNjQuMjI1NSAtNTcuODA0Niw1Ny4zNzQ5IC01Ny45NjMyLDQ5LjgzODIgLTU3Ljg0NjUsNDEuMTA2MSAtNTcuNDczNSwzMS43MDggLTU2LjkxMTUsMjIuMzg5MSAtNTYuNjQwOSwxMy43MDQyIC01Ni43MDU2LDUuNzg5OSAtNTUuMDc0OCwtMS4xMDcgLTQ5LjAzMzIsLTUuNjM2NiAtNDAuNzk0MywtNy41MjY5IC0zMy4xODU3LC04LjEwMDIgLTI1LjcwNzEsLTguMjE2NSAtMTguNTI3OSwtOC4xNzczIC0xMC42NTM5LC04LjE1NSAtMy4xNDM1LC04LjI3MzMgLTAuMDg1OSwtOC4zNzI5IEE4LjM3MzQsOC4zNzM0IDAgMCAxIDAuMDg1OSw4LjM3MjkgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48L3N2Zz4=",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMy4zNTYiIGhlaWdodD0iMjkuMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgdmlld0JveD0iNjk5LjgwNiA1MjYuMTg5IDMzLjM1NiAyOS4zIj4KICA8cGF0aCBmaWxsPSIjMWQxZDFkIiBkPSJtNzA0Ljc2MyA1MzIuNzQtLjA0IDEuMDE0LS4wMzQgMi4yNzMuMDQyIDIuMiAxLjA4MiAxLjA5OCAyLjI0NC0uMTM1IDEuMTk3LS4yOWEyLjM2NyAyLjM2NyAwIDAgMSAxLjE4IDQuNTg1bC0xLjMyLjM1OS0yLjQzOC41MzYtMi40NjMuMTIzLTIuMjMzLS44MTEtMS4xOTMtMS42NS0uNDM3LTEuODgxLS4wOTUtMS45MzMuMDQyLTIuMjAxLS4wMzUtMi4yNzMtLjA0LTEuMDE0YTIuMjcgMi4yNyAwIDAgMSA0LjU0MSAwIi8+CiAgPHBhdGggZmlsbD0iIzFkMWQxZCIgZD0ibTcwMi42MzUgNTM3Ljg1Ni4yMzctLjY5LjYyNS0xLjY4MS45NDYtMS44OTQgMS41ODMtMS44MDMgMS43OTctMS40MzggMS43ODQtMS4wOCAyLjE0OC0xLjAyOSAyLjQ3Mi0uODY1IDIuNjkxLS41NDIgMi40NjYtLjIwNyAyLjQ5NS0uMDU1IDIuNDY3LjIzNyAyLjE2OC43OTIgMi4wMjEgMS4yMzIgMS42MTEgMS4zMzggMS4zOTIgMS44MzcgMS4wMDMgMi4zOC4zMjUgMi41MjYtLjAyIDMuMDg2LS4xOTcgMy40NzEtLjQ0MSAzLjAzLS44NTYgMi40NzctMS4yODYgMS44MDctMS42MSAxLjA0NS0yLjQxLjk2NC0yLjQxNy44NTYtMi4xNjYuNzY3LTIuNzQ5LjUzOC0xLjQ2Ny4wNjdhMi4yMzcgMi4yMzcgMCAwIDEgLjAwNy00LjQ3NWwuNzcyLjA3IDEuOTc0LS4zODYgMi4wNzYtLjgxMiAyLjIyLS45MTUgMi4zMS0xLjI2NiAxLjE5Ni0xLjYxNS4yOTQtMi4zODQtLjAwNC0zLjIxNC0uMTI0LTMuMTM4LS41MjYtMi4zMDUtMS4zNTQtMS42MTYtMS43MzUtMS4xNDUtMS44My0uNTA5LTEuOTE2LS4wNi0xLjk1Ni4wOC0xLjk5NC4yNTYtMS45OC41NjctMS44OTQuODA1LTEuOTI2IDEuMDgyLTEuODM2IDEuMzIxLTEuMjMgMS41OTctLjY1NCAxLjYyMi0uMjIzLjY5NmEyLjI1NCAyLjI1NCAwIDAgMS00LjI4LTEuNDIyIi8+Cjwvc3ZnPg==",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMTc1LjU1ODg0MzM2Mjg5OTc1IiBoZWlnaHQ9IjE3OC43OTA2NDIyNTM0MDMxOCIgdmlld0JveD0iMTYyNS45NDkwODgxODM1NzYxIDQ4NS4xODkxMDg5NjE1MDg2IDE3NS41NTg4NDMzNjI4OTk3NSAxNzguNzkwNjQyMjUzNDAzMTgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDsiPjxkZWZzLz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxNzIwLjA2MzEsIDU1My44OTQ5KSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTS0wLjIxMzgsOC40MDYyIFQtMy42MTM5LDguMzU0OSAtMTEuMDU4Miw4LjM4MjMgLTE3LjQ4MjIsMTEuMjY2NyAtMjEuNjE1LDE3LjIzNDEgLTI0LjUyMTksMjMuODAxOSAtMjYuMDQ2MywzMC45MzEgLTI1LjA2NDEsMzguMjMyNCAtMjAuMzc4Miw0My44OTA5IC0xMy4wMzQ1LDQ3LjExOTIgLTUuMjUyMiw0OC4xNjc3IDEuNDg4OSw0Ni4zMDg5IDcuMjQ4OCw0Mi4yMzk5IDExLjMzMTMsMzYuNTgwNyAxMi45ODYsMjkuNjIyOSAxMS40OTExLDIyLjc0NiA3LjI3NDMsMTYuOTg4NyAxLjcxNTcsMTIuNzc1NiAtNC4xMzQ3LDkuODQyOSAtNi43ODU1LDguNjM0MSBBOS43MjIsOS43MjIgMCAwIDEgLTAuMzUzLC05LjcxNSBUMy42ODY0LC03Ljg4ODcgMTAuOTMzNywtNC40OTQ0IDE3LjE3NzEsLTAuMTk4MiAyMi41OTQ1LDUuMjM1NCAyNy4yMTcyLDExLjM4MDIgMzAuODA2NSwxOC42Njg2IDMyLjE3MSwyNi44ODE1IDMxLjUyODUsMzQuODU3NyAyOS41MzE1LDQyLjIyOCAyNi4yMjI2LDQ5LjEwOCAyMS42MTUzLDU0LjY0NDggMTUuOTYzOCw1OS4yMzA5IDkuNDQyMSw2My4yOTk0IDIuMDEyLDY2LjEzOSAtNS44ODc0LDY2LjkyNDcgLTEzLjcyOTQsNjYuMDE0IC0yMS4zNDAzLDYzLjg3OCAtMjguODg2Niw2MC4yNjg5IC0zNi4wNTg1LDU0Ljc1NzMgLTQxLjUyNjgsNDcuMDgyNiAtNDQuMDIwMSwzOC4yMzIxIC00My45OTQ3LDI5LjY3OCAtNDIuMTcxMiwyMC43NjgxIC0zOS4yMzA3LDEyLjYxNjggLTM1Ljc1MzgsNi4yMjYyIC0zMS41MDEyLDAuNDkwNSAtMjUuNjYyMSwtNC43NzEzIC0xOC44MTEyLC04LjExOTYgLTExLjA2MTUsLTguNzY4MyAtMy4yMTIsLTguNTI4NSAwLjIxMzgsLTguNDA2MiBBOC40MDg5LDguNDA4OSAwIDAgMSAtMC4yMTM4LDguNDA2MiBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDE3NTEuODMsIDUyOC4wMjM0KSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTTAsOC42MDA3IFQtMi4zNDY3LDguNTc4NiAtOS4xMTA2LDguNjA2MiAtMTYuOTUyNCw4LjY4MiAtMjQuNzI1MSw2LjAxNDcgLTMwLjAwMTgsLTAuMzk1MiAtMzAuODcwNiwtNy44NDc0IC0zMC45MDkzLC0xNS4wNjcgLTMzLjgyODksLTIwLjc5NDkgLTQwLjA2MzgsLTIzLjI3NDYgLTQ2LjU3ODYsLTIxLjk1NTQgLTUyLjc4NTgsLTE4LjIzNDEgLTU4LjI5NTUsLTEyLjg4MTUgLTYxLjk0NDYsLTYuNDQ5OSAtNjMuMTk3OCwwLjM2MzEgLTYzLjc5MjEsNy44NTUyIC02NS43NDAxLDE1LjA2MDYgLTY5Ljk3ODgsMjAuNzg5NyAtNzYuMzAwMiwyNC4xOCAtODMuNDMzMiwyNi4zMjM3IC05MS4yMDAyLDI4LjY1ODggLTk4Ljg1ODcsMzAuNTA2MSAtMTA1Ljc1MjEsMzIuMDcxMyAtMTA3LjI2MDksMjkuOTIyNiAtMTA1LjM1MjQsMzAuMzcxOSAtMTAyLjA4MjcsMzUuMjU1NSAtOTUuNzc5NiwzOC41OTAyIC05MC40OTI0LDQzLjkwNDQgLTg3LjM5OTUsNTAuNzUxIC04NS45MTExLDU3Ljk1NDcgLTg1LjkwNjksNjUuNTk5OCAtODkuMDQwOSw3MS45OTI1IC05NC43NTc4LDc1Ljk4OTMgLTEwMC40ODc1LDc5LjcxNzEgLTEwNC42MTU1LDg1LjQ4NDIgLTEwNi4xNDU2LDkyLjc0OTggLTEwMy4xNzUyLDk4LjE2NCAtOTYuNjEyNywxMDAuMTE5MiAtODkuNDkwNSw5OS4xMzQ1IC04Mi41MjgxLDk2LjIwMTMgLTc1LjM2NjgsOTMuMTMzNiAtNjcuOTg3NSw5MS4yMzY1IC02MC41MzgxLDkxLjEzNSAtNTMuMTE1LDkyLjY0ODggLTQ2LjQ0MjUsOTUuMzIzNyAtNDAuNzc4NCw5OS40NjY3IC0zNi40NTc2LDEwNS4xODM3IC0zMi40MDY5LDExMC45MDk5IC0yNy4wMSwxMTEuNzkwNyAtMjEuMzI1NSwxMDcuODEyMiAtMTguNDY2NiwxMDEuMzQzNyAtMTYuNDgxMyw5My4zODE1IC0xMS41MTczLDg2Ljc5NTcgLTQuNjUxMSw4My4wNjAxIDIuNTMzOSw4Mi4wOTUgOS41NjA3LDgyLjI5OTUgMTYuODI1NCw4My44NzMxIDIzLjQ1NDEsODIuNjI0MSAyNy45NzI2LDc3LjA3OTkgMjcuNDY4NSw3MS4zMDExIDIyLjA2NDIsNjcuMjAyNiAxNS43NTExLDY0LjM2MTkgMTAuNjQxLDU5LjY5MzEgOC4zNDA4LDUzLjA5NzMgOC40NzgxLDQ2LjAyNzcgMTAuMTU3NywzOC45NDgzIDEzLjI4MDUsMzIuNTQ5IDE3LjU4OTQsMjYuOTQwOSAyNC4yNjcxLDE5Ljc5ODUgMjguNDc5MiwxNS4zMzEyIEE5Ljc2MDcsOS43NjA3IDAgMCAxIDQzLjA2NzMsMjguMzAzMiBUMzkuNDMwNiwzMi4zNzgxIDMzLjIyNDQsMzkuMTQ1OSAyOC42NzYxLDQ0LjY3NTYgMzAuMTk4MSw0OS4wMDAxIDM2LjgyODIsNTIuODIxIDQyLjQxMjYsNTcuNzMwNyA0Ni44MzA2LDY0LjA2NzggNDguOTEwOSw3MS44Mjg1IDQ4LjIwOTIsNzkuMjA2NCA0NS42Mzc2LDg1Ljc2NCA0MS45MTQyLDkyLjE2MzkgMzcuODQyLDk4LjI3MDUgMzMuMDAxNCwxMDMuNTY3MyAyNi41NzI1LDEwNi4zMjc0IDE5LjQzNDEsMTA1LjYzNzUgMTIuMjYxOSwxMDMuMjEwMSA0Ljc2NSwxMDEuODk1OCAwLjgxOTcsMTA1LjQ0MzcgLTAuNDYyNCwxMTIuMTg4MyAtMy45MzExLDExOC4zNTcxIC05LjI1MjUsMTIzLjY0NjkgLTE1LjE0NTMsMTI4LjEzMTEgLTIxLjI5MjYsMTMyLjIxMzMgLTI4LjQyMDUsMTM1LjAyNjMgLTM1LjUyNjEsMTM0LjQyNzkgLTQxLjMwODYsMTMwLjMzMjcgLTQ2LjE1ODMsMTI1LjEwMjkgLTUwLjU3MDIsMTE5LjM5OTIgLTU1LjQ2NTYsMTEzLjgwMjYgLTYxLjg0MzUsMTEwLjc2MTIgLTY4LjczMzIsMTExLjM5OTIgLTc1LjA3NDEsMTE0LjE0MzkgLTgxLjk5OTQsMTE3LjE1MjUgLTg5LjcxNDIsMTE5LjMwNjQgLTk3LjU4ODIsMTE5Ljc1OTUgLTEwNS44MDQ4LDExOC4yNjYxIC0xMTMuMjYxNywxMTUuMzEyMiAtMTE5LjA2ODEsMTExLjE3MDUgLTEyMy4xNDgsMTA1LjQ2OTQgLTEyNS4xODczLDk4LjIyMTYgLTEyNS42Nzg3LDkwLjY0MyAtMTI1LjE2MDIsODMuMjUzMiAtMTIyLjk1MTIsNzYuMiAtMTE4Ljg2NTcsNzAuMzc0OCAtMTEzLjk1NDksNjUuNDQ5NiAtMTA4LjU1MzYsNjAuNjczMiAtMTA4LjQwMzMsNTUuODYwNiAtMTE0LjMwMzIsNTIuMTYzMiAtMTE5Ljg3NzMsNDguMDY4NyAtMTIzLjMwODIsNDEuNjExMyAtMTI0LjYzNjQsMzQuMjkzNSAtMTI0LjczMjMsMjcuMTczNyAtMTIxLjkyMDEsMjAuMTIzIC0xMTYuMTQ4MiwxNS4yMzM5IC0xMDkuNTE1MSwxMy4wNzMxIC0xMDIuMTQyLDExLjQzMTQgLTk0LjcyNjQsOS41MjMgLTg3LjMzNDgsOC4xNjk4IC04Mi45NzY3LDQuMjIxNiAtODIuMzc5OCwtMi45MzExIC04MS4yOTg5LC05Ljg4NDQgLTc4LjQzNzIsLTE2LjkxNTEgLTc0LjU5OTcsLTIzLjM1NDIgLTY5Ljg2MzYsLTI4LjgyNzQgLTY0LjI5MTUsLTMzLjM2MjIgLTU4LjU3NzksLTM3LjEyMjYgLTUxLjY1MjksLTQwLjQzNTQgLTQzLjg0MTUsLTQyLjEwNTYgLTM2LjE5NzcsLTQxLjc0MDMgLTI4LjU4MzgsLTM5LjU5MDYgLTIxLjcxMjQsLTM1LjM2MzEgLTE2LjI4MTcsLTI5LjI2NzkgLTEzLjAxMDIsLTIwLjk4MDggLTEyLjc5NzksLTEyLjQxNjggLTkuMTEwNiwtOC42MDYyIC0yLjM0NjcsLTguNTc4NiAwLC04LjYwMDcgQTguNjAwNyw4LjYwMDcgMCAwIDEgMCw4LjYwMDcgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxNzg3LjYsIDU0OS44NCkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0tNy4xMzk2LC01LjI4MTEgVC01LjczMjksLTcuMjUxNCAtNy44NDcxLC05LjkxNDYgLTE0Ljk3MTUsLTExLjAwMjYgLTIyLjIzMDksLTExLjU0MTMgLTI5LjMwNTcsLTExLjgzOTggLTM1LjkyNzEsLTEyLjQ4NDQgLTM5LjEyOTIsLTEyLjk3NDEgQTkuNjM1NSw5LjYzNTUgMCAwIDEgLTM2LjEwNDIsLTMyLjAwNjIgVC0zMC45NzE1LC0zMS40Mzg1IC0yMi4zNzM3LC0zMC42OTg2IC0xNS4wMiwtMzAuMTM2MSAtNy41NDQ4LC0yOC44NTIzIC0wLjgxNjYsLTI2LjQxMTIgNS4xNjU1LC0yMS44NTYzIDkuNjA1NCwtMTUuODAzNyAxMi4wOTAyLC05LjE0NjggMTEuNTg0OSwtMi4xMjMyIDguNjY2OCwzLjI4NTIgNy4xMzk2LDUuMjgxMSBBOC44ODA1LDguODgwNSAwIDAgMSAtNy4xMzk2LC01LjI4MTEgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48L3N2Zz4=",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iODcuNDQwODQzODc3ODY2NTgiIGhlaWdodD0iODYuMzg4NzYwMTEyNDIwOTgiIHZpZXdCb3g9IjEzMzguODYwOTczNDg2NDE5NCA1MzguODA3MjMxMjc1Njc0NCA4Ny40NDA4NDM4Nzc4NjY1OCA4Ni4zODg3NjAxMTI0MjA5OCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50OyI+PGRlZnMvPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDEzOTQuNTIyLCA1NjguMDk1NikiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0tMS42OTYyLDIuOTI1OCBULTIuNzQyOCwyLjI5MzQgLTUuMjEzOCwxLjA3NTEgLTguMjgwNCwwLjI0OTMgLTExLjU2NTIsMC4wMDM3IC0xNC43NjQ1LDAuNjI1MyAtMTcuNDU4NiwyLjU5MDMgLTE5LjMzNTksNS4xOTA4IC0yMC42ODMyLDcuODAxNyAtMjEuODExOSwxMC43MjY3IC0yMi43MDY2LDEzLjg4NTIgLTIzLjI2MDQsMTcuMzM3IC0yMy40MjQzLDIwLjc4OTQgLTIyLjU0NTQsMjMuNjUzNyAtMjAuMjQzMSwyNS45NTY3IC0xNy40NDMxLDI3LjUxNjUgLTE0LjcwMTUsMjguMjYwNyAtMTEuNjU2NCwyOC41MTA3IC04LjQ0MjYsMjcuOTAwNSAtNS44NTI3LDI2LjIzMjcgLTMuOTE5NSwyMy42OTczIC0yLjQzODcsMjAuODI0MSAtMS40MzU2LDE3LjkzOCAtMC44NDYsMTQuOTQ4IC0wLjY2LDEyLjA2NzggLTEuMDYwMyw5LjIwNzEgLTIuMDc0Myw2LjQ4OTEgLTMuNjM0MSw0LjA5MTIgLTUuMzAxOCwyLjYxMjQgLTYuMDExMiwyLjI0ODUgQTMuODg3OSwzLjg4NzkgMCAwIDEgLTIuNjI4MywtNC43NTMgVC0wLjk0OTMsLTMuNzMxOSAxLjc0OCwtMS42MDY3IDMuNjA0NywwLjgzNTcgNS4xMDQ1LDMuNjkyOCA2LjE3ODUsNi41NzE1IDYuODAzNSw5LjY5MTQgNi45NjIxLDEzLjA5MzIgNi42NjUxLDE2LjMzODcgNS45ODEzLDE5LjU0MjMgNC44MTY3LDIyLjkxNDMgMy4zNzgxLDI2LjA1OTEgMS42NTk2LDI4Ljg1OTEgLTAuNTU5NCwzMS40NTg0IC0zLjM1OTIsMzMuNjU4NyAtNi44MjIxLDM1LjIyOTMgLTEwLjYzODIsMzUuNzc3NyAtMTQuMDIzOCwzNS42Njk3IC0xNi44ODQ2LDM1LjI0NjggLTE5LjcyNzYsMzQuMzkxNCAtMjIuNTcyMywzMy4wMzMzIC0yNS40NDMxLDMxLjA3MzMgLTI3LjkzOTcsMjguNjI5OSAtMjkuNjEzMiwyNS44MTg4IC0zMC4zNzcxLDIyLjIwMTkgLTMwLjMzNDQsMTguMDU1OCAtMjkuODM4NywxNC4wNzc2IC0yOC45NzY3LDEwLjI0MyAtMjcuNzQ1LDYuNTIxMSAtMjYuMjA1NywzLjA2NCAtMjQuMTMxMywtMC4zOTI5IC0yMS41NzEsLTMuNDU2NiAtMTguODc5OCwtNS40NDY5IC0xNi4xMTMxLC02LjUyODUgLTEyLjY2ODksLTYuODc2MyAtOS4yNDEzLC02Ljc1NTIgLTYuMTA4LC02LjIxOTEgLTIuNDA0OSwtNC45NjU1IDAuNjI2OCwtMy41MjAxIDEuNjk2MiwtMi45MjU4IEEzLjM4MiwzLjM4MiAwIDAgMSAtMS42OTYyLDIuOTI1OCBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDEzNTkuOTcxOSwgNTU1LjQ5NDkpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNMCwzLjUxMjYgVC0xLjA1MzQsMy40OTcgLTMuNTg1MSwzLjQ4OTggLTYuNTc4LDMuNTM0NiAtNy40ODgyLDUuMTI0OCAtNi43NDE0LDguMTY5NyAtNi4yMzA2LDExLjE1NTEgLTQuMTYzMSwxMy43MTQxIC0yLjQ2NDEsMTQuNzc4OCBBMy44NzM0LDMuODczNCAwIDAgMSAtMy45NTU0LDIyLjM4MDggVC02LjQ4ODUsMjEuNTAyMiAtMTAuMzE5NSwxOS4yNDYzIC0xMi4zNjY3LDE2LjM2MjcgLTEzLjQ5NjIsMTMuMzU1IC0xNC4xMDM2LDEwLjIxNjEgLTE0LjM2NTYsNi45OTEzIC0xNC4zNTgxLDMuODcyNyAtMTQuMDQzMSwwLjkzNzQgLTEyLjY3NiwtMS42OTggLTkuODM3MiwtMy4yNTAzIC02LjU3OCwtMy41MzQ2IC0zLjU4NTEsLTMuNDg5OCAtMS4wNTM0LC0zLjQ5NyAwLC0zLjUxMjYgQTMuNTEyNiwzLjUxMjYgMCAwIDEgMCwzLjUxMjYgWk0tMi44NSwyMi40MzY1IFQtMy41NTY2LDIyLjQ4MzYgLTUuNzk1LDIzLjE4NzEgLTkuMDUxMSwyNC43ODU5IC0xMi4xMzU5LDI2LjY1NzYgLTEyLjcwODgsMjkuMzk3NyAtMTEuMTEzMywzMi45NDE3IC05LjM2MzIsMzYuMTA3NiAtNy4xNzk3LDM4LjQ3NzggLTQuMzM5MSwzOS44NTQ3IC0xLjczODYsNDAuMTY4NSAtMC43Mzc0LDQwLjA0MzEgQTMuODM0NCwzLjgzNDQgMCAwIDEgMS42Njk1LDQ3LjMyNDQgVC0wLjAwMTUsNDcuNjkxNyAtMy4zMzQ4LDQ3LjgwMDMgLTYuNTQ1NSw0Ny4wODMgLTkuNDUxMiw0NS45NTk2IC0xMi4wNzUyLDQ0LjI5MDUgLTE0LjMzNDgsNDIuMDk2MiAtMTYuMTkxMiwzOS41MzY5IC0xNy43MzkzLDM2LjgyNjQgLTE5LjA4NDEsMzMuOTkyNyAtMjAuMjU3OCwzMC45MzY1IC0yMC45MjQ5LDI3Ljg0OTIgLTIwLjU0NDQsMjQuODUzNSAtMTguNzUxNywyMi4xNzk1IC0xNi4xMTA2LDIwLjA2MDggLTEzLjMxOTYsMTguMjg4NyAtMTAuNTM0NiwxNi43MjM1IC03Ljc3NzgsMTUuNTE5IC00Ljk4MzcsMTQuODczOCAtMy41Njk0LDE0LjcyMzEgQTMuODczNCwzLjg3MzQgMCAwIDEgLTIuODUsMjIuNDM2NSBaTTQuMjE0Nyw0NC40OTAzIFQ0LjA1MDUsNDUuMjMxMSAzLjg2NjEsNDcuNjEwMiAzLjg1Myw1MS4wNzgxIDQuMTEzOCw1NC4zNzU0IDUuMDE5LDU3LjIwMTQgNi45NDM3LDU5LjMwMTMgOS45MDQ3LDYwLjEzMDQgMTIuNDM3NSw1OC41MTk2IDE0LjQ3NTIsNTUuNTY5OSAxNy4yMjg1LDU0LjM5MzYgMTkuOTA1Myw1NS40ODkxIDIyLjExODMsNTcuNzIyNyAyNC41MjQyLDU5Ljg3OTQgMjcuMTQ1Niw2MS4zNjA0IDI5Ljk1MDUsNjEuMTg1OCAzMi42NTMxLDU5Ljc1ODcgMzQuNzA4NSw1Ny43NzE1IDM1LjcwNzIsNTQuODM1IDM1Ljg3OTksNTIuMTA3NCAzNS44OTksNTEuMDQ0IEEzLjk0MDksMy45NDA5IDAgMCAxIDQzLjc3NzcsNTEuMjYzIFQ0My43MDY2LDUyLjg0ODIgNDMuNDc2NSw1Ni4wNzgxIDQyLjk3MTIsNTkuMjI1NSA0MS44MTY4LDYyLjAyNDQgMzkuODUxMiw2NC4yODE4IDM3LjM2MzQsNjYuMDcyIDM0LjU4MDEsNjcuNzMxMSAzMS44MjE3LDY5LjA3NjkgMjguNjE5Nyw2OS41Njg5IDI1LjMxMTMsNjkuMDc5NSAyMi40ODE4LDY3LjgzOTggMTkuODg5OCw2Ni4yMjM4IDE3LjU4MTcsNjQuMzQ0IDE1LjQ2ODcsNjIuMDYyNCAxNi40MTg2LDYxLjI0MDQgMTkuNTExLDYwLjcwODUgMjAuMzExNiw2MS4yNzE1IDE5LjA1MTQsNjQuMTE4NiAxNi43OTY2LDY2LjI1MDQgMTMuNjU5Nyw2Ny40NTUgMTAuMTc3Nyw2Ny44MTkzIDYuNzM5Nyw2Ny40MjA2IDMuMjk3Myw2Ni4xMzM0IDAuNDY4Miw2My45OTggLTEuNDg4LDYxLjI2NTEgLTIuODI5Miw1Ny45NDc0IC0zLjU0ODgsNTQuNzA0NSAtMy44MDk4LDUxLjIzOTUgLTMuODM0Niw0Ny4zMDA1IC0zLjU0NjcsNDQuMTI2OSAtMy4yODI2LDQyLjg3NzMgQTMuODM0NCwzLjgzNDQgMCAwIDEgNC4yMTQ3LDQ0LjQ5MDMgWk00MC4yOTksNDcuMjM5NyBUNDEuMzA1Miw0Ny4zNTgxIDQzLjc5NjEsNDcuNDI3NyA0Ni42NDA5LDQ2Ljc5MjEgNDkuMzMwNiw0NS4yMTQ0IDUxLjg0NzQsNDIuOTkwNSA1My45ODY0LDQwLjQwNzkgNTUuNzE2OCwzNy41ODIgNTcuMDUyNiwzNC43NzE2IDU4LjEwNzIsMzEuNTc0MyA1OC42OTQsMjguMTM5MiA1Ny4zODQ4LDI2LjEzNiA1NC4yMjE5LDI1LjY0NDggNTIuNDU3NSwyNS41ODQ5IEEzLjg2MiwzLjg2MiAwIDAgMSA1Mi4wNzgzLDE3Ljg3MDIgVDU0LjA4MDgsMTcuOTE0MyA1Ny40NDEsMTguMzA2OSA2MC4xNjA5LDE5LjE3NzcgNjIuNzI3MywyMC41NTg5IDY0Ljc5MzMsMjIuNjkwOCA2NS44ODcyLDI1Ljc1NDMgNjUuOTA3LDI5LjM5MzMgNjUuMzE5MywzMi43Nzg5IDY0LjM5NTMsMzUuOTIyMyA2My4wNDIxLDM5LjM0NzUgNjEuMTg4Niw0My4wNDg0IDU4Ljk3NTcsNDYuNDgwNCA1Ni4zMjYxLDQ5LjQ2ODUgNTMuMzA5OSw1MS45OTM0IDUwLjE3NzgsNTMuODYzNyA0Ni45OTc3LDU0Ljk5NzcgNDMuNzM3LDU1LjM2NTIgNDAuNzE2NSw1NS4yMjQ5IDM5LjM3NzcsNTUuMDY3NCBBMy45NDA5LDMuOTQwOSAwIDAgMSA0MC4yOTksNDcuMjM5NyBaTTQ4Ljc3ODksMjAuMDcxNiBUNDkuMzY5NSwxOC44MTYzIDUwLjczNSwxNS44NTUxIDUyLjA2NDgsMTIuNDQ0MiA1Mi44OTE2LDkuMzMwMSA1Mi4yNDUzLDYuNTg4MyA1MC4wODQyLDQuMzIwMSA0Ni45MTE4LDQuMjgyOSA0NC45ODIyLDUuMTgxMyBBMy45NjMxLDMuOTYzMSAwIDAgMSAzOS4yMzc1LC0wLjI3OTYgVDQwLjI5NTQsLTEuNDQzIDQyLjYzMDksLTMuNSA0Ni4xMzg1LC00LjU5MjEgNDkuNzk3MSwtNC40MzU2IDUyLjc2NywtMy4yMzk3IDU1LjY5OSwtMS4xODkgNTguMTUzOSwxLjM1NzQgNjAuMDIzMiw0LjM4NDUgNjAuODIyNyw3LjU4NzkgNjAuNTE4NCwxMC42MDczIDU5LjgwODksMTMuNDkgNTguODE5NCwxNi40NzY0IDU3LjUyMDgsMTkuNjQ2NCA1Ni4yNzg4LDIyLjI5NDkgNTUuNzU2OSwyMy4zODM1IEEzLjg2MiwzLjg2MiAwIDAgMSA0OC43Nzg5LDIwLjA3MTYgWk0zOC4xNTEyLDIuNjM3NSBUMzguMDkxMSwxLjQ1NTYgMzcuMzYwNCwtMS4wMzg1IDM1Ljg3OTksLTMuNDk0NiAzMy45NjMxLC01LjkxNjkgMzEuNjA1OSwtNy45MzY4IDI4Ljg4OTEsLTguNzg3NCAyNy4zNTczLC03LjMwODUgMjYuNTM1NywtNC4wODQ0IDI1Ljc3OTYsLTIuNDQ4MiBBMy45NjYzLDMuOTY2MyAwIDAgMSAxOC42NjMxLC01Ljk1MjQgVDE5LjEzMzMsLTYuODc5NCAyMC4xMjgsLTkuMjMgMjEuMDU0MiwtMTIuMDE0NSAyMi40NDE5LC0xNC41MzAzIDI0Ljg2MTcsLTE2LjE5ODggMjguMDA4MywtMTYuNjgyNiAzMS4xNDg3LC0xNi40MTMgMzQuMDAxLC0xNS41NDczIDM2Ljg3NTQsLTEzLjg3MTMgMzkuNTM3MywtMTEuNTIyNiA0MS42NTM5LC05LjAzNDYgNDMuNTA5MSwtNi40ODg4IDQ1LjEwNDksLTMuODM5OSA0NS44NjY0LC0xLjE0NDcgNDYuMDI1NiwxLjI2MTEgNDYuMDY4NSwyLjI2NDEgQTMuOTYzMSwzLjk2MzEgMCAwIDEgMzguMTUxMiwyLjYzNzUgWk0yMS43NjYxLC0wLjI2MDIgVDIxLjc0NjYsLTAuMjYyMyAyMS43MjcsLTAuMjY0MyBBMy45NjY3LDMuOTY2NyAwIDAgMSAyMi42Mzc2LC04LjE0NTMgVDIyLjY1NzEsLTguMTQyOCAyMi42NzY2LC04LjE0MDMgQTMuOTY2MywzLjk2NjMgMCAwIDEgMjEuNzY2MSwtMC4yNjAyIFpNMTguMjg0OSwtMy40NjYyIFQxOC4xMDc4LC00LjQyMjkgMTYuNDY0NywtNS45NzE0IDEzLjM3NDMsLTYuNTc2NCAxMC4zMTIsLTYuNTI5NiA5LjgxMzcsLTcuNTIyNiAxMC4zNjUyLC03LjEwMDQgOS4yODU5LC00LjM3ODMgNy42MDkyLC0xLjg3MTMgNi4zNzg5LDAuMjc3NCA2LjEzMzksMS4xNjYzIEE0LjAxNjUsNC4wMTY1IDAgMCAxIC0xLjEwMDQsLTIuMzI1NyBULTAuNjQzNCwtMy4zNTg2IDAuNzE0MywtNS43NTU2IDIuMjQ4NywtOC41MjA1IDMuNDk1MSwtMTEuMjYxNyA1LjUzMTEsLTEzLjQwMyA4LjM2NjksLTE0LjM2MjIgMTEuNDc2OCwtMTQuNTM0NSAxNC44NDkyLC0xNC41MzIyIDE4LjAxNDksLTE0LjI3MjYgMjAuOTI2NSwtMTMuMjgzMyAyMy4zODEsLTExLjM3MzcgMjQuOTkzLC04Ljg5NDggMjUuODI1NywtNi4yNjE0IDI2LjA3OTcsLTQuOTQzNCBBMy45NjY3LDMuOTY2NyAwIDAgMSAxOC4yODQ5LC0zLjQ2NjIgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxMzYyLjQ5LCA1NTQuOTEpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNIDAgMCBtIC0yLjEyMTMyMDM0MzU1OTY0MjQsIDAgYSAyLjEyMTMyMDM0MzU1OTY0MjQsMi4xMjEzMjAzNDM1NTk2NDI0IDAgMSwxIDQuMjQyNjQwNjg3MTE5Mjg1LDAgYSAyLjEyMTMyMDM0MzU1OTY0MjQsMi4xMjEzMjAzNDM1NTk2NDI0IDAgMSwxIC00LjI0MjY0MDY4NzExOTI4NSwwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjwvc3ZnPg==",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMTM5LjcwNDQ5MjU1MDI5MjIzIiBoZWlnaHQ9IjE2My42NDI4NTcwMTQzNzY3NyIgdmlld0JveD0iMTAyOS4xNDM2MzEyNDgzNjMxIDUyNy4yODI0OTY0OTA1MjE3IDEzOS43MDQ0OTI1NTAyOTIyMyAxNjMuNjQyODU3MDE0Mzc2NzciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDsiPjxkZWZzLz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxMTAxLjM4NjksIDU5Ny41ODUzKSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTS0wLjc1MzgsOC4zMDY3IFQtMy45NTYxLDguMDYgLTEwLjc3MDUsNy43ODcyIC0xOC40Njk3LDcuNzk1OCAtMjUuOTY5NCw3LjgzOTkgLTMzLjQwODksOC42MDMgLTQxLjA2OTMsMTAuOTA4NCAtNDUuODI3MywxNS43MDQgLTQ3LjM0MjEsMjIuMzY5OCAtNDguNTA2NSwyOS41MDYgLTQ5Ljg3NjMsMzYuNjA3NiAtNTEuMTkxNCw0NS4wMTYgLTUyLjQ4MjgsNTQuNTQ3MSAtNTMuMTU0Miw2Mi45NzU4IC00OS4zNTE1LDY5LjI0NjEgLTQxLjM3ODIsNzIuNDE4IC0zMy40NjUyLDczLjYxNjcgLTI1LjI3OTIsNzQuMTA3IC0xNy40NDEsNzQuMTkgLTExLjY5ODYsNzEuMjExNSAtOC40NzUsNjQuMDk2NiAtNy40OTk0LDU5LjkzMSBBOS40ODAyLDkuNDgwMiAwIDAgMSAxMS40NjEsNTkuOTUzOSBUMTEuNDQyNyw2My41Mjk1IDEwLjQwNDcsNzAuNjI1NyA3LjM0NjcsNzYuOTg1MSAyLjk5OSw4Mi44MjQ0IC0yLjgwNzcsODguMjYxMyAtOS43NTMzLDkxLjYxMTEgLTE3LjE3OTYsOTIuNTQ4MSAtMjUuOTExNiw5Mi40ODYxIC0zNS41NTI2LDkxLjk0MTEgLTQzLjgwNzgsOTAuODkwMiAtNTEuNDQ2Niw4OS4xNTE3IC01OS40ODA4LDg2LjYyODMgLTY2LjI4ODIsODIuNDI1NyAtNzAuMzkwNiw3Ni4zMjcxIC03MS4zOTMsNjguOTcyMyAtNzEuMTUxOSw2MS4yMjU0IC03MC4zNDc3LDUyLjUyMDcgLTY5LjI2NjcsNDQuMDgzIC02OC4zMDg4LDM3LjEyIC02Ni44NzYxLDI4LjM2ODggLTY1LjQ2MDcsMTkuMzAxNiAtNjQuMjU1MSwxMS43MDQ4IC02MS4xODg3LDQuMzk4OSAtNTUuNzQ0NSwtMS4yOTA3IC00OC44NDUxLC00Ljk2NzkgLTQxLjY1NTEsLTcuNDg5OCAtMzMuODE1NywtOS4wMDg0IC0yNS45NDQsLTkuNTY3MSAtMTguMzI1OSwtOS40NzQ1IC05Ljk3ODUsLTkuMTk0NSAtMi41MzM4LC04LjY0OSAwLjc1MzgsLTguMzA2NyBBOC4zNDA4LDguMzQwOCAwIDAgMSAtMC43NTM4LDguMzA2NyBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDEwOTguNzAyNSwgNjIzLjIyMzIpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNMC4wODA2LC04Ljc3MiBUMi45NTU0LC04Ljc2NzkgOS44NzQyLC04LjI3ODEgMTcuNDM0MiwtNy4xMjE0IDI0LjQ3NDYsLTYuNDQ2NiAzMS42MzcsLTYuNjUzNSAzNy41MDg2LC05LjYwMjMgNDAuNzg0NywtMTYuMDI0MyA0My4wNzQ5LC0yMy4xMjQ3IDQ1LjQyMzUsLTI5Ljk1MTggNDcuMzc3NSwtMzYuODkyMyA0OC45OTA0LC00NC4xMTkgNTAuMTY2OCwtNTEuNDAyNyA1MC4yMjAxLC01OC42OTczIDQ3Ljg2MjUsLTY1LjQ2NjcgNDIuNTY3MywtNzAuNzYzOCAzNS43ODQzLC03NC4zNTU5IDI4Ljg4MTMsLTc1Ljk2NjYgMjEuOTM1NCwtNzYuMjI2MyAxNC44NDA0LC03NC42NTQ1IDguODA1NywtNzAuMTM0OSA0LjA2NSwtNjQuNDI0NSAwLjQxNCwtNTcuNDA3NyAtMC45NjExLC01My4xNTkxIEE5Ljg1NjEsOS44NTYxIDAgMCAxIC0xOS44NzI5LC01OC43MTk1IFQtMTguMTkxNCwtNjMuNDg5OCAtMTQuODkwOCwtNzEuMzEwOSAtMTAuODE1NywtNzcuMzQ2NyAtNi4wMDc3LC04My4xMjYzIC0xLjE1MDYsLTg4LjYzMTIgNC42OTQyLC05My4xOTE5IDEyLjE3NywtOTUuNDMzMiAxOS43NDIzLC05NS44MjQxIDI2LjY2OTIsLTk1Ljc4OTggMzQuMTcyOCwtOTUuMDUyNSA0MS40MDUyLC05My4yMjYzIDQ4LjEzNzgsLTkwLjM4MTEgNTQuNTEzMSwtODYuNTY1OCA1OS42ODg0LC04MS45MDAyIDYzLjk3MjksLTc2LjIzOCA2Ny41OTM4LC02OS4zNjA3IDY5LjUzNiwtNjEuNjQ1OCA2OS42NDI4LC01My45NDc3IDY4LjgzMTksLTQ2LjIzNjkgNjcuNDIzMSwtMzguNDQ3NiA2NS41OTY4LC0zMC41NDM0IDYzLjE2OTYsLTIyLjM5NDIgNjAuNTA4OSwtMTQuNDQ3NiA1OC4wNjUxLC03LjA1MzkgNTUuMTk5NCwtMC4yNzcgNTAuOTAyMiw1LjMyOTIgNDQuOTMxNCw5LjI3MiAzOC4wNjQ3LDExLjQ1NzQgMzAuNzczNSwxMi4wNTQ5IDIzLjQ0OCwxMS44NzE0IDE2LjU0OTUsMTEuMDU3MSA5LjMyMjUsOS42MzkxIDIuNjg1LDguODE5NyAtMC4wODA2LDguNzcyIEE4Ljc3MjQsOC43NzI0IDAgMCAxIDAuMDgwNiwtOC43NzIgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48L3N2Zz4=",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iNTEuNDYzODcwMjk3NjAxNzQiIGhlaWdodD0iNTIuMDY4NjQxMjQ2NDQ4ODYiIHZpZXdCb3g9IjExNTkuMTgwNDQ1NTU1MDAzOSA1MjAuMjY2NzE0NTMyNjA3OSA1MS40NjM4NzAyOTc2MDE3NCA1Mi4wNjg2NDEyNDY0NDg4NiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkYXRhLWNvbG9yLW1vZGU9ImxpZ2h0IiBjbGFzcz0idGwtY29udGFpbmVyIHRsLXRoZW1lX19mb3JjZS1zUkdCIHRsLXRoZW1lX19saWdodCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50OyI+PGRlZnMvPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDExNjEuOTE2NywgNTQ0LjcyKSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTTAsLTIuNzM0MiBUMS43MTYxLC0yLjcwNjMgNS4yODkxLC0yLjYzMzggOS4zMjY4LC0yLjQ5MTMgMTMuOTU0LC0yLjMwNCAxOS4wMjgxLC0yLjE0ODQgMjQuMDQ1OSwtMi4wMzM0IDI4LjUxMzgsLTEuOTgyNiAzMi42MTUyLC0xLjk4ODYgMzYuMjIxLC0yLjA2MDggMzkuODk2OCwtMi4yNzM0IDQzLjk5MSwtMi41MzEgNDUuOTkxNCwtMi42NDAzIEEyLjY0MDMsMi42NDAzIDAgMCAxIDQ1Ljk5MTQsMi42NDAzIFQ0My45OTEsMi41MzEgMzkuODk2OCwyLjI3MzQgMzYuMjIxLDIuMDYwOCAzMi42MTUyLDEuOTg4NiAyOC41MTM4LDEuOTgyNiAyNC4wNDU5LDIuMDMzNCAxOS4wMjgxLDIuMTQ4NCAxMy45NTQsMi4zMDQgOS4zMjY4LDIuNDkxMyA1LjI4OTEsMi42MzM4IDEuNzE2MSwyLjcwNjMgMCwyLjczNDIgQTIuNzM0MiwyLjczNDIgMCAwIDEgMCwtMi43MzQyIFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzFkMWQxZCIvPjwvZz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTE4My4yNzI2LCA1MjMuMjI4NCkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0yLjcwNDIsMCBUMi41NzY0LDIuNTY5OCAyLjM1MjMsNy42MDQ2IDIuMTg0NCwxMi43OTE5IDIuMTA1NCwxOC40MDE3IDIuMTI5NCwyMy44MTA0IDIuMjY2NywyOC40ODk4IDIuNTY2NSwzMi40NjI0IDIuOTI0LDM1LjY4MjUgMy4zMDA0LDM5LjM4NSAzLjY0NCw0My44OTYzIDMuNzc0Niw0Ni4xMTA1IEEyLjYzNDcsMi42MzQ3IDAgMCAxIC0xLjQ5NDMsNDYuMTc5OSBULTEuNDY3Nyw0NC45ODA4IC0xLjM1MTEsNDEuNzYwMiAtMS4yMzExLDM3LjE3MDMgLTEuMzA5NiwzMi43MzEzIC0xLjU1NzQsMjguNjQ5OSAtMS44MDYzLDIzLjg5NTYgLTIuMDE0MiwxOC40MzMyIC0yLjE4NDQsMTIuNzkxOSAtMi4zNTIzLDcuNjA0NiAtMi41NzY0LDIuNTY5OCAtMi43MDQyLDAgQTIuNzA0MiwyLjcwNDIgMCAwIDEgMi43MDQyLDAgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48L3N2Zz4=",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iNDYuMTU2NTE1OTgxODI3NTQiIGhlaWdodD0iNDQuMDY1ODg1NzAzOTc3MzQ0IiB2aWV3Qm94PSIxMDYzLjgxMzU2NzY0ODYzMzQgNDg2LjI4NDg0ODM3MDk3MzIgNDYuMTU2NTE1OTgxODI3NTQgNDQuMDY1ODg1NzAzOTc3MzQ0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7Ij48ZGVmcy8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTA3MC42MDQ1LCA1MTcuNDgzNCkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0xLjg2ODQsLTIuOTQ2NyBUMi43MjE3LC0yLjM5MiA1LjAyMTUsLTAuOTQzNSA4LjA5NzUsMC45OTk3IDExLjA2ODgsMi45NTU3IDEzLjY5OSw0LjU4NDEgMTYuNDI2NCw0LjAwMjcgMTkuNzc4OSwxLjc1OTUgMjMuNDU0NywwLjAwMDQgMjYuOTY4NiwtMS41ODI3IDMwLjMxOTMsLTMuMDcxNyAzMi41MzU2LC00LjQyNjMgMzMuMTUzMSwtNS4wNTU4IEEzLjU3OTQsMy41Nzk0IDAgMCAxIDM3Ljc2ODYsMC40MTY1IFQzNi4yNTYxLDEuNTgzNCAzMy4xNDM2LDMuNDQ1NCAyOS45NDMxLDQuODcyOSAyNi42Mjc3LDYuNDY2MyAyMy4yNDI1LDguMjM3MSAxOS44NDUzLDEwLjM0OTYgMTYuMDE2NiwxMi4wNjUyIDEyLjQxMzYsMTEuOTczOCA5LjYxNzIsMTAuNTYxOSA2Ljk3MjgsOC43NTY0IDQuMjM3NSw2LjgwOTcgMS4zNTY5LDQuOTM5MSAtMS4wMDI3LDMuNDgyIC0xLjg2ODQsMi45NDY3IEEzLjQ4OTEsMy40ODkxIDAgMCAxIDEuODY4NCwtMi45NDY3IFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzFkMWQxZCIvPjwvZz48L2c+PGcgdHJhbnNmb3JtPSJtYXRyaXgoLTAuOTk5OCwgLTAuMDE3NSwgMC4wMTc1LCAtMC45OTk4LCAxMTAzLjk1MzEsIDQ5OC43NjU3KSIgb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJzY2FsZSgxKSI+PHBhdGggZD0iTTEuNzQsLTMuMDI1MSBUMi42MTIsLTIuNTEwOCA0Ljk2MTcsLTEuMTY4MiA4LjA5ODMsMC42Mjc2IDExLjEyNTYsMi40MzIzIDEzLjgxMTgsMy45MzY5IDE2Ljc3LDMuMzk1NiAyMC4zNTY4LDEuMzIzMSAyNC4xMDAzLC0wLjI5NiAyNy42ODA4LC0xLjc1NDggMzEuMDk3OCwtMy4xMzIgMzMuMzc5NCwtNC4zOTg2IDM0LjAyNzMsLTQuOTkxNiBBMy41OCwzLjU4IDAgMCAxIDM4LjM3ODIsMC42OTQ5IFQzNi44NTE2LDEuNzY1NyAzMy42OTMsMy40NzgxIDMwLjQyMTcsNC44MDIgMjcuMDMsNi4yODUxIDIzLjU2NDcsNy45MzUyIDIwLjA4MDUsOS45MDQxIDE2LjI3NzksMTEuNDc0OCAxMi43Njk5LDExLjM3NzQgOS45ODI0LDEwLjA4NTEgNy4yOTM0LDguNDE0OCA0LjQ5NDgsNi42MDUxIDEuNTUwMiw0Ljg2ODYgLTAuODU3LDMuNTIwMiAtMS43NCwzLjAyNTEgQTMuNDg5OCwzLjQ4OTggMCAwIDEgMS43NCwtMy4wMjUxIFoiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0iIzFkMWQxZCIvPjwvZz48L2c+PC9zdmc+",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMTYzLjUyNjY4MTgyMDYzODc3IiBoZWlnaHQ9IjE2Ni43NDM2MDIzNzM5MDA0MiIgdmlld0JveD0iMTYzMS45NjgzMjg1NDg1NTMyIDQ5MS4yMDg3NTk0MDE1ODk2NSAxNjMuNTI2NjgxODIwNjM4NzcgMTY2Ljc0MzYwMjM3MzkwMDQyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGRhdGEtY29sb3ItbW9kZT0ibGlnaHQiIGNsYXNzPSJ0bC1jb250YWluZXIgdGwtdGhlbWVfX2ZvcmNlLXNSR0IgdGwtdGhlbWVfX2xpZ2h0IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQ7Ij48ZGVmcy8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTcyMC4wNjMxLCA1NTMuODk0OSkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0tMC4xMDk4LDMuMjU4NiBULTEuMzI2OCwzLjIwNDIgLTQuNTk2NCwzLjA5OTQgLTguNDUyNywzLjA0MjEgLTEyLjA1MTYsMy4wNDA4IC0xNS4zMTMyLDMuMjEzIC0xOC4yMTA1LDQuMzExNiAtMjEuMjg0Myw2LjkyNTggLTI0LjU1NjksMTAuODIxNiAtMjYuOTA0NSwxNC4yNTU3IC0yOC4yNjg2LDE2Ljc3MjYgLTI5LjQ5NDYsMTkuNDMxNiAtMzAuODUyNCwyMy4zMzQyIC0zMS45ODA0LDI4LjIzNzEgLTMyLjM5NzYsMzIuNjA3NiAtMzIuMzM4MSwzNi41OTc2IC0zMS42NTYsNDAuMjU0OSAtMzAuMjEwMyw0My4yNjEyIC0yOC4xMTE1LDQ1Ljc5NiAtMjUuMDYxMSw0OC4zMTY5IC0yMS4zNDYxLDUwLjU4OTkgLTE3LjUyMzEsNTIuMjczNCAtMTMuNzY1MSw1My40NDk3IC0xMC4wNDY3LDU0LjE3NTggLTYuNDU1Miw1NC41MTgxIC0yLjkzMSw1NC40MDUzIDAuMzMzOCw1My43MzM4IDMuMjQxMiw1Mi40MjUxIDYuMzkyOSw1MC41MTQzIDkuNjgzOSw0OC4yMTE4IDEyLjQ0MDEsNDUuOTg3NCAxNC41MDI4LDQzLjg4MTYgMTYuMTUwNyw0MS4xNTE5IDE3LjQ4MDksMzcuNjY0NSAxOC40OTI2LDM0LjA3MjkgMTkuMDc4MSwzMC40MDEzIDE5LjI2NzMsMjYuNzEzIDE4Ljg0MjYsMjMuNTkzNiAxNy43Mjg0LDIwLjkxMjMgMTYuMDc0MiwxOC4yMDI4IDEzLjkwNTIsMTUuMzIxNyAxMS40MDUyLDEyLjUyMTYgOC45MTEzLDEwLjA4NDcgNi40NzUxLDguMjMwNiAzLjgwMjgsNi45MDk5IDAuNjI0Nyw1LjIxOTEgLTIuNzA5NywzLjcwODIgLTQuMjk4NSwzLjI4NzkgQTMuODk3MSwzLjg5NzEgMCAwIDEgLTIuODQsLTQuMzY4NyBULTEuMjIyNywtMy45ODM2IDEuNzU1NCwtMi45MDc0IDQuMjc2OCwtMS40MjM0IDYuNzczOSwtMC4wNDMyIDkuNDQxLDEuMjQ1MSAxMi4xMDE4LDMuMDYxOCAxNC42Njc0LDUuNDExMyAxNy4wOTA2LDcuOTAyNiAxOS4xOTM3LDEwLjI3MTUgMjAuOTU5MSwxMi41MjcgMjIuNTgwMiwxNC44NDggMjQuMjUwNSwxNy44NTk5IDI1LjY5NzYsMjEuNDE2MSAyNi4zNDIxLDI1LjI5NjYgMjYuMzY0LDI4Ljk1NTUgMjYuMDc1MSwzMi4xMDQ0IDI1LjM2MDcsMzUuNzg4OCAyNC4zOTI3LDM5LjI3MDkgMjMuMDk5NSw0Mi42NjIzIDIxLjUzNyw0NS44MjAxIDE5LjQxODcsNDguNDgwMyAxNi43MzUxLDUxLjAzNiAxMy42MzE2LDUzLjUxNjIgOS45NTg0LDU2LjE0MTIgNi4xMDAyLDU4LjQ1MDQgMi4wNzg4LDYwLjE1MDcgLTEuODE3MSw2MC45NzE2IC01LjIyMjksNjEuMDYwMSAtOC45NDQ0LDYwLjc1NDUgLTEzLjM2OTYsNjAuMDQ3NCAtMTcuNzIyLDU4Ljg2NDkgLTIyLjEzNTYsNTcuMTQ2MiAtMjYuNjA1OCw1NC44MDgxIC0zMC44NDAxLDUxLjc2NjQgLTM0LjM1OCw0OC4xNTM2IC0zNi43NjYzLDQzLjk4MSAtMzguMDk2MiwzOS4xOTU3IC0zOC4zNzg5LDM0LjQ2MzkgLTM4LjAxNTIsMjkuNzA3IC0zNy40NDE0LDI1Ljc3NzggLTM2Ljc1ODYsMjIuOTY1IC0zNS44NzQ3LDIwLjA5MzMgLTM0Ljc3NjYsMTcuMDkwNyAtMzMuNDgsMTQuMDUzNCAtMzIuMDE3OCwxMS4xNDUyIC0zMC4zODQxLDguMzYzMiAtMjguNTkyNyw1LjczMTQgLTI2LjY3NDYsMy4zMTIgLTI0LjYzNzEsMS4xNDEyIC0yMC44MDU3LC0xLjUxNzUgLTE1LjkyMzUsLTMuMzY5OCAtMTIuMDAyNCwtMy41NDg5IC04LjMzOTgsLTMuNDgyOCAtNC40MTMxLC0zLjM3NjggLTEuMTA4LC0zLjI4NjMgMC4xMDk4LC0zLjI1ODYgQTMuMjYwNCwzLjI2MDQgMCAwIDEgLTAuMTA5OCwzLjI1ODYgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxNzUxLjgzLCA1MjguMDIzNCkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0wLDMuMjA5OCBULTEuNDUyNywzLjE3NSAtNS40MzA2LDMuMTI0MyAtMTAuMjI4OSwzLjExNjUgLTE0LjI2NDQsMy4xNTgyIC0xNy40MjIsMy4yMjkgLTIwLjM2NTIsMy4wMTk1IC0yMy4yNTIzLDEuNDk2NyAtMjQuOTc5MiwtMS41MjQxIC0yNS40NjIyLC01LjI1MTMgLTI1LjQzMDIsLTkuMTIzNCAtMjUuMTA2MywtMTIuODA5MyAtMjQuODk3MiwtMTYuMTMzOSAtMjUuMzUzMSwtMTkuMjk3MSAtMjYuNjMzOCwtMjIuMTY3MiAtMjguNDk5MSwtMjQuNTAzMyAtMzAuODc0OCwtMjYuNTcyNyAtMzQuMDg4OCwtMjguMjM0OCAtMzcuNjU3NSwtMjkuMTM4NCAtNDAuNzU0LC0yOS4zNzcyIC00My44OTIxLC0yOS4yNjY2IC00Ny4xODQ5LC0yOC40ODcyIC01MC4xODksLTI3LjA1MjEgLTUzLjA4MDksLTI1LjMxMTMgLTU1Ljg1MjUsLTIzLjQ1ODEgLTU4LjM2OTQsLTIxLjY3NTEgLTYwLjgyOTMsLTE5LjY2NDIgLTYzLjAyNjUsLTE3LjIzOTQgLTY0Ljk4NjcsLTE0LjIxMzEgLTY2LjY3NzUsLTExLjIwODEgLTY4LjAzNCwtOC40MjI1IC02OC45MjQzLC01LjQyNCAtNjkuMTI2LC0yLjE3NyAtNjkuMTE0OSwxLjIwNjggLTY5LjIwMiw0LjM3NTEgLTY5LjU3MzcsNy41OTcgLTcwLjI5NDQsMTAuNzQ4NiAtNzEuNDU2LDEzLjc2NTEgLTczLjMyMDgsMTYuMzg5OCAtNzUuOTQ3OCwxNy45MTI4IC03OC45ODM1LDE4Ljc0NDUgLTgxLjkyMzcsMTkuNTkxOSAtODUuMjY5NCwyMC42NDI0IC04OS4wNzY2LDIxLjc5NzYgLTkzLjA1MTEsMjIuOTAxNSAtOTcuMDgwNywyMy44NzggLTEwMC42NDczLDI0LjYyMyAtMTAzLjcwMzcsMjUuMjMwNSAtMTA2Ljk1MjksMjUuOTczIC0xMTAuMjI5NCwyNi45NTI4IC0xMTEuNTE4NywyOS4xMTk1IC0xMTEuMjg4MiwzMi42MDYzIC0xMTAuOTIyMSwzNi4wNTcyIC0xMDkuNjE4NywzOC44NDEgLTEwNy4xMTI2LDQwLjQwNDIgLTEwNC4xNDExLDQxLjIxNzMgLTEwMS4xNzE3LDQyLjIxMiAtOTguMTQzLDQzLjg1MzggLTk1LjY1MjQsNDYuMjY1MiAtOTQuMDE1LDQ5LjM3NTcgLTkyLjk0NzIsNTIuNjEzOCAtOTIuMzA5NSw1NS41NDQ5IC05MS43Mzg1LDU4LjkzNjUgLTkxLjM3ODgsNjIuMjc5OSAtOTEuNjA2OCw2NS4zNDYzIC05My4xNjcxLDY4LjA5OTIgLTk1Ljk5LDY5LjY1MjYgLTk4Ljk2NjcsNzAuOTQ3OCAtMTAxLjc2MjMsNzIuODI1NyAtMTA0LjYzOTIsNzUuMTIxMiAtMTA3LjQsNzcuNTg2IC0xMDkuODg2OCw4MC4yMzEgLTExMS41NzIyLDgzLjMwOTQgLTExMi4xMjUxLDg2Ljk3NTYgLTExMi4yNDE2LDkxLjAwODUgLTExMi4yNDg3LDk0Ljk0NTUgLTExMS44MSw5OC4yOTgxIC0xMTAuMzcwMSwxMDAuOTc1OSAtMTA4LjA0NTcsMTAyLjk3MzkgLTEwNS4xMzU1LDEwNC4zNjkzIC0xMDEuNzgyMSwxMDUuNjAxMSAtOTguMjg5NywxMDYuMzUxNCAtOTUuMDQzNywxMDYuNTU2MiAtOTIuMDI4NCwxMDYuMzMxIC04OC40NjEyLDEwNS4zOTggLTg0Ljg1MjgsMTA0LjA2MjQgLTgxLjc2MTUsMTAyLjY3NjQgLTc4LjI3MTYsMTAwLjk3OTEgLTc0LjgxMzMsOTkuMzk5MiAtNzEuNDg0NSw5OC4xNDQ5IC02OC4xMzAyLDk3LjIxMzIgLTY1LjA1NjYsOTYuODQ4MyAtNjEuOTk0Niw5Ni44NjQ4IC01OC40MDA4LDk3LjQwNTggLTU0LjQ5MDIsOTguNDU0NyAtNTEuMzEzNiw5OS41Nzk3IC00OC4yMzkxLDEwMS4wNzIyIC00NS4yMjAxLDEwMy4xNzU5IC00My4xNTg3LDEwNS41MTY0IC00MS42MDU4LDEwOC4xNjY2IC00MC4wNjQxLDExMC45MDM4IC0zOC4yNjAzLDExMy4zMDg3IC0zNi4yNzUxLDExNS41MDE5IC0zNC4yMjQ2LDExNy44MjE0IC0zMi4wODM4LDEyMC4yMzg1IC0yOS41NTY1LDEyMC43NTY0IC0yNi41NDMxLDExOS4xNzI0IC0yMy43ODEzLDExNy40MzggLTIxLjM0NDQsMTE1LjY0NzcgLTE4Ljk3ODIsMTEzLjcwMzkgLTE2LjY0MTMsMTExLjc5MjMgLTE0LjU1NSwxMDkuNzQxMiAtMTMuMzU1OSwxMDcuMTg3NCAtMTMuMDM1NywxMDMuODYxNCAtMTIuNjc4NywxMDAuMTcyMyAtMTEuNjA5Niw5Ni41Njg3IC05Ljk0NTYsOTMuNDE4OCAtNy44MDA3LDkwLjk1MzcgLTQuODk5Nyw4OS4xOTE3IC0xLjc5NjMsODguMzQxOSAxLjYxODIsODguMTIwNCA1LjYyNyw4OC4xMDE1IDkuMTc0Niw4OC4yMjI2IDEyLjE2MDEsODguNjYzNCAxNS4xMTM1LDg5LjU1NDkgMTcuOTMzOSw5MC42NzY5IDIwLjg4MjEsOTEuODQ5NSAyMy45MTQ4LDkyLjgyNjcgMjYuMTUxMyw5MS42MTc3IDI3Ljg4NDksODguNzkwMyAyOS43MTA4LDg2LjEzMTYgMzEuNTU3Nyw4My4yNDYxIDMzLjM3NzcsODAuMjUzMiAzNC44NDE5LDc3LjM3OTQgMzUuNDc4NCw3NC4zNTA4IDM1LjMzMjksNzEuMjg3OSAzNC4wMjE1LDY4LjU5MTQgMzEuODQ1Nyw2Ni4yMzUgMjkuNTY1OCw2NC4xOTQyIDI2Ljk2NjUsNjIuMzk1OSAyNC4wMzk2LDYxLjA1MzcgMjAuODcwMSw2MC4xMjI2IDE3LjgsNTguOTE2OCAxNS41MTM4LDU2Ljk2MjggMTQuMzczNSw1NC4yMDgzIDE0LjA3MjEsNTEuMDY2NCAxNC4xNjE2LDQ3LjY2OTQgMTQuNjA5Miw0NC4zMDA2IDE1LjUwOCw0MS4yODQ3IDE2LjcyOTIsMzguMzgyMyAxOC4xNjYzLDM1Ljc0ODQgMjAuMDI2NiwzMy4xOTQzIDIyLjIxMjcsMzAuNzQ2MiAyNC4zNzg2LDI4LjQ5NTggMjYuNjQzNiwyNi4xNzA5IDI4Ljc5ODksMjMuODkzNCAzMC43MDUsMjEuNzc0OSAzMi4zMzE5LDIwLjAxMTcgMzMuMDE2OCwxOS4yOTg3IEEzLjczMzcsMy43MzM3IDAgMCAxIDM4LjUyOTYsMjQuMzM1NyBUMzcuMDE3MiwyNi4wOTU3IDM0LjQyMjgsMjkuMDYxMyAzMi4xMDk4LDMxLjU1MTkgMjkuNzkwNywzMy45ODc0IDI3LjUyNjIsMzYuMzkwMyAyNS40ODY0LDM4Ljc4MTYgMjMuOTA4MSw0MS4zNjUxIDIyLjY2MTQsNDQuNDgyMSAyMS45ODg4LDQ3LjgzNzEgMjEuODU5Niw1MS4wMDcgMjMuMjM3LDUyLjgzMDEgMjYuMDYxNCw1My42NDIyIDI4Ljk4MzIsNTQuODUwMyAzMS43MjYyLDU2LjQyNzcgMzQuNDAxMSw1OC40MDg3IDM3LjE3OTIsNjAuODk0NSAzOS44MzcxLDYzLjc0MDYgNDEuOTczMyw2Ny4wMjE2IDQyLjk1NjQsNzAuMzU3MSA0My4wMzI4LDczLjU2NzUgNDIuNzI0NSw3Ni44MjIxIDQxLjc1MDIsODAuMDU1MSA0MC4yNTI1LDgzLjAxNjggMzguNzAzNSw4NS42MjU4IDM2Ljk5MSw4OC41MDg2IDM1LjA2Myw5MS42NzAyIDMzLjE3ODMsOTQuNTI2MyAzMS4yMjk4LDk3LjE0ODYgMjkuMDk1Miw5OS40MzU0IDI2LjI4MTgsMTAwLjU5MzcgMjMuMTQxOSwxMDAuNDg4NCAyMC4zOTA2LDk5LjczMSAxNy41ODgyLDk4LjcwMjUgMTQuNTc3Miw5Ny40NjkyIDExLjQ5ODUsOTYuMzI2MiA4LjEyMTUsOTUuNzc4OCA0LjMxLDk1Ljc1NTUgMC44ODIsOTUuODUzNyAtMS45MjIsOTYuNjEzMyAtNC4wMDc1LDk4Ljc0MTYgLTQuOTU5NSwxMDEuNjI2OCAtNS4xODMzLDEwNC43ODY2IC01LjQwNDMsMTA4LjIzODUgLTYuMjgxNywxMTEuMzg5NiAtNy44OTg4LDExNC4wNTg1IC05Ljk1MDEsMTE2LjQxNjIgLTEyLjIwNSwxMTguMzc0NyAtMTQuNTQ1NSwxMjAuMjMzMiAtMTYuODUyMywxMjIuMTQxMiAtMTkuMTM3MywxMjMuODI3MiAtMjEuNjM2OCwxMjUuNDE0NCAtMjQuMjAwMiwxMjcuMDE4NiAtMjYuODQ2MywxMjguNjY2MyAtMjkuNzczOCwxMjkuNzU2NiAtMzIuNzMzOSwxMjkuNTE4NCAtMzUuMzI5NCwxMjguMDY1OSAtMzcuNjg3MiwxMjUuNzQ1NiAtMzkuOTcxMywxMjMuMTQ4MyAtNDIuMDYxNiwxMjAuNjk1IC00NC4wNDc5LDExOC40NDQxIC00NS44MjkxLDExNi4xODE1IC00Ny4zNjU5LDExMy41OTIxIC00OC44MTY2LDExMC43NTg5IC01MC43NDYsMTA4LjM0MjQgLTUzLjU1MDgsMTA2LjcwMzggLTU2LjcyMzksMTA1LjUyMjMgLTU5LjgzMzgsMTA0LjY3IC02My4wMjQxLDEwNC4yMzcgLTY2LjExOTksMTA0LjI2MTIgLTY5LjEyNjMsMTA0Ljg5MDkgLTcxLjk5MTIsMTA1LjkzMjggLTc0LjU1NzYsMTA3LjA2NzIgLTc3LjIxMTUsMTA4LjM3NDQgLTgwLjM1MTksMTA5Ljg5NiAtODMuODkwMSwxMTEuNDUyMSAtODcuMjM1NCwxMTIuNjgwMyAtOTAuMzU0LDExMy40NzA3IC05My40Mjg0LDExMy44MzA0IC05Ni43MTI3LDExMy44NDgyIC0xMDAuMTg4OCwxMTMuNTcwNiAtMTAzLjM5NDcsMTEyLjkwNjEgLTEwNi4yMzczLDExMS45NjQ0IC0xMDkuMzYyOSwxMTAuNjQ4NSAtMTEyLjYwODksMTA4LjkxNDQgLTExNS4yNzM4LDEwNi43NDU4IC0xMTcuMzg0NywxMDMuODMzMyAtMTE4LjcxNDMsMTAwLjc3OTkgLTExOS4zODExLDk3LjU4NDggLTExOS42MjUzLDk0LjM2NTQgLTExOS42MTY4LDkwLjkxMzUgLTExOS41NzI3LDg3LjQ2NzIgLTExOS4zMjI1LDg0LjE4OTIgLTExOC41NDY4LDgwLjY2NzMgLTExNi45MjcxLDc3LjU5MzQgLTExNC44MDI1LDc0Ljk0MyAtMTEyLjQwMjYsNzIuMzkwOSAtMTA5LjQzMyw2OS41Mzg3IC0xMDYuMjg3MSw2Ni43ODU4IC0xMDMuNDAwOSw2NC42NDg3IC0xMDAuNDYyNyw2NC4yMTggLTk4LjkzOTcsNjMuMTY2OSAtOTkuMjQyNiw2MC4wNTY3IC05OS45MzI2LDU2LjU3MDMgLTEwMC44MzQzLDUzLjI4NDIgLTEwMi4yNzQxLDUwLjgwODggLTEwNC43OTQzLDQ5LjE3NjUgLTEwNy44NjY4LDQ4LjIyNjMgLTExMC45NDEsNDcuMzM0NiAtMTEzLjgwMDQsNDUuOTg3MSAtMTE1Ljk4NjMsNDMuOTQ2IC0xMTcuNDY1NCw0MS4wMTc2IC0xMTguMzEwOCwzNy43ODg3IC0xMTguNzI5NCwzNC41OTMyIC0xMTguOTE5OSwzMS40MjkzIC0xMTguOTE0OCwyOC40NDcyIC0xMTguNjUyMSwyNS41MjA4IC0xMTcuMjQ0NywyMi45MDg4IC0xMTQuNjAyNywyMC45ODc4IC0xMTEuNzU4NywxOS44OTc1IC0xMDguNDg4OCwxOS4wNzg1IC0xMDUuMTA2NywxOC4zNTg5IC0xMDIuMDMyOCwxNy43NjE3IC05OC42OTYsMTcuMDM1IC05NS4wNDA4LDE2LjAzODIgLTkxLjMyNzMsMTQuODUyNiAtODcuNjUzNiwxMy41NjM0IC04NC4yNDI3LDEyLjMzMzQgLTgxLjIzOTksMTEuMzk0MyAtNzguNjk5NSwxMC4wNTg4IC03Ny4yMzcyLDcuNTY4NyAtNzYuNzAxNCw0LjQyNDYgLTc2LjU0MTUsMS4yMDAzIC03Ni41MDk2LC0yLjI4ODcgLTc2LjI5NzksLTUuNzYxNCAtNzUuNTMzNSwtOS4wMzQgLTc0LjMwNTMsLTEyLjAxMzIgLTcyLjk1NjEsLTE0LjYzNDggLTcxLjQ2NjIsLTE3LjMzMjIgLTY5LjQ0ODUsLTIwLjQ3MzIgLTY3LjEyMiwtMjMuNDE1MyAtNjQuODczMiwtMjUuNTMxMiAtNjIuNDY0OCwtMjcuMzU1MyAtNTkuODA1NCwtMjkuMjIyNCAtNTYuODQwNSwtMzEuMjI1OSAtNTMuNDI1MSwtMzMuMzI0NyAtNTAuMDU5OCwtMzUuMDEwMiAtNDYuODI0NiwtMzYuMDA4NCAtNDMuNTc1NSwtMzYuNDE1NCAtNDAuNDQzNiwtMzYuMzk3IC0zNy40MDA1LC0zNi4xNzU2IC0zNC4wNDY4LC0zNS41MzYyIC0zMC4yMjgxLC0zNC4xOTQyIC0yNi41MzY4LC0zMi4wMjE2IC0yMy4yMjY4LC0yOS4xMzkzIC0yMC40Nzc5LC0yNS42NzIzIC0xOC40OTM1LC0yMS41MzggLTE3LjY4NjYsLTE3Ljg1NCAtMTcuNzIwNSwtMTQuNzQ5NiAtMTguMTEwMSwtMTEuMTYyNyAtMTguNDk2NiwtNy42OTUxIC0xOC42OTYsLTQuNzAzMiAtMTcuNDIxNCwtMy4yMjkgLTE0LjI2NDQsLTMuMTU4MiAtMTAuMjI4OSwtMy4xMTY1IC01LjQzMDYsLTMuMTI0MyAtMS40NTI3LC0zLjE3NSAwLC0zLjIwOTggQTMuMjA5OCwzLjIwOTggMCAwIDEgMCwzLjIwOTggWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAxNzg3LjYsIDU0OS44NCkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0tMi43ODA4LC0yLjE0OTIgVC0yLjIxMDEsLTIuODc3IC0wLjcwODQsLTQuOTIzOSAtMC40OTk1LC03LjYzMTMgLTIuMDMwMywtMTAuMzU2MiAtMy44NTIzLC0xMi44MTgxIC02LjMwMTcsLTE0LjYzNTggLTkuMTI5MywtMTUuNzUzNCAtMTIuMTI4MywtMTYuNDMzMSAtMTUuNDQ4LC0xNi44MzEzIC0xOC45NzEzLC0xNy4xMjkzIC0yMi40MjM5LC0xNy4zNTM3IC0yNS41NTcsLTE3LjQxODMgLTI4LjYxNjksLTE3LjQ5NjcgLTMxLjYwODQsLTE3LjY4NzcgLTM1Ljg5OTYsLTE4LjI4IC0zOC43Njc0LC0xOC43NjUgQTMuODk4OCwzLjg5ODggMCAwIDEgLTM2LjQ2NjEsLTI2LjIxNTMgVC0zNS44NzE5LC0yNS45NjQzIC0zMy43NDY0LC0yNS42NTA3IC0zMC44MjI5LC0yNS40OTM0IC0yNy45NjgxLC0yNS4yNzAyIC0yNC44ODMxLC0yNS4xMjQ5IC0yMS42NzEzLC0yNS4wMTI1IC0xOC4zNjk3LC0yNC43Njc1IC0xNS4yMzAyLC0yNC40OTU3IC0xMi4wNDg0LC0yNC4xNDgyIC04LjUzMDgsLTIzLjQ3MTMgLTUuNDIwNiwtMjIuNTM4NSAtMi41NDIyLC0yMS4yNjA3IDAuMzEyMiwtMTkuMjg5OSAyLjUxOTYsLTE3LjAwODIgNC4yNDEyLC0xNC40ODUyIDUuNzE4NiwtMTEuNzE0NyA2Ljk2NSwtOC44NDE3IDcuNDMyMiwtNS43ODY0IDYuNTM3NCwtMy4wMDMzIDQuODQxNywtMC41Mzk5IDMuMzQxMiwxLjQxMzQgMi43ODA4LDIuMTQ5MiBBMy41MTQ1LDMuNTE0NSAwIDAgMSAtMi43ODA4LC0yLjE0OTIgWiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSIjMWQxZDFkIi8+PC9nPjwvZz48L3N2Zz4=",
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
					"src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRpcmVjdGlvbj0ibHRyIiB3aWR0aD0iMzMuMzU1NjY1ODUzNzI5OTUiIGhlaWdodD0iMjkuMjk5NTQ4MTgxNTg1NjkyIiB2aWV3Qm94PSI2OTkuODA1NTA3MzgwMTA5NSA1MjYuMTg4NjcxMTI2MjkzNiAzMy4zNTU2NjU4NTM3Mjk5NSAyOS4yOTk1NDgxODE1ODU2OTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZGF0YS1jb2xvci1tb2RlPSJsaWdodCIgY2xhc3M9InRsLWNvbnRhaW5lciB0bC10aGVtZV9fZm9yY2Utc1JHQiB0bC10aGVtZV9fbGlnaHQiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMjQ5LCAyNTAsIDI1MSk7Ij48ZGVmcy8+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgNzAyLjQ5MywgNTMyLjczOTUpIiBvcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InNjYWxlKDEpIj48cGF0aCBkPSJNMi4yNzAyLDAgVDIuMjMwOCwxLjAxNDQgMi4xOTY0LDMuMjg3MSAyLjIzNzYsNS40ODgyIDMuMzIwMiw2LjU4NTMgNS41NjQsNi40NSA2Ljc2MTEsNi4xNjA0IEEyLjM2NzQsMi4zNjc0IDAgMCAxIDcuOTQxOSwxMC43NDU2IFQ2LjYyMDksMTEuMTA0NCA0LjE4MzEsMTEuNjQwNiAxLjcxOTksMTEuNzYzNyAtMC41MTM1LDEwLjk1MjQgLTEuNzA2LDkuMzAzIC0yLjE0MjYsNy40MjE0IC0yLjIzNzYsNS40ODg3IC0yLjE5NjQsMy4yODcxIC0yLjIzMDgsMS4wMTQ0IC0yLjI3MDIsMCBBMi4yNzAyLDIuMjcwMiAwIDAgMSAyLjI3MDIsMCBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDcwNC43NzQyLCA1MzguNTY2OCkiIG9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0ic2NhbGUoMSkiPjxwYXRoIGQ9Ik0tMi4xMzk0LC0wLjcxMDggVC0xLjkwMjMsLTEuNDAxNSAtMS4yNzczLC0zLjA4MjIgLTAuMzMxNCwtNC45NzU4IDEuMjUyMywtNi43NzkgMy4wNDg2LC04LjIxNjQgNC44MzI0LC05LjI5NzcgNi45ODA2LC0xMC4zMjUzIDkuNDUyOCwtMTEuMTkwNiAxMi4xNDM4LC0xMS43MzMgMTQuNjA5NiwtMTEuOTQwMiAxNy4xMDQ1LC0xMS45OTQ1IDE5LjU3MTUsLTExLjc1NzUgMjEuNzM5OCwtMTAuOTY2MiAyMy43NjA4LC05LjczNDIgMjUuMzcyLC04LjM5NTUgMjYuNzYzNywtNi41NTg5IDI3Ljc2NzMsLTQuMTc4NCAyOC4wOTIzLC0xLjY1MjkgMjguMDcyNSwxLjQzMjggMjcuODc0NCw0LjkwNDIgMjcuNDMzNSw3LjkzMzcgMjYuNTc3NiwxMC40MTEzIDI1LjI5MTUsMTIuMjE3OCAyMy42ODIxLDEzLjI2MzcgMjEuMjcxOCwxNC4yMjcgMTguODU1MSwxNS4wODMxIDE2LjY4OSwxNS44NDk4IDEzLjk0MDIsMTYuMzg4MyAxMi40NzMxLDE2LjQ1NSBBMi4yMzc0LDIuMjM3NCAwIDAgMSAxMi40OCwxMS45ODAyIFQxMy4yNTIxLDEyLjA1MDMgMTUuMjI2LDExLjY2NDMgMTcuMzAxNiwxMC44NTI2IDE5LjUyMTIsOS45MzcyIDIxLjgzMTcsOC42NzE1IDIzLjAyNzcsNy4wNTY2IDIzLjMyMTksNC42NzIzIDIzLjMxOCwxLjQ1ODMgMjMuMTkzOSwtMS42Nzk0IDIyLjY2NzcsLTMuOTg0NiAyMS4zMTM3LC01LjYwMTIgMTkuNTc4NiwtNi43NDU3IDE3Ljc0OTcsLTcuMjU0NyAxNS44MzMxLC03LjMxNDEgMTMuODc2NSwtNy4yMzQyIDExLjg4MjcsLTYuOTc4NiA5LjkwMjIsLTYuNDEyIDguMDA4NywtNS42MDY4IDYuMDgyOCwtNC41MjQ3IDQuMjQ2NCwtMy4yMDM2IDMuMDE3LC0xLjYwNzIgMi4zNjI3LDAuMDE1NiAyLjEzOTQsMC43MTA4IEEyLjI1NDQsMi4yNTQ0IDAgMCAxIC0yLjEzOTQsLTAuNzEwOCBaIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9IiMxZDFkMWQiLz48L2c+PC9nPjwvc3ZnPg==",
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
