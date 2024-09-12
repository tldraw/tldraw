import { parseMarkdown } from './parse-markdown'

test('approximately', () => {
	expect(
		parseMarkdown(
			`
Whether two [numbers](/link) numbers a and b are approximately equal.


<CodeLinks links={{}}>

\`\`\`ts
function approximately(a: number, b: number, precision?: number): boolean
\`\`\`

</CodeLinks>

<ApiHeading>Parameters</ApiHeading>

<ParametersTable>

<ParametersTableRow>
<ParametersTableName>

\`a\`

</ParametersTableName>
<ParametersTableDescription>

<CodeLinks links={{}}>

\`\`\`ts
number
\`\`\`

</CodeLinks>

The first point.




</ParametersTableDescription>
</ParametersTableRow>
<ParametersTableRow>
<ParametersTableName>

\`b\`

</ParametersTableName>
<ParametersTableDescription>

<CodeLinks links={{}}>

\`\`\`ts
number
\`\`\`

</CodeLinks>

The second point.




</ParametersTableDescription>
</ParametersTableRow>
<ParametersTableRow>
<ParametersTableName>

\`precision\`

</ParametersTableName>
<ParametersTableDescription>

<CodeLinks links={{}}>

\`\`\`ts
number
\`\`\`

</CodeLinks>



</ParametersTableDescription>
</ParametersTableRow>
</ParametersTable>

<ApiHeading>Returns</ApiHeading>

<CodeLinks links={{}}>

\`\`\`ts
boolean
\`\`\`

</CodeLinks>

`,
			'test'
		)
	).toMatchInlineSnapshot(`
		{
		  "allContentText": "Whether two numbers numbers a and b are approximately equal. Parameters: a (The first point), b (The second point), precision. ",
		  "headings": [],
		  "initialContentText": "Whether two numbers numbers a and b are approximately equal. Parameters: a (The first point), b (The second point), precision. ",
		}
	`)
})

test('BaseRecord', () => {
	expect(
		parseMarkdown(
			`
<details className="article__table-of-contents">
	<summary>Table of contents</summary>
  - [id](#id)
  - [typeName](#typeName)
- [Properties](#properties)
</details>

The base record that all records must extend.


<CodeLinks links={{"RecordId":"/reference/store/RecordId","UnknownRecord":"/reference/store/UnknownRecord"}}>

\`\`\`ts
interface BaseRecord<
  TypeName extends string,
  Id extends RecordId<UnknownRecord>,
> {}
\`\`\`

</CodeLinks>

---

## Properties

<ApiMemberTitle tags={["readonly"]} inherited={null}>

### id

</ApiMemberTitle>
<CodeLinks links={{}}>

\`\`\`ts
readonly id: Id
\`\`\`

</CodeLinks>

---

<ApiMemberTitle tags={["readonly"]} inherited={null}>

### typeName

</ApiMemberTitle>
<CodeLinks links={{}}>

\`\`\`ts
readonly typeName: TypeName
\`\`\`

</CodeLinks>

---

`,
			'test'
		)
	).toMatchInlineSnapshot(`
		{
		  "allContentText": "The base record that all records must extend. Properties id typeName",
		  "headings": [
		    {
		      "contentText": "",
		      "isInherited": false,
		      "level": 2,
		      "slug": "Properties",
		      "title": "Properties",
		    },
		    {
		      "contentText": "",
		      "isInherited": false,
		      "level": 3,
		      "slug": "id",
		      "title": "id",
		    },
		    {
		      "contentText": "",
		      "isInherited": false,
		      "level": 3,
		      "slug": "typeName",
		      "title": "typeName",
		    },
		  ],
		  "initialContentText": "The base record that all records must extend.",
		}
	`)
})

