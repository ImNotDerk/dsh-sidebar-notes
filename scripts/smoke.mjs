/**
 * Host smoke test: register the bundle against a minimal Cordis-like context,
 * exercise both HTTP routes and all three agent tools, and verify the document
 * is written atomically inside a temporary DSH_HOME.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
 * Answer one captured route with a request-shaped object.
 * @param {(request: object, response: object) => Promise<void>} handler - captured route handler.
 * @param {object} request - request-shaped object.
 * @returns {Promise<{status: number, body: unknown}>} response status and parsed JSON body.
 */
async function callRoute(handler, request) {
  const response = {
    status: 0,
    headers: {},
    body: '',
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body) {
      this.body = body ?? ''
    },
  }
  await handler(request, response)
  let parsed
  try {
    parsed = response.body === '' ? null : JSON.parse(response.body)
  } catch {
    parsed = response.body
  }
  return { status: response.status, body: parsed }
}

/**
 * Build a POST request carrying a JSON body.
 * @param {unknown} payload - value to serialise.
 * @returns {object} async-iterable request.
 */
function jsonRequest(payload) {
  return {
    method: 'POST',
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify(payload))
    },
  }
}

const home = await mkdtemp(join(tmpdir(), 'dsh-sidebar-notes-smoke-'))
process.env.DSH_HOME = home

try {
  const { inject, apply } = await import('../index.js')

  check(Array.isArray(inject) && inject.includes('webServer') && inject.includes('tools'), 'inject must list webServer and tools')
  check(typeof apply === 'function', 'apply must be a function')

  const routes = new Map()
  const tools = new Map()
  const ctx = {
    effect(fn) {
      return fn()
    },
    webServer: {
      register(entry) {
        routes.set(entry.path, entry.handler)
        return () => routes.delete(entry.path)
      },
    },
    tools: {
      register(tool) {
        tools.set(tool.name, tool)
        return () => tools.delete(tool.name)
      },
    },
  }
  apply(ctx)

  check(routes.size === 2, `expected 2 routes, got ${routes.size}`)
  check(tools.has('user_notes_read'), 'user_notes_read must be registered')
  check(tools.has('user_notes_add'), 'user_notes_add must be registered')
  check(tools.has('user_notes_update'), 'user_notes_update must be registered')

  const documentRoute = routes.get('/plugin/sidebar-notes')
  const opsRoute = routes.get('/plugin/sidebar-notes/ops')

  const initial = await callRoute(documentRoute, { method: 'GET' })
  check(initial.status === 200, `GET document must answer 200, got ${initial.status}`)
  check(initial.body?.rev === 0, 'new document must start at rev 0')
  check(Array.isArray(initial.body?.todos) && initial.body.todos.length === 0, 'new document must have no todos')
  check(Array.isArray(initial.body?.notes) && initial.body.notes.length === 0, 'new document must have no notes')

  const added = await callRoute(opsRoute, jsonRequest({ ops: [{ type: 'todo.add', id: 'todo-1', text: 'buy milk' }] }))
  check(added.status === 200, `POST ops must answer 200, got ${added.status}`)
  check(added.body?.document?.todos?.[0]?.text === 'buy milk', 'todo.add must store the todo text')
  check(added.body?.document?.todos?.[0]?.by === 'user', 'browser writes must be stamped as user')
  check(added.body?.document?.rev === 1, 'document revision must increment on write')

  const stored = JSON.parse(await readFile(join(home, 'plugin-data', 'sidebar-notes.json'), 'utf8'))
  check(stored.rev === 1 && stored.todos.length === 1, 'document must be persisted atomically on disk')

  const rejected = await callRoute(opsRoute, jsonRequest({ ops: [{ type: 'todo.explode', id: 'x' }] }))
  check(rejected.status === 400, `unknown operation must answer 400, got ${rejected.status}`)
  check(typeof rejected.body?.error === 'string', 'rejected operation must return an error message')

  const badBody = await callRoute(opsRoute, {
    method: 'POST',
    async *[Symbol.asyncIterator]() {
      yield Buffer.from('this is not json')
    },
  })
  check(badBody.status === 400, `malformed JSON must answer 400, got ${badBody.status}`)

  const read = tools.get('user_notes_read')
  const readResult = await read.execute({}, {})
  check(readResult.text.includes('buy milk'), 'user_notes_read must return the stored todo')

  const addNote = tools.get('user_notes_add')
  const noteResult = await addNote.execute({ kind: 'note', text: 'hello', title: 'Work' }, {})
  check(noteResult.kind === 'note', 'user_notes_add must return the created kind')

  const update = tools.get('user_notes_update')
  const updateResult = await update.execute({ id: 'todo-1', done: true }, {})
  check(updateResult.text.includes('[x]'), 'user_notes_update must report the completed todo')

  const after = await read.execute({}, {})
  check(after.text.includes('Work'), 'user_notes_read must return the agent-written note')

  const wrongMethod = await callRoute(opsRoute, { method: 'GET' })
  check(wrongMethod.status === 405, `GET on the ops route must answer 405, got ${wrongMethod.status}`)

  if (failures.length > 0) {
    console.error(`smoke failed (${failures.length}):`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exitCode = 1
  } else {
    console.log('smoke ok: routes, tools and document storage behave')
  }
} finally {
  await rm(home, { recursive: true, force: true })
}
