# tldraw SDK accessibility conformance report

Agent-readable extraction of [tldraw-SDK-WCAG-2.2-AA-VPAT-2.5.pdf](tldraw-SDK-WCAG-2.2-AA-VPAT-2.5.pdf).

Source: tldraw SDK Accessibility Conformance Report, WCAG edition, based on VPAT version 2.5.
Report date: 16.09.2025.

## Product

| Field | Value |
| --- | --- |
| Product/version | Tldraw |
| Description | The tldraw SDK is a high-performance developer toolkit for embedding interactive whiteboards and infinite canvas experiences directly into applications. |
| Contact | hello@tldraw.com |

## Scope

The review includes:

- `https://examples.tldraw.com/develop`
- UI elements such as the styling toolbar, shapes toolbar, application menus, accessibility and theming options, pop-ups, and dialogs
- Elements on the canvas

## Evaluation methods

Evaluation used automated, manual, and functional testing against WCAG 2.0, 2.1, and 2.2 conformance levels A and AA.

The product was tested with:

- Keyboard only
- VoiceOver with Chrome
- VoiceOver with Safari
- Narrator with Edge
- NVDA with Edge
- 200% and 400% browser zoom
- Different viewport widths

## Applicable standards

| Standard/guideline | Included |
| --- | --- |
| WCAG 2.0 | Level A: yes; Level AA: yes; Level AAA: no |
| WCAG 2.1 | Level A: yes; Level AA: yes; Level AAA: no |
| WCAG 2.2 | Level A: yes; Level AA: yes; Level AAA: no |

## Conformance terms

| Term | Meaning |
| --- | --- |
| Supports | The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation. |
| Partially supports | Some functionality of the product does not meet the criterion. |
| Does not support | The majority of product functionality does not meet the criterion. |
| Not applicable | The criterion is not relevant to the product. |
| Not evaluated | The product has not been evaluated against the criterion. This can only be used in WCAG Level AAA criteria. |

## Summary

The audit includes 56 success criteria. Of those, 48 are applicable to the product, 46 are supported, and 2 are partially supported.

Most issues are against criteria related to perceiving the product.

| Level | Not tested | Supports | Partially supports | Does not support |
| --- | ---: | ---: | ---: | ---: |
| Level A | 4 | 27 | 1 | 0 |
| Level AA | 4 | 19 | 1 | 0 |

| Principle | Tested | Supports | Partially supports |
| --- | ---: | ---: | ---: |
| Perceivable | 14 | 12 (86%) | 2 (14%) |
| Operable | 20 | 20 (100%) | 0 (0%) |
| Understandable | 13 | 13 (100%) | 0 (0%) |
| Robust | 2 | 2 (100%) | 0 (0%) |

## High-signal findings

| Criterion | Conformance | Agent note |
| --- | --- | --- |
| 1.4.1 Use of Color | Partially supports | Selected toolbar items are highlighted using only color. This can be changed to a high-contrast outline through enhanced accessibility mode. |
| 1.4.13 Content on Hover or Focus | Partially supported | Content that appears on hover or focus cannot be hovered by default. The functionality can be turned on through enhanced accessibility mode. |
| 2.4.5 Multiple Ways | Not evaluated | The report says there is only one page. |
| 3.3.8 Accessible Authentication | Not evaluated | Authentication is not in scope. |

## Level A criteria

Notes from the report:

- Out of the 32 Level A criteria, 4 are not applicable, 1 is partially supported, and 27 are supported.
- Content added by the user can be navigated by keyboard, either in default tab order or in two dimensions using `Cmd` + arrow keys.
- Custom keyboard shortcuts are available to move or manipulate elements on the canvas.
- Shapes and other visual elements have default text alternatives.
- Uploaded images can be given custom text alternatives by the user.
- Users cannot customize text alternatives or keyboard focus order on other graphical elements.

