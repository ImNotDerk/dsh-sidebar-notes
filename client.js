/**
 * Browser half of the sidebar notes bundle. It contributes two global panels —
 * a todo list and a sticky-note board, each with its own page in the main
 * column and its own row in the left sidebar. Both pages read and write one
 * document through the Host half's route.
 */
window.__ModuleLoader__.load({
  id: 'dsh-sidebar-notes',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace carrying this plugin's own UI copy. */
    const NS = 'sidebar-notes'
    const STATE_URL = '/plugin/sidebar-notes'
    const OPS_URL = '/plugin/sidebar-notes/ops'
    const TODOS_PANEL = 'notes-todos'
    const NOTES_PANEL = 'notes-notes'
    const SAVE_DEBOUNCE_MS = 350
    /** How often a mounted page re-reads the document to pick up agent writes. */
    const REFRESH_INTERVAL_MS = 5000
    const MAX_TODO_LENGTH = 4000
    const MAX_TITLE_LENGTH = 120
    const MAX_NOTE_TEXT_LENGTH = 8000
    /** Longest inlined image the Host accepts, in characters of data URL. */
    const MAX_IMAGE_LENGTH = 4 * 1024 * 1024
    const NOTE_WIDTH = 264
    /** Board grid in pixels: a note's top-left lands on a cell corner. */
    const GRID_SIZE = 24
    /** Failure token readJson raises when the Host route answers with the SPA page. */
    const ROUTE_MISSING = 'sidebar-notes:routeMissing'
    /** Failure token for a Host half older than this Client half. */
    const STALE_HOST = 'sidebar-notes:staleHost'

    /**
     * Sticky-note skins as hue recipes, not fixed colours. `hue` is any CSS
     * colour (usually a semantic theme token) and `tint` is the share of that
     * hue mixed into the active theme's raised surface. The paper, title bar,
     * border and ink below are derived from these at paint time, so a new
     * theme — or the same theme in light and dark — recolours every note
     * without touching this plugin.
     */
    const SKINS = {
      sunshine: { hue: 'var(--dsw-alias-state-warn-primary)', tint: '44%', bar: '50%', name: 'skinSunshine' },
      mint: { hue: 'var(--dsw-alias-state-success-primary)', tint: '42%', bar: '48%', name: 'skinMint' },
      sakura: { hue: 'var(--dsw-alias-state-error-secondary, var(--dsw-alias-state-error-primary))', tint: '42%', bar: '48%', name: 'skinSakura' },
      sky: { hue: 'var(--dsw-alias-button-info-fill)', tint: '42%', bar: '48%', name: 'skinSky' },
      twilight: {
        hue: 'color-mix(in oklch, var(--dsw-alias-button-info-fill) 58%, var(--dsw-alias-state-error-secondary, var(--dsw-alias-state-error-primary)))',
        tint: '46%',
        bar: '52%',
        name: 'skinTwilight',
      },
      sunset: { hue: 'color-mix(in oklch, var(--dsw-alias-state-warn-primary) 58%, var(--dsw-alias-state-error-primary))', tint: '46%', bar: '52%', name: 'skinSunset' },
      graphite: { hue: 'var(--dsw-alias-label-secondary)', tint: '20%', bar: '26%', name: 'skinGraphite' },
      neon: { hue: 'var(--dsw-alias-state-success-secondary, var(--dsw-alias-state-success-primary))', tint: '44%', bar: '44%', name: 'skinNeon' },
      paper: { hue: 'var(--dsw-alias-brand-primary)', tint: '18%', bar: '24%', name: 'skinPaper' },
    }
    const SKIN_IDS = Object.keys(SKINS)

    const zh = {
      remove: '删除',
      retry: '重试',
      loading: '正在读取…',
      loadFailed: '读取失败：{message}',
      routeMissing: 'Host 端数据接口不可用',
      staleHost: 'Host 端版本过旧，请完全退出并重新打开 DSH（⌘Q）',
      saving: '保存中…',
      saveFailed: '保存失败：{message}',
      todosPanel: '待办',
      notesPanel: '便签',
      todosTitle: '待办',
      todosHint: '双击待办即可编辑，勾选表示完成。',
      todosAllDone: '全部完成，没有未办事项。',
      progressLabel: '完成进度',
      progressMeta: '{done}/{total} · 已完成 {percent}%',
      boardAria: '便签板',
      todoPlaceholder: '要做什么？',
      addTodo: '添加',
      todoToggle: '切换完成状态',
      todoEdit: '编辑',
      todosEmpty: '还没有待办，先加一条吧。',
      groupOpen: '未完成',
      groupDone: '已完成',
      clearDone: '清除已完成',
      editHint: '回车保存，Esc 取消',
      agentChip: 'AI',
      agentChipTitle: '由 AI 写入或修改',
      agentChipSession: 'AI 会话 {session}',
      notesTitle: '便签',
      notesIntro: '{count} 张便签 · 拖动标题栏移动，松手对齐网格',
      newNote: '新建便签',
      hideAll: '隐藏全部便签',
      showAll: '显示全部便签',
      notesEmpty: '还没有便签，新建一张吧。',
      notesHidden: '全部便签已隐藏。',
      noteTitlePlaceholder: '未命名便签',
      noteTextPlaceholder: '写点什么…',
      noteSkin: '换皮肤',
      noteCollapse: '收起便签',
      noteExpand: '展开便签',
      noteDelete: '删除便签',
      noteDeleteConfirm: '确认删除？',
      noteImage: '添加图片',
      noteImageReplace: '更换图片',
      noteImageRemove: '移除图片',
      noteRename: '重命名',
      imageTooLarge: '图片太大，请换一张更小的。',
      imageUnsupported: '这个文件不是浏览器能读取的图片。',
      skinSunshine: '经典黄',
      skinMint: '薄荷绿',
      skinSakura: '樱花粉',
      skinSky: '天空蓝',
      skinTwilight: '暮光紫',
      skinSunset: '暖橙日落',
      skinGraphite: '石墨暗夜',
      skinNeon: '霓虹荧光',
      skinPaper: '极简白纸',
    }

    const en = {
      remove: 'Delete',
      retry: 'Retry',
      loading: 'Loading…',
      loadFailed: 'Could not load: {message}',
      routeMissing: 'The Host data route is unavailable',
      staleHost: 'The Host half is out of date — quit and reopen DSH (⌘Q)',
      saving: 'Saving…',
      saveFailed: 'Could not save: {message}',
      todosPanel: 'Todos',
      notesPanel: 'Sticky notes',
      todosTitle: 'Todos',
      todosHint: 'Double-click a todo to edit it; tick it when done.',
      todosAllDone: 'All caught up — nothing open.',
      progressLabel: 'Completion progress',
      progressMeta: '{done}/{total} · {percent}% complete',
      boardAria: 'Sticky note board',
      todoPlaceholder: 'What needs doing?',
      addTodo: 'Add',
      todoToggle: 'Toggle done',
      todoEdit: 'Edit',
      todosEmpty: 'No todos yet — add the first one.',
      groupOpen: 'Open',
      groupDone: 'Completed',
      clearDone: 'Clear completed',
      editHint: 'Enter saves, Escape cancels',
      agentChip: 'AI',
      agentChipTitle: 'Written or changed by the agent',
      agentChipSession: 'Agent session {session}',
      notesTitle: 'Sticky notes',
      notesIntro: '{count} notes · drag a note by its title bar; it snaps to the grid',
      newNote: 'New note',
      hideAll: 'Hide all notes',
      showAll: 'Show all notes',
      notesEmpty: 'No notes yet — add your first sticky note.',
      notesHidden: 'All notes are hidden.',
      noteTitlePlaceholder: 'Untitled note',
      noteTextPlaceholder: 'Write something…',
      noteSkin: 'Change skin',
      noteCollapse: 'Collapse note',
      noteExpand: 'Expand note',
      noteDelete: 'Delete note',
      noteDeleteConfirm: 'Delete?',
      noteImage: 'Add image',
      noteImageReplace: 'Replace image',
      noteImageRemove: 'Remove image',
      noteRename: 'Rename',
      imageTooLarge: 'That image is too large; pick a smaller one.',
      imageUnsupported: 'That file is not an image this browser can read.',
      skinSunshine: 'Classic yellow',
      skinMint: 'Mint',
      skinSakura: 'Sakura pink',
      skinSky: 'Sky blue',
      skinTwilight: 'Twilight purple',
      skinSunset: 'Warm sunset',
      skinGraphite: 'Graphite night',
      skinNeon: 'Neon glow',
      skinPaper: 'Minimal white',
    }

    /*
     * Every rule below derives its colours from the active theme's `--dsw-alias-*`
     * tokens through color-mix(); the plugin owns no palette of its own. The
     * data-dswp-scope attribute keeps the plugin's own controls more specific
     * than a theme's global element rules, because those themes restyle form
     * elements with `!important` and would otherwise repaint note paper, text
     * fields, and checkboxes.
     */
    const STYLES = `
[data-dswp-scope].dswp-page { --dswp-inset: clamp(20px, 4vw, 48px); box-sizing: border-box; display: flex; flex-direction: column; align-items: center; height: 100%; padding: 0 var(--dswp-inset); color: var(--dsw-alias-label-primary); }
[data-dswp-scope] .dswp-page-body { display: flex; flex-direction: column; width: 100%; max-width: 960px; flex: 1; min-height: 0; }
[data-dswp-scope] .dswp-page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex: none; padding: 28px 0 18px; }
[data-platform=darwin] [data-dswp-scope] .dswp-page-head { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)); }
[data-dswp-scope] .dswp-page-heading { min-width: 0; }
[data-dswp-scope] .dswp-page-title { margin: 0; font-size: 22px; font-weight: 600; line-height: 30px; letter-spacing: .01em; }
[data-dswp-scope] .dswp-page-intro { margin: 5px 0 0; font-size: 13px; line-height: 19px; color: var(--dsw-alias-label-secondary); }
[data-dswp-scope] .dswp-page-toolbar { display: flex; align-items: center; gap: 8px; flex: none; flex-wrap: wrap; justify-content: flex-end; }
[data-dswp-scope] .dswp-page-error { margin: 0 0 12px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
[data-dswp-scope] .dswp-page-content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px; padding-bottom: 32px; overflow-y: auto; }

[data-dswp-scope] .dswp-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 13px; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm, 8px); background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 45%, transparent); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; white-space: nowrap; transition: background-color .16s ease, border-color .16s ease; }
[data-dswp-scope] .dswp-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l4); }
[data-dswp-scope] .dswp-button:disabled { opacity: .45; cursor: default; }
[data-dswp-scope] .dswp-button:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 1px; }
[data-dswp-scope] .dswp-button[data-variant=primary] { border-color: transparent; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-weight: 600; }
[data-dswp-scope] .dswp-button[data-variant=primary]:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
[data-dswp-scope] .dswp-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm, 8px); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; cursor: pointer; transition: background-color .15s ease, color .15s ease; }
[data-dswp-scope] .dswp-icon-button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
[data-dswp-scope] .dswp-icon-button:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 1px; }
[data-dswp-scope] .dswp-icon-button[data-danger] { color: var(--dsw-alias-state-error-primary); }
[data-dswp-scope] .dswp-icon-button[data-danger]:hover { background: var(--dsw-alias-interactive-bg-hover-danger); }
[data-dswp-scope] .dswp-icon-button svg { width: 14px; height: 14px; }

/*
 * A raised "paper on the theme's desk" surface: the theme's own layer colours
 * tinted with its accent, blurred against whatever wallpaper or backdrop the
 * host paints behind the page. Every theme therefore gets its own material.
 */
[data-dswp-scope] .dswp-card { position: relative; border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg, 16px); background-color: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 88%, transparent); background-image: linear-gradient(158deg, color-mix(in srgb, var(--dsw-alias-bg-layer-2) 46%, transparent), transparent 62%), radial-gradient(130% 150% at 100% 0%, color-mix(in srgb, var(--dsw-alias-brand-primary) 11%, transparent), transparent 64%); backdrop-filter: blur(16px) saturate(1.15); -webkit-backdrop-filter: blur(16px) saturate(1.15); box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent), 0 20px 50px -32px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 90%, transparent); }

[data-dswp-scope] .dswp-hero { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 16px; padding: 18px 22px 20px; flex: none; }
[data-dswp-scope] .dswp-hero::after { content: ""; position: absolute; top: -70%; right: -12%; width: 54%; height: 200%; pointer-events: none; background: radial-gradient(closest-side, color-mix(in srgb, var(--dsw-alias-brand-primary) 17%, transparent), transparent 72%); }
[data-dswp-scope] .dswp-hero-top { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
[data-dswp-scope] .dswp-metrics { display: flex; align-items: flex-end; gap: 26px; }
[data-dswp-scope] .dswp-metric { display: flex; align-items: baseline; gap: 9px; }
[data-dswp-scope] .dswp-metric-value { font-size: 34px; line-height: 1; font-weight: 600; letter-spacing: -.02em; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary); }
[data-dswp-scope] .dswp-metric[data-primary] .dswp-metric-value { color: var(--dsw-alias-brand-primary); }
[data-dswp-scope] .dswp-metric-label { font-size: 11px; font-weight: 600; line-height: 16px; letter-spacing: .14em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); }
[data-dswp-scope] .dswp-hero-caption { font-size: 12.5px; line-height: 18px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
[data-dswp-scope] .dswp-progress-track { position: relative; height: 9px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); box-shadow: inset 0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 45%, transparent); overflow: hidden; }
[data-dswp-scope] .dswp-progress-track[data-zero]::after { content: ""; position: absolute; top: 50%; left: 1px; width: 7px; height: 7px; border-radius: 999px; corner-shape: round; translate: 0 -50%; background: color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent); }
[data-dswp-scope] .dswp-progress-fill { height: 100%; border-radius: inherit; background-image: linear-gradient(90deg, var(--dsw-alias-brand-primary), var(--dsw-alias-brand-text)); transition: width .4s var(--ds-ease-in-out, ease); }

[data-dswp-scope] .dswp-add-row { display: flex; align-items: center; gap: 10px; flex: none; padding: 7px 7px 7px 14px; transition: border-color .16s ease, box-shadow .16s ease; }
[data-dswp-scope] .dswp-add-row:focus-within { border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, var(--dsw-alias-border-l3)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent), inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
[data-dswp-scope] .dswp-add-glyph { flex: none; display: inline-flex; color: var(--dsw-alias-label-secondary); }
[data-dswp-scope] .dswp-add-glyph svg { width: 16px; height: 16px; }
[data-dswp-scope] .dswp-input:disabled { opacity: .55; }
[data-dswp-scope] .dswp-input { flex: 1; min-width: 0; height: 40px; padding: 0 4px; box-sizing: border-box; color: var(--dsw-alias-label-primary); font-size: 14px; }
[data-dswp-scope] .dswp-add-submit { display: inline-flex; align-items: center; justify-content: center; flex: none; height: 34px; padding: 0 16px; box-sizing: border-box; border: 0; border-radius: var(--dsw-radius-sm, 8px); background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font: inherit; font-size: 13px; font-weight: 600; line-height: 20px; cursor: pointer; transition: background-color .16s ease, opacity .16s ease; }
[data-dswp-scope] .dswp-add-submit:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
[data-dswp-scope] .dswp-add-submit:disabled { opacity: .45; cursor: default; }
[data-dswp-scope] .dswp-add-submit:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }

[data-dswp-scope] .dswp-list { padding: 6px 8px 8px; }
[data-dswp-scope] .dswp-list:last-child:has(.dswp-todo:nth-child(6)) { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
[data-dswp-scope] .dswp-list:last-child:has(.dswp-todo:nth-child(6)) .dswp-todo-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
[data-dswp-scope] .dswp-list-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 8px 6px; }
[data-dswp-scope] .dswp-list-title { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; line-height: 16px; letter-spacing: .14em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); }
[data-dswp-scope] .dswp-count { corner-shape: round; display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; padding: 0 6px; box-sizing: border-box; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 600; line-height: 16px; letter-spacing: 0; font-variant-numeric: tabular-nums; }
[data-dswp-scope] .dswp-todo-list { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
[data-dswp-scope] .dswp-todo { display: flex; align-items: flex-start; gap: 12px; padding: 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm, 8px); transition: background-color .16s ease; }
[data-dswp-scope] .dswp-todo:last-child { border-bottom-color: transparent; }
[data-dswp-scope] .dswp-todo:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
[data-dswp-scope] .dswp-check { position: relative; flex: none; display: inline-flex; margin: 1px 0 0; cursor: pointer; }
[data-dswp-scope] .dswp-check-input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
[data-dswp-scope] .dswp-check-box { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; box-sizing: border-box; border: 1.5px solid var(--dsw-alias-border-l4); border-radius: 6px; background: transparent; color: transparent; transition: background-color .16s ease, border-color .16s ease, color .16s ease; }
[data-dswp-scope] .dswp-check:hover .dswp-check-box { border-color: var(--dsw-alias-brand-primary); }
[data-dswp-scope] .dswp-check-input:checked + .dswp-check-box { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-label-primary-foreground); }
[data-dswp-scope] .dswp-check-box svg { width: 12px; height: 12px; opacity: 0; transform: scale(.55); transition: opacity .14s ease, transform .14s ease; }
[data-dswp-scope] .dswp-check-input:checked + .dswp-check-box svg { opacity: 1; transform: none; }
[data-dswp-scope] .dswp-check-input:focus-visible + .dswp-check-box { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
[data-dswp-scope] .dswp-todo-text { flex: 1; min-width: 0; font-size: 14.5px; line-height: 22px; overflow-wrap: anywhere; }
[data-dswp-scope] .dswp-todo[data-done] .dswp-todo-text { color: var(--dsw-alias-label-secondary); text-decoration: line-through; text-decoration-thickness: 1px; text-decoration-color: color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent); }
[data-dswp-scope] .dswp-agent-chip { corner-shape: round; flex: none; margin-top: 2px; padding: 0 6px; box-sizing: border-box; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 34%, transparent); border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent); color: var(--dsw-alias-label-secondary); font-size: 10px; font-weight: 600; line-height: 16px; letter-spacing: .04em; }
[data-dswp-scope] .dswp-todo-edit { flex: 1; min-width: 0; height: 26px; padding: 0; box-sizing: border-box; color: var(--dsw-alias-label-primary); font-size: 14.5px; line-height: 22px; }
[data-dswp-scope] .dswp-todo-actions { display: flex; align-items: center; gap: 2px; flex: none; opacity: 0; transition: opacity .16s ease; }
[data-dswp-scope] .dswp-todo:hover .dswp-todo-actions, [data-dswp-scope] .dswp-todo:focus-within .dswp-todo-actions { opacity: 1; }
@media (hover: none) { [data-dswp-scope] .dswp-todo-actions { opacity: 1; } }

/*
 * Fields are repainted from scratch: a theme may force a background, border,
 * radius, shadow, font family, or placeholder colour onto every textarea and
 * input with !important, so the reset carries matching !important declarations
 * at higher specificity. Colour and sizing then come from the component rules.
 */
[data-dswp-scope] .dswp-note .dswp-note-text,
[data-dswp-scope] .dswp-note .dswp-note-rename,
[data-dswp-scope] .dswp-add-row .dswp-input,
[data-dswp-scope] .dswp-todo .dswp-todo-edit { background-color: transparent !important; background-image: none !important; border: 0 !important; border-color: transparent !important; border-radius: 0 !important; box-shadow: none !important; font-family: inherit !important; -webkit-text-fill-color: currentColor !important; caret-color: currentColor !important; outline: none; }
[data-dswp-scope] .dswp-note .dswp-note-text:focus,
[data-dswp-scope] .dswp-note .dswp-note-text:focus-visible,
[data-dswp-scope] .dswp-note .dswp-note-rename:focus,
[data-dswp-scope] .dswp-add-row .dswp-input:focus,
[data-dswp-scope] .dswp-add-row .dswp-input:focus-visible,
[data-dswp-scope] .dswp-todo .dswp-todo-edit:focus { border: 0 !important; border-radius: 0 !important; box-shadow: none !important; outline: none; }
[data-dswp-scope] .dswp-note .dswp-note-bar .dswp-note-rename { background-color: color-mix(in srgb, var(--dswp-note-ink) 10%, transparent) !important; border-radius: 6px !important; }
[data-dswp-scope] .dswp-note .dswp-note-text::placeholder { color: var(--dswp-note-ink-soft) !important; opacity: 1; font-style: normal; }
[data-dswp-scope] .dswp-add-row .dswp-input::placeholder { color: var(--dsw-alias-label-secondary) !important; opacity: 1; font-style: normal; }
[data-dswp-scope] .dswp-note .dswp-note-text { caret-color: var(--dswp-note-ink) !important; }
[data-dswp-scope] .dswp-todo .dswp-todo-edit:focus { border-bottom: 1px solid var(--dsw-alias-brand-primary) !important; }

[data-dswp-scope] .dswp-empty { margin: 20px 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
[data-dswp-scope] .dswp-empty-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px 24px; text-align: center; border: 1px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg, 16px); background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 42%, transparent); }
[data-dswp-scope] .dswp-empty-glyph { display: inline-flex; color: var(--dsw-alias-label-secondary); }
[data-dswp-scope] .dswp-empty-glyph svg { width: 28px; height: 28px; }
[data-dswp-scope] .dswp-empty-title { margin: 0; font-size: 14px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-secondary); }
[data-dswp-scope] .dswp-empty-hint { margin: 0; font-size: 12.5px; line-height: 18px; color: var(--dsw-alias-label-secondary); }

[data-dswp-scope].dswp-page--notes .dswp-page-content { gap: 0; }

/*
 * The board is a sheet of the theme's glass over whatever the host paints
 * behind the page, so the wallpaper keeps breathing through it.
 */
[data-dswp-scope] .dswp-board-area { position: relative; flex: 1; min-height: 520px; overflow: auto; border-radius: 20px; border: 1px solid var(--dsw-alias-border-l2); background-color: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 52%, transparent); background-image: radial-gradient(120% 140% at 6% 0%, color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent), transparent 56%); backdrop-filter: blur(12px) saturate(1.18); -webkit-backdrop-filter: blur(12px) saturate(1.18); box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent), 0 24px 60px -36px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 92%, transparent); }
[data-dswp-scope] .dswp-board-area::before { content: ""; position: absolute; top: 0; left: 18px; right: 18px; height: 1px; z-index: 1; pointer-events: none; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent), transparent); }
[data-dswp-scope] .dswp-board { position: relative; width: 100%; height: 100%; min-height: 520px; background-image: radial-gradient(circle, color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent) 1px, transparent 1.2px); background-size: 24px 24px; background-position: -12px -12px; }
[data-dswp-scope] .dswp-board:has(.dswp-note[data-dragging]) { background-image: radial-gradient(circle, color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent) 1px, transparent 1.2px); }
[data-dswp-scope] .dswp-board-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 100%; min-height: 320px; padding: 0 24px; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; text-align: center; }

/*
 * Notes derive paper, title bar, border and soft ink from one hue token, mixed
 * into the theme's raised surface. Text keeps the theme's primary label colour,
 * so contrast holds in every palette without the plugin choosing ink by hand.
 */
[data-dswp-scope] .dswp-note,
[data-dswp-scope] .dswp-skin {
  --dswp-note-base: color-mix(in oklab, var(--dsw-alias-bg-layer-2) 94%, transparent);
  --dswp-note-paper: color-mix(in oklab, var(--dswp-note-hue, var(--dsw-alias-brand-primary)) var(--dswp-note-tint, 22%), var(--dswp-note-base));
  --dswp-note-bar: color-mix(in oklab, var(--dswp-note-hue, var(--dsw-alias-brand-primary)) var(--dswp-note-bar-tint, 32%), var(--dswp-note-base));
  --dswp-note-border: color-mix(in oklab, var(--dswp-note-hue, var(--dswp-alias-brand-primary)) 46%, var(--dsw-alias-border-l3));
  --dswp-note-ink: var(--dsw-alias-label-primary);
  --dswp-note-ink-soft: color-mix(in srgb, var(--dsw-alias-label-primary) 78%, transparent);
}
[data-dswp-scope] .dswp-note { --dswp-note-radius: var(--dsw-radius-lg, 16px); position: absolute; display: flex; flex-direction: column; width: 264px; border-radius: var(--dswp-note-radius); border: 1px solid var(--dswp-note-border); background-color: var(--dswp-note-paper); background-image: linear-gradient(156deg, color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent), transparent 48%), linear-gradient(0deg, color-mix(in srgb, var(--dswp-note-hue, var(--dsw-alias-brand-primary)) 8%, transparent), transparent 42%); color: var(--dswp-note-ink); box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent), 0 16px 38px -22px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 95%, transparent), 0 2px 8px -4px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 55%, transparent); transition: left 90ms var(--ds-ease-in-out, ease), top 90ms var(--ds-ease-in-out, ease), box-shadow .18s ease, translate .18s ease, border-color .18s ease; }
[data-dswp-scope] .dswp-note:hover { translate: 0 -2px; border-color: color-mix(in srgb, var(--dswp-note-hue, var(--dsw-alias-brand-primary)) 44%, var(--dsw-alias-border-l3)); box-shadow: 0 24px 48px -22px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 95%, transparent), 0 3px 10px -4px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 60%, transparent); }
[data-dswp-scope] .dswp-note[data-dragging] { transition: box-shadow .12s ease, translate .12s ease, scale .12s ease; translate: 0 -2px; scale: 1.02; box-shadow: 0 30px 60px -24px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 100%, transparent), 0 6px 18px -6px color-mix(in srgb, var(--dsw-alias-bg-mask-1) 65%, transparent); }
[data-dswp-scope] .dswp-note[data-collapsed] { width: auto; max-width: 260px; border-radius: 999px; corner-shape: round; }
[data-dswp-scope] .dswp-note[data-collapsed] .dswp-note-actions { display: none; }
[data-dswp-scope] .dswp-note[data-collapsed] .dswp-note-body { display: none; }
[data-dswp-scope] .dswp-note[data-collapsed] .dswp-note-bar::after { content: "\\203A"; flex: none; padding: 0 6px 0 2px; color: var(--dswp-note-ink-soft); font-size: 13px; line-height: 1; }
[data-dswp-scope] .dswp-note-bar { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 6px 0 12px; box-sizing: border-box; border-radius: calc(var(--dswp-note-radius, 16px) - 1px) calc(var(--dswp-note-radius, 16px) - 1px) 0 0; background-color: var(--dswp-note-bar); background-image: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent), transparent 72%); border-bottom: 1px solid color-mix(in srgb, var(--dswp-note-ink) 9%, transparent); cursor: grab; touch-action: none; user-select: none; }
[data-dswp-scope] .dswp-note[data-collapsed] .dswp-note-bar { border-radius: 999px; corner-shape: round; border-bottom: 0; }
[data-dswp-scope] .dswp-note-bar:active { cursor: grabbing; }
[data-dswp-scope] .dswp-note-title { flex: 1; min-width: 0; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; font-weight: 600; line-height: 20px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: inherit; }
[data-dswp-scope] .dswp-note-title[data-placeholder] { color: var(--dswp-note-ink-soft); font-weight: 500; }
[data-dswp-scope] .dswp-note-agent { corner-shape: round; flex: none; padding: 0 6px; border-radius: 999px; background: color-mix(in srgb, var(--dswp-note-ink) 14%, transparent); color: var(--dswp-note-ink); font-size: 10px; font-weight: 600; line-height: 16px; }
[data-dswp-scope] .dswp-note-rename { flex: 1; min-width: 0; height: 22px; padding: 0 6px; box-sizing: border-box; color: inherit; font-size: 13px; font-weight: 600; }
[data-dswp-scope] .dswp-note-actions { display: flex; align-items: center; gap: 1px; flex: none; }
[data-dswp-scope] .dswp-note-action { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: color-mix(in srgb, var(--dswp-note-ink) 82%, transparent); font: inherit; font-size: 12px; line-height: 1; cursor: pointer; transition: background-color .14s ease, color .14s ease; }
[data-dswp-scope] .dswp-note-action svg { width: 13px; height: 13px; }
[data-dswp-scope] .dswp-note-action:hover { background: color-mix(in srgb, var(--dswp-note-ink) 12%, transparent); color: var(--dswp-note-ink); }
[data-dswp-scope] .dswp-note-action:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 0; }
[data-dswp-scope] .dswp-note-action[data-danger] { width: auto; padding: 0 7px; background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 22%, transparent); color: var(--dsw-alias-state-error-primary); font-size: 11px; font-weight: 600; }
[data-dswp-scope] .dswp-note-body { display: flex; flex-direction: column; gap: 8px; padding: 9px 12px 12px; }
[data-dswp-scope] .dswp-note-text::-webkit-resizer { background-image: linear-gradient(135deg, transparent 48%, color-mix(in srgb, var(--dswp-note-ink) 42%, transparent) 52%); border-radius: 0 0 7px 0; }
[data-dswp-scope] .dswp-note-text { width: 100%; min-height: 74px; box-sizing: border-box; resize: vertical; padding: 0; color: var(--dswp-note-ink); font-size: 13.5px; line-height: 20px; }
[data-dswp-scope] .dswp-note-image { position: relative; border-radius: 8px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--dswp-note-ink) 12%, transparent); background: color-mix(in srgb, var(--dswp-note-ink) 8%, transparent); }
[data-dswp-scope] .dswp-note-image img { display: block; width: 100%; max-height: 240px; object-fit: cover; cursor: pointer; }
[data-dswp-scope] .dswp-note-image-remove { position: absolute; top: 6px; right: 6px; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 999px; corner-shape: round; background: var(--dsw-alias-bg-mask-3); color: var(--dsw-static-neutral-00); font: inherit; font-size: 13px; line-height: 1; cursor: pointer; }
[data-dswp-scope] .dswp-note-image-remove svg { width: 12px; height: 12px; }
[data-dswp-scope] .dswp-note-error { margin: 0; font-size: 11px; line-height: 16px; color: var(--dsw-alias-state-error-primary); }
[data-dswp-scope] .dswp-skins { position: absolute; top: 38px; right: 6px; z-index: 6; display: grid; grid-template-columns: repeat(3, 30px); gap: 6px; padding: 8px; border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg, 16px); background: var(--dsw-alias-bg-overlay); box-shadow: var(--dsw-shadow-lv3, 0 12px 32px rgba(0, 0, 0, .18)); transform-origin: top right; animation: dswp-pop .15s var(--ds-ease-in-out, ease); }
[data-dswp-scope] .dswp-skin { position: relative; width: 30px; height: 30px; padding: 0; border: 1px solid var(--dswp-note-border); border-radius: 8px; background-color: var(--dswp-note-bar); cursor: pointer; transition: transform .14s ease; }
[data-dswp-scope] .dswp-skin:hover { transform: translateY(-1px); }
[data-dswp-scope] .dswp-skin[data-active] { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
[data-dswp-scope] .dswp-skin[data-active]::after { corner-shape: round; content: "\\2713"; position: absolute; right: -5px; bottom: -5px; display: grid; place-items: center; width: 14px; height: 14px; box-sizing: border-box; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 9px; line-height: 1; }
@keyframes dswp-pop { from { opacity: 0; scale: .97; } }

@media (max-width: 760px) {
  [data-dswp-scope].dswp-page { --dswp-inset: 18px; }
  [data-dswp-scope] .dswp-page-title { overflow-wrap: anywhere; }
  [data-dswp-scope] .dswp-board-area { min-height: 420px; }
  [data-dswp-scope] .dswp-page-head { flex-direction: column; gap: 10px; }
  [data-dswp-scope] .dswp-page-toolbar { justify-content: flex-start; }
  [data-dswp-scope] .dswp-hero-top { align-items: flex-start; flex-direction: column; gap: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  [data-dswp-scope] *, [data-dswp-scope] *::before, [data-dswp-scope] *::after { transition-duration: 1ms !important; animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
  [data-dswp-scope] .dswp-note:hover, [data-dswp-scope] .dswp-note[data-dragging] { translate: 0 0; scale: 1; }
}
@media (prefers-reduced-transparency: reduce) {
  [data-dswp-scope] .dswp-card { background-color: var(--dsw-alias-bg-layer-1); background-image: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
  [data-dswp-scope] .dswp-board-area { background-color: var(--dsw-alias-bg-layer-1); background-image: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
}

`

    /**
     * Draft one random item id.
     * @returns a client-minted id the Host stores verbatim.
     */
    function makeId() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
      return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    }

    /**
     * Turn a transport failure into the text the surfaces show.
     * @param error - whatever the promise rejected with.
     * @returns a short single-line message.
     */
    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    /**
     * Clamp a number into a closed range.
     * @param value - requested value.
     * @param min - lower bound.
     * @param max - upper bound.
     * @returns the clamped value.
     */
    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value))
    }

    /**
     * Round a board coordinate to the nearest grid cell corner.
     * @param value - pixel coordinate.
     * @returns the snapped coordinate.
     */
    function snapToGrid(value) {
      return Math.round(value / GRID_SIZE) * GRID_SIZE
    }

    /**
     * Reduce a decoded document to the fields the surfaces read.
     * @param value - JSON value returned by the Host route.
     * @returns todos, notes, and the board's hidden flag.
     */
    function normalizeDocument(value) {
      const record = value !== null && typeof value === 'object' ? value : {}
      return {
        stale: !('notesHidden' in record),
        rev: typeof record.rev === 'number' && Number.isFinite(record.rev) ? record.rev : -1,
        todos: Array.isArray(record.todos) ? record.todos : [],
        notes: Array.isArray(record.notes) ? record.notes : [],
        notesHidden: record.notesHidden === true,
      }
    }

    /**
     * Present a transport or version failure in the active locale.
     * @param t - the surface's translate seat.
     * @param message - failure message or plugin token.
     * @returns the message to show.
     */
    function describeFailure(t, message) {
      if (message === ROUTE_MISSING) return t('routeMissing')
      if (message === STALE_HOST) return t('staleHost')
      return message
    }

    /**
     * Decode a JSON response, rejecting the SPA fallback page a missing route
     * answers with instead of the document.
     * @param response - fetch response.
     * @returns the decoded JSON value.
     */
    async function readJson(response) {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const type = response.headers.get('content-type') ?? ''
      if (!type.includes('application/json')) throw new Error(ROUTE_MISSING)
      return response.json()
    }

    /**
     * Resize and re-encode a picked image so one note stays small on disk.
     * @param file - image file from a picker, a drop, or the clipboard.
     * @returns the JPEG data URL stored on the note.
     */
    async function compressImage(file) {
      if (!file.type.startsWith('image/')) throw new Error('sidebar-notes:imageUnsupported')
      const bitmap = await createImageBitmap(file).catch(() => { throw new Error('sidebar-notes:imageUnsupported') })
      try {
        for (const [edge, quality] of [[1200, 0.82], [900, 0.7], [640, 0.6]]) {
          const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
          const width = Math.max(1, Math.round(bitmap.width * scale))
          const height = Math.max(1, Math.round(bitmap.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const context = canvas.getContext('2d')
          if (context === null) throw new Error('sidebar-notes:imageUnsupported')
          context.drawImage(bitmap, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          if (dataUrl.length <= MAX_IMAGE_LENGTH) return dataUrl
        }
      } finally {
        if (typeof bitmap.close === 'function') bitmap.close()
      }
      throw new Error('sidebar-notes:imageTooLarge')
    }

    /**
     * Insert this plugin's stylesheet and return its removal.
     * @param css - stylesheet text.
     * @returns disposer removing the style element.
     */
    function insertStyles(css) {
      const element = document.createElement('style')
      element.setAttribute('data-dsh-plugin', 'dsh-sidebar-notes')
      element.textContent = css
      document.head.appendChild(element)
      return () => { element.remove() }
    }

    /**
     * The document store every surface reads. One snapshot object, replaced only
     * when the document changes, so selectors stay referentially stable.
     * @returns the observable source, the load trigger, and the mutators.
     */
    function createNotesStore() {
      const listeners = new Set()
      let state = {
        status: 'idle',
        loadError: '',
        saving: false,
        saveError: '',
        rev: -1,
        todos: [],
        notes: [],
        notesHidden: false,
      }
      let loading = false
      let chain = Promise.resolve()
      let pendingWrites = 0
      let surfaceCount = 0
      let pollTimer

      const publish = (patch) => {
        state = { ...state, ...patch }
        for (const listener of [...listeners]) listener()
      }

      const source = {
        getSnapshot: () => state,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
      }

      const adopt = (document) => {
        publish({
          status: 'ready',
          loadError: '',
          rev: document.rev,
          todos: document.todos,
          notes: document.notes,
          notesHidden: document.notesHidden,
        })
      }

      const fetchDocument = () => fetch(STATE_URL, { headers: { accept: 'application/json' } })
        .then(readJson)
        .then((value) => {
          const document = normalizeDocument(value)
          if (document.stale) throw new Error(STALE_HOST)
          return document
        })

      const refresh = (force) => {
        if (state.status !== 'ready' || pendingWrites > 0) return Promise.resolve()
        return fetchDocument()
          .then((document) => {
            if (force === true || document.rev !== state.rev) adopt(document)
          })
          .catch(() => {})
      }

      // One request in flight at a time keeps the adopted document monotonic,
      // so the Host stays the only writer and a stale snapshot can never
      // overwrite an agent write.
      const enqueue = (ops) => {
        if (state.status !== 'ready') return Promise.resolve()
        pendingWrites += 1
        publish({ saving: true })
        const task = chain.catch(() => {}).then(async () => {
          const response = await fetch(OPS_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ops }),
          })
          if (!response.ok) {
            const text = await response.text().catch(() => '')
            let message = `HTTP ${response.status}`
            try {
              const body = JSON.parse(text)
              if (body !== null && typeof body === 'object' && typeof body.error === 'string') message = body.error
            } catch {
              // The response carried no JSON error body; the status stands in for it.
            }
            throw new Error(message)
          }
          return response.json()
        }).then((payload) => {
          const document = normalizeDocument(payload === null || typeof payload !== 'object' ? {} : payload.document)
          if (!document.stale) adopt(document)
          publish({ saveError: '' })
        }).catch((error) => {
          publish({ saveError: messageOf(error) })
          window.setTimeout(() => { void refresh(true) }, 0)
        }).finally(() => {
          pendingWrites -= 1
          if (pendingWrites === 0) publish({ saving: false })
        })
        chain = task
        return task
      }

      const ensure = () => {
        if (loading || state.status === 'ready') return
        loading = true
        publish({ status: 'loading', loadError: '' })
        fetchDocument()
          .then((document) => {
            loading = false
            adopt(document)
          })
          .catch((error) => {
            loading = false
            publish({ status: 'error', loadError: messageOf(error) })
          })
      }

      const retry = () => {
        if (loading) return
        publish({ status: 'idle', loadError: '' })
        ensure()
      }

      const onFocus = () => { void refresh(false) }
      const onVisibility = () => {
        if (document.visibilityState === 'visible') void refresh(false)
      }
      const startPolling = () => {
        pollTimer = window.setInterval(() => {
          if (document.visibilityState === 'visible') void refresh(false)
        }, REFRESH_INTERVAL_MS)
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onVisibility)
      }
      const stopPolling = () => {
        if (pollTimer !== undefined) window.clearInterval(pollTimer)
        pollTimer = undefined
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onVisibility)
      }

      const acquire = () => {
        surfaceCount += 1
        if (surfaceCount === 1) startPolling()
        void refresh(false)
        return () => {
          surfaceCount -= 1
          if (surfaceCount === 0) stopPolling()
        }
      }

      const actions = {
        ensure,
        retry,
        acquire,
        addTodo: (text) => {
          const trimmed = String(text ?? '').trim()
          if (trimmed === '') return
          void enqueue([{ type: 'todo.add', id: makeId(), text: trimmed }])
        },
        toggleTodo: (id) => {
          const todo = state.todos.find(entry => entry.id === id)
          if (todo === undefined) return
          void enqueue([{ type: 'todo.update', id, done: !todo.done }])
        },
        editTodo: (id, text) => {
          const trimmed = String(text ?? '').trim()
          if (trimmed === '') return
          void enqueue([{ type: 'todo.update', id, text: trimmed }])
        },
        removeTodo: (id) => { void enqueue([{ type: 'todo.remove', id }]) },
        clearDone: () => { void enqueue([{ type: 'todo.clearDone' }]) },
        addNote: (position) => {
          const id = makeId()
          void enqueue([{ type: 'note.add', id, x: Math.round(position.x), y: Math.round(position.y) }])
          return id
        },
        patchNote: (id, patch) => { void enqueue([{ type: 'note.update', id, ...patch }]) },
        removeNote: (id) => { void enqueue([{ type: 'note.remove', id }]) },
        setNotesHidden: (hidden) => { void enqueue([{ type: 'board.hidden', hidden }]) },
      }

      return { source, actions }
    }

    /**
     * The Todos panel glyph.
     * @param props - the panel row's requested square edge.
     * @returns the inline SVG element.
     */
    function TodosPanelIcon(props) {
      const size = props.size ?? 16
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round',
        strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
      },
      h('path', { d: 'M2.6 4.2l1.1 1.1 2-2.1' }),
      h('path', { d: 'M8.2 4.6h5.2' }),
      h('path', { d: 'M2.6 9.4l1.1 1.1 2-2.1' }),
      h('path', { d: 'M8.2 9.8h5.2' }),
      h('path', { d: 'M2.9 13.9h10.2' }))
    }

    /**
     * The sticky-notes panel glyph.
     * @param props - the panel row's requested square edge.
     * @returns the inline SVG element.
     */
    function NotesPanelIcon(props) {
      const size = props.size ?? 16
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round',
        strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
      },
      h('path', { d: 'M3.2 2.6h9.6a1 1 0 0 1 1 1v6.1l-3.5 3.5H3.2a1 1 0 0 1-1-1V3.6a1 1 0 0 1 1-1z' }),
      h('path', { d: 'M13.8 9.7h-2.5a1 1 0 0 0-1 1v2.5' }),
      h('path', { d: 'M5 6.2h6' }),
      h('path', { d: 'M5 8.9h3.4' }))
    }

    /**
     * A stroked glyph that inherits the surrounding text colour.
     * @param props - the viewBox size and the icon's child paths.
     * @returns the inline SVG element.
     */
    function Glyph(props) {
      const size = props.size ?? 14
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
        strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
      }, props.children)
    }

    /** @returns the completion tick used by the todo checkbox. */
    function CheckGlyph() {
      return h(Glyph, null, h('path', { d: 'M3.2 8.4l3.1 3.1 6.5-7' }))
    }

    /** @returns the pencil used to start editing a title or a todo. */
    function PencilGlyph() {
      return h(Glyph, null,
        h('path', { d: 'M2.9 13.1l.7-3 7.2-7.2a1.2 1.2 0 0 1 1.7 0l.6.6a1.2 1.2 0 0 1 0 1.7l-7.2 7.2-3 .7z' }),
        h('path', { d: 'M9.8 3.9l2.3 2.3' }))
    }

    /** @returns the droplet used for the skin picker. */
    function DropletGlyph() {
      return h(Glyph, null, h('path', { d: 'M8 2.3c2.5 2.7 3.9 4.7 3.9 6.5a3.9 3.9 0 1 1-7.8 0c0-1.8 1.4-3.8 3.9-6.5z' }))
    }

    /** @returns the picture frame used for a note image. */
    function PictureGlyph() {
      return h(Glyph, null,
        h('rect', { x: '2.4', y: '3.2', width: '11.2', height: '9.6', rx: '1.6' }),
        h('circle', { cx: '5.9', cy: '6.5', r: '.9' }),
        h('path', { d: 'M3.2 11.4l3-2.7 2.2 2 1.7-1.5 2.7 2.4' }))
    }

    /** @returns the cross used to delete an item. */
    function CrossGlyph() {
      return h(Glyph, null, h('path', { d: 'M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6' }))
    }

    /** @returns the plus used by the add row and empty states. */
    function PlusGlyph() {
      return h(Glyph, null, h('path', { d: 'M8 3.2v9.6M3.2 8h9.6' }))
    }

    /**
     * Page chrome shared by the two full pages.
     * @param props - title, intro line, toolbar rows, page content, and an optional modifier class.
     * @returns the page element.
     */
    function Page(props) {
      return h('div', {
        className: props.modifier === undefined ? 'dswp-page' : `dswp-page ${props.modifier}`,
        'data-dswp-scope': '',
      },
        h('div', { className: 'dswp-page-body' },
          h('header', { className: 'dswp-page-head' },
            h('div', { className: 'dswp-page-heading' },
              h('h1', { className: 'dswp-page-title' }, props.title),
              props.intro === '' ? null : h('p', { className: 'dswp-page-intro' }, props.intro)),
            h('div', { className: 'dswp-page-toolbar' }, props.toolbar)),
          props.error === '' ? null : h('p', { className: 'dswp-page-error', role: 'alert' }, props.error),
          h('div', { className: 'dswp-page-content' }, props.children)))
    }

    /**
     * Saved-state line shared by the pages: an error, a pending save, or nothing.
     * @param props - the store snapshot's save fields and the translate seat.
     * @returns the message, or '' when there is nothing to say.
     */
    function saveNote(props) {
      const t = props.t
      if (props.saveError !== '') return t('saveFailed', { message: describeFailure(t, props.saveError) })
      return ''
    }

    /**
     * One editable todo row.
     * @param props - the todo, the mutators, and the translate seat.
     * @returns the list row element.
     */
    function TodoRow(props) {
      const todo = props.todo
      const t = props.t
      const [editing, setEditing] = React.useState(false)
      const [draft, setDraft] = React.useState(todo.text)
      const cancelled = React.useRef(false)

      const commit = () => {
        if (cancelled.current) {
          cancelled.current = false
          return
        }
        setEditing(false)
        props.onEdit(todo.id, draft)
      }

      return h('li', { className: 'dswp-todo', 'data-done': todo.done ? 'true' : undefined },
        h('label', { className: 'dswp-check' },
          h('input', {
            type: 'checkbox',
            className: 'dswp-check-input',
            checked: todo.done === true,
            'aria-label': t('todoToggle'),
            onChange: () => { props.onToggle(todo.id) },
          }),
          h('span', { className: 'dswp-check-box', 'aria-hidden': 'true' }, h(CheckGlyph))),
        editing
          ? h('input', {
            className: 'dswp-todo-edit',
            value: draft,
            autoFocus: true,
            'aria-label': t('todoEdit'),
            maxLength: MAX_TODO_LENGTH,
            onChange: event => setDraft(event.target.value),
            onBlur: commit,
            onKeyDown: (event) => {
              if (event.key === 'Enter') commit()
              if (event.key === 'Escape') {
                cancelled.current = true
                setDraft(todo.text)
                setEditing(false)
              }
            },
          })
          : h('span', {
            className: 'dswp-todo-text',
            onDoubleClick: () => {
              setDraft(todo.text)
              setEditing(true)
            },
          }, todo.text),
        !editing && todo.by === 'agent'
          ? h('span', {
            className: 'dswp-agent-chip',
            title: todo.session === null || todo.session === undefined
              ? t('agentChipTitle')
              : t('agentChipSession', { session: todo.session }),
          }, t('agentChip'))
          : null,
        h('div', { className: 'dswp-todo-actions' },
          editing
            ? null
            : h('button', {
              type: 'button',
              className: 'dswp-icon-button',
              'aria-label': t('todoEdit'),
              title: t('editHint'),
              onClick: () => {
                setDraft(todo.text)
                setEditing(true)
              },
            }, h(PencilGlyph)),
          h('button', {
            type: 'button',
            className: 'dswp-icon-button',
            'data-danger': 'true',
            'aria-label': t('remove'),
            onClick: () => { props.onRemove(todo.id) },
          }, h(CrossGlyph))))
    }

    /**
     * The Todos page: add, edit, complete, delete, and clear completed todos.
     * @param props - the store snapshot, the mutators, and the translate seat.
     * @returns the page element.
     */
    function TodosPage(props) {
      const t = props.t
      const state = props.useNotes(snapshot => snapshot)
      const [draft, setDraft] = React.useState('')
      React.useEffect(() => { props.ensure() }, [props.ensure])
      React.useEffect(() => props.acquire(), [props.acquire])

      const open = state.todos.filter(todo => !todo.done)
      const done = state.todos.filter(todo => todo.done)
      const total = open.length + done.length
      const percent = total === 0 ? 0 : Math.round((done.length / total) * 100)
      const error = saveNote({ t, saveError: state.saveError })
      const ready = state.status === 'ready'

      const add = (event) => {
        event.preventDefault()
        if (draft.trim() === '') return
        props.addTodo(draft)
        setDraft('')
      }

      const row = todo => h(TodoRow, {
        key: todo.id,
        todo,
        t,
        onToggle: props.toggleTodo,
        onEdit: props.editTodo,
        onRemove: props.removeTodo,
      })

      const listCard = (key, label, count, rows) => h('section', { key, className: 'dswp-card dswp-list' },
        h('header', { className: 'dswp-list-head' },
          h('span', { className: 'dswp-list-title' }, label, h('span', { className: 'dswp-count' }, String(count)))),
        h('ul', { className: 'dswp-todo-list' }, rows))

      return Page({
        title: t('todosTitle'),
        intro: t('todosHint') + (state.saving ? ` \u00b7 ${t('saving')}` : ''),
        error,
        toolbar: [
          h('button', {
            key: 'clear',
            type: 'button',
            className: 'dswp-button',
            disabled: done.length === 0,
            onClick: () => { props.clearDone() },
          }, t('clearDone')),
        ],
        children: state.status === 'loading' || state.status === 'idle'
          ? h('p', { className: 'dswp-empty' }, t('loading'))
          : state.status === 'error'
            ? h('div', { className: 'dswp-empty-card' },
              h('span', { className: 'dswp-empty-glyph' }, h(TodosPanelIcon, { size: 28 })),
              h('p', { className: 'dswp-empty-title' }, t('loadFailed', { message: describeFailure(t, state.loadError) })),
              h('button', { type: 'button', className: 'dswp-button', onClick: () => { props.retry() } }, t('retry')))
            : [
              h('section', {
                key: 'progress',
                className: 'dswp-card dswp-hero',
                'aria-label': t('progressLabel'),
              },
              h('div', { className: 'dswp-hero-top' },
                h('div', { className: 'dswp-metrics' },
                  h('div', { className: 'dswp-metric', 'data-primary': 'true' },
                    h('span', { className: 'dswp-metric-value' }, String(open.length)),
                    h('span', { className: 'dswp-metric-label' }, t('groupOpen'))),
                  h('div', { className: 'dswp-metric' },
                    h('span', { className: 'dswp-metric-value' }, String(done.length)),
                    h('span', { className: 'dswp-metric-label' }, t('groupDone')))),
                h('span', { className: 'dswp-hero-caption' },
                  t('progressMeta', { done: String(done.length), total: String(total), percent: String(percent) }))),
              h('div', {
                className: 'dswp-progress-track',
                role: 'progressbar',
                'data-zero': total > 0 && percent === 0 ? 'true' : undefined,
                'aria-label': t('progressLabel'),
                'aria-valuemin': 0,
                'aria-valuemax': Math.max(total, 1),
                'aria-valuenow': done.length,
                'aria-valuetext': t('progressMeta', { done: String(done.length), total: String(total), percent: String(percent) }),
              }, h('div', { className: 'dswp-progress-fill', style: { width: `${percent}%` } }))),
              h('form', { key: 'add', className: 'dswp-card dswp-add-row', onSubmit: add },
                h('span', { className: 'dswp-add-glyph' }, h(PlusGlyph)),
                h('input', {
                  className: 'dswp-input',
                  value: draft,
                  placeholder: t('todoPlaceholder'),
                  'aria-label': t('todoPlaceholder'),
                  maxLength: MAX_TODO_LENGTH,
                  disabled: !ready,
                  onChange: event => setDraft(event.target.value),
                }),
                h('button', {
                  type: 'submit',
                  className: 'dswp-add-submit',
                  disabled: !ready,
                }, t('addTodo'))),
              state.todos.length === 0
                ? h('div', { key: 'empty', className: 'dswp-empty-card' },
                  h('span', { className: 'dswp-empty-glyph' }, h(TodosPanelIcon, { size: 28 })),
                  h('p', { className: 'dswp-empty-title' }, t('todosEmpty')),
                  h('p', { className: 'dswp-empty-hint' }, t('todosHint')))
                : null,
              open.length > 0 ? listCard('open', t('groupOpen'), open.length, open.map(row)) : null,
              total > 0 && open.length === 0
                ? h('div', { key: 'alldone', className: 'dswp-empty-card' },
                  h('span', { className: 'dswp-empty-glyph' }, h(CheckGlyph)),
                  h('p', { className: 'dswp-empty-title' }, t('todosAllDone')))
                : null,
              done.length > 0 ? listCard('done', t('groupDone'), done.length, done.map(row)) : null,
            ],
      })
    }

    /**
     * One sticky note: draggable, titled, skinnable, collapsible, and optional
     * one inlined image.
     * @param props - the stored note, the mutators, the board ref, and the translate seat.
     * @returns the note element.
     */
    function NoteCard(props) {
      const note = props.note
      const t = props.t
      const actions = props.actions
      const skin = SKINS[note.skin] ?? SKINS.sunshine
      const noteX = Number.isFinite(note.x) ? note.x : 0
      const noteY = Number.isFinite(note.y) ? note.y : 0
      const noteTitle = typeof note.title === 'string' ? note.title : ''
      const noteText = typeof note.text === 'string' ? note.text : ''
      const cardRef = React.useRef(null)
      const fileRef = React.useRef(null)
      const deleteTimer = React.useRef(undefined)
      const [offset, setOffset] = React.useState(null)
      const [pending, setPending] = React.useState(null)
      const [dragging, setDragging] = React.useState(false)
      const [renaming, setRenaming] = React.useState(false)
      const [titleDraft, setTitleDraft] = React.useState(noteTitle)
      const [skinsOpen, setSkinsOpen] = React.useState(false)
      const [confirming, setConfirming] = React.useState(false)
      const [error, setError] = React.useState('')
      const [textDraft, setTextDraft] = React.useState(null)
      const textTimer = React.useRef(undefined)
      const textPending = React.useRef(null)
      const cancelRename = React.useRef(false)

      React.useEffect(() => {
        if (props.focus) {
          setTitleDraft(noteTitle)
          setRenaming(true)
        }
      }, [])

      React.useEffect(() => () => {
        if (deleteTimer.current !== undefined) window.clearTimeout(deleteTimer.current)
        if (textTimer.current !== undefined) window.clearTimeout(textTimer.current)
      }, [])

      // A dropped note keeps rendering at its new cell until the Host returns
      // the stored position; otherwise the offset reset would snap it back to
      // the old cell and the adopt would animate it forward again (a bounce).
      React.useEffect(() => {
        if (pending === null) return
        if (noteX === pending.x && noteY === pending.y) setPending(null)
      }, [noteX, noteY, pending])

      React.useEffect(() => {
        if (pending === null || props.saveError === '') return undefined
        setPending(null)
        return undefined
      }, [props.saveError, pending])

      React.useEffect(() => {
        if (pending === null) return undefined
        const timer = window.setTimeout(() => { setPending(null) }, 5000)
        return () => { window.clearTimeout(timer) }
      }, [pending])

      // The stored text catching up with the draft ends the local edit, so a
      // round trip never scrolls the caret or shows the older body back.
      React.useEffect(() => {
        if (textDraft !== null && textDraft === noteText) {
          textPending.current = null
          setTextDraft(null)
        }
      }, [noteText, textDraft])

      const flushText = () => {
        if (textTimer.current !== undefined) window.clearTimeout(textTimer.current)
        textTimer.current = undefined
        const text = textPending.current
        textPending.current = null
        if (text !== null) actions.patchNote(note.id, { text })
      }

      const editText = (text) => {
        setTextDraft(text)
        textPending.current = text
        if (textTimer.current !== undefined) window.clearTimeout(textTimer.current)
        textTimer.current = window.setTimeout(flushText, SAVE_DEBOUNCE_MS)
      }

      React.useEffect(() => {
        if (!skinsOpen) return undefined
        const close = (event) => {
          if (cardRef.current !== null && event.target instanceof Node && cardRef.current.contains(event.target)) return
          setSkinsOpen(false)
        }
        document.addEventListener('pointerdown', close, true)
        return () => { document.removeEventListener('pointerdown', close, true) }
      }, [skinsOpen])

      const described = (message) => {
        if (message === 'sidebar-notes:imageTooLarge') return t('imageTooLarge')
        if (message === 'sidebar-notes:imageUnsupported') return t('imageUnsupported')
        return message
      }

      const applyFile = (file) => {
        setError('')
        compressImage(file)
          .then(dataUrl => actions.patchNote(note.id, { image: dataUrl }))
          .catch((failure) => { setError(described(messageOf(failure))) })
      }

      const startDrag = (event) => {
        if (event.button !== 0) return
        if (event.target instanceof Element && event.target.closest('[data-no-drag]') !== null) return
        const board = props.boardRef.current
        if (board === null) return
        event.preventDefault()
        const startX = event.clientX
        const startY = event.clientY
        const originX = pending === null ? noteX : pending.x
        const originY = pending === null ? noteY : pending.y
        setDragging(true)
        const move = (moveEvent) => {
          setOffset({ dx: moveEvent.clientX - startX, dy: moveEvent.clientY - startY })
        }
        const up = (upEvent) => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          setDragging(false)
          setOffset(null)
          const dx = upEvent.clientX - startX
          const dy = upEvent.clientY - startY
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
            actions.patchNote(note.id, { collapsed: !note.collapsed })
            return
          }
          const maxX = Math.max(0, board.clientWidth - NOTE_WIDTH - 8)
          const maxY = Math.max(0, board.clientHeight - 60)
          const x = Math.round(clamp(snapToGrid(originX + dx), 0, maxX))
          const y = Math.round(clamp(snapToGrid(originY + dy), 0, maxY))
          setPending({ x, y })
          actions.patchNote(note.id, { x, y })
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }

      const requestDelete = () => {
        if (!confirming) {
          setConfirming(true)
          deleteTimer.current = window.setTimeout(() => { setConfirming(false) }, 3000)
          return
        }
        if (deleteTimer.current !== undefined) window.clearTimeout(deleteTimer.current)
        actions.removeNote(note.id)
      }

      const saveTitle = () => {
        if (cancelRename.current) {
          cancelRename.current = false
          return
        }
        setRenaming(false)
        actions.patchNote(note.id, { title: titleDraft.trim().slice(0, MAX_TITLE_LENGTH) })
      }

      return h('article', {
        ref: cardRef,
        className: 'dswp-note',
        style: {
          '--dswp-note-hue': skin.hue,
          '--dswp-note-tint': skin.tint,
          '--dswp-note-bar-tint': skin.bar,
          left: `${(pending === null ? noteX : pending.x) + (offset?.dx ?? 0)}px`,
          top: `${(pending === null ? noteY : pending.y) + (offset?.dy ?? 0)}px`,
          zIndex: dragging ? 8 : undefined,
        },
        'data-collapsed': note.collapsed ? 'true' : undefined,
        'data-dragging': dragging ? 'true' : undefined,
      },
      h('header', { className: 'dswp-note-bar', onPointerDown: startDrag },
        renaming
          ? h('input', {
            className: 'dswp-note-rename',
            value: titleDraft,
            autoFocus: true,
            'data-no-drag': true,
            maxLength: MAX_TITLE_LENGTH,
            placeholder: t('noteTitlePlaceholder'),
            'aria-label': t('noteRename'),
            onChange: event => setTitleDraft(event.target.value),
            onBlur: saveTitle,
            onKeyDown: (event) => {
              if (event.key === 'Enter') saveTitle()
              if (event.key === 'Escape') {
                cancelRename.current = true
                setTitleDraft(noteTitle)
                setRenaming(false)
              }
            },
          })
          : h('button', {
            type: 'button',
            className: 'dswp-note-title',
            'data-placeholder': noteTitle === '' ? 'true' : undefined,
            title: note.collapsed ? t('noteExpand') : t('noteCollapse'),
            onClick: (event) => {
              // Pointer clicks are decided by the drag handler (a press without
              // movement toggles); this arm serves keyboard activation only.
              if (event.detail !== 0) return
              actions.patchNote(note.id, { collapsed: !note.collapsed })
            },
          }, noteTitle === '' ? t('noteTitlePlaceholder') : noteTitle),
        note.by === 'agent'
          ? h('span', {
            className: 'dswp-note-agent',
            title: note.session === null || note.session === undefined
              ? t('agentChipTitle')
              : t('agentChipSession', { session: note.session }),
          }, t('agentChip'))
          : null,
        h('div', { className: 'dswp-note-actions', 'data-no-drag': true },
          h('button', {
            type: 'button',
            className: 'dswp-note-action',
            'aria-label': t('noteRename'),
            onClick: () => {
              setTitleDraft(noteTitle)
              setRenaming(value => !value)
            },
          }, h(PencilGlyph)),
          h('button', {
            type: 'button',
            className: 'dswp-note-action',
            'aria-label': t('noteSkin'),
            'aria-expanded': skinsOpen,
            onClick: () => { setSkinsOpen(value => !value) },
          }, h(DropletGlyph)),
          h('button', {
            type: 'button',
            className: 'dswp-note-action',
            'aria-label': note.image === null ? t('noteImage') : t('noteImageReplace'),
            onClick: () => { fileRef.current?.click() },
          }, h(PictureGlyph)),
          note.collapsed
            ? null
            : h('button', {
              type: 'button',
              className: 'dswp-note-action',
              'aria-label': t('noteDelete'),
              'data-danger': confirming ? 'true' : undefined,
              onClick: requestDelete,
            }, confirming ? t('noteDeleteConfirm') : h(CrossGlyph)))),
      note.collapsed
        ? null
        : h('div', { className: 'dswp-note-body' },
          note.image === null
            ? null
            : h('div', { className: 'dswp-note-image' },
              h('img', {
                src: note.image,
                alt: '',
                onClick: () => { fileRef.current?.click() },
              }),
              h('button', {
                type: 'button',
                className: 'dswp-note-image-remove',
                'aria-label': t('noteImageRemove'),
                onClick: () => { actions.patchNote(note.id, { image: null }) },
              }, h(CrossGlyph))),
          h('textarea', {
            className: 'dswp-note-text',
            value: textDraft ?? noteText,
            rows: Math.min(14, Math.max(3, (textDraft ?? noteText).split('\n').length + 1)),
            maxLength: MAX_NOTE_TEXT_LENGTH,
            placeholder: t('noteTextPlaceholder'),
            'aria-label': t('noteTextPlaceholder'),
            onChange: event => editText(event.target.value),
            onBlur: flushText,
            onDragOver: (event) => {
              if (event.dataTransfer !== null && Array.from(event.dataTransfer.types).includes('Files')) event.preventDefault()
            },
            onDrop: (event) => {
              const file = event.dataTransfer?.files?.[0]
              if (file === undefined) return
              event.preventDefault()
              applyFile(file)
            },
            onPaste: (event) => {
              const file = Array.from(event.clipboardData?.files ?? []).find(entry => entry.type.startsWith('image/'))
              if (file === undefined) return
              event.preventDefault()
              applyFile(file)
            },
          }),
          error === '' ? null : h('p', { className: 'dswp-note-error', role: 'alert' }, error)),
      skinsOpen
        ? h('div', { className: 'dswp-skins', 'data-no-drag': true },
          SKIN_IDS.map(id => h('button', {
            key: id,
            type: 'button',
            className: 'dswp-skin',
            'aria-pressed': note.skin === id,
            style: {
              '--dswp-note-hue': SKINS[id].hue,
              '--dswp-note-tint': SKINS[id].tint,
              '--dswp-note-bar-tint': SKINS[id].bar,
            },
            'data-active': note.skin === id ? 'true' : undefined,
            'aria-label': t(SKINS[id].name),
            title: t(SKINS[id].name),
            onClick: () => {
              actions.patchNote(note.id, { skin: id })
              setSkinsOpen(false)
            },
          })))
        : null,
      h('input', {
        ref: fileRef,
        type: 'file',
        accept: 'image/*',
        hidden: true,
        onChange: (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file !== undefined) applyFile(file)
        },
      }))
    }

    /**
     * The Sticky notes page: a board of draggable, per-note skinned notes.
     * @param props - the store snapshot, the mutators, and the translate seat.
     * @returns the page element.
     */
    function StickyNotesPage(props) {
      const t = props.t
      const state = props.useNotes(snapshot => snapshot)
      const boardRef = React.useRef(null)
      const [focusId, setFocusId] = React.useState('')
      React.useEffect(() => { props.ensure() }, [props.ensure])
      React.useEffect(() => props.acquire(), [props.acquire])

      const error = saveNote({ t, saveError: state.saveError })

      const addNote = () => {
        const board = boardRef.current
        const width = board === null ? 520 : board.clientWidth
        const count = state.notes.length
        const x = clamp(snapToGrid(24 + (count % 6) * 30), 0, Math.max(0, width - NOTE_WIDTH - 8))
        const y = snapToGrid(24 + (count % 6) * 26)
        setFocusId(props.addNote({ x, y }))
      }

      return Page({
        title: t('notesTitle'),
        intro: t('notesIntro', { count: String(state.notes.length) })
          + (state.saving ? ` \u00b7 ${t('saving')}` : ''),
        modifier: 'dswp-page--notes',
        error,
        toolbar: [
          h('button', {
            key: 'hide',
            type: 'button',
            className: 'dswp-button',
            disabled: state.status !== 'ready',
            onClick: () => { props.setNotesHidden(!state.notesHidden) },
          }, state.notesHidden ? t('showAll') : t('hideAll')),
          h('button', {
            key: 'new',
            type: 'button',
            className: 'dswp-button',
            'data-variant': 'primary',
            disabled: state.status !== 'ready',
            onClick: addNote,
          }, t('newNote')),
        ],
        children: state.status === 'loading' || state.status === 'idle'
          ? h('p', { className: 'dswp-empty' }, t('loading'))
          : state.status === 'error'
            ? h('div', { className: 'dswp-empty-card' },
              h('span', { className: 'dswp-empty-glyph' }, h(NotesPanelIcon, { size: 28 })),
              h('p', { className: 'dswp-empty-title' }, t('loadFailed', { message: describeFailure(t, state.loadError) })),
              h('button', { type: 'button', className: 'dswp-button', onClick: () => { props.retry() } }, t('retry')))
            : h('div', { className: 'dswp-board-area', role: 'region', 'aria-label': t('boardAria') },
              h('div', { ref: boardRef, className: 'dswp-board' },
                state.notes.length === 0
                  ? h('div', { className: 'dswp-board-empty' },
                    h('span', { className: 'dswp-empty-glyph' }, h(NotesPanelIcon, { size: 30 })),
                    h('p', { className: 'dswp-empty-title' }, t('notesEmpty')),
                    h('p', { className: 'dswp-empty-hint' }, t('notesIntro', { count: String(state.notes.length) })))
                  : state.notesHidden
                    ? h('div', { className: 'dswp-board-empty' },
                      h('span', { className: 'dswp-empty-glyph' }, h(NotesPanelIcon, { size: 30 })),
                      h('p', { className: 'dswp-empty-title' }, t('notesHidden')),
                      h('button', {
                        type: 'button',
                        className: 'dswp-button',
                        onClick: () => { props.setNotesHidden(false) },
                      }, t('showAll')))
                    : state.notes.map(note => h(NoteCard, {
                      key: note.id,
                      note,
                      t,
                      actions: props,
                      boardRef,
                      saveError: state.saveError,
                      focus: note.id === focusId,
                    })))),
      })
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        const store = createNotesStore()
        const face = () => ({ hooks: { notes: store.source }, ...store.actions })

        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'sidebar-notes: dictionaries')
        ctx.effect(() => insertStyles(STYLES), 'sidebar-notes: styles')

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: TODOS_PANEL,
          locale: NS,
          inject: face,
        }, TodosPage)), 'sidebar-notes: todos page')

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: NOTES_PANEL,
          locale: NS,
          inject: face,
        }, StickyNotesPage)), 'sidebar-notes: notes page')

        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: TODOS_PANEL,
          order: 20,
          label: () => t('todosPanel'),
          locale: NS,
          inject: face,
        }, TodosPanelIcon)), 'sidebar-notes: todos panel entry')

        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: NOTES_PANEL,
          order: 30,
          label: () => t('notesPanel'),
          locale: NS,
          inject: face,
        }, NotesPanelIcon)), 'sidebar-notes: notes panel entry')

      },
    }
  },
})
