# PACT FE Design Tokens

This document records the visual system used by `PACT-FE`. It is documentation only. Do not import runtime code, config, auth state, API clients, or environment values from `PACT-FE` into `LMS-FE`.

## Color

Core tokens are defined in `src/styles.css`.

| Token | Default | Purpose |
| --- | --- | --- |
| `--nav` | `#07131f` | Primary application chrome and topbar |
| `--bg` | `#f3f5f2` | Workspace background |
| `--surface` | `#ffffff` | Main panels and cards |
| `--surface-muted` | `#f7faf8` | Metric tiles and quiet fields |
| `--border` | `#d9e1dc` | Standard dividers and card borders |
| `--text` | `#17221e` | Primary copy |
| `--muted` | `#61726b` | Labels, metadata, and secondary copy |
| `--accent` | `#227c68` | Default interactive accent |
| `--accent-soft` | `#e6f4ef` | Selected and success-adjacent surfaces |
| `--accent-dark` | `#10362e` | Text on soft accent surfaces |

Squad themes override only accent tokens:

| Theme | Accent | Soft | Dark |
| --- | --- | --- | --- |
| Squad 1 | `#b83b3b` | `#f8e6e3` | `#4a1515` |
| Squad 2 | `#b77a11` | `#f8efd8` | `#4a3109` |
| Squad 3 | `#227c68` | `#e4f3ec` | `#123a30` |
| Squad 4 | `#2c6fba` | `#e4eefb` | `#15385f` |
| Staff | `#64717d` | `#edf0f2` | `#202930` |

## Typography

- Font stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Page title: `clamp(1.45rem, 2.4vw, 2.15rem)`, line-height `1.08`, weight inherited bold
- Section heading: `clamp(1.15rem, 1.4vw, 1.45rem)`, line-height `1.15`
- Labels: `0.72rem`, weight `900`, uppercase
- Controls: `0.92rem`, weight `800`

## Layout

- App shell: `260px` left navigation plus fluid workspace on desktop
- Training workspace: playlist, runner, activity columns with `1rem` gap
- Standard radius: `8px`
- Standard panel shadow: `0 8px 24px rgba(13, 31, 45, 0.07)`
- Responsive breakpoints:
  - `1320px`: activity panel moves below the runner
  - `1080px`: shell becomes single-column
  - `760px`: controls and panels stack for mobile

## Component Rules

- Keep nav and topbar dark; use light panels for learning and diagnostics.
- Use accent color only for active navigation, selected content, progress, and primary actions.
- Use `--surface-muted` for metric tiles and readonly diagnostic blocks.
- Keep cards at `8px` radius. Avoid nested decorative cards.
- Disabled buttons use solid muted backgrounds rather than opacity-only states.

## LMS Alignment Guidance

`LMS-FE` may mirror these documented values for visual consistency, but should keep its own CSS and auth/session implementation. Shared runtime packages must not contain secrets, API origins, auth state, Keycloak state, LTI launch data, or PACT session data.