| Criterion | Conformance | Remarks |
| --- | --- | --- |
| 1.1.1 Non-text Content (Level A) | Supports | All icons and images have appropriate text alternatives. Additionally, it is possible for the user to set text alternatives on images uploaded on the canvas. |
| 1.2.1 Audio-only and Video-only (Prerecorded) (Level A) | Not applicable | There is no video or audio-only content in the app. |
| 1.2.2 Captions (Prerecorded) (Level A) | Not applicable | There is no video or audio content or need for captions. |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) (Level A) | Not applicable | There is no video or audio content or need for audio descriptions and media alternatives. |
| 1.3.1 Info and Relationships (Level A) | Supports | |
| 1.3.2 Meaningful Sequence (Level A) | Supports | |
| 1.3.3 Sensory Characteristics (Level A) | Supports | |
| 1.4.1 Use of Color (Level A) | Partially supports | The selected items in the toolbar are highlighted using only color, which can be changed to a high-contrast outline through the enhanced accessibility mode option. |
| 1.4.2 Audio Control (Level A) | Not applicable | The product does not have audio. |
| 2.1.1 Keyboard (Level A) | Supports | All tested functionality can be executed by keyboard only. Additional custom keyboard shortcuts exist. |
| 2.1.2 No Keyboard Trap (Level A) | Supports | |
| 2.1.4 Character Key Shortcuts (Level A 2.1 and 2.2) | Supports | Shortcuts can be turned off in the accessibility menu. |
| 2.2.1 Timing Adjustable (Level A) | Supports | There are no timings set in the code; auto logout occurs after over 20 hours. |
| 2.2.2 Pause, Stop, Hide (Level A) | Supports | |
| 2.3.1 Three Flashes or Below Threshold (Level A) | Supports | |
| 2.4.1 Bypass Blocks (Level A) | Supports | It is possible to skip straight to the canvas. |
| 2.4.2 Page Titled (Level A) | Supports | Each page has a unique title. |
| 2.4.3 Focus Order (Level A) | Supports | |
| 2.4.4 Link Purpose (In Context) (Level A) | Supports | |
| 2.5.1 Pointer Gestures (Level A 2.1 and 2.2) | Supports | |
| 2.5.2 Pointer Cancellation (Level A 2.1 and 2.2) | Supports | |
| 2.5.3 Label in Name (Level A 2.1 and 2.2) | Supports | |
| 2.5.4 Motion Actuation (Level A 2.1 and 2.2) | Supports | |
| 3.1.1 Language of Page (Level A) | Supports | |
| 3.2.1 On Focus (Level A) | Supports | |
| 3.2.2 On Input (Level A) | Supports | |
| 3.2.6 Consistent Help (Level A 2.2 only) | Supports | |
| 3.3.1 Error Identification (Level A) | Supports | |
| 3.3.2 Labels or Instructions (Level A) | Supports | |
| 3.3.7 Redundant Entry (Level A 2.2 only) | Supports | |
| 4.1.1 Parsing (Level A) | Supports | For WCAG 2.0 and 2.1, the September 2023 errata update indicates this criterion is always supported. The PDF also notes that WCAG 2.2 removed this criterion and it does not apply. |
| 4.1.2 Name, Role, Value (Level A) | Supports | |

## Level AA criteria

Notes from the report:

- Out of the 24 Level AA criteria, 1 is partially supported, 2 are not applicable, 2 are not evaluated, and 19 are supported.
- 95% of tested, applicable, and evaluated success criteria are supported.

| Criterion | Conformance | Remarks |
| --- | --- | --- |
| 1.2.4 Captions (Live) (Level AA) | Not applicable | There is no live video, audio, or need for captions. |
| 1.2.5 Audio Description (Prerecorded) (Level AA) | Not applicable | There is no audio or need for audio descriptions. |
| 1.3.4 Orientation (Level AA 2.1 and 2.2) | Supports | The app can be used in different device orientations. |
| 1.3.5 Identify Input Purpose (Level AA 2.1 and 2.2) | Supports | |
| 1.4.3 Contrast (Minimum) (Level AA) | Supports | All regular text content has a contrast of at least 4.5:1 against the background. |
| 1.4.4 Resize text (Level AA) | Supports | It is possible to enlarge the text to 200% without breaking the layout. |
| 1.4.5 Images of Text (Level AA) | Supports | There are no images of text. |
| 1.4.10 Reflow (Level AA 2.1 and 2.2) | Supports | The app can be used on small viewports and when zoomed in up to 400%. |
| 1.4.11 Non-text Contrast (Level AA 2.1 and 2.2) | Supports | |
| 1.4.12 Text Spacing (Level AA 2.1 and 2.2) | Supports | |
| 1.4.13 Content on Hover or Focus (Level AA 2.1 and 2.2) | Partially supported | Content that appears on hover or focus cannot be hovered by default. The functionality can be turned on through the enhanced accessibility mode setting. |
| 2.4.5 Multiple Ways (Level AA) | Not evaluated | There is only one page. |
| 2.4.6 Headings and Labels (Level AA) | Supports | |
| 2.4.7 Focus Visible (Level AA) | Supports | |
| 2.4.11 Focus Not Obscured (Minimum) (Level AA 2.2 only) | Supports | |
| 2.5.7 Dragging Movements (Level AA 2.2 only) | Supports | |
| 2.5.8 Target Size (Minimum) (Level AA 2.2 only) | Supports | |
| 3.1.2 Language of Parts (Level AA) | Supports | |
| 3.2.3 Consistent Navigation (Level AA) | Supports | |
| 3.2.4 Consistent Identification (Level AA) | Supports | |
| 3.3.3 Error Suggestion (Level AA) | Supports | |
| 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA) | Supports | |
| 3.3.8 Accessible Authentication (Minimum) (Level AA 2.2 only) | Not evaluated | Authentication is not in scope. |
| 4.1.3 Status Messages (Level AA 2.1 and 2.2) | Supports | |
