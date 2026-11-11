# Publishing checklist

Package: `dsh-sidebar-notes` · Repository: `https://github.com/ImNotDerk/dsh-sidebar-notes`

The package is a plain DSH Web bundle (Host half + Client half + `cordis.patch.yml`)
with no third-party assets, so there is no asset licensing blocker. This
checklist is the release gate.

## One-time setup

- [ ] Confirm the npm account: `npm whoami` (expected `imnotderk`). New npm
      accounts have `auth-and-writes` 2FA mode; publishing requires either a
      TOTP code from an authenticator app or a **granular access token with
      "Bypass 2FA"** enabled. Enable 2FA on npmjs.com before the first publish.
- [x] Trusted publishing is configured for GitHub Actions (token-free OIDC):
      `npm trust github dsh-sidebar-notes --file release.yml \
        --repo ImNotDerk/dsh-sidebar-notes --allow-publish`
      (config id `b1f71da7-e990-4ff1-9148-2524c74a83c9`, permissions
      `publish, stage publish`). `.github/workflows/release.yml` publishes on a
      `v*` tag, with no `NPM_TOKEN` secret required.
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
- [ ] `git status` is clean; commit, tag `vX.Y.Z`, push. The tag triggers
      `.github/workflows/release.yml`, which publishes through trusted
      publishing (OIDC) with provenance.
- [ ] Manual fallback (first publish or setup changes): run
      `npm publish --access public` locally and approve the browser 2FA prompt
      with the account security key.
- [ ] Post-publish: install from npm in a clean profile with
      `plugin_manager install_bundle target=dsh-sidebar-notes` and repeat the
      smoke checks.
- [ ] Update the README compatibility line if the tested DSH version changed.

## npm placeholders

The first publish of this name created npm's permanent `0.0.0-stage`
placeholder ("Temporary package placeholder for staged publishing"). It is the
name reservation that makes the package addressable; do not unpublish or delete
it. `latest` points at the real release (`0.1.0` at the time of writing).

## Rollback

Unpublish is only allowed within npm's 72-hour window and is discouraged.
Prefer publishing a patch release; users can pin a previous version in the
profile manifest.
