# Publishing checklist

Package: `dsh-sidebar-notes` · Repository: `https://github.com/ImNotDerk/dsh-sidebar-notes`

The package is a plain DSH Web bundle (Host half + Client half + `cordis.patch.yml`)
with no third-party assets, so there is no asset licensing blocker. This
checklist is the release gate.

## One-time setup

- [ ] Confirm the npm account and scope: `npm whoami` (expected `ImNotDerk`).
- [ ] Confirm the name is still free: `npm view dsh-sidebar-notes version`
      should report `E404`.
- [ ] Create the GitHub repository, add it as `origin`, push `main`.
- [ ] Review `LICENSE`, `README.md` and `package.json` together.

## Every release

- [ ] Decide the version (stay `0.x` while DSH plugin APIs are pre-release).
- [ ] Bump `package.json` and add the dated entry to `CHANGELOG.md`; state the
      DSH version this release was tested with.
- [ ] `npm test` passes locally.
- [ ] `npm pack --dry-run` contains only `index.js`, `client.js`,
      `cordis.patch.yml`, `locale/*.json`, `icon.svg`, `README.md`, `LICENSE`
      and `CHANGELOG.md` — no samples, scripts, CI files or personal paths.
- [ ] Fresh-profile install test from the packed tarball or the local path:
      `plugin_manager install_bundle target=<tarball-or-path>`, then verify both
      pages, the sidebar rows, a note drag/skin change, and the three
      `user_notes_*` tools in a new session.
- [ ] Verify the token-only design under at least one alternate theme
      (Settings → Themes) and one browser reload with a different palette.
- [ ] `git status` is clean; commit, tag `vX.Y.Z`, push.
- [ ] `npm publish --access public`.
- [ ] Post-publish: install from npm in a clean profile with
      `plugin_manager install_bundle target=dsh-sidebar-notes` and repeat the
      smoke checks.
- [ ] Update the README compatibility line if the tested DSH version changed.

## Rollback

Unpublish is only allowed within npm's 72-hour window and is discouraged.
Prefer publishing a patch release; users can pin a previous version in the
profile manifest.
