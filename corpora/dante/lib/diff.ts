// Myers's O((N+M)D) difference algorithm over two arrays of keys, for texts that differ in a few dozen places
// (the treebank's words and Gutenberg's for one cantica). Returns the matched index pairs in order.

export function matchKeys(a: readonly string[], b: readonly string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let done = false;
  for (let d = 0; d <= max && !done; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!) ? v[offset + k + 1]! : v[offset + k - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        done = true;
        break;
      }
    }
  }
  // Walk back through the saved frontiers, collecting the diagonal (matching) steps.
  const pairs: [number, number][] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const frontier = trace[d]!;
    const k = x - y;
    const down = k === -d || (k !== d && frontier[offset + k - 1]! < frontier[offset + k + 1]!);
    const prevK = down ? k + 1 : k - 1;
    const prevX = frontier[offset + prevK]!;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) pairs.push([--x, --y]);
    if (d > 0) {
      x = prevX;
      y = prevY;
    }
  }
  return pairs.reverse();
}
