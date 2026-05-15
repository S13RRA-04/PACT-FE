# LMS-FE Token Comparison Pass

This pass compares `LMS-FE/src/styles.css` against `PACT-FE/docs/design-tokens.md` before any LMS restyling work. It is documentation only; it does not create shared runtime code.

## Current Alignment

| Area | PACT-FE | LMS-FE | Assessment |
| --- | --- | --- | --- |
| Font stack | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Same stack | Aligned |
| Standard radius | `8px` | Mostly `8px` | Aligned |
| Dark app chrome | `--nav: #07131f` | `--cetu-navy: #071a33` | Close, but not identical |
| Workspace background | `--bg: #f3f5f2` | `--cetu-silver-2: #eef2f6` | Similar value, cooler LMS tint |
| Surface | `--surface: #ffffff` | `#ffffff` panels | Aligned |
| Primary text | `--text: #17221e` | `--cetu-ink: #111827`, root `#182235` | Similar contrast, different hue |
| Muted text | `--muted: #61726b` | `--cetu-muted: #64748b` | Similar role, LMS is cooler blue-gray |
| Accent | `--accent: #227c68` | `--cetu-blue: #0b72df`, `--cetu-cyan: #19c2c9` | Different product accent direction |
| Panel shadow | `0 8px 24px rgba(13, 31, 45, 0.07)` | Commonly `0 10px 30px rgb(15 23 42 / 6%)` | Close enough to standardize |

## Restyling Guidance

- Keep LMS auth, Keycloak state, API clients, and environment handling separate from PACT.
- Prefer renaming or aliasing LMS visual tokens locally instead of importing PACT CSS.
- Keep the shared design language at the documentation/token level: dark left nav, white panels, 8px radius, Inter, muted metric cards, and consistent focus rings.
- Preserve LMS-specific blue/cyan identity unless the product decision is to make LMS and PACT use the same green PACT accent.
- If converging accents, do it deliberately with LMS-local variables such as `--lms-accent`, not by referencing `--accent` from PACT.

## Candidate LMS Token Aliases

These aliases can be introduced in `LMS-FE/src/styles.css` during a future LMS restyle:

| Candidate | Current LMS source | PACT analog |
| --- | --- | --- |
| `--lms-nav` | `--cetu-navy` | `--nav` |
| `--lms-bg` | `--cetu-silver-2` | `--bg` |
| `--lms-surface` | `#ffffff` | `--surface` |
| `--lms-border` | `#d9e2ee` / `#cfd8e5` | `--border` |
| `--lms-text` | `--cetu-ink` | `--text` |
| `--lms-muted` | `--cetu-muted` | `--muted` |
| `--lms-accent` | `--cetu-blue` or `--cetu-cyan` | `--accent` |

## Recommended Next Step

Before restyling LMS screens, introduce LMS-local aliases and migrate one low-risk surface, such as metric cards or report panels, to confirm the token mapping. Do not share runtime CSS files between apps unless a separate frontend-safe design package is intentionally created and reviewed for secrets/config boundaries.
