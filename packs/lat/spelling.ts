// Latin lookup keys ignore what editions spell differently: macrons and breves, letter case, and the consonantal
// letters v and j, which LASLA writes u and i (uirum, iam) and Greenough and Frieze write v (virum, vir).
export const fold = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC").toLowerCase().replace(/v/g, "u").replace(/j/g, "i");

/** Search key: the lookup key, so `virum`, `uirum` and `VIRUM` all find virum. */
export const searchKey = fold;
