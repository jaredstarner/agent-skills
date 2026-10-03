# QA and verification checklist

Run after every visual batch and before every commit that changes rendering. The rule behind every item: a check is only useful if it could show the bug. Builds and greps do not show visual bugs; the owner looking at real pixels caught most problems in the source build.

## Every commit

- [ ] Type or lint check passes (the build alone may not type-check).
- [ ] Build passes.
- [ ] Grep the built output for the specific change: the new text, link tags, anchors, removed items. Confirm absence as well as presence.
- [ ] Diff after every scripted edit. Heredocs drop regex backslashes, JSON rewrites reformat whole files, and splices duplicate headings.
- [ ] No HTML comments, `TODO`, or internal notes in the built output.

## Every visual batch

- [ ] Screenshots with `scripts/screenshot.mjs` at a desktop width (1280) and a phone width (390), in every color scheme. Read every image back; do not assume.
- [ ] Hover-only, hidden, or state-dependent UI: inject a script or style (`--inject`) to force it visible, or drive the interaction with `--script`.
- [ ] Animated pages: wait long enough (`--wait`) before capture; a mid-animation capture looks broken. For frame-accurate checks, inject a script that sets the animation state.
- [ ] Cross-item alignment: cards in a row share header and body heights regardless of title wrap; stat tiles share a height with figures top-aligned.
- [ ] Text measure matches the layout's dividers and containers.
- [ ] No horizontal page shift between pages (a scrollbar that appears on long pages only). Test with scrollbars visible.
- [ ] Duplicate calls to action or outbound links on long pages.
- [ ] Decorative elements do not look clickable; clickable elements show it.
- [ ] Icons and buttons share treatment across the site.
- [ ] Crops of screenshots actually contain their target; view each crop.
- [ ] Tall screenshots get downscaled when read; crop and inspect detail areas separately.

## Before a milestone (launch, release)

- [ ] Whole-site "what's off" review: source read, built-HTML audit (title, description, canonical, internal links resolve), external link check, 404 check, screenshots of every page at two widths.
- [ ] Contrast check (`scripts/contrast.mjs`) still passes after token changes.
- [ ] Reduced-motion check: emulate `prefers-reduced-motion` and confirm nothing animates.
- [ ] Keyboard: tab through each page; focus is visible on every interactive element, including clipped or notched shapes (draw the ring inside the border).

## Hand the owner a review

- Give a localhost URL with exact steps, including the `cd` into the project. Open review images for them rather than giving a temp path.
- Follow the owner's review order (usually page by page) rather than your own list.

## Always report "not checked"

End each QA report with what was not verified, for example: real phones, Safari and Firefox, touch gestures, real-speed animation smoothness, audio sync, slow networks. Headless checks do not cover these; the owner's live review does.
