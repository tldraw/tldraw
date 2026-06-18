// The committed *default* welcome document — the fallback content a new workspace's first
// file is seeded with when no file is marked as the welcome template (fresh dev/preview/prod,
// before an admin has set one). Once a welcome template file is marked, its published
// snapshot is used instead and this default is no longer consulted. Its canvas is a
// three-panel comic in the brand's illustration style (the Downy/Cloudy/Penta characters)
// covering shared visibility, inviting people, and moving files in.
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
				"gridSize": 10,
				"name": "",
				"meta": {},
				"id": "document:document",
				"typeName": "document"
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
				"x": 20.48764116032075,
				"y": 26.174423770442814,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:-L-rqW6hOIhsA2_SCSPCv",
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
				"parentId": "shape:zUmcvvSq9SJRIp2EVqER9",
				"index": "a2DpXERV",
				"typeName": "shape"
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
				"id": "shape:-fE8AbI7P8RrZUnn6eJ_m",
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
				"parentId": "shape:zf-Mv7lx75TSGVQj9sHiL",
				"index": "a3cmBpLV",
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
				"id": "shape:050ZbMAIJKFKLwHb-mf6P",
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
				"parentId": "shape:CQ8CzKGPhFuNSzEC4d3ab",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 73.82291105580043,
				"y": 0,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:1rO2bAZ391CFEbzKoowv6",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a2aF7UQl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 37.02380880226292,
				"y": 138.0214360546894,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:22ZHSc6AJqQ6TqO_7ZGtk",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aLraAcBV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 170.96922215977247,
				"y": 116.46756237007344,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:2JMA1v5e8LGFopoj-Jt-A",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 16,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.3364459229094039,
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
										"text": "+"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aGbIUqHl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 117.01208622570164,
				"y": 81.13756031653281,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:2l3d0eWP-tDRL06fmhxvH",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 42.18295291160777,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.31097065348041475,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a8yccgpV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 79.54599236025433,
				"y": 5.410601921338653,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:3KGPvZ2pt2z1gdK_xBRWH",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 191.9707994749284,
				"y": 81.13756031653281,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:3nexYcU3qY6zqK9DT_biT",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 72.51351959598657,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.31097065348041475,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a9U3PFOl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 244.6909771827785,
				"y": 116.25169607193538,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:7Z_63p4qBuOoM84rcKSzJ",
				"type": "geo",
				"props": {
					"w": 8.66310155057614,
					"h": 7.1408974770218245,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "light-blue",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aBWz8dgl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 64.42399038780422,
				"y": 133.3197530810348,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:9gLywTXosTnvnGBakdQMJ",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aMv78Izl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 119.89988068564571,
				"y": 149.02961654903993,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:BVI4XEOQleQH51CqflJth",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 62.546875,
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
										"text": "Visitor"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a6BTs",
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
				"id": "shape:CQ8CzKGPhFuNSzEC4d3ab",
				"type": "group",
				"parentId": "page:page",
				"index": "aBSxrxxd",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 20.4559253377397,
				"y": 35.55394546015327,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:Cv5oAW4aUK9X4CrDOCXuK",
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
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a39PZ",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 229.3578740942399,
				"y": 146.63332405285837,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:E2HCohGIwGnVBGJ6PHFGK",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 46.3671875,
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
										"text": "View"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a74I5",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 169.22570356512222,
				"y": 56.3895825798966,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:E3A03YzLfa96lV9DLtSxN",
				"type": "geo",
				"props": {
					"w": 8.66310155057614,
					"h": 7.1408974770218245,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "light-blue",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aDwNfQnV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 113.43809258290867,
				"y": 113.48384916948817,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:EgL7rDXJh5Z520Z-LA7q-",
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
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a1",
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
				"id": "shape:FW0PLIPH5u3J7p9nYyRfR",
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
				"parentId": "shape:khK3znr8sfRGr3clmYOYD",
				"index": "a6Pmy",
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
				"id": "shape:GZPCmIuEmRYzdHrBbT0wm",
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
				"parentId": "shape:CQ8CzKGPhFuNSzEC4d3ab",
				"index": "a4lLIJ5V",
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
				"id": "shape:I-Gb0qhsQUyQezyKx_r0x",
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
				"parentId": "shape:zUmcvvSq9SJRIp2EVqER9",
				"index": "a4OzCnsG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 283.6211366846151,
				"y": 157.60647342079028,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:K24g9p3oTCU_sKK-ljYzt",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AACuKwAAZqp7LAAAHiUgKQAApDSkNAAAPTYpOAAAFTjNOAAAUjggOQAAhDekOAAAYDdQOAAAmDW4NgAAeDSoNAAAIDHAMgAAoC+ALwAAgC4ALwAAgCwALAAAoC8AIAAAgCqAqwAAYCwgsgAAIDFgtgAAIDIouAAAUDRUuAAAcDVQuAAAQDUWuAAAsDQUtgAAADKktAAAgC4otAAAgCxcswAAACkqtAAAgCwotAAAIDAKswAAACwfsQAAAC16sAAAQC18sAAAACmwqwAAgCp4rAAA"
						}
					],
					"color": "black",
					"fill": "fill",
					"dash": "draw",
					"size": "s",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a9C9Y",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 116.92510313578373,
				"y": 33.954470457012235,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:KW5sCOVWT8OIO7C3t-eqP",
				"type": "geo",
				"props": {
					"w": 65.00743355749368,
					"h": 34.289976660978105,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a3dWzAll",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 119.89988068564571,
				"y": 117.42636630728157,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:MnR6mvfdg2tLrps2N9XYx",
				"type": "text",
				"props": {
					"color": "black",
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
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a50pA",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 283.6211366846151,
				"y": 129.39872649695099,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:OSj7igfnIe4qod5JDKbhN",
				"type": "draw",
				"props": {
					"segments": [
						{
							"type": "free",
							"path": "AAAAAAAAAAAAAAA/AACuKwAAZqp7LAAAHiUgKQAApDSkNAAAPTYpOAAAFTjNOAAAUjggOQAAhDekOAAAYDdQOAAAmDW4NgAAeDSoNAAAIDHAMgAAoC+ALwAAgC4ALwAAgCwALAAAoC8AIAAAgCqAqwAAYCwgsgAAIDFgtgAAIDIouAAAUDRUuAAAcDVQuAAAQDUWuAAAsDQUtgAAADKktAAAgC4otAAAgCxcswAAACkqtAAAgCwotAAAIDAKswAAACwfsQAAAC16sAAAQC18sAAAACmwqwAAgCp4rAAA"
						}
					],
					"color": "black",
					"fill": "fill",
					"dash": "draw",
					"size": "s",
					"isComplete": true,
					"isClosed": false,
					"isPen": false,
					"scale": 1,
					"scaleX": 1,
					"scaleY": 1
				},
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "aA2si",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 236.44389006068792,
				"y": 118.42557712901908,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:P8uG1InpoIIoJTlONyETx",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 38.6953125,
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
										"text": "Edit"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a81n3",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 116.92510313578373,
				"y": 92.0715890357126,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:PEFQAwp47mNnzaI8iIdP3",
				"type": "geo",
				"props": {
					"w": 65.00743355749368,
					"h": 34.289976660978105,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a5pUlrcl",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 191.9707994749284,
				"y": 21.66474625267503,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:Pvsrw91tgj8EMAGL_2dFl",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 55.88097943788618,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.31097065348041475,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aAlLWB8V",
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
				"id": "shape:QAZCFvDMAVODbDygnqT2d",
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
				"parentId": "shape:zUmcvvSq9SJRIp2EVqER9",
				"index": "a3WkZwUG",
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
				"id": "shape:RmFnpn464VJGgAerQYJ-L",
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
				"index": "a9DNdzxl",
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
				"id": "shape:UZ5m5kCotziiYQfZ-HkPV",
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
				"parentId": "shape:zUmcvvSq9SJRIp2EVqER9",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 831.4069350265314,
				"y": 135.6,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"type": "group",
				"parentId": "page:page",
				"index": "a9Ccg2CbG",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 247.32470742095836,
				"y": 115.80778402132839,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:XW5UeI8SerqvTasUA_SQ2",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 16,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.3364459229094039,
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
										"text": "+"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aFN7MErV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 5.186953606369684,
				"y": 99.37473351190062,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:YyQVx-c86qBxpD2y9_seO",
				"type": "geo",
				"props": {
					"w": 90.2252664880994,
					"h": 90.2252664880994,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aKQ8BYhV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 117.01208622570164,
				"y": 21.66474625267503,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:Z28p3B2D-WZYYRgHfX0Qx",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 127.8515625,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.31097065348041475,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a7gn7GVV",
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
				"id": "shape:_3XBj3lQ1P58b3KS5O6YW",
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
				"parentId": "shape:CQ8CzKGPhFuNSzEC4d3ab",
				"index": "a2czFd7G",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 0,
				"y": 20.38829590031247,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:auCO1XVHPFzUfQ-Aj-6cL",
				"type": "geo",
				"props": {
					"w": 133.8700190662085,
					"h": 56.296875,
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
										"text": "so tidy!"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aJgPf0wV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 191.9707994749284,
				"y": 33.954470457012235,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:cnN9kMUMF8hnuBpHk30Xf",
				"type": "geo",
				"props": {
					"w": 65.00743355749368,
					"h": 34.289976660978105,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a4BsTzyG",
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
				"id": "shape:d_GwLU7EuiCRhw5-_9NbQ",
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
				"parentId": "shape:zf-Mv7lx75TSGVQj9sHiL",
				"index": "a1",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 245.14803944908397,
				"y": 57.183055717597824,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:dj3jzSdVsrRN7YtVaOoLW",
				"type": "geo",
				"props": {
					"w": 8.66310155057614,
					"h": 7.1408974770218245,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "light-blue",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aEzJuNyG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 171.85943380330207,
				"y": 55.94567052928957,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:dyKIODH6_nJZ9CgPE2KIe",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 16,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.3364459229094039,
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
										"text": "+"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aHUjXyZG",
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
				"id": "shape:ed7mZE16Bf4C_QJ8b0pqh",
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
				"parentId": "shape:khK3znr8sfRGr3clmYOYD",
				"index": "a3FwHZWr",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 106.56978935951747,
				"y": 106.10713802593091,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:gGS-H-NK9w5JBuR3R8WcG",
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
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a2Akp",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": -3.7049877116837706,
				"y": 76.82529397680992,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:khK3znr8sfRGr3clmYOYD",
				"type": "group",
				"parentId": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"index": "a4BhY",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 168.33549192159262,
				"y": 116.91147442068043,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:mH2XPHnZ6Iw9nWNI2dgS3",
				"type": "geo",
				"props": {
					"w": 8.66310155057614,
					"h": 7.1408974770218245,
					"geo": "rectangle",
					"dash": "draw",
					"growY": 0,
					"url": "",
					"scale": 1,
					"color": "light-blue",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aCMNm0pV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 191.9707994749284,
				"y": 92.0715890357126,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:nTLlFG2LaOiC8Oi0TiY-v",
				"type": "geo",
				"props": {
					"w": 65.00743355749368,
					"h": 34.289976660978105,
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "a6MUgS9l",
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
				"id": "shape:pCF8YfTHgwFDq6zEhLDxm",
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
				"parentId": "shape:zf-Mv7lx75TSGVQj9sHiL",
				"index": "a263MQQV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 247.78176968726382,
				"y": 56.73914366699083,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:pbPdvo9qFy8IBUYsYn-2Y",
				"type": "text",
				"props": {
					"color": "black",
					"size": "s",
					"w": 16,
					"font": "draw",
					"textAlign": "start",
					"autoSize": true,
					"scale": 0.3364459229094039,
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
										"text": "+"
									}
								]
							}
						]
					}
				},
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aIJxo0cV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 50.60479426321217,
				"y": 142.44024386526795,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:sFCD7m_vGHkJxk3o74PSL",
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
				"parentId": "shape:WCD0ezbfYvyJ8CeEZXA6-",
				"index": "aNPhaJZV",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 452.5027105731176,
				"y": 132.88041351777883,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:tvjW5PV-VXtHI6E-6o_IL",
				"type": "group",
				"parentId": "page:page",
				"index": "aC93CFfV",
				"props": {},
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
				"id": "shape:vHnjFG_eyxWrewzR1UHSN",
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
				"parentId": "shape:CQ8CzKGPhFuNSzEC4d3ab",
				"index": "a3KpYESV",
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
				"id": "shape:vrxr5RlbjJVGWvirc_wVt",
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
				"parentId": "shape:khK3znr8sfRGr3clmYOYD",
				"index": "a84NN",
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
				"id": "shape:wcMDn17H3_o3g0WN8gkuj",
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
				"parentId": "shape:zf-Mv7lx75TSGVQj9sHiL",
				"index": "a4kgKzMl",
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
				"id": "shape:welcome-caption-1",
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
										"text": "A workspace is a "
									},
									{
										"type": "text",
										"text": "shared space",
										"marks": [
											{
												"type": "bold"
											}
										]
									},
									{
										"type": "text",
										"text": " for your team. Everyone in it can see and edit its files."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a5NzSpwl",
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
				"id": "shape:welcome-caption-2",
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
										"text": "Invite your team",
										"marks": [
											{
												"type": "bold"
											}
										]
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
				"index": "a6k2uplV",
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
				"id": "shape:welcome-caption-3",
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
										"text": "Move files in",
										"marks": [
											{
												"type": "bold"
											}
										]
									},
									{
										"type": "text",
										"text": " by dragging them onto this workspace in the sidebar, or with a file's 'Move to' menu."
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a7gskqfV",
				"typeName": "shape"
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
				"id": "shape:welcome-panel-1",
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
				"index": "a2ZtKrvV",
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
				"id": "shape:welcome-panel-2",
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
				"index": "a3QUhZVG",
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
				"id": "shape:welcome-panel-3",
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
				"index": "a4RkZS6V",
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
				"id": "shape:welcome-team-label",
				"type": "text",
				"props": {
					"color": "grey",
					"size": "s",
					"w": 8,
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
										"text": "your team"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "aEhzhZxG",
				"typeName": "shape"
			},
			"lastChangedClock": 0
		},
		{
			"state": {
				"x": 50,
				"y": 40,
				"rotation": 0,
				"isLocked": false,
				"opacity": 1,
				"meta": {},
				"id": "shape:welcome-title",
				"type": "text",
				"props": {
					"color": "black",
					"size": "xl",
					"w": 8,
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
										"text": "Welcome to your workspace"
									}
								]
							}
						]
					}
				},
				"parentId": "page:page",
				"index": "a1gDbS5V",
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
				"id": "shape:yWwE7jyYSu8YpiIJREQWQ",
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
				"parentId": "shape:khK3znr8sfRGr3clmYOYD",
				"index": "a4dinZcw",
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
				"id": "shape:zUmcvvSq9SJRIp2EVqER9",
				"type": "group",
				"parentId": "page:page",
				"index": "aC3YXLOg",
				"props": {},
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
				"id": "shape:zf-Mv7lx75TSGVQj9sHiL",
				"type": "group",
				"parentId": "page:page",
				"index": "aEFs9aY8",
				"props": {},
				"typeName": "shape"
			},
			"lastChangedClock": 0
		}
	]
}`
