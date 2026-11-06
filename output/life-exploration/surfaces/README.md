# Explore — continuous surface comparison

Requested November 6. Two isolated visual prototypes use identical fictional content, native Explore markup, and frozen production shell/component CSS. `index.html` compares both; select a single option for a larger view. Desktop, compact and phone viewport controls, a simulated dark window bar, and fixed/follow-pointer dimming support inspection. Navigation, unsent typing, task checkboxes and close/reopen work locally within the preview. Nothing calls AI, reads personal storage, saves, or loads application scripts.

1. **Continuous dark pane:** header, conversation, question and composer inherit `--bg`. The input uses `--surface`; text and controls use the existing main-surface tokens.
2. **Continuous soft pane:** all four areas inherit `--surface`. The input uses `--bg`; text and controls use the existing elevated-surface tokens.

Both remove the composer's full-width top separator and keep the pane's vertical divider. The window strip is a neutral simulation in `--bg`, not a claim about installed PWA chrome or an implementation of native window controls. All palette values come from the canonical token snapshot. The wrapper's review controls are outside the product frames. No production appearance, release metadata or service-worker inventory changes.

Verification and captures: `.context/explore-surfaces/`. Can selected the continuous soft pane and an integrated desktop window area. Installed PWA appearance remains user review.

Verified both options at 390/736/1280/1440px: continuous computed header/body/footer colours, contrasting input, no horizontal overflow, visible control containment and axe WCAG A/AA checks. Real pointer/keyboard navigation, draft retention, pane dimming and close/reopen pass; storage getters are blocked and no fetch/XHR/non-GET requests occur. Frozen-source captures were visually inspected. The checking harness bypasses CSP only to inject axe; the preview itself loads local external scripts. No full release or installed-window acceptance is claimed.

## Speaker and question refinement

Open `?option=2` for the selected soft surface with the simulated strip hidden. Speakers can switch between original names, a native Syne/lime mini TODAY wordmark with a readable mono You label, and small symbols beside the written names. No avatar circles, new palette or image assets. The grouped question keeps its normal prose size, adds a quiet token-coloured rule and inset aligned with the input text, and separates it with one spacing step. Can approved the mini TODAY wordmark / readable You labels and grouped question for integration in v3.5.2. The symbol/name treatment remains an alternative in the study.
