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
