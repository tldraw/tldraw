import { SerializedSchemaV1, upgradeSchema } from '../StoreSchema'

describe('upgradeSchema', () => {
	it('should upgrade a schema from v1 to v2, assuming its working with tldraw data', () => {
		const v1: SerializedSchemaV1 = {
			schemaVersion: 1,
			storeVersion: 4,
			recordVersions: {
				asset: {
					version: 1,
					subTypeKey: 'type',
					subTypeVersions: { image: 2, video: 2, bookmark: 0 },
				},
				camera: { version: 1 },
				document: { version: 2 },
				instance: { version: 22 },
				instance_page_state: { version: 5 },
				page: { version: 1 },
				shape: {
					version: 3,
					subTypeKey: 'type',
					subTypeVersions: {
						group: 0,
						text: 1,
						bookmark: 1,
						draw: 1,
						geo: 7,
						note: 4,
						line: 1,
						frame: 0,
						arrow: 1,
						highlight: 0,
						embed: 4,
						image: 2,
						video: 1,
					},
				},
				instance_presence: { version: 5 },
				pointer: { version: 1 },
			},
		}

		expect(upgradeSchema(v1)).toMatchInlineSnapshot(`
		{
		  "schemaVersion": 2,
		  "sequences": {
		    "com.tldraw.asset": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.asset.bookmark": {
		      "retroactive": false,
		      "version": 0,
		    },
		    "com.tldraw.asset.image": {
		      "retroactive": false,
		      "version": 2,
		    },
		    "com.tldraw.asset.video": {
		      "retroactive": false,
		      "version": 2,
		    },
		    "com.tldraw.camera": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.document": {
		      "retroactive": false,
		      "version": 2,
		    },
		    "com.tldraw.instance": {
		      "retroactive": false,
		      "version": 22,
		    },
		    "com.tldraw.instance_page_state": {
		      "retroactive": false,
		      "version": 5,
		    },
		    "com.tldraw.instance_presence": {
		      "retroactive": false,
		      "version": 5,
		    },
		    "com.tldraw.page": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.pointer": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.shape": {
		      "retroactive": false,
		      "version": 3,
		    },
		    "com.tldraw.shape.arrow": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.shape.bookmark": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.shape.draw": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.shape.embed": {
		      "retroactive": false,
		      "version": 4,
		    },
		    "com.tldraw.shape.frame": {
		      "retroactive": false,
		      "version": 0,
		    },
		    "com.tldraw.shape.geo": {
		      "retroactive": false,
		      "version": 7,
		    },
		    "com.tldraw.shape.group": {
		      "retroactive": false,
		      "version": 0,
		    },
		    "com.tldraw.shape.highlight": {
		      "retroactive": false,
		      "version": 0,
		    },
		    "com.tldraw.shape.image": {
		      "retroactive": false,
		      "version": 2,
		    },
		    "com.tldraw.shape.line": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.shape.note": {
		      "retroactive": false,
		      "version": 4,
		    },
		    "com.tldraw.shape.text": {
		      "retroactive": false,
		      "version": 1,
		    },
		    "com.tldraw.shape.video": {
		      "retroactive": false,
		      "version": 1,
		    },
		  },
		}
	`)
	})
})
