# Content and privacy

Most content corrections in the source build came from copy that claimed more than the source supported, copy in the owner's voice that went out unconfirmed, and personal details that should not have been public. These rules prevent that.

## 1. Never invent

- Every fact, figure, date, name, and quote comes from the owner or a source they supplied. If it is missing, write `[TBD]` and ask.
- Report every draft in three groups: **from the source**, **my guesses (please confirm)**, **still TBD**.
- Label site-written framing ("the problem was...") as an assumption until the owner confirms it; replace it with their account when it arrives.
- When the owner's numbers do not add up (nine teams listed as eight), ask; do not pick one.
- Fact-check owner-supplied history and technical facts against public sources and plausibility, and flag mismatches gently.
- Do not infer facts from images (a photo at a stadium does not mean the owner follows the sport).
- Do not shoehorn leftover source material into an unrelated page just to cover it.

## 2. Intake

- Ask with numbered questions grouped per page or item, answerable inline, and say "I'll drop anything you skip."
- A per-item checklist works well for repeated content (projects, services, products): problem or purpose, role, approach, tools, results (say "none" to drop), dates, tags, order, accent color.
- Propose new pages as a table of fields with a "question" column, then the body with `[TBD]`s, before writing files.
- Inventory every `[TBD]` by page and location at the start of each content session. When listing placeholders, say where on the page each one appears.
- After writing, list "calls I made that need your eye": softened words, inferred months, attributions, chosen defaults.
- If content disappeared from a rewrite, ask whether it was deliberate; it may need a page of its own.

## 3. Voice

- Ask voice rules before drafting (first person vs no subject vs third person; bullet style; punctuation). Do not overcorrect: subjectless sentences everywhere read stiff, so ask where exceptions are allowed.
- Wording the owner dictates overrides the style rules. Apply it verbatim, fix typos only with approval, and flag (not fix) remaining slips.
- Draft copy in the owner's voice (bios, captions, console messages, greetings) in chat for approval before it goes on a page.
- Default to tight copy; imagery can carry content.
- Replace time-relative and status phrases ("now in beta", "about a decade ago", "new", "currently") with absolute facts, so the site does not go stale.
- Do not encode employment or availability status on a personal site unless the owner asks; the site should survive a change of role. Once the owner closes a sensitive topic, do not raise it again.
- Spell out acronyms in public titles; keep vendor mentions neutral.
- When flagging a copy problem, show the exact strings and a proposed fix.
- After adding labels or units, check for collisions with nearby copy (the same word twice in one tile).

## 4. Privacy screen

Run before any personal content ships:

| Check | How |
|---|---|
| Photo metadata (EXIF, GPS, XMP, maker notes) | `scripts/photo-intake.mjs` strips metadata and reports what it found; re-check the output. |
| Photo content | Children, a house exterior, street signs, license plates, a recognizable home location. Ask before publishing. |
| Place names | Drop names that pinpoint a home (a farm, a street, a small town) unless the owner wants them. |
| Family | Keep family references vague unless the owner says otherwise. |
| Contact details | Email only by default; no phone number. Consider a role address on the domain. |
| Downloadable documents | Never publish an original working file. Audit the export for PII in text, links, and metadata; tracked changes and comments; hidden text; document properties; the PDF title; and that its text matches what the site shows. |
| Built output | Grep the built HTML for HTML comments, `TODO`, `draft`, internal notes, and `[TBD]`; HTML comments ship to production and are visible in view-source. |
| External exposure | Note what a search of the owner's name and address already reveals (registries, old listings) and let the owner decide. |

## 5. Structured content

- Keep repeated content as data with a schema (a collection or JSON validated at build time), so every item renders the same way and missing fields fail the build.
- Generalize one-off requests into schema fields (a `links` array with an optional icon) instead of special-casing a page.
- When text must match a source document verbatim (a resume, a menu), add a scripted check that compares the built HTML to the source text line by line.
