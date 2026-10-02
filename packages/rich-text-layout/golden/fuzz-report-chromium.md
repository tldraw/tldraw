# Fuzz report (chromium)

Seed 42, 3000 cases. Failures by kind (a case can fail several ways):

| kind  | cases | rate   |
| ----- | ----- | ------ |
| lines | 684   | 22.80% |
| wide  | 15    | 0.50%  |
| wrap  | 3     | 0.10%  |

## Shrunk clusters

Signature: kind | width mode | nodes | marks | text features. Up to 100 failures per kind were shrunk.

### lines | note | p | - | trailing-space (43)

```json
{
	"font": "sans",
	"fontSize": 19,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 26, "scrollWidth": 167 },
	"native": { "w": 167, "h": 52, "scrollWidth": 167 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "mYcXWqyvCYdAUP " }] }]
	}
}
```

### lines | boundary | bulletList+listItem | - | - (6)

```json
{
	"font": "draw",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": 60.875,
	"dom": { "w": 60.875, "h": 32, "scrollWidth": 61 },
	"native": { "w": 60.875, "h": 64, "scrollWidth": 61 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Nn" }] }]
					}
				]
			}
		]
	}
}
```

### lines | fixed | p | - | trailing-space (5)

```json
{
	"font": "sans",
	"fontSize": 49,
	"mode": "text",
	"maxWidth": 32,
	"dom": { "w": 32, "h": 66, "scrollWidth": 43 },
	"native": { "w": 32, "h": 132, "scrollWidth": 43 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "m " }] }]
	}
}
```

### lines | fixed | p | - | trailing-space+tab (5)

```json
{
	"font": "draw",
	"fontSize": 59,
	"mode": "text",
	"maxWidth": 56,
	"dom": { "w": 56, "h": 80, "scrollWidth": 56 },
	"native": { "w": 56, "h": 160, "scrollWidth": 56 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "z \t" }] }]
	}
}
```

### lines | fixed | h1 | - | empty (3)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": 213,
	"dom": { "w": 0, "h": 10, "scrollWidth": 0 },
	"native": { "w": 0, "h": 79.80000000000001, "scrollWidth": 0 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "heading", "attrs": { "level": 1 }, "content": [] }]
	}
}
```

### lines | fixed | p | - | - (2)

```json
{
	"font": "draw",
	"fontSize": 36,
	"mode": "text",
	"maxWidth": 38,
	"dom": { "w": 38, "h": 294, "scrollWidth": 40 },
	"native": { "w": 38, "h": 343, "scrollWidth": 38 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "uPrACsw" }] }]
	}
}
```

### lines | note | h1 | - | empty (2)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 0, "h": 10, "scrollWidth": 0 },
	"native": { "w": 0, "h": 79.80000000000001, "scrollWidth": 0 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "heading", "attrs": { "level": 1 }, "content": [] }]
	}
}
```

