// Single owner of the current ChatDoc. No other module declares `doc`; they read it via getDoc()
// and replace it via setDoc(). Subscribers are notified on each replacement.
let doc = null;
const subs = [];

export function getDoc() { return doc; }

export function setDoc(next) {
  doc = next;
  for (const fn of subs) fn(doc);
}

export function subscribe(fn) {
  subs.push(fn);
  return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
}
