/*
 * Hierarchical, collapsible render of one event (an observation of the store) for the "Events info" tab.
 * Objects and arrays are <details> elements; the open/closed state is remembered per path, so it survives
 * the re-render when the selection or the event changes.
 */

// Paths the user opened / closed explicitly (the others follow the default: first level open)
const openPaths = new Set();
const closedPaths = new Set();

function isContainer(v) {
  return v !== null && typeof v === 'object';
}

function leafText(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  return String(v);
}

function summaryText(key, v) {
  if (Array.isArray(v)) {
    return key + ' [' + v.length + ']';
  }
  return key + ' {' + Object.keys(v).length + '}';
}

function renderNode(doc, key, value, path, depth) {
  if (!isContainer(value)) {
    const row = doc.createElement('div');
    row.className = 'event-tree-leaf';
    const k = doc.createElement('span');
    k.className = 'event-tree-key';
    k.textContent = key + ': ';
    const v = doc.createElement('span');
    v.className = 'event-tree-value event-tree-' + (value === null ? 'null' : typeof value);
    v.textContent = leafText(value);
    row.append(k, v);
    return row;
  }

  const details = doc.createElement('details');
  details.className = 'event-tree-node';
  // Default: the first level open, deeper ones closed, unless the user chose otherwise
  details.open = closedPaths.has(path) ? false : (openPaths.has(path) || depth < 1);
  details.addEventListener('toggle', () => {
    if (details.open) { openPaths.add(path); closedPaths.delete(path); }
    else { closedPaths.add(path); openPaths.delete(path); }
  });
  const summary = doc.createElement('summary');
  summary.textContent = summaryText(key, value);
  details.append(summary);
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
  for (const [k, v] of entries) {
    details.append(renderNode(doc, k, v, path + '/' + k, depth + 1));
  }
  return details;
}

/**
 * Render `obs` into the element `container` (replacing its content). `obs` null: "No event selected".
 * `title` (optional) is the root label, e.g. 'frame 12, id 5'.
 */
export function renderEventTree(container, obs, title) {
  const doc = container.ownerDocument;
  container.textContent = '';
  if (obs == null) {
    const empty = doc.createElement('div');
    empty.className = 'event-tree-empty';
    empty.textContent = 'No event selected';
    container.append(empty);
    return;
  }
  container.append(renderNode(doc, title || 'event', obs, '', 0));
}

/** Forget the remembered open/closed state (tests). */
export function resetEventTreeState() {
  openPaths.clear();
  closedPaths.clear();
}
