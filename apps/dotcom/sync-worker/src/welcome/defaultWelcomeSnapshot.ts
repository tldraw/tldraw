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
					"src": "https://staging.tldrawusercontent.com/f8LsW03eWDaqcklpxphrw-shapes-at-26-06-16-17-47-40-svg",
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
					"src": "https://staging.tldrawusercontent.com/gbzym2LRZmjMr4bBXPjag-svg",
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
					"src": "https://staging.tldrawusercontent.com/CNJ5SuXhuPF6k9KvGbOf--shape_SXsRDeohE0RI1yYgxjxec-at-26-06-16-16-48-18-svg",
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
					"src": "https://staging.tldrawusercontent.com/hf_28DmdS6rqlwh4tBhn8-svg",
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
					"src": "https://staging.tldrawusercontent.com/GAslaOE3mze8Tb-M5W33u-shapes-at-26-06-17-16-03-02-svg",
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
					"src": "https://staging.tldrawusercontent.com/hmfY3WLQl1eYALNwRGu9A-svg",
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
					"src": "https://staging.tldrawusercontent.com/pXmOMyzz6MfVVd1IUr2mH-shapes-at-26-06-16-17-41-16-svg",
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
					"src": "https://staging.tldrawusercontent.com/zK5wk8LqhvxoNWfiddeqK-shapes-at-26-06-16-17-48-28-svg",
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
					"src": "https://staging.tldrawusercontent.com/IquMt2Whhraybds7YuefQ-svg",
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
					"src": "https://staging.tldrawusercontent.com/wTN0SkgJqRUt5e1FI3ANG-shapes-at-26-06-16-16-43-58--1--svg",
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
					"src": "https://staging.tldrawusercontent.com/XG1Fsft5BFbzvgmkzMptf-shapes-at-26-06-16-17-53-39-svg",
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
					"src": "https://staging.tldrawusercontent.com/0BZVJ4-5mXZwE3gvOyI6W-shapes-at-26-06-16-17-44-27-svg",
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
					"src": "https://staging.tldrawusercontent.com/gZCEIuIlEqAg5FoyZIAxb-shapes-at-26-06-16-17-59-24-svg",
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
					"src": "https://staging.tldrawusercontent.com/VXEmJXpXFL50MMzZO8KOm-shapes-at-26-06-16-17-40-23-svg",
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
					"src": "https://staging.tldrawusercontent.com/rOuHN7NPz50ZSpCBMC6xi-shapes-at-26-06-16-17-33-51-svg",
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
					"src": "https://staging.tldrawusercontent.com/WM0IC9ffMURCo7nRXKV86-shapes-at-26-06-16-17-48-08-svg",
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
				"name": "WORKSPACE TEMPLATE",
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
					"src": "https://staging.tldrawusercontent.com/CgbI6KkrAAKb6PPzfm_Oh-shapes-at-26-06-16-16-43-58-svg",
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
