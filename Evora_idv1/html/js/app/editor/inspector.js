// Evora ID — inspector: tab rail + contextual panel + save footer

import { h, ic, clear, tooltip } from '../dom.js';
import { S, on, setUI, isAdvanced } from '../store.js';
import { panelCtx } from '../controls.js';
import { T } from '../i18n.js';
import text from './panels/text.js';
import font from './panels/font.js';
import colors from './panels/colors.js';
import gradient from './panels/gradient.js';
import effect from './panels/effect.js';
import image from './panels/image.js';
import position from './panels/position.js';
import shadow from './panels/shadow.js';
import outline from './panels/outline.js';
import chars from './panels/chars.js';
import layers from './panels/layers.js';
import voice from './panels/voice.js';

export const PANELS = [text, font, colors, gradient, effect, image, voice, position, shadow, outline, chars, layers];

export function createInspector({ head, foot }) {
  const tabs = h('div.tabs');
  const panel = h('div.panel');
  const el = h('aside.inspector.glass', head, tabs, panel, foot);
  let ctx = panelCtx();
  let current = null;
  let key = null;

  const visible = () => PANELS.filter((p) => !p.adv || isAdvanced());

  const renderTabs = () => {
    clear(tabs);
    for (const p of visible()) {
      const b = h('button.tab', { type: 'button', class: p.id === S.ui.tab ? 'active' : '', onClick: () => setUI({ tab: p.id }) }, ic(p.icon), h('span', T.tabs[p.id]));
      tooltip(b, T.tabs[p.id]);
      tabs.appendChild(b);
    }
  };

  const build = () => {
    const list = visible();
    current = list.find((p) => p.id === S.ui.tab) || list[0];
    if (current.id !== S.ui.tab) S.ui.tab = current.id;
    const scroll = panel.scrollTop;
    clear(panel);
    ctx = panelCtx();
    key = current.key ? current.key() : '';
    const content = current.build(ctx, () => { key = null; refresh({}); });
    [content].flat(Infinity).forEach((c) => { if (c) panel.appendChild(c); });
    panel.scrollTop = scroll;
  };

  const refresh = (info = {}) => {
    if (!S.design) return;
    // never rebuild under the user's pointer while they drag a control
    if (info.live) { ctx.update(); return; }
    const k = current && current.key ? current.key() : '';
    if (!current || k !== key || info.rebuild) build();
    else ctx.update();
  };

  on((kind, info) => {
    if (S.view !== 'editor') return;
    if (kind === 'design') refresh(info);
    if (kind === 'history') refresh({});
    if (kind === 'ui') {
      if ('level' in info) { renderTabs(); build(); return; }
      if ('tab' in info) {
        // opening the voice tab shows the talking state on the live preview
        if (info.tab === 'voice' && !S.ui.previewTalk) setTimeout(() => setUI({ previewTalk: true }), 0);
        renderTabs(); panel.scrollTop = 0; build(); return;
      }
      refresh({});
    }
  });

  return {
    el,
    mount() { renderTabs(); build(); },
    rebuild: () => build(),
  };
}
