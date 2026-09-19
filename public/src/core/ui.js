export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
export function notice(message) { document.querySelector('#notice').textContent = message; }
export const button = (label, action, cls = '') => el('button', {type: 'button', class: cls, onclick: action}, label);
export function field(label, name, type = 'text', options = {}) {
  return el('label', {}, label, el('input', { name, type, required: true, ...options }));
}
export async function safe(action) {
  try { return await action(); } catch (error) { notice(error.message || 'No se pudo completar la operación.'); }
}
