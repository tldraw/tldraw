import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { getDb } from '@/utils/ContentDatabase'

export default async function LicensePage() {
	const db = await getDb()
	const sidebar = await db.getSidebarContentList({})

	return (
		<>
			<Header />
			<Sidebar {...sidebar} />
			<main className="article">
				<div className="page-header">
					<h1>tldraw License</h1>
				</div>
				<p>
					This License governs use of the accompanying Software, and your use of the Software
					constitutes acceptance of this license.
				</p>
				<p>
					You may use this Software for any non-commercial purpose, subject to the restrictions in
					this license. Some purposes which can be non- commercial are teaching, academic research,
					and personal experimentation.
				</p>
				<p>
					You may not use or distribute this Software or any derivative works in any form for
					commercial purposes. Examples of commercial purposes would be running business operations,
					licensing, leasing, or selling the Software, distributing the Software for use with
					commercial products or for internal products within commercial entities, or otherwise
					using the Software in any way that provides you with a commercial benefit.
				</p>
				<p>To purchase an alternative license for commercial use, contact sales@tldraw.com.</p>
				<p>
					Subject to your compliance with the restrictions and obligations in this License, you may
					modify this Software and distribute the modified Software for non-commercial purposes,
					however, you may not grant rights to the Software or derivative works that are broader
					than those provided by this License. For example, you may not distribute modifications of
					the Software under terms that provide a commercial benefit to you, permit commercial use,
					or under terms that purport to require the Software or derivative works to be sublicensed
					to others.
				</p>
				<p>In return for these conditions of use, you agree:</p>
				<p>Not to remove any copyright or other notices from the Software.</p>
				<p>
					That if you distribute the Software in source or object form, you will include a verbatim
					copy of this license.
				</p>
				<p>
					That if you distribute derivative works of the Software in source code form you do so only
					under a license that includes all of the provisions of this License, and if you distribute
					derivative works of the Software solely in object form you must make the source code form
					available upon request and do so only under a license that complies with this License.
				</p>
				<p>
					That that the word "tldraw" shall not be used to refer to any derivative works of the
					Software except in the phrase "Based on the tldraw library (https://tldraw.com)", provided
					such phrase is not used to promote the derivative works or to imply that tldraw endorses
					you or the derivative works.
				</p>
				<p>
					THAT THE SOFTWARE COMES "AS IS", WITH NO WARRANTIES. THIS MEANS NO EXPRESS, IMPLIED OR
					STATUTORY WARRANTY, INCLUDING WITHOUT LIMITATION, WARRANTIES OF MERCHANTABILITY OR FITNESS
					FOR A PARTICULAR PURPOSE OR ANY WARRANTY OF TITLE OR NON-INFRINGEMENT. ALSO, YOU MUST PASS
					THIS DISCLAIMER ON WHENEVER YOU DISTRIBUTE THE SOFTWARE OR DERIVATIVE WORKS.
				</p>
				<p>
					THAT TLDRAW WILL NOT BE LIABLE FOR ANY DAMAGES RELATED TO THE SOFTWARE OR THIS LICENSE,
					INCLUDING DIRECT, INDIRECT, SPECIAL, CONSEQUENTIAL OR INCIDENTAL DAMAGES, TO THE MAXIMUM
					EXTENT THE LAW PERMITS, NO MATTER WHAT LEGAL THEORY IT IS BASED ON. ALSO, YOU MUST PASS
					THIS LIMITATION OF LIABILITY ON WHENEVER YOU DISTRIBUTE THE SOFTWARE OR DERIVATIVE WORKS.
				</p>
				<p>
					That if you sue anyone over patents that you think may apply to the Software or anyones
					use of the Software, your license to the Software ends automatically.
				</p>
				<p>That your rights under the License end automatically if you breach it in any way.</p>
				<p>tldraw reserves all rights not expressly granted to you in this license.</p>
				<hr />
				<p>
					Questions? Email <a href="mailto:sales@tldraw.com">sales@tldraw.com.</a>
				</p>
			</main>
		</>
	)
}
