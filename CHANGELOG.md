# v3.12.0 (Tue Apr 15 2025)

### Release Notes

#### events: explore using getCoalescedEvents, take 2 ([#5898](https://github.com/tldraw/tldraw/pull/5898))

- Improve draw fluidity on slower CPUs by using getCoalescedEvents.

#### a11y: add null check for bookmark asset descriptor ([#5900](https://github.com/tldraw/tldraw/pull/5900))

- Fix NPE for asset check in BookmarkShapeUtil

#### fix error pasting shapes from Miro, pt 2 ([#5896](https://github.com/tldraw/tldraw/pull/5896))

- Fix blowing up when pasting Miro shapes into tldraw.

#### Revert "events: explore using getCoalescedEvents (#5554)" ([#5895](https://github.com/tldraw/tldraw/pull/5895))

- Revert coalesced events for now until we investigate further.

#### events: fix wrong contentEditable check ([#5888](https://github.com/tldraw/tldraw/pull/5888))

- Fix regression of iPad Pencil drawing in certain cases.

#### youtube: fix up timestamp ([#5893](https://github.com/tldraw/tldraw/pull/5893))

- Followup fix for YouTube embed support for time

#### stickies: fix our text tweaks on dotcom ([#5878](https://github.com/tldraw/tldraw/pull/5878))

- fix up stickies on dotco

#### rich text: export some of our custom extensions ([#5874](https://github.com/tldraw/tldraw/pull/5874))

- Export some of the custom rich text extensions we have by default to enable inclusion in custom extension lists.

#### a11y: add resize kbd shortcut ([#5826](https://github.com/tldraw/tldraw/pull/5826))

- a11y: add resize kbd shortcut

#### kbd: rework keyboard shortcut mapping symbols to be more intuitive ([#5605](https://github.com/tldraw/tldraw/pull/5605))

Breaking change: our keyboard shortcuts no longer use `$`/`!`/`?` but instead use `accel`/`shift`/`alt`, respectively.
- Rework keyboard shortcut mapping symbols to be more intuitive

#### fix: install corepack from npm ([#5865](https://github.com/tldraw/tldraw/pull/5865))

- Installs corepack globally instead of enabling it from Node.js

#### Fix `useIsToolSelected`, add remove tool example ([#5849](https://github.com/tldraw/tldraw/pull/5849))

- Fixed a bug with `useIsToolSelected`
- Adds example for removing a tool

#### a11y: add keyboard shortcut items; fix up focus ring in dotcom menus ([#5852](https://github.com/tldraw/tldraw/pull/5852))

- Add accessibility section to keyboard shortcuts dialog.

#### a11y: more role updates, more semantic html5 tags ([#5847](https://github.com/tldraw/tldraw/pull/5847))

- a11y: tweak `role`s for certain UI components

#### a11y: fix up watermark regression ([#5848](https://github.com/tldraw/tldraw/pull/5848))

- Fix mobile watermark.

#### a11y: add axe to be able to do audits ([#5840](https://github.com/tldraw/tldraw/pull/5840))

- a11y: add axe to be able to do audits

#### a11y: announce shapes as they're visited ([#5773](https://github.com/tldraw/tldraw/pull/5773))

- a11y: announce shapes as they're visited

#### Add dedicated search page ([#5719](https://github.com/tldraw/tldraw/pull/5719))

- Docs: Added full page search.

#### Fix typo in Local Images example ([#5774](https://github.com/tldraw/tldraw/pull/5774))

n/a

#### Rename useIsMultiplayer.ts to useCollaborationStatus  [#5833] ([#5835](https://github.com/tldraw/tldraw/pull/5835))

Renamed the useIsMultiplayer hook to useCollaborationStatus for better clarity and consistency around naming related to collaboration features.
This affects internal imports only — no changes required for SDK consumers.

#### A11y focus button fixes ([#5825](https://github.com/tldraw/tldraw/pull/5825))

- no fixes to public code

#### Store.atomic and Store.mergeRemoteChanges fixes ([#5801](https://github.com/tldraw/tldraw/pull/5801))

- Make `store.mergeRemoteChanges` atomic. This allows after* side effects to react to incoming changes and to propagate any effects to other clients via `'user'`-scoped store change events.

#### a11y: navigable shapes ([#5761](https://github.com/tldraw/tldraw/pull/5761))

- a11y: navigable shapes using Tab and Cmd/Ctrl+Arrow

#### Geometry2d Improvements ([#5754](https://github.com/tldraw/tldraw/pull/5754))

- It's now easier to work with `Geometry2d` objects, with methods for intersections, transforming geometries, and filtering.

#### images: fix not being able to insert SVGs into Firefox ([#5789](https://github.com/tldraw/tldraw/pull/5789))

- Fix not being able to insert SVGs into Firefox

#### Fix unexpected artefacts showing up in exports when the page includes tailwind ([#5792](https://github.com/tldraw/tldraw/pull/5792))

- Prevent unexpected visual issues in exports from pages that include tailwindcss

#### isShapeHidden => getShapeVisibility, to allow children of hidden shapes to be visible ([#5762](https://github.com/tldraw/tldraw/pull/5762))

- Allow the children of a hidden shape to show themselves by returning a 'force_show' override from the `isShapeHidden` predicate.

#### Make image pasting atomic ([#5800](https://github.com/tldraw/tldraw/pull/5800))

- Cleans up image creation side effects, coalescing create + update effects into a single create effect.

#### Docs: Add slash keyboard shortcut to open search ([#5785](https://github.com/tldraw/tldraw/pull/5785))

- Docs: The slash key now opens search (in addition to the existing Cmd+K shortcut).

#### fix error pasting shapes from Miro ([#5790](https://github.com/tldraw/tldraw/pull/5790))

- Fix blowing up when pasting Miro shapes into tldraw.

#### fix zoom speed for pinch gestures ([#5771](https://github.com/tldraw/tldraw/pull/5771))

- Setting `zoomSpeed` in camera options no longer breaks zooming on safari trackpads and multitouch pinch to zoom.

#### a11y: add a live region to announce selected tools ([#5634](https://github.com/tldraw/tldraw/pull/5634))

- Adds better voiceover support when selecting an action (a11y)

#### events: explore using getCoalescedEvents ([#5554](https://github.com/tldraw/tldraw/pull/5554))

- Improve draw fluidity on slower CPUs by using getCoalescedEvents.

#### Not preload empty `embedIcons` ([#5736](https://github.com/tldraw/tldraw/pull/5736))

- Allow to remove unused `embedIcons` from preload

#### people menu: fix overflow and follow buttons ([#5753](https://github.com/tldraw/tldraw/pull/5753))

- Fix people menu CSS.

#### fix translation perf regression from rich text font detection ([#5743](https://github.com/tldraw/tldraw/pull/5743))

- Fix a performance regression when dragging many shapes at the same time.

#### Cache the fonts extracted from rich text. ([#5735](https://github.com/tldraw/tldraw/pull/5735))

- Improved performance while editing many geo shapes or text shapes.

#### When editing a text shape, don't mount the text editor for non-editing empty shapes unless they're hovered ([#5734](https://github.com/tldraw/tldraw/pull/5734))

- Fixed a bug causing a performance delay when editing text.

#### Add Frame colors ([#5283](https://github.com/tldraw/tldraw/pull/5283))

- Added `FrameShapeUtil.options.showColors` option to display colors for frames.

#### Fix Group2d `getSvgPathData()` missing move markers ([#5580](https://github.com/tldraw/tldraw/pull/5580))

- Fixed a bug with `Group2D.getSvgPathData()` so that children in the resulting SVG have their starting points defined correctly.

#### embed: youtube support time and loop ([#5726](https://github.com/tldraw/tldraw/pull/5726))

- Add YouTube support for t/start/loop params.

#### Generate `llms.txt` files ([#5688](https://github.com/tldraw/tldraw/pull/5688))

- Docs: Added `tldraw.dev/llms.txt`, `tldraw.dev/llms-full.txt`, `tldraw.dev/llms-examples.txt` and `tldraw.dev/llms-docs.txt` files to be used with LLMs. Point your model to it, or download it and upload it as a file to something like Gemini or ChatGPT.

#### Add & fix missing state docs ([#5696](https://github.com/tldraw/tldraw/pull/5696))

- Docs: Added more docs to the `@tldraw/state` and `@tldraw/state-react` API reference,

---

#### 🐛 Bug Fix

- Add ShapeUtil.configure example [#5853](https://github.com/tldraw/tldraw/pull/5853) ([@ds300](https://github.com/ds300))
- [automated] update i18n strings [#5886](https://github.com/tldraw/tldraw/pull/5886) ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@mimecuvalo](https://github.com/mimecuvalo) [@github-actions[bot]](https://github.com/github-actions[bot]))
- Add vs code option. [#5879](https://github.com/tldraw/tldraw/pull/5879) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix custom mutators deploy [#5876](https://github.com/tldraw/tldraw/pull/5876) ([@ds300](https://github.com/ds300))
- stickies: fix our text tweaks on dotcom [#5878](https://github.com/tldraw/tldraw/pull/5878) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update clickup case study [#5873](https://github.com/tldraw/tldraw/pull/5873) ([@TodePond](https://github.com/TodePond))
- Fix landing page issues [#5868](https://github.com/tldraw/tldraw/pull/5868) ([@TodePond](https://github.com/TodePond))
- Fix case sensitive gif [#5867](https://github.com/tldraw/tldraw/pull/5867) ([@TodePond](https://github.com/TodePond))
- fix: install corepack from npm [#5865](https://github.com/tldraw/tldraw/pull/5865) ([@trivikr](https://github.com/trivikr))
- Fix hero period in announcement [#5862](https://github.com/tldraw/tldraw/pull/5862) ([@steveruizok](https://github.com/steveruizok))
- series a announcement [#5838](https://github.com/tldraw/tldraw/pull/5838) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- [dotcom] Fix indicator/selection skew at some browser zoom levels. [#5851](https://github.com/tldraw/tldraw/pull/5851) ([@ds300](https://github.com/ds300))
- fix examples [#5843](https://github.com/tldraw/tldraw/pull/5843) ([@SomeHats](https://github.com/SomeHats))
- Add dedicated search page [#5719](https://github.com/tldraw/tldraw/pull/5719) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Landing page tweaks 3 [#5756](https://github.com/tldraw/tldraw/pull/5756) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- Update quick-start.mdx [#5836](https://github.com/tldraw/tldraw/pull/5836) ([@SomeHats](https://github.com/SomeHats))
- fix github workflow sometimes using sh instead of bash [#5791](https://github.com/tldraw/tldraw/pull/5791) ([@mimecuvalo](https://github.com/mimecuvalo))
- Docs: Add slash keyboard shortcut to open search [#5785](https://github.com/tldraw/tldraw/pull/5785) ([@TodePond](https://github.com/TodePond))
- Better no results page [#5784](https://github.com/tldraw/tldraw/pull/5784) ([@TodePond](https://github.com/TodePond))
- Don't include json files in llms.txt outputs [#5763](https://github.com/tldraw/tldraw/pull/5763) ([@TodePond](https://github.com/TodePond))
- prevent boot concurrency again [#5747](https://github.com/tldraw/tldraw/pull/5747) ([@ds300](https://github.com/ds300))
- Copy changes from hotfixes branch [#5744](https://github.com/tldraw/tldraw/pull/5744) ([@ds300](https://github.com/ds300))
- [dotcom backend] Wrap writeDataPoint in try/catch to make it safe [#5739](https://github.com/tldraw/tldraw/pull/5739) ([@ds300](https://github.com/ds300))
- Dot dev: Fix menu bar overlapping content [#5738](https://github.com/tldraw/tldraw/pull/5738) ([@TodePond](https://github.com/TodePond))
- Revert "examples: make nav not do full page reload (#5677)" [#5724](https://github.com/tldraw/tldraw/pull/5724) ([@mimecuvalo](https://github.com/mimecuvalo))
- Use pg message bus for requesting lsn update [#5722](https://github.com/tldraw/tldraw/pull/5722) ([@ds300](https://github.com/ds300))
- Generate `llms.txt` files [#5688](https://github.com/tldraw/tldraw/pull/5688) ([@TodePond](https://github.com/TodePond))
- Tweak example code snippet sizing [#5701](https://github.com/tldraw/tldraw/pull/5701) ([@TodePond](https://github.com/TodePond))
- [dotcom] Create admin UI for hard deleting files [#5712](https://github.com/tldraw/tldraw/pull/5712) ([@ds300](https://github.com/ds300))
- `@tldraw/dotcom-shared`, `@tldraw/editor`
  - trying out zero custom mutators [#5814](https://github.com/tldraw/tldraw/pull/5814) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - a11y: move audit to just /develop [#5846](https://github.com/tldraw/tldraw/pull/5846) ([@mimecuvalo](https://github.com/mimecuvalo))
  - a11y: fix up focus ring on dotcom [#5818](https://github.com/tldraw/tldraw/pull/5818) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [dotcom] fix deep link handling for previously-seen files [#5707](https://github.com/tldraw/tldraw/pull/5707) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`
  - a11y: fix focus ring on share menu/embed dialog; also slider/watermark [#5837](https://github.com/tldraw/tldraw/pull/5837) ([@mimecuvalo](https://github.com/mimecuvalo))
  - isShapeHidden => getShapeVisibility, to allow children of hidden shapes to be visible [#5762](https://github.com/tldraw/tldraw/pull/5762) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state-react`, `@tldraw/state`
  - Disable currently broken docs links [#5778](https://github.com/tldraw/tldraw/pull/5778) ([@TodePond](https://github.com/TodePond))
- `@tldraw/dotcom-shared`
  - Zero spike [#5551](https://github.com/tldraw/tldraw/pull/5551) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`
  - Better whyAmIRunning [#5746](https://github.com/tldraw/tldraw/pull/5746) ([@ds300](https://github.com/ds300))
- `@tldraw/state-react`, `@tldraw/state`
  - Add & fix missing state docs [#5696](https://github.com/tldraw/tldraw/pull/5696) ([@TodePond](https://github.com/TodePond))

#### 🐛 Bug Fixes

- Fix jobs link. [#5863](https://github.com/tldraw/tldraw/pull/5863) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix flyio app prunning and deployment. [#5834](https://github.com/tldraw/tldraw/pull/5834) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make sure we first migrate the db, only then we deploy zero. [#5820](https://github.com/tldraw/tldraw/pull/5820) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Include assetUrls in ExplodedExample [#5812](https://github.com/tldraw/tldraw/pull/5812) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))
- Fix sst deploy [#5804](https://github.com/tldraw/tldraw/pull/5804) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Update the production zero domain [#5788](https://github.com/tldraw/tldraw/pull/5788) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix domain name generation [#5787](https://github.com/tldraw/tldraw/pull/5787) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix export example [#5755](https://github.com/tldraw/tldraw/pull/5755) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Fix bad arrow bindings to text shapes (#5902) [#5904](https://github.com/tldraw/tldraw/pull/5904) ([@SomeHats](https://github.com/SomeHats))
  - events: fix wrong contentEditable check [#5888](https://github.com/tldraw/tldraw/pull/5888) ([@mimecuvalo](https://github.com/mimecuvalo))
  - a11y: fix up watermark regression [#5848](https://github.com/tldraw/tldraw/pull/5848) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix unexpected artefacts showing up in exports when the page includes tailwind [#5792](https://github.com/tldraw/tldraw/pull/5792) ([@SomeHats](https://github.com/SomeHats))
  - fix translation perf regression from rich text font detection [#5743](https://github.com/tldraw/tldraw/pull/5743) ([@SomeHats](https://github.com/SomeHats))
  - Fix Group2d `getSvgPathData()` missing move markers [#5580](https://github.com/tldraw/tldraw/pull/5580) ([@lorenzolewis](https://github.com/lorenzolewis))
- `tldraw`
  - a11y: add null check for bookmark asset descriptor [#5900](https://github.com/tldraw/tldraw/pull/5900) ([@mimecuvalo](https://github.com/mimecuvalo))
  - fix error pasting shapes from Miro, pt 2 [#5896](https://github.com/tldraw/tldraw/pull/5896) ([@mimecuvalo](https://github.com/mimecuvalo))
  - youtube: fix up timestamp [#5893](https://github.com/tldraw/tldraw/pull/5893) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix `useIsToolSelected`, add remove tool example [#5849](https://github.com/tldraw/tldraw/pull/5849) ([@steveruizok](https://github.com/steveruizok))
  - A11y focus button fixes [#5825](https://github.com/tldraw/tldraw/pull/5825) ([@steveruizok](https://github.com/steveruizok))
  - fix error pasting shapes from Miro [#5790](https://github.com/tldraw/tldraw/pull/5790) ([@mimecuvalo](https://github.com/mimecuvalo))
  - people menu: fix overflow and follow buttons [#5753](https://github.com/tldraw/tldraw/pull/5753) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - Revert "events: explore using getCoalescedEvents (#5554)" [#5895](https://github.com/tldraw/tldraw/pull/5895) ([@mimecuvalo](https://github.com/mimecuvalo))
  - fix zoom speed for pinch gestures [#5771](https://github.com/tldraw/tldraw/pull/5771) ([@SomeHats](https://github.com/SomeHats))
  - When editing a text shape, don't mount the text editor for non-editing empty shapes unless they're hovered [#5734](https://github.com/tldraw/tldraw/pull/5734) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`, `@tldraw/utils`
  - images: fix not being able to insert SVGs into Firefox [#5789](https://github.com/tldraw/tldraw/pull/5789) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Add Frame colors [#5283](https://github.com/tldraw/tldraw/pull/5283) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@SomeHats](https://github.com/SomeHats))

#### 💄 Product Improvements

- Fix typo in Local Images example [#5774](https://github.com/tldraw/tldraw/pull/5774) ([@mootari](https://github.com/mootari))
- Increase the preview pruning timout [#5817](https://github.com/tldraw/tldraw/pull/5817) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Prune sst stages based on the active amazon clusters. [#5805](https://github.com/tldraw/tldraw/pull/5805) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fly for preview deploys. [#5795](https://github.com/tldraw/tldraw/pull/5795) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Limit the label gating to previews. [#5786](https://github.com/tldraw/tldraw/pull/5786) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - events: explore using getCoalescedEvents, take 2 [#5898](https://github.com/tldraw/tldraw/pull/5898) ([@mimecuvalo](https://github.com/mimecuvalo))
  - a11y: add keyboard shortcut items; fix up focus ring in dotcom menus [#5852](https://github.com/tldraw/tldraw/pull/5852) ([@mimecuvalo](https://github.com/mimecuvalo))
  - a11y: add a live region to announce selected tools [#5634](https://github.com/tldraw/tldraw/pull/5634) ([@mimecuvalo](https://github.com/mimecuvalo))
  - events: explore using getCoalescedEvents [#5554](https://github.com/tldraw/tldraw/pull/5554) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - a11y: add resize kbd shortcut [#5826](https://github.com/tldraw/tldraw/pull/5826) ([@mimecuvalo](https://github.com/mimecuvalo))
  - kbd: rework keyboard shortcut mapping symbols to be more intuitive [#5605](https://github.com/tldraw/tldraw/pull/5605) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))
  - a11y: more role updates, more semantic html5 tags [#5847](https://github.com/tldraw/tldraw/pull/5847) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Rename useIsMultiplayer.ts to useCollaborationStatus  [#5833] [#5835](https://github.com/tldraw/tldraw/pull/5835) ([@budatl](https://github.com/budatl))
  - Make image pasting atomic [#5800](https://github.com/tldraw/tldraw/pull/5800) ([@ds300](https://github.com/ds300))
  - Not preload empty `embedIcons` [#5736](https://github.com/tldraw/tldraw/pull/5736) ([@khanilov](https://github.com/khanilov))
  - embed: youtube support time and loop [#5726](https://github.com/tldraw/tldraw/pull/5726) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/store`
  - Store.atomic and Store.mergeRemoteChanges fixes [#5801](https://github.com/tldraw/tldraw/pull/5801) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - Cache the fonts extracted from rich text. [#5735](https://github.com/tldraw/tldraw/pull/5735) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))

#### 🎉 New Features

- `@tldraw/editor`, `tldraw`
  - a11y: add axe to be able to do audits [#5840](https://github.com/tldraw/tldraw/pull/5840) ([@mimecuvalo](https://github.com/mimecuvalo))
  - a11y: navigable shapes [#5761](https://github.com/tldraw/tldraw/pull/5761) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - a11y: announce shapes as they're visited [#5773](https://github.com/tldraw/tldraw/pull/5773) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🛠️ API Changes

- `tldraw`
  - rich text: export some of our custom extensions [#5874](https://github.com/tldraw/tldraw/pull/5874) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - Geometry2d Improvements [#5754](https://github.com/tldraw/tldraw/pull/5754) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 14

- [@budatl](https://github.com/budatl)
- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Fabian Iwand ([@mootari](https://github.com/mootari))
- Lorenzo Lewis ([@lorenzolewis](https://github.com/lorenzolewis))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Slava Khanilo ([@khanilov](https://github.com/khanilov))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Trivikram Kamat ([@trivikr](https://github.com/trivikr))
- Trygve Aaberge ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))

---

# v3.11.0 (Thu Mar 20 2025)

### Release Notes

#### style panel: be able to hit Enter to continue editing after selection ([#5705](https://github.com/tldraw/tldraw/pull/5705))

- Style panel: be able to hit Enter to continue editing after selection

#### rich text: tweak numbered list padding depending on # of items ([#5709](https://github.com/tldraw/tldraw/pull/5709))

- Fix issue with rich text numbered lists escaping geometry bounds

#### text: fix editing for React 19/StrictMode ([#5689](https://github.com/tldraw/tldraw/pull/5689))

- Fix developing with StrictMode + React 19 when editing text.

#### rich text: add RichTextSVG to exports ([#5700](https://github.com/tldraw/tldraw/pull/5700))

- Add `RichTextSVG` to the exports.

#### [Fix] Rich text perf issue ([#5658](https://github.com/tldraw/tldraw/pull/5658))

- Improved performance related to rich text.

#### [Friendly Spellcheck]: Fix comments of types.ts file in @tldraw/state ([#5683](https://github.com/tldraw/tldraw/pull/5683))

- Fixed typos found in the `Signal` interface's comments

#### exports: fix Inter being embedded; reduce excessive styling ([#5676](https://github.com/tldraw/tldraw/pull/5676))

- Fix issue with exports embedding Inter and having excessive styling.

#### Improve examples UX on tldraw.dev ([#5667](https://github.com/tldraw/tldraw/pull/5667))

- Docs: Improved UX of examples on the tldraw.dev

#### assets: be able to remove assets that are unused ([#5628](https://github.com/tldraw/tldraw/pull/5628))

- Cleanup assets from the local indexedDB that are proactively deleted.

#### Allow embedding other multiplayer routes and also tldraw app routes ([#5326](https://github.com/tldraw/tldraw/pull/5326))

- Fixed a bug with…

#### 5% minimum zoom / zoom-towards-cursor ([#5584](https://github.com/tldraw/tldraw/pull/5584))

- Added a new minimum zoom step at 5%
- Added new keyboard shortcuts for zoom in or out towards your cursor (Shift +, Shift -)

#### [Fix] indicators hideAll / showAll ([#5654](https://github.com/tldraw/tldraw/pull/5654))

- Improved performance on large projects when hiding / showing shape indicators.
- Added `hideAll` and `showAll` props to the `ShapeIndicators` component props

#### Add page navigation kbds ([#5586](https://github.com/tldraw/tldraw/pull/5586))

- Added keyboard shortcuts (option + arrows) for navigating between pages.

#### [Fix] Use adjacent shape margin option in stackShapes, packShapes ([#5656](https://github.com/tldraw/tldraw/pull/5656))

- Adjusts distance for `stackShapes`.

#### rich text: add `textOptions` to `<TldrawImage />` ([#5649](https://github.com/tldraw/tldraw/pull/5649))

- Fix a bug where `textOptions` was missing on `<TldrawImage />`

#### a11y: make toolbar button labels better; fix missing str ([#5632](https://github.com/tldraw/tldraw/pull/5632))

- Improve labels for screen readers on toolbar buttons. Fix missing 'heart' string.

#### embeds: add support for google maps satellite mode ([#5630](https://github.com/tldraw/tldraw/pull/5630))

- Adds support for satellite mode in Google Map embeds

#### 'New user' -> 'Guest user' (dotcom only) ([#5614](https://github.com/tldraw/tldraw/pull/5614))

- Add a translation key 'people-menu.anonymous-user' with the default string 'New User'
- BREAKING CHANGE: `editor.user.getName()` no longer returns `'New user'` if the user has no name set. Instead it returns the empty string `''`.
- BREAKING CHANGE: `defaultUserPreferences.name` is no longer the string `'New user'`, it is now the empty string `''`

#### template: fix Bun server image uploads ([#5627](https://github.com/tldraw/tldraw/pull/5627))

- Fix up image uploads in our simple-server-example when using Bun

#### fonts: fix up invalid google font url ([#5626](https://github.com/tldraw/tldraw/pull/5626))

- Fix Inter font on some of our templates.

#### a11y: focus ring ([#5401](https://github.com/tldraw/tldraw/pull/5401))

- a11y: enable focus ring.

#### bookmark: add apostrophe to common html entities ([#5620](https://github.com/tldraw/tldraw/pull/5620))

- bookmark: add apostrophe to common html entities

#### security: provide a way to pass through `nonce` to the editor ([#5607](https://github.com/tldraw/tldraw/pull/5607))

- Provide support to pass through `nonce` to the Editor.

---

#### 🐛 Bug Fix

- Improve search config [#5714](https://github.com/tldraw/tldraw/pull/5714) ([@TodePond](https://github.com/TodePond))
- update export snapshots, take 2 [#5711](https://github.com/tldraw/tldraw/pull/5711) ([@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- [automated] update i18n strings [#5704](https://github.com/tldraw/tldraw/pull/5704) ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@mimecuvalo](https://github.com/mimecuvalo) [@github-actions[bot]](https://github.com/github-actions[bot]))
- i18n: download the tldraw project as well automatically [#5703](https://github.com/tldraw/tldraw/pull/5703) ([@mimecuvalo](https://github.com/mimecuvalo))
- templates: rm yarn.lock files [#5690](https://github.com/tldraw/tldraw/pull/5690) ([@mimecuvalo](https://github.com/mimecuvalo))
- [dotcom] Fix qr code links [#5695](https://github.com/tldraw/tldraw/pull/5695) ([@ds300](https://github.com/ds300))
- fix sentry csp [#5685](https://github.com/tldraw/tldraw/pull/5685) ([@ds300](https://github.com/ds300))
- Tiny fixes to focus example guides [#5679](https://github.com/tldraw/tldraw/pull/5679) ([@TodePond](https://github.com/TodePond))
- Improve examples UX on tldraw.dev [#5667](https://github.com/tldraw/tldraw/pull/5667) ([@TodePond](https://github.com/TodePond))
- script: add pretty cmd for current diff [#5678](https://github.com/tldraw/tldraw/pull/5678) ([@mimecuvalo](https://github.com/mimecuvalo))
- examples: make nav not do full page reload [#5677](https://github.com/tldraw/tldraw/pull/5677) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix readme images [#5669](https://github.com/tldraw/tldraw/pull/5669) ([@TodePond](https://github.com/TodePond))
- docs: fix up dismissable content [#5668](https://github.com/tldraw/tldraw/pull/5668) ([@mimecuvalo](https://github.com/mimecuvalo))
- [automated] update i18n strings [#5665](https://github.com/tldraw/tldraw/pull/5665) ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@github-actions[bot]](https://github.com/github-actions[bot]))
- fonts: update outdated static assets example [#5650](https://github.com/tldraw/tldraw/pull/5650) ([@mimecuvalo](https://github.com/mimecuvalo))
- Track Enter key to accept search query [#5625](https://github.com/tldraw/tldraw/pull/5625) ([@TodePond](https://github.com/TodePond))
- use discord steps for trigger-sdk-hotfix script [#5648](https://github.com/tldraw/tldraw/pull/5648) ([@ds300](https://github.com/ds300))
- i18n: temporarily patch order placement to avoid Lokalise bug [#5647](https://github.com/tldraw/tldraw/pull/5647) ([@mimecuvalo](https://github.com/mimecuvalo))
- error logging for i18n-upload-strings [#5639](https://github.com/tldraw/tldraw/pull/5639) ([@ds300](https://github.com/ds300))
- Track embedded examples on docs site [#5643](https://github.com/tldraw/tldraw/pull/5643) ([@TodePond](https://github.com/TodePond))
- Add a dot (test new docs deployment thing) [#5641](https://github.com/tldraw/tldraw/pull/5641) ([@ds300](https://github.com/ds300))
- trigger-sdk-hotfix refresh assets [#5640](https://github.com/tldraw/tldraw/pull/5640) ([@ds300](https://github.com/ds300))
- Use correct punctuation in comments in sync.mdx [#5638](https://github.com/tldraw/tldraw/pull/5638) ([@ds300](https://github.com/ds300))
- fetch-depth 0 again? [#5637](https://github.com/tldraw/tldraw/pull/5637) ([@ds300](https://github.com/ds300))
- debug trigger-sdk-hotfix [#5636](https://github.com/tldraw/tldraw/pull/5636) ([@ds300](https://github.com/ds300))
- fix checkout step [#5635](https://github.com/tldraw/tldraw/pull/5635) ([@ds300](https://github.com/ds300))
- fix trigger-sdk-hotfix script? [#5633](https://github.com/tldraw/tldraw/pull/5633) ([@ds300](https://github.com/ds300))
- [infra] add setup action back [#5631](https://github.com/tldraw/tldraw/pull/5631) ([@ds300](https://github.com/ds300))
- Trigger docs/SDK release from a PR label [#5629](https://github.com/tldraw/tldraw/pull/5629) ([@ds300](https://github.com/ds300))
- fix header truncation on safari [#5618](https://github.com/tldraw/tldraw/pull/5618) ([@ds300](https://github.com/ds300))
- docs: fix sorting for release history [#5617](https://github.com/tldraw/tldraw/pull/5617) ([@mimecuvalo](https://github.com/mimecuvalo))
- dotcom: handle 'client too old' error [#5609](https://github.com/tldraw/tldraw/pull/5609) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - update export snapshots [#5710](https://github.com/tldraw/tldraw/pull/5710) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Example: create arrow between shapes [#5602](https://github.com/tldraw/tldraw/pull/5602) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- `@tldraw/dotcom-shared`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`
  - upgrade yarn to 4.7 [#5687](https://github.com/tldraw/tldraw/pull/5687) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/state`
  - [Friendly Spellcheck]: Fix comments of types.ts file in @tldraw/state [#5683](https://github.com/tldraw/tldraw/pull/5683) ([@Jastor11](https://github.com/Jastor11))
- `tldraw`
  - toolbar: tweak selected color [#5624](https://github.com/tldraw/tldraw/pull/5624) ([@mimecuvalo](https://github.com/mimecuvalo))
  - debug: move hard reset option to avoid fat finger [#5616](https://github.com/tldraw/tldraw/pull/5616) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - a11y: focus ring [#5401](https://github.com/tldraw/tldraw/pull/5401) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/state-react`, `@tldraw/state`
  - Fix API links for state packages [#5606](https://github.com/tldraw/tldraw/pull/5606) ([@TodePond](https://github.com/TodePond))

#### 🐛 Bug Fixes

- template: fix Bun server image uploads [#5627](https://github.com/tldraw/tldraw/pull/5627) ([@mimecuvalo](https://github.com/mimecuvalo))
- fonts: fix up invalid google font url [#5626](https://github.com/tldraw/tldraw/pull/5626) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - style panel: be able to hit Enter to continue editing after selection, pt 2 [#5713](https://github.com/tldraw/tldraw/pull/5713) ([@mimecuvalo](https://github.com/mimecuvalo))
  - style panel: be able to hit Enter to continue editing after selection [#5705](https://github.com/tldraw/tldraw/pull/5705) ([@mimecuvalo](https://github.com/mimecuvalo))
  - rich text: add RichTextSVG to exports [#5700](https://github.com/tldraw/tldraw/pull/5700) ([@mimecuvalo](https://github.com/mimecuvalo))
  - rich text: add `textOptions` to `<TldrawImage />` [#5649](https://github.com/tldraw/tldraw/pull/5649) ([@mimecuvalo](https://github.com/mimecuvalo))
  - a11y: make toolbar button labels better; fix missing str [#5632](https://github.com/tldraw/tldraw/pull/5632) ([@mimecuvalo](https://github.com/mimecuvalo))
  - bookmark: add apostrophe to common html entities [#5620](https://github.com/tldraw/tldraw/pull/5620) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - rich text: tweak numbered list padding depending on # of items [#5709](https://github.com/tldraw/tldraw/pull/5709) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - text: fix editing for React 19/StrictMode [#5689](https://github.com/tldraw/tldraw/pull/5689) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats))
  - exports: fix Inter being embedded; reduce excessive styling [#5676](https://github.com/tldraw/tldraw/pull/5676) ([@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - [Fix] indicators hideAll / showAll [#5654](https://github.com/tldraw/tldraw/pull/5654) ([@steveruizok](https://github.com/steveruizok))

#### 💄 Product Improvements

- Don't show dismissible elements until we are sure of their status [#5570](https://github.com/tldraw/tldraw/pull/5570) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - [Fix] Rich text perf issue [#5658](https://github.com/tldraw/tldraw/pull/5658) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))
  - [Fix] Use adjacent shape margin option in stackShapes, packShapes [#5656](https://github.com/tldraw/tldraw/pull/5656) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - assets: be able to remove assets that are unused [#5628](https://github.com/tldraw/tldraw/pull/5628) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - Allow embedding other multiplayer routes and also tldraw app routes [#5326](https://github.com/tldraw/tldraw/pull/5326) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - embeds: add support for google maps satellite mode [#5630](https://github.com/tldraw/tldraw/pull/5630) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/sync`, `tldraw`
  - 5% minimum zoom / zoom-towards-cursor [#5584](https://github.com/tldraw/tldraw/pull/5584) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - 'New user' -> 'Guest user' (dotcom only) [#5614](https://github.com/tldraw/tldraw/pull/5614) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- `tldraw`
  - Add page navigation kbds [#5586](https://github.com/tldraw/tldraw/pull/5586) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`
  - security: provide a way to pass through `nonce` to the editor [#5607](https://github.com/tldraw/tldraw/pull/5607) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 9

- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Jeff Astor ([@Jastor11](https://github.com/Jastor11))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.10.0 (Tue Mar 11 2025)

### Release Notes

#### Use ImmutableMap inside AtomMap ([#5567](https://github.com/tldraw/tldraw/pull/5567))

- Fixed a perf regression that caused slowness mainly when loading documents.

#### Add state packages to reference ([#5591](https://github.com/tldraw/tldraw/pull/5591))

- Docs: Added the `state` and `state-react` packages to the API reference.

#### export: fix style embedding for foreignObjects in Firefox ([#5593](https://github.com/tldraw/tldraw/pull/5593))

- Fix exports / style embedding for foreignObjects in Firefox

#### Fix broken docs sidebar link ([#5578](https://github.com/tldraw/tldraw/pull/5578))

- Fixed a bug with…

#### Fixes to the new blog post ([#5575](https://github.com/tldraw/tldraw/pull/5575))



#### Whats new blog post ([#5573](https://github.com/tldraw/tldraw/pull/5573))



#### Display BrokenAssetIcon when file upload fails ([#5552](https://github.com/tldraw/tldraw/pull/5552))

- Improve UI around failed uploads to show that the asset is broken.

#### rich text: fix links getting in the way of some tools and android selection ([#5568](https://github.com/tldraw/tldraw/pull/5568))

- Fix issue with rich text links taking precedence over tools. Also, fix fine-grained selection on Android.

#### fix reparentshapes preserve order ([#5565](https://github.com/tldraw/tldraw/pull/5565))

- Modify the reparentShapes() function to ensure that the original order of the shapes is preserved when reparenting.

#### Revert "Revert "Fix for resizing snapshot bug (#5211)" (#5292)" ([#5553](https://github.com/tldraw/tldraw/pull/5553))

- Fixed a bug that could occur when resizing.

#### media: extract base64 assets from .tldr files ([#5525](https://github.com/tldraw/tldraw/pull/5525))

- Ensure .tldr files with embedded base64 assets get their assets rehydrated back into the local db.

#### Make collaboration hooks public ([#5541](https://github.com/tldraw/tldraw/pull/5541))

- Makes `usePeerIds` and `usePresence` public

#### fix pasting files in safari ([#5545](https://github.com/tldraw/tldraw/pull/5545))

- Fixed a bug with pasting files from your computer in Safari

#### remove import from core-js ([#5544](https://github.com/tldraw/tldraw/pull/5544))

- Fixed bug with loading TLDraw in an SSR environment by removing a core-js import  https://github.com/tldraw/tldraw/issues/5543

#### [feature] add rich text and contextual toolbar ([#4895](https://github.com/tldraw/tldraw/pull/4895))

- Rich text using ProseMirror as a first-class supported option in the Editor.

#### Pass userId to collaboration components ([#5534](https://github.com/tldraw/tldraw/pull/5534))

- Pass `userId` to collaboration components in `LiveCollaborators`

---

#### 🐛 Bug Fix

- Add more postgres history, reduce ping overhead [#5604](https://github.com/tldraw/tldraw/pull/5604) ([@ds300](https://github.com/ds300))
- Fix header width [#5598](https://github.com/tldraw/tldraw/pull/5598) ([@steveruizok](https://github.com/steveruizok))
- Add state packages to reference [#5591](https://github.com/tldraw/tldraw/pull/5591) ([@TodePond](https://github.com/TodePond))
- Remove link to dev survey [#5595](https://github.com/tldraw/tldraw/pull/5595) ([@TodePond](https://github.com/TodePond))
- Redirect FAQ to notion page [#5594](https://github.com/tldraw/tldraw/pull/5594) ([@TodePond](https://github.com/TodePond))
- example: add back context toolbar (original) [#5590](https://github.com/tldraw/tldraw/pull/5590) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix broken docs sidebar link [#5578](https://github.com/tldraw/tldraw/pull/5578) ([@lorenzolewis](https://github.com/lorenzolewis))
- Fixes to the new blog post [#5575](https://github.com/tldraw/tldraw/pull/5575) ([@TodePond](https://github.com/TodePond))
- Whats new blog post [#5573](https://github.com/tldraw/tldraw/pull/5573) ([@TodePond](https://github.com/TodePond))
- Fix trailing single quote in docs [#5556](https://github.com/tldraw/tldraw/pull/5556) ([@lorenzolewis](https://github.com/lorenzolewis))
- i18n: fix up latest upload pipeline missing env vars [#5571](https://github.com/tldraw/tldraw/pull/5571) ([@mimecuvalo](https://github.com/mimecuvalo))
- i18n: add validation and auto-placing of orders [#5536](https://github.com/tldraw/tldraw/pull/5536) ([@mimecuvalo](https://github.com/mimecuvalo))
- [dotcom] fix data leaking between preview branches [#5562](https://github.com/tldraw/tldraw/pull/5562) ([@ds300](https://github.com/ds300))
- Make better use of replicator history [#5532](https://github.com/tldraw/tldraw/pull/5532) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))
- [automated] update i18n strings [#5550](https://github.com/tldraw/tldraw/pull/5550) ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@mimecuvalo](https://github.com/mimecuvalo) [@github-actions[bot]](https://github.com/github-actions[bot]))
- algolia: add analytics [#5549](https://github.com/tldraw/tldraw/pull/5549) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - Add eslint rule for "whilst" [#5587](https://github.com/tldraw/tldraw/pull/5587) ([@steveruizok](https://github.com/steveruizok))
  - Pass userId to collaboration components [#5534](https://github.com/tldraw/tldraw/pull/5534) ([@MathieuLoutre](https://github.com/MathieuLoutre))
- `@tldraw/assets`, `@tldraw/dotcom-shared`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`, `@tldraw/worker-shared`
  - CTA analytics [#5542](https://github.com/tldraw/tldraw/pull/5542) ([@TodePond](https://github.com/TodePond))

#### 🐛 Bug Fixes

- Fix broken people menu [#5579](https://github.com/tldraw/tldraw/pull/5579) ([@steveruizok](https://github.com/steveruizok))
- setup pgbouncer for local dev (fix flaky e2e tests?) [#5548](https://github.com/tldraw/tldraw/pull/5548) ([@ds300](https://github.com/ds300))
- `@tldraw/store`, `tldraw`
  - Use ImmutableMap inside AtomMap [#5567](https://github.com/tldraw/tldraw/pull/5567) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`
  - export: fix style embedding for foreignObjects in Firefox [#5593](https://github.com/tldraw/tldraw/pull/5593) ([@mimecuvalo](https://github.com/mimecuvalo))
  - rich text: fix links getting in the way of some tools and android selection [#5568](https://github.com/tldraw/tldraw/pull/5568) ([@mimecuvalo](https://github.com/mimecuvalo))
  - fix reparentshapes preserve order [#5565](https://github.com/tldraw/tldraw/pull/5565) (riley@toonsquare.co)
- `tldraw`
  - Display BrokenAssetIcon when file upload fails [#5552](https://github.com/tldraw/tldraw/pull/5552) ([@kazu-2020](https://github.com/kazu-2020) [@mimecuvalo](https://github.com/mimecuvalo))
  - [important dotcom perf fix] use useMaybeEditor in ui context [#5560](https://github.com/tldraw/tldraw/pull/5560) ([@ds300](https://github.com/ds300))
  - Revert "Revert "Fix for resizing snapshot bug (#5211)" (#5292)" [#5553](https://github.com/tldraw/tldraw/pull/5553) ([@mimecuvalo](https://github.com/mimecuvalo))
  - fix: prevent text duplication when using IME with Enter key in Chrome [#5540](https://github.com/tldraw/tldraw/pull/5540) ([@banqinghe](https://github.com/banqinghe) [@mimecuvalo](https://github.com/mimecuvalo))
  - fix pasting files in safari [#5545](https://github.com/tldraw/tldraw/pull/5545) ([@bluedot74](https://github.com/bluedot74))
- `@tldraw/editor`
  - remove import from core-js [#5544](https://github.com/tldraw/tldraw/pull/5544) ([@bluedot74](https://github.com/bluedot74))

#### 💄 Product Improvements

- Migrate newsletter form to hubspot [#5557](https://github.com/tldraw/tldraw/pull/5557) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add some randomness to prevent this happening in sync for online users. [#5563](https://github.com/tldraw/tldraw/pull/5563) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add a tests for guest files [#5531](https://github.com/tldraw/tldraw/pull/5531) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - media: extract base64 assets from .tldr files [#5525](https://github.com/tldraw/tldraw/pull/5525) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - Make collaboration hooks public [#5541](https://github.com/tldraw/tldraw/pull/5541) ([@MathieuLoutre](https://github.com/MathieuLoutre))

#### 🎉 New Features

- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - [feature] add rich text and contextual toolbar [#4895](https://github.com/tldraw/tldraw/pull/4895) ([@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))

#### Authors: 14

- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Josh Willis ([@bluedot74](https://github.com/bluedot74))
- Lorenzo Lewis ([@lorenzolewis](https://github.com/lorenzolewis))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mathieu Triay ([@MathieuLoutre](https://github.com/MathieuLoutre))
- mimata kazutaka ([@kazu-2020](https://github.com/kazu-2020))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Qinghe Ban ([@banqinghe](https://github.com/banqinghe))
- Riley ([@dodo-Riley](https://github.com/dodo-Riley))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.9.0 (Mon Mar 03 2025)

### Release Notes

#### Fix issue with duplicating bound arrows. ([#5495](https://github.com/tldraw/tldraw/pull/5495))

- Fix a bug with duplicating bound arrows.

#### Add `AtomMap` & refactor store ([#5496](https://github.com/tldraw/tldraw/pull/5496))

- **BREAKING**. `store.createSelectedComputedCache` has been removed. Use `store.createCache` and create your own selector `computed` instead.
- **BREAKING**. `createComputerCache` no longer accepts a single `isEqual` fn as its 3rd argument. Instead, pass in an options object, with the `isEqual` fn named `areRecordsEqual`. You can now pass `areResultsEqual`, too.

#### getImageSize: Fix inaccurate PNG image width height calculation by using exact pixels per meter value ([#5509](https://github.com/tldraw/tldraw/pull/5509))

- Fixed a bug with `getImageSize` using inaccurate pixels per meter value which leads to discrepancies in calculating width and height in pixels for PNG images.

#### [botcom] Fix slow export menu in big files ([#5435](https://github.com/tldraw/tldraw/pull/5435))

- Fixed a bug with export menu performance.

#### Improve / fix layout methods: alignment, distribute, flip, stack. ([#5479](https://github.com/tldraw/tldraw/pull/5479))

- Fixes several bugs when aligning / flipping / distributing / stretching / stacking a selection that included with arrows.
- Fixed a bug with distribution with overlapping shapes
- Fixed a bug with distribution that could lead to changed selection.
- Fixed a bug preventing rotated shapes from being stretched.

#### Fix text padding, add context to shape geometry ([#5487](https://github.com/tldraw/tldraw/pull/5487))

- Improved horizontal padding for arrows bound to text shapes

#### Remove canvas size dependency ([#5488](https://github.com/tldraw/tldraw/pull/5488))

- API: removes canvas-size dependency.

#### fix copy as svg mime type ([#5482](https://github.com/tldraw/tldraw/pull/5482))

- Fix copy as svg

#### [hotfixme] Option-cloning text shapes ([#5470](https://github.com/tldraw/tldraw/pull/5470))

- Fixed a bug with cloning text shapes.

#### assets: fix up regression with temporaryAssetPreview ([#5453](https://github.com/tldraw/tldraw/pull/5453))

- Fix a regression with temporary image previews while images are uploading.

#### fix svg image export mime type ([#5427](https://github.com/tldraw/tldraw/pull/5427))

- Fix `<TldrawImage />` not rendering correctly with `format=svg`

---

#### 🐛 Bug Fix

- fix file extension for downloads [#5523](https://github.com/tldraw/tldraw/pull/5523) ([@ds300](https://github.com/ds300))
- Do hard deletes reactively [#5522](https://github.com/tldraw/tldraw/pull/5522) ([@ds300](https://github.com/ds300))
- Admin UI + backend fixes [#5520](https://github.com/tldraw/tldraw/pull/5520) ([@ds300](https://github.com/ds300))
- icons: add crossorigin property for the new sprite loading [#5519](https://github.com/tldraw/tldraw/pull/5519) ([@mimecuvalo](https://github.com/mimecuvalo))
- Docs improvements, add FAQ to repo. [#5514](https://github.com/tldraw/tldraw/pull/5514) ([@steveruizok](https://github.com/steveruizok))
- Stabilize useSync invocation [#5512](https://github.com/tldraw/tldraw/pull/5512) ([@ds300](https://github.com/ds300))
- SEO keywords / description for dotcom [#5499](https://github.com/tldraw/tldraw/pull/5499) ([@steveruizok](https://github.com/steveruizok))
- [dotcom] hide watermark in focus mode [#5410](https://github.com/tldraw/tldraw/pull/5410) ([@ds300](https://github.com/ds300))
- icons: followup to add crossorigin [#5498](https://github.com/tldraw/tldraw/pull/5498) ([@mimecuvalo](https://github.com/mimecuvalo))
- Landing page fixes [#5492](https://github.com/tldraw/tldraw/pull/5492) ([@steveruizok](https://github.com/steveruizok))
- Add analytics to examples site [#5491](https://github.com/tldraw/tldraw/pull/5491) ([@TodePond](https://github.com/TodePond))
- i18n: if no new strings, just exit [#5484](https://github.com/tldraw/tldraw/pull/5484) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix typo and missing word [#5464](https://github.com/tldraw/tldraw/pull/5464) ([@mootari](https://github.com/mootari))
- Remove TLAppDurableObject [#5452](https://github.com/tldraw/tldraw/pull/5452) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add link to developer survey [#5450](https://github.com/tldraw/tldraw/pull/5450) ([@steveruizok](https://github.com/steveruizok))
- fix dotdev padding [#5446](https://github.com/tldraw/tldraw/pull/5446) ([@SomeHats](https://github.com/SomeHats))
- [automated] update i18n strings [#5444](https://github.com/tldraw/tldraw/pull/5444) ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@mimecuvalo](https://github.com/mimecuvalo) [@github-actions[bot]](https://github.com/github-actions[bot]))
- i18n: simplify string [#5443](https://github.com/tldraw/tldraw/pull/5443) ([@mimecuvalo](https://github.com/mimecuvalo))
- Replace postgres.js pt 1 [#5430](https://github.com/tldraw/tldraw/pull/5430) ([@ds300](https://github.com/ds300))
- Allow cmd-K to search docs from marketing pages of tldraw.dev [#5428](https://github.com/tldraw/tldraw/pull/5428) ([@SomeHats](https://github.com/SomeHats))
- Secret local file index [#5419](https://github.com/tldraw/tldraw/pull/5419) ([@ds300](https://github.com/ds300))
- `tldraw`
  - disable full-fat copy-as-svg on chrome [#5524](https://github.com/tldraw/tldraw/pull/5524) ([@ds300](https://github.com/ds300))
- `@tldraw/dotcom-shared`, `@tldraw/worker-shared`
  - no reboot user data on deploy [#5497](https://github.com/tldraw/tldraw/pull/5497) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/dotcom-shared`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`, `@tldraw/worker-shared`
  - Update discord links [#5500](https://github.com/tldraw/tldraw/pull/5500) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- `@tldraw/editor`
  - Consider `https://localhost` to be development [#5471](https://github.com/tldraw/tldraw/pull/5471) ([@jamesbvaughan](https://github.com/jamesbvaughan) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/utils`
  - switch to pg-logical-replication [#5433](https://github.com/tldraw/tldraw/pull/5433) ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fixes

- Filter out deleted files when doing the max file check on the BE [#5529](https://github.com/tldraw/tldraw/pull/5529) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix guest files. [#5530](https://github.com/tldraw/tldraw/pull/5530) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Use a deep link [#5521](https://github.com/tldraw/tldraw/pull/5521) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix file dropdown crashing the app on slow connections [#5510](https://github.com/tldraw/tldraw/pull/5510) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Improve triggers and hopefully fix an issue with deadlocks [#5501](https://github.com/tldraw/tldraw/pull/5501) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix safari tooltip arrow appears late [#5486](https://github.com/tldraw/tldraw/pull/5486) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix tooltips. [#5485](https://github.com/tldraw/tldraw/pull/5485) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix the share menu closing [#5459](https://github.com/tldraw/tldraw/pull/5459) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Prevent renaming twice [#5426](https://github.com/tldraw/tldraw/pull/5426) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - pull writing image/svg to clipboard [#5533](https://github.com/tldraw/tldraw/pull/5533) ([@SomeHats](https://github.com/SomeHats))
  - fix copy as svg mime type [#5482](https://github.com/tldraw/tldraw/pull/5482) ([@SomeHats](https://github.com/SomeHats))
  - [hotfixme] Option-cloning text shapes [#5470](https://github.com/tldraw/tldraw/pull/5470) ([@steveruizok](https://github.com/steveruizok))
  - assets: fix up regression with temporaryAssetPreview [#5453](https://github.com/tldraw/tldraw/pull/5453) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - Fix issue with duplicating bound arrows. [#5495](https://github.com/tldraw/tldraw/pull/5495) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [botcom] Fix slow export menu in big files [#5435](https://github.com/tldraw/tldraw/pull/5435) ([@steveruizok](https://github.com/steveruizok))
  - Improve / fix layout methods: alignment, distribute, flip, stack. [#5479](https://github.com/tldraw/tldraw/pull/5479) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/utils`
  - getImageSize: Fix inaccurate PNG image width height calculation by using exact pixels per meter value [#5509](https://github.com/tldraw/tldraw/pull/5509) ([@xmliszt](https://github.com/xmliszt))
- `@tldraw/dotcom-shared`
  - retry slurping document records if need be [#5460](https://github.com/tldraw/tldraw/pull/5460) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - fix svg image export mime type [#5427](https://github.com/tldraw/tldraw/pull/5427) ([@SomeHats](https://github.com/SomeHats))

#### 💄 Product Improvements

- Use vite to load the assets [#5490](https://github.com/tldraw/tldraw/pull/5490) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Use a sprite for our dotcom icons. [#5483](https://github.com/tldraw/tldraw/pull/5483) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [botcom] Only prune the users that haven't been active for 10 minutes. [#5462](https://github.com/tldraw/tldraw/pull/5462) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add sidebar context menu [#5461](https://github.com/tldraw/tldraw/pull/5461) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Deleted files improvements [#5465](https://github.com/tldraw/tldraw/pull/5465) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add dotcom checks that will serve for alerting [#5440](https://github.com/tldraw/tldraw/pull/5440) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Remove file creation route. [#5445](https://github.com/tldraw/tldraw/pull/5445) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Actively prune users. [#5425](https://github.com/tldraw/tldraw/pull/5425) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add additional reboot info. [#5416](https://github.com/tldraw/tldraw/pull/5416) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - Fix text padding, add context to shape geometry [#5487](https://github.com/tldraw/tldraw/pull/5487) ([@steveruizok](https://github.com/steveruizok))
  - Remove canvas size dependency [#5488](https://github.com/tldraw/tldraw/pull/5488) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/dotcom-shared`
  - Add backend check for max files [#5448](https://github.com/tldraw/tldraw/pull/5448) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🛠️ API Changes

- `@tldraw/editor`, `@tldraw/store`
  - Add `AtomMap` & refactor store [#5496](https://github.com/tldraw/tldraw/pull/5496) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 11

- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Fabian Iwand ([@mootari](https://github.com/mootari))
- James Vaughan ([@jamesbvaughan](https://github.com/jamesbvaughan))
- Li Yuxuan ([@xmliszt](https://github.com/xmliszt))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.8.1 (Thu Feb 13 2025)

### Release Notes

#### 3.8.1 ([#5429](https://github.com/tldraw/tldraw/pull/5429))

- Fix `TldrawImage` not working with `format=png`

---

#### 🐛 Bug Fix

- `@tldraw/editor`
  - 3.8.1 [#5429](https://github.com/tldraw/tldraw/pull/5429) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 1

- alex ([@SomeHats](https://github.com/SomeHats))

---

# v3.8.0 (Wed Feb 12 2025)

### Release Notes

#### support dragging urls onto the canvas ([#5411](https://github.com/tldraw/tldraw/pull/5411))

- Dragging and dropping URLs onto the canvas is now supported (and creates a bookmark by default)

#### Add tldraw and excalidraw to external content types ([#5402](https://github.com/tldraw/tldraw/pull/5402))

- You can now customize how pasted tldraw and excalidraw content is handled with `registerExternalContentHandler`.

#### Fix replicator event tracking. ([#5415](https://github.com/tldraw/tldraw/pull/5415))

- Fix replicator event tracking.

#### Move computation to where it is needed ([#5413](https://github.com/tldraw/tldraw/pull/5413))

- Slightly improve performance of frames.

#### Create a new stub each time ([#5409](https://github.com/tldraw/tldraw/pull/5409))

- Get a fresh stub each time.

#### Make sure we only allow asset uploads. ([#5404](https://github.com/tldraw/tldraw/pull/5404))

- Lock down our image resize worker to only allow asset upload urls to pass through.

#### Fix permissions ([#5400](https://github.com/tldraw/tldraw/pull/5400))

- Fix a bug with changing files.

#### Add more info to the log ([#5403](https://github.com/tldraw/tldraw/pull/5403))

- Add additional logging for an invalid mutation.

#### ShapeUtil.configure for shape options ([#5399](https://github.com/tldraw/tldraw/pull/5399))

- introduces shape options & `ShapeUtil.configure`, a utility for passing options to a shape util
- moves (unreleased) noteShapeResizeMode to NoteShapeOptions.resizeMode
- If you pass tldraw a shape util with the same type as a default, it'll now replace the default rather than crash
- **BREAKING** `options.maxDrawShapePoints` should now be specified with `DrawShapeUtil.configure({maxPoints})` and `HighlightShapeUtil.configure({maxPoints})`

#### Make updates less frequent ([#5397](https://github.com/tldraw/tldraw/pull/5397))

- Make updates to file and file state a bit less frequent. Make sure we flush and pending updates before navigating though.

#### Remove file delete route ([#5398](https://github.com/tldraw/tldraw/pull/5398))

- Remove file delete route.

#### Show errors when loading legacy multiplayer rooms and when logged in ([#5396](https://github.com/tldraw/tldraw/pull/5396))

- Show error pages instead of getting stuck on the spinner when logged in and visiting a legacy route.

#### Add dev env variable (makes the asset association work locally) ([#5394](https://github.com/tldraw/tldraw/pull/5394))

- Add env variable for local development.

#### Dismiss the sidebar on mobile (after you select a file). ([#5390](https://github.com/tldraw/tldraw/pull/5390))

- Dismiss the sidebar after selecting a file on mobile.

#### Shape options ([#5349](https://github.com/tldraw/tldraw/pull/5349))

- introduces shape options
- moves (unreleased) `noteShapeResizeMode` to `NoteShapeOptions.resizeMode`
- moves `maxDrawShapePoints` to `DrawShapeOptions.maxPoints`
- adds `maxPoints` to `HighlightShapeOptions.maxPoints`
- 💥 breaking change if someone was using `options.maxDrawShapePoints`.

#### Make sure compiled localizations are up to date. ([#5383](https://github.com/tldraw/tldraw/pull/5383))

- Make sure our compiled localizations are up to date.

#### Track user do cold start time on server side replicator ([#5380](https://github.com/tldraw/tldraw/pull/5380))

- Add some additional tracking (active users in replicator and cold start time to used do).

#### Numeric shortcuts were still getting triggered when used inside some inputs (like the file rename input) ([#5378](https://github.com/tldraw/tldraw/pull/5378))

- Fix an issue with numeric shortcuts working inside of editable elements.

#### Use tick for asset debounce ([#5361](https://github.com/tldraw/tldraw/pull/5361))

- Improve zoom performance when many shapes are in a document.

#### Fix pricing and license links ([#5370](https://github.com/tldraw/tldraw/pull/5370))

- Unreleased bug: Fixed some broken links on the docs site.

#### Fix dancing icons. ([#5369](https://github.com/tldraw/tldraw/pull/5369))

- Fix the dancing icons when the sidebar width change.

#### Fix dialog interactions. ([#5366](https://github.com/tldraw/tldraw/pull/5366))

- Improve dialog interactions: mouse down inside of it followed by mouse out outside of it no longer dismisses dialogs.

#### Don't pass through mousewheel events on scrollable elements ([#5356](https://github.com/tldraw/tldraw/pull/5356))

- Fixed a bug with scrollable UI elements not being scrollable.

#### Improve frame heading perf ([#5357](https://github.com/tldraw/tldraw/pull/5357))

- Fix bug effecting performance when many frames are on the screen.

#### Fix keyboard shortcut `1` not working for selecting the first tool ([#5358](https://github.com/tldraw/tldraw/pull/5358))

- Fix a bug when 1 didn't work as a keyboard shortcut to select the first tool.

#### Add option to disable numbered shortcuts on the toolbar ([#5340](https://github.com/tldraw/tldraw/pull/5340))

- SDK: Added editor option to disable 0-9 keyboard shortcuts for the toolbar
- Improved keyboard shortcuts for the toolbar

#### Move to server side slurping. ([#5348](https://github.com/tldraw/tldraw/pull/5348))

- Move duplicating and legacy file slurping to the server.

#### Add "select geo tool" shortcut ([#5341](https://github.com/tldraw/tldraw/pull/5341))

- Added `g` shortcut to select the most recent geometric tool.

#### Don't allow setting file name to null. Fix drag and drop import. ([#5344](https://github.com/tldraw/tldraw/pull/5344))

- Fix an error with creating file's with null names. 
- Fix an error with dragging and dropping files to the sidebar.

#### Make sure that pinned files don't take precedence. ([#5335](https://github.com/tldraw/tldraw/pull/5335))

- Fix an issue with pinned files always taking precedence when returning to the app.

#### Fix vscode publishing. ([#5327](https://github.com/tldraw/tldraw/pull/5327))

- Fix packaging of the vs code extension.

#### Fix the border around the guest icon in Safari ([#5323](https://github.com/tldraw/tldraw/pull/5323))

- Removes the border around the guest badge for Safari.

#### Unify the menus (logged in vs not logged in). ([#5322](https://github.com/tldraw/tldraw/pull/5322))

- Show the same page menu for logged in and for logged out users.

#### support react 19 ([#5293](https://github.com/tldraw/tldraw/pull/5293))

- tldraw now supports react 19

#### separately export default external content/asset handlers ([#5298](https://github.com/tldraw/tldraw/pull/5298))

- You can now import each of our external asset/content handlers, so you can augment them without having to copy-paste them into your app

#### BREAKING
- `TLExternalAssetContent` has been renamed to `TLExternalAsset`

#### Emit a before-event from Editor ([#5319](https://github.com/tldraw/tldraw/pull/5319))

- Emit a `before-event` from Editor for events before they are handled by tldraw.

#### fix: consider font style in text measuring ([#5313](https://github.com/tldraw/tldraw/pull/5313))

- Fixed a bug with…

#### Add `/new` route for file creation. ([#5314](https://github.com/tldraw/tldraw/pull/5314))

- Add `/new` route for quickly creating a new file.

#### Fix images in preview builds ([#5309](https://github.com/tldraw/tldraw/pull/5309))

- Fix an issue with file uploads not working on preview builds.

#### fix pasting text/plain with keyboard shortcut ([#5303](https://github.com/tldraw/tldraw/pull/5303))

- Fixed a bug with handling native paste events for plain text

#### Use the uncropped width when requesting an image shape asset ([#5300](https://github.com/tldraw/tldraw/pull/5300))

- Fixed a bug where a cropped image would use lower scaled assets the more it was cropped.

#### Add editor option to allow sticky note resizing by scale ([#5273](https://github.com/tldraw/tldraw/pull/5273))

- Added `options.noteShapeResizeMode` editor option to control how note shapes resize.

#### Fix an error when embed util is not present. ([#5296](https://github.com/tldraw/tldraw/pull/5296))

- Fix an issue with embeds logic not gracefully handling cases when we don't have an embed util.

#### Add an onCrop handler to ShapeUtil ([#5137](https://github.com/tldraw/tldraw/pull/5137))

- Add support for an onCrop handler on shape utils that allows you to prevent or modify the crop.
- The `TLImageShapeCrop` type has been replaced by `TLShapeCrop`.

#### edit menu: don't disable if not in select tool ([#5274](https://github.com/tldraw/tldraw/pull/5274))

- Edit menu: fix accessing edit menu when not in the Select tool

#### Update editor.mdx ([#5286](https://github.com/tldraw/tldraw/pull/5286))

- Update the document of Editor

#### Style changing duration reduced from 2 to 1 second ([#5158](https://github.com/tldraw/tldraw/pull/5158))

- Style changing duration reduced from 2 to 1 second

#### Fix for resizing snapshot bug ([#5211](https://github.com/tldraw/tldraw/pull/5211))

- Fixed a bug that could occur when resizing on mobile

#### Welcome dialog for preview users ([#5263](https://github.com/tldraw/tldraw/pull/5263))

- Breaking SDK Changes
  - TldrawUiToasts renamed to DefaultToasts
  - TldrawUiDialogs renamed to DefaultDialogs
- New SDK stuff
  - Toasts overridable component added
  - Dialogs overridable component added

#### Asset uploads ([#5218](https://github.com/tldraw/tldraw/pull/5218))

**Breaking change**

- `@tldraw/tlschema`: `TLAssetStore.upload` used to return just the `src` of the uploaded asset. It now returns `{src: string, meta?: JsonObject}`. The returned metadata will be added to the asset record and thus allows the users to add some additional data to them when uploading.
- `@tldraw/editor`: `Editor.uploadAsset` used to return `Promise<string>` and now returns `Promise<{ src: string; meta?: JsonObject }> `

#### Exports DX pass ([#5114](https://github.com/tldraw/tldraw/pull/5114))

#### Breaking changes / user facing changes
- The copy/export as JSON option has been removed. Data copied/exported from here could not be used anyway. If you need this in your app, look into `Editor.getContentFromCurrentPage`.
- `useImageOrVideoAssetUrl` now expects a `width` parameter representing the rendered width of the asset.
- `Editor.getSvgElement` and `Editor.getSvgString` will now export all shapes on the current page instead of returning undefined when passed an empty array of shape ids.

#### Product improvement
- When exporting to an image, image assets are now downloaded at a resolution appropriate for how they will appear in the export.

#### API changes
- There's a new `Editor.toImage` method that makes creating an image from your canvas easier. (`exportToBlob` is deprecated in favour of it)
- `SvgExportContext` now exposes the `scale` and `pixelRatio` options of the current export
- `SvgExportContext` now has a `resolveAssetUrl` method to resolve an asset at a resolution appropriate for the export.
- `copyAs(editor, ids, format, opts)` has been deprecated in favour of `copyAs(editor, ids, opts)`.
- `exportAs(editor, ids, format, name, opts)` has been deprecated in favour of `exportAs(editor, ids, opts)`

#### Always override session state on initial load ([#5233](https://github.com/tldraw/tldraw/pull/5233))

- Fixed a bug where grid mode and other settings would not persist across page reloads.

#### Added toast instead of throwing an error for the case when the amount… ([#5201](https://github.com/tldraw/tldraw/pull/5201))

- added toast instead of throwing an error for the case when the amount of files is bigger than `maxFilesAtOnce`

#### fix clipboard file upload ([#5223](https://github.com/tldraw/tldraw/pull/5223))

- Fix pasting files copied from the local filesystem with cmd-v

#### close sockets on 'close' event ([#5214](https://github.com/tldraw/tldraw/pull/5214))

- sync: close the server sockets on disconnect to proactively clean up socket connections.

#### i18n: augment the list so that we hit the top 40 languages ([#5208](https://github.com/tldraw/tldraw/pull/5208))

- i18n: add top 40 languages into the list

#### pass custom migrations to useLocalStore ([#5135](https://github.com/tldraw/tldraw/pull/5135))

- Fixed a bug with locally synced stores where custom migrations were not being passed to the store constructor.

#### Fix some video issues on the blog ([#5171](https://github.com/tldraw/tldraw/pull/5171))

- Blog: Fixed a broken video.

#### Provided an ability to select multiple arrow labels using ctrl/cmd key ([#5161](https://github.com/tldraw/tldraw/pull/5161))

- Provided an ability to select multiple arrow labels using ctrl/cmd key

---

#### 🐛 Bug Fix

- use correct domain for app socket connection [#5414](https://github.com/tldraw/tldraw/pull/5414) ([@ds300](https://github.com/ds300))
- add create-user event [#5406](https://github.com/tldraw/tldraw/pull/5406) ([@ds300](https://github.com/ds300))
- Add is_signed_in property to posthog events [#5407](https://github.com/tldraw/tldraw/pull/5407) ([@ds300](https://github.com/ds300))
- temporarily disable idb deletion after successful slurp of local file [#5405](https://github.com/tldraw/tldraw/pull/5405) ([@ds300](https://github.com/ds300))
- yeet legacy pages into sun [#5385](https://github.com/tldraw/tldraw/pull/5385) ([@ds300](https://github.com/ds300))
- [automated] update i18n strings [#5395](https://github.com/tldraw/tldraw/pull/5395) ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@mimecuvalo](https://github.com/mimecuvalo) [@github-actions[bot]](https://github.com/github-actions[bot]))
- add missing socket upgrade check [#5384](https://github.com/tldraw/tldraw/pull/5384) ([@ds300](https://github.com/ds300))
- Fix delete file + duplication tracking [#5381](https://github.com/tldraw/tldraw/pull/5381) ([@ds300](https://github.com/ds300))
- Fix local drafts [#5379](https://github.com/tldraw/tldraw/pull/5379) ([@steveruizok](https://github.com/steveruizok))
- Track tracking [#5377](https://github.com/tldraw/tldraw/pull/5377) ([@steveruizok](https://github.com/steveruizok))
- dotdev: add hubspot tracking and cookie policy [#5373](https://github.com/tldraw/tldraw/pull/5373) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Fix pricing and license links [#5370](https://github.com/tldraw/tldraw/pull/5370) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Landing page text [#5372](https://github.com/tldraw/tldraw/pull/5372) ([@steveruizok](https://github.com/steveruizok))
- Landing page tweaks 2 [#5368](https://github.com/tldraw/tldraw/pull/5368) ([@steveruizok](https://github.com/steveruizok))
- buffer posthog events submitted before posthog initializes [#5367](https://github.com/tldraw/tldraw/pull/5367) ([@ds300](https://github.com/ds300))
- better copy on feedback form [#5364](https://github.com/tldraw/tldraw/pull/5364) ([@ds300](https://github.com/ds300))
- make websocket bootstrap time much faster [#5351](https://github.com/tldraw/tldraw/pull/5351) ([@ds300](https://github.com/ds300))
- add a captureException to catch file.name not being defined [#5353](https://github.com/tldraw/tldraw/pull/5353) ([@ds300](https://github.com/ds300))
- prettier: reformat with new package updates [#5328](https://github.com/tldraw/tldraw/pull/5328) ([@mimecuvalo](https://github.com/mimecuvalo))
- Combined sign in/up for dotcom [#5325](https://github.com/tldraw/tldraw/pull/5325) ([@SomeHats](https://github.com/SomeHats))
- Disable rename dialog on file create on mobile [#5329](https://github.com/tldraw/tldraw/pull/5329) ([@ds300](https://github.com/ds300))
- add analytics event for clicking the preview button [#5331](https://github.com/tldraw/tldraw/pull/5331) ([@ds300](https://github.com/ds300))
- Public preview opt-in [#5324](https://github.com/tldraw/tldraw/pull/5324) ([@ds300](https://github.com/ds300))
- tweak pricing copy [#5316](https://github.com/tldraw/tldraw/pull/5316) ([@SomeHats](https://github.com/SomeHats))
- Cmd+click on active file opens in new tab [#5311](https://github.com/tldraw/tldraw/pull/5311) ([@ds300](https://github.com/ds300))
- post release backend error handling [#5306](https://github.com/tldraw/tldraw/pull/5306) ([@ds300](https://github.com/ds300))
- fix copy/export as PNG [#5304](https://github.com/tldraw/tldraw/pull/5304) ([@ds300](https://github.com/ds300))
- Prevent radix dialog warning [#5302](https://github.com/tldraw/tldraw/pull/5302) ([@ds300](https://github.com/ds300))
- i18n: fix more download script papercuts [#5294](https://github.com/tldraw/tldraw/pull/5294) ([@mimecuvalo](https://github.com/mimecuvalo))
- e2e: fix tests now that it has a translations [#5297](https://github.com/tldraw/tldraw/pull/5297) ([@mimecuvalo](https://github.com/mimecuvalo))
- fix 2 bad translations from Lokalise [#5290](https://github.com/tldraw/tldraw/pull/5290) ([@mimecuvalo](https://github.com/mimecuvalo))
- [automated] update i18n strings [#5289](https://github.com/tldraw/tldraw/pull/5289) ([@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@mimecuvalo](https://github.com/mimecuvalo) [@github-actions[bot]](https://github.com/github-actions[bot]))
- Move account menu side to end [#5288](https://github.com/tldraw/tldraw/pull/5288) ([@steveruizok](https://github.com/steveruizok))
- Update editor.mdx [#5286](https://github.com/tldraw/tldraw/pull/5286) ([@Cygra](https://github.com/Cygra))
- Tooltip tweaks [#5287](https://github.com/tldraw/tldraw/pull/5287) ([@steveruizok](https://github.com/steveruizok))
- David/int 677 guests see slurp failure modal [#5280](https://github.com/tldraw/tldraw/pull/5280) ([@ds300](https://github.com/ds300))
- Update link [#5278](https://github.com/tldraw/tldraw/pull/5278) ([@steveruizok](https://github.com/steveruizok))
- fix bottom padding again [#5277](https://github.com/tldraw/tldraw/pull/5277) ([@ds300](https://github.com/ds300))
- Fix sentry error [#5269](https://github.com/tldraw/tldraw/pull/5269) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- fixes [#5266](https://github.com/tldraw/tldraw/pull/5266) ([@ds300](https://github.com/ds300))
- Revert "botcom redirect + copy fix" [#5265](https://github.com/tldraw/tldraw/pull/5265) ([@ds300](https://github.com/ds300))
- botcom redirect + copy fix [#5264](https://github.com/tldraw/tldraw/pull/5264) ([@ds300](https://github.com/ds300))
- Use sign up button on /preview [#5252](https://github.com/tldraw/tldraw/pull/5252) ([@ds300](https://github.com/ds300))
- Use localStorage instead of cookie to detect logged in state [#5251](https://github.com/tldraw/tldraw/pull/5251) ([@ds300](https://github.com/ds300))
- i18n: fix up locale messup for lokalise [#5249](https://github.com/tldraw/tldraw/pull/5249) ([@mimecuvalo](https://github.com/mimecuvalo))
- Lokalise: Translations update [#5248](https://github.com/tldraw/tldraw/pull/5248) ([@TodePond](https://github.com/TodePond))
- i18n: workaround Lokalise's broken plural system [#5242](https://github.com/tldraw/tldraw/pull/5242) ([@mimecuvalo](https://github.com/mimecuvalo))
- i18n: make sure we use ICU format in exports [#5239](https://github.com/tldraw/tldraw/pull/5239) ([@mimecuvalo](https://github.com/mimecuvalo))
- Rename files in window.prompt on mobile [#5236](https://github.com/tldraw/tldraw/pull/5236) ([@ds300](https://github.com/ds300))
- i18n: fix workflow perms [#5237](https://github.com/tldraw/tldraw/pull/5237) ([@mimecuvalo](https://github.com/mimecuvalo))
- i18n: fix download workflow [#5234](https://github.com/tldraw/tldraw/pull/5234) ([@mimecuvalo](https://github.com/mimecuvalo))
- [botcom] don't broadcast mutation rejections [#5230](https://github.com/tldraw/tldraw/pull/5230) ([@ds300](https://github.com/ds300))
- improve cookie microcopy [#5229](https://github.com/tldraw/tldraw/pull/5229) ([@ds300](https://github.com/ds300))
- [botcom] save document name on blur in side bar [#5217](https://github.com/tldraw/tldraw/pull/5217) ([@ds300](https://github.com/ds300))
- send extra data to sentry properly [#5216](https://github.com/tldraw/tldraw/pull/5216) ([@ds300](https://github.com/ds300))
- [botcom] Use clerk cookie to control routing [#5207](https://github.com/tldraw/tldraw/pull/5207) ([@ds300](https://github.com/ds300))
- Fixed a typo in quick-start.mdx [#5210](https://github.com/tldraw/tldraw/pull/5210) ([@onurmatik](https://github.com/onurmatik))
- add latest strings [#5206](https://github.com/tldraw/tldraw/pull/5206) ([@mimecuvalo](https://github.com/mimecuvalo))
- [botcom] Translation tweaks [#5184](https://github.com/tldraw/tldraw/pull/5184) ([@steveruizok](https://github.com/steveruizok))
- remove huppy-bot [#5189](https://github.com/tldraw/tldraw/pull/5189) ([@SomeHats](https://github.com/SomeHats))
- Fix some video issues on the blog [#5171](https://github.com/tldraw/tldraw/pull/5171) ([@TodePond](https://github.com/TodePond))
- `@tldraw/dotcom-shared`
  - Add 'report a problem' dialog [#5359](https://github.com/tldraw/tldraw/pull/5359) ([@ds300](https://github.com/ds300))
  - Set up posthog [#5220](https://github.com/tldraw/tldraw/pull/5220) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - fix: consider font style in text measuring [#5313](https://github.com/tldraw/tldraw/pull/5313) ([@ricardo-crespo](https://github.com/ricardo-crespo))
- `tldraw`
  - Fix line wobble issue [#5281](https://github.com/tldraw/tldraw/pull/5281) ([@jamesbvaughan](https://github.com/jamesbvaughan))
  - Revert "Fix for resizing snapshot bug (#5211)" [#5292](https://github.com/tldraw/tldraw/pull/5292) ([@mimecuvalo](https://github.com/mimecuvalo))
  - hard code context id for dialogs [#5279](https://github.com/tldraw/tldraw/pull/5279) ([@ds300](https://github.com/ds300))
  - Move examples from CodeSandbox to StackBlitz [#5255](https://github.com/tldraw/tldraw/pull/5255) ([@steveruizok](https://github.com/steveruizok))
  - Focus file input on create/duplicate [#5253](https://github.com/tldraw/tldraw/pull/5253) ([@ds300](https://github.com/ds300))
  - strings: rm some old ones, use nice apostrophes [#5213](https://github.com/tldraw/tldraw/pull/5213) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/worker-shared`
  - worker debug logging [#5219](https://github.com/tldraw/tldraw/pull/5219) ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fixes

- Fix npm image. [#5418](https://github.com/tldraw/tldraw/pull/5418) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix replicator event tracking. [#5415](https://github.com/tldraw/tldraw/pull/5415) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix permissions [#5400](https://github.com/tldraw/tldraw/pull/5400) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Show errors when loading legacy multiplayer rooms and when logged in [#5396](https://github.com/tldraw/tldraw/pull/5396) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Commit the copy changes. [#5365](https://github.com/tldraw/tldraw/pull/5365) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix tldr file upload [#5350](https://github.com/tldraw/tldraw/pull/5350) ([@ds300](https://github.com/ds300))
- Don't allow setting file name to null. Fix drag and drop import. [#5344](https://github.com/tldraw/tldraw/pull/5344) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make sure that pinned files don't take precedence. [#5335](https://github.com/tldraw/tldraw/pull/5335) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- fix duplicating + publishing rooms with big snapshots [#5333](https://github.com/tldraw/tldraw/pull/5333) ([@ds300](https://github.com/ds300))
- only accept socket connections when upgrade header is set [#5334](https://github.com/tldraw/tldraw/pull/5334) ([@ds300](https://github.com/ds300))
- Fix vscode publishing. [#5327](https://github.com/tldraw/tldraw/pull/5327) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix the border around the guest icon in Safari [#5323](https://github.com/tldraw/tldraw/pull/5323) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Don't nullify cache [#5310](https://github.com/tldraw/tldraw/pull/5310) ([@ds300](https://github.com/ds300))
- Fix images in preview builds [#5309](https://github.com/tldraw/tldraw/pull/5309) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix url [#5276](https://github.com/tldraw/tldraw/pull/5276) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix an issue with legacy assets not getting their urls changed when they get slurped. [#5270](https://github.com/tldraw/tldraw/pull/5270) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix the blue text color on mobile [#5262](https://github.com/tldraw/tldraw/pull/5262) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Show quick actions panel above toolbar when not logged in. [#5180](https://github.com/tldraw/tldraw/pull/5180) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - Numeric shortcuts were still getting triggered when used inside some inputs (like the file rename input) [#5378](https://github.com/tldraw/tldraw/pull/5378) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Improve frame heading perf [#5357](https://github.com/tldraw/tldraw/pull/5357) ([@steveruizok](https://github.com/steveruizok))
  - Fix an error when embed util is not present. [#5296](https://github.com/tldraw/tldraw/pull/5296) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - Fix keyboard shortcut `1` not working for selecting the first tool [#5358](https://github.com/tldraw/tldraw/pull/5358) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - fix pasting text/plain with keyboard shortcut [#5303](https://github.com/tldraw/tldraw/pull/5303) ([@ds300](https://github.com/ds300))
  - Use the uncropped width when requesting an image shape asset [#5300](https://github.com/tldraw/tldraw/pull/5300) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))
  - edit menu: don't disable if not in select tool [#5274](https://github.com/tldraw/tldraw/pull/5274) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix for resizing snapshot bug [#5211](https://github.com/tldraw/tldraw/pull/5211) ([@steveruizok](https://github.com/steveruizok))
  - Added toast instead of throwing an error for the case when the amount… [#5201](https://github.com/tldraw/tldraw/pull/5201) ([@melnikkk](https://github.com/melnikkk))
  - fix clipboard file upload [#5223](https://github.com/tldraw/tldraw/pull/5223) ([@SomeHats](https://github.com/SomeHats))
  - Fix lint. [#5182](https://github.com/tldraw/tldraw/pull/5182) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Provided an ability to select multiple arrow labels using ctrl/cmd key [#5161](https://github.com/tldraw/tldraw/pull/5161) ([@melnikkk](https://github.com/melnikkk))
- `@tldraw/editor`
  - Always override session state on initial load [#5233](https://github.com/tldraw/tldraw/pull/5233) ([@ds300](https://github.com/ds300))
  - pass custom migrations to useLocalStore [#5135](https://github.com/tldraw/tldraw/pull/5135) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - i18n: rename two locale codes [#5212](https://github.com/tldraw/tldraw/pull/5212) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 💄 Product Improvements

- Create a new stub each time [#5409](https://github.com/tldraw/tldraw/pull/5409) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add more info to the log [#5403](https://github.com/tldraw/tldraw/pull/5403) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make updates less frequent [#5397](https://github.com/tldraw/tldraw/pull/5397) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Remove file delete route [#5398](https://github.com/tldraw/tldraw/pull/5398) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add dev env variable (makes the asset association work locally) [#5394](https://github.com/tldraw/tldraw/pull/5394) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Dismiss the sidebar on mobile (after you select a file). [#5390](https://github.com/tldraw/tldraw/pull/5390) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make sure compiled localizations are up to date. [#5383](https://github.com/tldraw/tldraw/pull/5383) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Track user do cold start time on server side replicator [#5380](https://github.com/tldraw/tldraw/pull/5380) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix dancing icons. [#5369](https://github.com/tldraw/tldraw/pull/5369) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Only send once. [#5355](https://github.com/tldraw/tldraw/pull/5355) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Unify the menus (logged in vs not logged in). [#5322](https://github.com/tldraw/tldraw/pull/5322) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add `/new` route for file creation. [#5314](https://github.com/tldraw/tldraw/pull/5314) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Use sign in instead of sign up. [#5268](https://github.com/tldraw/tldraw/pull/5268) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Prevent slurping for some cases. [#5272](https://github.com/tldraw/tldraw/pull/5272) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make the bottom padding the same as other ones. [#5271](https://github.com/tldraw/tldraw/pull/5271) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Improve focus mode button position and focus mode interaction with the sidebar [#5261](https://github.com/tldraw/tldraw/pull/5261) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300))
- Remove unused env vars [#5260](https://github.com/tldraw/tldraw/pull/5260) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - support dragging urls onto the canvas [#5411](https://github.com/tldraw/tldraw/pull/5411) ([@SomeHats](https://github.com/SomeHats))
  - Don't pass through mousewheel events on scrollable elements [#5356](https://github.com/tldraw/tldraw/pull/5356) ([@steveruizok](https://github.com/steveruizok))
  - Style changing duration reduced from 2 to 1 second [#5158](https://github.com/tldraw/tldraw/pull/5158) (alexander.melnik@pandadoc.com [@melnikkk](https://github.com/melnikkk))
  - error logging: add more context for errors [#5221](https://github.com/tldraw/tldraw/pull/5221) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - Move computation to where it is needed [#5413](https://github.com/tldraw/tldraw/pull/5413) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Use tick for asset debounce [#5361](https://github.com/tldraw/tldraw/pull/5361) ([@steveruizok](https://github.com/steveruizok))
  - Fix dialog interactions. [#5366](https://github.com/tldraw/tldraw/pull/5366) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/dotcom-shared`
  - Make sure we only allow asset uploads. [#5404](https://github.com/tldraw/tldraw/pull/5404) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Move to server side slurping. [#5348](https://github.com/tldraw/tldraw/pull/5348) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Allow slurping of legacy multiplayer routes. [#5181](https://github.com/tldraw/tldraw/pull/5181) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Move to kysely [#5140](https://github.com/tldraw/tldraw/pull/5140) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/dotcom-shared`, `tldraw`
  - Improve published file experience [#5371](https://github.com/tldraw/tldraw/pull/5371) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/dotcom-shared`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`, `@tldraw/worker-shared`
  - support react 19 [#5293](https://github.com/tldraw/tldraw/pull/5293) ([@SomeHats](https://github.com/SomeHats) [@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/dotcom-shared`, `@tldraw/editor`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`
  - Asset uploads [#5218](https://github.com/tldraw/tldraw/pull/5218) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/sync-core`
  - close sockets on 'close' event [#5214](https://github.com/tldraw/tldraw/pull/5214) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- `tldraw`
  - Add "select geo tool" shortcut [#5341](https://github.com/tldraw/tldraw/pull/5341) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - i18n: augment the list so that we hit the top 40 languages [#5208](https://github.com/tldraw/tldraw/pull/5208) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🛠️ API Changes

- `@tldraw/editor`, `tldraw`
  - Add tldraw and excalidraw to external content types [#5402](https://github.com/tldraw/tldraw/pull/5402) ([@SomeHats](https://github.com/SomeHats))
  - Shape options [#5349](https://github.com/tldraw/tldraw/pull/5349) ([@steveruizok](https://github.com/steveruizok))
  - Add option to disable numbered shortcuts on the toolbar [#5340](https://github.com/tldraw/tldraw/pull/5340) ([@steveruizok](https://github.com/steveruizok))
  - separately export default external content/asset handlers [#5298](https://github.com/tldraw/tldraw/pull/5298) ([@SomeHats](https://github.com/SomeHats))
  - Add editor option to allow sticky note resizing by scale [#5273](https://github.com/tldraw/tldraw/pull/5273) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - ShapeUtil.configure for shape options [#5399](https://github.com/tldraw/tldraw/pull/5399) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Emit a before-event from Editor [#5319](https://github.com/tldraw/tldraw/pull/5319) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Add an onCrop handler to ShapeUtil [#5137](https://github.com/tldraw/tldraw/pull/5137) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk) [@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - Welcome dialog for preview users [#5263](https://github.com/tldraw/tldraw/pull/5263) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`
  - Exports DX pass [#5114](https://github.com/tldraw/tldraw/pull/5114) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 15

- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- Aleksander Melnik (alexander.melnik@pandadoc.com)
- alex ([@SomeHats](https://github.com/SomeHats))
- Alexander Melnik ([@melnikkk](https://github.com/melnikkk))
- Cygra Wang ([@Cygra](https://github.com/Cygra))
- David Sheldrick ([@ds300](https://github.com/ds300))
- James Vaughan ([@jamesbvaughan](https://github.com/jamesbvaughan))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Onur Mat ([@onurmatik](https://github.com/onurmatik))
- Ricardo Crespo ([@ricardo-crespo](https://github.com/ricardo-crespo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Trygve Aaberge ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))

---

# v3.7.0 (Tue Jan 07 2025)

### Release Notes

#### Gist embed: restrict the url to a more strict format ([#5170](https://github.com/tldraw/tldraw/pull/5170))

- Restrict Github Gists to a more strict URL format.

#### embeds: fix Gist; fix Val Town; add support for <iframe> ([#5143](https://github.com/tldraw/tldraw/pull/5143))

- Fixes bugs with Github Gist and Val Town; adds support for pasting `<iframe src="...">` embeds

#### Fix max image dimension prop not getting applied. ([#5176](https://github.com/tldraw/tldraw/pull/5176))

- Fix a bug with `maxImageDimension` not getting applied to pasted images.

#### Allow expandSelectionOutlinePx to return a Box ([#5168](https://github.com/tldraw/tldraw/pull/5168))

- Support expanding the selection outline by different amounts on each side by returning a `Box` from `expandSelectionOutlinePx`.

#### Fix relative CSS import rules failing to be fetched ([#5172](https://github.com/tldraw/tldraw/pull/5172))

- Fix relative CSS import rules failing to be fetched when exporting or printing.

#### Execute reactor immediately on listen ([#5133](https://github.com/tldraw/tldraw/pull/5133))

- Fixed a bug during development with React Strict Mode enabled where store.listen might end up not calling the listener.

#### fix: fix broken bluesky link with old handle name ([#5120](https://github.com/tldraw/tldraw/pull/5120))

- Fixed a broken Bluesky link with an old handle name

#### custom sync presence ([#5071](https://github.com/tldraw/tldraw/pull/5071))

- It's now possible to customise what presence data is synced between clients, or disable presence syncing entirely.

#### Don't add the baseElem to the container in textmanager ([#5127](https://github.com/tldraw/tldraw/pull/5127))

- Prevents divs created for text measurement from leaking during hot reloading.

#### Fix popover going off screen ([#5039](https://github.com/tldraw/tldraw/pull/5039))

- Fixed a bug where popover menus might overflow the viewport

#### Fix a bug when holding ctrl or meta and rotating ([#5087](https://github.com/tldraw/tldraw/pull/5087))

- Fixed a bug with rotating image / croppable shapes.

#### Fix typo in TldrawEditor example ([#5070](https://github.com/tldraw/tldraw/pull/5070))

- Fixed a typo in the TldrawEditor example

#### Delete the link to the discussion page from README.md that is now closed ([#5088](https://github.com/tldraw/tldraw/pull/5088))

- Delete the link to the discussion page from README.md that is now closed.

#### Improve rerenedring of the page menu and quick actions ([#5057](https://github.com/tldraw/tldraw/pull/5057))

- Improves rendering of the pages menu and quick actions.

#### fix: Updating shape props to undefined when using editor.updateShape ([#5029](https://github.com/tldraw/tldraw/pull/5029))

- Updating shape props to undefined  when using editor.updateShape

#### Improve examples SEO ([#5069](https://github.com/tldraw/tldraw/pull/5069))

- Improves examples app SEO.

---

#### 🐛 Bug Fix

- Create SECURITY.md [#5169](https://github.com/tldraw/tldraw/pull/5169) ([@steveruizok](https://github.com/steveruizok))
- add snowstorm example, remove snowstorm from app [#5157](https://github.com/tldraw/tldraw/pull/5157) ([@steveruizok](https://github.com/steveruizok))
- Add snow [#5141](https://github.com/tldraw/tldraw/pull/5141) ([@steveruizok](https://github.com/steveruizok))
- docs: consistent CardShape type naming [#5121](https://github.com/tldraw/tldraw/pull/5121) ([@c-ehrlich](https://github.com/c-ehrlich))
- [botcom] Add pinned files [#5119](https://github.com/tldraw/tldraw/pull/5119) ([@steveruizok](https://github.com/steveruizok))
- Update logo-section.tsx [#5116](https://github.com/tldraw/tldraw/pull/5116) ([@steveruizok](https://github.com/steveruizok))
- alex/banner: banner [#5112](https://github.com/tldraw/tldraw/pull/5112) ([@SomeHats](https://github.com/SomeHats))
- Bump the version of the `upload-artifact` action. [#5111](https://github.com/tldraw/tldraw/pull/5111) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Landing page copy [#5108](https://github.com/tldraw/tldraw/pull/5108) ([@steveruizok](https://github.com/steveruizok))
- [botcom] move sidebar toggles in to sidebar layout so they're always visible [#5099](https://github.com/tldraw/tldraw/pull/5099) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Landing page copy changes [#5105](https://github.com/tldraw/tldraw/pull/5105) ([@steveruizok](https://github.com/steveruizok))
- alex/forms: form tweaks [#5103](https://github.com/tldraw/tldraw/pull/5103) ([@SomeHats](https://github.com/SomeHats))
- [botcom] Clear local session state on sign out [#5101](https://github.com/tldraw/tldraw/pull/5101) ([@ds300](https://github.com/ds300))
- Copywriting consolidate on file [#5097](https://github.com/tldraw/tldraw/pull/5097) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [botcom] delete old debug thing [#5102](https://github.com/tldraw/tldraw/pull/5102) ([@ds300](https://github.com/ds300))
- alex/missing-space: add spaces [#5098](https://github.com/tldraw/tldraw/pull/5098) ([@SomeHats](https://github.com/SomeHats))
- Fix typo in TldrawEditor example [#5070](https://github.com/tldraw/tldraw/pull/5070) ([@samrobbins85](https://github.com/samrobbins85))
- Delete the link to the discussion page from README.md that is now closed [#5088](https://github.com/tldraw/tldraw/pull/5088) ([@whitphx](https://github.com/whitphx))
- [botcom] Improve guest file link [#5096](https://github.com/tldraw/tldraw/pull/5096) ([@ds300](https://github.com/ds300))
- [botcom] Fix sidebar animation [#5094](https://github.com/tldraw/tldraw/pull/5094) ([@steveruizok](https://github.com/steveruizok))
- [botcom] fix sidebar pointer capture release [#5093](https://github.com/tldraw/tldraw/pull/5093) ([@ds300](https://github.com/ds300))
- [botcom] fancypants routes [#5078](https://github.com/tldraw/tldraw/pull/5078) ([@ds300](https://github.com/ds300))
- error page: wordsmith copy again [#4825](https://github.com/tldraw/tldraw/pull/4825) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- fix top panel widths [#5086](https://github.com/tldraw/tldraw/pull/5086) ([@steveruizok](https://github.com/steveruizok))
- [botcom] Update default title [#5085](https://github.com/tldraw/tldraw/pull/5085) ([@steveruizok](https://github.com/steveruizok))
- [botcom] resizable sidebar [#5074](https://github.com/tldraw/tldraw/pull/5074) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Cleanup social images [#5084](https://github.com/tldraw/tldraw/pull/5084) ([@steveruizok](https://github.com/steveruizok))
- Tweak logos [#5083](https://github.com/tldraw/tldraw/pull/5083) ([@steveruizok](https://github.com/steveruizok))
- Update landing page x2 [#5082](https://github.com/tldraw/tldraw/pull/5082) ([@steveruizok](https://github.com/steveruizok))
- Update landing page [#5072](https://github.com/tldraw/tldraw/pull/5072) ([@steveruizok](https://github.com/steveruizok))
- [botcom] use editor bg as page bg to make loading states less funky [#5080](https://github.com/tldraw/tldraw/pull/5080) ([@ds300](https://github.com/ds300))
- [botcom] fix noop file name edit interaction [#5077](https://github.com/tldraw/tldraw/pull/5077) ([@ds300](https://github.com/ds300))
- [botcom] cache file record in file DO [#5075](https://github.com/tldraw/tldraw/pull/5075) ([@ds300](https://github.com/ds300))
- Add gecko analytics [#5028](https://github.com/tldraw/tldraw/pull/5028) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add locked camera example. [#5058](https://github.com/tldraw/tldraw/pull/5058) ([@steveruizok](https://github.com/steveruizok))
- i18n: cleanup some missings strings; rework automation [#5068](https://github.com/tldraw/tldraw/pull/5068) ([@mimecuvalo](https://github.com/mimecuvalo))
- Lokalise: Translations update [#5067](https://github.com/tldraw/tldraw/pull/5067) ([@TodePond](https://github.com/TodePond))
- `tldraw`
  - Reduce snow motion [#5148](https://github.com/tldraw/tldraw/pull/5148) ([@steveruizok](https://github.com/steveruizok))
  - [botcom] Support legacy routes [#5123](https://github.com/tldraw/tldraw/pull/5123) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/utils`
  - [botcom] stress test fixes [#5126](https://github.com/tldraw/tldraw/pull/5126) ([@ds300](https://github.com/ds300))
  - [botcom] retry user requests on connection failure [#5073](https://github.com/tldraw/tldraw/pull/5073) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/utils`
  - [botcom] slurp local files on sign in [#5059](https://github.com/tldraw/tldraw/pull/5059) ([@ds300](https://github.com/ds300))

#### ⚠️ Pushed to `main`

- Update README.md ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fixes

- fix: fix broken bluesky link with old handle name [#5120](https://github.com/tldraw/tldraw/pull/5120) ([@shuuji3](https://github.com/shuuji3))
- Fix sync worker source maps. [#5100](https://github.com/tldraw/tldraw/pull/5100) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix locale changes. [#5092](https://github.com/tldraw/tldraw/pull/5092) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Localize `Untitled project` [#5079](https://github.com/tldraw/tldraw/pull/5079) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - Gist embed: restrict the url to a more strict format [#5170](https://github.com/tldraw/tldraw/pull/5170) ([@mimecuvalo](https://github.com/mimecuvalo))
  - embeds: fix Gist; fix Val Town; add support for <iframe> [#5143](https://github.com/tldraw/tldraw/pull/5143) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix max image dimension prop not getting applied. [#5176](https://github.com/tldraw/tldraw/pull/5176) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix popover going off screen [#5039](https://github.com/tldraw/tldraw/pull/5039) ([@hipstersmoothie](https://github.com/hipstersmoothie) [@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))
  - Fix a bug when holding ctrl or meta and rotating [#5087](https://github.com/tldraw/tldraw/pull/5087) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Fix relative CSS import rules failing to be fetched [#5172](https://github.com/tldraw/tldraw/pull/5172) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))
  - Don't add the baseElem to the container in textmanager [#5127](https://github.com/tldraw/tldraw/pull/5127) ([@ds300](https://github.com/ds300))
  - fix hot reload text measurement bug [#5125](https://github.com/tldraw/tldraw/pull/5125) ([@ds300](https://github.com/ds300))
  - fix: Updating shape props to undefined when using editor.updateShape [#5029](https://github.com/tldraw/tldraw/pull/5029) ([@kazu-2020](https://github.com/kazu-2020) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/store`
  - Execute reactor immediately on listen [#5133](https://github.com/tldraw/tldraw/pull/5133) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state-react`
  - fix stale closure in InnerShape [#5117](https://github.com/tldraw/tldraw/pull/5117) ([@ds300](https://github.com/ds300))

#### 💄 Product Improvements

- Update docs. [#5167](https://github.com/tldraw/tldraw/pull/5167) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add name and timeout params. [#5129](https://github.com/tldraw/tldraw/pull/5129) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Close connections [#5128](https://github.com/tldraw/tldraw/pull/5128) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Improve the ux of dragging the files to the sidebar [#5076](https://github.com/tldraw/tldraw/pull/5076) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Improve examples SEO [#5069](https://github.com/tldraw/tldraw/pull/5069) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`
  - Improve rerenedring of the page menu and quick actions [#5057](https://github.com/tldraw/tldraw/pull/5057) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🛠️ API Changes

- `@tldraw/editor`, `tldraw`
  - Allow expandSelectionOutlinePx to return a Box [#5168](https://github.com/tldraw/tldraw/pull/5168) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))
- `@tldraw/editor`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`
  - custom sync presence [#5071](https://github.com/tldraw/tldraw/pull/5071) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 13

- alex ([@SomeHats](https://github.com/SomeHats))
- Andrew Lisowski ([@hipstersmoothie](https://github.com/hipstersmoothie))
- Christopher Ehrlich ([@c-ehrlich](https://github.com/c-ehrlich))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- mimata kazutaka ([@kazu-2020](https://github.com/kazu-2020))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Sam Robbins ([@samrobbins85](https://github.com/samrobbins85))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- TAKAHASHI Shuuji ([@shuuji3](https://github.com/shuuji3))
- Trygve Aaberge ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))
- Yuichiro Tachibana (Tsuchiya) ([@whitphx](https://github.com/whitphx))

---

# v3.6.0 (Wed Dec 04 2024)

### Release Notes

#### assets: fix up resolving when copy/pasting multiple items; also, videos ([#5061](https://github.com/tldraw/tldraw/pull/5061))

- Fixed bugs with copy/pasting multilple assets from one board to another.
- Fixed bug with copy/pasting videos from one board to another.

#### Expand helpers available in actions / toasts overrides. ([#5041](https://github.com/tldraw/tldraw/pull/5041))

- Makes new helper available via actions and tools overrides.

#### Fix file name when exporting a single unnamed frame ([#4918](https://github.com/tldraw/tldraw/pull/4918))

- Fix file name when exporting a single unnamed frame

#### Fix some export bugs ([#5022](https://github.com/tldraw/tldraw/pull/5022))

- Properly clip scaled text in frames when exporting
- Stop multiple concurrent exports from interfering with each-others fonts

#### Create a utility type for making undefined properties optional ([#5055](https://github.com/tldraw/tldraw/pull/5055))

- Expose a utility type for making undefined properties optional

#### Make sure notes snap to grid after position is updated ([#5010](https://github.com/tldraw/tldraw/pull/5010))

- Fixed a bug with notes not snapping to the grid unless the size was a multiple of the grid size.

#### Fix custom embed first render ([#5027](https://github.com/tldraw/tldraw/pull/5027))

- Fix an issue with custom embeds not rendering correctly on the first render.

#### Fix long press bug (#5032) ([#5034](https://github.com/tldraw/tldraw/pull/5034))

- Fixed a bug with long press on inset canvases.

#### Fix long press bug ([#5032](https://github.com/tldraw/tldraw/pull/5032))

- Fixed a bug with long press on inset canvases.

---

#### 🐛 Bug Fix

- tldraw.dev landing page dark mode fixes [#5066](https://github.com/tldraw/tldraw/pull/5066) ([@SomeHats](https://github.com/SomeHats))
- [botcom] Remove unused overlay CSS [#5050](https://github.com/tldraw/tldraw/pull/5050) ([@steveruizok](https://github.com/steveruizok))
- workflow: up checks.yml power [#5048](https://github.com/tldraw/tldraw/pull/5048) ([@mimecuvalo](https://github.com/mimecuvalo))
- [botcom] Set document title from file name [#5042](https://github.com/tldraw/tldraw/pull/5042) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Incremental derivation example [#5038](https://github.com/tldraw/tldraw/pull/5038) ([@steveruizok](https://github.com/steveruizok))
- [botcom] Wait 1000s before marking a file as re-visited [#4998](https://github.com/tldraw/tldraw/pull/4998) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))
- [botcom] add protocol version [#5024](https://github.com/tldraw/tldraw/pull/5024) ([@ds300](https://github.com/ds300))
- i18n: typing tweak [#5025](https://github.com/tldraw/tldraw/pull/5025) ([@mimecuvalo](https://github.com/mimecuvalo))
- marketing: fix z-index issue with homepage demo [#5023](https://github.com/tldraw/tldraw/pull/5023) ([@mimecuvalo](https://github.com/mimecuvalo))
- argh fix the migrations ([@ds300](https://github.com/ds300))
- [botcom] undo playwright pipe [#5017](https://github.com/tldraw/tldraw/pull/5017) ([@ds300](https://github.com/ds300))
- [botcom] auto migrations again [#5014](https://github.com/tldraw/tldraw/pull/5014) ([@ds300](https://github.com/ds300))
- Use lower end machines. [#5008](https://github.com/tldraw/tldraw/pull/5008) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Revert "[botcom] make sure we apply all the migrations to all environments" [#5009](https://github.com/tldraw/tldraw/pull/5009) ([@ds300](https://github.com/ds300))
- [botcom] make sure we apply all the migrations to all environments [#5005](https://github.com/tldraw/tldraw/pull/5005) ([@ds300](https://github.com/ds300))
- i18n: better typing and fix tldr file drop [#5006](https://github.com/tldraw/tldraw/pull/5006) ([@mimecuvalo](https://github.com/mimecuvalo))
- [botcom] Move guest badge to the left [#5004](https://github.com/tldraw/tldraw/pull/5004) ([@steveruizok](https://github.com/steveruizok))
- [botcom] owner info in side bar [#4994](https://github.com/tldraw/tldraw/pull/4994) ([@ds300](https://github.com/ds300))
- `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Create a utility type for making undefined properties optional [#5055](https://github.com/tldraw/tldraw/pull/5055) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk) [@SomeHats](https://github.com/SomeHats))
- `tldraw`
  - [botcom] Add import / save as tldr file. [#5049](https://github.com/tldraw/tldraw/pull/5049) ([@steveruizok](https://github.com/steveruizok))
  - [botcom] more design tweaks [#4995](https://github.com/tldraw/tldraw/pull/4995) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fixes

- Fix the offline indicator [#5046](https://github.com/tldraw/tldraw/pull/5046) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix long press bug (#5032) [#5034](https://github.com/tldraw/tldraw/pull/5034) ([@steveruizok](https://github.com/steveruizok))
- Fix the file name flashing with an old value [#5015](https://github.com/tldraw/tldraw/pull/5015) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix an issue with `firstVisitAt` not getting set [#5002](https://github.com/tldraw/tldraw/pull/5002) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - assets: fix up resolving when copy/pasting multiple items; also, videos [#5061](https://github.com/tldraw/tldraw/pull/5061) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix some export bugs [#5022](https://github.com/tldraw/tldraw/pull/5022) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - Fix long press bug [#5032](https://github.com/tldraw/tldraw/pull/5032) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Fix file name when exporting a single unnamed frame [#4918](https://github.com/tldraw/tldraw/pull/4918) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk) [@SomeHats](https://github.com/SomeHats) [@MitjaBezensek](https://github.com/MitjaBezensek))
  - Make sure notes snap to grid after position is updated [#5010](https://github.com/tldraw/tldraw/pull/5010) ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk) [@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix custom embed first render [#5027](https://github.com/tldraw/tldraw/pull/5027) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tlschema`
  - Fix an issue with drag and dropping the files [#5013](https://github.com/tldraw/tldraw/pull/5013) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 💄 Product Improvements

- Move to job level. [#5056](https://github.com/tldraw/tldraw/pull/5056) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Simplify. [#5054](https://github.com/tldraw/tldraw/pull/5054) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Don't run on forks. [#5053](https://github.com/tldraw/tldraw/pull/5053) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Don't trigger navigation if we are already on the correct file page [#5018](https://github.com/tldraw/tldraw/pull/5018) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300))
- Allow renaming files when pressing enter [#5019](https://github.com/tldraw/tldraw/pull/5019) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300))
- Improve mutation rejection toasts [#4999](https://github.com/tldraw/tldraw/pull/4999) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/sync-core`
  - [dotcom] Handle max connections properly [#5044](https://github.com/tldraw/tldraw/pull/5044) ([@ds300](https://github.com/ds300))

#### 🛠️ API Changes

- `tldraw`
  - Expand helpers available in actions / toasts overrides. [#5041](https://github.com/tldraw/tldraw/pull/5041) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 7

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Trygve Aaberge ([@trygve-aaberge-adsk](https://github.com/trygve-aaberge-adsk))

---

# v3.5.0 (Tue Nov 26 2024)

### Release Notes

#### Use partials when mutating ([#4993](https://github.com/tldraw/tldraw/pull/4993))

- Only send the changed columns when doing update mutations.

#### Make sure our tests can test if data was propagated to the server ([#4986](https://github.com/tldraw/tldraw/pull/4986))

- Improve our testing story by also adding a helper for testing whether certain expectation is met before and after a page reload.

#### Fix an issue when navigating back to a forgoten file did not restore it. ([#4996](https://github.com/tldraw/tldraw/pull/4996))

- Fixes an issue when navigating back to a forgotten file did not restore it.

#### Remove logging ([#4997](https://github.com/tldraw/tldraw/pull/4997))

- Remove logging when supabase credentials are not present.

#### Soft deleting of files ([#4992](https://github.com/tldraw/tldraw/pull/4992))

- Add soft deleting of files.

#### Allow custom react providers in SVG exports ([#4991](https://github.com/tldraw/tldraw/pull/4991))

- You can now supply a custom react context provider for SVG exports

#### Wait for the guest file to be loaded before showing an entry in the sidebar ([#4977](https://github.com/tldraw/tldraw/pull/4977))

- We only show the guest file in the sidebar when the file record is loaded. Otherwise we get this file name flickering since we don't have the file name when we just visit the shared link.

#### Scroll the sidebar to the top when creating or deleting files ([#4974](https://github.com/tldraw/tldraw/pull/4974))

- Make sure the active file is visible in the sidebar after creating a file or deleting it.

#### Use tla user's color and pass it to the editor. ([#4973](https://github.com/tldraw/tldraw/pull/4973))

- User's color should now persist between sessions.

#### Add a trigger to update the `updatedAt` field when we either update file metadata or the file's contents ([#4967](https://github.com/tldraw/tldraw/pull/4967))

- Update the file's `updatedAt` field.

#### Fix an issue with rejections not getting sent. ([#4968](https://github.com/tldraw/tldraw/pull/4968))

- Fix an issue with mutation rejections not being sent.

#### Fix invite button on people menu ([#4988](https://github.com/tldraw/tldraw/pull/4988))

- Fixed a bug causing the invite button on the collaborators menu not to open the share panel

#### Click / right click on frame headings ([#4979](https://github.com/tldraw/tldraw/pull/4979))

- Improved clicks for frame headings

#### Increase the wait duration. ([#4976](https://github.com/tldraw/tldraw/pull/4976))

- Increase how long we can wait for postgress to boot up.

#### Improve the names for files that have no name set ([#4962](https://github.com/tldraw/tldraw/pull/4962))

- Fixed a bug with…

#### Fix an error when signing out ([#4964](https://github.com/tldraw/tldraw/pull/4964))

- Fix an error with signing out.

#### Make sure the published slugs are unique. ([#4963](https://github.com/tldraw/tldraw/pull/4963))

- Don't allow creating files with non unique published slugs.

#### Improve the names for duplicated files ([#4958](https://github.com/tldraw/tldraw/pull/4958))

- Improve the file duplication names.

#### Simplify e2e test running. ([#4957](https://github.com/tldraw/tldraw/pull/4957))

- Simplify botcom e2e logic.

#### Use sign up here. ([#4952](https://github.com/tldraw/tldraw/pull/4952))

- Sign up button now opens the sign up form.

#### Pin replicator close to supabase ([#4955](https://github.com/tldraw/tldraw/pull/4955))

- Pin 🙏  the postgres replicator close to the DB.

#### Lazy replicator ([#4926](https://github.com/tldraw/tldraw/pull/4926))

- Fixed a bug with…

#### Clean up what we output. ([#4950](https://github.com/tldraw/tldraw/pull/4950))

- Improve the e2e tests outputs.

#### Examples changes ([#4865](https://github.com/tldraw/tldraw/pull/4865))

- Improved examples naming, tags and priority

#### Update license references ([#4929](https://github.com/tldraw/tldraw/pull/4929))

- Update license references

#### Error link blue ([#4932](https://github.com/tldraw/tldraw/pull/4932))

close #4927 

![image](https://github.com/user-attachments/assets/01b1a73f-d26b-456f-8617-e7236f028fe4)

```
<a href={url.toString()} style={{ color: 'blue', textDecoration: 'underline' }}>
	create a GitHub issue
</a>
```
Added blue underline style to links in error messages.
Currently, tldraw seems to be styling with CSS. If it's good, I'll add a style for that function in css.
If so, more styles can be applied.
For ex...(There are concerns that writing this as style props may reduce readability.)
```
a {
  color: #0000ee; 
  text-decoration: underline; 
  cursor: pointer; 
}

a:visited {
  color: #551a8b; 
}

a:hover {
  color: #0000cc; 
  text-decoration: underline; 
}

a:active {
  color: #ff0000; 
}
```

#### Improve panning performance when we have many not shapes and when we are zoomed out ([#4935](https://github.com/tldraw/tldraw/pull/4935))

- Improve performance of rendering note shapes when zoomed out past 35%.

#### Small cleanup. ([#4943](https://github.com/tldraw/tldraw/pull/4943))

- Small cleanup for the request form.

#### Hubspot form ([#4941](https://github.com/tldraw/tldraw/pull/4941))

- Integrate with Hubspot.

#### botcom e2e tests ([#4852](https://github.com/tldraw/tldraw/pull/4852))

- Bring back dotcom e2e tests, make them more stable, and add a few more of them.

#### chore(api): expose font sizes, stroke sizes api ([#4940](https://github.com/tldraw/tldraw/pull/4940))

- Expose `ARROW_LABEL_FONT_SIZES`, `STROKE_SIZES`, `FONT_SIZES`

#### remove zoom to label ([#4872](https://github.com/tldraw/tldraw/pull/4872))

- Removed zoom to label feature when editing shape labels

#### Add rate limiting. ([#4898](https://github.com/tldraw/tldraw/pull/4898))

- Fixed a bug with…

#### Fix issue. ([#4910](https://github.com/tldraw/tldraw/pull/4910))

- Fix an issue with references a non existing table.

#### Snap to grid when creating shapes ([#4875](https://github.com/tldraw/tldraw/pull/4875))

- Shapes snap to grid on creation, or when adding points.

#### Remove d1. ([#4899](https://github.com/tldraw/tldraw/pull/4899))

- Remove D1 from the codebase.

#### make sure copy-as-png comes in at natural size ([#4771](https://github.com/tldraw/tldraw/pull/4771))

-  Shapes copied as PNG will have the same size when pasted back into tldraw.

#### Only send updates to active users ([#4894](https://github.com/tldraw/tldraw/pull/4894))

- Only send updates to active users.

#### Make some keys not updatable. ([#4890](https://github.com/tldraw/tldraw/pull/4890))

- Prevent the users from updating certain fields (like email for users, createdAt for all records, ownerId for files).

#### Pin DO and a small refactor ([#4889](https://github.com/tldraw/tldraw/pull/4889))

- Pin the DO to the user's location.

#### FE Fixes ([#4885](https://github.com/tldraw/tldraw/pull/4885))

- Fix an issue with not correctly creating a file when the user signs up.
- Fix an issue when signing out.
- Fix some asset loading issues. 
- Adds batching of messages. Now sending them every 50ms.

#### Add dev website as an option. ([#4887](https://github.com/tldraw/tldraw/pull/4887))

- Add tldraw.dev as an option for bug reports.

#### [wip] custom botcom backend ([#4879](https://github.com/tldraw/tldraw/pull/4879))

- Fixed a bug with…

#### Remove dotcom e2e tests for now. ([#4878](https://github.com/tldraw/tldraw/pull/4878))

- Temporarily disable dotcom e2e tests.

#### Smart bringForward/sendBackward ([#4851](https://github.com/tldraw/tldraw/pull/4851))

- Improved the 'bring forward' and 'send backward' actions by making them only consider nearby overlapping shapes when deciding the next ordering.

#### Fix shapes getting stuck in erasing state ([#4861](https://github.com/tldraw/tldraw/pull/4861))

- Fixed a bug with shapes getting stuck in the translucent erasing state.

#### Remove outlines from buttons until we fix radix-ui issues ([#4855](https://github.com/tldraw/tldraw/pull/4855))

- Fixed a bug with focus outlines appearing in menu items at the wrong time.

#### fix id regression ([#4849](https://github.com/tldraw/tldraw/pull/4849))

- Prevent arrows being clipped incorrectly when multiple tldraw instances or exports are present in the dom.

#### Add option to disable text creation on double click ([#4841](https://github.com/tldraw/tldraw/pull/4841))

- Add option to disable text creation on double click `createTextOnCanvasDoubleClick`

#### Better support scale / quality in export utilities ([#4795](https://github.com/tldraw/tldraw/pull/4795))

- Improved treatment of `scale` in image copy / export utilities.

#### Call ensureStoreIsUsable after mergeRemoteChanges ([#4833](https://github.com/tldraw/tldraw/pull/4833))

- Add store consistency checks during `mergeRemoteChanges`

#### Sharing tests ([#4824](https://github.com/tldraw/tldraw/pull/4824))

- Add sharing tests (inviting and publishing).

#### Isolate tests by resetting the db between each test. ([#4817](https://github.com/tldraw/tldraw/pull/4817))

- Isolates tests by resetting the db.

#### Store all the published snapshots instead of only the last one ([#4829](https://github.com/tldraw/tldraw/pull/4829))

- Store all the published snapshots instead of only the latest one.

#### [botcom] Analytics tracking ([#4805](https://github.com/tldraw/tldraw/pull/4805))

- Fixed a bug with…

#### [dotcom] fix Safari sleep crash ([#4822](https://github.com/tldraw/tldraw/pull/4822))

- Fixed a bug causing the app to crash on Safari (desktop or iPad) when the wifi is disconnected.

#### docs: fix up NPE on release pages ([#4818](https://github.com/tldraw/tldraw/pull/4818))

- Fix NPE bug with release pages on docs

#### Fix publishing. ([#4813](https://github.com/tldraw/tldraw/pull/4813))

- Fix loading of published snapshots.

#### Don't pipe out webserver stuff. ([#4814](https://github.com/tldraw/tldraw/pull/4814))

- Declutter the printout for e2e tests in CI.

#### Organize paths. ([#4786](https://github.com/tldraw/tldraw/pull/4786))

- Help with tla route / paths organization.

#### Imported wrong css ([#4807](https://github.com/tldraw/tldraw/pull/4807))

- Fixed a bug with tutorial documentation QuickStart. It did not import 'tldraw/tldraw.css' in the code snippet

#### Improve hovers on page menu ([#4788](https://github.com/tldraw/tldraw/pull/4788))

- Improve the page menu hover effects.

#### kbd shortcuts: fix up wrong size dialog on desktop ([#4791](https://github.com/tldraw/tldraw/pull/4791))

- Fix keyboard shortcuts dialog being narrow on desktop.

#### Make default color theme light. ([#4796](https://github.com/tldraw/tldraw/pull/4796))

- Sets the default color theme to light.

#### Fix toast spacing ([#4800](https://github.com/tldraw/tldraw/pull/4800))

- Fixed a bug with toast layout.

#### Fix dragging on frame headings ([#4794](https://github.com/tldraw/tldraw/pull/4794))

- Fixed a bug with dragging frames by their heading.

#### e2e scaffolding ([#4760](https://github.com/tldraw/tldraw/pull/4760))

- e2e scaffolding for botcom.

---

#### 🐛 Bug Fix

- [botcom] allow creating rooms quickly [#4990](https://github.com/tldraw/tldraw/pull/4990) ([@ds300](https://github.com/ds300))
- [botcom] simplify replicator dispatch logic [#4965](https://github.com/tldraw/tldraw/pull/4965) ([@ds300](https://github.com/ds300))
- Add eslint rule for react-intl. [#4983](https://github.com/tldraw/tldraw/pull/4983) ([@steveruizok](https://github.com/steveruizok))
- select: fix up positioning [#4978](https://github.com/tldraw/tldraw/pull/4978) ([@mimecuvalo](https://github.com/mimecuvalo))
- [botcom] Nav spacing/typography/alignment fixes [#4966](https://github.com/tldraw/tldraw/pull/4966) ([@ds300](https://github.com/ds300))
- [botcom] fix random remounting [#4959](https://github.com/tldraw/tldraw/pull/4959) ([@ds300](https://github.com/ds300))
- [botcom] fix top bar size on desktop [#4961](https://github.com/tldraw/tldraw/pull/4961) ([@ds300](https://github.com/ds300))
- [botcom] fix sharing defaults [#4956](https://github.com/tldraw/tldraw/pull/4956) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Lazy replicator [#4926](https://github.com/tldraw/tldraw/pull/4926) ([@ds300](https://github.com/ds300))
- Add jobs to tldraw.dev [#4949](https://github.com/tldraw/tldraw/pull/4949) ([@steveruizok](https://github.com/steveruizok))
- Hubspot form [#4941](https://github.com/tldraw/tldraw/pull/4941) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Permissions example [#4930](https://github.com/tldraw/tldraw/pull/4930) ([@steveruizok](https://github.com/steveruizok))
- i18n: disable the debug formatMessage, causing issues with translation at the moment [#4925](https://github.com/tldraw/tldraw/pull/4925) ([@mimecuvalo](https://github.com/mimecuvalo))
- handle postgres failures in replicator [#4912](https://github.com/tldraw/tldraw/pull/4912) ([@ds300](https://github.com/ds300))
- disable clipboard tests [#4913](https://github.com/tldraw/tldraw/pull/4913) ([@SomeHats](https://github.com/SomeHats))
- Make e2e tests run in sequence within a file [#4911](https://github.com/tldraw/tldraw/pull/4911) ([@SomeHats](https://github.com/SomeHats))
- fix postgres setup [#4908](https://github.com/tldraw/tldraw/pull/4908) ([@ds300](https://github.com/ds300))
- fix dev postgres setup [#4891](https://github.com/tldraw/tldraw/pull/4891) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Robustify replicator bootup [#4888](https://github.com/tldraw/tldraw/pull/4888) ([@ds300](https://github.com/ds300))
- only cache assets from the current deploy [#4863](https://github.com/tldraw/tldraw/pull/4863) ([@SomeHats](https://github.com/SomeHats) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Remove dotcom e2e tests for now. [#4878](https://github.com/tldraw/tldraw/pull/4878) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- dotcom: use Inter font via a <link> for better Cloudflare optimization [#4874](https://github.com/tldraw/tldraw/pull/4874) ([@mimecuvalo](https://github.com/mimecuvalo))
- fonts: fix up preconnect in index.html [#4870](https://github.com/tldraw/tldraw/pull/4870) ([@mimecuvalo](https://github.com/mimecuvalo))
- i18n: fix up incorrect key name [#4867](https://github.com/tldraw/tldraw/pull/4867) ([@mimecuvalo](https://github.com/mimecuvalo))
- i18n: wire up strings [#4834](https://github.com/tldraw/tldraw/pull/4834) ([@mimecuvalo](https://github.com/mimecuvalo))
- dev: restore the loading state for the demo placeholder [#4826](https://github.com/tldraw/tldraw/pull/4826) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- [botcom] stub more end to end tests [#4844](https://github.com/tldraw/tldraw/pull/4844) ([@steveruizok](https://github.com/steveruizok))
- Try to make the site show up on Google [#4842](https://github.com/tldraw/tldraw/pull/4842) ([@steveruizok](https://github.com/steveruizok))
- publish layout: enable some file actions even if readonly mode [#4831](https://github.com/tldraw/tldraw/pull/4831) ([@mimecuvalo](https://github.com/mimecuvalo))
- botcom: shareable by default [#4830](https://github.com/tldraw/tldraw/pull/4830) ([@mimecuvalo](https://github.com/mimecuvalo))
- error page: have inline icon when offline [#4823](https://github.com/tldraw/tldraw/pull/4823) ([@mimecuvalo](https://github.com/mimecuvalo))
- [botcom] Fix double presence [#4819](https://github.com/tldraw/tldraw/pull/4819) ([@ds300](https://github.com/ds300))
- update vite [#4811](https://github.com/tldraw/tldraw/pull/4811) ([@ds300](https://github.com/ds300))
- [botcom] add max file limit [#4806](https://github.com/tldraw/tldraw/pull/4806) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))
- [botcom] Improve mobile anonymous layout [#4789](https://github.com/tldraw/tldraw/pull/4789) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))
- [infra] disable webhook invocation (temporarily) [#4808](https://github.com/tldraw/tldraw/pull/4808) ([@ds300](https://github.com/ds300))
- [botcom] Improve UI for file name editing [#4803](https://github.com/tldraw/tldraw/pull/4803) ([@steveruizok](https://github.com/steveruizok))
- [botcom] Fix mobile top bar [#4785](https://github.com/tldraw/tldraw/pull/4785) ([@steveruizok](https://github.com/steveruizok))
- botcom: alt take on forbidden vs not authorized [#4782](https://github.com/tldraw/tldraw/pull/4782) ([@mimecuvalo](https://github.com/mimecuvalo))
- [botcom] fix file deletion [#4784](https://github.com/tldraw/tldraw/pull/4784) ([@ds300](https://github.com/ds300))
- botcom: signup shouldnt redirect to /user page [#4783](https://github.com/tldraw/tldraw/pull/4783) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - [botcom] Pre-launch design / UX pass [#4984](https://github.com/tldraw/tldraw/pull/4984) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))
  - botcom: add react-select for better select menus [#4920](https://github.com/tldraw/tldraw/pull/4920) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/utils`
  - [botcom] New backend (again) [#4884](https://github.com/tldraw/tldraw/pull/4884) ([@ds300](https://github.com/ds300))
  - Revert "[wip] custom botcom backend" [#4883](https://github.com/tldraw/tldraw/pull/4883) ([@ds300](https://github.com/ds300))
  - [wip] custom botcom backend [#4879](https://github.com/tldraw/tldraw/pull/4879) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/assets`, `@tldraw/sync-core`, `@tldraw/sync`
  - botcom: scaffolding for i18n [#4719](https://github.com/tldraw/tldraw/pull/4719) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `tldraw`
  - [botcom] improve error UX [#4790](https://github.com/tldraw/tldraw/pull/4790) ([@ds300](https://github.com/ds300))
- `@tldraw/sync-core`
  - [botcom] Duplicate / Publish / Create / Delete files on the server [#4798](https://github.com/tldraw/tldraw/pull/4798) ([@steveruizok](https://github.com/steveruizok))

#### ⚠️ Pushed to `main`

- add disused DO export ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fixes

- Use partials when mutating [#4993](https://github.com/tldraw/tldraw/pull/4993) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix an issue when navigating back to a forgoten file did not restore it. [#4996](https://github.com/tldraw/tldraw/pull/4996) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Use tla user's color and pass it to the editor. [#4973](https://github.com/tldraw/tldraw/pull/4973) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix an issue with rejections not getting sent. [#4968](https://github.com/tldraw/tldraw/pull/4968) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix invite button on people menu [#4988](https://github.com/tldraw/tldraw/pull/4988) ([@steveruizok](https://github.com/steveruizok))
- Fix an error when signing out [#4964](https://github.com/tldraw/tldraw/pull/4964) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Use sign up here. [#4952](https://github.com/tldraw/tldraw/pull/4952) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- fix missing comma in example shape json [#4903](https://github.com/tldraw/tldraw/pull/4903) ([@tatthien](https://github.com/tatthien))
- Fix issue. [#4910](https://github.com/tldraw/tldraw/pull/4910) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- FE Fixes [#4885](https://github.com/tldraw/tldraw/pull/4885) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- docs: fix up NPE on release pages [#4818](https://github.com/tldraw/tldraw/pull/4818) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix publishing. [#4813](https://github.com/tldraw/tldraw/pull/4813) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Imported wrong css [#4807](https://github.com/tldraw/tldraw/pull/4807) ([@Crysta1ightning](https://github.com/Crysta1ightning))
- `tldraw`
  - remove zoom to label [#4872](https://github.com/tldraw/tldraw/pull/4872) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Fix shapes getting stuck in erasing state [#4861](https://github.com/tldraw/tldraw/pull/4861) ([@TodePond](https://github.com/TodePond))
  - fix id regression [#4849](https://github.com/tldraw/tldraw/pull/4849) ([@SomeHats](https://github.com/SomeHats))
  - kbd shortcuts: fix up wrong size dialog on desktop [#4791](https://github.com/tldraw/tldraw/pull/4791) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix toast spacing [#4800](https://github.com/tldraw/tldraw/pull/4800) ([@steveruizok](https://github.com/steveruizok))
  - Fix dragging on frame headings [#4794](https://github.com/tldraw/tldraw/pull/4794) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`, `@tldraw/utils`
  - make sure copy-as-png comes in at natural size [#4771](https://github.com/tldraw/tldraw/pull/4771) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `tldraw`
  - Remove outlines from buttons until we fix radix-ui issues [#4855](https://github.com/tldraw/tldraw/pull/4855) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/sync-core`
  - [dotcom] fix Safari sleep crash [#4822](https://github.com/tldraw/tldraw/pull/4822) ([@ds300](https://github.com/ds300))

#### 💄 Product Improvements

- Make sure our tests can test if data was propagated to the server [#4986](https://github.com/tldraw/tldraw/pull/4986) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Remove logging [#4997](https://github.com/tldraw/tldraw/pull/4997) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Wait for the guest file to be loaded before showing an entry in the sidebar [#4977](https://github.com/tldraw/tldraw/pull/4977) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Scroll the sidebar to the top when creating or deleting files [#4974](https://github.com/tldraw/tldraw/pull/4974) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300))
- Add a trigger to update the `updatedAt` field when we either update file metadata or the file's contents [#4967](https://github.com/tldraw/tldraw/pull/4967) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Increase the wait duration. [#4976](https://github.com/tldraw/tldraw/pull/4976) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Improve the names for files that have no name set [#4962](https://github.com/tldraw/tldraw/pull/4962) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make sure the published slugs are unique. [#4963](https://github.com/tldraw/tldraw/pull/4963) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Improve the names for duplicated files [#4958](https://github.com/tldraw/tldraw/pull/4958) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Simplify e2e test running. [#4957](https://github.com/tldraw/tldraw/pull/4957) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Pin replicator close to supabase [#4955](https://github.com/tldraw/tldraw/pull/4955) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Clean up what we output. [#4950](https://github.com/tldraw/tldraw/pull/4950) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Examples changes [#4865](https://github.com/tldraw/tldraw/pull/4865) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Update license references [#4929](https://github.com/tldraw/tldraw/pull/4929) ([@emmanuel-ferdman](https://github.com/emmanuel-ferdman))
- Small cleanup. [#4943](https://github.com/tldraw/tldraw/pull/4943) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- botcom e2e tests [#4852](https://github.com/tldraw/tldraw/pull/4852) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Remove d1. [#4899](https://github.com/tldraw/tldraw/pull/4899) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Only send updates to active users [#4894](https://github.com/tldraw/tldraw/pull/4894) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Make some keys not updatable. [#4890](https://github.com/tldraw/tldraw/pull/4890) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Pin DO and a small refactor [#4889](https://github.com/tldraw/tldraw/pull/4889) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add dev website as an option. [#4887](https://github.com/tldraw/tldraw/pull/4887) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Sharing tests [#4824](https://github.com/tldraw/tldraw/pull/4824) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Isolate tests by resetting the db between each test. [#4817](https://github.com/tldraw/tldraw/pull/4817) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Store all the published snapshots instead of only the last one [#4829](https://github.com/tldraw/tldraw/pull/4829) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Don't pipe out webserver stuff. [#4814](https://github.com/tldraw/tldraw/pull/4814) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Organize paths. [#4786](https://github.com/tldraw/tldraw/pull/4786) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [botcom] Double click sidebar item to edit inline [#4802](https://github.com/tldraw/tldraw/pull/4802) ([@steveruizok](https://github.com/steveruizok))
- Wrap no index [#4773](https://github.com/tldraw/tldraw/pull/4773) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`
  - Click / right click on frame headings [#4979](https://github.com/tldraw/tldraw/pull/4979) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - Lokalise: Translations update [#4947](https://github.com/tldraw/tldraw/pull/4947) ([@TodePond](https://github.com/TodePond) [@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - Error link blue [#4932](https://github.com/tldraw/tldraw/pull/4932) ([@nayounsang](https://github.com/nayounsang) [@steveruizok](https://github.com/steveruizok))
  - Make default color theme light. [#4796](https://github.com/tldraw/tldraw/pull/4796) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Improve panning performance when we have many not shapes and when we are zoomed out [#4935](https://github.com/tldraw/tldraw/pull/4935) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Improve hovers on page menu [#4788](https://github.com/tldraw/tldraw/pull/4788) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/sync-core`, `@tldraw/sync`
  - Add rate limiting. [#4898](https://github.com/tldraw/tldraw/pull/4898) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - Snap to grid when creating shapes [#4875](https://github.com/tldraw/tldraw/pull/4875) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@mimecuvalo](https://github.com/mimecuvalo))
  - Smart bringForward/sendBackward [#4851](https://github.com/tldraw/tldraw/pull/4851) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/store`, `@tldraw/sync-core`
  - Call ensureStoreIsUsable after mergeRemoteChanges [#4833](https://github.com/tldraw/tldraw/pull/4833) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- Soft deleting of files [#4992](https://github.com/tldraw/tldraw/pull/4992) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [botcom] Analytics tracking [#4805](https://github.com/tldraw/tldraw/pull/4805) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- e2e scaffolding [#4760](https://github.com/tldraw/tldraw/pull/4760) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - Add option to disable text creation on double click [#4841](https://github.com/tldraw/tldraw/pull/4841) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))

#### 🛠️ API Changes

- `@tldraw/editor`
  - Allow custom react providers in SVG exports [#4991](https://github.com/tldraw/tldraw/pull/4991) ([@SomeHats](https://github.com/SomeHats))
- `tldraw`
  - chore(api): expose font sizes, stroke sizes api [#4940](https://github.com/tldraw/tldraw/pull/4940) ([@judicaelandria](https://github.com/judicaelandria))
- `@tldraw/editor`, `tldraw`
  - Better support scale / quality in export utilities [#4795](https://github.com/tldraw/tldraw/pull/4795) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Revert "Add eslint rule for react-intl." [#4985](https://github.com/tldraw/tldraw/pull/4985) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 13

- [@Crysta1ightning](https://github.com/Crysta1ightning)
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Emmanuel Ferdman ([@emmanuel-ferdman](https://github.com/emmanuel-ferdman))
- Judicael ([@judicaelandria](https://github.com/judicaelandria))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Thien Nguyen ([@tatthien](https://github.com/tatthien))
- Younsang Na ([@nayounsang](https://github.com/nayounsang))

---

# v3.4.0 (Thu Oct 24 2024)

### Release Notes

#### [botcom] Publishing ([#4688](https://github.com/tldraw/tldraw/pull/4688))

- Add publishing to botcom.

#### npm: upgrade eslint v8 → v9 ([#4757](https://github.com/tldraw/tldraw/pull/4757))

- Upgrade eslint v8 → v9

#### make options object stable ([#4762](https://github.com/tldraw/tldraw/pull/4762))

- Writing `options` inline in the Tldraw component will no longer cause re-render loops

#### [Fix] Toolbar button outline border radius ([#4759](https://github.com/tldraw/tldraw/pull/4759))

- Fixed a bug with the border radius on toolbar button outlines.

#### Improve tooltips in the style panel ([#4750](https://github.com/tldraw/tldraw/pull/4750))

- Fixed a bug with…

#### [Fix] Colors from Excalidraw when pasting ([#4752](https://github.com/tldraw/tldraw/pull/4752))

- Fixed a bug that prevented pasted Excalidraw content from keeping the right color.

#### arrows: fix up label indicator showing up ([#4749](https://github.com/tldraw/tldraw/pull/4749))

- Fix labels on arrows having indicators show up behind them.

#### Limit the page name length in the move to page menu. ([#4747](https://github.com/tldraw/tldraw/pull/4747))

- Limit the length of the page names in the move to page menu.

#### Fix copying of snapshot links ([#4743](https://github.com/tldraw/tldraw/pull/4743))

- Fix copying of snapshot links.

#### ui: dont highlight menu triggers that dont have their submenus open ([#4710](https://github.com/tldraw/tldraw/pull/4710))

- Fix submenu hover active state.

#### menus: rework the open menu logic to be in one consistent place ([#4642](https://github.com/tldraw/tldraw/pull/4642))

- Rework open menu logic to be centralized.

#### drag: passthrough correct event type for drag events ([#4739](https://github.com/tldraw/tldraw/pull/4739))

- Fix bug with passing correct event type for drag events

#### refactor: specify type at bbox ([#4732](https://github.com/tldraw/tldraw/pull/4732))

- When I see the code in `packages/editor/src/lib/exports/getSvgJsx.tsx`, Improvements were found.
```
// L57
let bbox: = null // any type
```
- This is declared as `let`, but it is `any` type.
- I felt this was a risk for future maintenance.
- So I specify the type of `bbox`.
```
let bbox: null | Box = null
```

#### Fix style menu vertical align button ([#4735](https://github.com/tldraw/tldraw/pull/4735))

- Fixed a bug with the vertical alignment button in the style panel.

#### Don't index multiplayer rooms, snapshots, history. ([#4723](https://github.com/tldraw/tldraw/pull/4723))

- Prevent indexing of multiplayer rooms, snapshots, new room route (it just redirects), history, etc

#### Add labelColor for notes. ([#4724](https://github.com/tldraw/tldraw/pull/4724))

- Adds `labelColor` for Note shapes.

#### lod: memoize media assets so that zoom level doesn't re-render constantly ([#4659](https://github.com/tldraw/tldraw/pull/4659))

- Improve performance of image/video rendering.

#### drag/drop: followup to accidental img drop pr ([#4704](https://github.com/tldraw/tldraw/pull/4704))

- Fix bug with multiple images being created when dropping it onto the canvas.

#### links: fix link indicator on stickies ([#4708](https://github.com/tldraw/tldraw/pull/4708))

- Fix link indicator in sticky notes.

#### embeds: fix pasting urls giving an error msg always ([#4709](https://github.com/tldraw/tldraw/pull/4709))

- Fix embed dialog pasting URLs

#### make sure DOM IDs are globally unique ([#4694](https://github.com/tldraw/tldraw/pull/4694))

- Exports and other tldraw instances no longer can affect how each other are rendered
- **BREAKING:** the `id` attribute that was present on some shapes in the dom has been removed. there's now a data-shape-id attribute on every shape wrapper instead though.

#### menus: fix up some missing readonlyOk items; rm some ctx menu items in readonly ([#4696](https://github.com/tldraw/tldraw/pull/4696))

- Fix some items missing `readonlyOk` and some other items that shouldn't have been shown in readonly mode.

#### share: fix copy link ux ([#4695](https://github.com/tldraw/tldraw/pull/4695))

- Fix copy link UX (adds spinner and also adds checkmarks back in)

---

#### 🐛 Bug Fix

- [botcom] Add tooltips / links to Share Menu [#4765](https://github.com/tldraw/tldraw/pull/4765) ([@steveruizok](https://github.com/steveruizok))
- [infra] limit skew protection to one month [#4781](https://github.com/tldraw/tldraw/pull/4781) ([@ds300](https://github.com/ds300))
- [infra] trim to fix [#4779](https://github.com/tldraw/tldraw/pull/4779) ([@ds300](https://github.com/ds300))
- [infra] bump up skew protection time frame [#4774](https://github.com/tldraw/tldraw/pull/4774) ([@ds300](https://github.com/ds300))
- [botcom] add `yarn reset-db` command [#4778](https://github.com/tldraw/tldraw/pull/4778) ([@ds300](https://github.com/ds300))
- [botcom] deep links [#4768](https://github.com/tldraw/tldraw/pull/4768) ([@ds300](https://github.com/ds300))
- [botcom] sync user name with people menu [#4777](https://github.com/tldraw/tldraw/pull/4777) ([@ds300](https://github.com/ds300))
- deploy docs when a release is edited [#4776](https://github.com/tldraw/tldraw/pull/4776) ([@SomeHats](https://github.com/SomeHats))
- [botcom] fix copy for forbidden state [#4775](https://github.com/tldraw/tldraw/pull/4775) ([@ds300](https://github.com/ds300))
- botcom: alternative to multi-menu items [#4764](https://github.com/tldraw/tldraw/pull/4764) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix license link [#4770](https://github.com/tldraw/tldraw/pull/4770) ([@steveruizok](https://github.com/steveruizok))
- [botcom] fix inline renaming [#4769](https://github.com/tldraw/tldraw/pull/4769) ([@ds300](https://github.com/ds300))
- [botcom] Shared file fixes [#4761](https://github.com/tldraw/tldraw/pull/4761) ([@ds300](https://github.com/ds300))
- [botcom] fix share links [#4754](https://github.com/tldraw/tldraw/pull/4754) ([@ds300](https://github.com/ds300))
- botcom: only redirect when logged out and the file is private [#4753](https://github.com/tldraw/tldraw/pull/4753) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix bemo deploy on publish-new [#4721](https://github.com/tldraw/tldraw/pull/4721) ([@ds300](https://github.com/ds300))
- [botcom] Signout route [#4738](https://github.com/tldraw/tldraw/pull/4738) ([@steveruizok](https://github.com/steveruizok))
- [botcom] use single DurableObject for whole app [#4698](https://github.com/tldraw/tldraw/pull/4698) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- Remove .zed folder [#4736](https://github.com/tldraw/tldraw/pull/4736) ([@steveruizok](https://github.com/steveruizok))
- tla: rename icons without equal sign [#4712](https://github.com/tldraw/tldraw/pull/4712) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix watermark dark mode on tldraw.dev [#4706](https://github.com/tldraw/tldraw/pull/4706) ([@steveruizok](https://github.com/steveruizok))
- Remove v1 migration from dotcom [#4693](https://github.com/tldraw/tldraw/pull/4693) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - roll back changes from bad deploy [#4780](https://github.com/tldraw/tldraw/pull/4780) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - [botcom] file state [#4766](https://github.com/tldraw/tldraw/pull/4766) ([@ds300](https://github.com/ds300))
  - botcom: prevent pinch-zoom on sidebar [#4697](https://github.com/tldraw/tldraw/pull/4697) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - botcom: inline rename [#4758](https://github.com/tldraw/tldraw/pull/4758) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [botcom] local session state, logged out view of files [#4711](https://github.com/tldraw/tldraw/pull/4711) ([@steveruizok](https://github.com/steveruizok))
  - ui: suppress aria warning about desc in dialogs [#4707](https://github.com/tldraw/tldraw/pull/4707) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/sync-core`
  - [botcom] Fix file deletion and creation [#4751](https://github.com/tldraw/tldraw/pull/4751) ([@ds300](https://github.com/ds300))
- `@tldraw/sync`
  - botcom: redirect to intended room when signing in [#4725](https://github.com/tldraw/tldraw/pull/4725) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/sync-core`
  - botcom: account menu [bk] [#4683](https://github.com/tldraw/tldraw/pull/4683) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🐛 Bug Fixes

- Fix copying of snapshot links [#4743](https://github.com/tldraw/tldraw/pull/4743) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - [Fix] Toolbar button outline border radius [#4759](https://github.com/tldraw/tldraw/pull/4759) ([@steveruizok](https://github.com/steveruizok))
  - [Fix] Colors from Excalidraw when pasting [#4752](https://github.com/tldraw/tldraw/pull/4752) ([@steveruizok](https://github.com/steveruizok))
  - arrows: fix up label indicator showing up [#4749](https://github.com/tldraw/tldraw/pull/4749) ([@mimecuvalo](https://github.com/mimecuvalo))
  - ui: dont highlight menu triggers that dont have their submenus open [#4710](https://github.com/tldraw/tldraw/pull/4710) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Fix style menu vertical align button [#4735](https://github.com/tldraw/tldraw/pull/4735) ([@steveruizok](https://github.com/steveruizok))
  - embeds: fix pasting urls giving an error msg always [#4709](https://github.com/tldraw/tldraw/pull/4709) ([@mimecuvalo](https://github.com/mimecuvalo))
  - menus: fix up some missing readonlyOk items; rm some ctx menu items in readonly [#4696](https://github.com/tldraw/tldraw/pull/4696) ([@mimecuvalo](https://github.com/mimecuvalo))
  - share: fix copy link ux [#4695](https://github.com/tldraw/tldraw/pull/4695) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - [Fix] Keyboard events on menus [#4745](https://github.com/tldraw/tldraw/pull/4745) ([@steveruizok](https://github.com/steveruizok))
  - make sure DOM IDs are globally unique [#4694](https://github.com/tldraw/tldraw/pull/4694) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Make ids public [#4742](https://github.com/tldraw/tldraw/pull/4742) ([@steveruizok](https://github.com/steveruizok))
  - drag: passthrough correct event type for drag events [#4739](https://github.com/tldraw/tldraw/pull/4739) ([@mimecuvalo](https://github.com/mimecuvalo))
  - drag/drop: followup to accidental img drop pr [#4704](https://github.com/tldraw/tldraw/pull/4704) ([@mimecuvalo](https://github.com/mimecuvalo))
  - links: fix link indicator on stickies [#4708](https://github.com/tldraw/tldraw/pull/4708) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [fix] Meta key bug [#4701](https://github.com/tldraw/tldraw/pull/4701) ([@steveruizok](https://github.com/steveruizok))

#### 💄 Product Improvements

- Don't index multiplayer rooms, snapshots, history. [#4723](https://github.com/tldraw/tldraw/pull/4723) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - npm: upgrade eslint v8 → v9 [#4757](https://github.com/tldraw/tldraw/pull/4757) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Improve tooltips in the style panel [#4750](https://github.com/tldraw/tldraw/pull/4750) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Limit the page name length in the move to page menu. [#4747](https://github.com/tldraw/tldraw/pull/4747) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - menus: rework the open menu logic to be in one consistent place [#4642](https://github.com/tldraw/tldraw/pull/4642) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - lod: memoize media assets so that zoom level doesn't re-render constantly [#4659](https://github.com/tldraw/tldraw/pull/4659) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - refactor: specify type at bbox [#4732](https://github.com/tldraw/tldraw/pull/4732) ([@nayounsang](https://github.com/nayounsang))

#### 🎉 New Features

- [botcom] Publishing [#4688](https://github.com/tldraw/tldraw/pull/4688) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- `tldraw`, `@tldraw/tlschema`
  - Add labelColor for notes. [#4724](https://github.com/tldraw/tldraw/pull/4724) ([@steveruizok](https://github.com/steveruizok))

#### 🛠️ API Changes

- `@tldraw/editor`, `tldraw`
  - make options object stable [#4762](https://github.com/tldraw/tldraw/pull/4762) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 6

- [@nayounsang](https://github.com/nayounsang)
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.3.0 (Wed Oct 09 2024)

### Release Notes

#### [botcom] sharing ([#4654](https://github.com/tldraw/tldraw/pull/4654))

- Fixed a bug with…

#### [sync] refine error handling + room.closeSession method ([#4660](https://github.com/tldraw/tldraw/pull/4660))

- Adds a `closeSession` to the `TLSocketRoom` class, for terminating or restarting a client's socket connection.

#### [sync] Expose sessions and individual records on TLSocketRoom ([#4677](https://github.com/tldraw/tldraw/pull/4677))

- [sync] Adds a couple of new methods to the TLSocketRoom class:
  - `getRecord` - for getting an individual record
  - `getSessions` - for getting a list of the active sessions

#### [sync] Set instance.isReadonly automatically ([#4673](https://github.com/tldraw/tldraw/pull/4673))

- Puts the editor into readonly mode automatically when the tlsync server responds in readonly mode.
- Adds the `editor.getIsReadonly()` method.
- Fixes a bug where arrow labels could be edited in readonly mode.

#### Open navigation panel by default ([#4668](https://github.com/tldraw/tldraw/pull/4668))

- The navigation panel is now open by default.

#### Pass through wheel events over non-scrolling user interface elements ([#4662](https://github.com/tldraw/tldraw/pull/4662))

- Fixes a bug where scrolling over user interface elements would not scroll the canvas.

#### Add editor option for quick actions placement. ([#4666](https://github.com/tldraw/tldraw/pull/4666))

- Adds an editor option to control the placement of quick action shortcuts.

#### Fix over-scroll behavior ([#4664](https://github.com/tldraw/tldraw/pull/4664))

- Fixed a bug with "overscrolling" in the tldraw app and examples site.

#### Fix icon button width ([#4663](https://github.com/tldraw/tldraw/pull/4663))

- Fixed a bug with the width of icon buttons.

#### prevent accidental image drops ([#4651](https://github.com/tldraw/tldraw/pull/4651))

- Fixed a bug where dropping images or other things on user interface elements would navigate away from the canvas

#### Arrowhead clipping fix ([#4646](https://github.com/tldraw/tldraw/pull/4646))

- Fix an issue introduced with #4636. The arrowheads did not correctly clip the arrow body.

#### Fix an issue with nearest point and lines that start and end at the same point ([#4650](https://github.com/tldraw/tldraw/pull/4650))

- Fix a bug with nearest points for lines that start and end at the same point.

#### [Example] Setting opts in export-canvas-as-image ([#4534](https://github.com/tldraw/tldraw/pull/4534))

- I add new feature at [export-canvas-as-image example](https://examples.tldraw.com/export-canvas-as-image).
![image](https://github.com/user-attachments/assets/8fbb94f2-283c-4007-a662-11f12a2f237e)
![image](https://github.com/user-attachments/assets/0fcdc432-fa6e-4f32-98b4-46f923230e16)
- It is possible to open and close. It was placed so as not to affect the existing layout and drawing as much as possible.
- It can set opts: background, darkmode, padding, scale and Box's arg(x,y,w,h).
  - Background and darkmode are checkbox.
  - Padding, scale, box's arg are number input.
- I accidentally manipulated the script in root's package.json, but it was restored to its original state. Because I didn't know there was a script to run the example.
- `Control` component is implemented simply for DX.
- ⚠️ I haven't implemented preserveAspectRatio yet. I will implement it if necessary.
- ⚠️ If x, y, w, and h are only partially undefined in the box, no processing was performed. I thought it would be a good idea to check the results.

#### selection: allow cmd/ctrl to add to selection ([#4570](https://github.com/tldraw/tldraw/pull/4570))

- Selection: allow cmd/ctrl to add multiple shapes to the selection.

#### watermark: go behind certain elements on the app ([#4656](https://github.com/tldraw/tldraw/pull/4656))

- Fix issue with watermark and certain UI elements.

#### text: followup to the followup of fix to locking text shapes ([#4644](https://github.com/tldraw/tldraw/pull/4644))

- Fix bug with text shape locking.

#### [sync] readonly mode ([#4648](https://github.com/tldraw/tldraw/pull/4648))

- [tldraw sync] Adds `isReadonly` mode for socket connections.

#### Prevent some draw shape rerenders when changing the zoom ([#4647](https://github.com/tldraw/tldraw/pull/4647))

- Reduce the number of times the draw shape has to rerender due to the zoom changes.

#### [state] fix error 'cannot change atoms during reaction cycle' bug ([#4645](https://github.com/tldraw/tldraw/pull/4645))

- Fixed a bug that was manifesting as `Error('cannot change atoms during reaction cycle')`

#### Add 0.0.1 version of translations :joy: ([#4641](https://github.com/tldraw/tldraw/pull/4641))

- Add a simple helper hook + eslint rule that will help us track all untranslated strings.

#### text: followup fix to locking text shapes ([#4632](https://github.com/tldraw/tldraw/pull/4632))

- Fix bug with text shape locking.

#### Improve perf for safari ([#4636](https://github.com/tldraw/tldraw/pull/4636))

- Fix a performance issue with panning when zoomed in on arrows in Safari.

#### Disable debug mode in development by default ([#4629](https://github.com/tldraw/tldraw/pull/4629))

- Turns off debug mode by default in local development.

#### text: be able to keep tool locked ([#4569](https://github.com/tldraw/tldraw/pull/4569))

- Make text shape be lockable

#### [dotcom] Menus, dialogs, toasts, etc. ([#4624](https://github.com/tldraw/tldraw/pull/4624))

- exports dialogs system
- exports toasts system
- exports translations system
- create a global `tlmenus` system for menus
- create a global `tltime` system for timers
- create a global `tlenv` for environment" 
- create a `useMaybeEditor` hook

#### Fix watermark link opening twice ([#4622](https://github.com/tldraw/tldraw/pull/4622))

- Fix watermark link opening twice

#### Fix VS Code `editorPath` ([#4630](https://github.com/tldraw/tldraw/pull/4630))

- Fixed an incorrect path in the development tools of the VS Code extension

#### Add eslint rule to check that tsdoc params match with function params ([#4615](https://github.com/tldraw/tldraw/pull/4615))

- Add lint rules to check for discrepancies between tsdoc params and function params and fix all the discovered issues.

#### [bugfix] respect camera constraints after switching page + setting constraints ([#4628](https://github.com/tldraw/tldraw/pull/4628))

- Fixed a bug where camera constraints were not upheld after switching pages or setting new camera constraints.

---

#### 🐛 Bug Fix

- Add missing CSS imports to examples [#4689](https://github.com/tldraw/tldraw/pull/4689) ([@steveruizok](https://github.com/steveruizok))
- Restore placeholder on .dev [#4686](https://github.com/tldraw/tldraw/pull/4686) ([@steveruizok](https://github.com/steveruizok))
- Improve .dev demo [#4684](https://github.com/tldraw/tldraw/pull/4684) ([@steveruizok](https://github.com/steveruizok))
- [botcom] one last logged out fix [#4680](https://github.com/tldraw/tldraw/pull/4680) ([@steveruizok](https://github.com/steveruizok))
- [botcom] Move file update handler, remove tldrawApp.currentEditor [#4679](https://github.com/tldraw/tldraw/pull/4679) ([@steveruizok](https://github.com/steveruizok))
- Fix logged out editor items [#4678](https://github.com/tldraw/tldraw/pull/4678) ([@steveruizok](https://github.com/steveruizok))
- [botcom] Pass through wheel events in menus [#4670](https://github.com/tldraw/tldraw/pull/4670) ([@steveruizok](https://github.com/steveruizok))
- csp: add clerk for new domains, pt 2 [#4658](https://github.com/tldraw/tldraw/pull/4658) ([@mimecuvalo](https://github.com/mimecuvalo))
- csp: add clerk for new domains [#4657](https://github.com/tldraw/tldraw/pull/4657) ([@mimecuvalo](https://github.com/mimecuvalo))
- auth: add keys to worker as well [#4655](https://github.com/tldraw/tldraw/pull/4655) ([@mimecuvalo](https://github.com/mimecuvalo))
- auth: add keys [#4653](https://github.com/tldraw/tldraw/pull/4653) ([@mimecuvalo](https://github.com/mimecuvalo))
- stale issues: better msg [#4643](https://github.com/tldraw/tldraw/pull/4643) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update close-stale-issues.yml [#4638](https://github.com/tldraw/tldraw/pull/4638) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update close-stale-issues.yml [#4635](https://github.com/tldraw/tldraw/pull/4635) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update close-stale-issues.yml [#4634](https://github.com/tldraw/tldraw/pull/4634) ([@mimecuvalo](https://github.com/mimecuvalo))
- github: update stale issues number to be correct [#4633](https://github.com/tldraw/tldraw/pull/4633) ([@mimecuvalo](https://github.com/mimecuvalo))
- [botcom] clerk scaffolding [#4616](https://github.com/tldraw/tldraw/pull/4616) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Add canvas mask example [#4623](https://github.com/tldraw/tldraw/pull/4623) ([@steveruizok](https://github.com/steveruizok))
- [botcom] share menu fixes [#4621](https://github.com/tldraw/tldraw/pull/4621) ([@steveruizok](https://github.com/steveruizok))
- [botcom] Share menu [#4604](https://github.com/tldraw/tldraw/pull/4604) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - [botcom] Add event tracking [#4687](https://github.com/tldraw/tldraw/pull/4687) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Improve watermark tests [#4669](https://github.com/tldraw/tldraw/pull/4669) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - Disable debug mode in development by default [#4629](https://github.com/tldraw/tldraw/pull/4629) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - [dotcom] Menus, dialogs, toasts, etc. [#4624](https://github.com/tldraw/tldraw/pull/4624) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - chore: refactor safe id [#4618](https://github.com/tldraw/tldraw/pull/4618) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/sync-core`
  - [botcom] use tlsync as prototype backend [#4617](https://github.com/tldraw/tldraw/pull/4617) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fixes

- Fix over-scroll behavior [#4664](https://github.com/tldraw/tldraw/pull/4664) ([@steveruizok](https://github.com/steveruizok))
- Fix VS Code `editorPath` [#4630](https://github.com/tldraw/tldraw/pull/4630) ([@vladh](https://github.com/vladh))
- docs: more search fixes on mobile [#4609](https://github.com/tldraw/tldraw/pull/4609) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - i18n: fix up lang menu reactivity [#4685](https://github.com/tldraw/tldraw/pull/4685) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix icon button width [#4663](https://github.com/tldraw/tldraw/pull/4663) ([@steveruizok](https://github.com/steveruizok))
  - Arrowhead clipping fix [#4646](https://github.com/tldraw/tldraw/pull/4646) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok))
  - text: followup to the followup of fix to locking text shapes [#4644](https://github.com/tldraw/tldraw/pull/4644) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - text: followup fix to locking text shapes [#4632](https://github.com/tldraw/tldraw/pull/4632) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Improve perf for safari [#4636](https://github.com/tldraw/tldraw/pull/4636) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - prevent accidental image drops [#4651](https://github.com/tldraw/tldraw/pull/4651) ([@steveruizok](https://github.com/steveruizok))
  - Fix an issue with nearest point and lines that start and end at the same point [#4650](https://github.com/tldraw/tldraw/pull/4650) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [bugfix] respect camera constraints after switching page + setting constraints [#4628](https://github.com/tldraw/tldraw/pull/4628) ([@ds300](https://github.com/ds300))
- `@tldraw/state`
  - [state] fix error 'cannot change atoms during reaction cycle' bug [#4645](https://github.com/tldraw/tldraw/pull/4645) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - Fix watermark link opening twice [#4622](https://github.com/tldraw/tldraw/pull/4622) ([@vladh](https://github.com/vladh))

#### 💄 Product Improvements

- Open navigation panel by default [#4668](https://github.com/tldraw/tldraw/pull/4668) ([@steveruizok](https://github.com/steveruizok))
- Add 0.0.1 version of translations :joy: [#4641](https://github.com/tldraw/tldraw/pull/4641) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/sync-core`, `@tldraw/sync`
  - [sync] refine error handling + room.closeSession method [#4660](https://github.com/tldraw/tldraw/pull/4660) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`
  - [sync] Set instance.isReadonly automatically [#4673](https://github.com/tldraw/tldraw/pull/4673) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`
  - Pass through wheel events over non-scrolling user interface elements [#4662](https://github.com/tldraw/tldraw/pull/4662) ([@steveruizok](https://github.com/steveruizok))
  - selection: allow cmd/ctrl to add to selection [#4570](https://github.com/tldraw/tldraw/pull/4570) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Add editor option for quick actions placement. [#4666](https://github.com/tldraw/tldraw/pull/4666) ([@steveruizok](https://github.com/steveruizok))
  - Prevent some draw shape rerenders when changing the zoom [#4647](https://github.com/tldraw/tldraw/pull/4647) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - text: be able to keep tool locked [#4569](https://github.com/tldraw/tldraw/pull/4569) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - watermark: go behind certain elements on the app [#4656](https://github.com/tldraw/tldraw/pull/4656) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/sync-core`
  - [sync] readonly mode [#4648](https://github.com/tldraw/tldraw/pull/4648) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/utils`
  - Add eslint rule to check that tsdoc params match with function params [#4615](https://github.com/tldraw/tldraw/pull/4615) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🎉 New Features

- [Example] Setting opts in export-canvas-as-image [#4534](https://github.com/tldraw/tldraw/pull/4534) ([@nayounsang](https://github.com/nayounsang) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/sync-core`
  - [botcom] sharing [#4654](https://github.com/tldraw/tldraw/pull/4654) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/sync-core`, `@tldraw/sync`
  - [botcom] Use auth on backend [#4639](https://github.com/tldraw/tldraw/pull/4639) ([@ds300](https://github.com/ds300))

#### 🛠️ API Changes

- `@tldraw/sync-core`
  - [sync] Expose sessions and individual records on TLSocketRoom [#4677](https://github.com/tldraw/tldraw/pull/4677) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- `@tldraw/editor`
  - dotcom top bar / .tldr file drops [#4661](https://github.com/tldraw/tldraw/pull/4661) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 7

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- [@nayounsang](https://github.com/nayounsang)
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Vlad-Stefan Harbuz ([@vladh](https://github.com/vladh))

---

# v3.2.0 (Thu Sep 26 2024)

### Release Notes

#### Remove thumbnail logic ([#4602](https://github.com/tldraw/tldraw/pull/4602))

- Remove thumbnail logic.

---

#### 🐛 Bug Fix

- Remove thumbnail logic [#4602](https://github.com/tldraw/tldraw/pull/4602) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [botcom] purge prototype leftovers [#4601](https://github.com/tldraw/tldraw/pull/4601) ([@ds300](https://github.com/ds300))
- `tldraw`, `@tldraw/validate`
  - [in the voice of David S: MERGE] tldraw.com v2 [#4576](https://github.com/tldraw/tldraw/pull/4576) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo) [@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fixes

- docs: fix up horz. scrolling and slow search typing [#4607](https://github.com/tldraw/tldraw/pull/4607) ([@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 4

- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.1.0 (Wed Sep 25 2024)

### Release Notes

#### bug: fix rendering issues on new MacOS 15 / iOS 18 ([#4593](https://github.com/tldraw/tldraw/pull/4593))

- Fix rendering issues on new MacOS 15 / iOS 18

#### Fix watermark appearance ([#4589](https://github.com/tldraw/tldraw/pull/4589))

- Fixed a bug with the watermark's opacities and animations.

#### publish useAsset, tweak docs ([#4590](https://github.com/tldraw/tldraw/pull/4590))

- Publish the `useAsset` media asset helper

#### Add a comment about promise usage for using the clipboard ([#4584](https://github.com/tldraw/tldraw/pull/4584))

- Add a comment explaining why we don't resolve the promise in one of the cases.

#### Fix label wrapping ([#4571](https://github.com/tldraw/tldraw/pull/4571))

- Fixed a bug with arrow label text measurements.

#### Fix collaboration shape indicator showing a line through the arrow's label ([#4580](https://github.com/tldraw/tldraw/pull/4580))

- Fix an issue with arrow collaborator indicator showing on top of the arrow's label.

#### [feature] isShapeHidden option ([#4446](https://github.com/tldraw/tldraw/pull/4446))

- Adds an `isShapeHidden` option, which allows you to provide custom logic to decide whether or not a shape should be shown on the canvas.

#### Don't upload a snapshot from the snapshots page ([#4577](https://github.com/tldraw/tldraw/pull/4577))

- Copying a snapshot link from a snapshot page now just returns the current url.

#### hand tool: remove lockable attr ([#4567](https://github.com/tldraw/tldraw/pull/4567))

- Fix Hand tool being lockable when it already is.

#### [sync] Allow doing CRUD directly on the server ([#4559](https://github.com/tldraw/tldraw/pull/4559))

- Adds the `updateStore` method to the `TLSocketRoom` class, to allow updating room data directly on the server.

#### Unify links for vs code. ([#4565](https://github.com/tldraw/tldraw/pull/4565))

- Unify vs code extension links. Make the watermark link work in the vs code extension.

#### Fix an issue with the dirty state of flags not working after the first change to a file ([#4564](https://github.com/tldraw/tldraw/pull/4564))

- Fixed a bug with the first change after opening a file not marking the file as dirty.

#### Unify licenses. ([#4561](https://github.com/tldraw/tldraw/pull/4561))

- Unify templates licenses. Add back vs code extension license.

#### Add some additional debugging tools. ([#4539](https://github.com/tldraw/tldraw/pull/4539))

- Adds some additional debugging tools to the develop experience.

#### Add an example of switching to the geo tool. ([#4545](https://github.com/tldraw/tldraw/pull/4545))

- Add an example of how you can set the current tool to a `geo` tool.

#### Fix a sentry issue with getting arrow bindings ([#4506](https://github.com/tldraw/tldraw/pull/4506))

- Fix a sentry issue when getting arrow bindings.

#### Add center option to rotateShapesBy ([#4508](https://github.com/tldraw/tldraw/pull/4508))

- Add option to Editor.rotateShapesBy to specify the rotation center point.

#### [fix] build caching i.e. "You have multiple versions of tldraw libraries installed" ([#4525](https://github.com/tldraw/tldraw/pull/4525))

- Fixed the "You have multiple versions of tldraw libraries installed" problem on 3.0.1

#### [fix] container null error ([#4524](https://github.com/tldraw/tldraw/pull/4524))

- Fixed a minor bug related to useContainer's return value being potentially returned from components?

---

#### 🐛 Bug Fix

- fix publish-canary [#4598](https://github.com/tldraw/tldraw/pull/4598) ([@ds300](https://github.com/ds300))
- Revert "Delete .github/workflows/publish-canary.yml" [#4595](https://github.com/tldraw/tldraw/pull/4595) ([@SomeHats](https://github.com/SomeHats))
- Update installation.mdx [#4594](https://github.com/tldraw/tldraw/pull/4594) ([@steveruizok](https://github.com/steveruizok))
- [infra] give auto the tags [#4588](https://github.com/tldraw/tldraw/pull/4588) ([@ds300](https://github.com/ds300))
- [infra] try using yarn [#4587](https://github.com/tldraw/tldraw/pull/4587) ([@ds300](https://github.com/ds300))
- fix get-changelog.yml [#4586](https://github.com/tldraw/tldraw/pull/4586) ([@ds300](https://github.com/ds300))
- [infra] Add get changelog action [#4585](https://github.com/tldraw/tldraw/pull/4585) ([@ds300](https://github.com/ds300))
- Add a comment about promise usage for using the clipboard [#4584](https://github.com/tldraw/tldraw/pull/4584) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Various docs improvements [#4573](https://github.com/tldraw/tldraw/pull/4573) ([@steveruizok](https://github.com/steveruizok))
- Unify licenses. [#4561](https://github.com/tldraw/tldraw/pull/4561) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- remove (hopefully) unneeded workers_dev wrangler preview flag [#4557](https://github.com/tldraw/tldraw/pull/4557) ([@SomeHats](https://github.com/SomeHats))
- fix deploy script [#4556](https://github.com/tldraw/tldraw/pull/4556) ([@ds300](https://github.com/ds300))
- Add some additional debugging tools. [#4539](https://github.com/tldraw/tldraw/pull/4539) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Serve sync on domain as well as route [#4553](https://github.com/tldraw/tldraw/pull/4553) ([@SomeHats](https://github.com/SomeHats))
- fix simple-server-example [#4554](https://github.com/tldraw/tldraw/pull/4554) ([@ds300](https://github.com/ds300))
- mount sync worker on same domain [#4552](https://github.com/tldraw/tldraw/pull/4552) ([@SomeHats](https://github.com/SomeHats))
- .dev: use Git LFS for our blog images [#4530](https://github.com/tldraw/tldraw/pull/4530) ([@mimecuvalo](https://github.com/mimecuvalo))
- homepage: good wordsmithing [#4544](https://github.com/tldraw/tldraw/pull/4544) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix footer link in docs. [#4546](https://github.com/tldraw/tldraw/pull/4546) ([@steveruizok](https://github.com/steveruizok))
- Change version numbers [#4543](https://github.com/tldraw/tldraw/pull/4543) ([@steveruizok](https://github.com/steveruizok))
- Use shiki for syntax highlighting in docs [#4501](https://github.com/tldraw/tldraw/pull/4501) ([@ds300](https://github.com/ds300))
- docs: fix link [#4520](https://github.com/tldraw/tldraw/pull/4520) ([@mimecuvalo](https://github.com/mimecuvalo))
- search: turn back on in production [#4519](https://github.com/tldraw/tldraw/pull/4519) ([@mimecuvalo](https://github.com/mimecuvalo))
- search: use algolia's grouping by section [#4516](https://github.com/tldraw/tldraw/pull/4516) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: tweak search colors [#4515](https://github.com/tldraw/tldraw/pull/4515) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix search on docs [#4513](https://github.com/tldraw/tldraw/pull/4513) ([@steveruizok](https://github.com/steveruizok))
- hotfix remove bad article [#4511](https://github.com/tldraw/tldraw/pull/4511) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`
  - npm: make our React packages consistent [#4547](https://github.com/tldraw/tldraw/pull/4547) ([@mimecuvalo](https://github.com/mimecuvalo) [@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - docs: cleanup/add readmes/licenses [#4542](https://github.com/tldraw/tldraw/pull/4542) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Clean up `apps` directory [#4548](https://github.com/tldraw/tldraw/pull/4548) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - fix pre-rendering on blog/legal [#4535](https://github.com/tldraw/tldraw/pull/4535) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - licenses: add MIT and update GB ones to match US [#4517](https://github.com/tldraw/tldraw/pull/4517) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🐛 Bug Fixes

- bug: fix rendering issues on new MacOS 15 / iOS 18 [#4593](https://github.com/tldraw/tldraw/pull/4593) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix an issue with the dirty state of flags not working after the first change to a file [#4564](https://github.com/tldraw/tldraw/pull/4564) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix cloudflare sync template deploy [#4551](https://github.com/tldraw/tldraw/pull/4551) ([@phgn0](https://github.com/phgn0))
- [fix] build caching i.e. "You have multiple versions of tldraw libraries installed" [#4525](https://github.com/tldraw/tldraw/pull/4525) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - Fix watermark appearance [#4589](https://github.com/tldraw/tldraw/pull/4589) ([@steveruizok](https://github.com/steveruizok))
  - [fix] container null error [#4524](https://github.com/tldraw/tldraw/pull/4524) ([@ds300](https://github.com/ds300))
  - Remove feature flag. [#4521](https://github.com/tldraw/tldraw/pull/4521) ([@steveruizok](https://github.com/steveruizok))
  - Enable license feature flag. [#4518](https://github.com/tldraw/tldraw/pull/4518) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - Fix label wrapping [#4571](https://github.com/tldraw/tldraw/pull/4571) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Fix collaboration shape indicator showing a line through the arrow's label [#4580](https://github.com/tldraw/tldraw/pull/4580) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - hand tool: remove lockable attr [#4567](https://github.com/tldraw/tldraw/pull/4567) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix a sentry issue with getting arrow bindings [#4506](https://github.com/tldraw/tldraw/pull/4506) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/utils`
  - Fix cloudflare worker error when using tldraw packages [#4549](https://github.com/tldraw/tldraw/pull/4549) ([@SomeHats](https://github.com/SomeHats))

#### 💄 Product Improvements

- Don't upload a snapshot from the snapshots page [#4577](https://github.com/tldraw/tldraw/pull/4577) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add an example of switching to the geo tool. [#4545](https://github.com/tldraw/tldraw/pull/4545) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/sync-core`
  - [sync] tiny perf thing [#4591](https://github.com/tldraw/tldraw/pull/4591) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - Unify links for vs code. [#4565](https://github.com/tldraw/tldraw/pull/4565) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🎉 New Features

- `@tldraw/editor`, `tldraw`
  - [feature] isShapeHidden option [#4446](https://github.com/tldraw/tldraw/pull/4446) ([@ds300](https://github.com/ds300))
- `@tldraw/sync-core`
  - [sync] Allow doing CRUD directly on the server [#4559](https://github.com/tldraw/tldraw/pull/4559) ([@ds300](https://github.com/ds300))

#### 🛠️ API Changes

- `@tldraw/editor`, `tldraw`
  - publish useAsset, tweak docs [#4590](https://github.com/tldraw/tldraw/pull/4590) ([@SomeHats](https://github.com/SomeHats))
  - Add center option to rotateShapesBy [#4508](https://github.com/tldraw/tldraw/pull/4508) ([@ds300](https://github.com/ds300))

#### Authors: 6

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Peter Hagen ([@phgn0](https://github.com/phgn0))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v3.0.0 (Fri Sep 13 2024)

### Release Notes

#### Improve loading of files ([#4510](https://github.com/tldraw/tldraw/pull/4510))

- Improve loading of files.

#### paste: fix pasting images from excalidraw ([#4462](https://github.com/tldraw/tldraw/pull/4462))

- Pasting: fix image pasting from Excalidraw.

#### Fix parsing of older tldraw v2 documents ([#4502](https://github.com/tldraw/tldraw/pull/4502))

- Fix a but with opening older v2 tldraw files.

#### Bisect issues using the PR preview links ([#4475](https://github.com/tldraw/tldraw/pull/4475))

- Adds biscecting on top of preview links to help us find PRs that broke some functionality.

#### images: dont stop playing a gif on double click ([#4451](https://github.com/tldraw/tldraw/pull/4451))

- Images: dbl-clicking doesn't stop gifs

#### File save warning ([#4469](https://github.com/tldraw/tldraw/pull/4469))

- Adds save warning.

#### Add sleep fn ([#4454](https://github.com/tldraw/tldraw/pull/4454))

(internal-only change)

#### Add assetUrls option to TldrawImage ([#4465](https://github.com/tldraw/tldraw/pull/4465))

- Allow the `<TldrawImage />` component to accept custom asset URLs.

#### Fix an issue with canceling the page name and presence name changes. ([#4408](https://github.com/tldraw/tldraw/pull/4408))

- Fix an issue with not being able to cancel out changing of page names and user presence names.

#### Fix an issue with firefox ([#4432](https://github.com/tldraw/tldraw/pull/4432))

- Fix an issue with migrating legacy assets in Firefox.

#### add default <foreignObject> based export for shapes ([#4403](https://github.com/tldraw/tldraw/pull/4403))

Custom shapes (and our own bookmark shapes) now render in image exports by default.

#### Use custom mime types in useInsertMedia hook ([#4453](https://github.com/tldraw/tldraw/pull/4453))

- Make the 'insert media' action use custom mime type configurations to restrict which files can be selected in the picker.

#### Rename TLSvgOptions ([#4442](https://github.com/tldraw/tldraw/pull/4442))

- Rename `TLSvgOptions` to `TLImageExportOptions`

#### Fix rendering perf regression ([#4433](https://github.com/tldraw/tldraw/pull/4433))

- Fixed a perf issue that caused shapes to rerender too often.

#### Use base zoom and zoom steps to calculate min and max zoom for pinch gesture ([#4427](https://github.com/tldraw/tldraw/pull/4427))

- Fixed issue where pinch gestures on Safari would snap camera at low zoom levels

#### fix: typo in docs ([#4402](https://github.com/tldraw/tldraw/pull/4402))

- Fixed typo in "persistence" in docs

#### Fix exports for dark mode frames and flipped images ([#4424](https://github.com/tldraw/tldraw/pull/4424))

- Flipped images are now respected in exports
- Dark mode frames are exported with the correct label color

#### Allow the users to programmatically disable the context menu. ([#4415](https://github.com/tldraw/tldraw/pull/4415))

- Improves the customisability of the context menu. You can now conditionally disable it.

#### Simplify getting of the text ([#4414](https://github.com/tldraw/tldraw/pull/4414))

- Make copying for text also work for custom shapes that have text (they need to override the `getText` method in the shape util).

#### Improve event tracking ([#4409](https://github.com/tldraw/tldraw/pull/4409))

- Improves event tracking by adding some missing event tracking.

#### Prevent unhandled promise rejection during strict mode ([#4406](https://github.com/tldraw/tldraw/pull/4406))

- Prevented a harmless Unhandled Promise Rejection error message during dev time with React strict mode.

#### Fix an error with parsing embed urls. ([#4397](https://github.com/tldraw/tldraw/pull/4397))

- Fix a bug with embed dialog throwing an error when entering an invalid url

#### Detect multiple installed versions of tldraw packages ([#4398](https://github.com/tldraw/tldraw/pull/4398))

- We detect when there are multiple versions of tldraw installed and let you know, as this can cause bugs in your application

#### [api] Widen snapshots pit of success ([#4392](https://github.com/tldraw/tldraw/pull/4392))

- Improved loadSnapshot to preserve page state like camera position and current page if no session snapshot is provided.

#### make arrow labels wrap dynamically ([#4384](https://github.com/tldraw/tldraw/pull/4384))

- Make arrow labels reflow text dynamically as you move things around.

#### Landing page and docs features ([#4368](https://github.com/tldraw/tldraw/pull/4368))

#### Pricing section

Added the request form for a commercial license to the pricing section.
Submission will be automatically written to the Google Sheet.

For the form to work, we need to:
1. Set up the environment variables for the Google API
2. Grant write access on the Sheet to the Google service account 

#### 404 page

Added a proper 404 page.

#### Blog search

Added a search bar on blog category pages to search all posts.

#### Dark mode

Everything now also looks great at night.

#### Legal pages

Added a content section called _legal_, so that we can have stuff like terms and conditions inside [/content/legal](./app/docs/content/legal) as markdown files. These will be live at `/legal/[slug]`.

#### SEO

Added metadata to each page, sitemap and robots.txt.

#### Blog

Transferred all posts from the Substack blog.

#### Make rotateShapesBy work on any shapes ([#4385](https://github.com/tldraw/tldraw/pull/4385))

- Make `rotateShapesBy` work with any shapes, not just the currently selected shapes.
- BREAKING CHANGE - removes the `TLRotationSnapshot` type.

#### fix inky path rendering ([#4382](https://github.com/tldraw/tldraw/pull/4382))

- Fix edge case bug in inky path rendering code for clouds.

#### Fix cloud rendering with dynamic scale ([#4380](https://github.com/tldraw/tldraw/pull/4380))

- Fixed cloud rendering in 'dynamic size' mode

#### Deep Links ([#4333](https://github.com/tldraw/tldraw/pull/4333))

- Added support for managing deep links.

#### Custom embeds API ([#4326](https://github.com/tldraw/tldraw/pull/4326))

Adds the ability to customize the embeds that are supported. You can now customize or reorder the existing embeds, as well as add completely new ones.

#### Hotfix for index keys validation ([#4361](https://github.com/tldraw/tldraw/pull/4361))

- Fixed a bug with the index key validation logic

#### Fix issues with resizing cropped images ([#4350](https://github.com/tldraw/tldraw/pull/4350))

- Fix a bug with cropped and flipped images and their previews.

#### Gracefully handle deleted tools & actions (remix) ([#4345](https://github.com/tldraw/tldraw/pull/4345))

- When deleting actions or tools using overrides, menu items are automatically removed.

#### Rename `StoreOptions.multiplayerStatus` ([#4349](https://github.com/tldraw/tldraw/pull/4349))

- Renames `StoreOptions.multiplayerStatus` to `StoreOptions.collaboration.status`.

#### Disable Pages UI when maxPages === 1 ([#4348](https://github.com/tldraw/tldraw/pull/4348))

- Make the page management UI disappear when maxPages is 1

#### why did we have this dpr constrained width/height stuff again? ([#4297](https://github.com/tldraw/tldraw/pull/4297))

- Fixed a bug with…

#### Add dialog/toasts example ([#4133](https://github.com/tldraw/tldraw/pull/4133))

- [Examples] added a toasts/dialogs example

#### video: rm sync that doesn't really work; fix fullscreen rendering ([#4338](https://github.com/tldraw/tldraw/pull/4338))

- video: rm sync that doesn't really work; fix fullscreen rendering

#### Interpolation: draw/highlight points, discrete props ([#4241](https://github.com/tldraw/tldraw/pull/4241))

- Added getInterpolated props method for all shapes, including draw and highlighter.

#### Combino fixed text ([#4331](https://github.com/tldraw/tldraw/pull/4331))

- Improved accidental fixed-width text shape creation.

#### Fix flipping of cropped images ([#4337](https://github.com/tldraw/tldraw/pull/4337))

- Fix flipping of cropped shapes. The crop was applied to the wrong part of the picture.

#### license: allow wildcard to make apex domains also work ([#4334](https://github.com/tldraw/tldraw/pull/4334))

- Improve license domain check for apex domains when using wildcards.

#### License: add docs ([#4217](https://github.com/tldraw/tldraw/pull/4217))

- Add licensing docs.

#### bookmark: dont show broken favicon and cleanup HTML entities in title ([#4330](https://github.com/tldraw/tldraw/pull/4330))

- bookmark: dont show broken favicon and cleanup HTML entities in title

#### fractional indexing: rm the 0 check for indicies, outdated with jitter code ([#4332](https://github.com/tldraw/tldraw/pull/4332))

- Fix a bug with fractional indexing validation with the new jitter library.

#### images: show ghost preview image while uploading ([#3988](https://github.com/tldraw/tldraw/pull/3988))

- Media: add image and video upload indicators.

#### [Feature, Example] Text search example and `getText` API ([#4306](https://github.com/tldraw/tldraw/pull/4306))

- Adds `getText` to the `ShapeUtil` api so that we can allow searching for text in a nicely extensible way.
- Adds an example of how to add text search.

#### shape ordering: upgrade fractional indexing to use jitter, avoid conflicts ([#4312](https://github.com/tldraw/tldraw/pull/4312))

- Shape ordering: upgrade fractional indexing to use jitter, avoid conflicts

#### Export some missing components that are used in the `DefaultToolbar` ([#4321](https://github.com/tldraw/tldraw/pull/4321))

- Export `OverflowingToolbar` and `MobileStylePanel` panel components so they can be reused for building a custom `Toolbar`.

#### Add missing bits to exploded example ([#4323](https://github.com/tldraw/tldraw/pull/4323))

- Expose `registerDefaultSideEffects` and `registerDefaultExternalContentHandler`

#### remove onEditorMount prop ([#4320](https://github.com/tldraw/tldraw/pull/4320))

- **Breaking:** the `onEditorMount` option to `createTLStore` is now called `onMount`

#### Fix an issue with minimap ([#4318](https://github.com/tldraw/tldraw/pull/4318))

- Fixes a bug with the MiniMap not rendering. Makes the unbound uses safer.

#### Fix duplication of shapes. ([#4316](https://github.com/tldraw/tldraw/pull/4316))

- Fix an issue with duplicating groups.

#### text shape: dont make a fixed width unless more intentional drag ([#4293](https://github.com/tldraw/tldraw/pull/4293))

- Text shape: dont make a fixed width unless more intentional drag

#### draw: fix dotted line rendering when zoomed out ([#4261](https://github.com/tldraw/tldraw/pull/4261))

- Draw: fix dotted line shape rendering when zoomed out greatly.

#### Fix dropdown menus not opening in focus examples ([#4274](https://github.com/tldraw/tldraw/pull/4274))

- Fixed a bug with dropdown menus not opening on editor focus examples

#### Move from function properties to methods ([#4288](https://github.com/tldraw/tldraw/pull/4288))

- Adds eslint rules for enforcing the use of methods instead of function properties and fixes / disables all the resulting errors.

#### Add option for max pasted / dropped files ([#4294](https://github.com/tldraw/tldraw/pull/4294))

- We now have an editor option for the maximum number of files that a user can paste at once.

#### support custom delay for laser pointer ([#4300](https://github.com/tldraw/tldraw/pull/4300))

- Added support for laser delay customisation

#### license: add special license option with watermark ([#4296](https://github.com/tldraw/tldraw/pull/4296))

- license: add special license option with watermark

#### Deprecate editor.mark, fix cropping tests ([#4250](https://github.com/tldraw/tldraw/pull/4250))

This deprecates `Editor.mark()` in favour of `Editor.markHistoryStoppingPoint()`.

This was done because calling `editor.mark(id)` is a potential footgun unless you always provide a random ID. So `editor.markHistoryStoppingPoint()` always returns a random id.

#### Address alex's sync docs feedback ([#4292](https://github.com/tldraw/tldraw/pull/4292))

- minor sync docs changes

#### Improve arrow label snapping ([#4265](https://github.com/tldraw/tldraw/pull/4265))

- Improved snapping distances on very long arrows

#### theme: fix color scheme (again) ([#4289](https://github.com/tldraw/tldraw/pull/4289))

- theme: fix checkbox in the theme menu

#### geo: update X icon to reflect the actual shape ([#4287](https://github.com/tldraw/tldraw/pull/4287))

- Geo: update [X] icon to reflect the actual shape.

#### fix assets prop on tldraw component ([#4283](https://github.com/tldraw/tldraw/pull/4283))

- The `assets` prop on the `<Tldraw />` and `<TldrawEditor />` components is now respected.

#### Make it easy to load preexisting snapshots into TLSocketRoom ([#4272](https://github.com/tldraw/tldraw/pull/4272))

- Allow `TLSocketRoom` to load regular `TLStoreSnapshot` snapshots.

#### share: make top/bottom not shrink when a lot of people in the room ([#4271](https://github.com/tldraw/tldraw/pull/4271))

- Share: fix up minor rendering issue in the sharing menu.

#### Sync docs rework ([#4267](https://github.com/tldraw/tldraw/pull/4267))

- Update sync.mdx

#### Add function property warning. ([#4266](https://github.com/tldraw/tldraw/pull/4266))

- Adds a lint rule to warn when using function properties. We prefer using methods, since they are more easily extensible.

#### Use cloudflare-workers-unfurl ([#4257](https://github.com/tldraw/tldraw/pull/4257))

- use new library cloudflare-workers-unfurl

#### Allow non default z value for scribble points. ([#4260](https://github.com/tldraw/tldraw/pull/4260))

- Allow scribble points to have non default z values.

#### Sync docs, further refinements ([#4263](https://github.com/tldraw/tldraw/pull/4263))



#### Export helpers for image paste ([#4258](https://github.com/tldraw/tldraw/pull/4258))

- Exports helpers for pasting external content.

#### Fix order of closed menus ([#4247](https://github.com/tldraw/tldraw/pull/4247))

- Prevent accidental drawing / tool usage when closing menus.

#### Update docs for dark mode. Add system color scheme docs. ([#4256](https://github.com/tldraw/tldraw/pull/4256))

- Update the dark mode docs. Add a section on how to use the system color scheme.

---

#### 🐛 Bug Fix

- Make docs site like 69x faster [#4493](https://github.com/tldraw/tldraw/pull/4493) ([@SomeHats](https://github.com/SomeHats))
- fix up privacy policy formatting [#4505](https://github.com/tldraw/tldraw/pull/4505) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: only show edit on github link for docs pages [#4486](https://github.com/tldraw/tldraw/pull/4486) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: use permalinks for source urls [#4489](https://github.com/tldraw/tldraw/pull/4489) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix class name. [#4503](https://github.com/tldraw/tldraw/pull/4503) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Bisect issues using the PR preview links [#4475](https://github.com/tldraw/tldraw/pull/4475) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Delete .github/workflows/publish-canary.yml [#4500](https://github.com/tldraw/tldraw/pull/4500) ([@ds300](https://github.com/ds300))
- Lokalise: Translations update [#4498](https://github.com/tldraw/tldraw/pull/4498) ([@TodePond](https://github.com/TodePond))
- Commercial license -> business license [#4497](https://github.com/tldraw/tldraw/pull/4497) ([@steveruizok](https://github.com/steveruizok))
- Docs tweaks, copy changes [#4447](https://github.com/tldraw/tldraw/pull/4447) ([@steveruizok](https://github.com/steveruizok))
- [docs] remove useless subheadings [#4492](https://github.com/tldraw/tldraw/pull/4492) ([@ds300](https://github.com/ds300))
- [docs] better icon for 'Reference' nav item [#4491](https://github.com/tldraw/tldraw/pull/4491) ([@ds300](https://github.com/ds300))
- [docs] improve code block typography [#4483](https://github.com/tldraw/tldraw/pull/4483) ([@ds300](https://github.com/ds300))
- [docs] Remove breadcrumbs (for now) [#4480](https://github.com/tldraw/tldraw/pull/4480) ([@ds300](https://github.com/ds300))
- [docs] tighten up header whitespace on desktop [#4477](https://github.com/tldraw/tldraw/pull/4477) ([@ds300](https://github.com/ds300))
- docs: nix system theme [#4473](https://github.com/tldraw/tldraw/pull/4473) ([@mimecuvalo](https://github.com/mimecuvalo))
- csp: turn on; also, add data: for connect-src [#4461](https://github.com/tldraw/tldraw/pull/4461) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: fix pricing link [#4472](https://github.com/tldraw/tldraw/pull/4472) ([@mimecuvalo](https://github.com/mimecuvalo))
- add deprecation notice to reference docs [#4467](https://github.com/tldraw/tldraw/pull/4467) ([@SomeHats](https://github.com/SomeHats))
- fix bad merge [#4466](https://github.com/tldraw/tldraw/pull/4466) ([@SomeHats](https://github.com/SomeHats))
- Rename manually triggered actions [#4448](https://github.com/tldraw/tldraw/pull/4448) ([@ds300](https://github.com/ds300))
- Update translations [#4445](https://github.com/tldraw/tldraw/pull/4445) ([@TodePond](https://github.com/TodePond))
- Allow publishing PR branches to npm for testing [#4435](https://github.com/tldraw/tldraw/pull/4435) ([@SomeHats](https://github.com/SomeHats))
- github: start actually closing old issues [#4444](https://github.com/tldraw/tldraw/pull/4444) ([@mimecuvalo](https://github.com/mimecuvalo))
- fix: typo in docs [#4402](https://github.com/tldraw/tldraw/pull/4402) ([@qwertyu-alex](https://github.com/qwertyu-alex))
- docs: rm accidental commit of yarn binary [#4418](https://github.com/tldraw/tldraw/pull/4418) ([@mimecuvalo](https://github.com/mimecuvalo))
- Event blocking example [#4376](https://github.com/tldraw/tldraw/pull/4376) ([@steveruizok](https://github.com/steveruizok))
- remove bemo worker from dev-app [#4372](https://github.com/tldraw/tldraw/pull/4372) ([@ds300](https://github.com/ds300))
- [docs] remove overflow from article body [#4360](https://github.com/tldraw/tldraw/pull/4360) ([@steveruizok](https://github.com/steveruizok))
- Add dialog/toasts example [#4133](https://github.com/tldraw/tldraw/pull/4133) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- fix broken links [#4322](https://github.com/tldraw/tldraw/pull/4322) ([@SomeHats](https://github.com/SomeHats))
- tweak cf template [#4317](https://github.com/tldraw/tldraw/pull/4317) ([@SomeHats](https://github.com/SomeHats))
- Steve's sync docs pass [#4275](https://github.com/tldraw/tldraw/pull/4275) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- csp: minor update to make sure report-uri isnt added in dev [#4286](https://github.com/tldraw/tldraw/pull/4286) ([@mimecuvalo](https://github.com/mimecuvalo))
- github: make auto-close bot just do stale for now, do close later [#4269](https://github.com/tldraw/tldraw/pull/4269) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add function property warning. [#4266](https://github.com/tldraw/tldraw/pull/4266) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- examples: fix up camera options [#4262](https://github.com/tldraw/tldraw/pull/4262) ([@mimecuvalo](https://github.com/mimecuvalo))
- Rename cloudflare-workers-template -> tldraw-sync-workers [#4259](https://github.com/tldraw/tldraw/pull/4259) ([@SomeHats](https://github.com/SomeHats))
- Update docs for dark mode. Add system color scheme docs. [#4256](https://github.com/tldraw/tldraw/pull/4256) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- supply secrets to template deploys [#4255](https://github.com/tldraw/tldraw/pull/4255) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - [SORRY, PLEASE MERGE] 3.0 megabus [#4494](https://github.com/tldraw/tldraw/pull/4494) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- `@tldraw/utils`
  - Better docs search [#4485](https://github.com/tldraw/tldraw/pull/4485) ([@SomeHats](https://github.com/SomeHats) [@mimecuvalo](https://github.com/mimecuvalo))
  - chore: license cleanup [#4416](https://github.com/tldraw/tldraw/pull/4416) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - [docs] Improve demo CTA, use actual tldraw [#4481](https://github.com/tldraw/tldraw/pull/4481) ([@ds300](https://github.com/ds300) [@mimecuvalo](https://github.com/mimecuvalo))
  - Make license debug helper return a cleanup function [#4356](https://github.com/tldraw/tldraw/pull/4356) ([@steveruizok](https://github.com/steveruizok))
  - License: add docs [#4217](https://github.com/tldraw/tldraw/pull/4217) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@mimecuvalo](https://github.com/mimecuvalo))
  - license: add special license option with watermark [#4296](https://github.com/tldraw/tldraw/pull/4296) ([@mimecuvalo](https://github.com/mimecuvalo))
  - More sync papercuts [#4273](https://github.com/tldraw/tldraw/pull/4273) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/sync`
  - Store bookmark images on our own asset server [#4460](https://github.com/tldraw/tldraw/pull/4460) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/tlschema`
  - consistent function style [#4468](https://github.com/tldraw/tldraw/pull/4468) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/sync-core`, `tldraw`, `@tldraw/utils`
  - Add sleep fn [#4454](https://github.com/tldraw/tldraw/pull/4454) ([@SomeHats](https://github.com/SomeHats))
- `tldraw`
  - Serve optimised content from CDN [#4455](https://github.com/tldraw/tldraw/pull/4455) ([@SomeHats](https://github.com/SomeHats))
  - faster (& more!) export snapshot tests [#4411](https://github.com/tldraw/tldraw/pull/4411) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - Change TldrawUiSlider from @internal to @public [#4335](https://github.com/tldraw/tldraw/pull/4335) ([@dimitriadamou](https://github.com/dimitriadamou) [@steveruizok](https://github.com/steveruizok))
  - Add terms of use / privacy policy [#4308](https://github.com/tldraw/tldraw/pull/4308) ([@steveruizok](https://github.com/steveruizok))
  - Sync docs [#4164](https://github.com/tldraw/tldraw/pull/4164) ([@SomeHats](https://github.com/SomeHats) [@adamwiggins](https://github.com/adamwiggins))
- `@tldraw/editor`, `tldraw`
  - Improve some type docs, delete duplicate file [#4383](https://github.com/tldraw/tldraw/pull/4383) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/sync-core`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Update READMEs. [#4377](https://github.com/tldraw/tldraw/pull/4377) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Fix some broken links in the docs [#4340](https://github.com/tldraw/tldraw/pull/4340) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/sync-core`, `@tldraw/sync`
  - Sync docs rework [#4267](https://github.com/tldraw/tldraw/pull/4267) ([@ds300](https://github.com/ds300) [@adamwiggins](https://github.com/adamwiggins))
- `@tldraw/sync-core`, `@tldraw/utils`
  - Sync docs, further refinements [#4263](https://github.com/tldraw/tldraw/pull/4263) ([@adamwiggins](https://github.com/adamwiggins) [@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- main: fix typo ([@SomeHats](https://github.com/SomeHats))
- main: publish bemo when needed ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fixes

- fix context toolbar example container width [#4440](https://github.com/tldraw/tldraw/pull/4440) ([@ds300](https://github.com/ds300))
- Focus on frames in docs [#4375](https://github.com/tldraw/tldraw/pull/4375) ([@steveruizok](https://github.com/steveruizok))
- Fix dropdown menus not opening in focus examples [#4274](https://github.com/tldraw/tldraw/pull/4274) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- geo: update X icon to reflect the actual shape [#4287](https://github.com/tldraw/tldraw/pull/4287) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - paste: fix pasting images from excalidraw [#4462](https://github.com/tldraw/tldraw/pull/4462) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix local save warning / watermark [#4482](https://github.com/tldraw/tldraw/pull/4482) ([@steveruizok](https://github.com/steveruizok))
  - Fix escape bug [#4470](https://github.com/tldraw/tldraw/pull/4470) ([@steveruizok](https://github.com/steveruizok))
  - Add watermark to tldraw.com [#4449](https://github.com/tldraw/tldraw/pull/4449) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats))
  - Use custom mime types in useInsertMedia hook [#4453](https://github.com/tldraw/tldraw/pull/4453) ([@ds300](https://github.com/ds300))
  - Fix exports for dark mode frames and flipped images [#4424](https://github.com/tldraw/tldraw/pull/4424) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - fix inky path rendering [#4382](https://github.com/tldraw/tldraw/pull/4382) ([@ds300](https://github.com/ds300))
  - video: rm sync that doesn't really work; fix fullscreen rendering [#4338](https://github.com/tldraw/tldraw/pull/4338) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix an issue with minimap [#4318](https://github.com/tldraw/tldraw/pull/4318) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - draw: fix dotted line rendering when zoomed out [#4261](https://github.com/tldraw/tldraw/pull/4261) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - fix assets prop on tldraw component [#4283](https://github.com/tldraw/tldraw/pull/4283) ([@SomeHats](https://github.com/SomeHats))
- `tldraw`
  - Fix parsing of older tldraw v2 documents [#4502](https://github.com/tldraw/tldraw/pull/4502) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - assets: no need for the setTimeout 0 anymore after deep links [#4463](https://github.com/tldraw/tldraw/pull/4463) ([@mimecuvalo](https://github.com/mimecuvalo))
  - fix getArcInfo [#4458](https://github.com/tldraw/tldraw/pull/4458) ([@ds300](https://github.com/ds300))
  - Fix an issue with canceling the page name and presence name changes. [#4408](https://github.com/tldraw/tldraw/pull/4408) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix an error with parsing embed urls. [#4397](https://github.com/tldraw/tldraw/pull/4397) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - make arrow labels wrap dynamically [#4384](https://github.com/tldraw/tldraw/pull/4384) ([@ds300](https://github.com/ds300))
  - Fix cloud rendering with dynamic scale [#4380](https://github.com/tldraw/tldraw/pull/4380) ([@ds300](https://github.com/ds300))
  - feat: Able to pass disable to the Icon when UiMenuContext is in mode 'toolbar' [#4369](https://github.com/tldraw/tldraw/pull/4369) ([@dimitriadamou](https://github.com/dimitriadamou) [@ds300](https://github.com/ds300))
  - Fix issues with resizing cropped images [#4350](https://github.com/tldraw/tldraw/pull/4350) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Combino fixed text [#4331](https://github.com/tldraw/tldraw/pull/4331) ([@steveruizok](https://github.com/steveruizok))
  - Fix flipping of cropped images [#4337](https://github.com/tldraw/tldraw/pull/4337) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - bookmark: dont show broken favicon and cleanup HTML entities in title [#4330](https://github.com/tldraw/tldraw/pull/4330) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Add missing bits to exploded example [#4323](https://github.com/tldraw/tldraw/pull/4323) ([@SomeHats](https://github.com/SomeHats))
  - theme: fix color scheme (again) [#4289](https://github.com/tldraw/tldraw/pull/4289) ([@mimecuvalo](https://github.com/mimecuvalo))
  - share: make top/bottom not shrink when a lot of people in the room [#4271](https://github.com/tldraw/tldraw/pull/4271) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - Fix an issue with firefox [#4432](https://github.com/tldraw/tldraw/pull/4432) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Use base zoom and zoom steps to calculate min and max zoom for pinch gesture [#4427](https://github.com/tldraw/tldraw/pull/4427) ([@zacwood9](https://github.com/zacwood9))
  - fix the box shape tool not exiting the resizing state [#4404](https://github.com/tldraw/tldraw/pull/4404) ([@SomeHats](https://github.com/SomeHats))
  - Remove the document.hasFocus check [#4373](https://github.com/tldraw/tldraw/pull/4373) ([@steveruizok](https://github.com/steveruizok))
  - Fix duplication of shapes. [#4316](https://github.com/tldraw/tldraw/pull/4316) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix order of closed menus [#4247](https://github.com/tldraw/tldraw/pull/4247) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/store`, `tldraw`
  - Fix rendering perf regression [#4433](https://github.com/tldraw/tldraw/pull/4433) ([@ds300](https://github.com/ds300))
- `@tldraw/utils`
  - Hotfix for index keys validation [#4361](https://github.com/tldraw/tldraw/pull/4361) ([@ds300](https://github.com/ds300))
  - fractional indexing: rm the 0 check for indicies, outdated with jitter code [#4332](https://github.com/tldraw/tldraw/pull/4332) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`, `@tldraw/utils`
  - shape ordering: upgrade fractional indexing to use jitter, avoid conflicts [#4312](https://github.com/tldraw/tldraw/pull/4312) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 💄 Product Improvements

- simplify context toolbar example [#4441](https://github.com/tldraw/tldraw/pull/4441) ([@ds300](https://github.com/ds300))
- Add custom grid example [#4425](https://github.com/tldraw/tldraw/pull/4425) ([@ds300](https://github.com/ds300))
- Address alex's sync docs feedback [#4292](https://github.com/tldraw/tldraw/pull/4292) ([@ds300](https://github.com/ds300))
- Use cloudflare-workers-unfurl [#4257](https://github.com/tldraw/tldraw/pull/4257) ([@ds300](https://github.com/ds300))
- `@tldraw/store`, `tldraw`
  - Improve loading of files [#4510](https://github.com/tldraw/tldraw/pull/4510) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - images: dont stop playing a gif on double click [#4451](https://github.com/tldraw/tldraw/pull/4451) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Deep Links [#4333](https://github.com/tldraw/tldraw/pull/4333) ([@ds300](https://github.com/ds300))
  - Add option for max pasted / dropped files [#4294](https://github.com/tldraw/tldraw/pull/4294) ([@steveruizok](https://github.com/steveruizok))
  - support custom delay for laser pointer [#4300](https://github.com/tldraw/tldraw/pull/4300) ([@raviteja83](https://github.com/raviteja83))
- `tldraw`
  - File save warning [#4469](https://github.com/tldraw/tldraw/pull/4469) ([@steveruizok](https://github.com/steveruizok))
  - Allow the users to programmatically disable the context menu. [#4415](https://github.com/tldraw/tldraw/pull/4415) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Simplify getting of the text [#4414](https://github.com/tldraw/tldraw/pull/4414) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Improve event tracking [#4409](https://github.com/tldraw/tldraw/pull/4409) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Landing page and docs features [#4368](https://github.com/tldraw/tldraw/pull/4368) ([@lukaswiesehan](https://github.com/lukaswiesehan) [@steveruizok](https://github.com/steveruizok))
  - Gracefully handle deleted tools & actions (remix) [#4345](https://github.com/tldraw/tldraw/pull/4345) ([@steveruizok](https://github.com/steveruizok))
  - Interpolation: draw/highlight points, discrete props [#4241](https://github.com/tldraw/tldraw/pull/4241) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - text shape: dont make a fixed width unless more intentional drag [#4293](https://github.com/tldraw/tldraw/pull/4293) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Improve arrow label snapping [#4265](https://github.com/tldraw/tldraw/pull/4265) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - keyboard: list out , as keyboard shortcut [#4270](https://github.com/tldraw/tldraw/pull/4270) ([@mimecuvalo](https://github.com/mimecuvalo) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Export helpers for image paste [#4258](https://github.com/tldraw/tldraw/pull/4258) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - add default <foreignObject> based export for shapes [#4403](https://github.com/tldraw/tldraw/pull/4403) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`
  - inline nanoid [#4410](https://github.com/tldraw/tldraw/pull/4410) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Prevent unhandled promise rejection during strict mode [#4406](https://github.com/tldraw/tldraw/pull/4406) ([@ds300](https://github.com/ds300))
  - Docs Redesign [#4078](https://github.com/tldraw/tldraw/pull/4078) ([@lukaswiesehan](https://github.com/lukaswiesehan) [@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
  - Preserve focus search param [#4344](https://github.com/tldraw/tldraw/pull/4344) ([@steveruizok](https://github.com/steveruizok))
  - why did we have this dpr constrained width/height stuff again? [#4297](https://github.com/tldraw/tldraw/pull/4297) ([@ds300](https://github.com/ds300))
  - license: allow wildcard to make apex domains also work [#4334](https://github.com/tldraw/tldraw/pull/4334) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Allow non default z value for scribble points. [#4260](https://github.com/tldraw/tldraw/pull/4260) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - [api] Widen snapshots pit of success [#4392](https://github.com/tldraw/tldraw/pull/4392) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/sync`, `tldraw`
  - images: show ghost preview image while uploading [#3988](https://github.com/tldraw/tldraw/pull/3988) ([@mimecuvalo](https://github.com/mimecuvalo) [@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))

#### 🎉 New Features

- feat(docs): Hook up feedback form with Vercel analytics events [#4387](https://github.com/tldraw/tldraw/pull/4387) ([@lukaswiesehan](https://github.com/lukaswiesehan) [@steveruizok](https://github.com/steveruizok))
- feat(blog): Hook up newsletter form with SendGrid [#4388](https://github.com/tldraw/tldraw/pull/4388) ([@lukaswiesehan](https://github.com/lukaswiesehan) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`
  - Custom embeds API [#4326](https://github.com/tldraw/tldraw/pull/4326) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - [Feature, Example] Text search example and `getText` API [#4306](https://github.com/tldraw/tldraw/pull/4306) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/sync-core`
  - Make it easy to load preexisting snapshots into TLSocketRoom [#4272](https://github.com/tldraw/tldraw/pull/4272) ([@ds300](https://github.com/ds300))

#### 🛠️ API Changes

- `tldraw`
  - Add assetUrls option to TldrawImage [#4465](https://github.com/tldraw/tldraw/pull/4465) ([@ds300](https://github.com/ds300))
  - Disable Pages UI when maxPages === 1 [#4348](https://github.com/tldraw/tldraw/pull/4348) ([@ds300](https://github.com/ds300))
  - Export some missing components that are used in the `DefaultToolbar` [#4321](https://github.com/tldraw/tldraw/pull/4321) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - Rename TLSvgOptions [#4442](https://github.com/tldraw/tldraw/pull/4442) ([@ds300](https://github.com/ds300))
  - Make rotateShapesBy work on any shapes [#4385](https://github.com/tldraw/tldraw/pull/4385) ([@ds300](https://github.com/ds300))
- `@tldraw/state`, `@tldraw/utils`
  - support tc39 decorators [#4412](https://github.com/tldraw/tldraw/pull/4412) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state-react`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Detect multiple installed versions of tldraw packages [#4398](https://github.com/tldraw/tldraw/pull/4398) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/sync`
  - allow loading the sync URI dynamically [#4379](https://github.com/tldraw/tldraw/pull/4379) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`
  - Rename `StoreOptions.multiplayerStatus` [#4349](https://github.com/tldraw/tldraw/pull/4349) ([@steveruizok](https://github.com/steveruizok))
  - remove onEditorMount prop [#4320](https://github.com/tldraw/tldraw/pull/4320) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/sync-core`, `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Move from function properties to methods [#4288](https://github.com/tldraw/tldraw/pull/4288) ([@ds300](https://github.com/ds300) [@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/sync-core`, `tldraw`
  - Deprecate editor.mark, fix cropping tests [#4250](https://github.com/tldraw/tldraw/pull/4250) ([@ds300](https://github.com/ds300))

#### 🔩 Dependency Updates

- build(deps): bump the npm_and_yarn group across 4 directories with 1 update [#4423](https://github.com/tldraw/tldraw/pull/4423) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- build(deps): bump the npm_and_yarn group across 3 directories with 3 updates [#4405](https://github.com/tldraw/tldraw/pull/4405) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- build(deps): bump tar from 7.2.0 to 7.3.0 in the npm_and_yarn group across 1 directory [#4136](https://github.com/tldraw/tldraw/pull/4136) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@github-actions[bot]](https://github.com/github-actions[bot]) [@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 16

- [@dependabot[bot]](https://github.com/dependabot[bot])
- [@dimitriadamou](https://github.com/dimitriadamou)
- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- Adam Wiggins ([@adamwiggins](https://github.com/adamwiggins))
- Alex ([@qwertyu-alex](https://github.com/qwertyu-alex))
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Lukas Wiesehan ([@lukaswiesehan](https://github.com/lukaswiesehan))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Ravi theja ([@raviteja83](https://github.com/raviteja83))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Zachary Wood ([@zacwood9](https://github.com/zacwood9))

---

# v2.4.0 (Mon Jul 22 2024)

### Release Notes

#### license: fix up watermark in prod ([#4252](https://github.com/tldraw/tldraw/pull/4252))

- Licensing: fix up watermark in prod

#### focus: fix dbl-click to edit text, when shape is selected, in label geometry hit area ([#4237](https://github.com/tldraw/tldraw/pull/4237))

- Text editing: fix dbl-click to edit text, when shape is selected, in label geometry hit area

#### Add make real as an option. ([#4244](https://github.com/tldraw/tldraw/pull/4244))

- Add make real as one of the options.

#### Couple of force flag test additions ([#4224](https://github.com/tldraw/tldraw/pull/4224))

- Extra tests for force flag.

#### stickies: make ADJACENT_NOTE_MARGIN match adjacentShapeMargin (again) ([#4231](https://github.com/tldraw/tldraw/pull/4231))

- Stickies: fix adjacent margin to match shape margin

#### issues: setup bot to auto-close issues over 6 months ([#4238](https://github.com/tldraw/tldraw/pull/4238))

- Issues: bot to auto-close issues over 6 months

#### Fix indentation. ([#4243](https://github.com/tldraw/tldraw/pull/4243))

- Validations were incorrectly nested inside attributes.

#### Update the templates to include a dropdown to distinguish between dotcom and package bugs / feature requests. ([#4239](https://github.com/tldraw/tldraw/pull/4239))

- Update bug and feature request templates to include a dropdown to help us distinguish between tldraw.com and the dev package.

#### Support animating opacity. ([#4242](https://github.com/tldraw/tldraw/pull/4242))

- You can now animate the opacity of shapes.

#### db: add fallback for FF versions < 126 ([#4240](https://github.com/tldraw/tldraw/pull/4240))

- Fix issue with indexedDB in older versions of Firefox < 126.

#### Interpolated line points ([#4188](https://github.com/tldraw/tldraw/pull/4188))

- Fixed a bug with…

#### Simplify unfurl in simple-server-example ([#4236](https://github.com/tldraw/tldraw/pull/4236))

- Fixed a bug with…

#### Remove bun from deps and run it with npx ([#4228](https://github.com/tldraw/tldraw/pull/4228))

- Fixed a bug with…

#### Finesse sync api ([#4212](https://github.com/tldraw/tldraw/pull/4212))

- Fixed a bug with…

#### Consolidate menu examples ([#4148](https://github.com/tldraw/tldraw/pull/4148))

- Consolidated examples that show how to customise menus.

#### Fix fontStyle assignment ([#4195](https://github.com/tldraw/tldraw/pull/4195))

- Fixed a bug where font style wasn't correctly exported as SVG

#### Allow custom tools to decide whether they can be lockable or not. ([#4208](https://github.com/tldraw/tldraw/pull/4208))

- Allows custom tools to control whether they can be lockable or not. By default they are lockable. You can opt out by overriding `StateNode`'s `isLockable` field:
```typescript
export class MyCustomTool extends StateNode {

   static override isLockable = false

}
```

#### Force flag should override isLocked in more cases ([#4214](https://github.com/tldraw/tldraw/pull/4214))

- Fixed the `force` flag not being taken in account after locking the camera and calling `centerOnPoint`, `resetZoom`, `zoomIn`, `zoomOut`, `zoomToSelection` or `zoomToBounds`.

#### Export default menu panel. ([#4193](https://github.com/tldraw/tldraw/pull/4193))

- Export the `DefaultMenuPanel`.

#### Interpolate arrow props ([#4213](https://github.com/tldraw/tldraw/pull/4213))

- Added interpolated props for arrow shapes

#### Fix interactive shape example ([#4209](https://github.com/tldraw/tldraw/pull/4209))

- Fixed a bug with the interactive shape example, where you couldn't interact with the shape with touch devices.

#### Make asset.fileSize optional ([#4206](https://github.com/tldraw/tldraw/pull/4206))

- Made the `fileSize` property of `TLImageAsset` and `TLVideoAsset` optional

#### Example node + bun server ([#4173](https://github.com/tldraw/tldraw/pull/4173))

- Fixed a bug with…

#### Fix dotcom multiplayer analytics ([#4205](https://github.com/tldraw/tldraw/pull/4205))

- Fixed a bug with…

#### Improve page event tracking. ([#4202](https://github.com/tldraw/tldraw/pull/4202))

- Add additional tracking of page related events like renaming, duplicating, moving.

#### Disable outputs for tests. ([#4201](https://github.com/tldraw/tldraw/pull/4201))

- Remove the license info outputs when testing.

#### asset lod: fix high-res images ([#4198](https://github.com/tldraw/tldraw/pull/4198))

- Images LOD: fix high-res images.

#### csp: followup fixes/dx/tweaks ([#4159](https://github.com/tldraw/tldraw/pull/4159))

- Security: more CSP work on dotcom

#### Relax the params ([#4190](https://github.com/tldraw/tldraw/pull/4190))

- Allow passing partial `TLEditorSnapshot` to `TldrawImage` and `useTLStore`.

#### Explicitly type shape props and defaults ([#4191](https://github.com/tldraw/tldraw/pull/4191))

- Explicitly declare type types of default shapes etc. and shape props for better documentation

#### docs: fix up prev/next for api reference ([#4171](https://github.com/tldraw/tldraw/pull/4171))

- Docs: fix up prev/next.

#### Show checked theme in color scheme menu ([#4184](https://github.com/tldraw/tldraw/pull/4184))

- Fixed a bug where the user's color scheme was not shown in the menu by default.

#### toSvg method example ([#4124](https://github.com/tldraw/tldraw/pull/4124))

- [Examples App] added an example for the toSvg method on a custom shape.

#### Fix sticker example. ([#4172](https://github.com/tldraw/tldraw/pull/4172))

- Fix the sticker example.

#### Editor.run, locked shapes improvements ([#4042](https://github.com/tldraw/tldraw/pull/4042))

- SDK: Adds `Editor.force()` to permit updating / deleting locked shapes 
- Fixed a bug that would allow locked shapes to be updated programmatically
- Fixed a bug that would allow locked group shapes to be ungrouped programmatically

#### `ShapeUtil.getInterpolatedProps` ([#4162](https://github.com/tldraw/tldraw/pull/4162))

- SDK: adds `ShapeUtil.getInterpolatedProps` so that shapes can better participate in animations.

#### Split @tldraw/state into @tldraw/state and @tldraw/state-react ([#4170](https://github.com/tldraw/tldraw/pull/4170))

- Fixed a bug with…

#### serve icons via a single merged .svg file ([#4150](https://github.com/tldraw/tldraw/pull/4150))

- Serve icons more efficiently, and make sure they're still available if tldraw goes offline.

#### [sdk] make EffectScheduler and useStateTracking public ([#4155](https://github.com/tldraw/tldraw/pull/4155))

- Made `EffectScheduler` and `useStateTracking` public

#### [bemo] allow special chars in roomId ([#4153](https://github.com/tldraw/tldraw/pull/4153))

- Fixed a bug with…

#### State/store example ([#4147](https://github.com/tldraw/tldraw/pull/4147))

- Added an example that shows how to use track, useValue and useReactor

#### [bemo] No public shared rooms in examples app ([#4152](https://github.com/tldraw/tldraw/pull/4152))

- Fixed a bug with…

#### Geometry shape example ([#4134](https://github.com/tldraw/tldraw/pull/4134))

- Added an example for creating a shape with custom geometry

#### Unify menus. Disable erroring. ([#4143](https://github.com/tldraw/tldraw/pull/4143))

- Unify the VS Code extension menus (Help and Main menus) with what we have on tldraw.com
- Prevent an onerror cycle.

#### [bemo] add analytics to bemo worker ([#4146](https://github.com/tldraw/tldraw/pull/4146))

- Fixed a bug with…

#### Fix `/new` alert bug, make new user data stable ([#4142](https://github.com/tldraw/tldraw/pull/4142))

- Fixed a bug with…

#### [bemo] allow custom shapes ([#4144](https://github.com/tldraw/tldraw/pull/4144))

- Fixed a bug with…

#### sdk: wires up tldraw to have licensing mechanisms ([#4021](https://github.com/tldraw/tldraw/pull/4021))

- SDK: wires up tldraw to have licensing mechanisms.

#### Use shape scale for geo shape min size ([#4140](https://github.com/tldraw/tldraw/pull/4140))

- Fixed a bug with the minimum size on dynamically scaled text shapes

#### [1/4] Blob storage in TLStore ([#4068](https://github.com/tldraw/tldraw/pull/4068))

Introduce a new `assets` option for the store, describing how to save and retrieve asset blobs like images & videos from e.g. a user-content CDN. These are accessible through `editor.uploadAsset` and `editor.resolveAssetUrl`. This supplements the existing `registerExternalAssetHandler` API: `registerExternalAssetHandler` is for customising metadata extraction, and should call `editor.uploadAsset` to save assets. Existing `registerExternalAssetHandler` calls will still work, but if you're only using them to configure uploads and don't want to customise metadata extraction, consider switching to the new `assets` store prop.

#### use unique IDs for grid instances ([#4132](https://github.com/tldraw/tldraw/pull/4132))

- Fix a bug causing multiple tldraw instances to share the same grid background

#### Export entire canvas as an image ([#4125](https://github.com/tldraw/tldraw/pull/4125))

- [examples app] added an example of how to export the page as an image

#### Remove duplicate code ([#4128](https://github.com/tldraw/tldraw/pull/4128))

- Remove some duplicate code which should make some of the exports a bit smaller.

#### Add offline icon back ([#4127](https://github.com/tldraw/tldraw/pull/4127))

- Fixed a bug with…

#### fix bookmark height ([#4118](https://github.com/tldraw/tldraw/pull/4118))

- Fixed a bug with…

#### Add a toast for file upload failures. ([#4114](https://github.com/tldraw/tldraw/pull/4114))

- Show a toast when uploading an unsupported file type or a file that is too large (more than 10mb).

#### Add a toast for missing clipboard permissions. ([#4117](https://github.com/tldraw/tldraw/pull/4117))

- Show a toast when pasting failed due to missing clipboard permissions.

#### Flip images ([#4113](https://github.com/tldraw/tldraw/pull/4113))

- Adds the ability to flip images.

#### fix input coords while viewport following ([#4108](https://github.com/tldraw/tldraw/pull/4108))

- Fixed a bug with…

#### Add "paste at cursor" option, which toggles how `cmd + v` and `cmd + shift + v` work ([#4088](https://github.com/tldraw/tldraw/pull/4088))

- Allow users and sdk users to make pasting at the cursor a default instead of only being available with `⌘ + ⇧ + v`.

#### Fix two issues with frame headers ([#4092](https://github.com/tldraw/tldraw/pull/4092))

- Fixes two issues with editing frame names.

#### Set bemo url in examples app ([#4091](https://github.com/tldraw/tldraw/pull/4091))

- Fixed a bug with...

#### Make arrow sequence not retroactive ([#4090](https://github.com/tldraw/tldraw/pull/4090))

- Fixed a bug with...

#### Fix editor remounting when camera options change ([#4089](https://github.com/tldraw/tldraw/pull/4089))

Fix an issue where changing `cameraOptions` via react would cause the entire editor to re-render

#### Share menu improvements ([#4079](https://github.com/tldraw/tldraw/pull/4079))

- Make sure the share menu is open after sharing a room. Prevent the qr code from flickering when navigating to `/new`

#### Add component for `ShapeIndicators` ([#4083](https://github.com/tldraw/tldraw/pull/4083))

- Added new `ShapeIndicators` component to `components` object.
- Added new `TldrawShapeIndicators` component.

#### put sync stuff in bemo worker ([#4060](https://github.com/tldraw/tldraw/pull/4060))

- Fixed a bug with...

#### Fix an issue with react router and dev mode for the /new route. ([#4063](https://github.com/tldraw/tldraw/pull/4063))

- Fixed a but with navigating to `/new`.

#### worker fixes ([#4059](https://github.com/tldraw/tldraw/pull/4059))

- Fixed a bug with...

#### asset: targeted fix for loading the initial url quicker, before debouncing ([#4058](https://github.com/tldraw/tldraw/pull/4058))

- Assets: fix artificial delay in showing an image.

#### Fix duplicate distance ([#4056](https://github.com/tldraw/tldraw/pull/4056))

- Fixed a bug that caused the distance offset for duplicated shapes to not match other duplication distance offsets.

#### Unfurl bookmarks in worker ([#4039](https://github.com/tldraw/tldraw/pull/4039))

- Do link unfurling on the same subdomain as all our other api endpoints.

#### Add `setDefaultValue` to `StyleProp` ([#4044](https://github.com/tldraw/tldraw/pull/4044))

- Adds a method for changing the default style of a `StyleProp` instance.

#### Add shape change examples ([#4043](https://github.com/tldraw/tldraw/pull/4043))

- Adds shape / instance change examples.

#### Layout constraints example ([#3996](https://github.com/tldraw/tldraw/pull/3996))

- Adds an example of how to use bindings to create layout constraints

#### Fix empty edit context menu ([#4037](https://github.com/tldraw/tldraw/pull/4037))

- Fixes a bug where the context menu would display an empty edit menu.

#### Improve filled draw shaped in dynamic size mode ([#3974](https://github.com/tldraw/tldraw/pull/3974))

- Improve closing of draw shapes in dynamic size mode

#### Don't select child of selected shape on right click ([#4034](https://github.com/tldraw/tldraw/pull/4034))

- Add a brief release note for your PR here.

#### check worker bundle sizes ([#4032](https://github.com/tldraw/tldraw/pull/4032))

- Add a brief release note for your PR here.

#### Cleanup z-indices ([#4020](https://github.com/tldraw/tldraw/pull/4020))

- Cleans up z-indexes and removes some unused CSS.

#### fix dotcom worker bundle size ([#4030](https://github.com/tldraw/tldraw/pull/4030))

- Add a brief release note for your PR here.

#### csp: report-only for now ([#4029](https://github.com/tldraw/tldraw/pull/4029))

- CSP: only do report-only for now until we're sure it's ok.

#### Add fog of war example ([#4025](https://github.com/tldraw/tldraw/pull/4025))

- Adds fog of war example.

#### Fix `<InFrontOfTheCanvas/>` ([#4024](https://github.com/tldraw/tldraw/pull/4024))

- Fixed placement of the InFrontOfTheCanvas component.

#### [bemo bae] Spike on tlsync public API improvement ([#4002](https://github.com/tldraw/tldraw/pull/4002))

- Add a brief release note for your PR here.

#### bookmarks: account for relative urls more robustly ([#4022](https://github.com/tldraw/tldraw/pull/4022))

- Bookmark extractor: account for relative urls more robustly

#### csp: add content security policy for dotcom ([#3952](https://github.com/tldraw/tldraw/pull/3952))

- Security: add CSP to dotcom.

#### Better docs search ([#4015](https://github.com/tldraw/tldraw/pull/4015))

- Improves the docs search by searching through keywords

#### Do a pre-release of the VS code extension for merges to main. ([#3957](https://github.com/tldraw/tldraw/pull/3957))

- Release a pre-release when we merge changes to main.

---

#### 🐛 Bug Fix

- issues: setup bot to auto-close issues over 6 months [#4238](https://github.com/tldraw/tldraw/pull/4238) ([@mimecuvalo](https://github.com/mimecuvalo))
- Update the templates to include a dropdown to distinguish between dotcom and package bugs / feature requests. [#4239](https://github.com/tldraw/tldraw/pull/4239) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Remove bun from deps and run it with npx [#4228](https://github.com/tldraw/tldraw/pull/4228) ([@ds300](https://github.com/ds300))
- Consolidate menu examples [#4148](https://github.com/tldraw/tldraw/pull/4148) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix interactive shape example [#4209](https://github.com/tldraw/tldraw/pull/4209) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- docs: fix up typo [#4194](https://github.com/tldraw/tldraw/pull/4194) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: fix up prev/next for api reference [#4171](https://github.com/tldraw/tldraw/pull/4171) ([@mimecuvalo](https://github.com/mimecuvalo))
- fix wrangler config [#4186](https://github.com/tldraw/tldraw/pull/4186) ([@SomeHats](https://github.com/SomeHats))
- Shuffle docs order [#4183](https://github.com/tldraw/tldraw/pull/4183) ([@steveruizok](https://github.com/steveruizok))
- toSvg method example [#4124](https://github.com/tldraw/tldraw/pull/4124) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- head: rm mask-icon [#4160](https://github.com/tldraw/tldraw/pull/4160) ([@mimecuvalo](https://github.com/mimecuvalo))
- license: show on dotcom dev mode [#4158](https://github.com/tldraw/tldraw/pull/4158) ([@mimecuvalo](https://github.com/mimecuvalo))
- State/store example [#4147](https://github.com/tldraw/tldraw/pull/4147) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Geometry shape example [#4134](https://github.com/tldraw/tldraw/pull/4134) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Export entire canvas as an image [#4125](https://github.com/tldraw/tldraw/pull/4125) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- fix vec docs [#4107](https://github.com/tldraw/tldraw/pull/4107) ([@SomeHats](https://github.com/SomeHats))
- introduce images.tldraw.xyz image optimisation worker [#4069](https://github.com/tldraw/tldraw/pull/4069) ([@SomeHats](https://github.com/SomeHats))
- Set bemo url in examples app [#4091](https://github.com/tldraw/tldraw/pull/4091) ([@ds300](https://github.com/ds300))
- indicators on the canvas example [#4071](https://github.com/tldraw/tldraw/pull/4071) ([@steveruizok](https://github.com/steveruizok))
- Demo assets server [#4055](https://github.com/tldraw/tldraw/pull/4055) ([@SomeHats](https://github.com/SomeHats))
- add workers-shared package and source-maps for dotcom-worker sentry reports [#4052](https://github.com/tldraw/tldraw/pull/4052) ([@SomeHats](https://github.com/SomeHats))
- Add shape change examples [#4043](https://github.com/tldraw/tldraw/pull/4043) ([@steveruizok](https://github.com/steveruizok))
- Update pull_request_template.md [#4038](https://github.com/tldraw/tldraw/pull/4038) ([@steveruizok](https://github.com/steveruizok))
- check worker bundle sizes [#4032](https://github.com/tldraw/tldraw/pull/4032) ([@ds300](https://github.com/ds300))
- fix dotcom worker bundle size [#4030](https://github.com/tldraw/tldraw/pull/4030) ([@ds300](https://github.com/ds300))
- csp: report-only for now [#4029](https://github.com/tldraw/tldraw/pull/4029) ([@mimecuvalo](https://github.com/mimecuvalo))
- Do a pre-release of the VS code extension for merges to main. [#3957](https://github.com/tldraw/tldraw/pull/3957) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - asset: make useAsset @public [#4249](https://github.com/tldraw/tldraw/pull/4249) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - license: add example; fix up example dialog [#4163](https://github.com/tldraw/tldraw/pull/4163) ([@mimecuvalo](https://github.com/mimecuvalo) [@MitjaBezensek](https://github.com/MitjaBezensek))
  - add version attribute [#4192](https://github.com/tldraw/tldraw/pull/4192) ([@SomeHats](https://github.com/SomeHats))
  - Editor.run docs [#4182](https://github.com/tldraw/tldraw/pull/4182) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - Watermark II [#4196](https://github.com/tldraw/tldraw/pull/4196) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))
  - csp: followup fixes/dx/tweaks [#4159](https://github.com/tldraw/tldraw/pull/4159) ([@mimecuvalo](https://github.com/mimecuvalo))
  - followups to z-index and PR template [#4054](https://github.com/tldraw/tldraw/pull/4054) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/sync-core`
  - Example node + bun server [#4173](https://github.com/tldraw/tldraw/pull/4173) ([@ds300](https://github.com/ds300))
- `@tldraw/tlschema`
  - Cloudflare sync template [#4179](https://github.com/tldraw/tldraw/pull/4179) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/sync`
  - bemo custom shape example [#4174](https://github.com/tldraw/tldraw/pull/4174) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/sync-core`, `@tldraw/sync`
  - publish bemo canaries [#4175](https://github.com/tldraw/tldraw/pull/4175) ([@SomeHats](https://github.com/SomeHats))
  - [5/5] Move bemo from dotcom to examples [#4135](https://github.com/tldraw/tldraw/pull/4135) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300))
  - [4/5] sync -> sync-core, sync-react -> sync [#4123](https://github.com/tldraw/tldraw/pull/4123) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tlschema`, `@tldraw/validate`
  - Demo server bookmark unfurl endpoint [#4062](https://github.com/tldraw/tldraw/pull/4062) ([@SomeHats](https://github.com/SomeHats))

#### ⚠️ Pushed to `main`

- main: fix health worker wrnagler names ([@SomeHats](https://github.com/SomeHats))
- fix asset upload wrangler.toml ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fixes

- Fix indentation. [#4243](https://github.com/tldraw/tldraw/pull/4243) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix dotcom multiplayer analytics [#4205](https://github.com/tldraw/tldraw/pull/4205) ([@ds300](https://github.com/ds300))
- csp: enable image upload for dev mode [#4199](https://github.com/tldraw/tldraw/pull/4199) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix sticker example. [#4172](https://github.com/tldraw/tldraw/pull/4172) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- fix bemo url in examples app [#4156](https://github.com/tldraw/tldraw/pull/4156) ([@ds300](https://github.com/ds300))
- Fix examples URL in docs app [#4129](https://github.com/tldraw/tldraw/pull/4129) ([@ds300](https://github.com/ds300))
- Allow null origins on dotcom worker requests [#4105](https://github.com/tldraw/tldraw/pull/4105) ([@SomeHats](https://github.com/SomeHats))
- Fix an issue with react router and dev mode for the /new route. [#4063](https://github.com/tldraw/tldraw/pull/4063) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- worker fixes [#4059](https://github.com/tldraw/tldraw/pull/4059) ([@ds300](https://github.com/ds300) [@SomeHats](https://github.com/SomeHats))
- Fixup staging worker deploys [#4050](https://github.com/tldraw/tldraw/pull/4050) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - license: fix up watermark in prod [#4252](https://github.com/tldraw/tldraw/pull/4252) ([@mimecuvalo](https://github.com/mimecuvalo))
  - db: add fallback for FF versions < 126 [#4240](https://github.com/tldraw/tldraw/pull/4240) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix watermark after breakpoints [#4216](https://github.com/tldraw/tldraw/pull/4216) ([@steveruizok](https://github.com/steveruizok))
  - Force flag should override isLocked in more cases [#4214](https://github.com/tldraw/tldraw/pull/4214) ([@AlbertBrand](https://github.com/AlbertBrand) [@steveruizok](https://github.com/steveruizok))
  - Fix watermark imports in published packages [#4180](https://github.com/tldraw/tldraw/pull/4180) ([@SomeHats](https://github.com/SomeHats))
  - Fix `/new` alert bug, make new user data stable [#4142](https://github.com/tldraw/tldraw/pull/4142) ([@ds300](https://github.com/ds300))
  - use unique IDs for grid instances [#4132](https://github.com/tldraw/tldraw/pull/4132) ([@SomeHats](https://github.com/SomeHats))
  - fix input coords while viewport following [#4108](https://github.com/tldraw/tldraw/pull/4108) ([@ds300](https://github.com/ds300))
- `tldraw`
  - focus: fix dbl-click to edit text, when shape is selected, in label geometry hit area [#4237](https://github.com/tldraw/tldraw/pull/4237) ([@mimecuvalo](https://github.com/mimecuvalo))
  - stickies: make ADJACENT_NOTE_MARGIN match adjacentShapeMargin (again) [#4231](https://github.com/tldraw/tldraw/pull/4231) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix fontStyle assignment [#4195](https://github.com/tldraw/tldraw/pull/4195) ([@ggrossetie](https://github.com/ggrossetie) [@steveruizok](https://github.com/steveruizok))
  - asset lod: fix high-res images [#4198](https://github.com/tldraw/tldraw/pull/4198) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix color scheme default [#4185](https://github.com/tldraw/tldraw/pull/4185) ([@steveruizok](https://github.com/steveruizok))
  - Use shape scale for geo shape min size [#4140](https://github.com/tldraw/tldraw/pull/4140) ([@steveruizok](https://github.com/steveruizok))
  - fix bookmark height [#4118](https://github.com/tldraw/tldraw/pull/4118) ([@ds300](https://github.com/ds300))
  - Fix two issues with frame headers [#4092](https://github.com/tldraw/tldraw/pull/4092) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - asset: targeted fix for loading the initial url quicker, before debouncing [#4058](https://github.com/tldraw/tldraw/pull/4058) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix duplicate distance [#4056](https://github.com/tldraw/tldraw/pull/4056) ([@steveruizok](https://github.com/steveruizok))
  - Fix empty edit context menu [#4037](https://github.com/tldraw/tldraw/pull/4037) ([@steveruizok](https://github.com/steveruizok))
  - Don't select child of selected shape on right click [#4034](https://github.com/tldraw/tldraw/pull/4034) ([@ds300](https://github.com/ds300))
  - Fix fog of war [#4031](https://github.com/tldraw/tldraw/pull/4031) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `tldraw`
  - Fix snapshots prop [#4233](https://github.com/tldraw/tldraw/pull/4233) ([@SomeHats](https://github.com/SomeHats))
  - Show checked theme in color scheme menu [#4184](https://github.com/tldraw/tldraw/pull/4184) ([@steveruizok](https://github.com/steveruizok))
  - Editor.run, locked shapes improvements [#4042](https://github.com/tldraw/tldraw/pull/4042) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
  - Fix paste at point [#4104](https://github.com/tldraw/tldraw/pull/4104) ([@steveruizok](https://github.com/steveruizok))
  - Fix editor remounting when camera options change [#4089](https://github.com/tldraw/tldraw/pull/4089) ([@SomeHats](https://github.com/SomeHats))
  - Cleanup z-indices [#4020](https://github.com/tldraw/tldraw/pull/4020) ([@steveruizok](https://github.com/steveruizok))
  - Fix `<InFrontOfTheCanvas/>` [#4024](https://github.com/tldraw/tldraw/pull/4024) ([@steveruizok](https://github.com/steveruizok))
  - local assets: make sure hard reset also clears out new asset db [#3979](https://github.com/tldraw/tldraw/pull/3979) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/assets`, `tldraw`
  - Add offline icon back [#4127](https://github.com/tldraw/tldraw/pull/4127) ([@ds300](https://github.com/ds300))
- `@tldraw/tlschema`
  - Make arrow sequence not retroactive [#4090](https://github.com/tldraw/tldraw/pull/4090) ([@ds300](https://github.com/ds300))

#### 💄 Product Improvements

- Add make real as an option. [#4244](https://github.com/tldraw/tldraw/pull/4244) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Simplify unfurl in simple-server-example [#4236](https://github.com/tldraw/tldraw/pull/4236) ([@ds300](https://github.com/ds300))
- [bemo] No public shared rooms in examples app [#4152](https://github.com/tldraw/tldraw/pull/4152) ([@ds300](https://github.com/ds300))
- Share menu improvements [#4079](https://github.com/tldraw/tldraw/pull/4079) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Add fog of war example [#4025](https://github.com/tldraw/tldraw/pull/4025) ([@steveruizok](https://github.com/steveruizok))
- csp: add content security policy for dotcom [#3952](https://github.com/tldraw/tldraw/pull/3952) ([@mimecuvalo](https://github.com/mimecuvalo))
- Better docs search [#4015](https://github.com/tldraw/tldraw/pull/4015) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/editor`
  - Load watermark, and fall back to local if it fails or takes too long [#4254](https://github.com/tldraw/tldraw/pull/4254) ([@SomeHats](https://github.com/SomeHats))
  - Couple of force flag test additions [#4224](https://github.com/tldraw/tldraw/pull/4224) ([@AlbertBrand](https://github.com/AlbertBrand))
  - Support animating opacity. [#4242](https://github.com/tldraw/tldraw/pull/4242) ([@steveruizok](https://github.com/steveruizok))
  - Disable outputs for tests. [#4201](https://github.com/tldraw/tldraw/pull/4201) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Unify menus. Disable erroring. [#4143](https://github.com/tldraw/tldraw/pull/4143) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - pages: tweak page menu width, fix #1231 [#4246](https://github.com/tldraw/tldraw/pull/4246) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Export default menu panel. [#4193](https://github.com/tldraw/tldraw/pull/4193) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Improve page event tracking. [#4202](https://github.com/tldraw/tldraw/pull/4202) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Remove duplicate code [#4128](https://github.com/tldraw/tldraw/pull/4128) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Add a toast for file upload failures. [#4114](https://github.com/tldraw/tldraw/pull/4114) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Add a toast for missing clipboard permissions. [#4117](https://github.com/tldraw/tldraw/pull/4117) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Improve filled draw shaped in dynamic size mode [#3974](https://github.com/tldraw/tldraw/pull/3974) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - bookmarks: account for relative urls more robustly [#4022](https://github.com/tldraw/tldraw/pull/4022) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - Allow custom tools to decide whether they can be lockable or not. [#4208](https://github.com/tldraw/tldraw/pull/4208) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Relax the params [#4190](https://github.com/tldraw/tldraw/pull/4190) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Add component for `ShapeIndicators` [#4083](https://github.com/tldraw/tldraw/pull/4083) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`
  - serve icons via a single merged .svg file [#4150](https://github.com/tldraw/tldraw/pull/4150) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/sync`
  - [bemo] allow special chars in roomId [#4153](https://github.com/tldraw/tldraw/pull/4153) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state`, `tldraw`, `@tldraw/tlschema`
  - [3/5] Automatically enable multiplayer UI when using demo sync [#4119](https://github.com/tldraw/tldraw/pull/4119) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Flip images [#4113](https://github.com/tldraw/tldraw/pull/4113) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/validate`
  - Unfurl bookmarks in worker [#4039](https://github.com/tldraw/tldraw/pull/4039) ([@ds300](https://github.com/ds300))

#### 🎉 New Features

- Layout constraints example [#3996](https://github.com/tldraw/tldraw/pull/3996) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Interpolated line points [#4188](https://github.com/tldraw/tldraw/pull/4188) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - Interpolate arrow props [#4213](https://github.com/tldraw/tldraw/pull/4213) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/editor`
  - `ShapeUtil.getInterpolatedProps` [#4162](https://github.com/tldraw/tldraw/pull/4162) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/sync-core`
  - [bemo] add analytics to bemo worker [#4146](https://github.com/tldraw/tldraw/pull/4146) ([@ds300](https://github.com/ds300))
- `@tldraw/sync-core`, `@tldraw/sync`
  - [bemo] allow custom shapes [#4144](https://github.com/tldraw/tldraw/pull/4144) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`
  - sdk: wires up tldraw to have licensing mechanisms [#4021](https://github.com/tldraw/tldraw/pull/4021) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Add "paste at cursor" option, which toggles how `cmd + v` and `cmd + shift + v` work [#4088](https://github.com/tldraw/tldraw/pull/4088) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/sync`, `tldraw`
  - put sync stuff in bemo worker [#4060](https://github.com/tldraw/tldraw/pull/4060) ([@ds300](https://github.com/ds300))
- `@tldraw/tlschema`
  - Add `setDefaultValue` to `StyleProp` [#4044](https://github.com/tldraw/tldraw/pull/4044) ([@steveruizok](https://github.com/steveruizok))

#### 🛠️ API Changes

- `@tldraw/sync-core`, `@tldraw/sync`
  - Rename APIs for new sync demo [#4248](https://github.com/tldraw/tldraw/pull/4248) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/sync-core`, `@tldraw/sync`, `@tldraw/tlschema`
  - Finesse sync api [#4212](https://github.com/tldraw/tldraw/pull/4212) ([@ds300](https://github.com/ds300))
- `@tldraw/sync`, `tldraw`, `@tldraw/tlschema`
  - Make asset.fileSize optional [#4206](https://github.com/tldraw/tldraw/pull/4206) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Explicitly type shape props and defaults [#4191](https://github.com/tldraw/tldraw/pull/4191) ([@SomeHats](https://github.com/SomeHats))
  - [2/4] Rename sync hooks, add bookmarks to demo [#4094](https://github.com/tldraw/tldraw/pull/4094) ([@SomeHats](https://github.com/SomeHats))
  - [1/4] Blob storage in TLStore [#4068](https://github.com/tldraw/tldraw/pull/4068) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/state-react`, `@tldraw/state`
  - Split @tldraw/state into @tldraw/state and @tldraw/state-react [#4170](https://github.com/tldraw/tldraw/pull/4170) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state`
  - [sdk] make EffectScheduler and useStateTracking public [#4155](https://github.com/tldraw/tldraw/pull/4155) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- [bemo bae] Spike on tlsync public API improvement [#4002](https://github.com/tldraw/tldraw/pull/4002) ([@ds300](https://github.com/ds300))
- dx: PR labels re-revamp [#4016](https://github.com/tldraw/tldraw/pull/4016) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/utils`
  - Initial bemo worker setup [#4017](https://github.com/tldraw/tldraw/pull/4017) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300))

#### Authors: 9

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- Albert Brand ([@AlbertBrand](https://github.com/AlbertBrand))
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Guillaume Grossetie ([@ggrossetie](https://github.com/ggrossetie))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.3.0 (Tue Jun 25 2024)

### Release Notes

#### editing: don't allow editing locked shapes when edit→edit mode. ([#4007](https://github.com/tldraw/tldraw/pull/4007))

- Editing: don't allow editing locked shapes when edit→edit mode.

#### clipboard: fix copy/paste bad typo, ugh ([#4008](https://github.com/tldraw/tldraw/pull/4008))

- Clipboard: fix copy/paste for older versions of Firefox

#### clipboard: fix copy/paste on Firefox ([#4003](https://github.com/tldraw/tldraw/pull/4003))

- Clipboard: fix copy/paste in Firefox 127+

#### Fix multiple editor instances issue ([#4001](https://github.com/tldraw/tldraw/pull/4001))

- Fix a bug causing text shape measurement to work incorrectly when using react strict mode

#### fix: typo on "CardShapeUtil" example name ([#3998](https://github.com/tldraw/tldraw/pull/3998))

- Fix typo on "CardShapeUtil" name in the custom shape example documentation.

#### Update license in readme of the store package ([#3990](https://github.com/tldraw/tldraw/pull/3990))

- Fix the license in the readme file for the store package.

#### Add a new environment for publishing ([#3981](https://github.com/tldraw/tldraw/pull/3981))

- Introduce a new CI environment and use it for publishing vs code extension.

#### Fix vs code publishing ([#3976](https://github.com/tldraw/tldraw/pull/3976))

- Fix VS Code publishing.

#### Fix border color for following user ([#3975](https://github.com/tldraw/tldraw/pull/3975))

- Add a brief release note for your PR here.

#### Fix edge scrolling at odd browser zoom levels ([#3973](https://github.com/tldraw/tldraw/pull/3973))

- Add a brief release note for your PR here.

#### images: make isAnimated check on shared rooms work better ([#3967](https://github.com/tldraw/tldraw/pull/3967))

- Images: fix isAnimated checks when adding an image to a shared room.

#### Add fill fill style. ([#3966](https://github.com/tldraw/tldraw/pull/3966))

- Secretly adds a fill-fill style (Alt-F)

#### Add tags to examples frontmatter ([#3929](https://github.com/tldraw/tldraw/pull/3929))

- Improve filtering of examples

#### Fix solid style draw shape. ([#3963](https://github.com/tldraw/tldraw/pull/3963))

- Fixes the appearance of solid-style heart shapes.

#### Fix asset positions ([#3965](https://github.com/tldraw/tldraw/pull/3965))

- Fixes the position of multiple assets when pasted / dropped onto the canvas.

#### Fix draw shape indicators for pen-drawn solid shapes ([#3962](https://github.com/tldraw/tldraw/pull/3962))

- Fixes a bug with the indicator for stylus-drawn draw shapes.

#### assets: fix copy/paste with missing src ([#3959](https://github.com/tldraw/tldraw/pull/3959))

- Assets: fix copy/paste for new asset resolver mechanic.

#### [Experiment] Allow users to use system's appearance (dark / light) mode ([#3703](https://github.com/tldraw/tldraw/pull/3703))

- Add a brief release note for your PR here.

#### Improve edge scrolling ([#3950](https://github.com/tldraw/tldraw/pull/3950))

- Add a delay and easing to edge scrolling.

#### Set up automatic VS Code publishing ([#3905](https://github.com/tldraw/tldraw/pull/3905))

- Automate publishing of the VS Code extension.

#### Move from unpkg to our own cdn. ([#3923](https://github.com/tldraw/tldraw/pull/3923))

- Start using our own cdn instead of unpkg.

#### bookmark: css tweaks ([#3955](https://github.com/tldraw/tldraw/pull/3955))

- Bookmarks: padding tweaks

#### Dynamic size mode + fill fill ([#3835](https://github.com/tldraw/tldraw/pull/3835))

- Adds a dynamic size user preferences.
- Removes double click to reset scale on text shapes.
- Removes double click to reset autosize on text shapes.

#### assets: preload fonts ([#3927](https://github.com/tldraw/tldraw/pull/3927))

- Perf: improve font loading timing on dotcom.

#### [tiny] getSnapshot and loadSnapshot on Editor class ([#3912](https://github.com/tldraw/tldraw/pull/3912))

- Add a brief release note for your PR here.

#### Make ArrowBindingUtil public ([#3913](https://github.com/tldraw/tldraw/pull/3913))

- Add a brief release note for your PR here.

#### Flatten shapes to image(s) ([#3933](https://github.com/tldraw/tldraw/pull/3933))

- Add Flatten, a new menu item to flatten shapes into images

#### Update with api key with access to all buckets ([#3944](https://github.com/tldraw/tldraw/pull/3944))

- Retrigger canary packaging.

#### Retrying with Mime's keys ([#3943](https://github.com/tldraw/tldraw/pull/3943))

- Retrigger canary package build to publish a new package and upload assets to R2.

#### Empty PR to trigger canary publish ([#3942](https://github.com/tldraw/tldraw/pull/3942))

- Retrigger canary package build to publish a new package and upload assets to R2.

#### Fix uploading static assets to r2 ([#3941](https://github.com/tldraw/tldraw/pull/3941))

- Fix an issue with uploading the static assets.

#### Uploading the static assets to R2 bucket ([#3921](https://github.com/tldraw/tldraw/pull/3921))

- Upload our static assets (fonts, icons, embed-icons, translations) to a R2 bucket so that we can move away from using unpkg and start using our own cdn.

#### assets: store in indexedDB, not as base64 ([#3836](https://github.com/tldraw/tldraw/pull/3836))

- Assets: store as reference to blob in indexedDB instead of storing directly as base64 in the snapshot.

#### images: avoid double request for animated images ([#3924](https://github.com/tldraw/tldraw/pull/3924))

- Images: avoid double request for animated images.

#### Fix document name editable in readonly mode ([#3911](https://github.com/tldraw/tldraw/pull/3911))

- Remove ability to rename document while in readonly mode

#### assets: make option to transform urls dynamically / LOD ([#3827](https://github.com/tldraw/tldraw/pull/3827))

- Assets: make option to transform urls dynamically to provide different sized images on demand.

#### VS Code release 2.0.36 ([#3922](https://github.com/tldraw/tldraw/pull/3922))

- VS Code 2.0.36 release.

---

#### 📚 SDK Changes

- images: make isAnimated check on shared rooms work better [#3967](https://github.com/tldraw/tldraw/pull/3967) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - assets: mark assetOptions as internal [#4014](https://github.com/tldraw/tldraw/pull/4014) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix border color for following user [#3975](https://github.com/tldraw/tldraw/pull/3975) ([@ds300](https://github.com/ds300))
  - Fix edge scrolling at odd browser zoom levels [#3973](https://github.com/tldraw/tldraw/pull/3973) ([@ds300](https://github.com/ds300))
  - [tiny] getSnapshot and loadSnapshot on Editor class [#3912](https://github.com/tldraw/tldraw/pull/3912) ([@ds300](https://github.com/ds300))
- `tldraw`
  - editing: don't allow editing locked shapes when edit→edit mode. [#4007](https://github.com/tldraw/tldraw/pull/4007) ([@mimecuvalo](https://github.com/mimecuvalo))
  - clipboard: fix copy/paste bad typo, ugh [#4008](https://github.com/tldraw/tldraw/pull/4008) ([@mimecuvalo](https://github.com/mimecuvalo))
  - clipboard: fix copy/paste on Firefox [#4003](https://github.com/tldraw/tldraw/pull/4003) ([@mimecuvalo](https://github.com/mimecuvalo))
  - theme: rename color scheme to theme [#3991](https://github.com/tldraw/tldraw/pull/3991) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix scale issue with new draw lines [#3971](https://github.com/tldraw/tldraw/pull/3971) ([@steveruizok](https://github.com/steveruizok))
  - lod: dont resize images that are culled [#3970](https://github.com/tldraw/tldraw/pull/3970) ([@mimecuvalo](https://github.com/mimecuvalo))
  - flattening: use correct id for asset [#3968](https://github.com/tldraw/tldraw/pull/3968) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Add fill fill style. [#3966](https://github.com/tldraw/tldraw/pull/3966) ([@steveruizok](https://github.com/steveruizok))
  - Fix solid style draw shape. [#3963](https://github.com/tldraw/tldraw/pull/3963) ([@steveruizok](https://github.com/steveruizok))
  - Fix asset positions [#3965](https://github.com/tldraw/tldraw/pull/3965) ([@steveruizok](https://github.com/steveruizok))
  - lod: fix up missing timeout from bad merge [#3964](https://github.com/tldraw/tldraw/pull/3964) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix draw shape indicators for pen-drawn solid shapes [#3962](https://github.com/tldraw/tldraw/pull/3962) ([@steveruizok](https://github.com/steveruizok))
  - assets: fix copy/paste with missing src [#3959](https://github.com/tldraw/tldraw/pull/3959) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Move from unpkg to our own cdn. [#3923](https://github.com/tldraw/tldraw/pull/3923) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - assets: fix up videos with indexedDB [#3954](https://github.com/tldraw/tldraw/pull/3954) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Make ArrowBindingUtil public [#3913](https://github.com/tldraw/tldraw/pull/3913) ([@ds300](https://github.com/ds300))
  - images: avoid double request for animated images [#3924](https://github.com/tldraw/tldraw/pull/3924) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - better auto-generated docs for Tldraw and TldrawEditor [#4012](https://github.com/tldraw/tldraw/pull/4012) ([@SomeHats](https://github.com/SomeHats))
  - Fix multiple editor instances issue [#4001](https://github.com/tldraw/tldraw/pull/4001) ([@SomeHats](https://github.com/SomeHats))
  - [Experiment] Allow users to use system's appearance (dark / light) mode [#3703](https://github.com/tldraw/tldraw/pull/3703) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Improve edge scrolling [#3950](https://github.com/tldraw/tldraw/pull/3950) ([@steveruizok](https://github.com/steveruizok))
  - bookmark: css tweaks [#3955](https://github.com/tldraw/tldraw/pull/3955) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Flatten shapes to image(s) [#3933](https://github.com/tldraw/tldraw/pull/3933) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Dynamic size mode + fill fill [#3835](https://github.com/tldraw/tldraw/pull/3835) ([@steveruizok](https://github.com/steveruizok) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `tldraw`, `@tldraw/validate`
  - assets: store in indexedDB, not as base64 [#3836](https://github.com/tldraw/tldraw/pull/3836) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/state`, `tldraw`
  - image: follow-up fixes for LOD [#3934](https://github.com/tldraw/tldraw/pull/3934) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/state`, `tldraw`, `@tldraw/tlschema`
  - assets: make option to transform urls dynamically / LOD [#3827](https://github.com/tldraw/tldraw/pull/3827) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`, `@tldraw/utils`
  - security: enforce use of our fetch function and its default referrerpolicy [#3884](https://github.com/tldraw/tldraw/pull/3884) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🖥️ tldraw.com Changes

- assets: add crossorigin tag for preloaded fonts [#3953](https://github.com/tldraw/tldraw/pull/3953) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix document name editable in readonly mode [#3911](https://github.com/tldraw/tldraw/pull/3911) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/utils`
  - lod: dont transform SVGs [#3972](https://github.com/tldraw/tldraw/pull/3972) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`
  - assets: preload fonts [#3927](https://github.com/tldraw/tldraw/pull/3927) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))

#### 📖 Documentation changes

- fix: typo on "CardShapeUtil" example name [#3998](https://github.com/tldraw/tldraw/pull/3998) ([@bholmesdev](https://github.com/bholmesdev))
- Add tags to examples frontmatter [#3929](https://github.com/tldraw/tldraw/pull/3929) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Generated docs cleanup [#3935](https://github.com/tldraw/tldraw/pull/3935) ([@SomeHats](https://github.com/SomeHats))
- Inline documentation links in type excerpts [#3931](https://github.com/tldraw/tldraw/pull/3931) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/store`
  - Update license in readme of the store package [#3990](https://github.com/tldraw/tldraw/pull/3990) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - Document inherited members in reference [#3956](https://github.com/tldraw/tldraw/pull/3956) ([@SomeHats](https://github.com/SomeHats))
  - Better generated docs for react components [#3930](https://github.com/tldraw/tldraw/pull/3930) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- Update with api key with access to all buckets [#3944](https://github.com/tldraw/tldraw/pull/3944) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Retrying with Mime's keys [#3943](https://github.com/tldraw/tldraw/pull/3943) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Empty PR to trigger canary publish [#3942](https://github.com/tldraw/tldraw/pull/3942) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix uploading static assets to r2 [#3941](https://github.com/tldraw/tldraw/pull/3941) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Uploading the static assets to R2 bucket [#3921](https://github.com/tldraw/tldraw/pull/3921) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🧹 Chores

- VS Code release 2.0.36 [#3922](https://github.com/tldraw/tldraw/pull/3922) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🧪 Tests

- Add a new environment for publishing [#3981](https://github.com/tldraw/tldraw/pull/3981) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🛠️ Tools

- Fix vs code publishing [#3976](https://github.com/tldraw/tldraw/pull/3976) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Set up automatic VS Code publishing [#3905](https://github.com/tldraw/tldraw/pull/3905) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🔩 Dependency Updates

- build(deps): bump ws from 8.16.0 to 8.17.1 in the npm_and_yarn group across 1 directory [#3984](https://github.com/tldraw/tldraw/pull/3984) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump the npm_and_yarn group across 3 directories with 4 updates [#3920](https://github.com/tldraw/tldraw/pull/3920) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### Authors: 9

- [@dependabot[bot]](https://github.com/dependabot[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Ben Holmes ([@bholmesdev](https://github.com/bholmesdev))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.2.0 (Tue Jun 11 2024)

### Release Notes

#### Fix 'insert media' undo operation ([#3910](https://github.com/tldraw/tldraw/pull/3910))

- Add a brief release note for your PR here.

#### Cropping undo/redo UX ([#3891](https://github.com/tldraw/tldraw/pull/3891))

- Add a brief release note for your PR here.

#### Bindings tests ([#3800](https://github.com/tldraw/tldraw/pull/3800))

- Add a brief release note for your PR here.

#### Fix Content-Security-Policy browser warnings ([#3906](https://github.com/tldraw/tldraw/pull/3906))

- Fix Content-Security-Policy warnings

#### bookmark: fix up double request and rework extractor ([#3856](https://github.com/tldraw/tldraw/pull/3856))

- Bookmarks: fix up double request and rework extractor code.

#### Open share menu when navigating from create new shared project button ([#3898](https://github.com/tldraw/tldraw/pull/3898))

- Open share menu when navigating from the create new shared project button.

#### Add option for max points per draw shape ([#3900](https://github.com/tldraw/tldraw/pull/3900))

- SDK: Add option for controlling max length of draw shapes

#### Bindings onBeforeShapeIsolate? ([#3871](https://github.com/tldraw/tldraw/pull/3871))

- Add a brief release note for your PR here.

#### Add option to navigate to new project from file menu ([#3876](https://github.com/tldraw/tldraw/pull/3876))

- Add a brief release note for your PR here.

#### [DX] sensible defaults for createTLStore ([#3886](https://github.com/tldraw/tldraw/pull/3886))

- Add a brief release note for your PR here.

#### Editor.blur method ([#3875](https://github.com/tldraw/tldraw/pull/3875))

- Add a brief release note for your PR here.

#### security: don't send referrer paths for images and bookmarks ([#3881](https://github.com/tldraw/tldraw/pull/3881))

- Security: fix referrer being sent for bookmarks and images.

#### Prevent stale shape data in render ([#3882](https://github.com/tldraw/tldraw/pull/3882))

- Add a brief release note for your PR here.

#### Fix pressure ([#3877](https://github.com/tldraw/tldraw/pull/3877))

- Fixes pen pressure.

#### Fix drag distance ([#3873](https://github.com/tldraw/tldraw/pull/3873))

- Fixed a bug where the minimum distance for a drag was wrong when zoomed in or out.

#### editor: register timeouts/intervals/rafs for disposal ([#3852](https://github.com/tldraw/tldraw/pull/3852))

- Editor: add registry of timeouts/intervals/rafs

#### Taha/more constraints tests ([#3863](https://github.com/tldraw/tldraw/pull/3863))

- Adds more tests for the camera constraints API

#### Snapshots pit of success ([#3811](https://github.com/tldraw/tldraw/pull/3811))

- Add a brief release note for your PR here.

#### [bugfix] Preserve redo stack when selection changes ([#3862](https://github.com/tldraw/tldraw/pull/3862))

- Add a brief release note for your PR here.

#### Add `select` option to `Editor.groupShapes` and `Editor.ungroupShapes` ([#3690](https://github.com/tldraw/tldraw/pull/3690))

- Add a brief release note for your PR here.

#### share: make share/fork/copy actions clearer ([#3846](https://github.com/tldraw/tldraw/pull/3846))

- Share menu: make sharing/fork/copy actions clearer

#### cloudflare: dont cache no-cache headers ([#3849](https://github.com/tldraw/tldraw/pull/3849))

- Cloudflare: don't cache no-cache headers.

#### text labels: address some rendering inconsistencies with the content vs. textarea ([#3830](https://github.com/tldraw/tldraw/pull/3830))

- Text labels: fix some inconsistencies with rendering.

#### Camera Constraints Tests ([#3844](https://github.com/tldraw/tldraw/pull/3844))

- Adds tests for the camera constraints api

#### Move constants to options prop ([#3799](https://github.com/tldraw/tldraw/pull/3799))

You can now override many options which were previously hard-coded constants. Pass an `options` prop into the tldraw component to change the maximum number of pages, grid steps, or other previously hard-coded values. See `TldrawOptions` for more

#### toolbar: disable items that dont work when not in select mode ([#3819](https://github.com/tldraw/tldraw/pull/3819))

- Toolbar: disable menu items that don't work when not in select mode.

#### Fix cropped image export ([#3837](https://github.com/tldraw/tldraw/pull/3837))

- Fixed cropped images not exporting properly

#### [fix] setCamera animates to constrained viewport ([#3828](https://github.com/tldraw/tldraw/pull/3828))

- Add a brief release note for your PR here.

#### Add heart geo shape ([#3787](https://github.com/tldraw/tldraw/pull/3787))

- Adds a heart shape to the geo shape set.

#### rework canBind callback ([#3797](https://github.com/tldraw/tldraw/pull/3797))

#### Breaking changes
The `canBind` flag now accepts an options object instead of just the shape in question. If you're relying on its arguments, you need to change from `canBind(shape) {}` to `canBind({shape}) {}`.

#### Add unit tests for the camera ([#3814](https://github.com/tldraw/tldraw/pull/3814))

- Adds unit tests for the camera

#### fix coarse pointer detection ([#3795](https://github.com/tldraw/tldraw/pull/3795))

- Fix a bug where coarse-pointer mode would get incorrectly detected on some touch devices

#### Update validation.ts ([#3324](https://github.com/tldraw/tldraw/pull/3324))

- Update example for Union type

---

I believe this type was changed and `literal` is what it should be now.

#### Tighten up zoom to fit padding ([#3798](https://github.com/tldraw/tldraw/pull/3798))

- Reduce padding when zooming to fit.

#### toolbar: rework overflow css logic ([#3779](https://github.com/tldraw/tldraw/pull/3779))

- Toolbar: cleanup overflow css rules.

#### Fix spacebar/mmb panning bug. ([#3791](https://github.com/tldraw/tldraw/pull/3791))

- Fix bug with panning

#### [bugfix] Cleanup input state after middle-click-to-pan ([#3792](https://github.com/tldraw/tldraw/pull/3792))

- Add a brief release note for your PR here.

#### Move InFrontOfTheCanvas ([#3782](https://github.com/tldraw/tldraw/pull/3782))

- Add a brief release note for your PR here.

#### google meet: add hardware whiteboard integration ([#3765](https://github.com/tldraw/tldraw/pull/3765))

- Google Meet: add hardware whiteboard integration

#### fix flipping for arrows ([#3780](https://github.com/tldraw/tldraw/pull/3780))

- Add a brief release note for your PR here.

#### [bugfix?] End interactions before switching page ([#3771](https://github.com/tldraw/tldraw/pull/3771))

- Add a brief release note for your PR here.

#### add missing spline icons ([#3778](https://github.com/tldraw/tldraw/pull/3778))

- Add a brief release note for your PR here.

#### delete old todo comment ([#3777](https://github.com/tldraw/tldraw/pull/3777))

- Add a brief release note for your PR here.

#### Prevent pressing escape when editing document name to bubble up to the editor ([#3725](https://github.com/tldraw/tldraw/pull/3725))

- Prevent escaping out of editing the document name to switch the active tool to select tool.

#### Prevent wobble during viewport following ([#3695](https://github.com/tldraw/tldraw/pull/3695))

- Fixes a bug that caused the cursor & shapes to wiggle around when following someone else's viewport

#### E2E camera tests ([#3747](https://github.com/tldraw/tldraw/pull/3747))

- Adds E2E tests for the camera

#### Bump max shapes to 4000 ([#3716](https://github.com/tldraw/tldraw/pull/3716))

- Increase maximum number of shapes per page from 2000 to 4000.

#### export DefaultNavigationPanel ([#3772](https://github.com/tldraw/tldraw/pull/3772))

- Add a brief release note for your PR here.

#### Allow DefaultErrorFallback to be used independently ([#3769](https://github.com/tldraw/tldraw/pull/3769))

- Add a brief release note for your PR here.

#### focus: rework and untangle existing focus management logic in the sdk ([#3718](https://github.com/tldraw/tldraw/pull/3718))

- Focus: rework and untangle existing focus management logic in the SDK

#### [bindings] beforeUnbind/afterUnbind to replace beforeDelete/afterDelete ([#3761](https://github.com/tldraw/tldraw/pull/3761))

- Add a brief release note for your PR here.

#### No defaults for contexts ([#3750](https://github.com/tldraw/tldraw/pull/3750))

`useEditor` and other context-based hooks will now throw an error when used out-of-context, instead of returning a fake value.

#### Store-level "operation end" event ([#3748](https://github.com/tldraw/tldraw/pull/3748))

#### Breaking changes
`editor.registerBatchCompleteHandler` has been replaced with `editor.registerOperationCompleteHandler`

#### Fix readonly fetching happening too often. ([#3732](https://github.com/tldraw/tldraw/pull/3732))

- Fix an issue where readonly slug was being fetched every time the url changed (panning, zooming,...).

#### assets: rework mime-type detection to be consistent/centralized; add support for webp/webm, apng, avif ([#3730](https://github.com/tldraw/tldraw/pull/3730))

- Images: unify list of acceptable types and expand to include webp, webm, apng, avif

#### Fix imports in Astro ([#3742](https://github.com/tldraw/tldraw/pull/3742))

- Fix bug effecting imports in Astro.

#### Move arrow helpers from editor to tldraw ([#3721](https://github.com/tldraw/tldraw/pull/3721))

#### Breaking changes
- `editor.getArrowInfo(shape)` has been replaced with `getArrowInfo(editor, shape)`
- `editor.getArrowsBoundTo(shape)` has been removed. Instead, use `editor.getBindingsToShape(shape, 'arrow')` and follow the `fromId` of each binding to the corresponding arrow shape
- These types have moved from `@tldraw/editor` to `tldraw`:
    - `TLArcInfo`
    - `TLArrowInfo`
    - `TLArrowPoint`
- `WeakMapCache` has been removed

#### fix link ([#3726](https://github.com/tldraw/tldraw/pull/3726))

- Add a brief release note for your PR here.

Just a small link fix for the docs.

#### Bindings ([#3326](https://github.com/tldraw/tldraw/pull/3326))

#### Breaking changes
- The `start` and `end` properties on `TLArrowShape` no longer have `type: point | binding`. Instead, they're always a point, which may be out of date if a binding exists. To check for & retrieve arrow bindings, use `getArrowBindings(editor, shape)` instead.
- `getArrowTerminalsInArrowSpace` must be passed a `TLArrowBindings` as a third argument: `getArrowTerminalsInArrowSpace(editor, shape, getArrowBindings(editor, shape))`
- The following types have been renamed:
    - `ShapeProps` -> `RecordProps`
    - `ShapePropsType` -> `RecordPropsType`
    - `TLShapePropsMigrations` -> `TLPropsMigrations`
    - `SchemaShapeInfo` -> `SchemaPropsInfo`

#### Move storing of snapshots to R2 ([#3693](https://github.com/tldraw/tldraw/pull/3693))

- Move storing of snapshots to cloudflare R2.

#### Add asset pruning when importing files ([#3689](https://github.com/tldraw/tldraw/pull/3689))

- Prunes unused assets when loading a tldraw document.

#### Fix background color for patterned shapes. ([#3708](https://github.com/tldraw/tldraw/pull/3708))

- Fixes an issue with copy pasting shapes as svg and png not correctly working for patterned shapes.

#### Camera options ([#3282](https://github.com/tldraw/tldraw/pull/3282))

- SDK: Adds camera options.

#### Prevent duplicate from creating any shapes if we reach max allowed shapes ([#3692](https://github.com/tldraw/tldraw/pull/3692))

- Prevent duplicating shapes if we would go over the maximum shape limit. It's now an all or nothing operation, where as before some shapes would get created.

#### textfields: fix RTL layout for SVG exports ([#3680](https://github.com/tldraw/tldraw/pull/3680))

- [Add a brief release note for your PR here.](textfields: fix RTL layout for SVG exports)

#### Prevent unnecessary fetching of readonly slugs ([#3663](https://github.com/tldraw/tldraw/pull/3663))

- Prevent unnecessary fetching of readonly slugs.

#### delete stray error screen css import ([#3683](https://github.com/tldraw/tldraw/pull/3683))

- Add a brief release note for your PR here.

#### Fix viewport following ([#3681](https://github.com/tldraw/tldraw/pull/3681))

- Fixes an issue where viewport following was not working

#### Fix className.includes bug ([#3672](https://github.com/tldraw/tldraw/pull/3672))

- Fixes a rare bug effecting text shapes on mobile.

#### Fix link in collaboration documentation ([#3662](https://github.com/tldraw/tldraw/pull/3662))

- Add a brief release note for your PR here.

#### [signia] perf thing again ([#3645](https://github.com/tldraw/tldraw/pull/3645))

- Add a brief release note for your PR here.

#### VS Code 2.0.32 ([#3664](https://github.com/tldraw/tldraw/pull/3664))

- VS Code release.

#### Fix textbox direction when it contains both RTL and LTR languages ([#3188](https://github.com/tldraw/tldraw/pull/3188))

Fix textbox direction when it contains both RTL and LTR languages

#### embed: prevent nested tldraw ([#3659](https://github.com/tldraw/tldraw/pull/3659))

- Embeds: Fix infinite nesting of tldraw rooms.

#### fix android long press changing cursor to non-coarse ([#3656](https://github.com/tldraw/tldraw/pull/3656))

- Add a brief release note for your PR here.

#### [bugfix] don't crash if a bound shape doesn't exist ([#3653](https://github.com/tldraw/tldraw/pull/3653))

- fixes an edge case in multiplayer rooms where the room can crash if an arrow's bound shape is deleted by a peer

#### embed: allow embeds like YouTube to link back to its site ([#3609](https://github.com/tldraw/tldraw/pull/3609))

- Embeds: fix being able to click on links that go back to the embed's site (e.g. YouTube)

#### Improve pressure-detection logic in drawing ([#3639](https://github.com/tldraw/tldraw/pull/3639))

- Improves handling of mouse-type devices that support pressure, e.g. wacom tablets. They now use the same freehand options as true pen-type inputs.

#### copy/paste: fix pasting not working from Edit menu ([#3623](https://github.com/tldraw/tldraw/pull/3623))

- Clipboard: fix pasting from the Edit menu.

#### textfields: for unfilled geo shapes fix edit->edit ([#3577](https://github.com/tldraw/tldraw/pull/3577))

- Text labels: fix edit→edit not working as expected when unfilled geo shapes are on 'top' of other shapes.

#### Allow embedding tldraw in iframes ([#3640](https://github.com/tldraw/tldraw/pull/3640))

- Allow embedding tldraw inside iframes again.

#### Separate text-align property for shapes ([#3627](https://github.com/tldraw/tldraw/pull/3627))

- Separates the text align property for text shapes and labels.

#### Fix text resizing with alt key ([#3632](https://github.com/tldraw/tldraw/pull/3632))

- Fixed a bug with resizing text shapes from the left and right while holding alt.

#### Don't hover locked shapes ([#3575](https://github.com/tldraw/tldraw/pull/3575))

- Fixed a bug with locked shapes being hoverable.

#### Add desmos graph embed type ([#3608](https://github.com/tldraw/tldraw/pull/3608))

- (feature) add desmos embed

#### Make coarse pointer check dynamic ([#3572](https://github.com/tldraw/tldraw/pull/3572))

- Add a brief release note for your PR here.

#### examples: add filter input ([#3625](https://github.com/tldraw/tldraw/pull/3625))

- Examples: add a filter box.

#### stickies: make pit/pack distance the same ([#3606](https://github.com/tldraw/tldraw/pull/3606))

- Shapes: tweak default gap value to be consistent with sticky note gaps.

#### Fix an issue with the minimap ([#3617](https://github.com/tldraw/tldraw/pull/3617))

- Fixes clicking on the minimap when we clicked just slightly outside of the current viewport.

#### Fix an issue with minimap. ([#3621](https://github.com/tldraw/tldraw/pull/3621))

- Fixes an issue with the minimap bugging out after you change the window's height.

#### Bring back `/r` ([#3615](https://github.com/tldraw/tldraw/pull/3615))

- Brings back `/r` route for creating new rooms.

#### Expose migrations, validators, and versions from tlschema ([#3613](https://github.com/tldraw/tldraw/pull/3613))

Previously, we weren't exporting migrations & validators for our default shapes. This meant that it wasn't possible to make your own tlschema with both our default shapes and some of your own (e.g. for custom multiplayer). This fixes that by exposing all the migrations, validators, and versions from tlschema, plus `defaultShapeSchemas` which can be passed directly to `createTLSchema`

#### Readonly / room creation omnibus ([#3192](https://github.com/tldraw/tldraw/pull/3192))

1. This adds new functionality for readonly rooms:
- We have a new route `/ro` for newly created readonly rooms. These rooms no longer use the scrambling logic to create readonly slugs. Instead we now use KV storage from cloudflare to track the mapping for slugs -> readonly slug and readonly slug -> slug.
- The old route `/v` is preserved, so that the old room still work as they did before.
- For old rooms we will keep on generating the old readonly slugs, but for new rooms we'll start using the new logic.
2. We no longer prevent embedding of tldraw inside iframes. 
3. We do prevent generating new rooms from inside the iframes  though. `/r`, `/new`, `/r/non-existing-id` should not allow creation of new rooms inside iframes. Only `/new` still works when not inside iframes.
4. Forking a project from inside an iframe now opens it on tldraw.com
5. Slight copy change on the sharing menu. We no longer have a toggle between readonly and non-readonly links.
6. `editor` and `app` are no longer exposed on the window object for readonly rooms. Prevents users from using the `updateInstanceState` to escape readonly rooms.

#### fix migration exports ([#3586](https://github.com/tldraw/tldraw/pull/3586))

- Expose `createShapePropsMigrationIds`, `defaultEditorAssetUrls`, `PORTRAIT_BREAKPOINT`, `useDefaultColorTheme`, & `getPerfectDashProps`

---

#### 🐛 Bug Fix

- build: disable flaky edit->edit focus test for now [#3803](https://github.com/tldraw/tldraw/pull/3803) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - Lokalise: Translations update [#3649](https://github.com/tldraw/tldraw/pull/3649) ([@TodePond](https://github.com/TodePond))

#### 🏎 Performance

- `@tldraw/editor`, `tldraw`
  - Incremental bindings index [#3685](https://github.com/tldraw/tldraw/pull/3685) ([@ds300](https://github.com/ds300))

#### 📚 SDK Changes

- touchscreen: allow meet.google.com origin [#3805](https://github.com/tldraw/tldraw/pull/3805) ([@mimecuvalo](https://github.com/mimecuvalo))
- touchscreen: just create a new room [#3802](https://github.com/tldraw/tldraw/pull/3802) ([@mimecuvalo](https://github.com/mimecuvalo))
- touchscreen: wrong url argh [#3790](https://github.com/tldraw/tldraw/pull/3790) ([@mimecuvalo](https://github.com/mimecuvalo))
- touchscreen: just add a fallback, figure out env later [#3789](https://github.com/tldraw/tldraw/pull/3789) ([@mimecuvalo](https://github.com/mimecuvalo))
- touchscreen: fix env var name [#3788](https://github.com/tldraw/tldraw/pull/3788) ([@mimecuvalo](https://github.com/mimecuvalo))
- touchscreen: whoops, fix up script tag [#3786](https://github.com/tldraw/tldraw/pull/3786) ([@mimecuvalo](https://github.com/mimecuvalo))
- make route prefixes have a single place where they are defined [#3624](https://github.com/tldraw/tldraw/pull/3624) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/store`
  - Add return info to StoreSideEffects methods [#3918](https://github.com/tldraw/tldraw/pull/3918) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Fix 'insert media' undo operation [#3910](https://github.com/tldraw/tldraw/pull/3910) ([@ds300](https://github.com/ds300))
  - Fix pressure [#3877](https://github.com/tldraw/tldraw/pull/3877) ([@steveruizok](https://github.com/steveruizok))
  - share: make share/fork/copy actions clearer [#3846](https://github.com/tldraw/tldraw/pull/3846) ([@mimecuvalo](https://github.com/mimecuvalo))
  - toolbar: disable items that dont work when not in select mode [#3819](https://github.com/tldraw/tldraw/pull/3819) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix cropped image export [#3837](https://github.com/tldraw/tldraw/pull/3837) ([@TodePond](https://github.com/TodePond))
  - fix excalidraw paste [#3822](https://github.com/tldraw/tldraw/pull/3822) ([@SomeHats](https://github.com/SomeHats))
  - Fix broken files [#3821](https://github.com/tldraw/tldraw/pull/3821) ([@steveruizok](https://github.com/steveruizok))
  - fix pattern fill lods [#3801](https://github.com/tldraw/tldraw/pull/3801) ([@SomeHats](https://github.com/SomeHats))
  - toolbar: rework overflow css logic [#3779](https://github.com/tldraw/tldraw/pull/3779) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - export DefaultNavigationPanel [#3772](https://github.com/tldraw/tldraw/pull/3772) ([@ds300](https://github.com/ds300))
  - Add asset pruning when importing files [#3689](https://github.com/tldraw/tldraw/pull/3689) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix background color for patterned shapes. [#3708](https://github.com/tldraw/tldraw/pull/3708) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - don't render the minimap if it fails to initialize the gl context [#3679](https://github.com/tldraw/tldraw/pull/3679) ([@ds300](https://github.com/ds300))
  - embed: prevent nested tldraw [#3659](https://github.com/tldraw/tldraw/pull/3659) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Hacky fix safari transparency [#3657](https://github.com/tldraw/tldraw/pull/3657) ([@steveruizok](https://github.com/steveruizok))
  - Fix missing icon [#3652](https://github.com/tldraw/tldraw/pull/3652) ([@steveruizok](https://github.com/steveruizok))
  - Improve pressure-detection logic in drawing [#3639](https://github.com/tldraw/tldraw/pull/3639) ([@steveruizok](https://github.com/steveruizok))
  - copy/paste: fix pasting not working from Edit menu [#3623](https://github.com/tldraw/tldraw/pull/3623) ([@mimecuvalo](https://github.com/mimecuvalo))
  - stickies: make pit/pack distance the same [#3606](https://github.com/tldraw/tldraw/pull/3606) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix an issue with minimap. [#3621](https://github.com/tldraw/tldraw/pull/3621) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`
  - Cropping undo/redo UX [#3891](https://github.com/tldraw/tldraw/pull/3891) ([@ds300](https://github.com/ds300))
  - Bindings tests [#3800](https://github.com/tldraw/tldraw/pull/3800) ([@ds300](https://github.com/ds300))
  - Add option for max points per draw shape [#3900](https://github.com/tldraw/tldraw/pull/3900) ([@steveruizok](https://github.com/steveruizok))
  - Bindings onBeforeShapeIsolate? [#3871](https://github.com/tldraw/tldraw/pull/3871) ([@ds300](https://github.com/ds300))
  - Editor.blur method [#3875](https://github.com/tldraw/tldraw/pull/3875) ([@ds300](https://github.com/ds300))
  - Fix drag distance [#3873](https://github.com/tldraw/tldraw/pull/3873) ([@steveruizok](https://github.com/steveruizok))
  - Add `select` option to `Editor.groupShapes` and `Editor.ungroupShapes` [#3690](https://github.com/tldraw/tldraw/pull/3690) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - chore: cleanup z-indices so that they're all clearly listed [#3855](https://github.com/tldraw/tldraw/pull/3855) ([@mimecuvalo](https://github.com/mimecuvalo))
  - text labels: address some rendering inconsistencies with the content vs. textarea [#3830](https://github.com/tldraw/tldraw/pull/3830) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Move constants to options prop [#3799](https://github.com/tldraw/tldraw/pull/3799) ([@SomeHats](https://github.com/SomeHats))
  - [fix] setCamera animates to constrained viewport [#3828](https://github.com/tldraw/tldraw/pull/3828) ([@ds300](https://github.com/ds300))
  - Tighten up zoom to fit padding [#3798](https://github.com/tldraw/tldraw/pull/3798) ([@steveruizok](https://github.com/steveruizok))
  - [bugfix] Cleanup input state after middle-click-to-pan [#3792](https://github.com/tldraw/tldraw/pull/3792) ([@ds300](https://github.com/ds300))
  - Move InFrontOfTheCanvas [#3782](https://github.com/tldraw/tldraw/pull/3782) ([@ds300](https://github.com/ds300))
  - fix flipping for arrows [#3780](https://github.com/tldraw/tldraw/pull/3780) ([@ds300](https://github.com/ds300))
  - [bugfix?] End interactions before switching page [#3771](https://github.com/tldraw/tldraw/pull/3771) ([@ds300](https://github.com/ds300))
  - [bindings] beforeUnbind/afterUnbind to replace beforeDelete/afterDelete [#3761](https://github.com/tldraw/tldraw/pull/3761) ([@ds300](https://github.com/ds300))
  - No defaults for contexts [#3750](https://github.com/tldraw/tldraw/pull/3750) ([@SomeHats](https://github.com/SomeHats))
  - Fix imports in Astro [#3742](https://github.com/tldraw/tldraw/pull/3742) ([@steveruizok](https://github.com/steveruizok))
  - textfields: fix RTL layout for SVG exports [#3680](https://github.com/tldraw/tldraw/pull/3680) ([@mimecuvalo](https://github.com/mimecuvalo) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - fix undo/redo issues [#3658](https://github.com/tldraw/tldraw/pull/3658) ([@SomeHats](https://github.com/SomeHats))
  - textfields: for unfilled geo shapes fix edit->edit [#3577](https://github.com/tldraw/tldraw/pull/3577) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix text resizing with alt key [#3632](https://github.com/tldraw/tldraw/pull/3632) ([@steveruizok](https://github.com/steveruizok))
  - Don't hover locked shapes [#3575](https://github.com/tldraw/tldraw/pull/3575) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - [DX] sensible defaults for createTLStore [#3886](https://github.com/tldraw/tldraw/pull/3886) ([@ds300](https://github.com/ds300))
  - Prevent stale shape data in render [#3882](https://github.com/tldraw/tldraw/pull/3882) ([@ds300](https://github.com/ds300))
  - [bugfix] Preserve redo stack when selection changes [#3862](https://github.com/tldraw/tldraw/pull/3862) ([@ds300](https://github.com/ds300))
  - fix coarse pointer detection [#3795](https://github.com/tldraw/tldraw/pull/3795) ([@SomeHats](https://github.com/SomeHats))
  - Fix spacebar/mmb panning bug. [#3791](https://github.com/tldraw/tldraw/pull/3791) ([@steveruizok](https://github.com/steveruizok))
  - Prevent wobble during viewport following [#3695](https://github.com/tldraw/tldraw/pull/3695) ([@ds300](https://github.com/ds300))
  - Bump max shapes to 4000 [#3716](https://github.com/tldraw/tldraw/pull/3716) ([@steveruizok](https://github.com/steveruizok))
  - Allow DefaultErrorFallback to be used independently [#3769](https://github.com/tldraw/tldraw/pull/3769) ([@ds300](https://github.com/ds300))
  - Prevent duplicate from creating any shapes if we reach max allowed shapes [#3692](https://github.com/tldraw/tldraw/pull/3692) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix viewport following [#3681](https://github.com/tldraw/tldraw/pull/3681) ([@ds300](https://github.com/ds300))
  - Fix className.includes bug [#3672](https://github.com/tldraw/tldraw/pull/3672) ([@steveruizok](https://github.com/steveruizok))
  - [bugfix] don't crash if a bound shape doesn't exist [#3653](https://github.com/tldraw/tldraw/pull/3653) ([@ds300](https://github.com/ds300))
- `tldraw`, `@tldraw/utils`
  - security: don't send referrer paths for images and bookmarks [#3881](https://github.com/tldraw/tldraw/pull/3881) ([@mimecuvalo](https://github.com/mimecuvalo))
  - assets: rework mime-type detection to be consistent/centralized; add support for webp/webm, apng, avif [#3730](https://github.com/tldraw/tldraw/pull/3730) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/state`
  - timeouts: rework effectschedule timeout tracking [#3870](https://github.com/tldraw/tldraw/pull/3870) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [signia] perf thing again [#3645](https://github.com/tldraw/tldraw/pull/3645) ([@ds300](https://github.com/ds300))
  - Revert "[signia] Smart dirty checking of active computeds (#3516)" [#3612](https://github.com/tldraw/tldraw/pull/3612) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/state`, `tldraw`, `@tldraw/utils`
  - editor: register timeouts/intervals/rafs for disposal [#3852](https://github.com/tldraw/tldraw/pull/3852) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`
  - Snapshots pit of success [#3811](https://github.com/tldraw/tldraw/pull/3811) ([@ds300](https://github.com/ds300))
  - Bindings [#3326](https://github.com/tldraw/tldraw/pull/3326) ([@SomeHats](https://github.com/SomeHats))
  - Automatic undo/redo [#3364](https://github.com/tldraw/tldraw/pull/3364) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Add heart geo shape [#3787](https://github.com/tldraw/tldraw/pull/3787) ([@steveruizok](https://github.com/steveruizok))
  - Separate text-align property for shapes [#3627](https://github.com/tldraw/tldraw/pull/3627) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - rework canBind callback [#3797](https://github.com/tldraw/tldraw/pull/3797) ([@SomeHats](https://github.com/SomeHats))
  - Camera options [#3282](https://github.com/tldraw/tldraw/pull/3282) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Force `interface` instead of `type` for better docs [#3815](https://github.com/tldraw/tldraw/pull/3815) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `tldraw`
  - add missing spline icons [#3778](https://github.com/tldraw/tldraw/pull/3778) ([@ds300](https://github.com/ds300))
  - Fix missing icons [#3654](https://github.com/tldraw/tldraw/pull/3654) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`
  - focus: rework and untangle existing focus management logic in the sdk [#3718](https://github.com/tldraw/tldraw/pull/3718) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/store`
  - Store-level "operation end" event [#3748](https://github.com/tldraw/tldraw/pull/3748) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`, `@tldraw/utils`
  - Move arrow helpers from editor to tldraw [#3721](https://github.com/tldraw/tldraw/pull/3721) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - Camera options followups [#3701](https://github.com/tldraw/tldraw/pull/3701) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - embed: allow embeds like YouTube to link back to its site [#3609](https://github.com/tldraw/tldraw/pull/3609) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Expose migrations, validators, and versions from tlschema [#3613](https://github.com/tldraw/tldraw/pull/3613) ([@SomeHats](https://github.com/SomeHats))
- `tldraw`, `@tldraw/tlschema`
  - fix migration exports [#3586](https://github.com/tldraw/tldraw/pull/3586) ([@SomeHats](https://github.com/SomeHats))

#### 🖥️ tldraw.com Changes

- csp: disable for now [#3907](https://github.com/tldraw/tldraw/pull/3907) ([@mimecuvalo](https://github.com/mimecuvalo))
- Fix Content-Security-Policy browser warnings [#3906](https://github.com/tldraw/tldraw/pull/3906) ([@kitschpatrol](https://github.com/kitschpatrol))
- dotcom: desc tweak [#3885](https://github.com/tldraw/tldraw/pull/3885) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add option to navigate to new project from file menu [#3876](https://github.com/tldraw/tldraw/pull/3876) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- cloudflare: dont cache no-cache headers [#3849](https://github.com/tldraw/tldraw/pull/3849) ([@mimecuvalo](https://github.com/mimecuvalo))
- security: nix list and delete commands [#3847](https://github.com/tldraw/tldraw/pull/3847) ([@mimecuvalo](https://github.com/mimecuvalo))
- security: add recommended OWASP settings; also Zoom apps require them [#3810](https://github.com/tldraw/tldraw/pull/3810) ([@mimecuvalo](https://github.com/mimecuvalo))
- Remove unneeded worker IS_LOCAL check [#3808](https://github.com/tldraw/tldraw/pull/3808) ([@SomeHats](https://github.com/SomeHats))
- touchscreen: improve the side panel, fix deploy env var, create room programmatically [#3806](https://github.com/tldraw/tldraw/pull/3806) ([@mimecuvalo](https://github.com/mimecuvalo))
- Prevent pressing escape when editing document name to bubble up to the editor [#3725](https://github.com/tldraw/tldraw/pull/3725) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix readonly fetching happening too often. [#3732](https://github.com/tldraw/tldraw/pull/3732) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@mimecuvalo](https://github.com/mimecuvalo))
- Move storing of snapshots to R2 [#3693](https://github.com/tldraw/tldraw/pull/3693) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Prevent unnecessary fetching of readonly slugs [#3663](https://github.com/tldraw/tldraw/pull/3663) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- delete stray error screen css import [#3683](https://github.com/tldraw/tldraw/pull/3683) ([@ds300](https://github.com/ds300))
- Allow clients to gracefully handle rejection [#3673](https://github.com/tldraw/tldraw/pull/3673) ([@ds300](https://github.com/ds300))
- Allow embedding tldraw in iframes [#3640](https://github.com/tldraw/tldraw/pull/3640) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Bring back `/r` [#3615](https://github.com/tldraw/tldraw/pull/3615) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - bookmarks: resolve relative urls [#3914](https://github.com/tldraw/tldraw/pull/3914) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Open share menu when navigating from create new shared project button [#3898](https://github.com/tldraw/tldraw/pull/3898) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - Fix textbox direction when it contains both RTL and LTR languages [#3188](https://github.com/tldraw/tldraw/pull/3188) ([@mokazemi](https://github.com/mokazemi) [@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Readonly / room creation omnibus [#3192](https://github.com/tldraw/tldraw/pull/3192) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - bookmark: fix up double request and rework extractor [#3856](https://github.com/tldraw/tldraw/pull/3856) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - fix android long press changing cursor to non-coarse [#3656](https://github.com/tldraw/tldraw/pull/3656) ([@TodePond](https://github.com/TodePond))
  - Make coarse pointer check dynamic [#3572](https://github.com/tldraw/tldraw/pull/3572) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `tldraw`, `@tldraw/tlschema`
  - Add desmos graph embed type [#3608](https://github.com/tldraw/tldraw/pull/3608) ([@not-first](https://github.com/not-first) [@steveruizok](https://github.com/steveruizok))

#### 📖 Documentation changes

- Add editor notes to the docs [#3832](https://github.com/tldraw/tldraw/pull/3832) ([@CodeTorso](https://github.com/CodeTorso) [@steveruizok](https://github.com/steveruizok))
- Remove alpha mention in installation for static assets [#3833](https://github.com/tldraw/tldraw/pull/3833) ([@steveruizok](https://github.com/steveruizok))
- Fix markdown list rendering on docs site [#3813](https://github.com/tldraw/tldraw/pull/3813) ([@SomeHats](https://github.com/SomeHats))
- Update README.md [#3818](https://github.com/tldraw/tldraw/pull/3818) ([@SomeHats](https://github.com/SomeHats))
- docs: smaller snapshot so it doesnt crash [#3768](https://github.com/tldraw/tldraw/pull/3768) ([@mimecuvalo](https://github.com/mimecuvalo))
- fix link [#3726](https://github.com/tldraw/tldraw/pull/3726) ([@Trevato](https://github.com/Trevato))
- Fix link in collaboration documentation [#3662](https://github.com/tldraw/tldraw/pull/3662) ([@eswarclynn](https://github.com/eswarclynn))
- 3d example [#3647](https://github.com/tldraw/tldraw/pull/3647) ([@steveruizok](https://github.com/steveruizok))
- examples: add filter input [#3625](https://github.com/tldraw/tldraw/pull/3625) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - make sure everything marked @public gets documented [#3892](https://github.com/tldraw/tldraw/pull/3892) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Bindings documentation [#3812](https://github.com/tldraw/tldraw/pull/3812) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/validate`
  - Update validation.ts [#3324](https://github.com/tldraw/tldraw/pull/3324) ([@lorenzolewis](https://github.com/lorenzolewis))
- `tldraw`
  - ban using `@internal` items in examples [#3746](https://github.com/tldraw/tldraw/pull/3746) ([@SomeHats](https://github.com/SomeHats))

#### 🏠 Internal

- tests: ugh edit->edit still flaky, skip [#3919](https://github.com/tldraw/tldraw/pull/3919) ([@mimecuvalo](https://github.com/mimecuvalo))
- test: disable camera pinch test for now, too flaky [#3854](https://github.com/tldraw/tldraw/pull/3854) ([@mimecuvalo](https://github.com/mimecuvalo))
- tests: fix edit→edit flakiness [#3850](https://github.com/tldraw/tldraw/pull/3850) ([@mimecuvalo](https://github.com/mimecuvalo))
- tests: fix camera scroll flakiness [#3829](https://github.com/tldraw/tldraw/pull/3829) ([@mimecuvalo](https://github.com/mimecuvalo))
- google meet: add hardware whiteboard integration [#3765](https://github.com/tldraw/tldraw/pull/3765) ([@mimecuvalo](https://github.com/mimecuvalo))
- delete old todo comment [#3777](https://github.com/tldraw/tldraw/pull/3777) ([@ds300](https://github.com/ds300))
- E2E camera tests [#3747](https://github.com/tldraw/tldraw/pull/3747) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Update template versions to latest [#3646](https://github.com/tldraw/tldraw/pull/3646) ([@steveruizok](https://github.com/steveruizok))
- Fix patch release script [#3597](https://github.com/tldraw/tldraw/pull/3597) ([@SomeHats](https://github.com/SomeHats))
- increase publish script timeouts [#3570](https://github.com/tldraw/tldraw/pull/3570) ([@SomeHats](https://github.com/SomeHats))
- longer retries for package publishing [#3567](https://github.com/tldraw/tldraw/pull/3567) ([@SomeHats](https://github.com/SomeHats))
- `tldraw`
  - Taha/more constraints tests [#3863](https://github.com/tldraw/tldraw/pull/3863) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - npm: improve tldraw package readme [#3851](https://github.com/tldraw/tldraw/pull/3851) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Camera Constraints Tests [#3844](https://github.com/tldraw/tldraw/pull/3844) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Add unit tests for the camera [#3814](https://github.com/tldraw/tldraw/pull/3814) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Fix an issue with the minimap [#3617](https://github.com/tldraw/tldraw/pull/3617) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/assets`, `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Update READMEs, add form link [#3741](https://github.com/tldraw/tldraw/pull/3741) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/utils`
  - Measure action durations and fps for our interactions [#3472](https://github.com/tldraw/tldraw/pull/3472) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/assets`, `tldraw`
  - delete untracked api.json and stale api-report.md files [#3619](https://github.com/tldraw/tldraw/pull/3619) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Don't check api.json files into git [#3565](https://github.com/tldraw/tldraw/pull/3565) ([@SomeHats](https://github.com/SomeHats))

#### 🧹 Chores

- VS Code 2.0.35 [#3879](https://github.com/tldraw/tldraw/pull/3879) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code version bump 2.0.34 [#3874](https://github.com/tldraw/tldraw/pull/3874) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [VS Code] Version 2.0.33 [#3687](https://github.com/tldraw/tldraw/pull/3687) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Lokalise: Translations update [#3665](https://github.com/tldraw/tldraw/pull/3665) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- VS Code 2.0.32 [#3664](https://github.com/tldraw/tldraw/pull/3664) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code 2.0.31 [#3566](https://github.com/tldraw/tldraw/pull/3566) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🔩 Dependency Updates

- Bump the npm_and_yarn group across 2 directories with 4 updates [#3731](https://github.com/tldraw/tldraw/pull/3731) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@mimecuvalo](https://github.com/mimecuvalo))
- Bump the npm_and_yarn group across 2 directories with 4 updates [#3719](https://github.com/tldraw/tldraw/pull/3719) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump the npm_and_yarn group across 2 directories with 6 updates [#3712](https://github.com/tldraw/tldraw/pull/3712) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@github-actions[bot]](https://github.com/github-actions[bot]) [@mimecuvalo](https://github.com/mimecuvalo))

#### Authors: 17

- [@dependabot[bot]](https://github.com/dependabot[bot])
- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- CodeTorso ([@CodeTorso](https://github.com/CodeTorso))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Eric Mika ([@kitschpatrol](https://github.com/kitschpatrol))
- Eswar Prasad Clinton. A ([@eswarclynn](https://github.com/eswarclynn))
- fakerr ([@not-first](https://github.com/not-first))
- Lorenzo Lewis ([@lorenzolewis](https://github.com/lorenzolewis))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Mohammad Kazemi ([@mokazemi](https://github.com/mokazemi))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Trevor Dobbertin ([@Trevato](https://github.com/Trevato))

---

# v2.1.0 (Tue Apr 23 2024)

### Release Notes

#### Make note handles show only one when zoomed out ([#3562](https://github.com/tldraw/tldraw/pull/3562))

- Show only the bottom handle on notes when zoomed between .25 and .5

#### Perf: minor drawing speedup ([#3464](https://github.com/tldraw/tldraw/pull/3464))

- Improve performance of draw shapes.

#### Prevent default on native clipboard events ([#3536](https://github.com/tldraw/tldraw/pull/3536))

- Fix copy sound on clipboard events.

#### WebGL Minimap ([#3510](https://github.com/tldraw/tldraw/pull/3510))

- Add a brief release note for your PR here.

#### arrows: fix bound arrow labels going over text shape ([#3512](https://github.com/tldraw/tldraw/pull/3512))

- Arrows: fix label positioning when bound.

#### arrows: still use Dist instead of Dist2 ([#3511](https://github.com/tldraw/tldraw/pull/3511))

- Fix arrow label positioning

#### Fix culling. ([#3504](https://github.com/tldraw/tldraw/pull/3504))

- Fix culling.

#### "Soft preload" icons ([#3507](https://github.com/tldraw/tldraw/pull/3507))

- Improve icon preloading

#### Color tweaks (light and dark mode) ([#3486](https://github.com/tldraw/tldraw/pull/3486))

- Adjusts colors

#### Add slides example ([#3467](https://github.com/tldraw/tldraw/pull/3467))

- Docs: Added a slideshow example

#### Only show cursor chat button in select mode ([#3485](https://github.com/tldraw/tldraw/pull/3485))

- Fix cursor chat button appearing when not in select tool.

#### Fix alt-duplicating shapes sometimes not working ([#3488](https://github.com/tldraw/tldraw/pull/3488))

- Add a brief release note for your PR here.

#### [perf] faster signia capture (again) ([#3487](https://github.com/tldraw/tldraw/pull/3487))

- Add a brief release note for your PR here.

#### [perf] faster signia capture ([#3471](https://github.com/tldraw/tldraw/pull/3471))

- Slight performance improvement to reactivity bookkeeping.

#### New migrations again ([#3220](https://github.com/tldraw/tldraw/pull/3220))

#### BREAKING CHANGES

- The `Migrations` type is now called `LegacyMigrations`.
- The serialized schema format (e.g. returned by `StoreSchema.serialize()` and `Store.getSnapshot()`) has changed. You don't need to do anything about it unless you were reading data directly from the schema for some reason. In which case it'd be best to avoid that in the future! We have no plans to change the schema format again (this time was traumatic enough) but you never know.
- `compareRecordVersions` and the `RecordVersion` type have both disappeared. There is no replacement. These were public by mistake anyway, so hopefully nobody had been using it.
- `compareSchemas` is gone. Comparing the schemas directly is no longer really possible since we introduced some fuzziness. The best thing to do now to check compatibility is to call `schema.getMigraitonsSince(prevSchema)` and it will return an error if the schemas are not compatible, an empty array if there are no migrations to apply since the prev schema, and a nonempty array otherwise.

   Generally speaking, the best way to check schema compatibility now is to call `store.schema.getMigrationsSince(persistedSchema)`. This will throw an error if there is no upgrade path from the `persistedSchema` to the current version.

- `defineMigrations` has been deprecated and will be removed in a future release. For upgrade instructions see https://tldraw.dev/docs/persistence#Updating-legacy-shape-migrations-defineMigrations

- `migrate` has been removed. Nobody should have been using this but if you were you'll need to find an alternative. For migrating tldraw data, you should stick to using `schema.migrateStoreSnapshot` and, if you are building a nuanced sync engine that supports some amount of backwards compatibility, also feel free to use `schema.migratePersistedRecord`.
- the `Migration` type has changed. If you need the old one for some reason it has been renamed to `LegacyMigration`. It will be removed in a future release.
- the `Migrations` type has been renamed to `LegacyMigrations` and will be removed in a future release.
- the `SerializedSchema` type has been augmented. If you need the old version specifically you can use `SerializedSchemaV1`

#### Stickies: release candidate ([#3249](https://github.com/tldraw/tldraw/pull/3249))

- Improves sticky notes (see list)

#### Cancel pointer velocity while pinching ([#3462](https://github.com/tldraw/tldraw/pull/3462))

- Fixed a bug that could occur while pinching with the hand tool selected.

#### conditionally use star-history dark theme ([#3461](https://github.com/tldraw/tldraw/pull/3461))

updates the star-history image in the README to conditionally show a dark theme image based on the user's `prefers-color-scheme`

#### Allow users to edit the document title by double clicking it even when editing a shape. ([#3459](https://github.com/tldraw/tldraw/pull/3459))

- Allow users to editing document name by double clicking even when previously editing text.

#### Don't show edit link for locked shapes. ([#3457](https://github.com/tldraw/tldraw/pull/3457))

- Hide edit link context menu option for locked shapes.

#### Faster selection / erasing ([#3454](https://github.com/tldraw/tldraw/pull/3454))

- Improve performance of minimum distance checks.

#### Make minimap display sharp rectangles. ([#3434](https://github.com/tldraw/tldraw/pull/3434))

- Improve

#### Update font import URL in quick-start.mdx ([#3430](https://github.com/tldraw/tldraw/pull/3430))

- Fixes font import link in tldraw.dev quickstart guide

#### Perf: Improve text outline performance ([#3429](https://github.com/tldraw/tldraw/pull/3429))

- Improves performance of text shapes on iOS / Safari.

#### Perf: throttle `updateHoveredId` ([#3419](https://github.com/tldraw/tldraw/pull/3419))

- Improves canvas performance by throttling the update to the editor's hovered id.

#### Perf: block hit tests while moving camera ([#3418](https://github.com/tldraw/tldraw/pull/3418))

- Improves performance of canvas while the camera is moving.

#### Perf: (slightly) faster min dist checks ([#3401](https://github.com/tldraw/tldraw/pull/3401))

- Performance: small improvements to hit testing.

#### Examples: update kbd shortcuts, add actions overrides example ([#3330](https://github.com/tldraw/tldraw/pull/3330))

- Add action overrides example, update keyboard shortcuts example

#### Add long press event ([#3275](https://github.com/tldraw/tldraw/pull/3275))

- Add support for long pressing on desktop.

#### Tool with child states ([#3074](https://github.com/tldraw/tldraw/pull/3074))

- Add an example of a tool with child states

#### Fix text resizing bug ([#3327](https://github.com/tldraw/tldraw/pull/3327))

- Fixes an issue with text shapes overflowing their bounds when resized.

#### Input buffering ([#3223](https://github.com/tldraw/tldraw/pull/3223))

- Add a brief release note for your PR here.

#### Add white ([#3321](https://github.com/tldraw/tldraw/pull/3321))

- Adds secret white color.

#### Don't trigger pointer move on zoom ([#3305](https://github.com/tldraw/tldraw/pull/3305))

- Improve performance of zooming.

#### Decrease the number of rendered dom nodes for geo shape and arrows ([#3283](https://github.com/tldraw/tldraw/pull/3283))

- Reduce the number of rendered dom nodes for geo shapes and arrows without text.

#### Improve performance of culling ([#3272](https://github.com/tldraw/tldraw/pull/3272))

- Improve performance of the canvas when many shapes are present.

#### styling: make dotcom and examples site have consistent font styling ([#3271](https://github.com/tldraw/tldraw/pull/3271))

- Add a brief release note for your PR here.

#### ui: make toasts look more toasty ([#2988](https://github.com/tldraw/tldraw/pull/2988))

- UI: Add severity to toasts.

#### textfields [1 of 3]: add text into speech bubble; also add rich text example ([#3050](https://github.com/tldraw/tldraw/pull/3050))

- Refactor textfields be composable/swappable.

#### Update romanian translations ([#3269](https://github.com/tldraw/tldraw/pull/3269))

- Update Romanian translation.

#### Allow hiding debug panel. ([#3261](https://github.com/tldraw/tldraw/pull/3261))

- Allow users to fully override the `DebugPanel`.

#### Add inline behaviour example ([#3113](https://github.com/tldraw/tldraw/pull/3113))

- Docs: Added an example for inline behaviour.

#### toolbar: fix missing title attributes ([#3244](https://github.com/tldraw/tldraw/pull/3244))

- Fix title's being missing on toolbar items.

#### Don't double squash ([#3182](https://github.com/tldraw/tldraw/pull/3182))

- Minor improvement when modifying multiple shapes at once.

#### Fix lag while panning + translating at the same time ([#3186](https://github.com/tldraw/tldraw/pull/3186))

- Add a brief release note for your PR here.

#### fix docs build ([#3201](https://github.com/tldraw/tldraw/pull/3201))

- Add a brief release note for your PR here.

#### Update the document title to include the document name. ([#3197](https://github.com/tldraw/tldraw/pull/3197))

- Use the document name in the `document.title`.

#### Remove access token logic. ([#3187](https://github.com/tldraw/tldraw/pull/3187))

- Remove some leftover logic from pro days.

#### [fix] Batch tick events ([#3181](https://github.com/tldraw/tldraw/pull/3181))

- Fix a performance issue effecting resizing multiple shapes.

#### [tinyish] Simplify / skip some work in Shape ([#3176](https://github.com/tldraw/tldraw/pull/3176))

- SDK: minor improvements to the Shape component

#### [tiny] Slightly more efficient selection rotated page bounds / page bounds ([#3178](https://github.com/tldraw/tldraw/pull/3178))

- SDK, slightly more performant selection bounds calculations.

#### [sync] allow connections from v4 clients ([#3173](https://github.com/tldraw/tldraw/pull/3173))

- Add a brief release note for your PR here.

#### [fix] Handles extra renders ([#3172](https://github.com/tldraw/tldraw/pull/3172))

- SDK: Fixed a minor rendering issue related to handles.

#### [fix] Cleanup text measures ([#3169](https://github.com/tldraw/tldraw/pull/3169))

- Fixed a bug that could cause multiple text measurement divs in development mode.

#### [perf] Reinstate render throttling ([#3160](https://github.com/tldraw/tldraw/pull/3160))

- Add a brief release note for your PR here.

#### Fix release eliding ([#3156](https://github.com/tldraw/tldraw/pull/3156))

- Add a brief release note for your PR here.

#### Updated exploded example link from installation page. ([#3138](https://github.com/tldraw/tldraw/pull/3138))

- Add a brief release note for your PR here.
Installation docs has a link to example for exploded which points to github 404. I have updated the working link.

#### Make the custom menu examples a bit clearer ([#3106](https://github.com/tldraw/tldraw/pull/3106))

- Add a brief release note for your PR here.

#### Menu updates / fix flip / add export / remove Shape menu ([#3115](https://github.com/tldraw/tldraw/pull/3115))

- Revert some changes in the menu.

#### Performance improvements ([#2977](https://github.com/tldraw/tldraw/pull/2977))

- Improves the performance of rendering.

#### [fix] Rotated crop handle ([#3093](https://github.com/tldraw/tldraw/pull/3093))

- Fixed a bug that could cause rotated cropping images to have incorrectly rotated handles.

#### Fix typo in useValue comment ([#3088](https://github.com/tldraw/tldraw/pull/3088))

- Fix typo in useValue comment.

#### Shape with Migrations ([#3078](https://github.com/tldraw/tldraw/pull/3078))

- Adds a shape with migrations example

#### Fix viewport params for pages. ([#3079](https://github.com/tldraw/tldraw/pull/3079))

- Fixes an issue with url params in the share links. The viewport params only worked on the first page in the document.

#### Fix typo ([#3069](https://github.com/tldraw/tldraw/pull/3069))

N/A

#### Add custom tool examples ([#3064](https://github.com/tldraw/tldraw/pull/3064))

- Adds a simple custom tool example

#### Fix validation errors for `duplicateProps` ([#3065](https://github.com/tldraw/tldraw/pull/3065))

- Add a brief release note for your PR here.

#### Shorten url state ([#3041](https://github.com/tldraw/tldraw/pull/3041))

- Shortens url parameters for dot com.

#### Fix an issue where the video size was not drawn correctly ([#3047](https://github.com/tldraw/tldraw/pull/3047))

- Fix an issue where the video size was not drawn correctly.

#### [fix] Input tags ([#3038](https://github.com/tldraw/tldraw/pull/3038))

- Fixed autocomplete, autocapitalize, and autocorrect tags on text inputs.

#### Lokalise: Translations update ([#3049](https://github.com/tldraw/tldraw/pull/3049))

- Updated Hungarian translations.

#### [terrible] Firefox: Allow scrolling on keyboard shortcuts dialog ([#2974](https://github.com/tldraw/tldraw/pull/2974))

- Add a brief release note for your PR here.

#### Fix cursor chat bubble position. ([#3042](https://github.com/tldraw/tldraw/pull/3042))

- Fixed a bug where cursor chat bubble position could be wrong when a sidebar was open.

#### Fix broken link for shape example ([#3046](https://github.com/tldraw/tldraw/pull/3046))

- Fix a link that was pointing to a 404 on GitHub

#### Protect local storage calls ([#3043](https://github.com/tldraw/tldraw/pull/3043))

- Fixes a bug that could cause crashes in React Native webviews.

#### Custom shape examples ([#2994](https://github.com/tldraw/tldraw/pull/2994))

- adds a simple custom shape example
- adds an interactive shape example
- updates editable shape example

#### Expose `getStyleForNextShape` ([#3039](https://github.com/tldraw/tldraw/pull/3039))

- Expose the API for `Editor.getStyleForNextShape`, previously marked as internal.

#### [fix] Missing element crash (rare) on video shapes. ([#3037](https://github.com/tldraw/tldraw/pull/3037))

- Fixed a rare crash with video shapes.

#### Example of using tldraw styles ([#3017](https://github.com/tldraw/tldraw/pull/3017))

- shape with tldraw styles example

#### Show a broken image for files without assets ([#2990](https://github.com/tldraw/tldraw/pull/2990))

- Better handling of broken images / videos.

#### Selection UI example (plus fixes to pageToScreen) ([#3015](https://github.com/tldraw/tldraw/pull/3015))

- Adds selection UI example.
- Adds `Editor.getSelectionRotatedScreenBounds` method
- Fixes a bug with `pageToScreen`.

#### [bugfix] Avoid randomness at init time to allow running on cloudflare. ([#3016](https://github.com/tldraw/tldraw/pull/3016))

- Prevent using randomness API at init time, to allow importing the tldraw package in a cloudflare worker.

---

#### 💥 Breaking Change

- `@tldraw/editor`, `tldraw`, `@tldraw/validate`
  - React-powered SVG exports [#3117](https://github.com/tldraw/tldraw/pull/3117) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `tldraw`
  - Component-based toolbar customisation API [#3067](https://github.com/tldraw/tldraw/pull/3067) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Menu updates / fix flip / add export / remove Shape menu [#3115](https://github.com/tldraw/tldraw/pull/3115) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/utils`
  - Performance improvements [#2977](https://github.com/tldraw/tldraw/pull/2977) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- squish sync data events before sending them out [#3118](https://github.com/tldraw/tldraw/pull/3118) ([@si14](https://github.com/si14))
- `@tldraw/editor`, `tldraw`
  - textfields [1 of 3]: add text into speech bubble; also add rich text example [#3050](https://github.com/tldraw/tldraw/pull/3050) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`
  - Selection UI example (plus fixes to pageToScreen) [#3015](https://github.com/tldraw/tldraw/pull/3015) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Revert "squish sync data events before sending them out" [#3331](https://github.com/tldraw/tldraw/pull/3331) ([@ds300](https://github.com/ds300))
- docs: fix up github link [#3108](https://github.com/tldraw/tldraw/pull/3108) ([@mimecuvalo](https://github.com/mimecuvalo))
- Bump the npm_and_yarn group across 3 directories with 3 updates [#3087](https://github.com/tldraw/tldraw/pull/3087) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@github-actions[bot]](https://github.com/github-actions[bot]) [@MitjaBezensek](https://github.com/MitjaBezensek))
- simplify fnmatch pattern ([@ds300](https://github.com/ds300))
- Bump the npm_and_yarn group group with 7 updates [#2982](https://github.com/tldraw/tldraw/pull/2982) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - quick fixes [#3128](https://github.com/tldraw/tldraw/pull/3128) ([@steveruizok](https://github.com/steveruizok))

#### 📚 SDK Changes

- Update useFileSystem.tsx [#3371](https://github.com/tldraw/tldraw/pull/3371) ([@steveruizok](https://github.com/steveruizok))
- only buffer pointer events [#3337](https://github.com/tldraw/tldraw/pull/3337) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Fix collaborator size with zoom [#3563](https://github.com/tldraw/tldraw/pull/3563) ([@steveruizok](https://github.com/steveruizok))
  - Make note handles show only one when zoomed out [#3562](https://github.com/tldraw/tldraw/pull/3562) ([@steveruizok](https://github.com/steveruizok))
  - Fix transparent colors in the minimap [#3561](https://github.com/tldraw/tldraw/pull/3561) ([@steveruizok](https://github.com/steveruizok))
  - Expose `usePreloadAssets` [#3545](https://github.com/tldraw/tldraw/pull/3545) ([@SomeHats](https://github.com/SomeHats))
  - Prevent default on native clipboard events [#3536](https://github.com/tldraw/tldraw/pull/3536) ([@steveruizok](https://github.com/steveruizok))
  - Improve back to content [#3532](https://github.com/tldraw/tldraw/pull/3532) ([@steveruizok](https://github.com/steveruizok))
  - arrows: fix bound arrow labels going over text shape [#3512](https://github.com/tldraw/tldraw/pull/3512) ([@mimecuvalo](https://github.com/mimecuvalo))
  - textfields: fix Safari cursor rendering bug, take 2 [#3513](https://github.com/tldraw/tldraw/pull/3513) ([@mimecuvalo](https://github.com/mimecuvalo))
  - geo: fix double unique id on DOM [#3514](https://github.com/tldraw/tldraw/pull/3514) ([@mimecuvalo](https://github.com/mimecuvalo))
  - arrows: still use Dist instead of Dist2 [#3511](https://github.com/tldraw/tldraw/pull/3511) ([@mimecuvalo](https://github.com/mimecuvalo))
  - textfields: nix disableTab option; make TextShapes have custom Tab behavior as intended [#3506](https://github.com/tldraw/tldraw/pull/3506) ([@mimecuvalo](https://github.com/mimecuvalo))
  - "Soft preload" icons [#3507](https://github.com/tldraw/tldraw/pull/3507) ([@steveruizok](https://github.com/steveruizok))
  - textfields: wait a tick before selecting all to fix iOS [#3501](https://github.com/tldraw/tldraw/pull/3501) ([@mimecuvalo](https://github.com/mimecuvalo))
  - textfields: fix dragging selected shape behind another [#3498](https://github.com/tldraw/tldraw/pull/3498) ([@mimecuvalo](https://github.com/mimecuvalo))
  - stickies: a bit of fuzziness when calculating certain text [#3493](https://github.com/tldraw/tldraw/pull/3493) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix alt-duplicating shapes sometimes not working [#3488](https://github.com/tldraw/tldraw/pull/3488) ([@TodePond](https://github.com/TodePond))
  - stickies: dont remove selection ranges when edit->edit [#3484](https://github.com/tldraw/tldraw/pull/3484) ([@mimecuvalo](https://github.com/mimecuvalo))
  - stickies: hide clone handles on mobile [#3478](https://github.com/tldraw/tldraw/pull/3478) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Don't show edit link for locked shapes. [#3457](https://github.com/tldraw/tldraw/pull/3457) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Performance measurement tool (for unit tests) [#3447](https://github.com/tldraw/tldraw/pull/3447) ([@steveruizok](https://github.com/steveruizok))
  - Remove minimap throttling [#3438](https://github.com/tldraw/tldraw/pull/3438) ([@steveruizok](https://github.com/steveruizok))
  - Make minimap display sharp rectangles. [#3434](https://github.com/tldraw/tldraw/pull/3434) ([@steveruizok](https://github.com/steveruizok))
  - Perf: throttle `updateHoveredId` [#3419](https://github.com/tldraw/tldraw/pull/3419) ([@steveruizok](https://github.com/steveruizok))
  - Revert "Fix text resizing bug (#3327)" [#3332](https://github.com/tldraw/tldraw/pull/3332) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix text resizing bug [#3327](https://github.com/tldraw/tldraw/pull/3327) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Fix count shapes and nodes [#3318](https://github.com/tldraw/tldraw/pull/3318) ([@steveruizok](https://github.com/steveruizok))
  - Decrease the number of rendered dom nodes for geo shape and arrows [#3283](https://github.com/tldraw/tldraw/pull/3283) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - styling: make dotcom and examples site have consistent font styling [#3271](https://github.com/tldraw/tldraw/pull/3271) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Allow hiding debug panel. [#3261](https://github.com/tldraw/tldraw/pull/3261) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - toolbar: fix missing title attributes [#3244](https://github.com/tldraw/tldraw/pull/3244) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Fix jpg export and tests [#3198](https://github.com/tldraw/tldraw/pull/3198) ([@SomeHats](https://github.com/SomeHats))
  - [tiny] lift theme in style panel [#3170](https://github.com/tldraw/tldraw/pull/3170) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`, `@tldraw/utils`
  - Perf: minor drawing speedup [#3464](https://github.com/tldraw/tldraw/pull/3464) ([@steveruizok](https://github.com/steveruizok))
  - fixup file helpers [#3130](https://github.com/tldraw/tldraw/pull/3130) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `tldraw`
  - WebGL Minimap [#3510](https://github.com/tldraw/tldraw/pull/3510) ([@ds300](https://github.com/ds300))
  - textfields: on mobile edit->edit, allow going to empty geo [#3469](https://github.com/tldraw/tldraw/pull/3469) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Faster selection / erasing [#3454](https://github.com/tldraw/tldraw/pull/3454) ([@steveruizok](https://github.com/steveruizok))
  - Fix SVG exports in Next.js [#3446](https://github.com/tldraw/tldraw/pull/3446) ([@SomeHats](https://github.com/SomeHats))
  - Perf: Incremental culled shapes calculation. [#3411](https://github.com/tldraw/tldraw/pull/3411) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Fix some tests [#3403](https://github.com/tldraw/tldraw/pull/3403) ([@steveruizok](https://github.com/steveruizok))
  - Add long press event [#3275](https://github.com/tldraw/tldraw/pull/3275) ([@steveruizok](https://github.com/steveruizok))
  - textfields: fix regression with Text shape and resizing [#3333](https://github.com/tldraw/tldraw/pull/3333) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Add image annotator example [#3147](https://github.com/tldraw/tldraw/pull/3147) ([@SomeHats](https://github.com/SomeHats))
  - [fix] Batch tick events [#3181](https://github.com/tldraw/tldraw/pull/3181) ([@steveruizok](https://github.com/steveruizok))
  - [tinyish] Simplify / skip some work in Shape [#3176](https://github.com/tldraw/tldraw/pull/3176) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`
  - [signia] Smart dirty checking of active computeds [#3516](https://github.com/tldraw/tldraw/pull/3516) ([@ds300](https://github.com/ds300))
  - [perf] faster signia capture (again) [#3487](https://github.com/tldraw/tldraw/pull/3487) ([@ds300](https://github.com/ds300))
  - [perf] faster signia capture [#3471](https://github.com/tldraw/tldraw/pull/3471) ([@ds300](https://github.com/ds300))
- `tldraw`, `@tldraw/validate`
  - [fix] allow loading files [#3517](https://github.com/tldraw/tldraw/pull/3517) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Color tweaks (light and dark mode) [#3486](https://github.com/tldraw/tldraw/pull/3486) ([@steveruizok](https://github.com/steveruizok) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`
  - Stickies: fix sticky note clipping [#3503](https://github.com/tldraw/tldraw/pull/3503) ([@steveruizok](https://github.com/steveruizok))
  - css more shapes that need transparent behavior [#3497](https://github.com/tldraw/tldraw/pull/3497) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [fix] use page point for pointer [#3476](https://github.com/tldraw/tldraw/pull/3476) ([@ds300](https://github.com/ds300))
  - perf: calculate hypoteneuse manually instead of using hypot [#3468](https://github.com/tldraw/tldraw/pull/3468) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Cancel pointer velocity while pinching [#3462](https://github.com/tldraw/tldraw/pull/3462) ([@steveruizok](https://github.com/steveruizok))
  - Perf: Use a computed cache for masked shape page bounds [#3460](https://github.com/tldraw/tldraw/pull/3460) ([@steveruizok](https://github.com/steveruizok))
  - Remove docs for Editor.batch [#3451](https://github.com/tldraw/tldraw/pull/3451) ([@steveruizok](https://github.com/steveruizok))
  - Fix panning. [#3445](https://github.com/tldraw/tldraw/pull/3445) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Perf: Improve text outline performance [#3429](https://github.com/tldraw/tldraw/pull/3429) ([@steveruizok](https://github.com/steveruizok))
  - Fix text bug on iOS [#3423](https://github.com/tldraw/tldraw/pull/3423) ([@steveruizok](https://github.com/steveruizok))
  - Perf: block hit tests while moving camera [#3418](https://github.com/tldraw/tldraw/pull/3418) ([@steveruizok](https://github.com/steveruizok))
  - Fix an issue with layers when moving shapes. [#3380](https://github.com/tldraw/tldraw/pull/3380) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [culling] minimal culled diff with webgl [#3377](https://github.com/tldraw/tldraw/pull/3377) ([@steveruizok](https://github.com/steveruizok))
  - put `getCurrentPageId` into a computed [#3378](https://github.com/tldraw/tldraw/pull/3378) ([@steveruizok](https://github.com/steveruizok))
  - Don't trigger pointer move on zoom [#3305](https://github.com/tldraw/tldraw/pull/3305) ([@steveruizok](https://github.com/steveruizok))
  - Improve performance of culling [#3272](https://github.com/tldraw/tldraw/pull/3272) ([@steveruizok](https://github.com/steveruizok))
  - Skip the random ID for regular history entries [#3183](https://github.com/tldraw/tldraw/pull/3183) ([@steveruizok](https://github.com/steveruizok))
  - [tiny] Slightly more efficient selection rotated page bounds / page bounds [#3178](https://github.com/tldraw/tldraw/pull/3178) ([@steveruizok](https://github.com/steveruizok))
  - [fix] handles [#3177](https://github.com/tldraw/tldraw/pull/3177) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Handles extra renders [#3172](https://github.com/tldraw/tldraw/pull/3172) ([@steveruizok](https://github.com/steveruizok))
  - [tiny] remove unused shape indicator equality checker [#3171](https://github.com/tldraw/tldraw/pull/3171) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Cleanup text measures [#3169](https://github.com/tldraw/tldraw/pull/3169) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - New migrations again [#3220](https://github.com/tldraw/tldraw/pull/3220) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/store`
  - undo devFreeze unintentional commit [#3466](https://github.com/tldraw/tldraw/pull/3466) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix typo. [#3306](https://github.com/tldraw/tldraw/pull/3306) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Don't double squash [#3182](https://github.com/tldraw/tldraw/pull/3182) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Stickies: release candidate [#3249](https://github.com/tldraw/tldraw/pull/3249) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo) [@TodePond](https://github.com/TodePond) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `@tldraw/store`, `tldraw`
  - Improve hand dragging with long press [#3432](https://github.com/tldraw/tldraw/pull/3432) ([@steveruizok](https://github.com/steveruizok))
  - Perf: (slightly) faster min dist checks [#3401](https://github.com/tldraw/tldraw/pull/3401) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/utils`
  - Perf: slightly faster `getShapeAtPoint` [#3416](https://github.com/tldraw/tldraw/pull/3416) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`, `@tldraw/tlschema`
  - Add white migration [#3334](https://github.com/tldraw/tldraw/pull/3334) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `tldraw`
  - Fix blur bug in editable text [#3343](https://github.com/tldraw/tldraw/pull/3343) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - Input buffering [#3223](https://github.com/tldraw/tldraw/pull/3223) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Fix lag while panning + translating at the same time [#3186](https://github.com/tldraw/tldraw/pull/3186) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- `tldraw`, `@tldraw/tlschema`
  - Add white [#3321](https://github.com/tldraw/tldraw/pull/3321) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - use native structuredClone on node, cloudflare workers, and in tests [#3166](https://github.com/tldraw/tldraw/pull/3166) ([@si14](https://github.com/si14))
- `@tldraw/editor`, `@tldraw/state`
  - [perf] Reinstate render throttling [#3160](https://github.com/tldraw/tldraw/pull/3160) ([@ds300](https://github.com/ds300))

#### 🖥️ tldraw.com Changes

- fix document name alignment [#3559](https://github.com/tldraw/tldraw/pull/3559) ([@SomeHats](https://github.com/SomeHats))
- Fix version [#3521](https://github.com/tldraw/tldraw/pull/3521) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Only show cursor chat button in select mode [#3485](https://github.com/tldraw/tldraw/pull/3485) ([@TodePond](https://github.com/TodePond))
- Allow users to edit the document title by double clicking it even when editing a shape. [#3459](https://github.com/tldraw/tldraw/pull/3459) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix cursor chat in context menu. [#3435](https://github.com/tldraw/tldraw/pull/3435) ([@steveruizok](https://github.com/steveruizok))
- Update romanian translations [#3269](https://github.com/tldraw/tldraw/pull/3269) ([@TodePond](https://github.com/TodePond))
- fix document name overflow [#3263](https://github.com/tldraw/tldraw/pull/3263) ([@SomeHats](https://github.com/SomeHats))
- top bar design tweaks [#3205](https://github.com/tldraw/tldraw/pull/3205) ([@SomeHats](https://github.com/SomeHats))
- Update the document title to include the document name. [#3197](https://github.com/tldraw/tldraw/pull/3197) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Remove access token logic. [#3187](https://github.com/tldraw/tldraw/pull/3187) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [sync] allow connections from v4 clients [#3173](https://github.com/tldraw/tldraw/pull/3173) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - Enable document name [#3150](https://github.com/tldraw/tldraw/pull/3150) ([@ds300](https://github.com/ds300))

#### 📖 Documentation changes

- Add releases section to docs [#3564](https://github.com/tldraw/tldraw/pull/3564) ([@SomeHats](https://github.com/SomeHats))
- conditionally use star-history dark theme [#3461](https://github.com/tldraw/tldraw/pull/3461) ([@sunnyzanchi](https://github.com/sunnyzanchi))
- Update font import URL in quick-start.mdx [#3430](https://github.com/tldraw/tldraw/pull/3430) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Examples: update kbd shortcuts, add actions overrides example [#3330](https://github.com/tldraw/tldraw/pull/3330) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Tool with child states [#3074](https://github.com/tldraw/tldraw/pull/3074) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Add inline behaviour example [#3113](https://github.com/tldraw/tldraw/pull/3113) ([@TodePond](https://github.com/TodePond))
- docs: make header fixed instead of sticky [#3228](https://github.com/tldraw/tldraw/pull/3228) ([@mimecuvalo](https://github.com/mimecuvalo))
- fix docs slugs [#3227](https://github.com/tldraw/tldraw/pull/3227) ([@SomeHats](https://github.com/SomeHats))
- docs: work around browser bug with input+scrolling [#3209](https://github.com/tldraw/tldraw/pull/3209) ([@mimecuvalo](https://github.com/mimecuvalo))
- PDF editor example [#3159](https://github.com/tldraw/tldraw/pull/3159) ([@SomeHats](https://github.com/SomeHats))
- fix docs build [#3201](https://github.com/tldraw/tldraw/pull/3201) ([@ds300](https://github.com/ds300))
- [example] culling [#3174](https://github.com/tldraw/tldraw/pull/3174) ([@steveruizok](https://github.com/steveruizok))
- Fix release eliding [#3156](https://github.com/tldraw/tldraw/pull/3156) ([@ds300](https://github.com/ds300))
- [docs] Sync docs deploy with npm deploy [#3153](https://github.com/tldraw/tldraw/pull/3153) ([@ds300](https://github.com/ds300))
- Updated exploded example link from installation page. [#3138](https://github.com/tldraw/tldraw/pull/3138) ([@Kesavaraja](https://github.com/Kesavaraja))
- Make the custom menu examples a bit clearer [#3106](https://github.com/tldraw/tldraw/pull/3106) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Custom renderer example [#3091](https://github.com/tldraw/tldraw/pull/3091) ([@steveruizok](https://github.com/steveruizok))
- Shape with Migrations [#3078](https://github.com/tldraw/tldraw/pull/3078) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Fix typo [#3069](https://github.com/tldraw/tldraw/pull/3069) ([@calebeby](https://github.com/calebeby))
- Add custom tool examples [#3064](https://github.com/tldraw/tldraw/pull/3064) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix broken link for shape example [#3046](https://github.com/tldraw/tldraw/pull/3046) ([@lorenzolewis](https://github.com/lorenzolewis))
- Custom shape examples [#2994](https://github.com/tldraw/tldraw/pull/2994) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Example of using tldraw styles [#3017](https://github.com/tldraw/tldraw/pull/3017) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Add slides example [#3467](https://github.com/tldraw/tldraw/pull/3467) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@TodePond](https://github.com/TodePond))
  - side effects reference docs & examples [#3258](https://github.com/tldraw/tldraw/pull/3258) ([@SomeHats](https://github.com/SomeHats))
  - fix docs not building due to typo [#3259](https://github.com/tldraw/tldraw/pull/3259) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/store`
  - Fix typo in Store.ts [#3385](https://github.com/tldraw/tldraw/pull/3385) ([@OrionReed](https://github.com/OrionReed))
- `tldraw`
  - docs: fix missing API entries [#3111](https://github.com/tldraw/tldraw/pull/3111) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`
  - Fix typo in useValue comment [#3088](https://github.com/tldraw/tldraw/pull/3088) ([@Slowhand0309](https://github.com/Slowhand0309))

#### 🏠 Internal

- Fix deploy script [#3550](https://github.com/tldraw/tldraw/pull/3550) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [internal] Add license report scripts [#2751](https://github.com/tldraw/tldraw/pull/2751) ([@steveruizok](https://github.com/steveruizok))
- [chore] Bump browser-fs-access. [#3277](https://github.com/tldraw/tldraw/pull/3277) ([@steveruizok](https://github.com/steveruizok))
- log message size in worker analytics [#3274](https://github.com/tldraw/tldraw/pull/3274) ([@SomeHats](https://github.com/SomeHats))
- Add yarn immutable check to pre-commit. [#3218](https://github.com/tldraw/tldraw/pull/3218) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- tooling: prettier ignore pr template [#3210](https://github.com/tldraw/tldraw/pull/3210) ([@mimecuvalo](https://github.com/mimecuvalo))
- Add release docs [#3158](https://github.com/tldraw/tldraw/pull/3158) ([@ds300](https://github.com/ds300))
- Simplify tlsync types [#3139](https://github.com/tldraw/tldraw/pull/3139) ([@si14](https://github.com/si14))
- [DX] PR labels revamp [#3112](https://github.com/tldraw/tldraw/pull/3112) ([@ds300](https://github.com/ds300))
- Restore export menu content [#3126](https://github.com/tldraw/tldraw/pull/3126) ([@steveruizok](https://github.com/steveruizok))
- Don't import package.json in scripts/refresh-assets.ts, just read it [#3116](https://github.com/tldraw/tldraw/pull/3116) ([@si14](https://github.com/si14))
- [dx] Allow vscode to search inside md files by default [#3105](https://github.com/tldraw/tldraw/pull/3105) ([@ds300](https://github.com/ds300))
- Debounce/aggregate tlsync messages [#3012](https://github.com/tldraw/tldraw/pull/3012) ([@si14](https://github.com/si14))
- [infra] Fix patch release script [#3095](https://github.com/tldraw/tldraw/pull/3095) ([@ds300](https://github.com/ds300))
- [infra] Patch release scripting [#3072](https://github.com/tldraw/tldraw/pull/3072) ([@ds300](https://github.com/ds300))
- Shorten url state [#3041](https://github.com/tldraw/tldraw/pull/3041) ([@steveruizok](https://github.com/steveruizok))
- Fix cursor chat bubble position. [#3042](https://github.com/tldraw/tldraw/pull/3042) ([@steveruizok](https://github.com/steveruizok))
- Configure dependabot. [#2980](https://github.com/tldraw/tldraw/pull/2980) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [infra] fix canary dist tag [#3048](https://github.com/tldraw/tldraw/pull/3048) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - Use computed cache for getting the parent child relationships [#3508](https://github.com/tldraw/tldraw/pull/3508) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Perf: Improve perf of `getCurrentPageShapesSorted` [#3453](https://github.com/tldraw/tldraw/pull/3453) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Only run when shapes change. [#3456](https://github.com/tldraw/tldraw/pull/3456) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Reorder dom elements. [#3431](https://github.com/tldraw/tldraw/pull/3431) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - fix export preview size [#3264](https://github.com/tldraw/tldraw/pull/3264) ([@SomeHats](https://github.com/SomeHats))
  - A few more async routes [#3023](https://github.com/tldraw/tldraw/pull/3023) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - Fix culling. [#3504](https://github.com/tldraw/tldraw/pull/3504) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Revert "RBush again? (#3439)" [#3481](https://github.com/tldraw/tldraw/pull/3481) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - RBush again? [#3439](https://github.com/tldraw/tldraw/pull/3439) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [culling] Improve setting of display none. [#3376](https://github.com/tldraw/tldraw/pull/3376) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/state`
  - Revert "[perf] faster signia capture (#3471)" [#3480](https://github.com/tldraw/tldraw/pull/3480) ([@ds300](https://github.com/ds300))
- `@tldraw/utils`
  - Add two simple perf helpers. [#3399](https://github.com/tldraw/tldraw/pull/3399) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Display none for culled shapes [#3291](https://github.com/tldraw/tldraw/pull/3291) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `tldraw`
  - Revert perf changes [#3217](https://github.com/tldraw/tldraw/pull/3217) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - Remove namespaced-tldraw/tldraw.css [#3068](https://github.com/tldraw/tldraw/pull/3068) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tlschema`
  - Remove dependabot config since it only controls version updates? [#3057](https://github.com/tldraw/tldraw/pull/3057) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fixes

- VS Code 2.0.30 [#3519](https://github.com/tldraw/tldraw/pull/3519) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [hotfix] Panning fix for VS Code [#3452](https://github.com/tldraw/tldraw/pull/3452) (huppy+SomeHats@tldraw.com huppy+ds300@tldraw.com [@SomeHats](https://github.com/SomeHats) [@web-flow](https://github.com/web-flow) huppy+mimecuvalo@tldraw.com [@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300) huppy+steveruizok@tldraw.com)
- Fix viewport params for pages. [#3079](https://github.com/tldraw/tldraw/pull/3079) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Better websocket reconnection handling [#2960](https://github.com/tldraw/tldraw/pull/2960) ([@si14](https://github.com/si14) [@ds300](https://github.com/ds300))
- Lokalise: Translations update [#3049](https://github.com/tldraw/tldraw/pull/3049) ([@TodePond](https://github.com/TodePond))
- `@tldraw/assets`, `@tldraw/editor`, `tldraw`
  - ui: make toasts look more toasty [#2988](https://github.com/tldraw/tldraw/pull/2988) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/state`
  - Revert throttling of useValue and useStateTracking. [#3129](https://github.com/tldraw/tldraw/pull/3129) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`, `@tldraw/utils`
  - chore: cleanup multiple uses of FileReader [#3110](https://github.com/tldraw/tldraw/pull/3110) ([@mimecuvalo](https://github.com/mimecuvalo))
- `tldraw`
  - [fix] Rotated crop handle [#3093](https://github.com/tldraw/tldraw/pull/3093) ([@steveruizok](https://github.com/steveruizok))
  - Fix an issue where the video size was not drawn correctly [#3047](https://github.com/tldraw/tldraw/pull/3047) ([@bubweiser](https://github.com/bubweiser) [@steveruizok](https://github.com/steveruizok))
  - [fix] Input tags [#3038](https://github.com/tldraw/tldraw/pull/3038) ([@steveruizok](https://github.com/steveruizok))
  - [terrible] Firefox: Allow scrolling on keyboard shortcuts dialog [#2974](https://github.com/tldraw/tldraw/pull/2974) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [fix] Missing element crash (rare) on video shapes. [#3037](https://github.com/tldraw/tldraw/pull/3037) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - Fix validation errors for `duplicateProps` [#3065](https://github.com/tldraw/tldraw/pull/3065) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - children: any -> children: ReactNode [#3061](https://github.com/tldraw/tldraw/pull/3061) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `tldraw`, `@tldraw/utils`
  - Wrap local/session storage calls in try/catch (take 2) [#3066](https://github.com/tldraw/tldraw/pull/3066) ([@SomeHats](https://github.com/SomeHats))
  - Revert "Protect local storage calls (#3043)" [#3063](https://github.com/tldraw/tldraw/pull/3063) ([@SomeHats](https://github.com/SomeHats))
  - Protect local storage calls [#3043](https://github.com/tldraw/tldraw/pull/3043) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Expose `getStyleForNextShape` [#3039](https://github.com/tldraw/tldraw/pull/3039) ([@steveruizok](https://github.com/steveruizok))
  - [bugfix] Avoid randomness at init time to allow running on cloudflare. [#3016](https://github.com/tldraw/tldraw/pull/3016) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`, `tldraw`
  - Show a broken image for files without assets [#2990](https://github.com/tldraw/tldraw/pull/2990) ([@steveruizok](https://github.com/steveruizok))

#### 🧹 Chores

- VS Code 2.0.29 [#3515](https://github.com/tldraw/tldraw/pull/3515) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code 2.0.27 [#3442](https://github.com/tldraw/tldraw/pull/3442) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code 2.0.26 [#3148](https://github.com/tldraw/tldraw/pull/3148) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🧪 Tests

- attempted fix of a flaky ClientWebSocketAdapter test [#3114](https://github.com/tldraw/tldraw/pull/3114) ([@si14](https://github.com/si14))
- `@tldraw/editor`
  - Add tests for Vec.Average [#3071](https://github.com/tldraw/tldraw/pull/3071) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tlschema`
  - [fix] Routes check on e2e tests [#3022](https://github.com/tldraw/tldraw/pull/3022) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- Bump the npm_and_yarn group across 1 directory with 2 updates [#3505](https://github.com/tldraw/tldraw/pull/3505) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- Bump the npm_and_yarn group across 1 directory with 2 updates [#3443](https://github.com/tldraw/tldraw/pull/3443) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump the npm_and_yarn group across 1 directory with 1 update [#3348](https://github.com/tldraw/tldraw/pull/3348) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump the npm_and_yarn group across 1 directory with 2 updates [#3304](https://github.com/tldraw/tldraw/pull/3304) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@github-actions[bot]](https://github.com/github-actions[bot]) [@MitjaBezensek](https://github.com/MitjaBezensek))
- Bump the npm_and_yarn group across 1 directory with 2 updates [#3165](https://github.com/tldraw/tldraw/pull/3165) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### Authors: 23

- [@dependabot[bot]](https://github.com/dependabot[bot])
- [@github-actions[bot]](https://github.com/github-actions[bot])
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Caleb Eby ([@calebeby](https://github.com/calebeby))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- ds300 (huppy+ds300@tldraw.com)
- GitHub Web Flow ([@web-flow](https://github.com/web-flow))
- hirano ([@bubweiser](https://github.com/bubweiser))
- Kesavaraja Krishnan ([@Kesavaraja](https://github.com/Kesavaraja))
- Lorenzo Lewis ([@lorenzolewis](https://github.com/lorenzolewis))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- mimecuvalo (huppy+mimecuvalo@tldraw.com)
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Orion Reed ([@OrionReed](https://github.com/OrionReed))
- Slowhand ([@Slowhand0309](https://github.com/Slowhand0309))
- SomeHats (huppy+SomeHats@tldraw.com)
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- steveruizok (huppy+steveruizok@tldraw.com)
- Sunny Zanchi ([@sunnyzanchi](https://github.com/sunnyzanchi))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- `@tldraw/tldraw`, `tldraw`
  - updatereadmes ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- `@tldraw/tldraw`
  - Update readmes / docs for 2.0 [#3011](https://github.com/tldraw/tldraw/pull/3011) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 1

- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-beta.9 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- allow changes ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`
  - fix refresh-assets cache inputs ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.8 (Thu Feb 29 2024)

#### ⚠️ Pushed to `main`

- `@tldraw/editor`, `tldraw`
  - use glob to pick up version files? ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.7 (Thu Feb 29 2024)

### Release Notes

#### Fix publish script one more time ([#3010](https://github.com/tldraw/tldraw/pull/3010))

- Add a brief release note for your PR here.

---

#### 🏠 Internal

- `@tldraw/editor`, `tldraw`
  - Fix publish script one more time [#3010](https://github.com/tldraw/tldraw/pull/3010) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.6 (Thu Feb 29 2024)

### Release Notes

#### fix setAllVersions ([#3009](https://github.com/tldraw/tldraw/pull/3009))

- Add a brief release note for your PR here.

#### Fix publishing scripts ([#3008](https://github.com/tldraw/tldraw/pull/3008))

- Add a brief release note for your PR here.

---

#### 🏠 Internal

- fix setAllVersions [#3009](https://github.com/tldraw/tldraw/pull/3009) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `tldraw`
  - Fix publishing scripts [#3008](https://github.com/tldraw/tldraw/pull/3008) ([@ds300](https://github.com/ds300))

#### Authors: 1

- David Sheldrick ([@ds300](https://github.com/ds300))

---

# v2.0.0-beta.5 (Thu Feb 29 2024)

### Release Notes

#### fix publishing scripts ([#3006](https://github.com/tldraw/tldraw/pull/3006))

- Add a brief release note for your PR here.

#### tldraw_final_v6_final(old version).docx.pdf ([#2998](https://github.com/tldraw/tldraw/pull/2998))

- The `@tldraw/tldraw` package has been renamed to `tldraw`. You can keep using the old version if you want though!

#### Don't add editor / app to window. ([#2995](https://github.com/tldraw/tldraw/pull/2995))

- Remove `window.editor` and `window.app` references to editor.

#### Adding a single E2E test per menu ([#2954](https://github.com/tldraw/tldraw/pull/2954))

- Add a brief release note for your PR here.

#### unbork publish-new ([#2999](https://github.com/tldraw/tldraw/pull/2999))

- Add a brief release note for your PR here.

#### Implement new package publish process ([#2996](https://github.com/tldraw/tldraw/pull/2996))

- Add a brief release note for your PR here.

#### [feature] wrap mode ([#2938](https://github.com/tldraw/tldraw/pull/2938))

- Added `isWrapMode` to user preferences.
- Added Wrap Mode toggle to user preferences menu.

#### Don't allow edge scrolling when camera is frozen. ([#2992](https://github.com/tldraw/tldraw/pull/2992))

- Don't allow edge scrolling when camera is frozen.

#### Setup papercuts ([#2987](https://github.com/tldraw/tldraw/pull/2987))

- Add a brief release note for your PR here.

#### Add external dialog example ([#2887](https://github.com/tldraw/tldraw/pull/2887))

- Dev: Added an example for dialogs that go outside the component.

#### fix document name overlapping people menu ([#2970](https://github.com/tldraw/tldraw/pull/2970))

- Fix people menu overlapping with document name when it grew too large.

#### Make exportToBlob public ([#2983](https://github.com/tldraw/tldraw/pull/2983))

- Exposes the exportToBlob function for library users

#### export default ui items ([#2973](https://github.com/tldraw/tldraw/pull/2973))

- Components within default menu content components are now exported.

#### Show toast on upload error ([#2959](https://github.com/tldraw/tldraw/pull/2959))

- Adds a quick toast to show when image uploads fail.

#### Fix transparency toggle ([#2964](https://github.com/tldraw/tldraw/pull/2964))

- Fixes the Transparent toggle. The condition was accidentally flipped.

#### menu: rework File menu / ensure Export menu is present ([#2783](https://github.com/tldraw/tldraw/pull/2783))

- Composable UI: makes File items be more granularly accessible / usable
- Menu: show Export under the File menu.

#### ui events: prevent sending 2nd event unnecessarily ([#2921](https://github.com/tldraw/tldraw/pull/2921))

- Some cleanup on duplicate UI events being sent.

#### [fix] fit to content shown on groups ([#2946](https://github.com/tldraw/tldraw/pull/2946))

- Fix bug where "fit frame to content" would be shown when a group is selected.

#### fix structured clone reference in drawing ([#2945](https://github.com/tldraw/tldraw/pull/2945))

- Fixes a reference to structuredClone that caused a crash on older browsers.

#### [fix] Corejs imports ([#2940](https://github.com/tldraw/tldraw/pull/2940))

- Fixes a bug effecting some users related to corejs imports.

#### Add example for external UI ([#2846](https://github.com/tldraw/tldraw/pull/2846))

- Docs: Added external UI example.

#### Remove template references ([#2919](https://github.com/tldraw/tldraw/pull/2919))

- changes the doc site so it no longer references the site template

#### Fix keyboard shortcuts bugs ([#2936](https://github.com/tldraw/tldraw/pull/2936))

- [Fix] Keyboard shortcut focus bug

#### E2E Style Panel Tests ([#2878](https://github.com/tldraw/tldraw/pull/2878))

- Add style panel E2E tests

#### Fix undo/redo for Opacity Slider + Style dropdowns. ([#2933](https://github.com/tldraw/tldraw/pull/2933))

- Fixed issues where undo/redo entries were not being set up correctly for the opacity slider or the style dropdown menus.

#### Add custom static assets example, extract preloadFont ([#2932](https://github.com/tldraw/tldraw/pull/2932))

- Docs, added custom static assets example.

#### Fix frames not preserving shape order ([#2928](https://github.com/tldraw/tldraw/pull/2928))

- Fix an issue when framing shapes did not preserve the original order of the shapes.
- You can now frame shapes inside of the frame.

#### Bounds snapping shape ([#2909](https://github.com/tldraw/tldraw/pull/2909))

- Adds a custom bounds snapping shape

#### Improve dialog appearance on small components ([#2884](https://github.com/tldraw/tldraw/pull/2884))

- Dev: Made default dialogs work better when used in small components.

#### Better example intros ([#2912](https://github.com/tldraw/tldraw/pull/2912))

- Adds more info to the examples section of the docs.

#### docs: add star history and contributor list to README. ([#2914](https://github.com/tldraw/tldraw/pull/2914))

add star history and contributor list to README.

<img width="854" alt="image" src="https://github.com/tldraw/tldraw/assets/42437658/d0c73289-9fb1-4dc0-882a-0593ebc13895">


- Increases project transparency: This can help other developers understand the popularity and activity level of the project.

- Recognizes contributors: Listing contributors can recognize those who have contributed to the project, which may also motivate more people to participate in the project.

- Provides more information: The star history chart and contributor list provide more information for potential users or contributors, helping them make decisions about whether to use or participate in the project.

- Enhances the project's professionalism: A detailed README file can enhance the professionalism of the

---

#### 💥 Breaking Change

- `@tldraw/editor`
  - Don't add editor / app to window. [#2995](https://github.com/tldraw/tldraw/pull/2995) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- `@tldraw/editor`, `tldraw`
  - [feature] wrap mode [#2938](https://github.com/tldraw/tldraw/pull/2938) ([@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Make exportToBlob public [#2983](https://github.com/tldraw/tldraw/pull/2983) ([@ds300](https://github.com/ds300))
  - export default ui items [#2973](https://github.com/tldraw/tldraw/pull/2973) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Fix keyboard shortcuts bugs [#2936](https://github.com/tldraw/tldraw/pull/2936) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
  - Add custom static assets example, extract preloadFont [#2932](https://github.com/tldraw/tldraw/pull/2932) ([@steveruizok](https://github.com/steveruizok))
  - Export history hooks [#2926](https://github.com/tldraw/tldraw/pull/2926) ([@steveruizok](https://github.com/steveruizok))
  - Improve dialog appearance on small components [#2884](https://github.com/tldraw/tldraw/pull/2884) ([@TodePond](https://github.com/TodePond))

#### 🐛 Bug Fix

- husky: add +x chmod flag [#2986](https://github.com/tldraw/tldraw/pull/2986) ([@mimecuvalo](https://github.com/mimecuvalo))
- fix document name overlapping people menu [#2970](https://github.com/tldraw/tldraw/pull/2970) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- docs: Adjust max columns of contributor list in README. [#2917](https://github.com/tldraw/tldraw/pull/2917) ([@wangrongding](https://github.com/wangrongding))
- VS Code 2.0.25 [#2911](https://github.com/tldraw/tldraw/pull/2911) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `tldraw`
  - textfields: make them consistent [#2984](https://github.com/tldraw/tldraw/pull/2984) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Show toast on upload error [#2959](https://github.com/tldraw/tldraw/pull/2959) ([@ds300](https://github.com/ds300))
  - menu: export followup with different semantics for file menu [#2968](https://github.com/tldraw/tldraw/pull/2968) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix transparency toggle [#2964](https://github.com/tldraw/tldraw/pull/2964) ([@ds300](https://github.com/ds300))
  - menu: rework File menu / ensure Export menu is present [#2783](https://github.com/tldraw/tldraw/pull/2783) ([@mimecuvalo](https://github.com/mimecuvalo))
  - ui events: prevent sending 2nd event unnecessarily [#2921](https://github.com/tldraw/tldraw/pull/2921) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [fix] fit to content shown on groups [#2946](https://github.com/tldraw/tldraw/pull/2946) ([@steveruizok](https://github.com/steveruizok))
  - Fix frames not preserving shape order [#2928](https://github.com/tldraw/tldraw/pull/2928) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Don't allow edge scrolling when camera is frozen. [#2992](https://github.com/tldraw/tldraw/pull/2992) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - migrate shapes / assets as a store on `putContent` [#2971](https://github.com/tldraw/tldraw/pull/2971) ([@steveruizok](https://github.com/steveruizok))
  - [fix] double spinner [#2963](https://github.com/tldraw/tldraw/pull/2963) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Corejs imports [#2940](https://github.com/tldraw/tldraw/pull/2940) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Setup papercuts [#2987](https://github.com/tldraw/tldraw/pull/2987) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`
  - Prevent iframe embedding for dotcom (except on tldraw.com) [#2947](https://github.com/tldraw/tldraw/pull/2947) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `tldraw`
  - Expand props [#2948](https://github.com/tldraw/tldraw/pull/2948) ([@steveruizok](https://github.com/steveruizok))
  - Fix undo/redo for Opacity Slider + Style dropdowns. [#2933](https://github.com/tldraw/tldraw/pull/2933) ([@ds300](https://github.com/ds300))
- `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`
  - fix structured clone reference in drawing [#2945](https://github.com/tldraw/tldraw/pull/2945) ([@steveruizok](https://github.com/steveruizok))

#### ⚠️ Pushed to `main`

- better name for publish-new ([@ds300](https://github.com/ds300))
- remove dry run early return ([@ds300](https://github.com/ds300))
- better error message in publish-new.yml ([@ds300](https://github.com/ds300))
- fix error logging in publish-now.yml ([@ds300](https://github.com/ds300))
- fix bash thing ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- fix publishing scripts [#3006](https://github.com/tldraw/tldraw/pull/3006) ([@ds300](https://github.com/ds300))
- unbork "unbork publish-new" [#3003](https://github.com/tldraw/tldraw/pull/3003) ([@si14](https://github.com/si14))
- unbork publish-new [#2999](https://github.com/tldraw/tldraw/pull/2999) ([@ds300](https://github.com/ds300))
- remove yarn stuff from the templates and ignore it [#2997](https://github.com/tldraw/tldraw/pull/2997) ([@si14](https://github.com/si14))
- Implement new package publish process [#2996](https://github.com/tldraw/tldraw/pull/2996) ([@ds300](https://github.com/ds300))
- Use github actions to mirror templates from monorepo to appropriate repos [#2781](https://github.com/tldraw/tldraw/pull/2781) ([@si14](https://github.com/si14) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- tooling: notify team members if package.json/yarn has been updated [#2972](https://github.com/tldraw/tldraw/pull/2972) ([@mimecuvalo](https://github.com/mimecuvalo))
- Open iframe production links in new tab [#2966](https://github.com/tldraw/tldraw/pull/2966) ([@SomeHats](https://github.com/SomeHats))
- [examples] Log out the 'after' values of changes in StoreEventsExample [#2956](https://github.com/tldraw/tldraw/pull/2956) ([@ds300](https://github.com/ds300))
- [dx] Derive vercel routes from react-router config [#2937](https://github.com/tldraw/tldraw/pull/2937) ([@ds300](https://github.com/ds300))
- Update auto [#2952](https://github.com/tldraw/tldraw/pull/2952) ([@ds300](https://github.com/ds300))
- Fix an issue with publishing canary [#2931](https://github.com/tldraw/tldraw/pull/2931) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Make Vercel URL rewrites precise [#2913](https://github.com/tldraw/tldraw/pull/2913) ([@si14](https://github.com/si14))
- examples: let people copy out code [#2920](https://github.com/tldraw/tldraw/pull/2920) ([@mimecuvalo](https://github.com/mimecuvalo))
- Lokalise: Translations update [#2908](https://github.com/tldraw/tldraw/pull/2908) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/tldraw`, `tldraw`
  - tldraw_final_v6_final(old version).docx.pdf [#2998](https://github.com/tldraw/tldraw/pull/2998) ([@SomeHats](https://github.com/SomeHats))
- `tldraw`
  - license: make them not be scrubbed out in code munging [#2976](https://github.com/tldraw/tldraw/pull/2976) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 📝 Documentation

- Add external dialog example [#2887](https://github.com/tldraw/tldraw/pull/2887) ([@TodePond](https://github.com/TodePond))
- speech bubble handle -> tail [#2975](https://github.com/tldraw/tldraw/pull/2975) ([@SomeHats](https://github.com/SomeHats))
- [docs] Fix mailtos [#2961](https://github.com/tldraw/tldraw/pull/2961) ([@steveruizok](https://github.com/steveruizok))
- [docs] content [#2958](https://github.com/tldraw/tldraw/pull/2958) ([@steveruizok](https://github.com/steveruizok))
- Add example for external UI [#2846](https://github.com/tldraw/tldraw/pull/2846) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Remove template references [#2919](https://github.com/tldraw/tldraw/pull/2919) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Bounds snapping shape [#2909](https://github.com/tldraw/tldraw/pull/2909) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Better example intros [#2912](https://github.com/tldraw/tldraw/pull/2912) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- docs: add star history and contributor list to README. [#2914](https://github.com/tldraw/tldraw/pull/2914) ([@wangrongding](https://github.com/wangrongding))
- `tldraw`
  - [docs] design shuffle [#2951](https://github.com/tldraw/tldraw/pull/2951) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- E2E Style Panel Tests [#2878](https://github.com/tldraw/tldraw/pull/2878) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- `tldraw`
  - Adding a single E2E test per menu [#2954](https://github.com/tldraw/tldraw/pull/2954) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - bump typescript / api-extractor [#2949](https://github.com/tldraw/tldraw/pull/2949) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 9

- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- 荣顶 ([@wangrongding](https://github.com/wangrongding))

---

# v2.0.0-beta.4 (Wed Feb 21 2024)

### Release Notes

#### menu fixes: add company links in general; add tracking to lang menu ([#2902](https://github.com/tldraw/tldraw/pull/2902))

- Add company menu links back in and make sure the Language menu is updated on change.

#### Fix some menu issues on mobile ([#2906](https://github.com/tldraw/tldraw/pull/2906))

- Add a brief release note for your PR here.

#### [experiment] paste: show little puff when pasting to denote something happened ([#2787](https://github.com/tldraw/tldraw/pull/2787))

- UI: add a little 'puff' when something is pasted to tell that something has happened.

#### Fix custom keyboard shortcut dialog example ([#2876](https://github.com/tldraw/tldraw/pull/2876))

- Docs: Fixed custom keyboard shortcut dialog example.

#### Sentence case all example titles ([#2889](https://github.com/tldraw/tldraw/pull/2889))

- Docs: Made the examples titles sentence case.

#### Fix 'style panel doesn't always disappear if you switch to the hand/laser tools' ([#2886](https://github.com/tldraw/tldraw/pull/2886))

- Fixes an bug causing the opacity slider to show up in the move tool and laser pointer tool.

#### Faster validations + record reference stability at the same time ([#2848](https://github.com/tldraw/tldraw/pull/2848))

- Add a brief release note for your PR here.

#### [Snapping 6/6] Self-snapping API ([#2869](https://github.com/tldraw/tldraw/pull/2869))

- Line handles now snap to other handles on the same line when holding command

#### Editable shape example ([#2853](https://github.com/tldraw/tldraw/pull/2853))

- Adds an editable shape example

#### Fix dialog title styles ([#2873](https://github.com/tldraw/tldraw/pull/2873))

- Unreleased bug: Fixed dialog titles appearance.

#### Fix some incorrect translation keys ([#2870](https://github.com/tldraw/tldraw/pull/2870))

- Unreleased issue. Fixed some translation keys being wrong.

#### Allow users to set document name and use it for exporting / saving ([#2685](https://github.com/tldraw/tldraw/pull/2685))

- Allow users to name their documents.

#### Fix some problem under Windows OS development enviroment ([#2722](https://github.com/tldraw/tldraw/pull/2722))

- stablize language.ts when running under different OS language.
- add isWin32() and posixPath() to format the parameter of glob.sync().
- use child_process.exec() instead of child_process.execFile() for win32 platform.

#### doc: fix typo in examples ([#2859](https://github.com/tldraw/tldraw/pull/2859))

- fix typo in examples

#### [fix] grid, other insets ([#2858](https://github.com/tldraw/tldraw/pull/2858))

- Fixes a bug with the grid not appearing.

#### E2e tests for the toolbar ([#2709](https://github.com/tldraw/tldraw/pull/2709))

- Add e2e tests for the toolbar

#### fix frame style panel ([#2851](https://github.com/tldraw/tldraw/pull/2851))

- Fixes an issue with the opacity slider getting squished.

#### Add component for viewing an image of a snapshot ([#2804](https://github.com/tldraw/tldraw/pull/2804))

- Dev: Added the `TldrawImage` component.

#### fix typo(examples/hosted-images) ([#2849](https://github.com/tldraw/tldraw/pull/2849))

- Fixed a typo in the description in the hosted-images example.

#### ui: refactor breakpoints to fit in an enum ([#2843](https://github.com/tldraw/tldraw/pull/2843))

- Refactor breakpoints into an enum.

#### [Snapping 5/5] Better handle snapping for geo shapes ([#2845](https://github.com/tldraw/tldraw/pull/2845))

- You can now snap the handles of lines to the corners of rectangles, stars, triangles, etc.

#### [Snapping 4/5] Add handle-point snapping ([#2841](https://github.com/tldraw/tldraw/pull/2841))

- Line handles

#### [Snapping 3/5] Custom snapping API ([#2793](https://github.com/tldraw/tldraw/pull/2793))

- Add `ShapeUtil.getSnapInfo` for customising shape snaps.

#### Composable custom UI ([#2796](https://github.com/tldraw/tldraw/pull/2796))

- Add a brief release note for your PR here.

#### errors: improve msg in dialog when error happens ([#2844](https://github.com/tldraw/tldraw/pull/2844))

- Improves error dialog messaging.

#### [Snapping 2/5] Fix line-handle mid-point snapping ([#2831](https://github.com/tldraw/tldraw/pull/2831))

- Simplify the contents of `TLLineShape.props.handles`

#### Readonly defaults to the hand tool ([#2833](https://github.com/tldraw/tldraw/pull/2833))

- Shared projects in  read only mode now default to the hand tool

#### Improve signia error handling ([#2835](https://github.com/tldraw/tldraw/pull/2835))

- Add a brief release note for your PR here.

#### [docs] Fix missing Persistence page ([#2828](https://github.com/tldraw/tldraw/pull/2828))

- Add a brief release note for your PR here.

#### emojis! 🧑‍🎨 🎨 ✏️ ([#2814](https://github.com/tldraw/tldraw/pull/2814))

- Adds emoji picker to text fields.

---

#### 💥 Breaking Change

- `@tldraw/tldraw`, `@tldraw/tlschema`
  - Add line IDs & fractional indexes [#2890](https://github.com/tldraw/tldraw/pull/2890) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Allow users to set document name and use it for exporting / saving [#2685](https://github.com/tldraw/tldraw/pull/2685) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - UI components round two [#2847](https://github.com/tldraw/tldraw/pull/2847) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/validate`
  - Composable custom UI [#2796](https://github.com/tldraw/tldraw/pull/2796) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [Snapping 2/5] Fix line-handle mid-point snapping [#2831](https://github.com/tldraw/tldraw/pull/2831) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- Readonly defaults to the hand tool [#2833](https://github.com/tldraw/tldraw/pull/2833) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [Snapping 6/6] Self-snapping API [#2869](https://github.com/tldraw/tldraw/pull/2869) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
  - Add component for viewing an image of a snapshot [#2804](https://github.com/tldraw/tldraw/pull/2804) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [Snapping 4/5] Add handle-point snapping [#2841](https://github.com/tldraw/tldraw/pull/2841) ([@SomeHats](https://github.com/SomeHats))
  - [Snapping 3/5] Custom snapping API [#2793](https://github.com/tldraw/tldraw/pull/2793) ([@SomeHats](https://github.com/SomeHats))
  - emojis! 🧑‍🎨 🎨 ✏️ [#2814](https://github.com/tldraw/tldraw/pull/2814) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - [handles] Line shape handles -> points [#2856](https://github.com/tldraw/tldraw/pull/2856) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - [Snapping 5/5] Better handle snapping for geo shapes [#2845](https://github.com/tldraw/tldraw/pull/2845) ([@SomeHats](https://github.com/SomeHats))
  - Remove pointer check for arrow labels [#2824](https://github.com/tldraw/tldraw/pull/2824) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - Lokalise: Translations update [#2830](https://github.com/tldraw/tldraw/pull/2830) ([@TodePond](https://github.com/TodePond) [@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fix

- fix invite others [#2904](https://github.com/tldraw/tldraw/pull/2904) ([@SomeHats](https://github.com/SomeHats))
- Update Hungarian and Korean [#2871](https://github.com/tldraw/tldraw/pull/2871) ([@TodePond](https://github.com/TodePond))
- docs: tweak search kbd placement to match loupe [#2834](https://github.com/tldraw/tldraw/pull/2834) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/tldraw`
  - menu fixes: add company links in general; add tracking to lang menu [#2902](https://github.com/tldraw/tldraw/pull/2902) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix some menu issues on mobile [#2906](https://github.com/tldraw/tldraw/pull/2906) ([@TodePond](https://github.com/TodePond))
  - remove stray 'console' [#2881](https://github.com/tldraw/tldraw/pull/2881) ([@ds300](https://github.com/ds300))
  - Fix dialog title styles [#2873](https://github.com/tldraw/tldraw/pull/2873) ([@TodePond](https://github.com/TodePond))
  - Fix some incorrect translation keys [#2870](https://github.com/tldraw/tldraw/pull/2870) ([@TodePond](https://github.com/TodePond))
  - fix frame style panel [#2851](https://github.com/tldraw/tldraw/pull/2851) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - ui: refactor breakpoints to fit in an enum [#2843](https://github.com/tldraw/tldraw/pull/2843) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/validate`
  - Fix object validator [#2897](https://github.com/tldraw/tldraw/pull/2897) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [experiment] paste: show little puff when pasting to denote something happened [#2787](https://github.com/tldraw/tldraw/pull/2787) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - Fix 'style panel doesn't always disappear if you switch to the hand/laser tools' [#2886](https://github.com/tldraw/tldraw/pull/2886) ([@ds300](https://github.com/ds300))
  - Roundup fixes [#2862](https://github.com/tldraw/tldraw/pull/2862) ([@steveruizok](https://github.com/steveruizok))
  - [fix] grid, other insets [#2858](https://github.com/tldraw/tldraw/pull/2858) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/validate`
  - Faster validations + record reference stability at the same time [#2848](https://github.com/tldraw/tldraw/pull/2848) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - [fix] pointer capture logging when debug flag is off [#2850](https://github.com/tldraw/tldraw/pull/2850) ([@steveruizok](https://github.com/steveruizok))
  - errors: improve msg in dialog when error happens [#2844](https://github.com/tldraw/tldraw/pull/2844) ([@mimecuvalo](https://github.com/mimecuvalo))
  - seo: take 2 [#2817](https://github.com/tldraw/tldraw/pull/2817) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - [fix] sticky note bug [#2836](https://github.com/tldraw/tldraw/pull/2836) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - [Snapping 1/5] Validation & strict types for fractional indexes [#2827](https://github.com/tldraw/tldraw/pull/2827) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/state`
  - Improve signia error handling [#2835](https://github.com/tldraw/tldraw/pull/2835) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- Fix some problem under Windows OS development enviroment [#2722](https://github.com/tldraw/tldraw/pull/2722) ([@Rokixy](https://github.com/Rokixy))
- fix typo(examples/hosted-images) [#2849](https://github.com/tldraw/tldraw/pull/2849) ([@pocari](https://github.com/pocari))
- ✋ humans.txt [#2842](https://github.com/tldraw/tldraw/pull/2842) ([@mimecuvalo](https://github.com/mimecuvalo))
- examples: rename ui events and increase priority [#2840](https://github.com/tldraw/tldraw/pull/2840) ([@mimecuvalo](https://github.com/mimecuvalo))
- repair Huppy's handling of LICENCE [#2821](https://github.com/tldraw/tldraw/pull/2821) ([@si14](https://github.com/si14))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/validate`
  - Check tsconfig "references" arrays [#2891](https://github.com/tldraw/tldraw/pull/2891) ([@ds300](https://github.com/ds300))
- `@tldraw/tldraw`
  - Fix custom keyboard shortcut dialog example [#2876](https://github.com/tldraw/tldraw/pull/2876) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - dev: swap yarn test and test-dev for better dx [#2773](https://github.com/tldraw/tldraw/pull/2773) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Revert "emojis! 🧑‍🎨 🎨 ✏️ (#2814)" [#2822](https://github.com/tldraw/tldraw/pull/2822) ([@si14](https://github.com/si14))

#### 📝 Documentation

- Sentence case all example titles [#2889](https://github.com/tldraw/tldraw/pull/2889) ([@TodePond](https://github.com/TodePond))
- docs: fix scroll position and theming issue for code snippets [#2883](https://github.com/tldraw/tldraw/pull/2883) ([@mimecuvalo](https://github.com/mimecuvalo))
- Editable shape example [#2853](https://github.com/tldraw/tldraw/pull/2853) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- doc: fix typo in examples [#2859](https://github.com/tldraw/tldraw/pull/2859) ([@Rokixy](https://github.com/Rokixy))
- [docs] Fix missing Persistence page [#2828](https://github.com/tldraw/tldraw/pull/2828) ([@ds300](https://github.com/ds300))

#### 🧪 Tests

- `@tldraw/tldraw`
  - E2e tests for the toolbar [#2709](https://github.com/tldraw/tldraw/pull/2709) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### Authors: 10

- [@Rokixy](https://github.com/Rokixy)
- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- pocari ([@pocari](https://github.com/pocari))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.3 (Tue Feb 13 2024)

### Release Notes

#### Fix camera. ([#2818](https://github.com/tldraw/tldraw/pull/2818))

- Fixes an issue with the camera and zooming.

#### Use canvas bounds for viewport bounds ([#2798](https://github.com/tldraw/tldraw/pull/2798))

- Changes the source of truth for the viewport page bounds to be the canvas instead.

#### docs: better code snippets ([#2801](https://github.com/tldraw/tldraw/pull/2801))

- Docs: reworks code snippets

#### Quick start guide ([#2692](https://github.com/tldraw/tldraw/pull/2692))

- Add a quick start guide

#### docs: fix scrolling issue with sidebar ([#2791](https://github.com/tldraw/tldraw/pull/2791))

- Docs: fix up scrolling.

#### Style UI based on component size instead of window size ([#2758](https://github.com/tldraw/tldraw/pull/2758))

- Dev: Fixed the default tldraw UI not matching the size of the component.

#### examples: clean up Canvas/Store events and make UiEvents have code snippets ([#2770](https://github.com/tldraw/tldraw/pull/2770))

- Examples: add an interactive example that shows code snippets for the SDK.

#### Fixed actions menu opening in wrong direction on mobile (and add an inline layout example) ([#2730](https://github.com/tldraw/tldraw/pull/2730))

- Dev: Fixed the actions menu opening in the wrong direction.

#### error reporting: rm ids from msgs for better Sentry grouping ([#2738](https://github.com/tldraw/tldraw/pull/2738))

- Error reporting: improve grouping for Sentry.

#### rearrange export / import from tldraw to help builds ([#2739](https://github.com/tldraw/tldraw/pull/2739))

- Build: Help with import/export error on some builds.

#### i18n: add HR 🇭🇷 ([#2778](https://github.com/tldraw/tldraw/pull/2778))

- i18n: add Croatian / Hrvatski.

#### arrows: account for another NaN ([#2753](https://github.com/tldraw/tldraw/pull/2753))

- Fixes zero-width arrow NaN computation when moving the label.

#### Split snap manager into ShapeBoundsSnaps and HandleSnaps ([#2747](https://github.com/tldraw/tldraw/pull/2747))

- `SnapLine`s are now called `SnapIndicator`s
- Snapping methods moved from `editor.snaps` to `editor.snaps.shapeBounds` and `editor.snaps.handles` depending on the type of snapping you're trying to do.

#### arrows: update cursor only when in Select mode ([#2742](https://github.com/tldraw/tldraw/pull/2742))

- Cursor tweak for arrow labels.

#### Fix pinch zooming ([#2748](https://github.com/tldraw/tldraw/pull/2748))

- None: Fixes an unreleased bug.

#### docs: disable ai search for now ([#2740](https://github.com/tldraw/tldraw/pull/2740))

- Docs: disable AI search for now.

#### seo: attempt at avoiding a "soft 404" with there being thin content on dotcom ([#2737](https://github.com/tldraw/tldraw/pull/2737))

- Add a "Loading..." text to help SEO.

#### docs: add full-text search ([#2735](https://github.com/tldraw/tldraw/pull/2735))

- Docs: Add full-text search.

#### docs: fix CORS issue and broken example link ([#2727](https://github.com/tldraw/tldraw/pull/2727))

- Fixes docs CORS issue.

#### docs: rework search UI ([#2723](https://github.com/tldraw/tldraw/pull/2723))

- Docs: rework the search to be an inline dropdown.

#### [fix] VSCode keyboard shortcuts while editing text ([#2721](https://github.com/tldraw/tldraw/pull/2721))

- Fixed a bug in the VS Code that prevented keyboard shortcuts from working in text labels.

#### [Fix] Camera coordinate issues ([#2719](https://github.com/tldraw/tldraw/pull/2719))

- Fixed bugs with `getViewportScreenCenter` that could effect zooming and pinching on editors that aren't full screen

#### fix(docs): fix user-interface.mdx ([#2700](https://github.com/tldraw/tldraw/pull/2700))

Add `newMenuItem` creation in "Toolbar and Menus" example

#### docs: more cleanup following restructure ([#2702](https://github.com/tldraw/tldraw/pull/2702))

- Docs: further cleanup following restructure.

#### reactive context menu overrides ([#2697](https://github.com/tldraw/tldraw/pull/2697))

- Context Menu overrides will now update reactively

#### [Fix] Note shape border radius ([#2696](https://github.com/tldraw/tldraw/pull/2696))

- Fixes a bad border radius

#### arrows: separate out handle behavior from labels ([#2621](https://github.com/tldraw/tldraw/pull/2621))

- Arrow labels: provide more polish on label placement

#### docs: fix up gen links to point to the new /reference section ([#2690](https://github.com/tldraw/tldraw/pull/2690))

- Fix up doc links with /gen links

#### docs: rework docs site to have different sections ([#2686](https://github.com/tldraw/tldraw/pull/2686))

- Rework our docs site to pull together the examples app and reference section more cohesively.

#### Fix svg exporting for images with not fully qualified url (`/tldraw.png` or `./tldraw.png`) ([#2676](https://github.com/tldraw/tldraw/pull/2676))

- Fix the svg export for images that have a local url.

#### Remove examples app landing page ([#2678](https://github.com/tldraw/tldraw/pull/2678))

- Remove examples app landing page

#### dev: add test-dev command for easier testing of packages ([#2627](https://github.com/tldraw/tldraw/pull/2627))

- Adds easier testing command for individual packages.

#### debug: start adding more tooling for debugging when interacting with shapes ([#2560](https://github.com/tldraw/tldraw/pull/2560))

- Adds more information in the debug view about what shape is selected and coordinates.

#### Grouping examples into categories ([#2585](https://github.com/tldraw/tldraw/pull/2585))

- Add collapsible categories to the examples app

#### [Fix] Overlapping non-adjacent handles ([#2663](https://github.com/tldraw/tldraw/pull/2663))

- Fixed a bug with virtual / create handle visibility.

#### [Fix] Missing bend handles on curved arrows ([#2661](https://github.com/tldraw/tldraw/pull/2661))

- Fixed a bug where the bend handle on arrows with a large curve could sometimes be hidden.

#### Improved duplication ([#2480](https://github.com/tldraw/tldraw/pull/2480))

- Add a brief release note for your PR here.

#### Positional keyboard shortcuts for toolbar ([#2409](https://github.com/tldraw/tldraw/pull/2409))

- You can now use the number keys to select the corresponding tool from the toolbar

#### Add button to Examples to request an example ([#2597](https://github.com/tldraw/tldraw/pull/2597))

- Add a button to request an example to the examples app

#### Update README and examples copy in the docs ([#2594](https://github.com/tldraw/tldraw/pull/2594))

- Update examples copy and tldraw README

#### Remove repeated word in CONTRIBUTING.md ([#2651](https://github.com/tldraw/tldraw/pull/2651))

- Remove repeated word in CONTRIBUTING.md.

#### [Fix] Wheel bug ([#2657](https://github.com/tldraw/tldraw/pull/2657))

- Fixed a bug with the mouse wheel effecting the pointer location when the editor was not full screen

#### Update layout.tsx ([#2619](https://github.com/tldraw/tldraw/pull/2619))

- Add a brief release note for your PR here.

#### [Improvement] Share zone styling ([#2628](https://github.com/tldraw/tldraw/pull/2628))

- Tweaked user avatar size.

#### [draft] Keep editor focus after losing focus of an action button ([#2630](https://github.com/tldraw/tldraw/pull/2630))

- Fixed a bug where keyboard shortcuts could stop working after using an action button.

#### Fix nudge bug ([#2634](https://github.com/tldraw/tldraw/pull/2634))

- Fixes a bug with keyboard nudging.

#### menus: address several little big things about menu styling ([#2624](https://github.com/tldraw/tldraw/pull/2624))

- Fixes nits on styling on our Radix menus.

#### i18n: sort languages by name, not by locale code ([#2625](https://github.com/tldraw/tldraw/pull/2625))

- Sorts the locale list by locale name, not code.

#### style: fix missing titles on vertical align menu ([#2623](https://github.com/tldraw/tldraw/pull/2623))

- Adds missing titles to vertical align menu.

#### Only actions on selected shapes if we are in select tool. ([#2617](https://github.com/tldraw/tldraw/pull/2617))

- Disable actions that work on selections when we are not in select tool as it makes it not obvious what the target for these actions.

#### debug: add FPS counter ([#2558](https://github.com/tldraw/tldraw/pull/2558))

- Adds FPS counter to debug panel.

#### Fix ios export crash ([#2615](https://github.com/tldraw/tldraw/pull/2615))

- iOS Safari: Fixed a crash when exporting large images.

#### arrows: add ability to change label placement ([#2557](https://github.com/tldraw/tldraw/pull/2557))

- Adds ability to change label position on arrows.

#### Add context toolbar example. ([#2596](https://github.com/tldraw/tldraw/pull/2596))

- Add context toolbar example.

#### Export TLCommandHistoryOptions type ([#2598](https://github.com/tldraw/tldraw/pull/2598))

- Added TLCommandHistoryOptions to the exported types.

#### [improvement] better comma control for pointer ([#2568](https://github.com/tldraw/tldraw/pull/2568))

- Improve comma key as a replacement for pointer down / pointer up.

#### fix: replaced dead links ([#2567](https://github.com/tldraw/tldraw/pull/2567))

- N/A

#### [dotcom] Delete service worker, cache tldraw assets ([#2552](https://github.com/tldraw/tldraw/pull/2552))

- Fix 'could not load assets' error that we often see on tldraw.com after a deploy

#### Allow snapping of shapes to the frame when dragging inside the frame. ([#2520](https://github.com/tldraw/tldraw/pull/2520))

- Adds snapping to frames when dragging shapes inside a frame.

#### Allow dismissing dialogs by clicking backdrop ([#2497](https://github.com/tldraw/tldraw/pull/2497))

- Allows dismissing dialogs by clicking the backdrop.

#### Fix the first run of dev script. ([#2484](https://github.com/tldraw/tldraw/pull/2484))

- Fix first `yarn dev` experience.

#### Prevent overlay content disappearing at some browser zoom levels ([#2483](https://github.com/tldraw/tldraw/pull/2483))

- removes the internal `useDprMultiple` hook

#### add keyboard shortcuts example ([#2474](https://github.com/tldraw/tldraw/pull/2474))

- Add keyboard shortcuts example

#### [hot take] Make dark mode colours pop more ([#2478](https://github.com/tldraw/tldraw/pull/2478))

- Tweaked dark mode colour styles to make them pop more.

#### fix typo in hideRotateHandle method ([#2473](https://github.com/tldraw/tldraw/pull/2473))

- fix typo in hideRotateHandle method

#### Maintain bindings while translating arrows ([#2424](https://github.com/tldraw/tldraw/pull/2424))

- You can now move arrows without them becoming unattached the shapes they're pointing to

#### [improvement] update dark mode ([#2468](https://github.com/tldraw/tldraw/pull/2468))

- Updated dark mode colors.

#### rename and annotate user presence example ([#2462](https://github.com/tldraw/tldraw/pull/2462))

- annotate user presence example and rename to presence-record

#### annotate onthecanvas example ([#2459](https://github.com/tldraw/tldraw/pull/2459))

- annotate onthecanvas example

#### annotate snapshot example ([#2454](https://github.com/tldraw/tldraw/pull/2454))

- annotate snapshot example

#### Fix and annotate minimal example ([#2448](https://github.com/tldraw/tldraw/pull/2448))

- Fix and annotate minimal example

#### annotate zones example ([#2461](https://github.com/tldraw/tldraw/pull/2461))

- annotate zones example

#### annotate ui events example ([#2460](https://github.com/tldraw/tldraw/pull/2460))

- annotate ui events example

#### Annotate shape meta data example ([#2453](https://github.com/tldraw/tldraw/pull/2453))

- Annotate shape meta data example

#### Annotate example for using Tldraw component in a scrollable container ([#2452](https://github.com/tldraw/tldraw/pull/2452))

- Annotate example for using Tldraw component in a scrollable container

#### Annotate example for making editor read-only ([#2451](https://github.com/tldraw/tldraw/pull/2451))

- Annotate example for making editor read-only

#### Fix typos and add comments for persistence example ([#2450](https://github.com/tldraw/tldraw/pull/2450))

- Fix typos and add comments for persistence example

#### Fix bookmark info for VS Code ([#2449](https://github.com/tldraw/tldraw/pull/2449))

- Fix bookmark image and description for VS code extension.

#### [fix] disable vertical edge resizing for text on mobile ([#2456](https://github.com/tldraw/tldraw/pull/2456))

- Add a brief release note for your PR here.

#### Don't bother measuring canvas max size for small images ([#2442](https://github.com/tldraw/tldraw/pull/2442))

- Android: Sped up exporting and importing images.

#### [Minor] change Simplified Chinese label to Chinese ([#2434](https://github.com/tldraw/tldraw/pull/2434))

- Changed the label for the Simplified Chinese language from `Chinese - Simplified` to `简体中文`, following the convention of other languages.
- Updated the API and relevant documentation through build scripts.

#### annotate external sources example ([#2414](https://github.com/tldraw/tldraw/pull/2414))

- Adds annotation to the external sources example.

#### annotate multiple example ([#2431](https://github.com/tldraw/tldraw/pull/2431))

- annotate multiple example

#### annotate force mobile example ([#2421](https://github.com/tldraw/tldraw/pull/2421))

- annotate force mobile example

#### annotate hosted images example ([#2422](https://github.com/tldraw/tldraw/pull/2422))

- annotate hosted images example

#### annotate local images example ([#2423](https://github.com/tldraw/tldraw/pull/2423))

- annotate local images example

#### Lokalise: Translations update ([#2418](https://github.com/tldraw/tldraw/pull/2418))

- Added Hungarian translations.
- Updated Turkish translations.

#### annotate meta oncreate example ([#2426](https://github.com/tldraw/tldraw/pull/2426))

- annotate meta oncreate example

#### Annotate exploded example ([#2413](https://github.com/tldraw/tldraw/pull/2413))

- Adds annotation to exploded example
- imports all default components instead of just a few

#### annotate hide-ui example ([#2420](https://github.com/tldraw/tldraw/pull/2420))

- Annotate hide ui example

#### Annotate custom ui example ([#2408](https://github.com/tldraw/tldraw/pull/2408))

- Adds annotation to the custom ui example

#### [improvement] account for coarse pointers / insets in edge scrolling ([#2401](https://github.com/tldraw/tldraw/pull/2401))

- Add `instanceState.insets` to track which edges of the component are inset from the edges of the document body.
- Improve behavior around edge scrolling

#### Custom components annotation ([#2403](https://github.com/tldraw/tldraw/pull/2403))

- Annotate the custom components example.

#### annotate meta onchange ([#2430](https://github.com/tldraw/tldraw/pull/2430))

- annotate meta onchange

---

#### 💥 Breaking Change

- `@tldraw/editor`, `@tldraw/tldraw`
  - Use canvas bounds for viewport bounds [#2798](https://github.com/tldraw/tldraw/pull/2798) ([@steveruizok](https://github.com/steveruizok))
  - Remove Geometry2d.isSnappable [#2768](https://github.com/tldraw/tldraw/pull/2768) ([@SomeHats](https://github.com/SomeHats))
  - [Fix] Camera coordinate issues [#2719](https://github.com/tldraw/tldraw/pull/2719) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/utils`
  - Split snap manager into ShapeBoundsSnaps and HandleSnaps [#2747](https://github.com/tldraw/tldraw/pull/2747) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tldraw`, `@tldraw/utils`
  - faster image processing in default asset handler [#2441](https://github.com/tldraw/tldraw/pull/2441) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- docs: rework search UI [#2723](https://github.com/tldraw/tldraw/pull/2723) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - [dx] use Biome instead of Prettier, part 2 [#2731](https://github.com/tldraw/tldraw/pull/2731) ([@si14](https://github.com/si14))
- `@tldraw/assets`, `@tldraw/tlschema`
  - [dx] use Biome instead of Prettier, part 1 [#2729](https://github.com/tldraw/tldraw/pull/2729) ([@si14](https://github.com/si14))
- `@tldraw/tldraw`
  - debug: start adding more tooling for debugging when interacting with shapes [#2560](https://github.com/tldraw/tldraw/pull/2560) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Positional keyboard shortcuts for toolbar [#2409](https://github.com/tldraw/tldraw/pull/2409) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - Improved duplication [#2480](https://github.com/tldraw/tldraw/pull/2480) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@MitjaBezensek](https://github.com/MitjaBezensek) [@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`
  - debug: add FPS counter [#2558](https://github.com/tldraw/tldraw/pull/2558) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
  - [improvement] better comma control for pointer [#2568](https://github.com/tldraw/tldraw/pull/2568) ([@steveruizok](https://github.com/steveruizok))
  - Allow snapping of shapes to the frame when dragging inside the frame. [#2520](https://github.com/tldraw/tldraw/pull/2520) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Maintain bindings while translating arrows [#2424](https://github.com/tldraw/tldraw/pull/2424) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
  - [improvement] update dark mode [#2468](https://github.com/tldraw/tldraw/pull/2468) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - arrows: add ability to change label placement [#2557](https://github.com/tldraw/tldraw/pull/2557) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
  - [improvement] account for coarse pointers / insets in edge scrolling [#2401](https://github.com/tldraw/tldraw/pull/2401) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`
  - [dotcom] Delete service worker, cache tldraw assets [#2552](https://github.com/tldraw/tldraw/pull/2552) ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fix

- VS Code 2.0.24 [#2816](https://github.com/tldraw/tldraw/pull/2816) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- menu: just have an empty space for checked menuitems [#2785](https://github.com/tldraw/tldraw/pull/2785) ([@mimecuvalo](https://github.com/mimecuvalo))
- VS Code 2.0.23 [#2756](https://github.com/tldraw/tldraw/pull/2756) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- seo: attempt at avoiding a "soft 404" with there being thin content on dotcom [#2737](https://github.com/tldraw/tldraw/pull/2737) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: add full-text search [#2735](https://github.com/tldraw/tldraw/pull/2735) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: fix up gen links to point to the new /reference section [#2690](https://github.com/tldraw/tldraw/pull/2690) ([@mimecuvalo](https://github.com/mimecuvalo))
- [DX] Use tabs in JSON.stringify [#2674](https://github.com/tldraw/tldraw/pull/2674) ([@steveruizok](https://github.com/steveruizok))
- [Improvement] Share zone styling [#2628](https://github.com/tldraw/tldraw/pull/2628) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- VS Code 2.0.22 [#2500](https://github.com/tldraw/tldraw/pull/2500) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- fix geo cloud icon [#2485](https://github.com/tldraw/tldraw/pull/2485) ([@ds300](https://github.com/ds300))
- Update README.md [#2464](https://github.com/tldraw/tldraw/pull/2464) ([@steveruizok](https://github.com/steveruizok))
- Fix bookmark info for VS Code [#2449](https://github.com/tldraw/tldraw/pull/2449) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix the publish script [#2440](https://github.com/tldraw/tldraw/pull/2440) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Lokalise: Translations update [#2418](https://github.com/tldraw/tldraw/pull/2418) ([@TodePond](https://github.com/TodePond))
- VS Code 2.0.21 [#2438](https://github.com/tldraw/tldraw/pull/2438) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Fix camera. [#2818](https://github.com/tldraw/tldraw/pull/2818) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] overlays, custom brush example [#2806](https://github.com/tldraw/tldraw/pull/2806) ([@steveruizok](https://github.com/steveruizok))
  - Fix pinch zooming [#2748](https://github.com/tldraw/tldraw/pull/2748) ([@TodePond](https://github.com/TodePond))
  - [Improvement] Text measurement tweaks [#2670](https://github.com/tldraw/tldraw/pull/2670) ([@steveruizok](https://github.com/steveruizok))
  - [Fix] Missing bend handles on curved arrows [#2661](https://github.com/tldraw/tldraw/pull/2661) ([@steveruizok](https://github.com/steveruizok))
  - [Fix] Wheel bug [#2657](https://github.com/tldraw/tldraw/pull/2657) ([@steveruizok](https://github.com/steveruizok))
  - Export TLCommandHistoryOptions type [#2598](https://github.com/tldraw/tldraw/pull/2598) ([@steveruizok](https://github.com/steveruizok))
  - Prevent overlay content disappearing at some browser zoom levels [#2483](https://github.com/tldraw/tldraw/pull/2483) ([@ds300](https://github.com/ds300))
- `@tldraw/tldraw`
  - Style UI based on component size instead of window size [#2758](https://github.com/tldraw/tldraw/pull/2758) ([@TodePond](https://github.com/TodePond))
  - Fixed actions menu opening in wrong direction on mobile (and add an inline layout example) [#2730](https://github.com/tldraw/tldraw/pull/2730) ([@TodePond](https://github.com/TodePond))
  - rearrange export / import from tldraw to help builds [#2739](https://github.com/tldraw/tldraw/pull/2739) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Fix infinite cursor chat issue by partially reverting "reactive context menu overrides (#2697)" [#2775](https://github.com/tldraw/tldraw/pull/2775) ([@SomeHats](https://github.com/SomeHats))
  - [fix] VSCode keyboard shortcuts while editing text [#2721](https://github.com/tldraw/tldraw/pull/2721) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Debug panel text overflow [#2715](https://github.com/tldraw/tldraw/pull/2715) ([@steveruizok](https://github.com/steveruizok))
  - reactive context menu overrides [#2697](https://github.com/tldraw/tldraw/pull/2697) ([@SomeHats](https://github.com/SomeHats))
  - [Fix] Note shape border radius [#2696](https://github.com/tldraw/tldraw/pull/2696) ([@steveruizok](https://github.com/steveruizok))
  - Fix svg exporting for images with not fully qualified url (`/tldraw.png` or `./tldraw.png`) [#2676](https://github.com/tldraw/tldraw/pull/2676) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [draft] Keep editor focus after losing focus of an action button [#2630](https://github.com/tldraw/tldraw/pull/2630) ([@TodePond](https://github.com/TodePond))
  - menus: address several little big things about menu styling [#2624](https://github.com/tldraw/tldraw/pull/2624) ([@mimecuvalo](https://github.com/mimecuvalo))
  - style: fix missing titles on vertical align menu [#2623](https://github.com/tldraw/tldraw/pull/2623) ([@mimecuvalo](https://github.com/mimecuvalo))
  - Only actions on selected shapes if we are in select tool. [#2617](https://github.com/tldraw/tldraw/pull/2617) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix ios export crash [#2615](https://github.com/tldraw/tldraw/pull/2615) ([@TodePond](https://github.com/TodePond))
  - Allow dismissing dialogs by clicking backdrop [#2497](https://github.com/tldraw/tldraw/pull/2497) ([@ds300](https://github.com/ds300))
  - Fix the first run of dev script. [#2484](https://github.com/tldraw/tldraw/pull/2484) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Don't bother measuring canvas max size for small images [#2442](https://github.com/tldraw/tldraw/pull/2442) ([@TodePond](https://github.com/TodePond))
  - Fix main. [#2439](https://github.com/tldraw/tldraw/pull/2439) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/validate`
  - error reporting: rm ids from msgs for better Sentry grouping [#2738](https://github.com/tldraw/tldraw/pull/2738) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - i18n: add HR 🇭🇷 [#2778](https://github.com/tldraw/tldraw/pull/2778) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/editor`, `@tldraw/tldraw`
  - arrows: account for another NaN [#2753](https://github.com/tldraw/tldraw/pull/2753) ([@mimecuvalo](https://github.com/mimecuvalo))
  - arrows: update cursor only when in Select mode [#2742](https://github.com/tldraw/tldraw/pull/2742) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [Fix] Overlapping non-adjacent handles [#2663](https://github.com/tldraw/tldraw/pull/2663) ([@steveruizok](https://github.com/steveruizok))
  - Fix nudge bug [#2634](https://github.com/tldraw/tldraw/pull/2634) ([@steveruizok](https://github.com/steveruizok))
  - [tweak] dark mode colors [#2469](https://github.com/tldraw/tldraw/pull/2469) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - arrows: separate out handle behavior from labels [#2621](https://github.com/tldraw/tldraw/pull/2621) ([@mimecuvalo](https://github.com/mimecuvalo) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - i18n: sort languages by name, not by locale code [#2625](https://github.com/tldraw/tldraw/pull/2625) ([@mimecuvalo](https://github.com/mimecuvalo))
  - [hot take] Make dark mode colours pop more [#2478](https://github.com/tldraw/tldraw/pull/2478) ([@TodePond](https://github.com/TodePond) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - [Minor] change Simplified Chinese label to Chinese [#2434](https://github.com/tldraw/tldraw/pull/2434) ([@peilingjiang](https://github.com/peilingjiang))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Make sure correct dark mode colours get used in exports [#2492](https://github.com/tldraw/tldraw/pull/2492) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/validate`
  - Fix validation for local files. [#2447](https://github.com/tldraw/tldraw/pull/2447) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - [fix] disable vertical edge resizing for text on mobile [#2456](https://github.com/tldraw/tldraw/pull/2456) ([@mimecuvalo](https://github.com/mimecuvalo))

#### 🏠 Internal

- hello@tldraw.com -> sales@tldraw.com [#2774](https://github.com/tldraw/tldraw/pull/2774) ([@steveruizok](https://github.com/steveruizok))
- fix(infra): Fix routing config [#2741](https://github.com/tldraw/tldraw/pull/2741) ([@ds300](https://github.com/ds300))
- [dotcom] `TLSyncRoom` tidy [#2712](https://github.com/tldraw/tldraw/pull/2712) ([@steveruizok](https://github.com/steveruizok))
- [dx] add gen docs to gitignore [#2704](https://github.com/tldraw/tldraw/pull/2704) ([@steveruizok](https://github.com/steveruizok))
- return 404 on missing docs content instead of 500 [#2699](https://github.com/tldraw/tldraw/pull/2699) ([@si14](https://github.com/si14))
- fix prune preview deployment script [#2698](https://github.com/tldraw/tldraw/pull/2698) ([@SomeHats](https://github.com/SomeHats))
- fix sub-project vercel configs [#2687](https://github.com/tldraw/tldraw/pull/2687) ([@si14](https://github.com/si14))
- remove dotcom's vercel.json [#2689](https://github.com/tldraw/tldraw/pull/2689) ([@si14](https://github.com/si14))
- check for duplicate dependencies in CI [#2682](https://github.com/tldraw/tldraw/pull/2682) ([@si14](https://github.com/si14))
- Introduce a Cloudflare health worker [#2499](https://github.com/tldraw/tldraw/pull/2499) ([@si14](https://github.com/si14) [@steveruizok](https://github.com/steveruizok))
- [dx] Add docs to lazy caching. [#2672](https://github.com/tldraw/tldraw/pull/2672) ([@steveruizok](https://github.com/steveruizok))
- Restore vercel.jsons [#2650](https://github.com/tldraw/tldraw/pull/2650) ([@steveruizok](https://github.com/steveruizok))
- remove erroneous mount entry from fly.toml [#2644](https://github.com/tldraw/tldraw/pull/2644) ([@si14](https://github.com/si14))
- make Huppy deployable (again) [#2632](https://github.com/tldraw/tldraw/pull/2632) ([@si14](https://github.com/si14))
- Fix yarn clean [#2620](https://github.com/tldraw/tldraw/pull/2620) ([@si14](https://github.com/si14))
- Replace "original tldraw issue" with docs link. [#2599](https://github.com/tldraw/tldraw/pull/2599) ([@steveruizok](https://github.com/steveruizok))
- [Internal] Create build-docs.sh [#2569](https://github.com/tldraw/tldraw/pull/2569) ([@steveruizok](https://github.com/steveruizok))
- add dev / build scripts [#2551](https://github.com/tldraw/tldraw/pull/2551) ([@steveruizok](https://github.com/steveruizok))
- auto-it/typescript fails the release, patch the problem away while mods are asleep [#2498](https://github.com/tldraw/tldraw/pull/2498) ([@si14](https://github.com/si14))
- use github.ref rather than github.event.ref in deploy.yml [#2495](https://github.com/tldraw/tldraw/pull/2495) ([@SomeHats](https://github.com/SomeHats))
- add bash scripts for Vercel [#2494](https://github.com/tldraw/tldraw/pull/2494) ([@si14](https://github.com/si14))
- `@tldraw/tldraw`
  - examples: clean up Canvas/Store events and make UiEvents have code snippets [#2770](https://github.com/tldraw/tldraw/pull/2770) ([@mimecuvalo](https://github.com/mimecuvalo))
  - delete unused duplicated DraggingHandle.ts [#2463](https://github.com/tldraw/tldraw/pull/2463) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Unbiome [#2776](https://github.com/tldraw/tldraw/pull/2776) ([@si14](https://github.com/si14))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/validate`
  - Update the project to Node 20 [#2691](https://github.com/tldraw/tldraw/pull/2691) ([@si14](https://github.com/si14))
  - Add docs [#2470](https://github.com/tldraw/tldraw/pull/2470) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/store`, `@tldraw/tlschema`
  - make CI check for yarn install warnings and fix the peer deps ones we have [#2683](https://github.com/tldraw/tldraw/pull/2683) ([@si14](https://github.com/si14))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - dev: add test-dev command for easier testing of packages [#2627](https://github.com/tldraw/tldraw/pull/2627) ([@mimecuvalo](https://github.com/mimecuvalo))
- `@tldraw/state`, `@tldraw/store`
  - unbrivate, dot com in [#2475](https://github.com/tldraw/tldraw/pull/2475) ([@steveruizok](https://github.com/steveruizok) [@si14](https://github.com/si14) [@SomeHats](https://github.com/SomeHats))

#### 📝 Documentation

- [docs] Small style changes [#2805](https://github.com/tldraw/tldraw/pull/2805) ([@steveruizok](https://github.com/steveruizok))
- docs: better code snippets [#2801](https://github.com/tldraw/tldraw/pull/2801) ([@mimecuvalo](https://github.com/mimecuvalo))
- Quick start guide [#2692](https://github.com/tldraw/tldraw/pull/2692) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@mimecuvalo](https://github.com/mimecuvalo))
- docs: rm ... from some examples and fix up inset example [#2788](https://github.com/tldraw/tldraw/pull/2788) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: fix scrolling issue with sidebar [#2791](https://github.com/tldraw/tldraw/pull/2791) ([@mimecuvalo](https://github.com/mimecuvalo))
- docs: disable ai search for now [#2740](https://github.com/tldraw/tldraw/pull/2740) ([@mimecuvalo](https://github.com/mimecuvalo))
- [docs] Autocomplete styling tweaks [#2732](https://github.com/tldraw/tldraw/pull/2732) ([@steveruizok](https://github.com/steveruizok))
- docs: fix CORS issue and broken example link [#2727](https://github.com/tldraw/tldraw/pull/2727) ([@mimecuvalo](https://github.com/mimecuvalo))
- [docs] Fix links, little style tweaks [#2724](https://github.com/tldraw/tldraw/pull/2724) ([@steveruizok](https://github.com/steveruizok) [@mimecuvalo](https://github.com/mimecuvalo))
- [Docs] Tweak sidebar titles [#2706](https://github.com/tldraw/tldraw/pull/2706) ([@steveruizok](https://github.com/steveruizok))
- fix(docs): fix user-interface.mdx [#2700](https://github.com/tldraw/tldraw/pull/2700) ([@Rokixy](https://github.com/Rokixy) [@steveruizok](https://github.com/steveruizok))
- docs: more cleanup following restructure [#2702](https://github.com/tldraw/tldraw/pull/2702) ([@mimecuvalo](https://github.com/mimecuvalo))
- [Examples] Add a stupid 404 page [#2694](https://github.com/tldraw/tldraw/pull/2694) ([@steveruizok](https://github.com/steveruizok))
- docs: rework docs site to have different sections [#2686](https://github.com/tldraw/tldraw/pull/2686) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek) [@mimecuvalo](https://github.com/mimecuvalo) [@TodePond](https://github.com/TodePond) [@si14](https://github.com/si14))
- Remove examples app landing page [#2678](https://github.com/tldraw/tldraw/pull/2678) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Grouping examples into categories [#2585](https://github.com/tldraw/tldraw/pull/2585) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Add button to Examples to request an example [#2597](https://github.com/tldraw/tldraw/pull/2597) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Update README and examples copy in the docs [#2594](https://github.com/tldraw/tldraw/pull/2594) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Remove repeated word in CONTRIBUTING.md [#2651](https://github.com/tldraw/tldraw/pull/2651) ([@albjoh2](https://github.com/albjoh2))
- Update layout.tsx [#2619](https://github.com/tldraw/tldraw/pull/2619) ([@steveruizok](https://github.com/steveruizok))
- Add context toolbar example. [#2596](https://github.com/tldraw/tldraw/pull/2596) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Use simple example [#2561](https://github.com/tldraw/tldraw/pull/2561) ([@steveruizok](https://github.com/steveruizok))
- fix: replaced dead links [#2567](https://github.com/tldraw/tldraw/pull/2567) ([@alikiki](https://github.com/alikiki) [@steveruizok](https://github.com/steveruizok))
- add keyboard shortcuts example [#2474](https://github.com/tldraw/tldraw/pull/2474) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix translations link [#2477](https://github.com/tldraw/tldraw/pull/2477) ([@steveruizok](https://github.com/steveruizok))
- rename and annotate user presence example [#2462](https://github.com/tldraw/tldraw/pull/2462) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- annotate onthecanvas example [#2459](https://github.com/tldraw/tldraw/pull/2459) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate snapshot example [#2454](https://github.com/tldraw/tldraw/pull/2454) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix and annotate minimal example [#2448](https://github.com/tldraw/tldraw/pull/2448) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate zones example [#2461](https://github.com/tldraw/tldraw/pull/2461) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate ui events example [#2460](https://github.com/tldraw/tldraw/pull/2460) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate shape meta data example [#2453](https://github.com/tldraw/tldraw/pull/2453) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate example for using Tldraw component in a scrollable container [#2452](https://github.com/tldraw/tldraw/pull/2452) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate example for making editor read-only [#2451](https://github.com/tldraw/tldraw/pull/2451) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix typos and add comments for persistence example [#2450](https://github.com/tldraw/tldraw/pull/2450) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate external sources example [#2414](https://github.com/tldraw/tldraw/pull/2414) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Update README [#2444](https://github.com/tldraw/tldraw/pull/2444) ([@steveruizok](https://github.com/steveruizok))
- annotate multiple example [#2431](https://github.com/tldraw/tldraw/pull/2431) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- annotate force mobile example [#2421](https://github.com/tldraw/tldraw/pull/2421) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate hosted images example [#2422](https://github.com/tldraw/tldraw/pull/2422) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate local images example [#2423](https://github.com/tldraw/tldraw/pull/2423) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate meta oncreate example [#2426](https://github.com/tldraw/tldraw/pull/2426) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate exploded example [#2413](https://github.com/tldraw/tldraw/pull/2413) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate hide-ui example [#2420](https://github.com/tldraw/tldraw/pull/2420) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate custom ui example [#2408](https://github.com/tldraw/tldraw/pull/2408) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Custom components annotation [#2403](https://github.com/tldraw/tldraw/pull/2403) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate meta onchange [#2430](https://github.com/tldraw/tldraw/pull/2430) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/tldraw`
  - Examples tweaks [#2681](https://github.com/tldraw/tldraw/pull/2681) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - fix typo in hideRotateHandle method [#2473](https://github.com/tldraw/tldraw/pull/2473) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### 🧪 Tests

- `@tldraw/editor`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/utils`
  - Bump jest to fix weird prettier bug [#2716](https://github.com/tldraw/tldraw/pull/2716) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Bump Yarn to 4.0.2 and add version constraints [#2481](https://github.com/tldraw/tldraw/pull/2481) ([@si14](https://github.com/si14))

#### Authors: 13

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- [@Rokixy](https://github.com/Rokixy)
- a22albjo ([@albjoh2](https://github.com/albjoh2))
- Alex ([@alikiki](https://github.com/alikiki))
- alex ([@SomeHats](https://github.com/SomeHats))
- Dan Groshev ([@si14](https://github.com/si14))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mime Čuvalo ([@mimecuvalo](https://github.com/mimecuvalo))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Peiling Jiang ([@peilingjiang](https://github.com/peilingjiang))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.2 (Wed Jan 10 2024)

### Release Notes

#### Fix validation when pasting images. ([#2436](https://github.com/tldraw/tldraw/pull/2436))

- Fixes url validations.

#### Fix decrement button label in OnTheCanvas example component ([#2432](https://github.com/tldraw/tldraw/pull/2432))

- tiny bug fix, simply changing a label to match behaviour

#### refactor copy/export, fix safari copy-as-image being broken ([#2411](https://github.com/tldraw/tldraw/pull/2411))

- Fix a bug preventing copying as an image on iOS

#### Add url validation ([#2428](https://github.com/tldraw/tldraw/pull/2428))

- Add validation to urls.

#### [fix] next selected shapes comment ([#2427](https://github.com/tldraw/tldraw/pull/2427))

- Fix error in setStyleForNextSelectedShapes comment

#### annotate error boundary example ([#2410](https://github.com/tldraw/tldraw/pull/2410))

- Add annotation to error boundary example

#### Fix issues with clip paths for frames ([#2406](https://github.com/tldraw/tldraw/pull/2406))

- Add a brief release note for your PR here.

#### Annotate custom styles example ([#2405](https://github.com/tldraw/tldraw/pull/2405))

- Add annotation to the custom styles example

#### annotate custom config example ([#2404](https://github.com/tldraw/tldraw/pull/2404))

- Adds annotation to the custom config example with a bit more detail

#### annotate asset props, correct image/video confusion ([#2399](https://github.com/tldraw/tldraw/pull/2399))

- Annotates the asset props example and fixes a mistake in the existing comments

#### Annotate/refactor store events example ([#2400](https://github.com/tldraw/tldraw/pull/2400))

- Update store events example to use store.listen method
- Annotate with explanations of the code

#### annotate canvas events ([#2397](https://github.com/tldraw/tldraw/pull/2397))

- Adds annotation to the canvas events example

#### [fix] edge scrolling when component is inside of screen ([#2398](https://github.com/tldraw/tldraw/pull/2398))

- Add a brief release note for your PR here.

#### Annotate api example ([#2395](https://github.com/tldraw/tldraw/pull/2395))

- Annotate API example

#### [tech debt] Primitives renaming party / cleanup ([#2396](https://github.com/tldraw/tldraw/pull/2396))

- renames Vec2d to Vec
- renames Vec2dModel to VecModel
- renames Box2d to Box
- renames Box2dModel to BoxModel
- renames Matrix2d to Mat
- renames Matrix2dModel to MatModel
- removes unused primitive helpers

#### Refactor and document speech bubble example ([#2392](https://github.com/tldraw/tldraw/pull/2392))

- Add annotations to the speech bubble example
- Refactor code for clarity

#### Fix trademark links ([#2380](https://github.com/tldraw/tldraw/pull/2380))

- Fixes broken links in a number of docs files.

#### [fix] polygon bounds ([#2378](https://github.com/tldraw/tldraw/pull/2378))

- Fixed a bug with the bounds calculation for polygons.

#### Avoid importing `editor.css` twice ([#2373](https://github.com/tldraw/tldraw/pull/2373))

- Prevent importing `editor.css` twice which should help when debugging the styles via developer console.

#### Adding an image shape from a file the public folder ([#2370](https://github.com/tldraw/tldraw/pull/2370))

- Adds a simple image example.

---

#### 💥 Breaking Change

- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [tech debt] Primitives renaming party / cleanup [#2396](https://github.com/tldraw/tldraw/pull/2396) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- Adding an image shape from a file the public folder [#2370](https://github.com/tldraw/tldraw/pull/2370) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🐛 Bug Fix

- Avoid importing `editor.css` twice [#2373](https://github.com/tldraw/tldraw/pull/2373) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code bump 2.0.20 [#2371](https://github.com/tldraw/tldraw/pull/2371) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tlschema`
  - Fix validation when pasting images. [#2436](https://github.com/tldraw/tldraw/pull/2436) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
- `@tldraw/tldraw`
  - refactor copy/export, fix safari copy-as-image being broken [#2411](https://github.com/tldraw/tldraw/pull/2411) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
  - [fix] Asset versions [#2389](https://github.com/tldraw/tldraw/pull/2389) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Add url validation [#2428](https://github.com/tldraw/tldraw/pull/2428) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Fix issues with clip paths for frames [#2406](https://github.com/tldraw/tldraw/pull/2406) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [fix] edge scrolling when component is inside of screen [#2398](https://github.com/tldraw/tldraw/pull/2398) ([@steveruizok](https://github.com/steveruizok))
  - [fix] polygon bounds [#2378](https://github.com/tldraw/tldraw/pull/2378) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/store`
  - Fix meta examples [#2379](https://github.com/tldraw/tldraw/pull/2379) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Fix license language. [#2365](https://github.com/tldraw/tldraw/pull/2365) ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- Fix decrement button label in OnTheCanvas example component [#2432](https://github.com/tldraw/tldraw/pull/2432) ([@StanFlint](https://github.com/StanFlint))
- annotate error boundary example [#2410](https://github.com/tldraw/tldraw/pull/2410) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- fix example scrolling on ios [#2412](https://github.com/tldraw/tldraw/pull/2412) ([@SomeHats](https://github.com/SomeHats))
- Add descriptions to active examples [#2407](https://github.com/tldraw/tldraw/pull/2407) ([@SomeHats](https://github.com/SomeHats))
- Annotate custom styles example [#2405](https://github.com/tldraw/tldraw/pull/2405) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- annotate custom config example [#2404](https://github.com/tldraw/tldraw/pull/2404) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate asset props, correct image/video confusion [#2399](https://github.com/tldraw/tldraw/pull/2399) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate/refactor store events example [#2400](https://github.com/tldraw/tldraw/pull/2400) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- annotate canvas events [#2397](https://github.com/tldraw/tldraw/pull/2397) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Annotate api example [#2395](https://github.com/tldraw/tldraw/pull/2395) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Refactor and document speech bubble example [#2392](https://github.com/tldraw/tldraw/pull/2392) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
- Fix README link typo [#2372](https://github.com/tldraw/tldraw/pull/2372) ([@chunderbolt](https://github.com/chunderbolt))
- `@tldraw/editor`
  - [fix] next selected shapes comment [#2427](https://github.com/tldraw/tldraw/pull/2427) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/tldraw`
  - [example] Changing the default tldraw colors [#2402](https://github.com/tldraw/tldraw/pull/2402) ([@steveruizok](https://github.com/steveruizok))
  - add descriptions to examples [#2375](https://github.com/tldraw/tldraw/pull/2375) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Fix trademark links [#2380](https://github.com/tldraw/tldraw/pull/2380) ([@nonparibus](https://github.com/nonparibus))
  - Another typo fix. [#2366](https://github.com/tldraw/tldraw/pull/2366) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 8

- [@chunderbolt](https://github.com/chunderbolt)
- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David @ HASH ([@nonparibus](https://github.com/nonparibus))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Stan Flint ([@StanFlint](https://github.com/StanFlint))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-beta.1 (Wed Dec 20 2023)

### Release Notes

#### add speech bubble example ([#2362](https://github.com/tldraw/tldraw/pull/2362))

- Add an example for making a custom shape with handles, this one is a speech bubble with a movable tail.

#### Fix clicking off the context menu ([#2355](https://github.com/tldraw/tldraw/pull/2355))

- Fix not being able to close the context menu by clicking on the UI or your selected shape.

#### fix read only page menu ([#2356](https://github.com/tldraw/tldraw/pull/2356))

- Add a brief release note for your PR here.

#### refactor: Keep hook function convention the same ([#2358](https://github.com/tldraw/tldraw/pull/2358))

- Add a brief release note for your PR here.

#### focus on container before deleting to avoid losing focus ([#2354](https://github.com/tldraw/tldraw/pull/2354))

- Prevents losing focus when clicking the trash button

#### Stop shape text labels being hoverable when context menu is open ([#2352](https://github.com/tldraw/tldraw/pull/2352))

- Add a brief release note for your PR here.

#### Use custom font ([#2343](https://github.com/tldraw/tldraw/pull/2343))

- Add a brief release note for your PR here.

#### Only allow side resizing when we have some shapes that are not aspect ratio locked ([#2347](https://github.com/tldraw/tldraw/pull/2347))

- Don't allow edges resizing on mobile. The only exception is a single text shape.

#### Fix iconleft padding ([#2345](https://github.com/tldraw/tldraw/pull/2345))

- Fixes the icon padding in back to content / pen mode buttons.

#### [bug] Fix for issue #2329 ([#2330](https://github.com/tldraw/tldraw/pull/2330))

- Fix for `Matrix2d.Scale` function

#### Allow dragging on top of locked shapes. ([#2337](https://github.com/tldraw/tldraw/pull/2337))

- Allow translating of shapes on top of a locked shape by clicking inside of selection and moving the mouse.

#### Remove deprecated getters ([#2333](https://github.com/tldraw/tldraw/pull/2333))

- (Breaking) Removed deprecated getters.

#### Lokalise: Translations update ([#2342](https://github.com/tldraw/tldraw/pull/2342))

Added Czech translations.
Updated translations for German, Korean, Russian, Ukrainian, Traditional Chinese.

#### Prevent diff mutation ([#2336](https://github.com/tldraw/tldraw/pull/2336))

- Fix `squashRecordDiffs` to prevent a bug where it mutates the 'updated' entires

#### Fix indicator radius for bookmarks. ([#2335](https://github.com/tldraw/tldraw/pull/2335))

- Fix the indicator for the bookmark shape. The radius now matches the shape's radius.

#### Start scrolling if we are dragging close to the window edges. ([#2299](https://github.com/tldraw/tldraw/pull/2299))

- Adds the logic to change the camera position when you get close to the edges of the window. This allows you to drag, resize, brush select past the edges of the current viewport.

#### Fix downscaling ([#2325](https://github.com/tldraw/tldraw/pull/2325))

- Decrease the size of uploaded assets.

#### Use a global singleton for tlstate ([#2322](https://github.com/tldraw/tldraw/pull/2322))

- Make a global singleton for tlstate.

#### VS Code 2.0.19 ([#2324](https://github.com/tldraw/tldraw/pull/2324))

- Version bump for VS Code.

---

#### 💥 Breaking Change

- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - bump to beta [#2364](https://github.com/tldraw/tldraw/pull/2364) ([@steveruizok](https://github.com/steveruizok))
  - Change licenses to tldraw [#2167](https://github.com/tldraw/tldraw/pull/2167) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/tldraw`
  - Use custom font [#2343](https://github.com/tldraw/tldraw/pull/2343) ([@ds300](https://github.com/ds300) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- `@tldraw/editor`, `@tldraw/state`
  - Remove deprecated getters [#2333](https://github.com/tldraw/tldraw/pull/2333) ([@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- add speech bubble example [#2362](https://github.com/tldraw/tldraw/pull/2362) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Start scrolling if we are dragging close to the window edges. [#2299](https://github.com/tldraw/tldraw/pull/2299) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- VS Code 2.0.19 [#2324](https://github.com/tldraw/tldraw/pull/2324) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Fix clicking off the context menu [#2355](https://github.com/tldraw/tldraw/pull/2355) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - Drop edge scrolling adjustment for mobile [#2346](https://github.com/tldraw/tldraw/pull/2346) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - fix read only page menu [#2356](https://github.com/tldraw/tldraw/pull/2356) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@TodePond](https://github.com/TodePond))
  - focus on container before deleting to avoid losing focus [#2354](https://github.com/tldraw/tldraw/pull/2354) ([@ds300](https://github.com/ds300))
  - Only allow side resizing when we have some shapes that are not aspect ratio locked [#2347](https://github.com/tldraw/tldraw/pull/2347) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix iconleft padding [#2345](https://github.com/tldraw/tldraw/pull/2345) ([@steveruizok](https://github.com/steveruizok))
  - Allow dragging on top of locked shapes. [#2337](https://github.com/tldraw/tldraw/pull/2337) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix indicator radius for bookmarks. [#2335](https://github.com/tldraw/tldraw/pull/2335) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix downscaling [#2325](https://github.com/tldraw/tldraw/pull/2325) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Stop shape text labels being hoverable when context menu is open [#2352](https://github.com/tldraw/tldraw/pull/2352) ([@TodePond](https://github.com/TodePond))
  - [bug] Fix for issue #2329 [#2330](https://github.com/tldraw/tldraw/pull/2330) ([@zfedoran](https://github.com/zfedoran))
- `@tldraw/utils`
  - fix png images with pixel ratios <0.5 crashing the app [#2350](https://github.com/tldraw/tldraw/pull/2350) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - Lokalise: Translations update [#2342](https://github.com/tldraw/tldraw/pull/2342) ([@TodePond](https://github.com/TodePond))
- `@tldraw/store`, `@tldraw/tldraw`
  - Prevent diff mutation [#2336](https://github.com/tldraw/tldraw/pull/2336) ([@ds300](https://github.com/ds300))
- `@tldraw/store`
  - Call devFreeze on initialData [#2332](https://github.com/tldraw/tldraw/pull/2332) ([@ds300](https://github.com/ds300))
- `@tldraw/state`
  - Fix TSDoc for @tldraw/state [#2327](https://github.com/tldraw/tldraw/pull/2327) ([@ds300](https://github.com/ds300))
  - Use a global singleton for tlstate [#2322](https://github.com/tldraw/tldraw/pull/2322) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- `@tldraw/editor`
  - refactor: Keep hook function convention the same [#2358](https://github.com/tldraw/tldraw/pull/2358) ([@Lennon57](https://github.com/Lennon57))

#### Authors: 9

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- [@zfedoran](https://github.com/zfedoran)
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- MinhoPark ([@Lennon57](https://github.com/Lennon57))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.19 (Tue Dec 12 2023)

### Release Notes

#### zoom to affected shapes after undo/redo ([#2293](https://github.com/tldraw/tldraw/pull/2293))

- Make sure affected shapes are visible after undo/redo

#### Fix hmr. ([#2303](https://github.com/tldraw/tldraw/pull/2303))

- Fixes HMR in local dev.

#### Fix migrations. ([#2302](https://github.com/tldraw/tldraw/pull/2302))

- Fix migrations of `instance_page_state`.

#### Add fit to content for frames. ([#2275](https://github.com/tldraw/tldraw/pull/2275))

- Add Fit to content option to the context menu for frames. This resizes the frames to correctly fit all their content.

#### Fix an issue with a stale editor reference in shape utils ([#2295](https://github.com/tldraw/tldraw/pull/2295))

- Fix an issue where the shape utils could have a stale reference to the editor.

#### fix new page naming ([#2292](https://github.com/tldraw/tldraw/pull/2292))

- Fix naming of pages created by the "move to page" action

#### Fix exporting of cropped images. ([#2268](https://github.com/tldraw/tldraw/pull/2268))

- Fix exporting of cropped images.

#### Update the comment in the example. ([#2272](https://github.com/tldraw/tldraw/pull/2272))

- Improve the comment for one of our examples.

#### [improvements] arrows x enclosing shapes x precision. ([#2265](https://github.com/tldraw/tldraw/pull/2265))

- Improves the logic about when to draw "precise" arrows between the center of bound shapes.

#### fix vite HMR issue ([#2279](https://github.com/tldraw/tldraw/pull/2279))

- Fixes a bug that could cause crashes due to a re-render loop with HMR #1989

#### Add connecting screen override. ([#2273](https://github.com/tldraw/tldraw/pull/2273))

- Allow users to customize the connecting screen.

#### Removing frames and adding elements to frames ([#2219](https://github.com/tldraw/tldraw/pull/2219))

- Allow users to remove the frame, but keep it's children. Allow the users to add shapes to the frame directly when creating a frame.

#### fix typo in useFixSafariDoubleTapZoomPencilEvents.ts ([#2242](https://github.com/tldraw/tldraw/pull/2242))

- Add a brief release note for your PR here.

#### improves translation into pt-br ([#2231](https://github.com/tldraw/tldraw/pull/2231))

- Improves the overall translation into Portuguese (pt-br).

#### Fixes #2246 Sublibraries example (ExplodedExample.tsx) ([#2247](https://github.com/tldraw/tldraw/pull/2247))

- Fixed Sublibraries (Exploded) example

#### Fix missing padding-right in toast ([#2251](https://github.com/tldraw/tldraw/pull/2251))

- Fox padding-right in toast content.

#### Fix "custom UI" example ([#2253](https://github.com/tldraw/tldraw/pull/2253))

- Fixed double rendering of canvas in the "custom UI" example

#### Lokalise: Translations update ([#2248](https://github.com/tldraw/tldraw/pull/2248))

- Update Romanian translations.

#### Also export `TLUiEventMap` ([#2234](https://github.com/tldraw/tldraw/pull/2234))

- Export `TLUiEventMap` type.

#### Fix the tool lock button. ([#2225](https://github.com/tldraw/tldraw/pull/2225))

- Adds the missing tool lock button.

#### Custom Tools DX + screenshot example ([#2198](https://github.com/tldraw/tldraw/pull/2198))

- adds ScreenshotTool custom tool example
- improvements and new exports related to copying and exporting images / files
- loosens up types around icons and translations
- moving `StateNode.isActive` into an atom
- adding `Editor.path`

#### StateNode atoms ([#2213](https://github.com/tldraw/tldraw/pull/2213))

- adds computed `StateNode.getPath`
- adds computed StateNode.getCurrent`
- adds computed StateNode.getIsActive`
- adds computed `Editor.getPath()`
- makes transition's second property optional

#### VS Code bump 2.0.17 ([#2217](https://github.com/tldraw/tldraw/pull/2217))

- VS code extension 2.0.17.

#### don't overwrite bookmark position if it changed before metadata arrives ([#2215](https://github.com/tldraw/tldraw/pull/2215))

- Fixes issue when creating new bookmark shape where the position would be reset if you moved it before the bookmark metadata was fetched.

#### Add prettier caching ([#2212](https://github.com/tldraw/tldraw/pull/2212))

- Speed up formatting of files via `yarn format`.

#### Update translations from community submissions ([#2201](https://github.com/tldraw/tldraw/pull/2201))

- Updated translations for Spanish, Japanese, Romanian, Russian, Ukrainian, and Simplified Chinese.

#### [fix] huge images, use downscale for image scaling ([#2207](https://github.com/tldraw/tldraw/pull/2207))

- Improved image rescaling.

#### Revert back to the previous color. ([#2210](https://github.com/tldraw/tldraw/pull/2210))

- Fixes the color of culled shapes when using dark mode.

#### Fix an issue with not being able to group a shape an an arrow. ([#2205](https://github.com/tldraw/tldraw/pull/2205))

- Add a brief release note for your PR here.

#### Japanese translations. (update) ([#2199](https://github.com/tldraw/tldraw/pull/2199))

- Updated Japanese translations.

#### feat: add new prop to force mobile mode layout ([#1734](https://github.com/tldraw/tldraw/pull/1734))

- add new prop to force mobile mode layout

#### [fix] masked bounds calculation ([#2197](https://github.com/tldraw/tldraw/pull/2197))

- Fix bug with getmaskedpagebounds calculation for identical parent / child sizes

---

#### 💥 Breaking Change

- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - No impure getters pt 1 [#2189](https://github.com/tldraw/tldraw/pull/2189) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))

#### 🚀 Enhancement

- `@tldraw/editor`, `@tldraw/tldraw`
  - Add fit to content for frames. [#2275](https://github.com/tldraw/tldraw/pull/2275) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Removing frames and adding elements to frames [#2219](https://github.com/tldraw/tldraw/pull/2219) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok) [@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Custom Tools DX + screenshot example [#2198](https://github.com/tldraw/tldraw/pull/2198) ([@steveruizok](https://github.com/steveruizok))
  - StateNode atoms [#2213](https://github.com/tldraw/tldraw/pull/2213) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [improvements] arrows x enclosing shapes x precision. [#2265](https://github.com/tldraw/tldraw/pull/2265) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Add connecting screen override. [#2273](https://github.com/tldraw/tldraw/pull/2273) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - Add `getSvgAsImage` to exports. [#2229](https://github.com/tldraw/tldraw/pull/2229) ([@steveruizok](https://github.com/steveruizok))
  - [fix] huge images, use downscale for image scaling [#2207](https://github.com/tldraw/tldraw/pull/2207) ([@steveruizok](https://github.com/steveruizok))
  - feat: add new prop to force mobile mode layout [#1734](https://github.com/tldraw/tldraw/pull/1734) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Fix hmr. [#2303](https://github.com/tldraw/tldraw/pull/2303) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- VS Code version bump. [#2297](https://github.com/tldraw/tldraw/pull/2297) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- improves translation into pt-br [#2231](https://github.com/tldraw/tldraw/pull/2231) ([@bybruno](https://github.com/bybruno))
- Fixes #2246 Sublibraries example (ExplodedExample.tsx) [#2247](https://github.com/tldraw/tldraw/pull/2247) (gary.saunders@sportsengine.com [@steveruizok](https://github.com/steveruizok))
- Lokalise: Translations update [#2248](https://github.com/tldraw/tldraw/pull/2248) ([@TodePond](https://github.com/TodePond))
- Update translations from community submissions [#2201](https://github.com/tldraw/tldraw/pull/2201) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Japanese translations. (update) [#2199](https://github.com/tldraw/tldraw/pull/2199) ([@sugitlab](https://github.com/sugitlab))
- VS code bump 2.0.16 [#2193](https://github.com/tldraw/tldraw/pull/2193) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Revert "zoom to affected shapes after undo/redo" [#2310](https://github.com/tldraw/tldraw/pull/2310) ([@ds300](https://github.com/ds300))
  - zoom to affected shapes after undo/redo [#2293](https://github.com/tldraw/tldraw/pull/2293) ([@ds300](https://github.com/ds300))
  - fix new page naming [#2292](https://github.com/tldraw/tldraw/pull/2292) ([@SomeHats](https://github.com/SomeHats))
  - No impure getters pt9 [#2222](https://github.com/tldraw/tldraw/pull/2222) ([@ds300](https://github.com/ds300))
  - No impure getters pt8 [#2221](https://github.com/tldraw/tldraw/pull/2221) ([@ds300](https://github.com/ds300))
  - No impure getters pt7 [#2220](https://github.com/tldraw/tldraw/pull/2220) ([@ds300](https://github.com/ds300))
  - No impure getters pt6 [#2218](https://github.com/tldraw/tldraw/pull/2218) ([@ds300](https://github.com/ds300))
  - No impure getters pt5 [#2208](https://github.com/tldraw/tldraw/pull/2208) ([@ds300](https://github.com/ds300))
  - Fix an issue with not being able to group a shape an an arrow. [#2205](https://github.com/tldraw/tldraw/pull/2205) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - No impure getters pt4 [#2206](https://github.com/tldraw/tldraw/pull/2206) ([@ds300](https://github.com/ds300))
  - No impure getters pt3 [#2203](https://github.com/tldraw/tldraw/pull/2203) ([@ds300](https://github.com/ds300))
  - No impure getters pt2 [#2202](https://github.com/tldraw/tldraw/pull/2202) ([@ds300](https://github.com/ds300))
- `@tldraw/tlschema`
  - Fix migrations. [#2302](https://github.com/tldraw/tldraw/pull/2302) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - Fix an issue with a stale editor reference in shape utils [#2295](https://github.com/tldraw/tldraw/pull/2295) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix the cleanup of event handlers [#2298](https://github.com/tldraw/tldraw/pull/2298) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Revert back to the previous color. [#2210](https://github.com/tldraw/tldraw/pull/2210) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] masked bounds calculation [#2197](https://github.com/tldraw/tldraw/pull/2197) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - Fix exporting of cropped images. [#2268](https://github.com/tldraw/tldraw/pull/2268) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Hot elbows [#2258](https://github.com/tldraw/tldraw/pull/2258) ([@ds300](https://github.com/ds300) [@steveruizok](https://github.com/steveruizok))
  - Fix missing padding-right in toast [#2251](https://github.com/tldraw/tldraw/pull/2251) ([@ByMykel](https://github.com/ByMykel) [@steveruizok](https://github.com/steveruizok))
  - Also export `TLUiEventMap` [#2234](https://github.com/tldraw/tldraw/pull/2234) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix the tool lock button. [#2225](https://github.com/tldraw/tldraw/pull/2225) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - don't overwrite bookmark position if it changed before metadata arrives [#2215](https://github.com/tldraw/tldraw/pull/2215) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/utils`
  - fix vite HMR issue [#2279](https://github.com/tldraw/tldraw/pull/2279) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/tldraw`, `@tldraw/utils`
  - no impure getters pt 11 [#2236](https://github.com/tldraw/tldraw/pull/2236) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`
  - No impure getters pt10 [#2235](https://github.com/tldraw/tldraw/pull/2235) ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- Fix "custom UI" example [#2253](https://github.com/tldraw/tldraw/pull/2253) ([@OriginalEXE](https://github.com/OriginalEXE))
- Add floaty window example [#2250](https://github.com/tldraw/tldraw/pull/2250) ([@steveruizok](https://github.com/steveruizok))
- VS Code bump 2.0.17 [#2217](https://github.com/tldraw/tldraw/pull/2217) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tlschema`
  - Add prettier caching [#2212](https://github.com/tldraw/tldraw/pull/2212) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 📝 Documentation

- Update the comment in the example. [#2272](https://github.com/tldraw/tldraw/pull/2272) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/state`
  - Replace getters in examples [#2261](https://github.com/tldraw/tldraw/pull/2261) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`
  - fix typo in useFixSafariDoubleTapZoomPencilEvents.ts [#2242](https://github.com/tldraw/tldraw/pull/2242) ([@eltociear](https://github.com/eltociear))

#### 🧪 Tests

- `@tldraw/tldraw`
  - fix export snapshot race condition [#2280](https://github.com/tldraw/tldraw/pull/2280) ([@SomeHats](https://github.com/SomeHats))

#### Authors: 13

- [@ByMykel](https://github.com/ByMykel)
- alex ([@SomeHats](https://github.com/SomeHats))
- Ante Sepic ([@OriginalEXE](https://github.com/OriginalEXE))
- Bruno ([@bybruno](https://github.com/bybruno))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Gary Saunders ([@codenamegary](https://github.com/codenamegary))
- Ikko Eltociear Ashimine ([@eltociear](https://github.com/eltociear))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Sugit ([@sugitlab](https://github.com/sugitlab))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.18 (Fri Nov 10 2023)

### Release Notes

#### Fix an error when using context menu. ([#2186](https://github.com/tldraw/tldraw/pull/2186))

- Fixes the console error when opening the context menu for the first time.

#### [fix] actions menu freezing ui ([#2187](https://github.com/tldraw/tldraw/pull/2187))

- Fix actions menu not closing when clicking the canvas after grouping items via the actions menu.

#### Fix an issue with edit link. ([#2184](https://github.com/tldraw/tldraw/pull/2184))

- Fixes an issue with using the Edit link dialog.

#### add missing semicolon ([#2182](https://github.com/tldraw/tldraw/pull/2182))

- Fix typo in CSS file

#### Only use the hack if we are in safari. ([#2185](https://github.com/tldraw/tldraw/pull/2185))

- Improve the speed of exporting to png for non Safari browsers.

#### Fix keyboard shortcuts for vscode. ([#2181](https://github.com/tldraw/tldraw/pull/2181))

- Fixes keyboard shortcuts for VS Code extension.

#### Fix printing. ([#2177](https://github.com/tldraw/tldraw/pull/2177))

- Fixes printing of shapes.

#### [fix] Frame label not following staying aligned correctly on rotation ([#2172](https://github.com/tldraw/tldraw/pull/2172))

- Frame labels immediately update their position on rotation.

#### Don't show scrollbars. ([#2171](https://github.com/tldraw/tldraw/pull/2171))

- Hide the horizontal scrollbar in the vertical alignment for Firefox.

#### instant bookmarks ([#2176](https://github.com/tldraw/tldraw/pull/2176))

- Improves ux around pasting bookmarks

#### Fix arrow dropdown localizations. ([#2174](https://github.com/tldraw/tldraw/pull/2174))

- Fix arrow headstyle dropdown translations.

#### Fix crash with zero length arrow ([#2173](https://github.com/tldraw/tldraw/pull/2173))

- Fix a hyper niche arrow crash with zero length arrows.

#### Allow users to select shapes when drag starts on top of a locked shape. ([#2169](https://github.com/tldraw/tldraw/pull/2169))

- Allows brush selecting when you start it on top of a locked shape.

#### Fix the problem with text not being correctly aligned in small geo shapes. ([#2168](https://github.com/tldraw/tldraw/pull/2168))

- Fixes position of Text labels in geo shapes.

#### Zooming improvement ([#2149](https://github.com/tldraw/tldraw/pull/2149))

- Improves zooming for inactive windows.

#### [feature] Things on the canvas ([#2150](https://github.com/tldraw/tldraw/pull/2150))

- [editor] Adds two new components, `OnTheCanvas` and `InFrontOfTheCanvas`.

#### Bump vs code extension. ([#2142](https://github.com/tldraw/tldraw/pull/2142))

- Release a new version of VS Code extension with all the latest changes.

#### Fix cleanupText ([#2138](https://github.com/tldraw/tldraw/pull/2138))

- Fixes a minor bug where cleaning up text would fail.

#### [android] Fix text labels and link button getting misaligned ([#2132](https://github.com/tldraw/tldraw/pull/2132))

- Fixed a bug where labels and links could lose alignment on android.

#### [feature] multi-scribbles ([#2125](https://github.com/tldraw/tldraw/pull/2125))

- [feature] multi scribbles

#### Tighten up editor ui ([#2102](https://github.com/tldraw/tldraw/pull/2102))

- Small adjustment to editor ui.

#### Remove indicator for autosize text shapes while editing ([#2120](https://github.com/tldraw/tldraw/pull/2120))

- Removed the indicator from autosize text shapes.

#### Taha/initial shape in handle change ([#2117](https://github.com/tldraw/tldraw/pull/2117))

- Add a brief release note for your PR here.

#### Fix an issue with `addEventListener` in old Safari (pre v14) ([#2114](https://github.com/tldraw/tldraw/pull/2114))

- Fixes an issue with `addEventListener` on MediaQueryList object in old versions of Safari.

#### fix selection fg transform ([#2113](https://github.com/tldraw/tldraw/pull/2113))

- Fixes a small issue causing the selection foreground to be offset when the browser is at particular zoom levels.

#### Remove (optional) from jsdocs ([#2109](https://github.com/tldraw/tldraw/pull/2109))

- dev: Removed duplicate/inconsistent `(optional)`s from docs

#### [fix] mobile style panel switching open / closed ([#2101](https://github.com/tldraw/tldraw/pull/2101))

- Fix bug with style panel

---

#### 🚀 Enhancement

- `@tldraw/tldraw`
  - instant bookmarks [#2176](https://github.com/tldraw/tldraw/pull/2176) ([@ds300](https://github.com/ds300))
  - Remove indicator for autosize text shapes while editing [#2120](https://github.com/tldraw/tldraw/pull/2120) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [feature] Things on the canvas [#2150](https://github.com/tldraw/tldraw/pull/2150) ([@steveruizok](https://github.com/steveruizok))
  - Tighten up editor ui [#2102](https://github.com/tldraw/tldraw/pull/2102) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [feature] multi-scribbles [#2125](https://github.com/tldraw/tldraw/pull/2125) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Bump vs code extension. [#2142](https://github.com/tldraw/tldraw/pull/2142) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Bump VS Code [#2100](https://github.com/tldraw/tldraw/pull/2100) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - Add tldraw component exports [#2188](https://github.com/tldraw/tldraw/pull/2188) ([@steveruizok](https://github.com/steveruizok))
  - Fix an error when using context menu. [#2186](https://github.com/tldraw/tldraw/pull/2186) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix an issue with edit link. [#2184](https://github.com/tldraw/tldraw/pull/2184) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Only use the hack if we are in safari. [#2185](https://github.com/tldraw/tldraw/pull/2185) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix keyboard shortcuts for vscode. [#2181](https://github.com/tldraw/tldraw/pull/2181) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix printing. [#2177](https://github.com/tldraw/tldraw/pull/2177) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] Frame label not following staying aligned correctly on rotation [#2172](https://github.com/tldraw/tldraw/pull/2172) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - Don't show scrollbars. [#2171](https://github.com/tldraw/tldraw/pull/2171) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix arrow dropdown localizations. [#2174](https://github.com/tldraw/tldraw/pull/2174) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Allow users to select shapes when drag starts on top of a locked shape. [#2169](https://github.com/tldraw/tldraw/pull/2169) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix the problem with text not being correctly aligned in small geo shapes. [#2168](https://github.com/tldraw/tldraw/pull/2168) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix cleanupText [#2138](https://github.com/tldraw/tldraw/pull/2138) ([@ds300](https://github.com/ds300))
  - [android] Fix text labels and link button getting misaligned [#2132](https://github.com/tldraw/tldraw/pull/2132) ([@TodePond](https://github.com/TodePond))
  - [fix] button gaps [#2130](https://github.com/tldraw/tldraw/pull/2130) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Move to page button / toasts styling [#2126](https://github.com/tldraw/tldraw/pull/2126) ([@steveruizok](https://github.com/steveruizok))
  - [fix] css for editing page title [#2124](https://github.com/tldraw/tldraw/pull/2124) ([@steveruizok](https://github.com/steveruizok))
  - fix selection fg transform [#2113](https://github.com/tldraw/tldraw/pull/2113) ([@ds300](https://github.com/ds300))
  - [fix] mobile style panel switching open / closed [#2101](https://github.com/tldraw/tldraw/pull/2101) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [fix] actions menu freezing ui [#2187](https://github.com/tldraw/tldraw/pull/2187) ([@steveruizok](https://github.com/steveruizok))
  - Fix crash with zero length arrow [#2173](https://github.com/tldraw/tldraw/pull/2173) ([@TodePond](https://github.com/TodePond))
  - Zooming improvement [#2149](https://github.com/tldraw/tldraw/pull/2149) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - add missing semicolon [#2182](https://github.com/tldraw/tldraw/pull/2182) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - fix scroll event coords [#2180](https://github.com/tldraw/tldraw/pull/2180) ([@ds300](https://github.com/ds300))
  - Fix an issue with `addEventListener` in old Safari (pre v14) [#2114](https://github.com/tldraw/tldraw/pull/2114) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🏠 Internal

- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Revert "bump prerelease from alpha to beta" [#2192](https://github.com/tldraw/tldraw/pull/2192) ([@ds300](https://github.com/ds300))
  - bump prerelease from alpha to beta [#2148](https://github.com/tldraw/tldraw/pull/2148) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`
  - Taha/initial shape in handle change [#2117](https://github.com/tldraw/tldraw/pull/2117) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

#### 📝 Documentation

- `@tldraw/editor`
  - Add meta example [#2122](https://github.com/tldraw/tldraw/pull/2122) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/tldraw`
  - Remove (optional) from jsdocs [#2109](https://github.com/tldraw/tldraw/pull/2109) ([@TodePond](https://github.com/TodePond))

#### Authors: 5

- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.17 (Tue Oct 17 2023)

### Release Notes

#### Firefox, Touch: Fix not being able to open style dropdowns ([#2092](https://github.com/tldraw/tldraw/pull/2092))

- Firefox Mobile: Fixed a bug where you couldn't open some style dropdown options.

#### Add timestamp to file names ([#2096](https://github.com/tldraw/tldraw/pull/2096))

- Add timestamp to exported image file names

#### [fix] Context menu + menus not closing correctly ([#2086](https://github.com/tldraw/tldraw/pull/2086))

- [fix] bug with menus

#### Fix not being able to upload massive images ([#2095](https://github.com/tldraw/tldraw/pull/2095))

- Fixed big images being too big to get added to the canvas.

#### fix cropped image size ([#2097](https://github.com/tldraw/tldraw/pull/2097))

- Fixes a rendering issue where cropped images were sometimes bleeding outside their bounds.

#### Add offline indicator (also to top zone example) ([#2083](https://github.com/tldraw/tldraw/pull/2083))

- [@tldraw/tldraw] add offline indicator to ui components

#### [fix] missing border on group shape when unlocked ([#2075](https://github.com/tldraw/tldraw/pull/2075))

- Fix case where indicator was not shown when unlocking groups

#### [fix] reparenting locked shapes ([#2070](https://github.com/tldraw/tldraw/pull/2070))

- Fix a bug where grouped locked shapes would be deleted when ungrouped.

#### [fix] Don't select locked shapes on pointer up ([#2069](https://github.com/tldraw/tldraw/pull/2069))

- Fix bug where locked shape could be selected by clicking on its label

#### [fix] locked shape of opacity problem with eraser.pointing ([#2073](https://github.com/tldraw/tldraw/pull/2073))

- locked shape of opacity problem with eraser.pointing
Before/after:
![A](https://github.com/tldraw/tldraw/assets/59823089/7483506c-72ac-45cc-93aa-f2a794ea8ff0) ![B](https://github.com/tldraw/tldraw/assets/59823089/ef0f988c-83f5-46a2-b891-0a391bca2f87)

---

#### 🚀 Enhancement

- `@tldraw/assets`, `@tldraw/tldraw`
  - Add offline indicator (also to top zone example) [#2083](https://github.com/tldraw/tldraw/pull/2083) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - Add data breakpoint to layout css [#2076](https://github.com/tldraw/tldraw/pull/2076) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - Same first page id for all editors [#2071](https://github.com/tldraw/tldraw/pull/2071) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- `@tldraw/tldraw`
  - Firefox, Touch: Fix not being able to open style dropdowns [#2092](https://github.com/tldraw/tldraw/pull/2092) ([@TodePond](https://github.com/TodePond))
  - Add timestamp to file names [#2096](https://github.com/tldraw/tldraw/pull/2096) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - move imports [#2099](https://github.com/tldraw/tldraw/pull/2099) ([@SomeHats](https://github.com/SomeHats))
  - Fix not being able to upload massive images [#2095](https://github.com/tldraw/tldraw/pull/2095) ([@TodePond](https://github.com/TodePond))
  - fix cropped image size [#2097](https://github.com/tldraw/tldraw/pull/2097) ([@ds300](https://github.com/ds300))
  - Fixed a bug checking translated string keys [#2082](https://github.com/tldraw/tldraw/pull/2082) ([@kewell-tsao](https://github.com/kewell-tsao))
  - [fix] Don't select locked shapes on pointer up [#2069](https://github.com/tldraw/tldraw/pull/2069) ([@steveruizok](https://github.com/steveruizok))
  - [fix] locked shape of opacity problem with eraser.pointing [#2073](https://github.com/tldraw/tldraw/pull/2073) ([@momenthana](https://github.com/momenthana))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [fix] Context menu + menus not closing correctly [#2086](https://github.com/tldraw/tldraw/pull/2086) ([@steveruizok](https://github.com/steveruizok))
  - [fix] reparenting locked shapes [#2070](https://github.com/tldraw/tldraw/pull/2070) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - [fix] remove findLast calls [#2081](https://github.com/tldraw/tldraw/pull/2081) ([@steveruizok](https://github.com/steveruizok))
  - [fix] missing border on group shape when unlocked [#2075](https://github.com/tldraw/tldraw/pull/2075) ([@steveruizok](https://github.com/steveruizok))
  - Compact children when updating parents to children. [#2072](https://github.com/tldraw/tldraw/pull/2072) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Fix ExplodedExample.tsx [#2068](https://github.com/tldraw/tldraw/pull/2068) ([@antmoux](https://github.com/antmoux) [@steveruizok](https://github.com/steveruizok))
- Update VS Code extension 2.0.13 [#2066](https://github.com/tldraw/tldraw/pull/2066) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🧪 Tests

- Only upload playwright to S3 if we have the right credentials [#2074](https://github.com/tldraw/tldraw/pull/2074) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- Cache playwright browsers. [#2067](https://github.com/tldraw/tldraw/pull/2067) ([@MitjaBezensek](https://github.com/MitjaBezensek))

#### 🔩 Dependency Updates

- `@tldraw/editor`, `@tldraw/store`, `@tldraw/tlschema`
  - bump nanoid [#2078](https://github.com/tldraw/tldraw/pull/2078) ([@ds300](https://github.com/ds300))

#### Authors: 9

- alex ([@SomeHats](https://github.com/SomeHats))
- antonio moura ([@antmoux](https://github.com/antmoux))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Hana ([@momenthana](https://github.com/momenthana))
- Kewell ([@kewell-tsao](https://github.com/kewell-tsao))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.16 (Wed Oct 11 2023)

### Release Notes

#### Fix shape opacity when erasing ([#2055](https://github.com/tldraw/tldraw/pull/2055))

- Fixes opacity of shapes while erasing in a group or frame.

#### [fix] Hit testing against zero width / height lines ([#2060](https://github.com/tldraw/tldraw/pull/2060))

- [fix] Bug where arrows would not bind to straight lines

#### Fix opacity lowering on shapes that cannot be deleted ([#2061](https://github.com/tldraw/tldraw/pull/2061))

- Locked shapes don't change opacity when scribble erasing.

Before/after:

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/763a93eb-ffaa-405c-9255-e68ba88ed9a2" />

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/dc9d3f77-c1c5-40f2-a9fe-10c723b6a21c" />

#### fix: proper label for opacity tooltip on hover ([#2044](https://github.com/tldraw/tldraw/pull/2044))

- Add a brief release note for your PR here.

#### Fix alt + shift keyboard shortcuts ([#2053](https://github.com/tldraw/tldraw/pull/2053))

- Fixes keyboard shortcuts that use `alt` and `shift` modifiers.

#### [improvement] Scope `getShapeAtPoint` to rendering shapes only ([#2043](https://github.com/tldraw/tldraw/pull/2043))

- Improve perf for hovering shapes / shape hit tests

#### Remove topBar prop from <TldrawUi /> ([#2018](https://github.com/tldraw/tldraw/pull/2018))

- [BREAKING] removed topBar prop

---

#### 🚀 Enhancement

- `@tldraw/editor`, `@tldraw/tldraw`
  - [improvement] Scope `getShapeAtPoint` to rendering shapes only [#2043](https://github.com/tldraw/tldraw/pull/2043) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - Remove dot com ui styles [1/2] [#2039](https://github.com/tldraw/tldraw/pull/2039) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - prevent hover indicator from showing when pointer isn't over the canvas [#2023](https://github.com/tldraw/tldraw/pull/2023) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tldraw`
  - Remove topBar prop from <TldrawUi /> [#2018](https://github.com/tldraw/tldraw/pull/2018) ([@SomeHats](https://github.com/SomeHats))

#### 🐛 Bug Fix

- fix standalone examples [#2042](https://github.com/tldraw/tldraw/pull/2042) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Fix shape opacity when erasing [#2055](https://github.com/tldraw/tldraw/pull/2055) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/tldraw`
  - [fix] Hit testing against zero width / height lines [#2060](https://github.com/tldraw/tldraw/pull/2060) ([@steveruizok](https://github.com/steveruizok))
  - Fix newlines in text geo shapes [#2059](https://github.com/tldraw/tldraw/pull/2059) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]) [@steveruizok](https://github.com/steveruizok))
  - Restore background [#2037](https://github.com/tldraw/tldraw/pull/2037) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - Fix opacity lowering on shapes that cannot be deleted [#2061](https://github.com/tldraw/tldraw/pull/2061) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - fix: proper label for opacity tooltip on hover [#2044](https://github.com/tldraw/tldraw/pull/2044) ([@Prince-Mendiratta](https://github.com/Prince-Mendiratta))
  - Fix alt + shift keyboard shortcuts [#2053](https://github.com/tldraw/tldraw/pull/2053) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] Stylepanel default spacing [#2036](https://github.com/tldraw/tldraw/pull/2036) ([@steveruizok](https://github.com/steveruizok))
  - Export tools [#2035](https://github.com/tldraw/tldraw/pull/2035) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - [fix] Page state migration [#2040](https://github.com/tldraw/tldraw/pull/2040) ([@steveruizok](https://github.com/steveruizok))
  - [fix] migrations for page state [#2038](https://github.com/tldraw/tldraw/pull/2038) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Move example into examples folder [#2064](https://github.com/tldraw/tldraw/pull/2064) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - [fix] broken docs link [#2062](https://github.com/tldraw/tldraw/pull/2062) ([@steveruizok](https://github.com/steveruizok))
  - Remove fixup script [#2041](https://github.com/tldraw/tldraw/pull/2041) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - Publish api.json [#2034](https://github.com/tldraw/tldraw/pull/2034) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- re-enable visual regression tests [#2056](https://github.com/tldraw/tldraw/pull/2056) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))

#### Authors: 7

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Prince Mendiratta ([@Prince-Mendiratta](https://github.com/Prince-Mendiratta))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))

---

# v2.0.0-alpha.15 (Fri Oct 06 2023)

### Release Notes

#### frame label fix ([#2016](https://github.com/tldraw/tldraw/pull/2016))

- Add a brief release note for your PR here.

#### fix cloud rendering ([#2008](https://github.com/tldraw/tldraw/pull/2008))

- Improves cloud shape rendering

#### [improvement] prevent editing in readonly ([#1990](https://github.com/tldraw/tldraw/pull/1990))

- Prevent editing text shapes in readonly mode.

#### [fix] Hovered indicators shown when coarse pointer ([#1985](https://github.com/tldraw/tldraw/pull/1985))

- Hide hovered indicators on mobile / coarse pointer devices.

#### fix(docs): update shapes docs add the array of defined shapes ([#1949](https://github.com/tldraw/tldraw/pull/1949))

This pr add the custom defined shapes that's being passed to Tldraw

#### Fix style panel opening when disabled ([#1983](https://github.com/tldraw/tldraw/pull/1983))

- When select tool is active, the style menu shouldn't be openable unless a shape is also selected.

Before/After

<img width="300" src="https://github.com/tldraw/tldraw/assets/98838967/91ea55c8-0fcc-4f73-b61e-565829a5f25e" />
<img width="300" src="https://github.com/tldraw/tldraw/assets/98838967/ee4070fe-e236-4818-8fb4-43520210102b" />

#### [fix] pinch events ([#1979](https://github.com/tldraw/tldraw/pull/1979))

- Improve pinch gesture events.

#### Fix text-wrapping on Safari ([#1980](https://github.com/tldraw/tldraw/pull/1980))

- Fix text wrapping differently on Safari and Chrome/Firefox

Before/After

<image width="350" src="https://github.com/tldraw/tldraw/assets/98838967/320171b4-61e0-4a41-b8d3-830bd90bea65">
<image width="350" src="https://github.com/tldraw/tldraw/assets/98838967/b42d7156-0ce9-4894-9692-9338dc931b79">

#### Remove focus management ([#1953](https://github.com/tldraw/tldraw/pull/1953))

- [editor] Make autofocus default, remove automatic blur / focus events.

#### [fix] Drawing tool touch for first pen mark ([#1977](https://github.com/tldraw/tldraw/pull/1977))

- [fix] Accidental palm inputs when using iPad pencil

#### Remove targeted editing from text ([#1962](https://github.com/tldraw/tldraw/pull/1962))

- Fixed some cases where text would get selected in the wrong place.
- Changed the behaviour of text selection. Removed 'deep editing'.

#### fix line bugs ([#1936](https://github.com/tldraw/tldraw/pull/1936))

- This PR patches a couple of bugs which led to straight draw lines and beziered dash lines not rendering on the canvas

Before & After:

<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/e0ca7d54-506f-4014-b65a-6b61a98e3665" />
<image width="250" src="https://github.com/tldraw/tldraw/assets/98838967/90c9fa12-1bcb-430d-80c7-97e1faacea16" />

#### Allow right clicking selection backgrounds ([#1968](https://github.com/tldraw/tldraw/pull/1968))

- Improved right click behaviour.

#### Mark an undo before toggling lock ([#1969](https://github.com/tldraw/tldraw/pull/1969))

- Mark an undo before toggling locked.

#### Stop editing frame headers when clicking inside a frame. ([#1955](https://github.com/tldraw/tldraw/pull/1955))

- Stop editing frame headers when clicking inside of a frame.

#### Lokalise: Translations update ([#1964](https://github.com/tldraw/tldraw/pull/1964))

* Updated community translations for German and Galician

#### [improvement] improve arrows (for real) ([#1957](https://github.com/tldraw/tldraw/pull/1957))

- Improve arrows.

#### [feature] Include `sources` in `TLExternalContent` ([#1925](https://github.com/tldraw/tldraw/pull/1925))

- [editor / tldraw] add `sources` to `TLExternalContent`

#### [improvement] quick actions ([#1922](https://github.com/tldraw/tldraw/pull/1922))

- Improve the menu / kbds behavior when select tool is not active

#### Fix shape drag perf ([#1932](https://github.com/tldraw/tldraw/pull/1932))

- Fixes a perf regression for dragging shapes around

#### Firefox: Fix dropdowns not opening with touch ([#1923](https://github.com/tldraw/tldraw/pull/1923))

- Firefox: Fixed dropdown menus not opening with touch.

#### Use smarter rounding for shape container div width/height ([#1930](https://github.com/tldraw/tldraw/pull/1930))

- Improves the precision of the shape dimensions rounding logic

#### Fix lines being draggable via their background ([#1920](https://github.com/tldraw/tldraw/pull/1920))

- None - unreleased bug

#### Fix first handle of line snapping to itself ([#1912](https://github.com/tldraw/tldraw/pull/1912))

- Fixed a bug where the first handle of a line shape could snap to itself.

#### [fix] Moving group items inside of a frame (dropping) ([#1886](https://github.com/tldraw/tldraw/pull/1886))

- Fix bug: ungroup when moving a shape in a group in a frame.

#### [fix] id properties of undefined (#1730) ([#1919](https://github.com/tldraw/tldraw/pull/1919))

- Fixed a bug similar #1730

#### :recycle: fix: editing is not terminated after the conversion is confirmed. ([#1885](https://github.com/tldraw/tldraw/pull/1885))

-  fix: editing is not terminated after the conversion is confirmed.

#### Update community translations ([#1889](https://github.com/tldraw/tldraw/pull/1889))

- Updated translations for Russian, Ukrainian, and Simplified Chinese

#### Fix line wobble ([#1915](https://github.com/tldraw/tldraw/pull/1915))

- Fixes an issue where lines would wobble as you dragged the handles around

#### Fix selecting one shape from selection group ([#1905](https://github.com/tldraw/tldraw/pull/1905))

- Fix bug when selecting a single shape from a selection group

Before

https://github.com/tldraw/tldraw/assets/98838967/1412f9c6-d466-42b3-af94-d08cbc1656be

After
![Kapture 2023-09-18 at 14 15 10](https://github.com/tldraw/tldraw/assets/98838967/70a7336d-7905-4b4c-b684-d5d62f2383b3)

#### Fix highlighter dots not being clickable ([#1903](https://github.com/tldraw/tldraw/pull/1903))

- None - unreleased bug

#### Fix video shape controls ([#1909](https://github.com/tldraw/tldraw/pull/1909))

- Fixes pointer events for editing video shapes.

#### Fix line handles ([#1904](https://github.com/tldraw/tldraw/pull/1904))

- Fixes an issue where line handles were slightly offset from the indicator line.

#### Fix pinch start with toolbar open ([#1895](https://github.com/tldraw/tldraw/pull/1895))

- Fixes a bug that could trigger undo by accident when closing the style toolbar via a pinch gesture on mobile.

#### [wip] Viewport focus of editing shapes ([#1873](https://github.com/tldraw/tldraw/pull/1873))

Removed a feature to reset the viewport back to a shape that is being edited.

(Before) Don't be held back by the past
![Kapture 2023-09-15 at 10 57 29](https://github.com/tldraw/tldraw/assets/98838967/d8891621-766e-46a2-b1ca-afa968b7f08c)

(After) You are free to find new avenues of exploration
![Kapture 2023-09-15 at 11 02 36](https://github.com/tldraw/tldraw/assets/98838967/82f318ab-944b-41bd-8297-a35467a15987)

#### Migrate snapshot ([#1843](https://github.com/tldraw/tldraw/pull/1843))

- [editor] add `Store.migrateSnapshot`

#### [fix] zero width / height bounds ([#1840](https://github.com/tldraw/tldraw/pull/1840))

- Fix bug with straight lines / arrows

#### clamp x-box and check-box lines to stay within box at small scales ([#1860](https://github.com/tldraw/tldraw/pull/1860))

- Fixes a regression introduced by the geometry refactor related to x-box and checkbox resizing.

#### Fix paste transform ([#1859](https://github.com/tldraw/tldraw/pull/1859))

- Fixes a bug affecting the position of pasted content inside frames.

#### Fix indicator transform miscalculation ([#1852](https://github.com/tldraw/tldraw/pull/1852))

- Fixes indicator transform miscalculation on android and windows

#### update currentPageShapesSorted reference in docs ([#1851](https://github.com/tldraw/tldraw/pull/1851))

- Add a brief release note for your PR here.

#### [fix] awful rendering issue ([#1842](https://github.com/tldraw/tldraw/pull/1842))

- [fix] iframe rendering issue

#### fix typo ([#1831](https://github.com/tldraw/tldraw/pull/1831))

- Just fixed a typo in the docs

#### [feature] Asset props ([#1824](https://github.com/tldraw/tldraw/pull/1824))

- [@tldraw/tldraw] add asset props

#### [fix] snapping bug ([#1819](https://github.com/tldraw/tldraw/pull/1819))

- [fix] crash that could occur when snapping

#### [fix] editing video shapes ([#1821](https://github.com/tldraw/tldraw/pull/1821))

- Fix bug with editing video shapes.

#### [feature] unlock all action ([#1820](https://github.com/tldraw/tldraw/pull/1820))

- Adds the unlock all feature.

#### [fix] bug with eventemitter3 default export ([#1818](https://github.com/tldraw/tldraw/pull/1818))

- [@tldraw/editor] updates eventemitter3 import to fix issue with Astro builds.

#### Add next cache to clean command ([#1811](https://github.com/tldraw/tldraw/pull/1811))

- Internal tooling change

#### Fix text editing in page menu popover ([#1790](https://github.com/tldraw/tldraw/pull/1790))

- (fix) page menu editing

#### [fix] embeds switching / tldraw embed ([#1792](https://github.com/tldraw/tldraw/pull/1792))

- [fix] tldraw embeds

#### Custom rendering margin / don't cull selected shapes ([#1788](https://github.com/tldraw/tldraw/pull/1788))

- [editor] add `Editor.renderingBoundsMargin`

#### Camera APIs ([#1786](https://github.com/tldraw/tldraw/pull/1786))

- (editor) improve camera commands

#### environment manager ([#1784](https://github.com/tldraw/tldraw/pull/1784))

- [editor] Move environment flags to environment manager

#### Editor commands API / effects ([#1778](https://github.com/tldraw/tldraw/pull/1778))

- tbd

#### [feature] Add val town embed ([#1777](https://github.com/tldraw/tldraw/pull/1777))

- (feature) val town

#### export `UiEventsProvider` ([#1774](https://github.com/tldraw/tldraw/pull/1774))

- [@tldraw/tldraw] export ui events, so that UI hooks can work without context

#### remove useForceSolid effect for geo / line shapes ([#1769](https://github.com/tldraw/tldraw/pull/1769))

- Remove the force solid switching for geo / line shapes

#### [fix] shape indicator showing when locked shapes are hovered ([#1771](https://github.com/tldraw/tldraw/pull/1771))

- locked shapes do not show an indicator when hovered

#### remove `selectionPageCenter` ([#1766](https://github.com/tldraw/tldraw/pull/1766))

- [dev] Removes `Editor.selectionPageCenter`

#### rename selection page bounds ([#1763](https://github.com/tldraw/tldraw/pull/1763))

- [editor] rename `selectedPageBounds` to `selectionPageBounds`

#### `ShapeUtil.getGeometry`, selection rewrite ([#1751](https://github.com/tldraw/tldraw/pull/1751))

- [editor] Remove `ShapeUtil.getBounds`, `ShapeUtil.getOutline`, `ShapeUtil.hitTestPoint`, `ShapeUtil.hitTestLineSegment`
- [editor] Add `ShapeUtil.getGeometry`
- [editor] Add `Editor.getShapeGeometry`

#### Fix asset urls ([#1758](https://github.com/tldraw/tldraw/pull/1758))

- Fixed asset urls

#### [fix] arrow snapping bug ([#1756](https://github.com/tldraw/tldraw/pull/1756))

- [fix] arrow snapping

#### [fix] dark mode ([#1754](https://github.com/tldraw/tldraw/pull/1754))

- [fix] dark mode colors not updating

#### Remove helpers / extraneous API methods. ([#1745](https://github.com/tldraw/tldraw/pull/1745))

- [tldraw] rename `useReadonly` to `useReadOnly`
- [editor] remove `Editor.isDarkMode`
- [editor] remove `Editor.isChangingStyle`
- [editor] remove `Editor.isCoarsePointer`
- [editor] remove `Editor.isDarkMode`
- [editor] remove `Editor.isFocused`
- [editor] remove `Editor.isGridMode`
- [editor] remove `Editor.isPenMode`
- [editor] remove `Editor.isReadOnly`
- [editor] remove `Editor.isSnapMode`
- [editor] remove `Editor.isToolLocked`
- [editor] remove `Editor.locale`
- [editor] rename `Editor.pageState` to `Editor.currentPageState`
- [editor] add `Editor.pageStates`
- [editor] add `Editor.setErasingIds`
- [editor] add `Editor.setEditingId`
- [editor] add several new component overrides

#### add shapes docs content ([#1705](https://github.com/tldraw/tldraw/pull/1705))

- Documentation: Added more info about shapes.

#### fix: escape eraser tool on escape ([#1732](https://github.com/tldraw/tldraw/pull/1732))

- escape eraser tool on escape

#### fix: arrow label dark mode color ([#1733](https://github.com/tldraw/tldraw/pull/1733))

- fixed arrow label dark mode color

#### tldraw zero - package shuffle ([#1710](https://github.com/tldraw/tldraw/pull/1710))

- [@tldraw/editor] lots, wip
- [@tldraw/ui] gone, merged to tldraw/tldraw
- [@tldraw/polyfills] gone, merged to tldraw/editor
- [@tldraw/primitives] gone, merged to tldraw/editor / tldraw/tldraw
- [@tldraw/indices] gone, merged to tldraw/editor
- [@tldraw/file-format] gone, merged to tldraw/tldraw

#### [fix] add cloud tooltip ([#1728](https://github.com/tldraw/tldraw/pull/1728))

- Add a brief release note for your PR here.

#### (2/2) Add content to Tools docs page. ([#1721](https://github.com/tldraw/tldraw/pull/1721))

- Tools docs.

#### tweaks for cloud shape ([#1723](https://github.com/tldraw/tldraw/pull/1723))

- Add a brief release note for your PR here.

#### Add cloud shape ([#1708](https://github.com/tldraw/tldraw/pull/1708))

- Adds a cloud shape.

#### [refactor] reduce dependencies on shape utils in editor ([#1693](https://github.com/tldraw/tldraw/pull/1693))

- removes shape utils from the arguments of `isShapeOfType`, replacing with a generic
- removes shape utils from the arguments of `getShapeUtil`, replacing with a generic
- moves custom arrow info cache out of the util and into the editor class
- changes the a tool's `shapeType` to be a string instead of a shape util

#### Make some missing tsdocs appear on the docs site ([#1706](https://github.com/tldraw/tldraw/pull/1706))

- Docs: Fixed some missing docs for the TldrawEditor component.

#### [hot take] remove `tool` from shape definition ([#1691](https://github.com/tldraw/tldraw/pull/1691))

- [dev] Removed the `tool` property from `defineShape`

#### [refactor] reordering shapes ([#1718](https://github.com/tldraw/tldraw/pull/1718))

- [api] removes `Editor.getParentsMappedToChildren`
- [api] removes `Editor.reorderShapes`
- [api] moves reordering shapes code into its own file, outside of the editor

#### remove state checks for brush and zoom brush ([#1717](https://github.com/tldraw/tldraw/pull/1717))

- [editor] remove `editor.isIn` state checks for displaying brush and zoom brush.

#### Add API links to all docs pages ([#1661](https://github.com/tldraw/tldraw/pull/1661))

- Documentation: Added links to API reference in guides.

#### Go back to default cursor when done resizing. ([#1700](https://github.com/tldraw/tldraw/pull/1700))

- Switch back to the default cursor after you are done inserting a new text shape.

#### Firefox: Fix coarse pointer issue ([#1701](https://github.com/tldraw/tldraw/pull/1701))

- Fixed firefox not being able to use cursor chat when using a touch screen on desktop.

#### Fix tsdocs for TldrawUi component ([#1707](https://github.com/tldraw/tldraw/pull/1707))

- Docs: Show some docs missing from TldrawUi component.

---

#### 💥 Breaking Change

- `@tldraw/editor`, `@tldraw/tldraw`
  - [improvement] prevent editing in readonly [#1990](https://github.com/tldraw/tldraw/pull/1990) ([@steveruizok](https://github.com/steveruizok))
  - Remove focus management [#1953](https://github.com/tldraw/tldraw/pull/1953) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
  - Make user preferences optional [#1963](https://github.com/tldraw/tldraw/pull/1963) ([@ds300](https://github.com/ds300))
  - [fix] style changes [#1814](https://github.com/tldraw/tldraw/pull/1814) ([@steveruizok](https://github.com/steveruizok))
  - Cleanup page state commands [#1800](https://github.com/tldraw/tldraw/pull/1800) ([@steveruizok](https://github.com/steveruizok))
  - Rendering / cropping side-effects [#1799](https://github.com/tldraw/tldraw/pull/1799) ([@steveruizok](https://github.com/steveruizok))
  - history options / markId / createPage [#1796](https://github.com/tldraw/tldraw/pull/1796) ([@steveruizok](https://github.com/steveruizok))
  - Update setter names, `setXXShapeId` rather than `setXXId` [#1789](https://github.com/tldraw/tldraw/pull/1789) ([@steveruizok](https://github.com/steveruizok))
  - Rename shapes apis [#1787](https://github.com/tldraw/tldraw/pull/1787) ([@steveruizok](https://github.com/steveruizok))
  - Camera APIs [#1786](https://github.com/tldraw/tldraw/pull/1786) ([@steveruizok](https://github.com/steveruizok))
  - environment manager [#1784](https://github.com/tldraw/tldraw/pull/1784) ([@steveruizok](https://github.com/steveruizok))
  - remove `selectionPageCenter` [#1766](https://github.com/tldraw/tldraw/pull/1766) ([@steveruizok](https://github.com/steveruizok))
  - rename selection page bounds [#1763](https://github.com/tldraw/tldraw/pull/1763) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - Remove targeted editing from text [#1962](https://github.com/tldraw/tldraw/pull/1962) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [improvement] quick actions [#1922](https://github.com/tldraw/tldraw/pull/1922) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`
  - SideEffectManager [#1785](https://github.com/tldraw/tldraw/pull/1785) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - Revert "Editor commands API / effects" [#1783](https://github.com/tldraw/tldraw/pull/1783) ([@steveruizok](https://github.com/steveruizok))
  - Editor commands API / effects [#1778](https://github.com/tldraw/tldraw/pull/1778) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - `ShapeUtil.getGeometry`, selection rewrite [#1751](https://github.com/tldraw/tldraw/pull/1751) ([@steveruizok](https://github.com/steveruizok))
  - More cleanup, focus bug fixes [#1749](https://github.com/tldraw/tldraw/pull/1749) ([@steveruizok](https://github.com/steveruizok))
  - Remove helpers / extraneous API methods. [#1745](https://github.com/tldraw/tldraw/pull/1745) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/utils`
  - move some utils into tldraw/utils [#1750](https://github.com/tldraw/tldraw/pull/1750) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - tldraw zero - package shuffle [#1710](https://github.com/tldraw/tldraw/pull/1710) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - [refactor] reduce dependencies on shape utils in editor [#1693](https://github.com/tldraw/tldraw/pull/1693) ([@steveruizok](https://github.com/steveruizok))
  - [hot take] remove `tool` from shape definition [#1691](https://github.com/tldraw/tldraw/pull/1691) ([@TodePond](https://github.com/TodePond))
  - [refactor] reordering shapes [#1718](https://github.com/tldraw/tldraw/pull/1718) ([@steveruizok](https://github.com/steveruizok))

#### 🚀 Enhancement

- `@tldraw/editor`, `@tldraw/tldraw`
  - Debugging cleanup / misc cleanup [#2025](https://github.com/tldraw/tldraw/pull/2025) ([@steveruizok](https://github.com/steveruizok))
  - [feature] Include `sources` in `TLExternalContent` [#1925](https://github.com/tldraw/tldraw/pull/1925) ([@steveruizok](https://github.com/steveruizok))
  - Add snapshot prop, examples [#1856](https://github.com/tldraw/tldraw/pull/1856) ([@steveruizok](https://github.com/steveruizok))
  - [fix] arrow snapping bug [#1756](https://github.com/tldraw/tldraw/pull/1756) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - Fix arrow handle snapping, snapping to text labels, selection of text labels [#1910](https://github.com/tldraw/tldraw/pull/1910) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - Migrate snapshot [#1843](https://github.com/tldraw/tldraw/pull/1843) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - export asset stuff [#1829](https://github.com/tldraw/tldraw/pull/1829) ([@steveruizok](https://github.com/steveruizok))
  - [feature] Asset props [#1824](https://github.com/tldraw/tldraw/pull/1824) ([@steveruizok](https://github.com/steveruizok))
  - [feature] unlock all action [#1820](https://github.com/tldraw/tldraw/pull/1820) ([@steveruizok](https://github.com/steveruizok))
  - export `UiEventsProvider` [#1774](https://github.com/tldraw/tldraw/pull/1774) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Add className as prop to Canvas [#1827](https://github.com/tldraw/tldraw/pull/1827) ([@steveruizok](https://github.com/steveruizok))
  - refactor `parentsToChildrenWithIndexes` [#1764](https://github.com/tldraw/tldraw/pull/1764) ([@steveruizok](https://github.com/steveruizok))
  - remove state checks for brush and zoom brush [#1717](https://github.com/tldraw/tldraw/pull/1717) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/tldraw`
  - [improvement] More selection logic [#1806](https://github.com/tldraw/tldraw/pull/1806) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/tlschema`
  - [feature] Add val town embed [#1777](https://github.com/tldraw/tldraw/pull/1777) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`, `@tldraw/validate`
  - Add shapes to exports [#1776](https://github.com/tldraw/tldraw/pull/1776) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`
  - Add cloud shape [#1708](https://github.com/tldraw/tldraw/pull/1708) ([@ds300](https://github.com/ds300))

#### 🐛 Bug Fix

- [fix] Multiple example [#2026](https://github.com/tldraw/tldraw/pull/2026) ([@steveruizok](https://github.com/steveruizok))
- Fix vs code extension. Prepare for new release. [#2011](https://github.com/tldraw/tldraw/pull/2011) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- Lokalise: Translations update [#1964](https://github.com/tldraw/tldraw/pull/1964) ([@TodePond](https://github.com/TodePond))
- Update community translations [#1889](https://github.com/tldraw/tldraw/pull/1889) ([@TodePond](https://github.com/TodePond))
- Bump vs code version. [#1735](https://github.com/tldraw/tldraw/pull/1735) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- [fix] add cloud tooltip [#1728](https://github.com/tldraw/tldraw/pull/1728) ([@ds300](https://github.com/ds300))
- Bump vs code version. [#1719](https://github.com/tldraw/tldraw/pull/1719) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/tldraw`
  - Update readme [#2027](https://github.com/tldraw/tldraw/pull/2027) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Minimap interactions [#2012](https://github.com/tldraw/tldraw/pull/2012) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Image size [#2002](https://github.com/tldraw/tldraw/pull/2002) ([@steveruizok](https://github.com/steveruizok))
  - [fix] tool lock button in toolbar [#2009](https://github.com/tldraw/tldraw/pull/2009) ([@steveruizok](https://github.com/steveruizok))
  - fix cloud rendering [#2008](https://github.com/tldraw/tldraw/pull/2008) ([@ds300](https://github.com/ds300))
  - Fix hooks error. [#2000](https://github.com/tldraw/tldraw/pull/2000) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix style panel opening when disabled [#1983](https://github.com/tldraw/tldraw/pull/1983) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - [fix] Drawing tool touch for first pen mark [#1977](https://github.com/tldraw/tldraw/pull/1977) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Screen bounds offset after editing text [#1976](https://github.com/tldraw/tldraw/pull/1976) ([@steveruizok](https://github.com/steveruizok))
  - fix line bugs [#1936](https://github.com/tldraw/tldraw/pull/1936) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git) [@steveruizok](https://github.com/steveruizok))
  - Mark an undo before toggling lock [#1969](https://github.com/tldraw/tldraw/pull/1969) ([@steveruizok](https://github.com/steveruizok))
  - Stop editing frame headers when clicking inside a frame. [#1955](https://github.com/tldraw/tldraw/pull/1955) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@TodePond](https://github.com/TodePond))
  - Firefox: Fix dropdowns not opening with touch [#1923](https://github.com/tldraw/tldraw/pull/1923) ([@TodePond](https://github.com/TodePond))
  - Fix lines being draggable via their background [#1920](https://github.com/tldraw/tldraw/pull/1920) ([@TodePond](https://github.com/TodePond))
  - Fix first handle of line snapping to itself [#1912](https://github.com/tldraw/tldraw/pull/1912) ([@TodePond](https://github.com/TodePond))
  - [fix] id properties of undefined (#1730) [#1919](https://github.com/tldraw/tldraw/pull/1919) ([@momenthana](https://github.com/momenthana))
  - :recycle: fix: editing is not terminated after the conversion is confirmed. [#1885](https://github.com/tldraw/tldraw/pull/1885) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
  - Fix selecting one shape from selection group [#1905](https://github.com/tldraw/tldraw/pull/1905) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - [fix] help menu css [#1888](https://github.com/tldraw/tldraw/pull/1888) ([@steveruizok](https://github.com/steveruizok))
  - Fix highlighter dots not being clickable [#1903](https://github.com/tldraw/tldraw/pull/1903) ([@TodePond](https://github.com/TodePond))
  - Fix video shape controls [#1909](https://github.com/tldraw/tldraw/pull/1909) ([@ds300](https://github.com/ds300))
  - Fix line handles [#1904](https://github.com/tldraw/tldraw/pull/1904) ([@ds300](https://github.com/ds300))
  - Fix pinch start with toolbar open [#1895](https://github.com/tldraw/tldraw/pull/1895) ([@ds300](https://github.com/ds300))
  - clamp x-box and check-box lines to stay within box at small scales [#1860](https://github.com/tldraw/tldraw/pull/1860) ([@ds300](https://github.com/ds300))
  - [fix] exit penmode [#1847](https://github.com/tldraw/tldraw/pull/1847) ([@steveruizok](https://github.com/steveruizok))
  - [fix] assets and content handlers [#1846](https://github.com/tldraw/tldraw/pull/1846) ([@steveruizok](https://github.com/steveruizok))
  - [fix] line tool bug with tool locked [#1841](https://github.com/tldraw/tldraw/pull/1841) ([@steveruizok](https://github.com/steveruizok))
  - [fix] arrows bind to locked shapes [#1833](https://github.com/tldraw/tldraw/pull/1833) ([@steveruizok](https://github.com/steveruizok) [@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] Collaborator scribble on tldraw [#1804](https://github.com/tldraw/tldraw/pull/1804) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Don't make arrows shapes to arrows [#1793](https://github.com/tldraw/tldraw/pull/1793) ([@steveruizok](https://github.com/steveruizok))
  - Fix text editing in page menu popover [#1790](https://github.com/tldraw/tldraw/pull/1790) ([@steveruizok](https://github.com/steveruizok))
  - Fix outlines on text shapes [#1781](https://github.com/tldraw/tldraw/pull/1781) ([@steveruizok](https://github.com/steveruizok))
  - remove useForceSolid effect for geo / line shapes [#1769](https://github.com/tldraw/tldraw/pull/1769) ([@steveruizok](https://github.com/steveruizok))
  - [fix] arrow rendering safari [#1767](https://github.com/tldraw/tldraw/pull/1767) ([@steveruizok](https://github.com/steveruizok))
  - [fix] revert legacy changes to buildFromV1Document.ts [#1761](https://github.com/tldraw/tldraw/pull/1761) ([@steveruizok](https://github.com/steveruizok))
  - Fix asset urls [#1758](https://github.com/tldraw/tldraw/pull/1758) ([@lakesare](https://github.com/lakesare))
  - [fix]: Fix typo in shapeType declaration [#1747](https://github.com/tldraw/tldraw/pull/1747) ([@ricardo-crespo](https://github.com/ricardo-crespo) [@steveruizok](https://github.com/steveruizok))
  - fix: escape eraser tool on escape [#1732](https://github.com/tldraw/tldraw/pull/1732) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))
  - fix: arrow label dark mode color [#1733](https://github.com/tldraw/tldraw/pull/1733) ([@gabrielchl](https://github.com/gabrielchl) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - fix screen bounds not updating [#2022](https://github.com/tldraw/tldraw/pull/2022) ([@SomeHats](https://github.com/SomeHats))
  - [improvement] Refactor curved arrows [#2019](https://github.com/tldraw/tldraw/pull/2019) ([@steveruizok](https://github.com/steveruizok))
  - [fix] focus events [#2013](https://github.com/tldraw/tldraw/pull/2013) ([@steveruizok](https://github.com/steveruizok))
  - Re-focus on focus. [#2010](https://github.com/tldraw/tldraw/pull/2010) ([@steveruizok](https://github.com/steveruizok))
  - [fix] X box shape arrow intersections [#2006](https://github.com/tldraw/tldraw/pull/2006) ([@steveruizok](https://github.com/steveruizok))
  - Fix group opacity [#1997](https://github.com/tldraw/tldraw/pull/1997) ([@ds300](https://github.com/ds300))
  - [fix] Escape key exiting full screen while editing shapes [#1986](https://github.com/tldraw/tldraw/pull/1986) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Hovered indicators shown when coarse pointer [#1985](https://github.com/tldraw/tldraw/pull/1985) ([@steveruizok](https://github.com/steveruizok))
  - Sliiiightly darken muted-2 color. [#1981](https://github.com/tldraw/tldraw/pull/1981) ([@steveruizok](https://github.com/steveruizok))
  - [fix] pinch events [#1979](https://github.com/tldraw/tldraw/pull/1979) ([@steveruizok](https://github.com/steveruizok))
  - Make state node methods arrow functions [#1973](https://github.com/tldraw/tldraw/pull/1973) ([@steveruizok](https://github.com/steveruizok))
  - Arrows followup [#1972](https://github.com/tldraw/tldraw/pull/1972) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] improve arrows (for real) [#1957](https://github.com/tldraw/tldraw/pull/1957) ([@steveruizok](https://github.com/steveruizok))
  - fix clipping on nested non-intersecting frames [#1934](https://github.com/tldraw/tldraw/pull/1934) ([@SomeHats](https://github.com/SomeHats))
  - Use smarter rounding for shape container div width/height [#1930](https://github.com/tldraw/tldraw/pull/1930) ([@ds300](https://github.com/ds300))
  - Fix line wobble [#1915](https://github.com/tldraw/tldraw/pull/1915) ([@ds300](https://github.com/ds300))
  - [fix] right click [#1891](https://github.com/tldraw/tldraw/pull/1891) ([@steveruizok](https://github.com/steveruizok))
  - [wip] Viewport focus of editing shapes [#1873](https://github.com/tldraw/tldraw/pull/1873) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - Fix indicator transform miscalculation [#1852](https://github.com/tldraw/tldraw/pull/1852) ([@ds300](https://github.com/ds300))
  - [fix] pointer events in shapes [#1855](https://github.com/tldraw/tldraw/pull/1855) ([@steveruizok](https://github.com/steveruizok))
  - [fix] overlays stacking [#1849](https://github.com/tldraw/tldraw/pull/1849) ([@steveruizok](https://github.com/steveruizok))
  - [fix] awful rendering issue [#1842](https://github.com/tldraw/tldraw/pull/1842) ([@steveruizok](https://github.com/steveruizok))
  - [fix] svg overlays when browser zoom is not 100% [#1836](https://github.com/tldraw/tldraw/pull/1836) ([@steveruizok](https://github.com/steveruizok))
  - Allow setting `user` as a prop [#1832](https://github.com/tldraw/tldraw/pull/1832) ([@SomeHats](https://github.com/SomeHats))
  - [fix] snapping bug [#1819](https://github.com/tldraw/tldraw/pull/1819) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Replace `findLast` for browser compat [#1822](https://github.com/tldraw/tldraw/pull/1822) ([@steveruizok](https://github.com/steveruizok))
  - [fix] bug with eventemitter3 default export [#1818](https://github.com/tldraw/tldraw/pull/1818) ([@steveruizok](https://github.com/steveruizok))
  - [fix] handles updates [#1779](https://github.com/tldraw/tldraw/pull/1779) ([@steveruizok](https://github.com/steveruizok))
  - [fix] transform errors [#1772](https://github.com/tldraw/tldraw/pull/1772) ([@steveruizok](https://github.com/steveruizok))
  - [fix] shape indicator showing when locked shapes are hovered [#1771](https://github.com/tldraw/tldraw/pull/1771) ([@steveruizok](https://github.com/steveruizok))
  - tweaks for cloud shape [#1723](https://github.com/tldraw/tldraw/pull/1723) ([@ds300](https://github.com/ds300))
  - Go back to default cursor when done resizing. [#1700](https://github.com/tldraw/tldraw/pull/1700) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Firefox: Fix coarse pointer issue [#1701](https://github.com/tldraw/tldraw/pull/1701) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/tldraw`
  - frame label fix [#2016](https://github.com/tldraw/tldraw/pull/2016) ([@ds300](https://github.com/ds300))
  - [fix] Focus events (actually) [#2015](https://github.com/tldraw/tldraw/pull/2015) ([@steveruizok](https://github.com/steveruizok))
  - Contain all the things [#1999](https://github.com/tldraw/tldraw/pull/1999) ([@steveruizok](https://github.com/steveruizok))
  - fix text in geo shapes not causing its container to grow [#2003](https://github.com/tldraw/tldraw/pull/2003) ([@SomeHats](https://github.com/SomeHats))
  - Fix an issue with arrow creation. [#2004](https://github.com/tldraw/tldraw/pull/2004) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Fix text-wrapping on Safari [#1980](https://github.com/tldraw/tldraw/pull/1980) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
  - [fix] text shape outline [#1974](https://github.com/tldraw/tldraw/pull/1974) ([@steveruizok](https://github.com/steveruizok))
  - Allow right clicking selection backgrounds [#1968](https://github.com/tldraw/tldraw/pull/1968) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [fix] geo shape text label placement [#1927](https://github.com/tldraw/tldraw/pull/1927) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
  - expanded highlighter geometry [#1929](https://github.com/tldraw/tldraw/pull/1929) ([@SomeHats](https://github.com/SomeHats))
  - [fix] Moving group items inside of a frame (dropping) [#1886](https://github.com/tldraw/tldraw/pull/1886) ([@mr04vv](https://github.com/mr04vv) [@steveruizok](https://github.com/steveruizok))
  - [fix] iframe losing focus on pointer down [#1848](https://github.com/tldraw/tldraw/pull/1848) ([@steveruizok](https://github.com/steveruizok))
  - [fix] zero width / height bounds [#1840](https://github.com/tldraw/tldraw/pull/1840) ([@steveruizok](https://github.com/steveruizok))
  - avoid pixel rounding / transformation miscalc for overlay items [#1858](https://github.com/tldraw/tldraw/pull/1858) ([@BrianHung](https://github.com/BrianHung) [@ds300](https://github.com/ds300))
  - Fix paste transform [#1859](https://github.com/tldraw/tldraw/pull/1859) ([@ds300](https://github.com/ds300))
  - [fix] text editing outline when scaled [#1826](https://github.com/tldraw/tldraw/pull/1826) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Line shape rendering [#1825](https://github.com/tldraw/tldraw/pull/1825) ([@steveruizok](https://github.com/steveruizok))
  - [fix] remove CSS radius calculations [#1823](https://github.com/tldraw/tldraw/pull/1823) ([@steveruizok](https://github.com/steveruizok))
  - [fix] editing video shapes [#1821](https://github.com/tldraw/tldraw/pull/1821) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Sticky text content / hovered shapes [#1808](https://github.com/tldraw/tldraw/pull/1808) ([@steveruizok](https://github.com/steveruizok))
  - [fix] page to screen [#1797](https://github.com/tldraw/tldraw/pull/1797) ([@steveruizok](https://github.com/steveruizok))
  - Custom rendering margin / don't cull selected shapes [#1788](https://github.com/tldraw/tldraw/pull/1788) ([@steveruizok](https://github.com/steveruizok))
  - [fix] minimap, common page bounds [#1770](https://github.com/tldraw/tldraw/pull/1770) ([@steveruizok](https://github.com/steveruizok))
  - [fix] restore bg option, fix calculations [#1765](https://github.com/tldraw/tldraw/pull/1765) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/store`
  - Fix shape drag perf [#1932](https://github.com/tldraw/tldraw/pull/1932) ([@ds300](https://github.com/ds300))
- `@tldraw/tldraw`, `@tldraw/tlschema`
  - [fix] embeds switching / tldraw embed [#1792](https://github.com/tldraw/tldraw/pull/1792) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - [fix] dark mode [#1754](https://github.com/tldraw/tldraw/pull/1754) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- Remove docs source. [#2030](https://github.com/tldraw/tldraw/pull/2030) ([@steveruizok](https://github.com/steveruizok))
- [infra] missing await [#1951](https://github.com/tldraw/tldraw/pull/1951) ([@ds300](https://github.com/ds300))
- [infra] maybe fix canary publish [#1950](https://github.com/tldraw/tldraw/pull/1950) ([@ds300](https://github.com/ds300))
- fix typo [#1831](https://github.com/tldraw/tldraw/pull/1831) ([@judicaelandria](https://github.com/judicaelandria))
- Add next cache to clean command [#1811](https://github.com/tldraw/tldraw/pull/1811) ([@ds300](https://github.com/ds300))
- remove yjs example [#1795](https://github.com/tldraw/tldraw/pull/1795) ([@steveruizok](https://github.com/steveruizok))
- support custom shapes in yjs example [#1737](https://github.com/tldraw/tldraw/pull/1737) ([@steveruizok](https://github.com/steveruizok))
- [internal] Add basic list to examples [#1688](https://github.com/tldraw/tldraw/pull/1688) ([@steveruizok](https://github.com/steveruizok))
- cleanup [#1711](https://github.com/tldraw/tldraw/pull/1711) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tldraw`
  - [fix] CSS reload in dev [#1791](https://github.com/tldraw/tldraw/pull/1791) ([@steveruizok](https://github.com/steveruizok))

#### 📝 Documentation

- fix(docs): update shapes docs add the array of defined shapes [#1949](https://github.com/tldraw/tldraw/pull/1949) ([@judicaelandria](https://github.com/judicaelandria) [@steveruizok](https://github.com/steveruizok))
- update currentPageShapesSorted reference in docs [#1851](https://github.com/tldraw/tldraw/pull/1851) ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Fix broken link in docs [#1830](https://github.com/tldraw/tldraw/pull/1830) ([@jmduke](https://github.com/jmduke) [@steveruizok](https://github.com/steveruizok))
- add shapes docs content [#1705](https://github.com/tldraw/tldraw/pull/1705) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- (2/2) Add content to Tools docs page. [#1721](https://github.com/tldraw/tldraw/pull/1721) ([@TodePond](https://github.com/TodePond))
- Add API links to all docs pages [#1661](https://github.com/tldraw/tldraw/pull/1661) ([@TodePond](https://github.com/TodePond))
- Fix tsdocs for TldrawUi component [#1707](https://github.com/tldraw/tldraw/pull/1707) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`
  - Make some missing tsdocs appear on the docs site [#1706](https://github.com/tldraw/tldraw/pull/1706) ([@TodePond](https://github.com/TodePond))

#### 🧪 Tests

- Fix e2e test [#1748](https://github.com/tldraw/tldraw/pull/1748) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - [fix] Right click groups [#1975](https://github.com/tldraw/tldraw/pull/1975) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- `@tldraw/editor`
  - (chore) bump [#1744](https://github.com/tldraw/tldraw/pull/1744) ([@steveruizok](https://github.com/steveruizok))

#### Authors: 14

- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Evgenia Karunus ([@lakesare](https://github.com/lakesare))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Hana ([@momenthana](https://github.com/momenthana))
- Judicael ([@judicaelandria](https://github.com/judicaelandria))
- Justin Duke ([@jmduke](https://github.com/jmduke))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Ricardo Crespo ([@ricardo-crespo](https://github.com/ricardo-crespo))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
- Taha ([@Taha-Hassan-Git](https://github.com/Taha-Hassan-Git))
- Takuto Mori Gump ([@mr04vv](https://github.com/mr04vv))

---

# v2.0.0-alpha.14 (Tue Jul 04 2023)

### Release Notes

#### Disable styles panel button on mobile when using the laser tool. ([#1704](https://github.com/tldraw/tldraw/pull/1704))

- Disable the styles panel button for laser tool on mobile.

#### remove lock option from highlighter ([#1703](https://github.com/tldraw/tldraw/pull/1703))

- We no longer show the tool lock option for highlighter - it didn't do anything anyway

#### [fix] penmode ([#1698](https://github.com/tldraw/tldraw/pull/1698))

- [fix] pen mode

#### Update readme ([#1686](https://github.com/tldraw/tldraw/pull/1686))

- Documentation: Updated readme to reflect recent library changes.

#### [docs] Fix the types in the Shapes example ([#1681](https://github.com/tldraw/tldraw/pull/1681))

- Documentation: Fix some incorrect types on the Shapes page.

#### [improvement] More nuanced cursor state ([#1682](https://github.com/tldraw/tldraw/pull/1682))

- Improve cursor timeouts and hiding logic.

#### Fix VS Code commits failing on bublic? ([#1680](https://github.com/tldraw/tldraw/pull/1680))

- [internal] fixed commits failing from bublic when using UI

#### [fix] Lock shortcut ([#1677](https://github.com/tldraw/tldraw/pull/1677))

- [@tldraw/editor] Fix lock tool shortcut

#### [fix] comma keyboard shortcuts ([#1675](https://github.com/tldraw/tldraw/pull/1675))

- [@tldraw/editor] Bug fixes on document events.

#### [improvement] add box sizing border box ([#1674](https://github.com/tldraw/tldraw/pull/1674))

- [@tldraw/editor] Add `box-sizing: border-box` to `tl-container`

#### [improvemnet] drop crc, Buffer dependency ([#1673](https://github.com/tldraw/tldraw/pull/1673))

- [@tldraw/editor] Remove peer dependency on buffer.

#### [improvement] export scribble manager ([#1671](https://github.com/tldraw/tldraw/pull/1671))

- [@tldraw/tldraw] Export `ScribbleManager`

#### [feature] add `meta` property to records ([#1627](https://github.com/tldraw/tldraw/pull/1627))

- todo

#### [fix] mutating `snapshot` in `migrateStoreSnapshot` ([#1663](https://github.com/tldraw/tldraw/pull/1663))

- [@tldraw/store] Fixed a bug that would cause `Store.migrateStoreSnapshot` to mutate its `snapshot` argument.

---

#### 🚀 Enhancement

- `@tldraw/editor`
  - [improvement] More nuanced cursor state [#1682](https://github.com/tldraw/tldraw/pull/1682) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] export scribble manager [#1671](https://github.com/tldraw/tldraw/pull/1671) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`, `@tldraw/validate`
  - [feature] add `meta` property to records [#1627](https://github.com/tldraw/tldraw/pull/1627) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Lokalise: Translations update [#1694](https://github.com/tldraw/tldraw/pull/1694) ([@TodePond](https://github.com/TodePond))
- `@tldraw/ui`
  - Disable styles panel button on mobile when using the laser tool. [#1704](https://github.com/tldraw/tldraw/pull/1704) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - remove lock option from highlighter [#1703](https://github.com/tldraw/tldraw/pull/1703) ([@SomeHats](https://github.com/SomeHats))
  - [fix] Lock shortcut [#1677](https://github.com/tldraw/tldraw/pull/1677) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - [fix] penmode [#1698](https://github.com/tldraw/tldraw/pull/1698) ([@steveruizok](https://github.com/steveruizok))
  - [fix] indicator not updating [#1696](https://github.com/tldraw/tldraw/pull/1696) ([@steveruizok](https://github.com/steveruizok))
  - [fix] comma keyboard shortcuts [#1675](https://github.com/tldraw/tldraw/pull/1675) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] add box sizing border box [#1674](https://github.com/tldraw/tldraw/pull/1674) ([@steveruizok](https://github.com/steveruizok))
  - [improvemnet] drop crc, Buffer dependency [#1673](https://github.com/tldraw/tldraw/pull/1673) ([@steveruizok](https://github.com/steveruizok))
  - [fix] Shape rendering [#1670](https://github.com/tldraw/tldraw/pull/1670) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/state`
  - [fix] rename `global` in @tldraw/state to avoid collissions [#1672](https://github.com/tldraw/tldraw/pull/1672) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/store`
  - [fix] mutating `snapshot` in `migrateStoreSnapshot` [#1663](https://github.com/tldraw/tldraw/pull/1663) ([@steveruizok](https://github.com/steveruizok))

#### 🏠 Internal

- [infra] use huppy token for publish-new [#1687](https://github.com/tldraw/tldraw/pull/1687) ([@ds300](https://github.com/ds300))
- Fix VS Code commits failing on bublic? [#1680](https://github.com/tldraw/tldraw/pull/1680) ([@TodePond](https://github.com/TodePond))

#### 📝 Documentation

- Update readme [#1686](https://github.com/tldraw/tldraw/pull/1686) ([@TodePond](https://github.com/TodePond))
- [docs] Update multiple test [#1685](https://github.com/tldraw/tldraw/pull/1685) ([@steveruizok](https://github.com/steveruizok))
- [docs] Fix the types in the Shapes example [#1681](https://github.com/tldraw/tldraw/pull/1681) ([@TodePond](https://github.com/TodePond))

#### Authors: 5

- alex ([@SomeHats](https://github.com/SomeHats))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))

---

# v2.0.0-alpha.13 (Wed Jun 28 2023)

### Release Notes

#### Fix crash when rotating a deleted shape ([#1658](https://github.com/tldraw/tldraw/pull/1658))

- Fixed a crash when trying to rotate a deleted shape.

#### [improvement] store snapshot types ([#1657](https://github.com/tldraw/tldraw/pull/1657))

- [dev] Rename `StoreSnapshot` to `SerializedStore`
- [dev] Create new `StoreSnapshot` as type related to `getSnapshot`/`loadSnapshot`

#### [fix] pen mode touches ([#1655](https://github.com/tldraw/tldraw/pull/1655))

- Removes three touches to cancel pen mode feature.

#### (2/2) [docs] Fix links to API. ([#1654](https://github.com/tldraw/tldraw/pull/1654))

- Documentation: Simplified links to the API reference.

#### (1/2) [docs] Restore some missing changes ([#1652](https://github.com/tldraw/tldraw/pull/1652))

- None (Docs internals)

#### [docs] Remove embeds page ([#1653](https://github.com/tldraw/tldraw/pull/1653))

- Documentation: Removed unused Embeds page.

#### Fix text shapes not having colour ([#1649](https://github.com/tldraw/tldraw/pull/1649))

- None: Fixes an unreleased bug.

#### Styles API docs ([#1641](https://github.com/tldraw/tldraw/pull/1641))

--

#### Styles API follow-ups ([#1636](https://github.com/tldraw/tldraw/pull/1636))

--

#### docs: remove not accepting contributions notice ([#1647](https://github.com/tldraw/tldraw/pull/1647))

- Remove not accepting contributions notice from README

#### Fix SVG cursors not being used ([#1639](https://github.com/tldraw/tldraw/pull/1639))

- None: Fixing an unreleased bug.

#### [docs] Add table of contents to Editor page ([#1642](https://github.com/tldraw/tldraw/pull/1642))

- Documentation: Added a table of contents to the Editor page.

#### speed up playwright and add visual regression tests ([#1638](https://github.com/tldraw/tldraw/pull/1638))

--

#### [docs] Allow sidebar to be scrolled on short screens ([#1632](https://github.com/tldraw/tldraw/pull/1632))

- Documentation: Fixed the sidebar being unscrollable on some short screens.

#### [docs] Add feedback when you search ([#1633](https://github.com/tldraw/tldraw/pull/1633))

- Documentation: Added some immediate feedback when you search.

#### [docs] Separate some pages out of the Docs section ([#1626](https://github.com/tldraw/tldraw/pull/1626))

- Documentation: Restructured the sidebar for clarity.

#### [docs] Fix wrong cursor when hovering buttons ([#1630](https://github.com/tldraw/tldraw/pull/1630))

- Documentation: Fixed the wrong cursor showing when hovering some buttons.

#### [docs] Tighten up wording & structure of Usage page ([#1624](https://github.com/tldraw/tldraw/pull/1624))

- Documentation: Impoved clarity of wording and structure of the Usage page.

#### [docs] Tighten up Editor page introduction ([#1622](https://github.com/tldraw/tldraw/pull/1622))

- Documentation: Simplified the Editor page.

#### [docs] Tighten up Introduction page ([#1621](https://github.com/tldraw/tldraw/pull/1621))

- Documentation: Simplified the Introduction page.

#### Lokalise: Translations update ([#1618](https://github.com/tldraw/tldraw/pull/1618))

- Added more translations for Simplified Chinese.

#### [docs] Simplify paths for uncategorised pages ([#1619](https://github.com/tldraw/tldraw/pull/1619))

- Documentation: Cleaned up some paths.

#### `ShapeUtil` refactor, `Editor` cleanup ([#1611](https://github.com/tldraw/tldraw/pull/1611))

- [editor] renames `defaultProps` to `getDefaultProps`
- [editor] removes `outline`, `outlineSegments`, `handles`, `bounds`
- [editor] renames `renderBackground` to `backgroundComponent`

#### Revert "Update dependencies (#1613)" ([#1617](https://github.com/tldraw/tldraw/pull/1617))

-

#### Remove on drop override ([#1612](https://github.com/tldraw/tldraw/pull/1612))

- [editor] Remove `onDropOverride`

#### Make resizeBox a regular function ([#1610](https://github.com/tldraw/tldraw/pull/1610))

- [editor] Change `resizeBox` to be a regular function.

#### Rename `ShapeUtil.render` -> `ShapeUtil.component` ([#1609](https://github.com/tldraw/tldraw/pull/1609))

- [editor] rename `ShapeUtil.render` to `ShapeUtil.component`

#### tldraw.css ([#1607](https://github.com/tldraw/tldraw/pull/1607))

- [tldraw] Removes `editor.css` and `ui.css` exports, replaces with `tldraw.css`

#### [fix] camera culling ([#1602](https://github.com/tldraw/tldraw/pull/1602))

- [editor] Adds `Editor.cameraState`
- Adds smart culling to make panning and zooming more smooth

#### Styles API ([#1580](https://github.com/tldraw/tldraw/pull/1580))

-

#### (1/2) Timeout collaborator cursors ([#1525](https://github.com/tldraw/tldraw/pull/1525))

- Brought back cursor timeouts. Collaborator cursors now disappear after 3 seconds of inactivity.

#### Remove `@tldraw/utils` from the docs site ([#1596](https://github.com/tldraw/tldraw/pull/1596))

- [docs] Removed an internal utilities package.

#### (1/2) Cursor Chat - Presence ([#1487](https://github.com/tldraw/tldraw/pull/1487))

- [dev] Added support for cursor chat presence.

#### [docs] Add barebones note about translations ([#1593](https://github.com/tldraw/tldraw/pull/1593))

- [docs] Added brief info on how to join as a translations contributor.

#### [refactor] snapping ([#1589](https://github.com/tldraw/tldraw/pull/1589))

- [editor] fix bug in snapping

#### remove `ShapeUtil.transform` ([#1590](https://github.com/tldraw/tldraw/pull/1590))

- [editor] Remove `ShapeUtil.transform`

#### Change app to editor in docs ([#1592](https://github.com/tldraw/tldraw/pull/1592))

- [docs] Updated 'App' to 'Editor'.

#### Make sure loading screens use dark mode user preference. ([#1552](https://github.com/tldraw/tldraw/pull/1552))

- Make sure our loading and error screens take dark mode setting into account.

#### remove `ShapeUtil.point` ([#1591](https://github.com/tldraw/tldraw/pull/1591))

- [editor] Remove `ShapeUtil.point`

#### [fix] Remove group shape export backgrounds ([#1587](https://github.com/tldraw/tldraw/pull/1587))

- Fix image exports for groups

#### Add tsdocs to Editor methods ([#1581](https://github.com/tldraw/tldraw/pull/1581))

- [dev] Added initial documentation for the Editor class.

#### add presence to yjs example ([#1582](https://github.com/tldraw/tldraw/pull/1582))

- [editor] Add presence to yjs example.

#### Add optional generic to `updateShapes` / `createShapes` ([#1579](https://github.com/tldraw/tldraw/pull/1579))

- [editor] adds an optional shape generic to `updateShapes` and `createShapes`

#### fix: properly remove awareness from store ([#1565](https://github.com/tldraw/tldraw/pull/1565))

- Add a brief release note for your PR here.

#### [improvement] Embed shape cleanup ([#1569](https://github.com/tldraw/tldraw/pull/1569))

- [editor] Remove unused props for `TLEditorShape`
- [editor] Adds `canUnmount` property to embed definitions

#### Move the loading of assets to the TldrawEditorWithReadyStore so that all code paths load the assets. ([#1561](https://github.com/tldraw/tldraw/pull/1561))

- Fix a problem where assets were not loading in some cases (snapshots).

#### Add anchor targets to our headings. ([#1571](https://github.com/tldraw/tldraw/pull/1571))

- Improve documentation to include anchor targets.

#### shapes folder, move tools into shape defs ([#1574](https://github.com/tldraw/tldraw/pull/1574))

n/a

#### mini `defineShape` API ([#1563](https://github.com/tldraw/tldraw/pull/1563))

[dev-facing, notes to come]

#### Lokalise: Translations update ([#1572](https://github.com/tldraw/tldraw/pull/1572))

- Added and updates translations for Italian, Russian, and Ukrainian.

#### Fix README typo ([#1451](https://github.com/tldraw/tldraw/pull/1451))

- None

#### yjs example ([#1560](https://github.com/tldraw/tldraw/pull/1560))

- [editor] Adds yjs example project

#### `ExternalContentManager` for handling external content (files, images, etc) ([#1550](https://github.com/tldraw/tldraw/pull/1550))

- [editor] add `ExternalContentManager` for plopping content onto the canvas
- [editor] remove `onCreateAssetFromFile` prop
- [editor] remove `onCreateBookmarkFromUrl` prop
- [editor] introduce `ExternalContentManager`
- [editor] add cleanup function to `onMount`

#### Misc sync fixes ([#1555](https://github.com/tldraw/tldraw/pull/1555))

- Fixes a handful of state management bugs that manifest in multiplayer rooms

#### [Docs] Change some editor properties to methods ([#1553](https://github.com/tldraw/tldraw/pull/1553))

- [docs] Fixed some methods that were incorrectly marked as properties.

#### [Docs] Change some internal methods to public ([#1554](https://github.com/tldraw/tldraw/pull/1554))

- [docs] Changed some Editor methods from internal to public.

#### Use unpkg as a default for serving assets. ([#1548](https://github.com/tldraw/tldraw/pull/1548))

- Use unpkg asset hosting as a default.

#### hoist opacity out of props ([#1526](https://github.com/tldraw/tldraw/pull/1526))

[internal only for now]

#### Fix arrows with weird bends crashing ([#1540](https://github.com/tldraw/tldraw/pull/1540))

- Fixed a rare crash that could happen when you try to curve an arrow with zero distance.

#### [feature] add vertical align to note shape ([#1539](https://github.com/tldraw/tldraw/pull/1539))

- Adds vertical align prop to note shapes

#### [fix] Shift key code / nudge ([#1537](https://github.com/tldraw/tldraw/pull/1537))

- Fix shift key nudging

#### scale exported canvases when they reach the browsers max size ([#1536](https://github.com/tldraw/tldraw/pull/1536))

- Fix a bug where sometimes exports would fail when they were too big for your browser. Now, they're scaled down to the max supported size.

#### [fix] control click on mac ([#1535](https://github.com/tldraw/tldraw/pull/1535))

- Fix control click to open menu on Mac

#### Fix being able to undo following ([#1531](https://github.com/tldraw/tldraw/pull/1531))

- Fixed a bug where you could undo viewport-following and viewport-unfollowing.

#### Select locked shapes on long press ([#1529](https://github.com/tldraw/tldraw/pull/1529))



#### highlighter fixes ([#1530](https://github.com/tldraw/tldraw/pull/1530))

[aq bug fixes]

#### Lokalise: Translations update ([#1515](https://github.com/tldraw/tldraw/pull/1515))

- Added and updated community translations for Galician, Italian, Romanian, Russian, Ukrainian, and Traditional Chinese.

#### Simplify static cursors ([#1520](https://github.com/tldraw/tldraw/pull/1520))

- (editor) Simplifies the cursors in our CSS.

#### Renaming types, shape utils, tools ([#1513](https://github.com/tldraw/tldraw/pull/1513))

- Renaming of types, shape utils, tools

#### tlschema cleanup ([#1509](https://github.com/tldraw/tldraw/pull/1509))

- [editor] Remove `app.createShapeId`
- [tlschema] Cleans up exports

#### Rename tlstore to store ([#1507](https://github.com/tldraw/tldraw/pull/1507))

- Replace @tldraw/tlstore with @tldraw/store

#### Rename tlvalidate to validate ([#1508](https://github.com/tldraw/tldraw/pull/1508))

- Rename tlvalidate to validate

#### Filter out unused assets. ([#1502](https://github.com/tldraw/tldraw/pull/1502))

- Optimize file size of exported files.

#### Cleanup @tldraw/ui types / exports ([#1504](https://github.com/tldraw/tldraw/pull/1504))

- [editor] clean up / unify types

#### rename app to editor ([#1503](https://github.com/tldraw/tldraw/pull/1503))

- Rename `App` to `Editor` and many other things that reference `app` to `editor`.

#### Revert 09c36781 & tweak linting ([#1501](https://github.com/tldraw/tldraw/pull/1501))

[internal-only]

#### Add support for locking shapes ([#1447](https://github.com/tldraw/tldraw/pull/1447))

- Add support for locking shapes.

#### [3/3] Highlighter styling ([#1490](https://github.com/tldraw/tldraw/pull/1490))

Highlighter pen is here! 🎉🎉🎉

#### [2/3] renderer changes to support "sandwich mode" highlighting ([#1418](https://github.com/tldraw/tldraw/pull/1418))

[not yet!]

#### [1/3] initial highlighter shape/tool ([#1401](https://github.com/tldraw/tldraw/pull/1401))

[internal only change layout ground work for highlighter]

#### [feature] reduce motion ([#1485](https://github.com/tldraw/tldraw/pull/1485))

- [editor] Add `reduceMotion` user preference
- Add reduce motion option to preferences

#### [feature] Easier store persistence API + persistence example ([#1480](https://github.com/tldraw/tldraw/pull/1480))

- [tlstore] adds `getSnapshot` and `loadSnapshot`

#### Add DSL to make writing shape-layout test cases much easier ([#1413](https://github.com/tldraw/tldraw/pull/1413))

[internal only change]

#### Feature flags rework ([#1474](https://github.com/tldraw/tldraw/pull/1474))

[internal only change]

#### [tiny] add isPageId ([#1482](https://github.com/tldraw/tldraw/pull/1482))

- [tlschema] Add `isPageId`

#### [minor] Mark tlsync-client internal APIs ([#1481](https://github.com/tldraw/tldraw/pull/1481))

- Removes internal APIs from `@tldraw/tlsync-client`

#### [refactor] update record names ([#1473](https://github.com/tldraw/tldraw/pull/1473))

- [editor] rename record types

#### remove safari special-casing for paste ([#1470](https://github.com/tldraw/tldraw/pull/1470))

[fixes a regression introduced during this release]

#### Don't allow `g` keyboard shortcut in readonly mode, show laser tool in the toolbar ([#1459](https://github.com/tldraw/tldraw/pull/1459))

- Disable geo tool shortcut in readonly mode. Show laser on the toolbar.

#### [mini-feature] Following indicator ([#1468](https://github.com/tldraw/tldraw/pull/1468))

- Adds viewport following indicator

#### [chore] refactor user preferences ([#1435](https://github.com/tldraw/tldraw/pull/1435))

- Add a brief release note for your PR here.

#### Add translations for "Leave shared project" action ([#1394](https://github.com/tldraw/tldraw/pull/1394))

- None

#### update use-gesture ([#1453](https://github.com/tldraw/tldraw/pull/1453))

- Updates use-gesture to fix pinch gesture bug on iPad.

#### Add migration for horizontal alignment ([#1443](https://github.com/tldraw/tldraw/pull/1443))

- Add support for legacy alignment options.

#### Stricter ID types ([#1439](https://github.com/tldraw/tldraw/pull/1439))

[internal only, covered by #1432 changelog]

#### [refactor] restore createTLSchema ([#1444](https://github.com/tldraw/tldraw/pull/1444))

- [editor] Simplifies custom shape definition
- [tldraw] Updates props for <TldrawEditor> component to require a `TldrawEditorConfig`.

#### Fix cursor shadow getting clipped ([#1441](https://github.com/tldraw/tldraw/pull/1441))

- Fixed a bug where custom cursors could have their shadow clipped.

#### Add SVG cursors for all cursor types ([#1416](https://github.com/tldraw/tldraw/pull/1416))

- Added consistent custom cursors.

#### [refactor] remove `createTLSchema` ([#1440](https://github.com/tldraw/tldraw/pull/1440))

- [tlschema] Removes `createTLSchema` in favor of `TldrawEditorConfig`

#### [refactor] Remove `TLShapeDef`, `getShapeUtilByType`. ([#1432](https://github.com/tldraw/tldraw/pull/1432))

- [tlschema] Update props of `createTLSchema`
- [editor] Update props of `TldrawEditorConfig`
- [editor] Remove `App.getShapeUtilByType`
- [editor] Update `App.getShapeUtil` to take a type rather than a shape

#### [refactor] record migrations ([#1430](https://github.com/tldraw/tldraw/pull/1430))

- [tlschema] Improve `defineMigrations`
- [editor] Simplify migration definitions

#### Measure individual words instead of just line breaks for text exports ([#1397](https://github.com/tldraw/tldraw/pull/1397))

- Add a brief release note for your PR here.

#### Update docs links + guides + build ([#1422](https://github.com/tldraw/tldraw/pull/1422))

* [docs] Updated guides to get assets from the new `tldraw/tldraw` repo instead of the old `tldraw/tldraw-examples`.
* [docs] Updated an old CodeSandbox link to the new StackBlitz.

#### Create @tldraw/indices package ([#1426](https://github.com/tldraw/tldraw/pull/1426))

- [@tldraw/editor] Remove fractional indices code into `@tldraw/indices`
- [@tldraw/indices] Create library for fractional indices code

#### [feature] Add checkbox to toolbar ([#1423](https://github.com/tldraw/tldraw/pull/1423))

- Adds missing checkbox to toolbar.

#### [improvement] set horizontal position using text alignment ([#1419](https://github.com/tldraw/tldraw/pull/1419))

- Geo shapes and sticky notes now position their labels based on their alignment.

#### [fix] reorder handles in front of selection ([#1420](https://github.com/tldraw/tldraw/pull/1420))

- Fix a bug where handles would appear behind selection indicators.

#### [feature] add laser pointer ([#1412](https://github.com/tldraw/tldraw/pull/1412))

- Adds the laser pointer tool.

#### [firefox] Fix the pointer getting stuck down when you press the control key ([#1390](https://github.com/tldraw/tldraw/pull/1390))

- [Firefox] Fixed a bug where the pointer could get stuck down when the control key is held down.

#### Vertical text alignment for geo shapes ([#1414](https://github.com/tldraw/tldraw/pull/1414))

- This adds vertical text alignment property to geo shapes.

#### [fix] page menu, drag handle css ([#1406](https://github.com/tldraw/tldraw/pull/1406))

- Fix styling in the page menu

#### Switch to new collaborators component ([#1405](https://github.com/tldraw/tldraw/pull/1405))

- [Breaking] Removes the old version of LiveCollaborators, replacing it with the new one based on `TLInstancePresence`

#### [improvement] refactor paste to support multi-line text ([#1398](https://github.com/tldraw/tldraw/pull/1398))

- Improves clipboard logic when pasting text
- Adds support for pasting multi-line text
- Adds maximum widths when pasting single-line text
- Adds support for RTL languages when pasting multi-line or wrapped text
- Strips leading indentation when pasting text

#### remove url state, to private ([#1402](https://github.com/tldraw/tldraw/pull/1402))

- [editor] remove `useUrlState`

#### Don't allow the users to use keyboard shortcuts to select tools in readonly mode. ([#1382](https://github.com/tldraw/tldraw/pull/1382))

- Disable keyboard shortcut events for tools in readonly mode. We only allow the select, hand tools, and zoom tool.

#### [fix] Don't synchronize isReadOnly ([#1396](https://github.com/tldraw/tldraw/pull/1396))

- Removes the isReadOnly value from the `user_document_settings` record type.

#### fix pasted tabs not getting converted to space ([#1388](https://github.com/tldraw/tldraw/pull/1388))

- Fixed a bug where pasted tabs wouldn't get converted into spaces.

#### Delete an empty text shape when clicking on another text shape. ([#1384](https://github.com/tldraw/tldraw/pull/1384))

- Fix a problem with empty text shapes not getting deleted if you clicked on another text shape.

#### Fix setting the grid mode. ([#1386](https://github.com/tldraw/tldraw/pull/1386))

- Fix grid mode toggle.

#### Update codesandbox + example link ([#1368](https://github.com/tldraw/tldraw/pull/1368))

- [docs] Fixed some links to examples.

#### Fix selection foreground being misaligned ([#1380](https://github.com/tldraw/tldraw/pull/1380))

- None (fix for a bug that hasn't released)

#### Expand selection outline for single-selected draw shape ([#1379](https://github.com/tldraw/tldraw/pull/1379))

- Improve selection outlines around horizontal or vertical draw shapes

#### Add localizations for snapshots links ([#1347](https://github.com/tldraw/tldraw/pull/1347))

- Add localization for creating snapshot links.

#### [fix] pointer location not updating when moving over editing shape ([#1378](https://github.com/tldraw/tldraw/pull/1378))

- Fix a bug where the pointer location would not update when moving the pointer over an editing shape.

#### [perf] deleteShapes ([#1373](https://github.com/tldraw/tldraw/pull/1373))

- Perf improvement for deleting shapes in a document with lots of pages.

#### Neaten up pr template ([#1369](https://github.com/tldraw/tldraw/pull/1369))

- None: internal

#### fix a couple of consistency assumptions ([#1365](https://github.com/tldraw/tldraw/pull/1365))

- Fixes a couple of minor consistency bugs affecting shape updating and page deletion in multiplayer contexts.

#### Disable nightly/on-demand webdriver scripts ([#1366](https://github.com/tldraw/tldraw/pull/1366))

None

#### avoid lazy race conditions ([#1364](https://github.com/tldraw/tldraw/pull/1364))

[internal only]

#### Adds CI for webdriver tests ([#1343](https://github.com/tldraw/tldraw/pull/1343))

- Github action CI workflows added for webdriver tests
- Refactored e2e test runner

#### enable eslint for test files ([#1363](https://github.com/tldraw/tldraw/pull/1363))

internal-only change

#### [perf] make ensureStoreIsUsable scale better ([#1362](https://github.com/tldraw/tldraw/pull/1362))

- Add a brief release note for your PR here.

#### Export Events stuff ([#1360](https://github.com/tldraw/tldraw/pull/1360))

- [ui] export the `TLUiEventSource` type
- [ui] export the `EventsProviderProps ` type
- [ui] export the `useEvents ` hook

#### presence-related fixes ([#1361](https://github.com/tldraw/tldraw/pull/1361))

- Fix a bug where creating a page could throw an error in some multiplayer contexts.

#### [improvement] rename onEvent to onUiEvent ([#1358](https://github.com/tldraw/tldraw/pull/1358))

- [docs] Adds docs for ui events
- [tldraw] Renames `onEvent` to `onUiEvent`

#### [docs] Update links in docs ([#1357](https://github.com/tldraw/tldraw/pull/1357))

- [docs] Update links in docs to point to the tldraw repository rather than tldraw-examples.

#### [improvement] Ui events followup ([#1354](https://github.com/tldraw/tldraw/pull/1354))

- [ui] Adds source to ui events data object
- [ui] Corrects source for toolbar events
- [ui] Corrects source for clipboard events
- [examples] Updates events example

#### [fix] various text ([#1350](https://github.com/tldraw/tldraw/pull/1350))

- Allow leading whitespace

#### [chore] Bump nanoid ([#1349](https://github.com/tldraw/tldraw/pull/1349))

- Remove unused userId and instanceId props from AppOptions

#### Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled ([#1342](https://github.com/tldraw/tldraw/pull/1342))

- Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled

#### Rework the assets package for strategy-specific imports ([#1341](https://github.com/tldraw/tldraw/pull/1341))

- [dev] If you're using the `@tldraw/assets` package, you need to update your code to `import { getAssetUrlsByImport } from '@tldraw/assets/imports'` instead of `import { getBundlerAssetUrls } from '@tldraw/assets`

---

#### 💥 Breaking Change

- [minor] Mark tlsync-client internal APIs [#1481](https://github.com/tldraw/tldraw/pull/1481) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/store`
  - [tweak] migrate store snapshot arguments [#1659](https://github.com/tldraw/tldraw/pull/1659) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/store`, `@tldraw/tlschema`
  - [improvement] store snapshot types [#1657](https://github.com/tldraw/tldraw/pull/1657) ([@steveruizok](https://github.com/steveruizok))
  - Rename tlstore to store [#1507](https://github.com/tldraw/tldraw/pull/1507) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/ui`
  - [fix] react component runaways, error boundaries [#1625](https://github.com/tldraw/tldraw/pull/1625) ([@steveruizok](https://github.com/steveruizok))
  - Tidy up [#1600](https://github.com/tldraw/tldraw/pull/1600) ([@steveruizok](https://github.com/steveruizok))
  - Use unpkg as a default for serving assets. [#1548](https://github.com/tldraw/tldraw/pull/1548) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Switch to new collaborators component [#1405](https://github.com/tldraw/tldraw/pull/1405) ([@ds300](https://github.com/ds300))
  - [improvement] Ui events followup [#1354](https://github.com/tldraw/tldraw/pull/1354) ([@steveruizok](https://github.com/steveruizok))
  - [feature] ui events [#1326](https://github.com/tldraw/tldraw/pull/1326) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tldraw`, `@tldraw/tlschema`
  - `ShapeUtil` refactor, `Editor` cleanup [#1611](https://github.com/tldraw/tldraw/pull/1611) ([@steveruizok](https://github.com/steveruizok))
  - [refactor] restore createTLSchema [#1444](https://github.com/tldraw/tldraw/pull/1444) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Remove on drop override [#1612](https://github.com/tldraw/tldraw/pull/1612) ([@steveruizok](https://github.com/steveruizok))
  - Rename `ShapeUtil.render` -> `ShapeUtil.component` [#1609](https://github.com/tldraw/tldraw/pull/1609) ([@steveruizok](https://github.com/steveruizok))
  - [fix] camera culling [#1602](https://github.com/tldraw/tldraw/pull/1602) ([@steveruizok](https://github.com/steveruizok))
  - remove `ShapeUtil.transform` [#1590](https://github.com/tldraw/tldraw/pull/1590) ([@steveruizok](https://github.com/steveruizok))
  - remove `ShapeUtil.point` [#1591](https://github.com/tldraw/tldraw/pull/1591) ([@steveruizok](https://github.com/steveruizok))
  - remove url state, to private [#1402](https://github.com/tldraw/tldraw/pull/1402) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/ui`
  - tldraw.css [#1607](https://github.com/tldraw/tldraw/pull/1607) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`, `@tldraw/validate`
  - Styles API [#1580](https://github.com/tldraw/tldraw/pull/1580) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate`
  - mini `defineShape` API [#1563](https://github.com/tldraw/tldraw/pull/1563) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tldraw`, `@tldraw/ui`
  - `ExternalContentManager` for handling external content (files, images, etc) [#1550](https://github.com/tldraw/tldraw/pull/1550) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/ui`
  - hoist opacity out of props [#1526](https://github.com/tldraw/tldraw/pull/1526) ([@SomeHats](https://github.com/SomeHats))
  - Add support for project names [#1340](https://github.com/tldraw/tldraw/pull/1340) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [refactor] Remove `TLShapeDef`, `getShapeUtilByType`. [#1432](https://github.com/tldraw/tldraw/pull/1432) ([@steveruizok](https://github.com/steveruizok) [@SomeHats](https://github.com/SomeHats))
  - [fix] Don't synchronize isReadOnly [#1396](https://github.com/tldraw/tldraw/pull/1396) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/store`, `@tldraw/tlschema`, `@tldraw/ui`
  - Independent instance state persistence [#1493](https://github.com/tldraw/tldraw/pull/1493) ([@ds300](https://github.com/ds300))
  - tlschema cleanup [#1509](https://github.com/tldraw/tldraw/pull/1509) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/ui`
  - Renaming types, shape utils, tools [#1513](https://github.com/tldraw/tldraw/pull/1513) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/validate`
  - Rename tlvalidate to validate [#1508](https://github.com/tldraw/tldraw/pull/1508) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`
  - Cleanup @tldraw/ui types / exports [#1504](https://github.com/tldraw/tldraw/pull/1504) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/indices`, `@tldraw/tldraw`, `@tldraw/ui`
  - rename app to editor [#1503](https://github.com/tldraw/tldraw/pull/1503) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`
  - [refactor] User-facing APIs [#1478](https://github.com/tldraw/tldraw/pull/1478) ([@steveruizok](https://github.com/steveruizok))
  - [chore] refactor user preferences [#1435](https://github.com/tldraw/tldraw/pull/1435) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`
  - [refactor] update record names [#1473](https://github.com/tldraw/tldraw/pull/1473) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - [refactor] remove `createTLSchema` [#1440](https://github.com/tldraw/tldraw/pull/1440) ([@steveruizok](https://github.com/steveruizok))
  - [refactor] record migrations [#1430](https://github.com/tldraw/tldraw/pull/1430) ([@steveruizok](https://github.com/steveruizok))
  - [chore] Bump nanoid [#1349](https://github.com/tldraw/tldraw/pull/1349) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/indices`, `@tldraw/utils`
  - Create @tldraw/indices package [#1426](https://github.com/tldraw/tldraw/pull/1426) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/ui`
  - [improvement] rename onEvent to onUiEvent [#1358](https://github.com/tldraw/tldraw/pull/1358) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/tlschema`
  - Rework the assets package for strategy-specific imports [#1341](https://github.com/tldraw/tldraw/pull/1341) ([@SomeHats](https://github.com/SomeHats))

#### 🚀 Enhancement

- [feature] Easier store persistence API + persistence example [#1480](https://github.com/tldraw/tldraw/pull/1480) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/ui`
  - Styles API follow-ups [#1636](https://github.com/tldraw/tldraw/pull/1636) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
  - (1/2) Cursor Chat - Presence [#1487](https://github.com/tldraw/tldraw/pull/1487) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - Make resizeBox a regular function [#1610](https://github.com/tldraw/tldraw/pull/1610) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] set horizontal position using text alignment [#1419](https://github.com/tldraw/tldraw/pull/1419) ([@steveruizok](https://github.com/steveruizok))
  - [fix] pointer location not updating when moving over editing shape [#1378](https://github.com/tldraw/tldraw/pull/1378) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - [fix] yjs presence [#1603](https://github.com/tldraw/tldraw/pull/1603) ([@steveruizok](https://github.com/steveruizok))
  - (1/2) Timeout collaborator cursors [#1525](https://github.com/tldraw/tldraw/pull/1525) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [feature] add vertical align to note shape [#1539](https://github.com/tldraw/tldraw/pull/1539) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`
  - Add optional generic to `updateShapes` / `createShapes` [#1579](https://github.com/tldraw/tldraw/pull/1579) ([@steveruizok](https://github.com/steveruizok))
  - move v1 migration code into file-format [#1499](https://github.com/tldraw/tldraw/pull/1499) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/ui`
  - Add support for locking shapes [#1447](https://github.com/tldraw/tldraw/pull/1447) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [feature] reduce motion [#1485](https://github.com/tldraw/tldraw/pull/1485) ([@steveruizok](https://github.com/steveruizok))
  - [mini-feature] Following indicator [#1468](https://github.com/tldraw/tldraw/pull/1468) ([@steveruizok](https://github.com/steveruizok))
  - Add SVG cursors for all cursor types [#1416](https://github.com/tldraw/tldraw/pull/1416) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [improvement] refactor paste to support multi-line text [#1398](https://github.com/tldraw/tldraw/pull/1398) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/ui`
  - [3/3] Highlighter styling [#1490](https://github.com/tldraw/tldraw/pull/1490) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/primitives`
  - [2/3] renderer changes to support "sandwich mode" highlighting [#1418](https://github.com/tldraw/tldraw/pull/1418) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/ui`
  - [1/3] initial highlighter shape/tool [#1401](https://github.com/tldraw/tldraw/pull/1401) ([@SomeHats](https://github.com/SomeHats))
  - [feature] add laser pointer [#1412](https://github.com/tldraw/tldraw/pull/1412) ([@steveruizok](https://github.com/steveruizok))
  - Vertical text alignment for geo shapes [#1414](https://github.com/tldraw/tldraw/pull/1414) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/ui`
  - [feature] Add checkbox to toolbar [#1423](https://github.com/tldraw/tldraw/pull/1423) ([@steveruizok](https://github.com/steveruizok))
  - Add stuff for new 'share project' flow [#1403](https://github.com/tldraw/tldraw/pull/1403) ([@ds300](https://github.com/ds300))
  - Snapshot link menu translations [#1399](https://github.com/tldraw/tldraw/pull/1399) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/ui`
  - open menus refactor [#1400](https://github.com/tldraw/tldraw/pull/1400) ([@steveruizok](https://github.com/steveruizok))

#### 🐛 Bug Fix

- Lokalise: Translations update [#1618](https://github.com/tldraw/tldraw/pull/1618) ([@TodePond](https://github.com/TodePond))
- Fa translation [#1500](https://github.com/tldraw/tldraw/pull/1500) ([@mokazemi](https://github.com/mokazemi) [@steveruizok](https://github.com/steveruizok))
- Lokalise: Translations update [#1572](https://github.com/tldraw/tldraw/pull/1572) ([@TodePond](https://github.com/TodePond))
- Update changelog. Bump version. [#1546](https://github.com/tldraw/tldraw/pull/1546) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Lokalise: Translations update [#1515](https://github.com/tldraw/tldraw/pull/1515) ([@TodePond](https://github.com/TodePond))
- VS Code version bump, changelog. [#1497](https://github.com/tldraw/tldraw/pull/1497) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix issue template label not getting applied [#1428](https://github.com/tldraw/tldraw/pull/1428) ([@TodePond](https://github.com/TodePond))
- Bump version. [#1421](https://github.com/tldraw/tldraw/pull/1421) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Update community translations + remove unused translations [#1356](https://github.com/tldraw/tldraw/pull/1356) ([@TodePond](https://github.com/TodePond))
- [docs] Update links in docs [#1357](https://github.com/tldraw/tldraw/pull/1357) ([@steveruizok](https://github.com/steveruizok))
- [chore] Add label options to PR template [#1339](https://github.com/tldraw/tldraw/pull/1339) ([@ds300](https://github.com/ds300))
- Fix publishing [#1338](https://github.com/tldraw/tldraw/pull/1338) ([@SomeHats](https://github.com/SomeHats))
- Update README.md [#1331](https://github.com/tldraw/tldraw/pull/1331) ([@steveruizok](https://github.com/steveruizok))
- [docs] editor API [#1328](https://github.com/tldraw/tldraw/pull/1328) ([@steveruizok](https://github.com/steveruizok))
- [docs] Add missing params docs [#1223](https://github.com/tldraw/tldraw/pull/1223) ([@TodePond](https://github.com/TodePond))
- Add link to original tldraw within issue template [#1225](https://github.com/tldraw/tldraw/pull/1225) ([@TodePond](https://github.com/TodePond))
- Fix issue templates not appearing [#1228](https://github.com/tldraw/tldraw/pull/1228) ([@TodePond](https://github.com/TodePond))
- [improvement] readme / contributing [#1199](https://github.com/tldraw/tldraw/pull/1199) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [improvement] add bug report / feature request [#1218](https://github.com/tldraw/tldraw/pull/1218) ([@steveruizok](https://github.com/steveruizok))
- add `env` and prefix output options to exec [#1217](https://github.com/tldraw/tldraw/pull/1217) ([@SomeHats](https://github.com/SomeHats))
- [wip] Going bublic [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- [chore] use explicit yarn in clean script [#1216](https://github.com/tldraw/tldraw/pull/1216) ([@ds300](https://github.com/ds300))
- fix husky install [#1212](https://github.com/tldraw/tldraw/pull/1212) ([@SomeHats](https://github.com/SomeHats))
- Alex/test [#1202](https://github.com/tldraw/tldraw/pull/1202) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`
  - Fix crash when rotating a deleted shape [#1658](https://github.com/tldraw/tldraw/pull/1658) ([@TodePond](https://github.com/TodePond))
  - [fix] pen mode touches [#1655](https://github.com/tldraw/tldraw/pull/1655) ([@steveruizok](https://github.com/steveruizok))
  - Fix text shapes not having colour [#1649](https://github.com/tldraw/tldraw/pull/1649) ([@TodePond](https://github.com/TodePond))
  - Fix SVG cursors not being used [#1639](https://github.com/tldraw/tldraw/pull/1639) ([@TodePond](https://github.com/TodePond))
  - [fix] tldraw file drop [#1616](https://github.com/tldraw/tldraw/pull/1616) ([@steveruizok](https://github.com/steveruizok))
  - Make sure loading screens use dark mode user preference. [#1552](https://github.com/tldraw/tldraw/pull/1552) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [fix] Remove group shape export backgrounds [#1587](https://github.com/tldraw/tldraw/pull/1587) ([@steveruizok](https://github.com/steveruizok))
  - Move the loading of assets to the TldrawEditorWithReadyStore so that all code paths load the assets. [#1561](https://github.com/tldraw/tldraw/pull/1561) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - shapes folder, move tools into shape defs [#1574](https://github.com/tldraw/tldraw/pull/1574) ([@SomeHats](https://github.com/SomeHats))
  - offset drop point by editor client rect [#1564](https://github.com/tldraw/tldraw/pull/1564) ([@BrianHung](https://github.com/BrianHung))
  - More misc sync fixes [#1559](https://github.com/tldraw/tldraw/pull/1559) ([@ds300](https://github.com/ds300))
  - Misc sync fixes [#1555](https://github.com/tldraw/tldraw/pull/1555) ([@ds300](https://github.com/ds300))
  - [fix] Shift key code / nudge [#1537](https://github.com/tldraw/tldraw/pull/1537) ([@steveruizok](https://github.com/steveruizok))
  - scale exported canvases when they reach the browsers max size [#1536](https://github.com/tldraw/tldraw/pull/1536) ([@SomeHats](https://github.com/SomeHats))
  - [fix] control click on mac [#1535](https://github.com/tldraw/tldraw/pull/1535) ([@steveruizok](https://github.com/steveruizok))
  - Fix being able to undo following [#1531](https://github.com/tldraw/tldraw/pull/1531) ([@TodePond](https://github.com/TodePond))
  - send user prefs data in broadcast msg [#1466](https://github.com/tldraw/tldraw/pull/1466) ([@ds300](https://github.com/ds300))
  - Fix positioning of default cursor [#1458](https://github.com/tldraw/tldraw/pull/1458) ([@TodePond](https://github.com/TodePond))
  - change pointer cursor to white [#1454](https://github.com/tldraw/tldraw/pull/1454) ([@TodePond](https://github.com/TodePond))
  - Fix cursor shadow getting clipped [#1441](https://github.com/tldraw/tldraw/pull/1441) ([@TodePond](https://github.com/TodePond))
  - Fix new wobble [#1431](https://github.com/tldraw/tldraw/pull/1431) ([@TodePond](https://github.com/TodePond))
  - [fix] laser pointer [#1429](https://github.com/tldraw/tldraw/pull/1429) ([@steveruizok](https://github.com/steveruizok))
  - [fix] reorder handles in front of selection [#1420](https://github.com/tldraw/tldraw/pull/1420) ([@steveruizok](https://github.com/steveruizok))
  - [firefox] Fix the pointer getting stuck down when you press the control key [#1390](https://github.com/tldraw/tldraw/pull/1390) ([@TodePond](https://github.com/TodePond))
  - fix viewport following [#1411](https://github.com/tldraw/tldraw/pull/1411) ([@ds300](https://github.com/ds300))
  - fix pasted tabs not getting converted to space [#1388](https://github.com/tldraw/tldraw/pull/1388) ([@TodePond](https://github.com/TodePond))
  - Delete an empty text shape when clicking on another text shape. [#1384](https://github.com/tldraw/tldraw/pull/1384) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix setting the grid mode. [#1386](https://github.com/tldraw/tldraw/pull/1386) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Fix selection foreground being misaligned [#1380](https://github.com/tldraw/tldraw/pull/1380) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - Expand selection outline for single-selected draw shape [#1379](https://github.com/tldraw/tldraw/pull/1379) ([@SomeHats](https://github.com/SomeHats))
  - [fix] Allow interactions with embeds in readonly mode [#1333](https://github.com/tldraw/tldraw/pull/1333) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [perf] deleteShapes [#1373](https://github.com/tldraw/tldraw/pull/1373) ([@ds300](https://github.com/ds300))
  - fix a couple of consistency assumptions [#1365](https://github.com/tldraw/tldraw/pull/1365) ([@ds300](https://github.com/ds300))
  - [fix] various text [#1350](https://github.com/tldraw/tldraw/pull/1350) ([@steveruizok](https://github.com/steveruizok))
  - [fix] tabs in text exports [#1323](https://github.com/tldraw/tldraw/pull/1323) ([@steveruizok](https://github.com/steveruizok))
  - [fix] update useTransform.ts [#1327](https://github.com/tldraw/tldraw/pull/1327) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] dragging start distance on coarse pointer [#1220](https://github.com/tldraw/tldraw/pull/1220) ([@steveruizok](https://github.com/steveruizok))
  - [fix] SVG export for arrows with labels but no arrowheads [#1229](https://github.com/tldraw/tldraw/pull/1229) ([@steveruizok](https://github.com/steveruizok))
  - add docs for TLShapeUtil [#1215](https://github.com/tldraw/tldraw/pull/1215) ([@TodePond](https://github.com/TodePond))
  - [fix] publish [#1222](https://github.com/tldraw/tldraw/pull/1222) ([@ds300](https://github.com/ds300))
  - [fix] typo in isFocusingInput [#1221](https://github.com/tldraw/tldraw/pull/1221) ([@ds300](https://github.com/ds300))
  - [feat] new LiveCollaborators behind feature flag [#1219](https://github.com/tldraw/tldraw/pull/1219) ([@ds300](https://github.com/ds300))
  - [fix] collaborator render order [#1213](https://github.com/tldraw/tldraw/pull/1213) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/ui`
  - 3/2 Cursor chat [#1623](https://github.com/tldraw/tldraw/pull/1623) ([@steveruizok](https://github.com/steveruizok))
  - [fix] embeds [#1578](https://github.com/tldraw/tldraw/pull/1578) ([@steveruizok](https://github.com/steveruizok))
  - highlighter fixes [#1530](https://github.com/tldraw/tldraw/pull/1530) ([@SomeHats](https://github.com/SomeHats))
  - Feature flags rework [#1474](https://github.com/tldraw/tldraw/pull/1474) ([@SomeHats](https://github.com/SomeHats))
  - remove svg layer, html all the things, rs to tl [#1227](https://github.com/tldraw/tldraw/pull/1227) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - Added `pHYs` to import/export of png images [#1200](https://github.com/tldraw/tldraw/pull/1200) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/tldraw`
  - [fix] tldraw api report [#1615](https://github.com/tldraw/tldraw/pull/1615) ([@steveruizok](https://github.com/steveruizok))
  - Fix to not ignore the `userId` option for `<Tldraw/>` component in `@tldraw/tldraw` [#1205](https://github.com/tldraw/tldraw/pull/1205) ([@orangemug](https://github.com/orangemug))
- `@tldraw/editor`, `@tldraw/primitives`
  - [refactor] snapping [#1589](https://github.com/tldraw/tldraw/pull/1589) ([@steveruizok](https://github.com/steveruizok))
  - Fix arrows with weird bends crashing [#1540](https://github.com/tldraw/tldraw/pull/1540) ([@TodePond](https://github.com/TodePond))
  - ensure that fixed points stay fixed [#1523](https://github.com/tldraw/tldraw/pull/1523) ([@steveruizok](https://github.com/steveruizok))
  - Use `strokePathData` for `<ShapeFill/>` path to avoid bugs in the inner path algo [#1207](https://github.com/tldraw/tldraw/pull/1207) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - update exports for user presence [#1583](https://github.com/tldraw/tldraw/pull/1583) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] Embed shape cleanup [#1569](https://github.com/tldraw/tldraw/pull/1569) ([@steveruizok](https://github.com/steveruizok))
  - Add migration for horizontal alignment [#1443](https://github.com/tldraw/tldraw/pull/1443) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - [chore] move schema construction to tlschema package [#1334](https://github.com/tldraw/tldraw/pull/1334) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/ui`, `@tldraw/utils`
  - Asset improvements [#1557](https://github.com/tldraw/tldraw/pull/1557) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/ui`
  - Use `"Toggle locked"` [#1538](https://github.com/tldraw/tldraw/pull/1538) ([@steveruizok](https://github.com/steveruizok))
  - Select locked shapes on long press [#1529](https://github.com/tldraw/tldraw/pull/1529) ([@steveruizok](https://github.com/steveruizok))
  - remove safari special-casing for paste [#1470](https://github.com/tldraw/tldraw/pull/1470) ([@SomeHats](https://github.com/SomeHats))
  - Don't allow `g` keyboard shortcut in readonly mode, show laser tool in the toolbar [#1459](https://github.com/tldraw/tldraw/pull/1459) ([@MitjaBezensek](https://github.com/MitjaBezensek) [@steveruizok](https://github.com/steveruizok))
  - Fix people menu button border on android [#1471](https://github.com/tldraw/tldraw/pull/1471) ([@TodePond](https://github.com/TodePond))
  - [fix] lock option for laser tool [#1460](https://github.com/tldraw/tldraw/pull/1460) ([@steveruizok](https://github.com/steveruizok))
  - Add laser keyboard shortcut. [#1467](https://github.com/tldraw/tldraw/pull/1467) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - [fix] make follow icon visible on iPad [#1462](https://github.com/tldraw/tldraw/pull/1462) ([@steveruizok](https://github.com/steveruizok))
  - [fix] page item submenu [#1461](https://github.com/tldraw/tldraw/pull/1461) ([@steveruizok](https://github.com/steveruizok))
  - Add translations for "Leave shared project" action [#1394](https://github.com/tldraw/tldraw/pull/1394) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [fix] page menu, drag handle css [#1406](https://github.com/tldraw/tldraw/pull/1406) ([@steveruizok](https://github.com/steveruizok))
  - Don't allow the users to use keyboard shortcuts to select tools in readonly mode. [#1382](https://github.com/tldraw/tldraw/pull/1382) ([@MitjaBezensek](https://github.com/MitjaBezensek))
  - Disabling middle click paste in favour of panning [#1335](https://github.com/tldraw/tldraw/pull/1335) ([@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok))
  - Export Events stuff [#1360](https://github.com/tldraw/tldraw/pull/1360) ([@steveruizok](https://github.com/steveruizok))
  - Fix "copy as png" in firefox when `dom.events.asyncClipboard.clipboardItem` is enabled [#1342](https://github.com/tldraw/tldraw/pull/1342) ([@orangemug](https://github.com/orangemug))
  - [tiny] rename show menu paste [#1332](https://github.com/tldraw/tldraw/pull/1332) ([@steveruizok](https://github.com/steveruizok))
  - update @radix-ui/react-popover to 1.0.6-rc.5 [#1206](https://github.com/tldraw/tldraw/pull/1206) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/file-format`
  - Filter out unused assets. [#1502](https://github.com/tldraw/tldraw/pull/1502) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - Stricter ID types [#1439](https://github.com/tldraw/tldraw/pull/1439) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/primitives`, `@tldraw/ui`
  - Measure individual words instead of just line breaks for text exports [#1397](https://github.com/tldraw/tldraw/pull/1397) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tlschema`
  - [perf] make ensureStoreIsUsable scale better [#1362](https://github.com/tldraw/tldraw/pull/1362) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/utils`
  - presence-related fixes [#1361](https://github.com/tldraw/tldraw/pull/1361) ([@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tlschema`, `@tldraw/ui`
  - [feature] `check-box` geo shape [#1330](https://github.com/tldraw/tldraw/pull/1330) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/ui`
  - New vite-based examples app [#1226](https://github.com/tldraw/tldraw/pull/1226) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/file-format`, `@tldraw/polyfills`, `@tldraw/primitives`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - [wip] Going bublic [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/polyfills`, `@tldraw/primitives`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - [chore] update lazyrepo [#1211](https://github.com/tldraw/tldraw/pull/1211) ([@ds300](https://github.com/ds300))
  - [lite] upgrade lazyrepo [#1198](https://github.com/tldraw/tldraw/pull/1198) ([@ds300](https://github.com/ds300))
  - [wip] Going bublic [#1195](https://github.com/tldraw/tldraw/pull/1195) ([@SomeHats](https://github.com/SomeHats) [@ds300](https://github.com/ds300) [@orangemug](https://github.com/orangemug) [@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- `@tldraw/tlschema`, `@tldraw/ui`
  - [fix] pick a better default language [#1201](https://github.com/tldraw/tldraw/pull/1201) ([@steveruizok](https://github.com/steveruizok) [@TodePond](https://github.com/TodePond))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - derived presence state [#1204](https://github.com/tldraw/tldraw/pull/1204) ([@ds300](https://github.com/ds300))

#### ⚠️ Pushed to `main`

- Update publish-new.yml ([@steveruizok](https://github.com/steveruizok))
- Update lerna.json ([@steveruizok](https://github.com/steveruizok))
- Update publish-new.ts ([@steveruizok](https://github.com/steveruizok))
- change App to Editor in docs ([@TodePond](https://github.com/TodePond))
- rename api.mdx to editor.mdx ([@TodePond](https://github.com/TodePond))
- remove e2e files ([@steveruizok](https://github.com/steveruizok))
- main: notify huppy after release ([@SomeHats](https://github.com/SomeHats))
- main: exclude @tldraw/assets from vite dep optimization to fix examples links ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/indices`, `@tldraw/polyfills`, `@tldraw/primitives`, `@tldraw/store`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`, `@tldraw/validate`
  - update lazyrepo ([@ds300](https://github.com/ds300))

#### 🏠 Internal

- [chore] bump vscode extension to 2.0.9 [#1662](https://github.com/tldraw/tldraw/pull/1662) ([@steveruizok](https://github.com/steveruizok))
- untrack generated files [#1646](https://github.com/tldraw/tldraw/pull/1646) ([@steveruizok](https://github.com/steveruizok))
- Update pr template [#1570](https://github.com/tldraw/tldraw/pull/1570) ([@steveruizok](https://github.com/steveruizok))
- Add contributor license agreement. [#1556](https://github.com/tldraw/tldraw/pull/1556) ([@steveruizok](https://github.com/steveruizok))
- Reinstate auto [#1524](https://github.com/tldraw/tldraw/pull/1524) ([@ds300](https://github.com/ds300))
- [infra] use npx to run auto [#1521](https://github.com/tldraw/tldraw/pull/1521) ([@ds300](https://github.com/ds300))
- Revert 09c36781 & tweak linting [#1501](https://github.com/tldraw/tldraw/pull/1501) ([@SomeHats](https://github.com/SomeHats))
- [fix] eslint from brivate [#1498](https://github.com/tldraw/tldraw/pull/1498) ([@steveruizok](https://github.com/steveruizok))
- [chore] remove webdriver dependencies / scripts [#1488](https://github.com/tldraw/tldraw/pull/1488) ([@steveruizok](https://github.com/steveruizok))
- [fix] local e2e script [#1442](https://github.com/tldraw/tldraw/pull/1442) ([@steveruizok](https://github.com/steveruizok))
- [chore] remove yarnrc-private.yml [#1427](https://github.com/tldraw/tldraw/pull/1427) ([@steveruizok](https://github.com/steveruizok))
- [fix] example routes on vercel [#1391](https://github.com/tldraw/tldraw/pull/1391) ([@steveruizok](https://github.com/steveruizok))
- Neaten up pr template [#1369](https://github.com/tldraw/tldraw/pull/1369) ([@TodePond](https://github.com/TodePond))
- remove references to tldraw-lite [#1367](https://github.com/tldraw/tldraw/pull/1367) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/ui`
  - Explicit shape type checks [#1594](https://github.com/tldraw/tldraw/pull/1594) ([@steveruizok](https://github.com/steveruizok))
  - [improvement] bookmark shape logic [#1568](https://github.com/tldraw/tldraw/pull/1568) ([@steveruizok](https://github.com/steveruizok))
  - Simplify static cursors [#1520](https://github.com/tldraw/tldraw/pull/1520) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/ui`
  - move some kbds into actions and tools [#1585](https://github.com/tldraw/tldraw/pull/1585) ([@BrianHung](https://github.com/BrianHung) [@steveruizok](https://github.com/steveruizok))
  - Add localizations for snapshots links [#1347](https://github.com/tldraw/tldraw/pull/1347) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- `@tldraw/editor`
  - use the right TLEventHandlers [#1486](https://github.com/tldraw/tldraw/pull/1486) ([@judicaelandria](https://github.com/judicaelandria) [@steveruizok](https://github.com/steveruizok))
  - yjs example [#1560](https://github.com/tldraw/tldraw/pull/1560) ([@steveruizok](https://github.com/steveruizok))
  - rename app folder to editor [#1528](https://github.com/tldraw/tldraw/pull/1528) ([@steveruizok](https://github.com/steveruizok))
  - [fix] overlay rendering issues [#1389](https://github.com/tldraw/tldraw/pull/1389) ([@steveruizok](https://github.com/steveruizok))
  - Remove commented code in App [#1377](https://github.com/tldraw/tldraw/pull/1377) ([@steveruizok](https://github.com/steveruizok))
  - enable eslint for test files [#1363](https://github.com/tldraw/tldraw/pull/1363) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/tlschema`
  - restore styles sets exports [#1512](https://github.com/tldraw/tldraw/pull/1512) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/primitives`
  - replace console.log with nicelog [#1496](https://github.com/tldraw/tldraw/pull/1496) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/indices`, `@tldraw/primitives`, `@tldraw/tldraw`, `@tldraw/ui`
  - [chore] remove benchmark [#1489](https://github.com/tldraw/tldraw/pull/1489) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/tlschema`
  - [tiny] add isPageId [#1482](https://github.com/tldraw/tldraw/pull/1482) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`, `@tldraw/file-format`, `@tldraw/polyfills`, `@tldraw/primitives`, `@tldraw/tldraw`, `@tldraw/tlschema`, `@tldraw/ui`, `@tldraw/utils`
  - avoid lazy race conditions [#1364](https://github.com/tldraw/tldraw/pull/1364) ([@SomeHats](https://github.com/SomeHats))

#### 📝 Documentation

- [fix] remove docs scripts [#1651](https://github.com/tldraw/tldraw/pull/1651) ([@steveruizok](https://github.com/steveruizok))
- (2/2) [docs] Fix links to API. [#1654](https://github.com/tldraw/tldraw/pull/1654) ([@TodePond](https://github.com/TodePond))
- (1/2) [docs] Restore some missing changes [#1652](https://github.com/tldraw/tldraw/pull/1652) ([@TodePond](https://github.com/TodePond))
- [docs] Remove embeds page [#1653](https://github.com/tldraw/tldraw/pull/1653) ([@TodePond](https://github.com/TodePond))
- docs: remove not accepting contributions notice [#1647](https://github.com/tldraw/tldraw/pull/1647) ([@gabrielchl](https://github.com/gabrielchl))
- [docs] Add table of contents to Editor page [#1642](https://github.com/tldraw/tldraw/pull/1642) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- remove docs (again) [#1643](https://github.com/tldraw/tldraw/pull/1643) ([@steveruizok](https://github.com/steveruizok))
- [1/2] Move docs to brivate [#1640](https://github.com/tldraw/tldraw/pull/1640) ([@steveruizok](https://github.com/steveruizok))
- [docs] Allow sidebar to be scrolled on short screens [#1632](https://github.com/tldraw/tldraw/pull/1632) ([@TodePond](https://github.com/TodePond))
- [docs] Add feedback when you search [#1633](https://github.com/tldraw/tldraw/pull/1633) ([@TodePond](https://github.com/TodePond))
- [docs] Separate some pages out of the Docs section [#1626](https://github.com/tldraw/tldraw/pull/1626) ([@TodePond](https://github.com/TodePond))
- [docs] Fix wrong cursor when hovering buttons [#1630](https://github.com/tldraw/tldraw/pull/1630) ([@TodePond](https://github.com/TodePond))
- [docs] Tighten up wording & structure of Usage page [#1624](https://github.com/tldraw/tldraw/pull/1624) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [docs] Tighten up Editor page introduction [#1622](https://github.com/tldraw/tldraw/pull/1622) ([@TodePond](https://github.com/TodePond))
- [docs] Tighten up Introduction page [#1621](https://github.com/tldraw/tldraw/pull/1621) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- [docs] Simplify paths for uncategorised pages [#1619](https://github.com/tldraw/tldraw/pull/1619) ([@TodePond](https://github.com/TodePond))
- Auto content refresh for docs site [#1606](https://github.com/tldraw/tldraw/pull/1606) ([@steveruizok](https://github.com/steveruizok))
- Remove `@tldraw/utils` from the docs site [#1596](https://github.com/tldraw/tldraw/pull/1596) ([@TodePond](https://github.com/TodePond))
- [docs] Add barebones note about translations [#1593](https://github.com/tldraw/tldraw/pull/1593) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
- Change app to editor in docs [#1592](https://github.com/tldraw/tldraw/pull/1592) ([@TodePond](https://github.com/TodePond))
- add presence to yjs example [#1582](https://github.com/tldraw/tldraw/pull/1582) ([@steveruizok](https://github.com/steveruizok))
- fix: properly remove awareness from store [#1565](https://github.com/tldraw/tldraw/pull/1565) ([@shahriar-shojib](https://github.com/shahriar-shojib) [@steveruizok](https://github.com/steveruizok))
- Add anchor targets to our headings. [#1571](https://github.com/tldraw/tldraw/pull/1571) ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Fix README typo [#1451](https://github.com/tldraw/tldraw/pull/1451) ([@fossinating](https://github.com/fossinating) [@steveruizok](https://github.com/steveruizok))
- Update examples links to point to examples folder. [#1522](https://github.com/tldraw/tldraw/pull/1522) ([@steveruizok](https://github.com/steveruizok))
- Update docs links + guides + build [#1422](https://github.com/tldraw/tldraw/pull/1422) ([@TodePond](https://github.com/TodePond))
- Update codesandbox + example link [#1368](https://github.com/tldraw/tldraw/pull/1368) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`
  - [improvement] custom shapes example [#1660](https://github.com/tldraw/tldraw/pull/1660) ([@steveruizok](https://github.com/steveruizok))
  - Add tsdocs to Editor methods [#1581](https://github.com/tldraw/tldraw/pull/1581) ([@TodePond](https://github.com/TodePond) [@steveruizok](https://github.com/steveruizok))
  - [Docs] Change some editor properties to methods [#1553](https://github.com/tldraw/tldraw/pull/1553) ([@TodePond](https://github.com/TodePond))
  - [Docs] Change some internal methods to public [#1554](https://github.com/tldraw/tldraw/pull/1554) ([@TodePond](https://github.com/TodePond))
- `@tldraw/editor`, `@tldraw/tlschema`
  - Styles API docs [#1641](https://github.com/tldraw/tldraw/pull/1641) ([@SomeHats](https://github.com/SomeHats) [@steveruizok](https://github.com/steveruizok))
- `@tldraw/tlschema`
  - TLSchema readme [#1506](https://github.com/tldraw/tldraw/pull/1506) ([@steveruizok](https://github.com/steveruizok))

#### 🧪 Tests

- speed up playwright and add visual regression tests [#1638](https://github.com/tldraw/tldraw/pull/1638) ([@SomeHats](https://github.com/SomeHats) [@huppy-bot[bot]](https://github.com/huppy-bot[bot]))
- Disable nightly/on-demand webdriver scripts [#1366](https://github.com/tldraw/tldraw/pull/1366) ([@orangemug](https://github.com/orangemug))
- Adds CI for webdriver tests [#1343](https://github.com/tldraw/tldraw/pull/1343) ([@orangemug](https://github.com/orangemug))
- Added initial webdriver tests [#1337](https://github.com/tldraw/tldraw/pull/1337) ([@orangemug](https://github.com/orangemug))
- `@tldraw/editor`
  - update editor tests [#1547](https://github.com/tldraw/tldraw/pull/1547) ([@steveruizok](https://github.com/steveruizok))
  - Add DSL to make writing shape-layout test cases much easier [#1413](https://github.com/tldraw/tldraw/pull/1413) ([@SomeHats](https://github.com/SomeHats))
- `@tldraw/editor`, `@tldraw/ui`
  - Add playwright tests [#1484](https://github.com/tldraw/tldraw/pull/1484) ([@steveruizok](https://github.com/steveruizok))

#### 🔩 Dependency Updates

- [chore] update wdio-vscode-service [#1346](https://github.com/tldraw/tldraw/pull/1346) ([@ds300](https://github.com/ds300))
- `@tldraw/editor`, `@tldraw/state`, `@tldraw/store`, `@tldraw/tlschema`, `@tldraw/ui`
  - Incorporate signia as @tldraw/state [#1620](https://github.com/tldraw/tldraw/pull/1620) ([@steveruizok](https://github.com/steveruizok) [@ds300](https://github.com/ds300))
- `@tldraw/assets`, `@tldraw/editor`, `@tldraw/polyfills`, `@tldraw/tldraw`, `@tldraw/ui`
  - Revert "Update dependencies (#1613)" [#1617](https://github.com/tldraw/tldraw/pull/1617) ([@SomeHats](https://github.com/SomeHats))
  - Update dependencies [#1613](https://github.com/tldraw/tldraw/pull/1613) ([@steveruizok](https://github.com/steveruizok))
- `@tldraw/editor`
  - update use-gesture [#1453](https://github.com/tldraw/tldraw/pull/1453) ([@ds300](https://github.com/ds300))

#### Authors: 13

- [@huppy-bot[bot]](https://github.com/huppy-bot[bot])
- alex ([@SomeHats](https://github.com/SomeHats))
- Brian Hung ([@BrianHung](https://github.com/BrianHung))
- David ([@fossinating](https://github.com/fossinating))
- David Sheldrick ([@ds300](https://github.com/ds300))
- Gabriel Lee ([@gabrielchl](https://github.com/gabrielchl))
- Judicael ([@judicaelandria](https://github.com/judicaelandria))
- Lu Wilson ([@TodePond](https://github.com/TodePond))
- Mitja Bezenšek ([@MitjaBezensek](https://github.com/MitjaBezensek))
- Mohammad Kazemi ([@mokazemi](https://github.com/mokazemi))
- Orange Mug ([@orangemug](https://github.com/orangemug))
- Shahriar Shojib ([@shahriar-shojib](https://github.com/shahriar-shojib))
- Steve Ruiz ([@steveruizok](https://github.com/steveruizok))