test('TLAssetStore', () => {
	expect(
		parseMarkdown(
			`
<details className="article__table-of-contents">
	<summary>Table of contents</summary>
- [Methods](#methods)
  - [resolve](#resolve)
  - [upload](#upload)
</details>

A \`TLAssetStore\` sits alongside the main [TLStore](/reference/tlschema/TLStore) and is responsible for storing and
retrieving large assets such as images. Generally, this should be part of a wider sync system:


- By default, the store is in-memory only, so \`TLAssetStore\` converts images to data URLs
- When using
 [\`persistenceKey\`](/reference/editor/TldrawEditorWithoutStoreProps#persistenceKey), the
 store is synced to the browser's local IndexedDB, so \`TLAssetStore\` stores images there too
- When using a multiplayer sync server, you would implement \`TLAssetStore\` to upload images to
 e.g. an S3 bucket.


<CodeLinks links={{}}>

\`\`\`ts
interface TLAssetStore {}
\`\`\`

</CodeLinks>

---

## Methods

<ApiMemberTitle tags={["optional"]} inherited={null}>

### resolve

</ApiMemberTitle>
Resolve an asset to a URL. This is used when rendering the asset in the editor. By default,
this will just use \`asset.props.src\`, the URL returned by \`upload()\`. This can be used to
rewrite that URL to add access credentials, or optimized the asset for how it's currently
being displayed using the [information provided](/reference/tlschema/TLAssetContext).


<ApiHeading>Parameters</ApiHeading>

<ParametersTable>

<ParametersTableRow>
<ParametersTableName>

\`asset\`

</ParametersTableName>
<ParametersTableDescription>

<CodeLinks links={{"TLAsset":"/reference/tlschema/TLAsset"}}>

\`\`\`ts
TLAsset
\`\`\`

</CodeLinks>

the asset being resolved




</ParametersTableDescription>
</ParametersTableRow>
<ParametersTableRow>
<ParametersTableName>

\`ctx\`

</ParametersTableName>
<ParametersTableDescription>

<CodeLinks links={{"TLAssetContext":"/reference/tlschema/TLAssetContext"}}>

\`\`\`ts
TLAssetContext
\`\`\`

</CodeLinks>

information about the current environment and where the asset is being used




</ParametersTableDescription>
</ParametersTableRow>
</ParametersTable>

<ApiHeading>Returns</ApiHeading>

<CodeLinks links={{}}>

\`\`\`ts
null | Promise<null | string> | string
\`\`\`

</CodeLinks>

 The URL of the resolved asset, or \`null\` if the asset is not available


---

<ApiMemberTitle tags={[]} inherited={null}>

### upload

</ApiMemberTitle>
Upload an asset to your storage, returning a URL that can be used to refer to the asset
long-term.


<ApiHeading>Parameters</ApiHeading>

<ParametersTable>

<ParametersTableRow>
<ParametersTableName>

\`asset\`

</ParametersTableName>
<ParametersTableDescription>

<CodeLinks links={{"TLAsset":"/reference/tlschema/TLAsset"}}>

\`\`\`ts
TLAsset
\`\`\`

</CodeLinks>

Information & metadata about the asset being uploaded




</ParametersTableDescription>
</ParametersTableRow>
<ParametersTableRow>
<ParametersTableName>

\`file\`

</ParametersTableName>
<ParametersTableDescription>

<CodeLinks links={{}}>

\`\`\`ts
File
\`\`\`

</CodeLinks>

The \`File\` to be uploaded




</ParametersTableDescription>
</ParametersTableRow>
</ParametersTable>

<ApiHeading>Returns</ApiHeading>

<CodeLinks links={{}}>

\`\`\`ts
Promise<string>
\`\`\`

</CodeLinks>

 A promise that resolves to the URL of the uploaded asset


---
`,
			'test'
		)
	).toMatchInlineSnapshot(`
		{
		  "allContentText": "A TLAssetStore sits alongside the main TLStore and is responsible for storing and retrieving large assets such as images. Generally, this should be part of a wider sync system: By default, the store is in-memory only, so TLAssetStore converts images to data URLs When using persistenceKey, the store is synced to the browser's local IndexedDB, so TLAssetStore stores images there too When using a multiplayer sync server, you would implement TLAssetStore to upload images to e.g. an S3 bucket. Methods resolve Resolve an asset to a URL. This is used when rendering the asset in the editor. By default, this will just use asset.props.src, the URL returned by upload(). This can be used to rewrite that URL to add access credentials, or optimized the asset for how it's currently being displayed using the information provided. Parameters: asset (the asset being resolved), ctx (information about the current environment and where the asset is being used). Returns: The URL of the resolved asset, or null if the asset is not available upload Upload an asset to your storage, returning a URL that can be used to refer to the asset long-term. Parameters: asset (Information & metadata about the asset being uploaded), file (The File to be uploaded). Returns: A promise that resolves to the URL of the uploaded asset",
		  "headings": [
		    {
		      "contentText": "",
		      "isInherited": false,
		      "level": 2,
		      "slug": "Methods",
		      "title": "Methods",
		    },
		    {
		      "contentText": "Resolve an asset to a URL. This is used when rendering the asset in the editor. By default, this will just use asset.props.src, the URL returned by upload(). This can be used to rewrite that URL to add access credentials, or optimized the asset for how it's currently being displayed using the information provided. Parameters: asset (the asset being resolved), ctx (information about the current environment and where the asset is being used). Returns: The URL of the resolved asset, or null if the asset is not available",
		      "isInherited": false,
		      "level": 3,
		      "slug": "resolve",
		      "title": "resolve",
		    },
		    {
		      "contentText": "Upload an asset to your storage, returning a URL that can be used to refer to the asset long-term. Parameters: asset (Information & metadata about the asset being uploaded), file (The File to be uploaded). Returns: A promise that resolves to the URL of the uploaded asset",
		      "isInherited": false,
		      "level": 3,
		      "slug": "upload",
		      "title": "upload",
		    },
		  ],
		  "initialContentText": "A TLAssetStore sits alongside the main TLStore and is responsible for storing and retrieving large assets such as images. Generally, this should be part of a wider sync system: By default, the store is in-memory only, so TLAssetStore converts images to data URLs When using persistenceKey, the store is synced to the browser's local IndexedDB, so TLAssetStore stores images there too When using a multiplayer sync server, you would implement TLAssetStore to upload images to e.g. an S3 bucket.",
		}
	`)
})
