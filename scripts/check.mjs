/**
 * Structural checks for the published bundle: metadata, file layout, bundle
 * ids, docs and the absence of local-only references. Run by `npm test`.
 */
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const failures = []

/**
 * Record a failed expectation.
 * @param {boolean} condition - expectation to check.
 * @param {string} message - failure description.
 */
function check(condition, message) {
  if (!condition) failures.push(message)
}

/**
 * Read a repository file.
 * @param {string} path - repository-relative path.
 * @returns {Promise<string>} file text.
 */
function read(path) {
  return readFile(join(root, path), 'utf8')
}

const pkg = JSON.parse(await read('package.json'))

/**
 * Tell whether one package.json files entry covers a repository path, honouring
 * the simple `*` globs the bundle uses for locale files.
 * @param {string} entry - files entry.
 * @param {string} path - repository-relative path.
 * @returns {boolean} whether the entry ships the path.
 */
function ships(entry, path) {
  if (!entry.includes('*')) return entry === path
  const pattern = new RegExp(`^${entry.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`)
  return pattern.test(path)
}

check(pkg.name === 'dsh-sidebar-notes', 'package name must be dsh-sidebar-notes')
check(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version), 'version must be semver')
check(pkg.private === undefined, 'package.json must not be private')
check(pkg.license === 'MIT', 'license must be MIT')
check(pkg.type === 'module', 'package must be an ES module')
check(pkg.main === './index.js', 'main must point at ./index.js')
check(pkg.dsh?.bundle?.patch === './cordis.patch.yml', 'dsh.bundle.patch must name cordis.patch.yml')
check(
  Array.isArray(pkg.dsh?.client?.inject) && pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-sidebar'),
  'dsh.client.inject must include the sidebar client package',
)
for (const path of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'README.md', 'LICENSE', 'CHANGELOG.md', 'locale/en.json', 'locale/zh.json']) {
  check(pkg.files.some(entry => ships(entry, path)), `package.json files must ship ${path}`)
}
for (const path of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'README.md', 'LICENSE', 'CHANGELOG.md', 'locale/en.json', 'locale/zh.json']) {
  try {
    await access(join(root, path), constants.R_OK)
  } catch {
    failures.push(`${path} is missing`)
  }
}

const patch = await read('cordis.patch.yml')
check(patch.includes("name: 'dsh-sidebar-notes'"), 'cordis.patch.yml must reference dsh-sidebar-notes')

const client = await read('client.js')
check(client.includes('window.__ModuleLoader__.load('), 'client.js must use the DSH client bundle loader')
check(client.includes("id: 'dsh-sidebar-notes'"), 'client.js loader id must match the package name')
check(client.includes("data-dsh-plugin', 'dsh-sidebar-notes'"), 'client.js style marker must match the package name')

const host = await read('index.js')
check(host.includes("export const inject = ['webServer', 'tools']"), 'host must inject webServer and tools')
check(host.includes('export function apply('), 'host must export apply')

for (const path of ['index.js', 'client.js', 'cordis.patch.yml', 'README.md', 'locale/en.json', 'locale/zh.json']) {
  check(!(await read(path)).includes('@local/'), `${path} must not contain a local-only @local/ id`)
}

const readme = await read('README.md')
check(readme.includes('plugin_manager install_bundle target=dsh-sidebar-notes'), 'README must document the npm install command')
check(readme.includes('plugin_manager remove_bundle target=dsh-sidebar-notes'), 'README must document uninstall')
for (const path of ['README.md', 'package.json', 'client.js', 'index.js']) {
  check(!(await read(path)).includes('/Users/'), `${path} must not contain a personal absolute path`)
}

const icon = await read('icon.svg')
check(icon.trimStart().startsWith('<svg'), 'icon.svg must be an SVG document')

for (const localeFile of ['locale/en.json', 'locale/zh.json']) {
  const locale = JSON.parse(await read(localeFile))
  check(typeof locale?.meta?.title === 'string' && locale.meta.title !== '', `${localeFile} must carry a meta title`)
}

const changelog = await read('CHANGELOG.md')
check(changelog.startsWith('# Changelog'), 'CHANGELOG.md must start with a title')
check(changelog.includes(pkg.version), `CHANGELOG.md must mention version ${pkg.version}`)

if (failures.length > 0) {
  console.error(`check failed (${failures.length}):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(`check ok: ${pkg.name}@${pkg.version}`)
