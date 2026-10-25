// DCS text, annotation and dictionary: Oliver Hellwig, CC BY 4.0.
// Filenames were resolved from the recursive Git tree at this exact commit.
export const DCS_COMMIT = "8aeed5a1343d0e48b64eb32af8c00e8c6eb29359";

// Annie Besant, fourth edition (1922), public domain. Each discourse and every
// Page: transclusion is pinned independently. Page numbers are DjVu scan numbers.
// Chapter 12 retains its original pins; the other pins were resolved on 2026-10-25.
export const CHAPTERS: readonly {
  chapter: number;
  dcsFile: string;
  discourseOldid: number;
  pages: readonly (readonly [number, number])[];
}[] = [
  {
    chapter: 1,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0883-MBh, 6, BhaGī 1-7242.conllu",
    discourseOldid: 9204505,
    pages: [
      [11, 9460956], [12, 15365499], [13, 9461240], [14, 9461252],
      [15, 9461267], [16, 9461310], [17, 9461325], [18, 9461333],
      [19, 9461359], [20, 9463890], [21, 9464770], [22, 9464805],
      [23, 16058924], [24, 9209707], [25, 9209711], [26, 9209713],
      [27, 9209714],
    ],
  },
  {
    chapter: 2,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0884-MBh, 6, BhaGī 2-7243.conllu",
    discourseOldid: 9206900,
    pages: [
      [28, 9209720], [29, 9209780], [30, 9209781], [31, 9209782],
      [32, 9209756], [33, 9209759], [34, 9209772], [35, 9209778],
      [36, 9209779], [37, 9209790], [38, 9209813], [39, 9209818],
      [40, 9209823], [41, 9209834], [42, 11728396], [43, 9209860],
      [44, 9210621], [45, 9210635], [46, 9210642], [47, 9210660],
      [48, 9210665], [49, 9210668], [50, 9210671], [51, 9210679],
      [52, 9210682], [53, 9210686], [54, 9210689], [55, 9210703],
    ],
  },
  {
    chapter: 3,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0885-MBh, 6, BhaGī 3-7244.conllu",
    discourseOldid: 9212044,
    pages: [
      [56, 9210712], [57, 9210717], [58, 9210721], [59, 9210750],
      [60, 9210812], [61, 11734713], [62, 9210825], [63, 9210830],
      [64, 9210835], [65, 9210844], [66, 9210848], [67, 9210851],
      [68, 9212010], [69, 9212023], [70, 9212037],
    ],
  },
  {
    chapter: 4,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0886-MBh, 6, BhaGī 4-7245.conllu",
    discourseOldid: 9212274,
    pages: [
      [71, 9212057], [72, 9212060], [73, 9212063], [74, 9212066],
      [75, 9212069], [76, 9212073], [77, 9212075], [78, 9212079],
      [79, 9212083], [80, 9212085], [81, 9212207], [82, 9212228],
      [83, 9212232], [84, 9212236], [85, 9212240],
    ],
  },
  {
    chapter: 5,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0887-MBh, 6, BhaGī 5-7248.conllu",
    discourseOldid: 9233254,
    pages: [
      [86, 9233038], [87, 9233050], [88, 9239873], [89, 9233107],
      [90, 9233118], [91, 9233173], [92, 9233176], [93, 9233180],
      [94, 9233199], [95, 9233252], [96, 9233253],
    ],
  },
  {
    chapter: 6,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0888-MBh, 6, BhaGī 6-7624.conllu",
    discourseOldid: 9444867,
    pages: [
      [97, 9239889], [98, 9239907], [99, 9252161], [100, 9252170],
      [101, 9438885], [102, 9438989], [103, 9439146], [104, 9439186],
      [105, 9441721], [106, 9441739], [107, 9441761], [108, 9444737],
      [109, 9444821], [110, 9444839], [111, 9444846], [112, 9444863],
    ],
  },
  {
    chapter: 7,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0889-MBh, 6, BhaGī 7-7693.conllu",
    discourseOldid: 9475755,
    pages: [
      [113, 9445731], [114, 9445738], [115, 9445752], [116, 9445758],
      [117, 9445801], [118, 9447426], [119, 9447465], [120, 9447576],
      [121, 9447608], [122, 11734709], [123, 9475749],
    ],
  },
  {
    chapter: 8,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0890-MBh, 6, BhaGī 8-7695.conllu",
    discourseOldid: 9514547,
    pages: [
      [124, 9514444], [125, 9514452], [126, 9514458], [127, 9514480],
      [128, 9514488], [129, 9514496], [130, 9514499], [131, 9514507],
      [132, 9514528], [133, 9514530], [134, 11734710], [135, 9514544],
    ],
  },
  {
    chapter: 9,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0891-MBh, 6, BhaGī 9-7697.conllu",
    discourseOldid: 9813578,
    pages: [
      [136, 9538019], [137, 9538767], [138, 9538769], [139, 9538772],
      [140, 9539377], [141, 9540423], [142, 11728433], [143, 9541851],
      [144, 9541886], [145, 9814602], [146, 9814607], [147, 9814617],
    ],
  },
  {
    chapter: 10,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0892-MBh, 6, BhaGī 10-7699.conllu",
    discourseOldid: 9814624,
    pages: [
      [148, 9814626], [149, 9814635], [150, 9814638], [151, 9814798],
      [152, 9814841], [153, 9814849], [154, 9814873], [155, 9814878],
      [156, 9814889], [157, 9814891], [158, 9814908], [159, 9814927],
      [160, 9814976], [161, 9814997], [162, 9815002],
    ],
  },
  {
    chapter: 11,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0893-MBh, 6, BhaGī 11-7700.conllu",
    discourseOldid: 9822557,
    pages: [
      [163, 9818656], [164, 9818672], [165, 9818676], [166, 9818679],
      [167, 11728447], [168, 11728453], [169, 9820326], [170, 9820361],
      [171, 9820465], [172, 9824341], [173, 9822153], [174, 9822180],
      [175, 9822215], [176, 11728463], [177, 11728466], [178, 11728467],
      [179, 11728469], [180, 9822587], [181, 9822596], [182, 9822597],
      [183, 11728471], [184, 11728482], [185, 11728487], [186, 9822611],
      [187, 9822614],
    ],
  },
  {
    chapter: 12,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0894-MBh, 6, BhaGī 12-7701.conllu",
    discourseOldid: 9815155,
    pages: [
      [188, 9824423], [189, 9824453], [190, 9825486], [191, 9893624],
      [192, 9894962], [193, 9895000], [194, 9895117], [195, 9953772],
    ],
  },
  {
    chapter: 13,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0895-MBh, 6, BhaGī 13-7702.conllu",
    discourseOldid: 9818683,
    pages: [
      [196, 9953933], [197, 13057610], [198, 13057611], [199, 13057614],
      [200, 13057616], [201, 13057618], [202, 13057619], [203, 13057620],
      [204, 13057623], [205, 13057624], [206, 13057627], [207, 13057628],
      [208, 10181248],
    ],
  },
  {
    chapter: 14,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0896-MBh, 6, BhaGī 14-7703.conllu",
    discourseOldid: 9816245,
    pages: [
      [209, 10394748], [210, 10394768], [211, 10394786], [212, 10394787],
      [213, 10394791], [214, 10394879], [215, 10396887], [216, 10396982],
      [217, 10397215], [218, 10397914],
    ],
  },
  {
    chapter: 15,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0897-MBh, 6, BhaGī 15-7704.conllu",
    discourseOldid: 9815370,
    pages: [
      [219, 11728498], [220, 10398225], [221, 10398239], [222, 10399802],
      [223, 10482233], [224, 10482247], [225, 10482306], [226, 11725750],
      [227, 11725752],
    ],
  },
  {
    chapter: 16,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0898-MBh, 6, BhaGī 16-7705.conllu",
    discourseOldid: 11729226,
    pages: [
      [228, 11725757], [229, 11725759], [230, 11725773], [231, 11725777],
      [232, 11725779], [233, 11725783], [234, 11725785], [235, 11725808],
      [236, 11725816],
    ],
  },
  {
    chapter: 17,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0899-MBh, 6, BhaGī 17-7706.conllu",
    discourseOldid: 9818224,
    pages: [
      [237, 11725847], [238, 11725849], [239, 11725857], [240, 11725871],
      [241, 11725882], [242, 11725887], [243, 11725890], [244, 11725897],
      [245, 11725899], [246, 11725928], [247, 11725930],
    ],
  },
  {
    chapter: 18,
    dcsFile: "dcs/data/conllu/files/Mahābhārata/Mahābhārata-0900-MBh, 6, BhaGī 18-7707.conllu",
    discourseOldid: 9823331,
    pages: [
      [248, 11725933], [249, 11725936], [250, 11725937], [251, 11725940],
      [252, 11725962], [253, 11726137], [254, 11726176], [255, 11726210],
      [256, 11726246], [257, 11726267], [258, 11726321], [259, 11727928],
      [260, 11727946], [261, 11727970], [262, 11727995], [263, 11728029],
      [264, 11728046], [265, 11728089], [266, 11728143], [267, 11728183],
      [268, 11728203], [269, 11728219], [270, 11728264], [271, 11728305],
      [272, 11728331], [273, 11728357], [274, 11728390],
    ],
  },
];