### lines | fixed | h2 | - | empty (2)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": 144,
	"dom": { "w": 0, "h": 10, "scrollWidth": 0 },
	"native": { "w": 0, "h": 63.6, "scrollWidth": 0 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "heading", "attrs": { "level": 2 }, "content": [] }]
	}
}
```

### lines | note | p | - | punct (2)

```json
{
	"font": "sans",
	"fontSize": 20,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 27, "scrollWidth": 167 },
	"native": { "w": 167, "h": 54, "scrollWidth": 167 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "–tNCJmBsOfOXJF" }] }]
	}
}
```

### lines | fixed | p | - | punct (2)

```json
{
	"font": "draw",
	"fontSize": 44,
	"mode": "text",
	"maxWidth": 57,
	"dom": { "w": 57, "h": 236, "scrollWidth": 57 },
	"native": { "w": 57, "h": 177, "scrollWidth": 57 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "ps//exa" }] }]
	}
}
```

### lines | fixed | p | - | long-word (2)

```json
{
	"font": "draw",
	"fontSize": 43,
	"mode": "text",
	"maxWidth": 369,
	"dom": { "w": 369, "h": 174, "scrollWidth": 369 },
	"native": { "w": 369, "h": 116, "scrollWidth": 369 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{ "type": "paragraph", "content": [{ "type": "text", "text": "ERyteKRtmjyxhPQnAAqmGHQuq" }] }
		]
	}
}
```

### wide | max-content | bulletList+listItem | - | - (2)

```json
{
	"font": "draw",
	"fontSize": 31,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 121.640625, "h": 126, "scrollWidth": 122 },
	"native": { "w": 122.70185852050781, "h": 126, "scrollWidth": 123 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [
							{ "type": "paragraph", "content": [] },
							{
								"type": "bulletList",
								"content": [
									{
										"type": "listItem",
										"content": [
											{ "type": "paragraph", "content": [] },
											{
												"type": "bulletList",
												"content": [
													{
														"type": "listItem",
														"content": [
															{ "type": "paragraph", "content": [{ "type": "text", "text": "o" }] }
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
}
```

### lines | note | h3 | - | empty (2)

```json
{
	"font": "sans",
	"fontSize": 18,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 0, "h": 10, "scrollWidth": 0 },
	"native": { "w": 0, "h": 43.431, "scrollWidth": 0 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "heading", "attrs": { "level": 3 }, "content": [] }]
	}
}
```

### wide | max-content | p | link | - (2)

```json
{
	"font": "sans",
	"fontSize": 44,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 56.765625, "h": 59, "scrollWidth": 57 },
	"native": { "w": 58.475982666015625, "h": 59, "scrollWidth": 58 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{
						"type": "text",
						"text": "Y",
						"marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }]
					},
					{ "type": "text", "text": "O" }
				]
			}
		]
	}
}
```

### wide | max-content | p | highlight | - (2)

```json
{
	"font": "draw",
	"fontSize": 49,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 79.15625, "h": 66, "scrollWidth": 79 },
	"native": { "w": 80.40898132324219, "h": 66, "scrollWidth": 80 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "M", "marks": [{ "type": "highlight" }] },
					{ "type": "text", "text": "Z" }
				]
			}
		]
	}
}
```

### wrap | max-content | bulletList+listItem | - | empty (2)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 33.390625, "h": 32, "scrollWidth": 33 },
	"native": { "w": 23.39999008178711, "h": 32, "scrollWidth": 23 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [{ "type": "listItem", "content": [{ "type": "paragraph" }] }]
			}
		]
	}
}
```

### wide | max-content | p | underline | - (1)

```json
{
	"font": "draw",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 28.421875, "h": 32, "scrollWidth": 28 },
	"native": { "w": 29.759979248046875, "h": 32, "scrollWidth": 30 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "z" },
					{ "type": "text", "text": "Y", "marks": [{ "type": "underline" }] }
				]
			}
		]
	}
}
```

### lines | fixed | bulletList+listItem | - | trailing-space+tab (1)

```json
{
	"font": "mono",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": 153,
	"dom": { "w": 153, "h": 96, "scrollWidth": 153 },
	"native": { "w": 153, "h": 128, "scrollWidth": 157 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [
							{ "type": "paragraph", "content": [] },
							{
								"type": "bulletList",
								"content": [
									{
										"type": "listItem",
										"content": [
											{ "type": "paragraph", "content": [] },
											{
												"type": "bulletList",
												"content": [
													{
														"type": "listItem",
														"content": [
															{
																"type": "paragraph",
																"content": [{ "type": "text", "text": "NOD \t " }]
															}
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
}
```

