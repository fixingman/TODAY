# Accessibility Audit — v2.68.0

> Target: WCAG 2.2 Level AA for reachable user flows. This is an engineering audit, not a certification or a claim of full conformance.

## Scope

Reviewed surfaces: the main PWA at desktop and mobile widths, task and habit lists, Soon/Past sections, Connections, About, Memory, focus mode, triage, meeting capture/review, Voice Note, focus and meeting Picture-in-Picture, and the shared poem page. The closed, unreachable AI sheet remains outside reachable-flow acceptance; it has no trigger and is removed from the accessibility tree while closed.

The implementation follows the [Astryx `VisuallyHidden` guide](https://astryx.atmeta.com/components/VisuallyHidden): screen-reader-only content remains in the document flow with clipping rather than `display:none`, while content that is actually closed uses `hidden`, `aria-hidden`, and/or `inert` as appropriate. Visually-hidden content is limited to labels, supplementary instructions, and block-level live regions—not interactive controls.

## Findings and remediations

| Area | Finding | Remediation in v2.68.0 |
|---|---|---|
| Names and semantics | Icon-only controls, custom completion controls, and meeting selections had incomplete names/state. | Added native buttons, explicit labels, headings, lists, and `aria-pressed`, `aria-expanded`, `aria-busy`, progress, and status semantics. |
| Keyboard operation | Rows and pointer reordering were not keyboard-operable. | Rows are focusable. Enter starts focus, Space toggles completion, and Option+Up/Down reorders manual tasks, Trello tasks, and habits through their existing persistence paths. Moves and boundaries are announced. |
| Navigation | There was no skip navigation or reliable semantic section structure. | Added a skip link, main landmark target, section headings, and list/listitem structure. |
| Dialogs and disclosures | Triage and meeting review did not contain/restore focus; header panels did not consistently expose state. | Added shared disclosure synchronization, modal focus containment/restoration, temporary background `inert`, Escape handling, and a nonmodal meeting-name prompt. |
| Hidden UI | Closed panels, toasts, backdrops, parked timers, and the unreachable AI sheet could remain discoverable. | Closed UI is hidden from both tab order and accessibility tree. Receded focus-mode content becomes inert while the active row and timer remain available. |
| Status and async feedback | Several visual-only updates were silent to assistive technology. | Added polite and urgent visually-hidden live regions for task, focus, recording, reorder, share, and async-result updates. Pointer drag does not announce intermediate movement. |
| Forms and history | Some inputs and habit history lacked explicit labels or a usable summary. | Added programmatic form labels and accessible habit-history summaries. |
| Focus and targets | Focus indication and small icon targets were inconsistent. | Added visible `:focus-visible` treatment and a 24×24 CSS-pixel minimum for interactive controls. PiP hover controls also reveal on `:focus-within`. |
| Contrast | Muted text, subtle control borders, opacity-based done states, and poem footer text could fall below intended contrast. | Raised muted text to `#858594`, added `--control-border: #6b6b78`, reserved the old border for decorative separation, and removed opacity reduction from essential done/memory text and controls. |
| Zoom and reflow | Viewport metadata blocked zoom and narrow layouts could overflow horizontally. | Removed zoom restrictions, added 320 CSS-pixel reflow protections, and kept horizontal clipping on the document root rather than `.app`. |
| Motion | Some repeating or reveal motion did not consistently respect reduced-motion settings. | Disabled relevant focus/PiP animation under `prefers-reduced-motion: reduce`. |
| Poem page | Heading/content structure, sharing status, focus indication, targets, and footer contrast were incomplete. | Added article/heading/blockquote/cite semantics, accessible share feedback, stronger contrast, visible focus, and adequate targets. |
| Picture-in-Picture | Focus and meeting PiP controls lacked complete names/state/progress output. | Added named keyboard controls, pressed/state semantics, meaningful timer/progress output, focus reveal, and reduced-motion handling. |

## Accepted exception — WCAG 2.2 criterion 2.5.7

Pointer reordering still requires a dragging movement. No visible move buttons, click-to-move control, or long-press alternative has been added. Therefore WCAG 2.2 criterion 2.5.7, Dragging Movements, remains unmet and is an explicitly accepted product exception.

Keyboard users have an alternative through Option+Up/Down, but that does not satisfy the criterion's required single-pointer alternative. The product must not be described as fully WCAG-conformant while this exception remains.

## Automated verification

`node scripts/accessibility-test.mjs` uses axe-core with Puppeteer and checks representative desktop/mobile states, all reachable header disclosures, focus mode, triage, meeting review, and the poem page. It also asserts accessible names/state, dialog focus containment/restoration, skip navigation, hidden UI exclusion, keyboard reorder persistence and boundary announcements, zoom-capable viewport metadata, contrast tokens, 24px targets, and 320px reflow.

Automated checks supplement manual testing; they cannot establish conformance on their own.

## Manual verification still required

Before release, complete and record these passes:

- macOS Safari and Chrome: keyboard-only add, complete, delete, undo, focus, collapse, meeting selection, dialogs, and Option+Arrow reorder.
- macOS VoiceOver in Safari and Chrome: task/habit actions, disclosures, focus mode, triage, meetings, poem sharing, announcements, and focus restoration.
- iPhone installed PWA with VoiceOver: tasks/habits, disclosures, triage, meetings/Voice Note, zoom, and 320px-equivalent reflow/orientation checks.
- Real focus and meeting Picture-in-Picture windows: keyboard operation, control names/states, timer/progress output, focus visibility, and reduced motion.
- Browser zoom at 200% and narrow reflow at 320 CSS pixels with no lost content or document-level horizontal scrolling.

Record failures as follow-up work rather than changing this document to claim certification.
