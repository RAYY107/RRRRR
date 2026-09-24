// Evora ID — NUI entry point
// Receives messages from client/editor.lua and switches between the
// editor (live preview on the real character) and management views.

import { S, emit } from './store.js';
import { post } from './nui.js';
import { initFonts } from '../core/fonts.js';
import { initAssets } from '../core/render.js';
import { complete, freshDesign } from './schema.js';
import { createEditor } from './editor/editor.js';
import { createManager } from './manager/manager.js';
import { closePopover, closeTopModal } from './ui.js';
import { hideTip } from './dom.js';
import { clone } from '../core/util.js';

const appEl = document.getElementById('app');
let editor = null;
let manager = null;

const app = {
  close() {
    hideAll();
    post('close');
  },
  backToManager(page) {
    post('stage', { active: false });
    editor.hide();
    S.target = null;
    S.displayId = S.session?.serverId || S.displayId;
    showView('manager');
    manager.open(page);
  },
  managerSettings: () => S.session?.settings || {},
  presetsUpdated(data) {
    if (data?.presets) {
      S.presets = data.presets;
      S.presetVersion = data.presetVersion;
      emit('presets');
    }
  },
  openPlayerEditor(target, design) {
    S.displayId = target.serverId || S.session?.serverId || 0;
    showView('editor');
    const start = design ? complete(clone(design)) : complete(clone(S.session?.defaultDesign || freshDesign()));
    editor.open({ design: start, baseline: design || null, target });
  },
  openPresetEditor(target, design) {
    S.displayId = S.session?.serverId || 0;
    showView('editor');
    editor.open({ design: complete(clone(design || freshDesign())), baseline: null, target });
  },
};

function showView(view) {
  S.view = view;
  appEl.classList.remove('closed');
  editor.el.classList.toggle('hidden', view !== 'editor');
  manager.el.classList.toggle('hidden', view !== 'manager');
}

function hideAll() {
  closePopover();
  hideTip();
  if (editor) editor.hide();
  S.view = null;
  appEl.classList.add('closed');
}

function boot(data) {
  S.boot = data;
  initFonts(data.fonts, data.fontFallback, 'fonts/');
  initAssets(data.assets, '');
  if (!editor) {
    editor = createEditor(app);
    manager = createManager(app);
    appEl.append(editor.el, manager.el);
  }
}

function open(mode, data) {
  if (!S.boot) return;
  S.mode = mode;
  S.session = data;
  if (data.presets) {
    S.presets = data.presets;
    S.presetVersion = data.presetVersion;
  }
  S.displayId = data.serverId;
  S.target = null;
  if (mode === 'manage') {
    showView('manager');
    manager.open('players');
    return;
  }
  const start = data.design || data.defaultDesign || freshDesign();
  showView('editor');
  editor.open({ design: complete(clone(start)), baseline: data.design || null, target: null });
}

window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || typeof m !== 'object') return;
  switch (m.action) {
    case 'boot': boot(m.data); break;
    case 'open': open(m.mode, m.data || {}); break;
    case 'anchor': S.anchor = m.data; emit('anchor'); break;
    case 'close': hideAll(); break;
    default: break;
  }
});

// Escape in the management view (the editor handles its own keys)
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || S.view !== 'manager') return;
  if (closeTopModal()) return;
  app.close();
});

appEl.classList.add('closed');
post('nuiReady');
