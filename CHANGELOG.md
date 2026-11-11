# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Until `1.0.0`, the
DeepSeek Harness plugin APIs this bundle targets may still change.

## [0.1.0] — 2026-11-11

Initial public release.

### Added

- Todos page: progress hero (open/completed counts, percentage, progress bar),
  add row, open and completed list cards, inline edit (double-click or pencil),
  custom checkbox, clear completed, and an "all caught up" state.
- Sticky notes page: frosted glass board, draggable notes snapped to a 24 px
  grid, per-note title, 9 skins, one inlined image per note, collapse-to-pill,
  hide-all, delete, and a theme-derived skin picker.
- Theme-adaptive design: every surface, note skin and control colour derives
  from the active DSH theme's semantic tokens (`--dsw-alias-*`) through
  `color-mix()`. Works in light and dark palettes and under full UI themes such
  as Frieren UI, Arasaka UI and Cyberpunk 2077 without plugin changes; the
  plugin also resets theme-forced form-control paint so note fields keep their
  design.
- Agent tools: `user_notes_read`, `user_notes_add`, `user_notes_update`. Agent
  writes are stamped (`by: "agent"`, session id, timestamp) and shown with an
  `AI` chip; agents cannot delete items.
- Host: one document per `DSH_HOME` at `plugin-data/sidebar-notes.json`, written
  atomically through a temporary file and rename. Bounded document (500 todos,
  80 notes, 16 MiB request, 4 MiB image data URL) and item-level write
  operations so the Host stays the only writer.
- Accessibility: native checkbox semantics, `role="progressbar"` with values,
  focus-visible rings, reduced-motion and reduced-transparency fallbacks, and
  WCAG-AA contrast for note paper, title bars, labels and controls across the
  tested palettes.
