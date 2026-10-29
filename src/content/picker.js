// Paste picker UI. Lives in a closed Shadow DOM so page CSS cannot touch it
// and it never takes keyboard focus away from the field being edited.
// Saved text is only ever rendered with textContent.

const CopyLoadPicker = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEWPORT_MARGIN = 8;
  const ANCHOR_GAP = 6;
  const MAX_Z_INDEX = '2147483647';
  const PIN_PATH = 'M12 17v5M9 3h6l-1 7 3 3v2H7v-2l3-3z';

  const STYLE = `
    :host { all: initial; }
    .panel {
      position: fixed; width: 340px; max-width: calc(100vw - 16px); box-sizing: border-box;
      background: var(--bg); color: var(--fg); border: 1px solid var(--border);
      border-radius: 10px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
      font: 13px/1.4 system-ui, 'Segoe UI', sans-serif; overflow: hidden;
    }
    .panel[data-theme='dark'] {
      --bg: #1b1f26; --fg: #e6e9ee; --muted: #8b94a1; --border: #2a2f38;
      --selected: #26284a; --chip: #2a2f38; --accent: #8b8cf6; --on-accent: #101217;
    }
    .panel[data-theme='light'] {
      --bg: #ffffff; --fg: #1b1f24; --muted: #636c76; --border: #e3e6ea;
      --selected: #eceafd; --chip: #eef0f3; --accent: #4f46e5; --on-accent: #ffffff;
    }
    .list { list-style: none; margin: 0; padding: 4px; }
    .row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
    .row.selected { background: var(--selected); }
    .num {
      flex: none; width: 18px; height: 18px; border-radius: 4px; background: var(--chip);
      color: var(--muted); font-size: 11px; font-weight: 600; display: grid; place-items: center;
    }
    .row.selected .num { background: var(--accent); color: var(--on-accent); }
    .text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pin { flex: none; width: 12px; height: 12px; color: var(--accent); }
    .hint { padding: 6px 10px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; }
  `;

  let host = null;
  let state = null;

  function resolveTheme(theme) {
    if (theme === 'light' || theme === 'dark') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function createPinIcon() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('class', 'pin');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', PIN_PATH);
    svg.appendChild(path);
    return svg;
  }

  function slotLabel(index) {
    return index < 9 ? String(index + 1) : '0';
  }

  function buildRow(item, index) {
    const row = document.createElement('li');
    row.className = 'row';
    row.dataset.index = String(index);

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = slotLabel(index);

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = item.preview.replace(/\s+/g, ' ').trim();

    row.append(num, text);
    if (item.pinned) row.appendChild(createPinIcon());
    return row;
  }

  function position(panel, anchorRect) {
    const size = panel.getBoundingClientRect();
    const maxLeft = window.innerWidth - size.width - VIEWPORT_MARGIN;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(anchorRect.left, maxLeft));
    let top = anchorRect.bottom + ANCHOR_GAP;
    if (top + size.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, anchorRect.top - size.height - ANCHOR_GAP);
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function render() {
    state.rows.forEach((row, i) => row.classList.toggle('selected', i === state.selected));
  }

  function onOutsideMouseDown(event) {
    if (!event.composedPath().includes(host)) close();
  }

  function close() {
    if (!host) return;
    document.removeEventListener('mousedown', onOutsideMouseDown, true);
    window.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
    window.removeEventListener('blur', close);
    host.remove();
    host = null;
    state = null;
  }

  function pickAt(index) {
    if (!state || index < 0 || index >= state.items.length) return;
    const { items, onPick } = state;
    close();
    onPick(items[index]);
  }

  // options: { items, anchorRect, theme, hint, onPick }
  function open({ items, anchorRect, theme, hint, onPick }) {
    close();
    host = document.createElement('div');
    host.style.cssText = `all: initial; position: fixed; left: 0; top: 0; z-index: ${MAX_Z_INDEX};`;
    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.dataset.theme = resolveTheme(theme);

    const list = document.createElement('ul');
    list.className = 'list';
    const rows = items.map(buildRow);
    rows.forEach((row, index) => {
      // mousedown (not click) + preventDefault keeps focus in the page field.
      row.addEventListener('mousedown', (event) => {
        event.preventDefault();
        pickAt(index);
      });
      row.addEventListener('mousemove', () => {
        if (state && state.selected !== index) {
          state.selected = index;
          render();
        }
      });
      list.appendChild(row);
    });

    const hintEl = document.createElement('div');
    hintEl.className = 'hint';
    hintEl.textContent = hint;

    panel.append(list, hintEl);
    shadow.append(style, panel);
    document.documentElement.appendChild(host);

    state = { items, rows, selected: 0, onPick };
    render();
    position(panel, anchorRect);

    document.addEventListener('mousedown', onOutsideMouseDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
  }

  function move(delta) {
    if (!state) return;
    const count = state.items.length;
    state.selected = (state.selected + delta + count) % count;
    render();
  }

  return {
    open,
    close,
    move,
    isOpen: () => host !== null,
    itemCount: () => (state ? state.items.length : 0),
    pickAt,
    pickSelected: () => state && pickAt(state.selected)
  };
})();