### lines | fixed | bulletList+listItem | - | trailing-space+punct (1)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": 35,
	"dom": { "w": 35, "h": 32, "scrollWidth": 44 },
	"native": { "w": 35, "h": 64, "scrollWidth": 44 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "… " }] }]
					}
				]
			}
		]
	}
}
```

### lines | note | p | code | trailing-space (1)

```json
{
	"font": "draw",
	"fontSize": 29,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 39, "scrollWidth": 168 },
	"native": { "w": 167, "h": 78, "scrollWidth": 168 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "vOxKzeFW" },
					{ "type": "text", "text": ", ", "marks": [{ "type": "code" }] }
				]
			}
		]
	}
}
```

### lines | note | p | - | - (1)

```json
{
	"font": "sans",
	"fontSize": 19,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 78, "scrollWidth": 171 },
	"native": { "w": 167, "h": 104, "scrollWidth": 170 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [{ "type": "text", "text": "OmABWtGBVrtrwm Uj Kclofmvp cjnvvn smwybpg Fji" }]
			}
		]
	}
}
```

### lines | boundary | p | bold+highlight | - (1)

```json
{
	"font": "draw",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": 45,
	"dom": { "w": 45, "h": 32, "scrollWidth": 45 },
	"native": { "w": 45, "h": 64, "scrollWidth": 45 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "v", "marks": [{ "type": "bold" }] },
					{ "type": "text", "text": "W" },
					{ "type": "text", "text": ";", "marks": [{ "type": "highlight" }] }
				]
			}
		]
	}
}
```

### lines | boundary | bulletList+listItem | - | leading-space+punct (1)

```json
{
	"font": "serif",
	"fontSize": 22,
	"mode": "text",
	"maxWidth": 45.46875,
	"dom": { "w": 45.46875, "h": 30, "scrollWidth": 45 },
	"native": { "w": 45.46875, "h": 60, "scrollWidth": 45 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": " →" }] }]
					}
				]
			}
		]
	}
}
```

### lines | fixed | p | bold | - (1)

```json
{
	"font": "serif",
	"fontSize": 20,
	"mode": "text",
	"maxWidth": 33,
	"dom": { "w": 33, "h": 189, "scrollWidth": 33 },
	"native": { "w": 33, "h": 162, "scrollWidth": 33 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "NIUkuBfDfM", "marks": [{ "type": "bold" }] },
					{ "type": "text", "text": "rzfh" }
				]
			}
		]
	}
}
```

### lines | boundary | bulletList+listItem | - | space-run+long-word+punct (1)

```json
{
	"font": "mono",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": 1074.59375,
	"dom": { "w": 1074.59375, "h": 32, "scrollWidth": 1075 },
	"native": { "w": 1074.59375, "h": 64, "scrollWidth": 1075 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [
							{
								"type": "paragraph",
								"content": [
									{
										"type": "text",
										"text": "tdzvjprob   qml 18540 dnpyhvlpsvwIagoardzuFqbQqADjuZCMTzcZAK C t    … uin"
									}
								]
							}
						]
					}
				]
			}
		]
	}
}
```

### lines | note | p | - | trailing-space+punct (1)

```json
{
	"font": "serif",
	"fontSize": 15,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 20, "scrollWidth": 169 },
	"native": { "w": 167, "h": 40, "scrollWidth": 169 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{ "type": "paragraph", "content": [{ "type": "text", "text": "mom/some/pathx=1ree " }] }
		]
	}
}
```

### lines | fixed | p | - | trailing-space+leading-space+tab (1)

```json
{
	"font": "serif",
	"fontSize": 36,
	"mode": "text",
	"maxWidth": 132,
	"dom": { "w": 132, "h": 49, "scrollWidth": 132 },
	"native": { "w": 132, "h": 98, "scrollWidth": 134 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "    Aigx \t " }] }]
	}
}
```

### wide | max-content | listItem+orderedList | - | - (1)

```json
{
	"font": "draw",
	"fontSize": 60,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 257.28125, "h": 810, "scrollWidth": 257 },
	"native": { "w": 258.3824806213379, "h": 810, "scrollWidth": 258 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "orderedList",
				"content": [
					{ "type": "listItem", "content": [{ "type": "paragraph", "content": [] }] },
					{ "type": "listItem", "content": [{ "type": "paragraph" }] },
					{ "type": "listItem", "content": [{ "type": "paragraph", "content": [] }] },
					{ "type": "listItem", "content": [{ "type": "paragraph", "content": [] }] },
					{ "type": "listItem", "content": [{ "type": "paragraph", "content": [] }] },
					{
						"type": "listItem",
						"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "dhqs" }] }]
					},
					{ "type": "listItem", "content": [{ "type": "paragraph", "content": [] }] },
					{ "type": "listItem", "content": [{ "type": "paragraph", "content": [] }] },
					{ "type": "listItem", "content": [{ "type": "paragraph", "content": [] }] },
					{ "type": "listItem", "content": [{ "type": "paragraph", "content": [] }] }
				]
			}
		]
	}
}
```

### lines | note | p | - | tab+long-word+punct (1)

```json
{
	"font": "mono",
	"fontSize": 20,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 162, "scrollWidth": 576 },
	"native": { "w": 167, "h": 189, "scrollWidth": 576 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{
						"type": "text",
						"text": "hQHVARKEsYIRURyjCMkTaHXQTpushiVTzkzXFXzsdfzaXgMJ foobima 62880 98858 oy fzjndr 87095 Hzhuau v — \t 91699 -"
					}
				]
			}
		]
	}
}
```

### lines | note | p | - | tab (1)

```json
{
	"font": "draw",
	"fontSize": 15,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 40, "scrollWidth": 167 },
	"native": { "w": 167, "h": 20, "scrollWidth": 167 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{ "type": "paragraph", "content": [{ "type": "text", "text": "zecktir \tIhrbeute od" }] }
		]
	}
}
```

### lines | note | p | code | - (1)

```json
{
	"font": "sans",
	"fontSize": 25,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 68, "scrollWidth": 170 },
	"native": { "w": 167, "h": 102, "scrollWidth": 170 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "WltaLXL" },
					{ "type": "text", "text": "83347 12541 27404", "marks": [{ "type": "code" }] }
				]
			}
		]
	}
}
```

### lines | note | p | - | trailing-space+long-word (1)

```json
{
	"font": "sans",
	"fontSize": 15,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 20, "scrollWidth": 168 },
	"native": { "w": 167, "h": 40, "scrollWidth": 168 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{ "type": "paragraph", "content": [{ "type": "text", "text": "GCyiHUmuXtjwKlpfOesv " }] }
		]
	}
}
```

### lines | fixed | p | - | url+punct (1)

```json
{
	"font": "draw",
	"fontSize": 18,
	"mode": "text",
	"maxWidth": 36,
	"dom": { "w": 36, "h": 312, "scrollWidth": 36 },
	"native": { "w": 36, "h": 288, "scrollWidth": 36 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [{ "type": "text", "text": "https://example.com/somepathx=1xylxp" }]
			}
		]
	}
}
```

### lines | fixed | bulletList+listItem | code | trailing-space+tab (1)

```json
{
	"font": "sans",
	"fontSize": 51,
	"mode": "text",
	"maxWidth": 297,
	"dom": { "w": 297, "h": 207, "scrollWidth": 297 },
	"native": { "w": 297, "h": 276, "scrollWidth": 297 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [
							{ "type": "paragraph", "content": [] },
							{
								"type": "bulletList",
								"content": [
									{
										"type": "listItem",
										"content": [
											{
												"type": "paragraph",
												"content": [
													{
														"type": "text",
														"text": "Rmnbwic dfqi \t",
														"marks": [{ "type": "code" }]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
}
```

### lines | note | h2 | - | empty (1)

```json
{
	"font": "sans",
	"fontSize": 31,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 0, "h": 10, "scrollWidth": 0 },
	"native": { "w": 0, "h": 77.775, "scrollWidth": 0 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [{ "type": "heading", "attrs": { "level": 2 }, "content": [] }]
	}
}
```

### lines | fixed | bulletList+listItem | - | trailing-space+tab+punct (1)

```json
{
	"font": "mono",
	"fontSize": 58,
	"mode": "text",
	"maxWidth": 593,
	"dom": { "w": 593, "h": 156, "scrollWidth": 593 },
	"native": { "w": 593, "h": 234, "scrollWidth": 600 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [
							{ "type": "paragraph", "content": [] },
							{
								"type": "bulletList",
								"content": [
									{
										"type": "listItem",
										"content": [
											{
												"type": "paragraph",
												"content": [{ "type": "text", "text": "aftny… ' sa \t " }]
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
}
```

### lines | note | p | code | space-run (1)

```json
{
	"font": "serif",
	"fontSize": 16,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 88, "scrollWidth": 168 },
	"native": { "w": 167, "h": 110, "scrollWidth": 168 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "cLRGNHHrrHrIBpgzL" },
					{
						"type": "text",
						"text": "     Ftchm fntio u Uvwskoeb   25095 wwdhcs 94845",
						"marks": [{ "type": "code" }]
					}
				]
			}
		]
	}
}
```

### lines | boundary | p | - | tab+long-word+punct (1)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": 1071.96875,
	"dom": { "w": 1071.96875, "h": 64, "scrollWidth": 1072 },
	"native": { "w": 1071.96875, "h": 32, "scrollWidth": 1074 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{
						"type": "text",
						"text": "- Lbhrvamh C Vnfzeuyimz GohoPShwNqSRPzfWPiIQKaWwfymZYkJigzQbNANz wtrbzjc\t\t cxpnuoo"
					}
				]
			}
		]
	}
}
```

### lines | note | p | bold | - (1)

```json
{
	"font": "draw",
	"fontSize": 32,
	"mode": "note",
	"maxWidth": 167,
	"dom": { "w": 167, "h": 86, "scrollWidth": 172 },
	"native": { "w": 167, "h": 129, "scrollWidth": 172 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "ybxuByXFb htt" },
					{ "type": "text", "text": "Wj Vls", "marks": [{ "type": "bold" }] }
				]
			}
		]
	}
}
```

### lines | fixed | p | bold | trailing-space+tab+space-run+punct (1)

```json
{
	"font": "draw",
	"fontSize": 36,
	"mode": "text",
	"maxWidth": 399,
	"dom": { "w": 399, "h": 98, "scrollWidth": 399 },
	"native": { "w": 399, "h": 147, "scrollWidth": 399 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "Pmhccyx     :" },
					{ "type": "text", "text": "Twfqvrpl … so Tgey \t", "marks": [{ "type": "bold" }] }
				]
			}
		]
	}
}
```

### lines | fixed | p | - | trailing-space+tab+punct (1)

```json
{
	"font": "draw",
	"fontSize": 18,
	"mode": "text",
	"maxWidth": 118,
	"dom": { "w": 118, "h": 72, "scrollWidth": 118 },
	"native": { "w": 118, "h": 96, "scrollWidth": 123 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [{ "type": "text", "text": "htps://examplecom/some/path?x=1  \t " }]
			}
		]
	}
}
```

### lines | fixed | bulletList+listItem | - | trailing-space (1)

```json
{
	"font": "sans",
	"fontSize": 44,
	"mode": "text",
	"maxWidth": 52,
	"dom": { "w": 52, "h": 59, "scrollWidth": 69 },
	"native": { "w": 52, "h": 118, "scrollWidth": 69 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "bulletList",
				"content": [
					{
						"type": "listItem",
						"content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "d " }] }]
					}
				]
			}
		]
	}
}
```

### wide | max-content | p | code | blank-line+tab (1)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 33.984375, "h": 32, "scrollWidth": 34 },
	"native": { "w": 44.5439453125, "h": 32, "scrollWidth": 45 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [{ "type": "text", "text": "  \t", "marks": [{ "type": "code" }] }]
			}
		]
	}
}
```

### wide | max-content | p | - | trailing-space+tab+url+punct (1)

```json
{
	"font": "serif",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 412.046875, "h": 32, "scrollWidth": 412 },
	"native": { "w": 413.3036804199219, "h": 32, "scrollWidth": 413 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [{ "type": "text", "text": "http://example.com/some/path?x=1\t" }]
			}
		]
	}
}
```

### wide | max-content | p | code | trailing-space+tab+long-word+url+punct (1)

```json
{
	"font": "draw",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 1201.875, "h": 33, "scrollWidth": 1202 },
	"native": { "w": 1218.335205078125, "h": 33, "scrollWidth": 1218 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{
						"type": "text",
						"text": "ighsbns r VnsnnxhAInIncAoNpyDiixpgZxqQRhb mqqbt https://example.com/some/path?x=1"
					},
					{ "type": "text", "text": "b Lyv \t", "marks": [{ "type": "code" }] }
				]
			}
		]
	}
}
```

### wide | max-content | p | code | trailing-space+tab+punct (1)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 33.984375, "h": 32, "scrollWidth": 34 },
	"native": { "w": 45.3118896484375, "h": 32, "scrollWidth": 45 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [{ "type": "text", "text": "… \t", "marks": [{ "type": "code" }] }]
			}
		]
	}
}
```

