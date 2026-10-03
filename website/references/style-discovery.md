# Style discovery playbook

How to get from "I want it to feel like X" to an approved palette, type pairing, and layout, and then into tokens. The pattern that converged fastest in the source build: show rendered throwaway previews, offer discrete named options, and let the owner combine them.

## 1. Gather inputs

- Ask for reference sites, images, brands, games, or eras, and what specifically the owner likes about each.
- Before proposing anything new, mine what was already supplied. In the source build the assistant asked the owner to "find a clip" when a reference gif had already been attached.
- Collect loose personal inputs (favorite color, animal, place) with explicit permission to ignore them. They are good fuel for icons and accents, not obligations.
- Record hard brand constraints separately: existing logo, required colors, required fonts.

## 2. Interrogate constraints

For every rule the owner states, ask what it is guarding against, then write down both:

| Stated rule | Ask | What it turned out to mean (source build) |
|---|---|---|
| "No animation beyond a subtle hover" | Is this about distraction, performance, accessibility, or trendiness? | Avoid trendy, overdone motion and time spent "looking modern"; deliberate retro motion was welcome. |
| "Retro / pixel" | Everywhere, or as accents? | A pixel heading font read as "too pixely"; retro moved to accents (markers, dithered dividers, notched corners). |
| "Professional" | Professional for whom? | Body and headings stayed clean; personality lived in details and easter eggs. |

Re-confirm a constraint before breaking it, even when the owner's later request implies it. Log the change in `docs/decisions.md`.

## 3. Preview before committing

Build throwaway HTML or PNG previews in a scratch folder, never in the repo, and open them for the owner (give a file to open, not just a path):

- **Palette:** swatches with the hex values and contrast ratios of each text pairing in light and dark.
- **Type:** 3 to 4 heading and body pairings rendered with real headings and a paragraph of real content, at real sizes.
- **Landing mock:** one full-page mock with working theme toggle, using the candidate tokens.
- **Icons and favicon:** concepts at 16, 32, and 64 px on light and dark tab-bar backgrounds; self-critique at tab size (a wolf can read as a fox; "JS" reads as the JavaScript logo).
- **Social image:** 2 or 3 layouts at 1200x630, also viewed at thumbnail size.
- **Complex animation:** a storyboard with a timed beat table before any code; annotate illustrative devices (motion ghosts in a still frame read as an intended fade).

When a spec is ambiguous, render both readings side by side. "16-bit palette" could mean the site's 16 colors or SNES color depth; one of them lost the subject's face.

When abstract options stall a decision, show a per-item table of what each option would look like on the real content.

## 4. Offer options well

- Present 2 to 4 discrete, nameable options (A, B, C...) using only real data. Push back on options that would need figures the owner does not have.
- Make options combinable ("tail 2 with the violet ending from 4").
- Do not assume your recommendation wins. In the source build the owner chose a non-recommended option on triggers, assets, and color assignment.
- Check font licenses (OFL or similar) before offering a font.

## 5. Tokens

Once direction is approved, encode it:

- **Palette:** raw named colors only (`--palette-ink`, `--palette-sand`).
- **Semantic roles per mode:** `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-divider`, `--color-accent`, `--color-on-accent`, `--color-focus`. Components use roles only.
- **Inverse scope:** a `.theme-inverse` class that applies the opposite mode's roles to a subtree makes colored or inverted sections cheap.
- **Composite variables resolve where declared.** `--border: var(--border-width) solid var(--color-border)` on `:root` does not pick up a `--color-border` re-pointed inside a band. Redeclare composites in every scope that re-themes.
- **Contrast:** run `scripts/contrast.mjs` on every role pairing in every mode, including surfaces and bands. It caught a muted text role at 3.99:1 in the source build.
- **Exceptions:** out-of-palette colors for deliberate homage elements are fine; log them as exceptions in `docs/decisions.md`.
- **Per-item accent colors:** store them as data on the item (frontmatter), not computed from sort position, so reordering does not recolor things. With fewer hues than items in a grid, order them so no item matches a neighbor beside or below it.
- **Generate assets from tokens** (social image, favicon colors) so they cannot drift from the design system.

## 6. Motion and accessibility

- `prefers-reduced-motion`: disable all animation, including pseudo-elements; keep the outcome (state change, sound, message) on the same timing.
- Blinking stops within 5 seconds (WCAG 2.2.2).
- Hover-revealed content also appears on keyboard focus and reserves its space (WCAG 1.4.13); hide it on touch and narrow screens rather than making it unreachable.
- Decorative glyphs must not look interactive: directional triangles read as collapse controls.
- An icon-only toggle is unclear; label it with what a click does.
- Flag conflicts between the brief and accessibility proactively.