const raw = (title: string, oldid: number) =>
  `https://en.wikisource.org/w/index.php?title=${encodeURIComponent(title)}&oldid=${oldid}&action=raw`;
const dcs = `https://raw.githubusercontent.com/OliverHellwig/sanskrit/${DCS_COMMIT}`;

export const SOURCES: Readonly<Record<string, string>> = {
  "dictionary.csv": `${dcs}/dcs/data/conllu/lookup/dictionary.csv`,
  // The parallel parsed witness retains 2.21a, absent from the base chapter file.
  // Its sentence/token exceptions are documented in alignment.ts.
  "chapter-2-parsed.conllu": `${dcs}/${CHAPTERS[1]!.dcsFile.split("/").map(encodeURIComponent).join("/")}_parsed`,
  ...Object.fromEntries(CHAPTERS.flatMap(({ chapter, dcsFile, discourseOldid, pages }) => [
    [`chapter-${chapter}.conllu`, `${dcs}/${dcsFile.split("/").map(encodeURIComponent).join("/")}`],
    [`discourse-${chapter}.wiki`, raw(`Bhagavad-Gita (Besant 4th)/Discourse ${chapter}`, discourseOldid)],
    ...pages.map(([page, oldid]) => [
      `besant/${page}.wiki`, raw(`Page:Bhagavad Gita - Annie Besant 4th edition.djvu/${page}`, oldid),
    ]),
  ])),
};