### wide | max-content | p | code | trailing-space+leading-space+tab (1)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 67.96875, "h": 32, "scrollWidth": 68 },
	"native": { "w": 79.29580688476562, "h": 32, "scrollWidth": 79 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": " " },
					{ "type": "text", "text": "  ' \t", "marks": [{ "type": "code" }] }
				]
			}
		]
	}
}
```

### wrap | max-content | p | highlight | - (1)

```json
{
	"font": "draw",
	"fontSize": 44,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 164, "h": 59, "scrollWidth": 164 },
	"native": { "w": 162.8439483642578, "h": 59, "scrollWidth": 163 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{ "type": "text", "text": "g" },
					{ "type": "text", "text": "JMGE", "marks": [{ "type": "highlight" }] }
				]
			}
		]
	}
}
```

### wide | max-content | p | link | punct (1)

```json
{
	"font": "sans",
	"fontSize": 32,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 29.046875, "h": 43, "scrollWidth": 29 },
	"native": { "w": 30.335983276367188, "h": 43, "scrollWidth": 30 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{
						"type": "text",
						"text": "k",
						"marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }]
					},
					{ "type": "text", "text": "-" }
				]
			}
		]
	}
}
```

### wide | max-content | p | code | trailing-space+leading-space+tab+long-word (1)

```json
{
	"font": "sans",
	"fontSize": 24,
	"mode": "text",
	"maxWidth": null,
	"dom": { "w": 770.3125, "h": 32, "scrollWidth": 770 },
	"native": { "w": 781.6300964355469, "h": 32, "scrollWidth": 782 },
	"routing": "native",
	"doc": {
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{
						"type": "text",
						"text": "  ; dFzWPrnYANxYzoUDwRXjReAAnkTFuZxpoFttYTCHkNSVNRIl \t",
						"marks": [{ "type": "code" }]
					}
				]
			}
		]
	}
}
```
