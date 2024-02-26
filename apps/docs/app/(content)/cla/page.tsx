import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { getDb } from '@/utils/ContentDatabase'

export default async function ClaPage() {
	const db = await getDb()
	const sidebar = await db.getSidebarContentList({})

	return (
		<>
			<Header />
			<Sidebar {...sidebar} />
			<main className="main-content article">
				<div className="page-header">
					<h1>Contributor License Agreement</h1>
				</div>
				<h4>Version 1.0 — June 8th 2023</h4>
				<p>
					In order to clarify the intellectual property license granted with Contributions from any
					person, tldraw, Inc. (“tldraw”) must have a Contributor License Agreement on file that has
					been signed by each contributor, indicating agreement to the license terms below. This
					license is for Your protection as a contributor as well as the protection of tldraw; it
					does not change your rights to use Your own contributions for any other purpose.
				</p>
				<p>
					You accept and agree to the following terms and conditions for Your Contributions (present
					and future) that you submit to tldraw. Except for the license granted herein to tldraw,
					You reserve all right, title, and interest in and to Your Contributions.{' '}
				</p>
				<p>1. Definitions. </p>
				<p>"You" (or "Your") means the individual identified above. </p>
				<p>
					"Contribution" means any original work of authorship, including any modifications or
					additions to an existing work, that is intentionally submitted by You to tldraw for
					inclusion in, or documentation of, any of the products owned or managed by tldraw (each, a
					"Work"). For the purposes of this definition, "submitted" means any form of electronic,
					verbal, or written communication sent to tldraw or its representatives, including but not
					limited to communication on electronic mailing lists, source code control systems, and
					issue tracking systems that are managed by, or on behalf of, tldraw for the purpose of
					discussing and improving the Works, but excluding communication that is conspicuously
					marked or otherwise designated in writing by You as "Not a Contribution."{' '}
				</p>
				<p>
					2. Grant of Copyright License. You hereby grant to tldraw a perpetual, worldwide,
					non-exclusive, sublicensable (through multiple tiers), no-charge, royalty-free,
					irrevocable copyright license to reproduce, prepare derivative works of, publicly display,
					publicly perform, distribute, and otherwise exploit Your Contributions and such derivative
					works.{' '}
				</p>
				<p>
					3. Grant of Patent License. You hereby grant to tldraw a perpetual, worldwide,
					non-exclusive, sublicensable (through multiple tiers), no-charge, royalty-free,
					irrevocable patent license to make, have made, use, offer to sell, sell, import, and
					otherwise transfer and exploit the Works, where such license applies only to those patent
					claims licensable by You that are necessarily infringed by Your Contribution(s) alone or
					by combination of Your Contribution(s) with the Works to which such Contribution(s) was
					submitted.{' '}
				</p>
				<p>
					4. You represent that you are legally entitled to grant the above license. If your
					employer(s) has rights to intellectual property that you create that includes your
					Contributions, you represent that you have received permission to make Contributions on
					behalf of that employer, that your employer has waived in writing any rights it may have
					in Your Contributions to tldraw, or that your employer has executed a separate Corporate
					CLA with tldraw.{' '}
				</p>
				<p>
					5. You represent that each of Your Contributions is Your original creation and does not
					incorporate any material created by others. You represent that Your Contribution
					submissions include complete details of any patents or copyrights which are associated
					with any part of Your Contributions.{' '}
				</p>
				<p>
					6. You are not expected to provide support for Your Contributions, except to the extent
					You desire to provide support. You may provide support for free, for a fee, or not at all.
					Unless required by applicable law or agreed to in writing, You provide Your Contributions
					on an "as is" basis, without warranties or conditions of any kind, either express or
					implied, including, without limitation, any warranties or conditions of title,
					non-infringement, merchantability, or fitness for a particular purpose.{' '}
				</p>
				<p>
					7. You agree to notify tldraw of any facts or circumstances of which you become aware (now
					or in the future) that would make Your representations in this Agreement inaccurate in any
					respect.
				</p>
				<p>
					8. You acknowledge that tldraw owns all right, title, and interest in and to the Works.
					Notwithstanding the foregoing, tldraw’s subsidiary, tldraw GB limited (the “Subsidiary”),
					is the beneficial owner of the Works, and tldraw will sublicense its rights in your
					Contributions under this Agreement to the Subsidiary in furtherance of the Subsidiary’s
					status as beneficial owner of the Works.
				</p>
				<p>
					9. This Agreement is governed by the laws of Delaware, and the parties consent to
					exclusive jurisdiction in the courts sitting in Delaware. The parties waive all defenses
					of lack of personal jurisdiction and forum non-conveniens.
				</p>
				<p>
					10. Entire Agreement/Assignment. This Agreement is the entire agreement between the
					parties, and supersedes any and all prior agreements, understandings or communications,
					written or oral, between the parties relating to the subject matter hereof. This Agreement
					may be assigned by tldraw without Your prior consent.{' '}
				</p>
				<hr />
				<p>
					Questions or concerns? Email <a href="mailto:sales@tldraw.com">sales@tldraw.com.</a>
				</p>
			</main>
		</>
	)
}
