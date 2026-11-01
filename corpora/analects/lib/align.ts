// Aligns the characters of one book of Legge's Chinese with the Kyoto treebank's characters (longest common
// subsequence), to carry Legge's chapter divisions and punctuation across. Every difference must be explained:
// a one-for-one substitution is another reading or a variant form (counted), any other difference must be listed in
// alignment.ts.

/** A stretch where the two texts differ: Legge's characters [l0, l1) against Kyoto's [k0, k1) (either may be empty). */
export interface Difference {
  l0: number;
  l1: number;
  k0: number;
  k1: number;
}

export interface CharAlignment {
  /** For each of Legge's characters, the Kyoto character it corresponds to, or -1 for one Kyoto lacks. */
  kyotoOf: Int32Array;
  /** Stretches that are not one-for-one substitutions. */
  differences: Difference[];
  /** Characters Legge and Kyoto share, and one-for-one substitutions. */
  same: number;
  substituted: number;
}

/** Longest-common-subsequence alignment of two character arrays; ties skip Legge's character first. */
export function alignChars(legge: readonly string[], kyoto: readonly string[]): CharAlignment {
  const n = legge.length;
  const m = kyoto.length;
  const width = m + 1;
  // lcs[i * width + j]: length of the longest common subsequence of legge[i:] and kyoto[j:].
  const lcs = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * width + j] = legge[i] === kyoto[j]
        ? lcs[(i + 1) * width + j + 1]! + 1
        : Math.max(lcs[(i + 1) * width + j]!, lcs[i * width + j + 1]!);
    }
  }
  const kyotoOf = new Int32Array(n).fill(-1);
  const differences: Difference[] = [];
  let same = 0;
  let substituted = 0;
  let i = 0;
  let j = 0;
  let open: Difference | undefined;
  const close = () => {
    if (!open) return;
    const lengths = [open.l1 - open.l0, open.k1 - open.k0];
    // A longer stretch of the same length is more likely a misalignment than a run of variant readings.
    if (lengths[0] === lengths[1] && lengths[0]! <= 2) {
      for (let d = 0; d < lengths[0]!; d++) kyotoOf[open.l0 + d] = open.k0 + d;
      substituted += lengths[0]!;
    } else differences.push(open);
    open = undefined;
  };
  while (i < n || j < m) {
    if (i < n && j < m && legge[i] === kyoto[j]) {
      close();
      kyotoOf[i] = j;
      same++;
      i++;
      j++;
      continue;
    }
    open ??= { l0: i, l1: i, k0: j, k1: j };
    if (j >= m || (i < n && lcs[(i + 1) * width + j]! >= lcs[i * width + j + 1]!)) {
      i++;
      open.l1 = i;
    } else {
      j++;
      open.k1 = j;
    }
  }
  close();
  return { kyotoOf, differences, same, substituted };
}
