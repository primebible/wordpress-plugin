/*!
 * PrimeBible Verse Preview
 * Version 2.5.3 - Reference detection no longer matches everyday words ("is 5", "am 24", "so 3"); time/ordinal/year guards
 * Attach to any page. Configure with window.PrimeBibleConfig before this script.
 */
(function () {
  "use strict";

  // Re-injection guard to prevent duplicate bindings during hot-reloads
  if (window.PrimeBible && typeof window.PrimeBible.destroy === "function") {
    try { window.PrimeBible.destroy(); } catch {}
  }

  // ------------------------------------------------------------
  // 0. Configuration
  // ------------------------------------------------------------
  const defaultConfig = {
    apiUrl: "https://primebible.com/api/verse-preview",
    translation: "KJV",
    theme: "system",           // 'light', 'dark', 'system'
    position: "auto",          // 'auto', 'top', 'bottom'
    maxWidth: 420,
    mobileMaxWidth: 340,
    showReference: true,
    showFooter: true,
    customStyles: null,
    hoverDelayMs: 200,
    longPressMs: 400,
    hideDelayMs: 150,
    excludeSelectors: ["script", "style", "noscript", "iframe", "textarea", "code", "pre", ".pbv-no-scan"],
    onError: null,
    enableAnimations: true,
    mobileOptimized: true,
    prefetch: true,
    maxCacheSize: 100,
    cacheExpiry: 3600000,      // 1 hour
    analytics: false,

    // Infra/perf
    timeoutMs: 8000,
    retries: 2,
    maxConcurrentFetches: 4,
    maxMatchesPerNode: 50,
    maxNodeTextLength: 12000,

    // CSP
    styleNonce: null,

    // Lazy scanning
    lazyScan: true,

    // Optional override. Bundled verse counts are assigned below when this is empty.
    chapterVerseCounts: null,

    // Debug
    debug: false
  };

  const config = Object.assign({}, defaultConfig, window.PrimeBibleConfig || {});

  // ------------------------------------------------------------
  // Polyfills and helpers
  // ------------------------------------------------------------
  if (typeof window.requestIdleCallback !== "function") {
    window.requestIdleCallback = function (cb, opts) {
      const start = Date.now();
      return setTimeout(function () {
        cb({
          didTimeout: !!(opts && opts.timeout),
          timeRemaining: function () { return Math.max(0, 50 - (Date.now() - start)); }
        });
      }, (opts && opts.timeout) ? opts.timeout : 1);
    };
  }
  if (typeof window.cancelIdleCallback !== "function") {
    window.cancelIdleCallback = function (id) { clearTimeout(id); };
  }

  const nowMs = (() => {
    if (typeof performance !== "undefined" && performance && typeof performance.now === "function") {
      const epoch = Date.now() - performance.now();
      return () => epoch + performance.now();
    }
    return () => Date.now();
  })();

  // Module-level listeners that destroy() must remove, or repeated
  // destroy/init cycles (hot reloads, SPA navigation) leak a few window
  // listeners per cycle.
  const globalCleanup = [];
  function addManagedListener(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    globalCleanup.push(() => { try { target.removeEventListener(type, fn, opts); } catch {} });
  }

  // Cached mobile detection
  const isMobile = (() => {
    let cached = null;
    const compute = () => {
      const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
      const coarse = mm("(pointer: coarse)");
      const noHover = mm("(hover: none)");
      const narrow = mm("(max-width: 768px)");
      const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      return (coarse && noHover) || uaMobile || narrow;
    };
    const invalidate = () => { cached = null; };
    addManagedListener(window, "resize", invalidate, { passive: true });
    addManagedListener(window, "orientationchange", invalidate);
    return () => {
      if (cached == null) cached = compute();
      return cached;
    };
  })();

  const hasTouch = () => "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const DEFAULT_CHAPTER_VERSE_COUNT_LISTS = {
    "Genesis": [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
    "Exodus": [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
    "Leviticus": [17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
    "Numbers": [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
    "Deuteronomy": [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
    "Joshua": [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
    "Judges": [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
    "Ruth": [22,23,18,22],
    "1 Samuel": [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
    "2 Samuel": [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
    "1 Kings": [53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
    "2 Kings": [18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
    "1 Chronicles": [54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
    "2 Chronicles": [17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
    "Ezra": [11,70,13,24,17,22,28,36,15,44],
    "Nehemiah": [11,20,32,23,19,19,73,18,38,39,36,47,31],
    "Esther": [22,23,15,17,14,14,10,17,32,3],
    "Job": [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
    "Psalms": [6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
    "Proverbs": [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
    "Ecclesiastes": [18,26,22,16,20,12,29,17,18,20,10,14],
    "Song of Solomon": [17,17,11,16,16,13,13,14],
    "Isaiah": [31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
    "Jeremiah": [19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
    "Lamentations": [22,22,66,22,22],
    "Ezekiel": [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
    "Daniel": [21,49,30,37,31,28,28,27,27,21,45,13],
    "Hosea": [11,23,5,19,15,11,16,14,17,15,12,14,16,9],
    "Joel": [20,32,21],
    "Amos": [15,16,15,13,27,14,17,14,15],
    "Obadiah": [21],
    "Jonah": [17,10,10,11],
    "Micah": [16,13,12,13,15,16,20],
    "Nahum": [15,13,19],
    "Habakkuk": [17,20,19],
    "Zephaniah": [18,15,20],
    "Haggai": [15,23],
    "Zechariah": [21,13,10,14,11,15,14,23,17,12,17,14,9,21],
    "Malachi": [14,17,18,6],
    "Matthew": [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
    "Mark": [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
    "Luke": [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
    "John": [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
    "Acts": [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
    "Romans": [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
    "1 Corinthians": [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
    "2 Corinthians": [24,17,18,18,21,18,16,24,15,18,33,21,14],
    "Galatians": [24,21,29,31,26,18],
    "Ephesians": [23,22,21,32,33,24],
    "Philippians": [30,30,21,23],
    "Colossians": [29,23,25,18],
    "1 Thessalonians": [10,20,13,18,28],
    "2 Thessalonians": [12,17,18],
    "1 Timothy": [20,15,16,16,25,21],
    "2 Timothy": [18,26,17,22],
    "Titus": [16,15,15],
    "Philemon": [25],
    "Hebrews": [14,18,19,16,14,20,28,13,28,39,40,29,25],
    "James": [27,26,18,17,20],
    "1 Peter": [25,25,22,19,14],
    "2 Peter": [21,22,18],
    "1 John": [10,29,24,21,21],
    "2 John": [13],
    "3 John": [14],
    "Jude": [25],
    "Revelation": [20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21]
  };

  function buildDefaultChapterVerseCounts() {
    const counts = {};
    Object.keys(DEFAULT_CHAPTER_VERSE_COUNT_LISTS).forEach(book => {
      counts[book] = {};
      DEFAULT_CHAPTER_VERSE_COUNT_LISTS[book].forEach((count, index) => {
        counts[book][String(index + 1)] = count;
      });
    });
    return counts;
  }

  const DEFAULT_CHAPTER_VERSE_COUNTS = buildDefaultChapterVerseCounts();
  if (!config.chapterVerseCounts) config.chapterVerseCounts = DEFAULT_CHAPTER_VERSE_COUNTS;

  function isMobileMode() {
    return config.mobileOptimized !== false && isMobile();
  }

  // ------------------------------------------------------------
  // 1. Books and regex (supports dotted abbreviations)
  // ------------------------------------------------------------
const bibleBookAliases = [
  { canonical: "Genesis", aliases: ["Gen","Ge","Gn"] },
  { canonical: "Exodus", aliases: ["Ex","Exo","Exod"] },
  { canonical: "Leviticus", aliases: ["Lev","Le","Lv"] },
  { canonical: "Numbers", aliases: ["Num","Nu","Nm","Nb"] },
  { canonical: "Deuteronomy", aliases: ["Deut","Dt","De"] },
  { canonical: "Joshua", aliases: ["Josh","Jos","Jsh"] },
  { canonical: "Judges", aliases: ["Judg","Jdg","Jg","Jdgs"] },
  { canonical: "Ruth", aliases: ["Rth","Ru"] },
  { canonical: "1 Samuel", aliases: ["1st Samuel","1 Sam","1st Sam","1 Sa","1st Sa","1 S","1st S","I Samuel","I Sam","I Sa"] }, // "I S" removed: collapses to the word "is"
  { canonical: "2 Samuel", aliases: ["2nd Samuel","2 Sam","2nd Sam","2 Sa","2nd Sa","2 S","2nd S","II Samuel","II Sam","II Sa","II S"] },
  { canonical: "1 Kings", aliases: ["1st Kings","1 Kgs","1st Kgs","1 Ki","1st Ki","I Kings","I Kgs","I Ki"] },
  { canonical: "2 Kings", aliases: ["2nd Kings","2 Kgs","2nd Kgs","2 Ki","2nd Ki","II Kings","II Kgs","II Ki"] },
  { canonical: "1 Chronicles", aliases: ["1st Chronicles","1 Chron","1st Chron","1 Ch","1st Ch","I Chronicles","I Chron","I Ch"] },
  { canonical: "2 Chronicles", aliases: ["2nd Chronicles","2 Chron","2nd Chron","2 Ch","2nd Ch","II Chronicles","II Chron","II Ch"] },
  { canonical: "Ezra", aliases: ["Ezr","Ez"] },
  { canonical: "Nehemiah", aliases: ["Neh","Ne"] },
  { canonical: "Esther", aliases: ["Est","Es"] },
  { canonical: "Job", aliases: ["Jb"] },
  { canonical: "Psalms", aliases: ["Psalm","Ps","Psa","Psm","Pss"] },
  { canonical: "Proverbs", aliases: ["Prov","Pro","Pr","Prv"] },
  { canonical: "Ecclesiastes", aliases: ["Eccles","Ecc","Ec","Qoh"] },
  { canonical: "Song of Solomon", aliases: ["Song of Songs","Song","SOS","So","Canticles","Cant","Canticle of Canticles"] },
  { canonical: "Isaiah", aliases: ["Isa"] }, // Avoid "is" to reduce false positives.
  { canonical: "Jeremiah", aliases: ["Jer","Je","Jr"] },
  { canonical: "Lamentations", aliases: ["Lam","La"] },
  { canonical: "Ezekiel", aliases: ["Ezek","Eze","Ezk"] },
  { canonical: "Daniel", aliases: ["Dan","Da","Dn"] },
  { canonical: "Hosea", aliases: ["Hos","Ho"] },
  { canonical: "Joel", aliases: ["Joe","Jl"] },
  { canonical: "Amos", aliases: ["Am"] },
  { canonical: "Obadiah", aliases: ["Obad","Ob"] },
  { canonical: "Jonah", aliases: ["Jon","Jnh"] },
  { canonical: "Micah", aliases: ["Mic","Mc"] },
  { canonical: "Nahum", aliases: ["Nah","Na"] },
  { canonical: "Habakkuk", aliases: ["Hab","Hb"] },
  { canonical: "Zephaniah", aliases: ["Zeph","Zep","Zp"] },
  { canonical: "Haggai", aliases: ["Hag","Hg"] },
  { canonical: "Zechariah", aliases: ["Zech","Zec","Zc"] },
  { canonical: "Malachi", aliases: ["Mal","Ml"] },
  { canonical: "Matthew", aliases: ["Matt","Mt","Mat"] },
  { canonical: "Mark", aliases: ["Mrk","Mk","Mr","Mar"] },
  { canonical: "Luke", aliases: ["Luk","Lk","Lu"] },
  { canonical: "John", aliases: ["Joh","Jn","Jhn"] },
  { canonical: "Acts", aliases: ["Act","Ac"] },
  { canonical: "Romans", aliases: ["Rom","Ro","Rm"] },
  { canonical: "1 Corinthians", aliases: ["1st Corinthians","1 Corin","1st Corin","1 Cor","1st Cor","1 Co","1st Co","I Corinthians","I Cor","I Co"] },
  { canonical: "2 Corinthians", aliases: ["2nd Corinthians","2 Corin","2nd Corin","2 Cor","2nd Cor","2 Co","2nd Co","II Corinthians","II Cor","II Co"] },
  { canonical: "Galatians", aliases: ["Gal","Ga","Gl"] },
  { canonical: "Ephesians", aliases: ["Eph"] },
  { canonical: "Philippians", aliases: ["Phil","Php"] },
  { canonical: "Colossians", aliases: ["Col","Co"] },
  { canonical: "1 Thessalonians", aliases: ["1st Thessalonians","1 Thess","1st Thess","1 Thes","1st Thes","1 Th","1st Th","I Thessalonians","I Thess","I Thes","I Th"] },
  { canonical: "2 Thessalonians", aliases: ["2nd Thessalonians","2 Thess","2nd Thess","2 Thes","2nd Thes","2 Th","2nd Th","II Thessalonians","II Thess","II Thes","II Th"] },
  { canonical: "1 Timothy", aliases: ["1st Timothy","1 Tim","1st Tim","1 Ti","1st Ti","I Timothy","I Tim","I Ti"] },
  { canonical: "2 Timothy", aliases: ["2nd Timothy","2 Tim","2nd Tim","2 Ti","2nd Ti","II Timothy","II Tim","II Ti"] },
  { canonical: "Titus", aliases: ["Tit","Ti"] },
  { canonical: "Philemon", aliases: ["Philem","Phm"] },
  { canonical: "Hebrews", aliases: ["Heb"] },
  { canonical: "James", aliases: ["Jam","Jas"] },
  { canonical: "1 Peter", aliases: ["1st Peter","1 Pet","1st Pet","1 Pe","1st Pe","1 Pt","1st Pt","I Peter","I Pet","I Pe","I Pt"] },
  { canonical: "2 Peter", aliases: ["2nd Peter","2 Pet","2nd Pet","2 Pe","2nd Pe","2 Pt","2nd Pt","II Peter","II Pet","II Pe","II Pt"] },
  { canonical: "1 John", aliases: ["1st John","1 Jn","1st Jn","1 Jo","1st Jo","1 Jhn","1st Jhn","I John","I Jn","I Jo","I Jhn"] },
  { canonical: "2 John", aliases: ["2nd John","2 Jn","2nd Jn","2 Jo","2nd Jo","2 Jhn","2nd Jhn","II John","II Jn","II Jo","II Jhn"] },
  { canonical: "3 John", aliases: ["3rd John","3 Jn","3rd Jn","3 Jo","3rd Jo","3 Jhn","3rd Jhn","III John","III Jn","III Jo","III Jhn"] },
  { canonical: "Jude", aliases: ["Jud","Ju","Jd"] },
  { canonical: "Revelation", aliases: ["Rev","Re","Reve"] }
];

const bibleBooks = bibleBookAliases.reduce((books, group) => {
  books.push(group.canonical);
  group.aliases.forEach(alias => books.push(alias));
  return books;
}, []);

  function escapeForRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function bookAliasKey(bookName) {
    return String(bookName || "").replace(/[.\s]/g, "").toLowerCase();
  }

  const canonicalBookByAlias = (() => {
    const aliases = {};
    bibleBookAliases.forEach(group => {
      aliases[bookAliasKey(group.canonical)] = group.canonical;
      group.aliases.forEach(alias => { aliases[bookAliasKey(alias)] = group.canonical; });
    });
    return aliases;
  })();

  function canonicalizeBookName(bookName) {
    const fallback = String(bookName || "").replace(/\./g, "").replace(/\s+/g, " ").trim();
    return canonicalBookByAlias[bookAliasKey(bookName)] || fallback;
  }

  // Aliases whose collapsed form is an everyday word or common token must not
  // trigger AUTO-DETECTION — once whitespace is made optional, "I S" matches
  // "is", "Am" matches "am", "So" matches "so", "Act 2" is theater, "GA 4" and
  // "ES 6" are tech shorthand. They all remain valid for canonicalization and
  // the [primebible] shortcode; they just never wrap plain prose.
  const DETECTION_STOPWORDS = new Set([
    "is", "1s", "iis", "so", "am", "act", "song", "mr", "co", "re", "la",
    "na", "da", "ho", "ac", "ga", "es", "lu", "ru"
  ]);
  const detectableBooks = bibleBooks.filter(name => !DETECTION_STOPWORDS.has(bookAliasKey(name)));

  // Allow spaces/dots inside tokens; trailing dot handled on the overall match
  function buildBookPattern(names) {
    return names
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(name => escapeForRegex(name).replace(/[.\s]/g, "[\\s.]*"))
      .join("|");
  }
  // Detection scans arbitrary prose, so it uses the filtered list;
  // parsing handles refs the user explicitly wrote (shortcode, data-ref),
  // where short forms like "Ac 2:1" are intentional — it uses every alias.
  const bookPattern = buildBookPattern(detectableBooks);
  const parseBookPattern = buildBookPattern(bibleBooks);

  const DASH_CLASS = "[\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2212]";
  // Chapter/verse numbers are 1-3 digits (years and prices are not references),
  // and must not be the number of a time ("3pm"), ordinal ("3rd"), or percent.
  const NUM = "\\d{1,3}(?!\\d)(?!\\s?[ap]\\.?m\\.?\\b)(?!(?:st|nd|rd|th)\\b)(?!%)";
  const H_TAIL = "(?:" + NUM + ":" + NUM + "|" + NUM + "(?!:))";

  // Full reference detector (book may end with a trailing '.')
  const referenceRegex = new RegExp(
    "\\b(" + bookPattern + ")\\.?\\s+" +
    NUM +
    "(?::" + NUM + "(?:" + DASH_CLASS + H_TAIL + ")?" + "|" + DASH_CLASS + NUM + "(?!:))?" +
    "(?:\\s*[;,]\\s*" + NUM + "(?!\\s+(?:" + bookPattern + "))(?::" + NUM + "(?:" + DASH_CLASS + H_TAIL + ")?" + "|" + DASH_CLASS + NUM + "(?!:))?)*" +
    "\\b",
    "gi"
  );
  const referenceTestRegex = new RegExp(referenceRegex.source, "i");

  // ------------------------------------------------------------
  // 2. Theme
  // ------------------------------------------------------------
  const themes = {
    light: {
      background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
      solidBackground: "#ffffff",
      border: "rgba(0, 0, 0, 0.08)",
      text: "#1a1a1a",
      shadow: "0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.06)",
      mobileShadow: "0 8px 30px rgba(0, 0, 0, 0.15)",
      reference: "#374151",
      verseNumber: "#6b7280",
      footerBg: "#f8fafc",
      footerText: "#64748b",
      footerLink: "#2563eb",
      footerBorder: "rgba(0, 0, 0, 0.06)",
      highlightBg: "rgba(37, 99, 235, 0.08)",
      scrollbar: "rgba(0, 0, 0, 0.2)",
      scrollbarHover: "rgba(0, 0, 0, 0.3)"
    },
    dark: {
      background: "linear-gradient(135deg, #1f2937 0%, #0b1220 100%)",
      solidBackground: "#0f172a",
      border: "rgba(255, 255, 255, 0.1)",
      text: "#e5e7eb",
      shadow: "0 10px 40px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(0, 0, 0, 0.3)",
      mobileShadow: "0 8px 30px rgba(0, 0, 0, 0.6)",
      reference: "#93a2b8",
      verseNumber: "#94a3b8",
      footerBg: "#0b1220",
      footerText: "#94a3b8",
      footerLink: "#60a5fa",
      footerBorder: "rgba(255, 255, 255, 0.08)",
      highlightBg: "rgba(96, 165, 250, 0.15)",
      scrollbar: "rgba(255, 255, 255, 0.2)",
      scrollbarHover: "rgba(255, 255, 255, 0.3)"
    }
  };

  function resolveThemeName() {
    if (config.theme === "system") {
      try { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
      catch { return "light"; }
    }
    return themes[config.theme] ? config.theme : "light";
  }

  // ------------------------------------------------------------
  // 3. Tooltip and interactions
  // ------------------------------------------------------------
  let tooltip = null;
  let currentTarget = null;
  let hideTimeout = null;
  let hoverTimer = null;
  let touchStartTime = null;
  let touchStartX = null;
  let touchStartY = null;
  let intersectionObserver = null;

  // Hover manager
  let overTooltip = false;
  let overAnyRef = false;

  // SPA body swap observer
  let bodySwapObserver = null;
  let observedBody = null;

  if (!window.__PBV_GLOBAL_BOUND__) window.__PBV_GLOBAL_BOUND__ = false;

  const docClickHandler = function (e) {
    const t = e && e.target && e.target.nodeType === 1 ? e.target : (e && e.target ? e.target.parentElement : null);
    if (!tooltip || tooltip.style.display !== "block") return;
    const insideTooltip = t && t.closest && t.closest("#pbv-tooltip");
    const insideRef = t && t.closest && t.closest(".pbv-ref");
    if (!insideTooltip && !insideRef) hideTooltip(true);
  };
  const docKeydownHandler = function (e) {
    if (e.key === "Escape" && tooltip && tooltip.style.display === "block") hideTooltip(true);
  };
  if (!window.__PBV_GLOBAL_BOUND__) {
    document.addEventListener("click", docClickHandler);
    document.addEventListener("keydown", docKeydownHandler);
    window.__PBV_GLOBAL_BOUND__ = true;
  }

  const openTokenByEl = new WeakMap();
  const requestControllers = new WeakMap();
  const activeControllers = new Set();

  function abortAllActiveRequests() {
    activeControllers.forEach(ctrl => { try { ctrl.abort(); } catch {} });
    activeControllers.clear();
    document.querySelectorAll(".pbv-ref").forEach(el => {
      requestControllers.delete(el);
      openTokenByEl.delete(el);
    });
  }

  // ------------------------------------------------------------
  // 4. Fetch, sanitize, cache
  // ------------------------------------------------------------
  const cache = new Map();           // key -> () => Node
  const pending = new Map();         // key -> Promise
  const cacheTimestamps = new Map(); // key -> timestamp
  const errorEvictionTimers = new Set();

  function manageCacheSize() {
    if (cache.size > config.maxCacheSize) {
      const sorted = Array.from(cacheTimestamps.entries()).sort((a, b) => a[1] - b[1]);
      const toRemove = sorted.slice(0, Math.floor(config.maxCacheSize / 4));
      toRemove.forEach(([key]) => { cache.delete(key); cacheTimestamps.delete(key); });
    }
  }
  function isExpired(key) {
    const t = cacheTimestamps.get(key);
    if (!t) return true;
    return Date.now() - t > config.cacheExpiry;
  }

  function normalizeDashes(s) { return String(s || "").replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-"); }
  function normalizeSpacing(s) {
    return String(s || "")
      .replace(/\s*-\s*/g, "-")
      .replace(/\s*,\s*/g, ",")
      .replace(/\s*;\s*/g, ";")
      .replace(/\s*:\s*/g, ":")
      .replace(/\s+/g, " ")
      .trim();
  }
  function normalizeRef(rawRef) {
    const normalized = normalizeSpacing(normalizeDashes(rawRef));
    const match = normalized.match(new RegExp("^\\s*(" + parseBookPattern + ")\\.?\\s+(.*)$", "i"));
    if (!match) return normalized;
    return canonicalizeBookName(match[1]) + " " + match[2].trim();
  }

  function pLimit(concurrency) {
    const queue = [];
    let active = 0;
    const next = () => { active--; if (queue.length) queue.shift()(); };
    return fn => new Promise((resolve, reject) => {
      const run = () => { active++; fn().then(v => { resolve(v); next(); }, e => { reject(e); next(); }); };
      active < concurrency ? run() : queue.push(run);
    });
  }

  function validateApiResponse(data) {
    if (typeof data !== "object" || data === null || typeof data.text !== "string") throw new Error("Invalid API response structure");
    if (data.text.length > 50000) throw new Error("Response too large");
    const suspicious = /<script|javascript:|on\w+=/i;
    if (suspicious.test(data.text)) throw new Error("Suspicious content detected");
    return data;
  }

  function sanitizeApiHtml(html) {
    try {
      const allowed = new Set(["STRONG", "EM", "B", "I", "BR", "SPAN", "SUP"]);
      let container = null;

      if (typeof DOMParser === "function") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(String(html || ""), "text/html");
        container = doc.body;
      } else {
        const tpl = document.createElement("template");
        tpl.innerHTML = String(html || "");
        container = tpl.content;
      }

      function cleanse(node) {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue || "");
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.nodeName.toUpperCase();
          if (!allowed.has(tag)) {
            const frag = document.createDocumentFragment();
            node.childNodes.forEach(child => frag.appendChild(cleanse(child)));
            return frag;
          }
          const el = document.createElement(tag.toLowerCase());
          if (tag === "SPAN" && node.className === "verse-num") el.className = "verse-num";
          node.childNodes.forEach(child => el.appendChild(cleanse(child)));
          return el;
        }
        return document.createTextNode("");
      }

      const out = document.createDocumentFragment();
      const children = container.childNodes ? Array.from(container.childNodes) : [];
      children.forEach(n => out.appendChild(cleanse(n)));
      return out;
    } catch {
      return document.createTextNode(String(html || ""));
    }
  }

  function anySignal(signals) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    const cleanups = [];
    signals.filter(Boolean).forEach(sig => {
      if (sig.aborted) controller.abort();
      else {
        sig.addEventListener("abort", onAbort, { once: true });
        cleanups.push(() => sig.removeEventListener("abort", onAbort));
      }
    });
    return { signal: controller.signal, cleanup: () => cleanups.forEach(fn => fn()) };
  }

  async function fetchJSON(url, retries = config.retries, timeoutMs = config.timeoutMs, externalSignal) {
    for (let i = 0; i <= retries; i++) {
      let controller = null, timeoutId = null, merged = null;
      try {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        merged = externalSignal ? anySignal([controller.signal, externalSignal]) : { signal: controller.signal, cleanup: () => {} };
        const res = await fetch(url, {
          mode: "cors",
          headers: { "Accept": "application/json", "X-Requested-With": "PrimeBible-Embed" },
          signal: merged.signal
        });
        if (!res.ok) {
          const err = new Error("HTTP " + res.status);
          err.status = res.status;
          if (i === retries) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        return res.json();
      } catch (err) {
        if (i === retries) throw err;
      } finally {
        if (merged) merged.cleanup();
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
  }

  const rateLimiter = {
    attempts: new Map(),
    check(key) {
      const now = nowMs();
      const arr = this.attempts.get(key) || [];
      const recent = arr.filter(t => now - t < 60000);
      if (recent.length >= 10) return false;
      recent.push(now);
      this.attempts.set(key, recent);
      return true;
    }
  };

  async function fetchSingleRef(piece, translation, signal) {
    const limiterKey = translation + "|" + piece;
    if (!rateLimiter.check(limiterKey)) throw new Error("Rate limit exceeded");
    const params = new URLSearchParams({ ref: piece, translation: translation, format: "html" });
    const url = config.apiUrl + "?" + params.toString();
    const data = await fetchJSON(url, config.retries, config.timeoutMs, signal);
    if (typeof data === "object") return validateApiResponse(data).text;
    if (typeof data === "string") return data;
    return "Verse not found.";
  }

  // Split ref into per-segment pieces based on ';'
  function splitRefIntoPieces(ref) {
    const mainRe = new RegExp("^\\s*(" + parseBookPattern + ")\\.?\\s+(\\d+)(?::(.*))?\\s*$", "i");
    const m = ref.match(mainRe);
    if (!m) return [ref];

    const book = canonicalizeBookName(m[1]);
    const firstChapter = m[2];
    const versesPart = m[3];

    if (!versesPart) return [book + " " + firstChapter];

    const pieces = [];
    const segments = versesPart.split(";");
    let currentChapter = firstChapter;

    for (let segRaw of segments) {
      const seg = segRaw.trim();
      if (!seg) continue;

      if (/^\d+\s*:/.test(seg)) {
        const idx = seg.indexOf(":");
        const chStr = seg.slice(0, idx).trim();
        const rest = seg.slice(idx + 1).trim();
        const chNum = parseInt(chStr, 10);
        if (!isNaN(chNum)) currentChapter = String(chNum);
        if (!rest) { pieces.push(book + " " + currentChapter); continue; }
        pieces.push(book + " " + currentChapter + ":" + rest);
      } else {
        pieces.push(book + " " + currentChapter + ":" + seg);
      }
    }

    const seen = new Set();
    const ordered = [];
    for (const p of pieces) {
      const key = p.toLowerCase();
      if (!seen.has(key)) { seen.add(key); ordered.push(p); }
    }
    return ordered.length ? ordered : [ref];
  }

  // Counts-aware expansion
  function expandCrossChapterWithCounts(book, startCh, startVs, endCh, endVs, counts) {
    const sc = parseInt(startCh, 10), ec = parseInt(endCh, 10);
    const sv = parseInt(startVs, 10), ev = parseInt(endVs, 10);
    if (isNaN(sc) || isNaN(ec) || isNaN(sv) || isNaN(ev) || ec < sc) {
      return [book + " " + startCh + ":" + startVs + "-" + endCh + ":" + endVs];
    }
    const out = [];
    for (let ch = sc; ch <= ec; ch++) {
      const last = parseInt(counts[String(ch)], 10);
      if (!last) return [book + " " + startCh + ":" + startVs + "-" + endCh + ":" + endVs];
      const from = ch === sc ? sv : 1;
      const to = ch === ec ? ev : last;
      out.push(book + " " + ch + ":" + from + "-" + to);
    }
    return out;
  }

  // Counts-free fallback expansion (uses 1-999 ranges)
  function expandCrossChapterNoCounts(book, startCh, startVs, endCh, endVs) {
    const sc = parseInt(startCh, 10), ec = parseInt(endCh, 10);
    const sv = parseInt(startVs, 10), ev = parseInt(endVs, 10);
    if (isNaN(sc) || isNaN(ec) || isNaN(sv) || isNaN(ev) || ec < sc) {
      return [book + " " + startCh + ":" + startVs + "-" + endCh + ":" + endVs];
    }
    if (sc === ec) return [book + " " + sc + ":" + sv + "-" + ev];
    const out = [];
    out.push(book + " " + sc + ":" + sv + "-999");
    for (let ch = sc + 1; ch <= ec - 1; ch++) out.push(book + " " + ch + ":1-999");
    out.push(book + " " + ec + ":1-" + ev);
    return out;
  }

  function expandChapterRangeNoCounts(book, startCh, endCh) {
    const sc = parseInt(startCh, 10), ec = parseInt(endCh, 10);
    if (isNaN(sc) || isNaN(ec) || ec < sc) return [book + " " + startCh + "-" + endCh];
    const out = [];
    for (let ch = sc; ch <= ec; ch++) out.push(book + " " + ch + ":1-999");
    return out;
  }

  function expandChapterRangeWithCounts(book, startCh, endCh, counts) {
    const sc = parseInt(startCh, 10), ec = parseInt(endCh, 10);
    if (isNaN(sc) || isNaN(ec) || ec < sc) return [book + " " + startCh + "-" + endCh];
    const out = [];
    for (let ch = sc; ch <= ec; ch++) {
      const last = parseInt(counts[String(ch)], 10);
      if (!last) return [book + " " + startCh + "-" + endCh];
      out.push(book + " " + ch + ":1-" + last);
    }
    return out;
  }

  function expandPiecesWithVerseCounts(pieces) {
    const crossVerses = new RegExp("^\\s*(" + parseBookPattern + ")\\.?\\s+(\\d+):(\\d+)-(?:(\\d+):)?(\\d+)\\s*$", "i");
    const chRange = new RegExp("^\\s*(" + parseBookPattern + ")\\.?\\s+(\\d+)\\s*-\\s*(\\d+)\\s*$", "i");
    const out = [];
    for (const p of pieces) {
      let m = p.match(crossVerses);
      if (m) {
        const book = canonicalizeBookName(m[1]);
        const sc = m[2], sv = m[3], ec = m[4] || m[2], ev = m[5];
        const counts = config.chapterVerseCounts && config.chapterVerseCounts[book];
        if (counts) out.push(...expandCrossChapterWithCounts(book, sc, sv, ec, ev, counts));
        else out.push(...expandCrossChapterNoCounts(book, sc, sv, ec, ev));
        continue;
      }
      m = p.match(chRange);
      if (m) {
        const book = canonicalizeBookName(m[1]);
        const sc = m[2], ec = m[3];
        const counts = config.chapterVerseCounts && config.chapterVerseCounts[book];
        if (counts) out.push(...expandChapterRangeWithCounts(book, sc, ec, counts));
        else out.push(...expandChapterRangeNoCounts(book, sc, ec));
        continue;
      }
      out.push(normalizeRef(p));
    }
    return out;
  }

  // Display formatter - we still keep this, but the header will be overwritten with the exact original text
  function compressRefForDisplay(ref) {
    const mainRe = new RegExp("^\\s*(" + parseBookPattern + ")\\.?\\s+(\\d+)(?::(.*))?\\s*$", "i");
    const m = ref.match(mainRe);
    if (!m) return ref;
    const book = m[1].replace(/\./g, "");
    const firstChapter = m[2];
    const versesPart = m[3];
    if (!versesPart) return book + " " + firstChapter;

    let currentChapter = firstChapter;
    const segments = versesPart.split(";").map(s => s.trim()).filter(Boolean);
    const outSegments = [];
    const crossTailRe = /^\s*(\d+)\s*-\s*(\d+)\s*:\s*(\d+)\s*$/;

    function compressItems(items) {
      const singles = [];
      const ranges = [];
      for (const raw of items) {
        const part = raw.trim();
        if (!part) continue;
        if (/^\d+\s*-\s*\d+$/.test(part)) {
          const [a, b] = part.split("-").map(n => parseInt(n.trim(), 10));
          if (!isNaN(a) && !isNaN(b)) ranges.push([Math.min(a, b), Math.max(a, b)]);
        } else if (/^\d+$/.test(part)) {
          const n = parseInt(part, 10);
          if (!isNaN(n)) singles.push(n);
        } else {
          ranges.push([part, part]);
        }
      }
      singles.sort((a, b) => a - b);
      for (let i = 0; i < singles.length; ) {
        const start = singles[i]; let end = start; i++;
        while (i < singles.length && singles[i] === end + 1) { end = singles[i]; i++; }
        if (end > start) ranges.push([start, end]); else ranges.push([start, start]);
      }
      ranges.sort((a, b) => {
        const a0 = typeof a[0] === "number" ? a[0] : Number.MAX_SAFE_INTEGER;
        const b0 = typeof b[0] === "number" ? b[0] : Number.MAX_SAFE_INTEGER;
        return a0 - b0;
      });
      return ranges.map(([a, b]) => {
        if (typeof a === "number" && typeof b === "number") return a === b ? String(a) : String(a) + "-" + String(b);
        return String(a);
      }).join(", ");
    }

    for (const seg of segments) {
      const ct = seg.match(crossTailRe);
      if (ct) {
        const vStart = ct[1], chEnd = ct[2], vEnd = ct[3];
        outSegments.push(currentChapter + ":" + vStart + "-" + chEnd + ":" + vEnd);
        currentChapter = String(parseInt(chEnd, 10));
        continue;
      }
      if (seg.includes(":")) {
        const idx = seg.indexOf(":");
        const chRaw = seg.slice(0, idx).trim();
        const rest = seg.slice(idx + 1).trim();
        if (!/^\d+$/.test(chRaw)) {
          outSegments.push(currentChapter + ":" + seg);
          continue;
        }
        currentChapter = String(parseInt(chRaw, 10));
        if (!rest) { outSegments.push(currentChapter); continue; }
        const items = rest.split(",");
        outSegments.push(currentChapter + ":" + compressItems(items));
      } else {
        const items = seg.split(",");
        outSegments.push(currentChapter + ":" + compressItems(items));
      }
    }
    return book + " " + outSegments.join("; ");
  }

  // ------------------------------------------------------------
  // 5. Tooltip UI
  // ------------------------------------------------------------
  function injectStyles() {
    const themeName = resolveThemeName();
    const theme = themes[themeName];

    let style = document.getElementById("pbv-styles");
    if (!style) {
      style = document.createElement("style");
      style.id = "pbv-styles";
      if (config.styleNonce) style.setAttribute("nonce", String(config.styleNonce));
      document.head.appendChild(style);
    }

    style.textContent = `
      .pbv-ref { position: relative; display: inline-block; transition: all 0.2s ease; }
      .pbv-ref:hover { opacity: 0.9; }
      .pbv-ref.pbv-active { background: ${theme.highlightBg}; border-radius: 4px; padding: 0 2px; }
      #pbv-tooltip { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; animation: pbvFadeIn 0.2s ease-out; word-break: break-word; overflow-wrap: anywhere; white-space: normal; max-width: 100vw; }
      #pbv-tooltip * { box-sizing: border-box; }
      #pbv-tooltip::-webkit-scrollbar { width: 6px; height: 6px; }
      #pbv-tooltip::-webkit-scrollbar-track { background: transparent; }
      #pbv-tooltip::-webkit-scrollbar-thumb { background: ${theme.scrollbar}; border-radius: 3px; }
      #pbv-tooltip::-webkit-scrollbar-thumb:hover { background: ${theme.scrollbarHover}; }
      @keyframes pbvFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      .pbv-loading { display: inline-flex; align-items: center; gap: 8px; }
      .pbv-loading-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; animation: pbvPulse 1.4s ease-in-out infinite; }
      .pbv-loading-dot:nth-child(2) { animation-delay: 0.2s; }
      .pbv-loading-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes pbvPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      @media (max-width: 768px) { #pbv-tooltip { font-size: 16px !important; line-height: 1.7 !important; } .pbv-ref { padding: 2px 4px; margin: -2px -4px; } }
      @media (hover: none) { .pbv-ref { -webkit-tap-highlight-color: transparent; touch-action: manipulation; } }
    `;
  }

  function createTooltip() {
    const tip = document.createElement("div");
    tip.id = "pbv-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-live", "polite");
    tip.setAttribute("tabindex", "-1");

    const theme = themes[resolveThemeName()];
    const mobile = isMobileMode();
    const maxWidth = mobile ? config.mobileMaxWidth : config.maxWidth;

    Object.assign(tip.style, {
      position: "fixed",
      maxWidth: String(maxWidth) + "px",
      width: mobile ? "calc(100vw - 32px)" : "auto",
      background: theme.solidBackground,
      backgroundImage: theme.background,
      border: "1px solid " + theme.border,
      borderRadius: mobile ? "14px" : "12px",
      boxShadow: mobile ? theme.mobileShadow : theme.shadow,
      zIndex: 2147483647,
      display: "none",
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      fontSize: mobile ? "16px" : "14px",
      lineHeight: mobile ? "1.75" : "1.65",
      color: theme.text,
      opacity: "0",
      transition: config.enableAnimations ? "opacity 0.2s ease-out, transform 0.2s ease-out" : "none",
      pointerEvents: "auto",
      contain: "layout style",
      overflowY: "auto",
      overflowX: "hidden",
      maxHeight: mobile ? "60vh" : "80vh",
      WebkitOverflowScrolling: "touch",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      boxSizing: "border-box",
      overscrollBehavior: "contain",
      padding: mobile ? "14px 16px" : "12px 14px"
    });

    // Mobile swipe to dismiss
    let tipStartY = 0;
    tip.addEventListener("touchstart", (e) => {
      if (!e.touches || !e.touches.length) return;
      tipStartY = e.touches[0].clientY;
    }, { passive: true });
    tip.addEventListener("touchmove", (e) => {
      if (!e.touches || !e.touches.length) return;
      const deltaY = e.touches[0].clientY - tipStartY;
      if (deltaY > 50) hideTooltip(true);
    }, { passive: true });

    tip.addEventListener("mouseenter", () => { overTooltip = true; clearTimeout(hideTimeout); });
    tip.addEventListener("mouseleave", (e) => {
      overTooltip = false;
      const rt = e.relatedTarget;
      if (rt && rt.closest && rt.closest(".pbv-ref")) return;
      hideTooltip(false);
    });

    const updatePosition = () => {
      if (tip.style.display === "block" && currentTarget) {
        requestAnimationFrame(() => repositionToPinnedAnchor(currentTarget));
      }
    };
    tip._updatePosition = updatePosition;

    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });
    window.addEventListener("orientationchange", updatePosition);

    document.body.appendChild(tip);
    return tip;
  }

  function initTooltip() {
    if (!tooltip) {
      injectStyles();
      tooltip = createTooltip();
    }
  }

  function positionTooltipAt(x, y, target) {
    const mobile = isMobileMode();
    const tipRect = tooltip.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    if (mobile) {
      const left = Math.max(16, Math.min(window.innerWidth - tipRect.width - 16, (window.innerWidth - tipRect.width) / 2));
      let top;
      const spaceAbove = targetRect.top;
      const spaceBelow = window.innerHeight - targetRect.bottom;

      if (config.position === "top") top = targetRect.top - tipRect.height - 10;
      else if (config.position === "bottom") top = targetRect.bottom + 10;
      else top = (spaceBelow > tipRect.height + 20 || spaceBelow > spaceAbove) ? targetRect.bottom + 10 : targetRect.top - tipRect.height - 10;

      tooltip.style.left = String(left) + "px";
      tooltip.style.top = String(Math.max(16, Math.min(top, window.innerHeight - tipRect.height - 16))) + "px";
    } else {
      let left = x + 15, top = y + 15;
      if (left + tipRect.width > window.innerWidth - 20) left = x - tipRect.width - 15;
      if (left < 20) left = 20;
      if (config.position === "top") top = targetRect.top - tipRect.height - 10;
      else if (config.position === "bottom") top = targetRect.bottom + 10;
      else if (top + tipRect.height > window.innerHeight - 20) top = targetRect.top - tipRect.height - 10;
      tooltip.style.left = String(left) + "px";
      tooltip.style.top = String(Math.max(20, top)) + "px";
    }
  }

  function repositionToPinnedAnchor(target) {
    const r = target.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top;
    positionTooltipAt(x, y, target);
  }

  function attachTooltipKbdHandler(triggerEl) {
    if (!tooltip) return;
    if (tooltip._kbdHandler) tooltip.removeEventListener("keydown", tooltip._kbdHandler);
    const handler = (e) => {
      if (e.key === "Escape") {
        try { triggerEl.focus({ preventScroll: true }); } catch {}
        hideTooltip(true);
      }
    };
    tooltip._kbdHandler = handler;
    tooltip.addEventListener("keydown", handler);
  }

  function showTooltip(contentNode, x, y, target) {
    clearTimeout(hideTimeout);
    initTooltip();
    currentTarget = target;

    target.classList.add("pbv-active");
    target.setAttribute("aria-expanded", "true");
    target.setAttribute("aria-controls", "pbv-tooltip");

    tooltip.innerHTML = "";
    tooltip.appendChild(contentNode);

    tooltip.style.display = "block";
    positionTooltipAt(x, y, target);

    requestAnimationFrame(() => {
      tooltip.style.opacity = "1";
      if (config.enableAnimations && !isMobileMode()) tooltip.style.transform = "translateY(0)";
    });

    if (config.analytics && window.gtag) {
      window.gtag("event", "verse_preview", { event_category: "engagement", event_label: target.dataset.ref });
    }
  }

  function actuallyHideTooltip() {
    if (!tooltip) return;
    abortAllActiveRequests();
    document.querySelectorAll(".pbv-active").forEach(el => {
      el.classList.remove("pbv-active");
      el.setAttribute("aria-expanded", "false");
    });
    tooltip.style.opacity = "0";
    if (config.enableAnimations && !isMobileMode()) tooltip.style.transform = "translateY(4px)";
    setTimeout(() => {
      if (tooltip) { tooltip.style.display = "none"; currentTarget = null; }
    }, 200);
  }

  function hideTooltip(immediate) {
    clearTimeout(hideTimeout);
    if (immediate) { actuallyHideTooltip(); return; }
    hideTimeout = setTimeout(() => {
      if (!overTooltip && !overAnyRef) actuallyHideTooltip();
    }, config.hideDelayMs);
  }

  function bookNameToSlug(bookName) {
    const map = {
      "Genesis": "genesis",
      "Exodus": "exodus",
      "Leviticus": "leviticus",
      "Numbers": "numbers",
      "Deuteronomy": "deuteronomy",
      "Joshua": "joshua",
      "Judges": "judges",
      "Ruth": "ruth",
      "1 Samuel": "1-samuel",
      "2 Samuel": "2-samuel",
      "1 Kings": "1-kings",
      "2 Kings": "2-kings",
      "1 Chronicles": "1-chronicles",
      "2 Chronicles": "2-chronicles",
      "Ezra": "ezra",
      "Nehemiah": "nehemiah",
      "Esther": "esther",
      "Job": "job",
      "Psalms": "psalms",
      "Psalm": "psalms",
      "Proverbs": "proverbs",
      "Ecclesiastes": "ecclesiastes",
      "Song of Solomon": "song-of-solomon",
      "Song of Songs": "song-of-solomon",
      "Isaiah": "isaiah",
      "Jeremiah": "jeremiah",
      "Lamentations": "lamentations",
      "Ezekiel": "ezekiel",
      "Daniel": "daniel",
      "Hosea": "hosea",
      "Joel": "joel",
      "Amos": "amos",
      "Obadiah": "obadiah",
      "Jonah": "jonah",
      "Micah": "micah",
      "Nahum": "nahum",
      "Habakkuk": "habakkuk",
      "Zephaniah": "zephaniah",
      "Haggai": "haggai",
      "Zechariah": "zechariah",
      "Malachi": "malachi",
      "Matthew": "matthew",
      "Matt": "matthew",
      "Mt": "matthew",
      "Mat": "matthew",
      "Mark": "mark",
      "Luke": "luke",
      "John": "john",
      "Acts": "acts",
      "Romans": "romans",
      "1 Corinthians": "1-corinthians",
      "2 Corinthians": "2-corinthians",
      "Galatians": "galatians",
      "Ephesians": "ephesians",
      "Philippians": "philippians",
      "Colossians": "colossians",
      "1 Thessalonians": "1-thessalonians",
      "2 Thessalonians": "2-thessalonians",
      "1 Timothy": "1-timothy",
      "2 Timothy": "2-timothy",
      "Titus": "titus",
      "Philemon": "philemon",
      "Hebrews": "hebrews",
      "James": "james",
      "1 Peter": "1-peter",
      "2 Peter": "2-peter",
      "1 John": "1-john",
      "2 John": "2-john",
      "3 John": "3-john",
      "Jude": "jude",
      "Revelation": "revelation"
    };
    const normalized = String(bookName).trim().replace(/\s+/g, " ");
    return map[normalized] || normalized.toLowerCase().replace(/\s+/g, "-");
  }

  function buildChapterUrl(ref, translation) {
    const refRe = new RegExp("^\\s*(" + parseBookPattern + ")\\.?\\s+(\\d+)(?::(\\d+))?", "i");
    const m = String(ref).match(refRe);
    if (!m) return "https://primebible.com/?ref=embed";

    const book = canonicalizeBookName(m[1]);
    const chapter = m[2];
    const verse = m[3];

    const bookSlug = bookNameToSlug(book);
    const trans = String(translation || "kjv").toLowerCase();

    let url = "https://primebible.com/" + trans + "/" + bookSlug + "/" + chapter;
    if (verse) url += "#verse-" + verse;
    url += "?ref=embed";
    return url;
  }

  // ------------------------------------------------------------
  // 6. Content building
  // ------------------------------------------------------------
  function createLoadingNode(ref) {
    const theme = themes[resolveThemeName()];
    const frag = document.createDocumentFragment();
    const container = document.createElement("div");
    container.style.cssText = "padding: 20px; text-align: center; color: " + theme.reference + ";";
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "pbv-loading";
    loadingDiv.style.cssText = "display: inline-flex; align-items: center; gap: 8px; margin-bottom: 8px;";
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.className = "pbv-loading-dot";
      loadingDiv.appendChild(dot);
    }
    container.appendChild(loadingDiv);
    const text = document.createElement("div");
    text.style.fontSize = "13px";
    text.textContent = "Loading " + ref;
    container.appendChild(text);
    frag.appendChild(container);
    return frag;
  }

  // NOTE: header includes a span[data-pbv-ref] we will overwrite with the user's exact matched string
  function buildTooltipContent(refForDisplay, translation, textParts) {
    const theme = themes[resolveThemeName()];
    const mobile = isMobileMode();
    const frag = document.createDocumentFragment();

    if (config.showReference) {
      const header = document.createElement("div");
      header.style.cssText = `
        font-weight: 650;
        margin-bottom: ${mobile ? "16px" : "12px"};
        padding-bottom: ${mobile ? "12px" : "10px"};
        border-bottom: 1px solid ${theme.border};
        color: ${theme.reference};
        font-size: ${mobile ? "17px" : "15px"};
        letter-spacing: -0.01em;
      `;
      const refText = document.createElement("span");
      refText.setAttribute("data-pbv-ref", "1");
      // initial value uses compressor, but we will overwrite it to the exact original after showTooltip()
      refText.textContent = compressRefForDisplay(refForDisplay);
      header.appendChild(refText);

      const translationBadge = document.createElement("span");
      translationBadge.style.cssText = `
        margin-left: 10px;
        padding: 3px 7px;
        background: ${theme === themes.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"};
        border-radius: 6px;
        font-size: ${mobile ? "13px" : "12px"};
        font-weight: 600;
        opacity: 0.9;
      `;
      translationBadge.textContent = translation;
      header.appendChild(translationBadge);
      frag.appendChild(header);
    }

    const body = document.createElement("div");
    body.style.cssText = `
      padding: ${mobile ? "0 16px 16px" : "0 14px 12px"};
      max-height: ${mobile ? "42vh" : "60vh"};
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      width: 100%;
      max-width: 100%;
    `;

    const styleVerseNumbers = (node) => {
      const verseNums = node.querySelectorAll(".verse-num, sup");
      verseNums.forEach(num => {
        num.style.cssText = `
          color: ${theme.verseNumber};
          font-size: 0.85em;
          font-weight: 600;
          margin-right: 4px;
          opacity: 0.7;
        `;
      });
    };

    textParts.forEach((t, idx) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        margin-bottom: ${idx < textParts.length - 1 ? (mobile ? "12px" : "10px") : "0"};
        line-height: ${mobile ? "1.85" : "1.75"};
        overflow-wrap: anywhere;
        word-break: break-word;
      `;
      const content = sanitizeApiHtml(t);
      wrapper.appendChild(content);
      styleVerseNumbers(wrapper);
      body.appendChild(wrapper);
    });

    frag.appendChild(body);

    if (config.showFooter) {
      const footer = document.createElement("div");
      footer.style.cssText = `
        margin: ${mobile ? "0" : "0"};
        padding: ${mobile ? "12px 16px 16px" : "10px 14px 12px"};
        background: ${theme.footerBg};
        border-top: 1px solid ${theme.footerBorder};
        border-radius: 0 0 ${mobile ? "14px" : "12px"} ${mobile ? "14px" : "12px"};
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: ${mobile ? "13px" : "12px"};
        color: ${theme.footerText};
      `;

      const branding = document.createElement("a");
      branding.href = "https://primebible.com/?ref=embed";
      branding.target = "_blank";
      branding.rel = "noopener noreferrer nofollow";
      branding.style.cssText = `
        color: ${theme.footerLink};
        text-decoration: none;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: opacity 0.2s ease;
      `;
      branding.onmouseover = () => branding.style.opacity = "0.85";
      branding.onmouseout = () => branding.style.opacity = "1";
      const icon = document.createElement("span");
      icon.innerHTML = "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"></path><path d=\"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\"></path><line x1=\"12\" y1=\"6\" x2=\"12\" y2=\"14\"></line><line x1=\"8\" y1=\"10\" x2=\"16\" y2=\"10\"></line></svg>";
      branding.appendChild(icon);
      const brandText = document.createElement("span");
      brandText.textContent = "Powered by PrimeBible";
      branding.appendChild(brandText);
      footer.appendChild(branding);

      const readLink = document.createElement("a");
      readLink.href = buildChapterUrl(refForDisplay, translation);
      readLink.target = "_blank";
      readLink.rel = "noopener noreferrer";
      readLink.style.cssText = `
        color: ${theme.footerLink};
        text-decoration: none;
        font-weight: 600;
        font-size: ${mobile ? "12px" : "12px"};
        opacity: 0.9;
        transition: opacity 0.2s ease;
      `;
      readLink.textContent = "Read full chapter ->";
      readLink.setAttribute("aria-label", "Read full chapter for " + refForDisplay);
      readLink.onmouseover = () => readLink.style.opacity = "1";
      readLink.onmouseout = () => readLink.style.opacity = "0.9";
      footer.appendChild(readLink);

      frag.appendChild(footer);
    }

    return frag;
  }

  function buildErrorContent(ref, error, translation) {
    const activeTranslation = translation || config.translation;
    const theme = themes[resolveThemeName()];
    const frag = document.createDocumentFragment();
    const container = document.createElement("div");
    container.style.cssText = "padding: 20px; text-align: center;";
    const icon = document.createElement("div");
    icon.innerHTML = "<svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"" + theme.text + "\" stroke-width=\"1.5\" opacity=\"0.3\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"></line><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"></line></svg>";
    icon.style.marginBottom = "12px";
    container.appendChild(icon);
    const message = document.createElement("div");
    message.style.cssText = "color: " + theme.text + "; font-size: 14px; margin-bottom: 8px; opacity: 0.7;";
    message.textContent = "Unable to load " + ref;
    container.appendChild(message);
    const retry = document.createElement("button");
    retry.style.cssText = "background: " + theme.footerLink + "; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: opacity 0.2s ease;";
    retry.textContent = "Try Again";
    retry.onclick = async () => {
      const cacheKey = normalizeRef(ref) + "::" + activeTranslation;
      cache.delete(cacheKey);
      cacheTimestamps.delete(cacheKey);
      const content = await fetchPassage(ref, null, activeTranslation);
      tooltip.innerHTML = "";
      tooltip.appendChild(content);
    };
    retry.onmouseover = () => retry.style.opacity = "0.85";
    retry.onmouseout = () => retry.style.opacity = "1";
    container.appendChild(retry);
    frag.appendChild(container);
    return frag;
  }

  // ------------------------------------------------------------
  // 7. Fetch passage and cache
  // ------------------------------------------------------------
  async function fetchPassage(rawRef, externalSignal, translationOverride) {
    const activeTranslation = translationOverride || config.translation;
    const normalized = normalizeRef(rawRef);
    const cacheKey = normalized + "::" + activeTranslation;

    if (cache.has(cacheKey) && !isExpired(cacheKey)) {
      const factory = cache.get(cacheKey);
      return factory(); // creates a fresh Node each time
    }
    if (pending.has(cacheKey)) return pending.get(cacheKey);

    const p = (async () => {
      try {
        const basePieces = splitRefIntoPieces(normalized);
        const pieces = expandPiecesWithVerseCounts(basePieces);
        const limit = pLimit(Math.max(1, config.maxConcurrentFetches || 4));
        const texts = await Promise.all(
          pieces.map(piece =>
            limit(() => fetchSingleRef(piece, activeTranslation, externalSignal))
              .catch(() => "[Unable to load: " + piece + "]")
          )
        );
        const factory = () => buildTooltipContent(normalized, activeTranslation, texts);
        cache.set(cacheKey, factory);
        cacheTimestamps.set(cacheKey, Date.now());
        manageCacheSize();
        return factory();
      } catch (err) {
        if (typeof config.onError === "function") {
          try { config.onError(err, normalized); } catch {}
        }
        const factory = () => buildErrorContent(normalized, err, activeTranslation);
        cache.set(cacheKey, factory);
        cacheTimestamps.set(cacheKey, Date.now());
        const t = setTimeout(() => {
          cache.delete(cacheKey);
          cacheTimestamps.delete(cacheKey);
          errorEvictionTimers.delete(t);
        }, 60000);
        errorEvictionTimers.add(t);
        return factory();
      } finally {
        pending.delete(cacheKey);
      }
    })();

    pending.set(cacheKey, p);
    return p;
  }

  // ------------------------------------------------------------
  // 8. Interactive wiring (header override to exact original text)
  // ------------------------------------------------------------
  function refForElement(span) {
    return span.dataset.refNormalized || span.dataset.ref || (span.textContent || "").trim();
  }

  function translationForElement(span) {
    return span.dataset.translation || config.translation;
  }

  function prefetchNearbyRefs(span) {
    if (!config.prefetch) return;
    const allRefs = document.querySelectorAll(".pbv-ref");
    const currentIdx = Array.from(allRefs).indexOf(span);
    [-1, 1].forEach(offset => {
      const nearbyRef = allRefs[currentIdx + offset];
      if (nearbyRef && nearbyRef.dataset.refNormalized) {
        requestIdleCallback(() => {
          fetchPassage(refForElement(nearbyRef), null, translationForElement(nearbyRef)).catch(() => {});
        }, { timeout: 2000 });
      }
    });
  }

  function makeInteractive(span) {
    if (span.dataset.pbvBound === "1") return;
    span.dataset.pbvBound = "1";

    const mobile = isMobileMode();
    const theme = themes[resolveThemeName()];

    span.style.cssText = `
      cursor: ${mobile ? "pointer" : "help"};
      text-decoration: underline;
      text-decoration-style: ${mobile ? "solid" : "dotted"};
      text-decoration-color: ${theme === themes.dark ? "rgba(147, 197, 253, 0.5)" : "rgba(59, 130, 246, 0.4)"};
      text-underline-offset: 3px;
      text-decoration-thickness: ${mobile ? "2px" : "1px"};
      transition: all 0.2s ease;
      position: relative;
      display: inline-block;
    `;

    span.setAttribute("role", "button");
    span.setAttribute("tabindex", "0");
    span.setAttribute("aria-label", "View " + span.dataset.ref);
    span.setAttribute("aria-expanded", "false");
    span.setAttribute("aria-controls", "pbv-tooltip");

    let localTouchTimer = null;
    let isLongPress = false;

    // Desktop hover
    if (!hasTouch()) {
      span.addEventListener("mouseenter", (e) => {
        overAnyRef = true;
        clearTimeout(hideTimeout);
        span.style.textDecorationColor = theme === themes.dark ? "rgba(147, 197, 253, 0.8)" : "rgba(59, 130, 246, 0.7)";
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(async () => {
          initTooltip();
          const prev = requestControllers.get(span);
          if (prev) { try { prev.abort(); } catch {} activeControllers.delete(prev); }
          const ctrl = new AbortController();
          requestControllers.set(span, ctrl);
          activeControllers.add(ctrl);
          const token = {};
          openTokenByEl.set(span, token);
          const loading = createLoadingNode(refForElement(span));
          showTooltip(loading, e.clientX, e.clientY, span);
          try {
            const content = await fetchPassage(refForElement(span), ctrl.signal, translationForElement(span));
            if (ctrl.signal.aborted) return;
            if (openTokenByEl.get(span) !== token || currentTarget !== span) return;
            showTooltip(content, e.clientX, e.clientY, span);
            // overwrite header with exact original text
            const hdr = tooltip && tooltip.querySelector("[data-pbv-ref]");
            if (hdr) hdr.textContent = span.dataset.ref.trim();
            prefetchNearbyRefs(span);
          } finally {
            activeControllers.delete(ctrl);
          }
        }, config.hoverDelayMs);
      });

      span.addEventListener("mousemove", (e) => {
        if (!tooltip || tooltip.style.display !== "block") return;
        if (currentTarget !== span) return;
        positionTooltipAt(e.clientX, e.clientY, span);
      });

      span.addEventListener("mouseleave", (e) => {
        clearTimeout(hoverTimer);
        const rt = e.relatedTarget;
        if (rt && rt.closest && (rt.closest(".pbv-ref") || rt.closest("#pbv-tooltip"))) {
          // staying in interactive region
        } else {
          overAnyRef = false;
          hideTooltip(false);
        }
        span.style.textDecorationColor = theme === themes.dark ? "rgba(147, 197, 253, 0.5)" : "rgba(59, 130, 246, 0.4)";
      });
    }

    // Mobile touch
    if (hasTouch()) {
      span.addEventListener("touchstart", (e) => {
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isLongPress = false;
        clearTimeout(localTouchTimer);
        localTouchTimer = setTimeout(() => {
          isLongPress = true;
          if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
          span.style.transform = "scale(0.95)";
          setTimeout(() => span.style.transform = "", 100);
        }, config.longPressMs);
      }, { passive: true });

      span.addEventListener("touchmove", (e) => {
        const moveX = Math.abs(e.touches[0].clientX - touchStartX);
        const moveY = Math.abs(e.touches[0].clientY - touchStartY);
        if (moveX > 10 || moveY > 10) { clearTimeout(localTouchTimer); isLongPress = false; }
      }, { passive: true });

      span.addEventListener("touchend", async (e) => {
        clearTimeout(localTouchTimer);
        const touchDuration = Date.now() - touchStartTime;
        if (isLongPress || touchDuration < 500) {
          e.preventDefault();
          initTooltip();
          const rect = span.getBoundingClientRect();
          if (tooltip && currentTarget === span && tooltip.style.display === "block") { hideTooltip(true); return; }
          const prevCtrl = requestControllers.get(span);
          if (prevCtrl) { try { prevCtrl.abort(); } catch {} activeControllers.delete(prevCtrl); }
          const ctrl = new AbortController();
          requestControllers.set(span, ctrl);
          activeControllers.add(ctrl);
          const token = {};
          openTokenByEl.set(span, token);
          const loading = createLoadingNode(refForElement(span));
          showTooltip(loading, rect.left + rect.width / 2, rect.top, span);
          try {
            const content = await fetchPassage(refForElement(span), ctrl.signal, translationForElement(span));
            if (ctrl.signal.aborted) return;
            if (openTokenByEl.get(span) !== token || currentTarget !== span) return;
            showTooltip(content, rect.left + rect.width / 2, rect.top, span);
            const hdr = tooltip && tooltip.querySelector("[data-pbv-ref]");
            if (hdr) hdr.textContent = span.dataset.ref.trim();
            prefetchNearbyRefs(span);
          } finally {
            activeControllers.delete(ctrl);
          }
        }
      }, { passive: false });
    }

    // Keyboard
    span.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      initTooltip();
      const rect = span.getBoundingClientRect();
      const prev = requestControllers.get(span);
      if (prev) { try { prev.abort(); } catch {} activeControllers.delete(prev); }
      const ctrl = new AbortController();
      requestControllers.set(span, ctrl);
      activeControllers.add(ctrl);
      const token = {};
      openTokenByEl.set(span, token);
      const loading = createLoadingNode(refForElement(span));
      showTooltip(loading, rect.left + rect.width / 2, rect.top, span);
      try {
        const content = await fetchPassage(refForElement(span), ctrl.signal, translationForElement(span));
        if (ctrl.signal.aborted) return;
        if (openTokenByEl.get(span) !== token || currentTarget !== span) return;
        showTooltip(content, rect.left + rect.width / 2, rect.top, span);
        if (tooltip) { tooltip.focus(); attachTooltipKbdHandler(span); }
        const hdr = tooltip && tooltip.querySelector("[data-pbv-ref]");
        if (hdr) hdr.textContent = span.dataset.ref.trim();
        prefetchNearbyRefs(span);
      } finally {
        activeControllers.delete(ctrl);
      }
    });

    span.addEventListener("focus", () => {
      span.style.outline = "2px solid " + (themes[resolveThemeName()] === themes.dark ? "#60a5fa" : "#2563eb");
      span.style.outlineOffset = "2px";
      span.style.borderRadius = "3px";
    });
    span.addEventListener("blur", () => { span.style.outline = "none"; });
  }

  // ------------------------------------------------------------
  // 9. Scanning
  // ------------------------------------------------------------
  function bindExistingRefs(root) {
    const refs = [];
    if (root && root.nodeType === Node.ELEMENT_NODE && root.matches && root.matches(".pbv-ref")) refs.push(root);
    if (root && root.querySelectorAll) {
      root.querySelectorAll(".pbv-ref").forEach(el => refs.push(el));
    }

    refs.forEach(span => {
      if (!span.dataset.ref) span.dataset.ref = (span.textContent || "").trim();
      if (!span.dataset.refNormalized && span.dataset.ref) span.dataset.refNormalized = normalizeRef(span.dataset.ref);
      if (span.dataset.translation) span.dataset.translation = String(span.dataset.translation).trim().toUpperCase();
      if (span.dataset.ref) makeInteractive(span);
    });
  }

  function closestSafe(element, selector) {
    if (!element || !element.closest || !selector) return null;
    try {
      return element.closest(selector);
    } catch (err) {
      if (config.debug && typeof console !== "undefined" && console.warn) console.warn("PrimeBible: invalid exclude selector", selector, err);
      return null;
    }
  }

  function shouldProcessNode(node) {
    if (!node.parentNode) return false;
    const excludeSelector = config.excludeSelectors.join(",");
    if (closestSafe(node.parentNode, excludeSelector)) return false;
    if (closestSafe(node.parentNode, ".pbv-ref, #pbv-tooltip")) return false;
    const val = node.nodeValue || "";
    if (!referenceTestRegex.test(val)) return false;
    if (val.length > config.maxNodeTextLength) return false;
    return true;
  }

  function processTextNode(node) {
    const text = node.nodeValue || "";
    referenceRegex.lastIndex = 0;

    let hasMatches = false;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    let guardMatches = 0;

    while ((match = referenceRegex.exec(text))) {
      guardMatches++;
      if (guardMatches > config.maxMatchesPerNode) break;

      hasMatches = true;
      const before = text.slice(lastIndex, match.index);
      if (before) fragment.appendChild(document.createTextNode(before));

      const matchedRef = match[0];
      const normalizedRef = normalizeRef(matchedRef);

      const span = document.createElement("span");
      span.className = "pbv-ref";
      span.textContent = matchedRef;             // visible text stays exactly as in content
      span.dataset.ref = matchedRef.trim();      // original for header override
      span.dataset.refNormalized = normalizedRef; // used for fetching
      makeInteractive(span);
      fragment.appendChild(span);

      lastIndex = referenceRegex.lastIndex;
    }

    if (hasMatches) {
      const after = text.slice(lastIndex);
      if (after) fragment.appendChild(document.createTextNode(after));
      if (node.parentNode) node.parentNode.replaceChild(fragment, node);
    }
  }

  function scanElement(root, options = {}) {
    const { immediate = false } = options;
    const walk = () => {
      bindExistingRefs(root);
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        { acceptNode(node) { return shouldProcessNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } },
        false
      );
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      if (immediate) nodes.forEach(processTextNode);
      else {
        const chunkSize = 10;
        let idx = 0;
        const step = () => {
          const chunk = nodes.slice(idx, idx + chunkSize);
          chunk.forEach(processTextNode);
          idx += chunkSize;
          if (idx < nodes.length) requestIdleCallback(step);
        };
        step();
      }
    };
    if (immediate) walk();
    else requestIdleCallback(walk, { timeout: 1000 });
  }

  function observeForLazyScan(rootScope) {
    if (!("IntersectionObserver" in window)) {
      scanElement(rootScope.body ? rootScope.body : rootScope, { immediate: true });
      return;
    }
    if (!intersectionObserver) {
      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const el = entry.target;
          if (entry.isIntersecting && !el.dataset.pbvProcessed) {
            scanElement(el, { immediate: true });
            el.dataset.pbvProcessed = "true";
            intersectionObserver.unobserve(el);
            el.removeAttribute("data-pbv-observed");
          }
        });
      }, { rootMargin: "100px" });
    }
    const root = rootScope.body ? rootScope.body : rootScope;
    const candidates = root.querySelectorAll("article, section, main, aside, p, li, h1, h2, h3, h4, h5, h6, blockquote, div");
    candidates.forEach(el => {
      if (!el.dataset.pbvObserved) {
        el.dataset.pbvObserved = "true";
        intersectionObserver.observe(el);
      }
    });
  }

  // ------------------------------------------------------------
  // 10. Init and public API
  // ------------------------------------------------------------
  let observer = null;

  function init() {
    injectStyles();

    const initScan = () => {
      if (config.lazyScan) observeForLazyScan(document);
      else scanElement(document.body, { immediate: true });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initScan, { once: true });
    else initScan();

    let mutationTimeout = null;
    const mutationsQueue = new Set();

    const processMutations = () => {
      mutationsQueue.forEach(node => {
        if (!node) return;
        if (intersectionObserver && config.lazyScan && node.nodeType === Node.ELEMENT_NODE) {
          observeForLazyScan(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
          if (shouldProcessNode(node) && node.parentNode) scanElement(node.parentNode, { immediate: false });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          scanElement(node, { immediate: false });
        }
      });
      mutationsQueue.clear();
    };

    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData") mutationsQueue.add(m.target);
        if (m.addedNodes) m.addedNodes.forEach(n => mutationsQueue.add(n));
      }
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(processMutations, 100);
    });

    observedBody = document.body;
    observer.observe(observedBody, { childList: true, subtree: true, characterData: true, attributes: false });

    bodySwapObserver = new MutationObserver(() => {
      if (document.body && document.body !== observedBody) {
        if (observer) observer.disconnect();
        observedBody = document.body;
        if (observer) observer.observe(observedBody, { childList: true, subtree: true, characterData: true, attributes: false });
        if (config.lazyScan) observeForLazyScan(document); else scanElement(observedBody, { immediate: true });
      }
    });
    bodySwapObserver.observe(document.documentElement, { childList: true, subtree: true });

    if (window.matchMedia) {
      const q = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        if (config.theme === "system") {
          injectStyles();
          if (tooltip) {
            const theme = themes[resolveThemeName()];
            tooltip.style.background = theme.solidBackground;
            tooltip.style.backgroundImage = theme.background;
            tooltip.style.color = theme.text;
            tooltip.style.borderColor = theme.border;
            tooltip.style.boxShadow = isMobileMode() ? theme.mobileShadow : theme.shadow;
          }
          cache.clear();
          cacheTimestamps.clear();
        }
      };
      if (q.addEventListener) {
        addManagedListener(q, "change", onChange);
      } else if (q.addListener) {
        q.addListener(onChange);
        globalCleanup.push(() => { try { q.removeListener(onChange); } catch {} });
      }
    }
  }

  // Unit tests: run in console with PrimeBible.runTests()
  function runTests() {
    const results = [];
    function eq(name, got, want) {
      const ok = Array.isArray(want) ? JSON.stringify(got) === JSON.stringify(want) : got === want;
      results.push({ name, ok, got, want });
      if (!ok || config.debug) console.log(name, ok ? "OK" : "FAIL", { got, want });
    }

    // Header display compression should keep cross-chapter shape (but header will be overwritten to exact original anyway)
    eq("display John 3:16-4:2", compressRefForDisplay("John 3:16-4:2"), "John 3:16-4:2");
    eq("display Genesis 1:31-2:3", compressRefForDisplay("Genesis 1:31-2:3"), "Genesis 1:31-2:3");
    eq("display Mat. 5:3-12", compressRefForDisplay("Mat. 5:3-12"), "Mat 5:3-12");
    eq("display 1 Cor. 13:1-13; 14:1", compressRefForDisplay("1 Cor. 13:1-13; 14:1"), "1 Cor 13:1-13; 14:1");

    // Detection must NOT match everyday prose (v2.5.3 regression tests)
    eq("no-match 'there is 5'", referenceTestRegex.test("There is 5 of them"), false);
    eq("no-match 'I am 24'", referenceTestRegex.test("I am 24 years old"), false);
    eq("no-match 'so 3 people'", referenceTestRegex.test("so 3 people came"), false);
    eq("no-match 'Act 2 of the play'", referenceTestRegex.test("Act 2 of the play"), false);
    eq("no-match 'is 2,000'", referenceTestRegex.test("the price is 2,000 dollars"), false);
    eq("no-match time 'Luke 3pm'", referenceTestRegex.test("meet Luke 3pm sharp"), false);
    eq("no-match year 'Rev 2026'", referenceTestRegex.test("Rev 2026 edition"), false);
    eq("no-match ordinal 'John 3rd'", referenceTestRegex.test("John 3rd of his name"), false);

    // Detection must still match real references
    eq("match 'John 3:16'", referenceTestRegex.test("John 3:16 is famous"), true);
    eq("match 'Ps 23:1'", referenceTestRegex.test("read Ps 23:1 today"), true);
    eq("match 'Jn 3:16'", referenceTestRegex.test("see Jn 3:16"), true);
    eq("match '1 Cor 13:4-7'", referenceTestRegex.test("love is 1 Cor 13:4-7"), true);
    eq("match 'Mat. 5:3-12'", referenceTestRegex.test("Mat. 5:3-12"), true);
    eq("match 'Genesis 1'", referenceTestRegex.test("Genesis 1 tells us"), true);

    // Fetch normalization should send canonical book names to the API
    eq("normalize Ac", normalizeRef("Ac 2:1"), "Acts 2:1");
    eq("normalize Rm", normalizeRef("Rm 8:1-4"), "Romans 8:1-4");
    eq("normalize Ga", normalizeRef("Ga 5:22"), "Galatians 5:22");
    eq("normalize Lu", normalizeRef("Lu 2:1"), "Luke 2:1");
    eq("normalize compact 2Sa", normalizeRef("2Sa 7:12-16"), "2 Samuel 7:12-16");

    // Split pieces
    eq("split John 3:16-4:2", splitRefIntoPieces("John 3:16-4:2"), ["John 3:16-4:2"]);
    eq("split Genesis 1:31-2:3", splitRefIntoPieces("Genesis 1:31-2:3"), ["Genesis 1:31-2:3"]);
    eq("split 1 Cor. 13:1-13; 14:1", splitRefIntoPieces("1 Cor. 13:1-13; 14:1"), ["1 Corinthians 13:1-13", "1 Corinthians 14:1"]);
    eq("split Ac shorthand", splitRefIntoPieces("Ac 2:1-4; 3:1"), ["Acts 2:1-4", "Acts 3:1"]);

    // Bundled counts expansion
    eq("expand bundled-counts John 3:16-4:2",
      expandPiecesWithVerseCounts(["John 3:16-4:2"]),
      ["John 3:16-36", "John 4:1-2"]
    );
    eq("expand bundled-counts Genesis 1:31-2:3",
      expandPiecesWithVerseCounts(["Genesis 1:31-2:3"]),
      ["Genesis 1:31-31", "Genesis 2:1-3"]
    );

    // No-counts fallback expansion
    const savedCounts = config.chapterVerseCounts;
    config.chapterVerseCounts = null;
    eq("expand no-counts John 3:16-4:2",
      expandPiecesWithVerseCounts(["John 3:16-4:2"]),
      ["John 3:16-999", "John 4:1-2"]
    );
    eq("expand no-counts Genesis 1:31-2:3",
      expandPiecesWithVerseCounts(["Genesis 1:31-2:3"]),
      ["Genesis 1:31-999", "Genesis 2:1-3"]
    );
    eq("expand no-counts John 3-4",
      expandPiecesWithVerseCounts(["John 3-4"]),
      ["John 3:1-999", "John 4:1-999"]
    );
    eq("expand shorthand no-counts 2Sa 7-8",
      expandPiecesWithVerseCounts(["2Sa 7-8"]),
      ["2 Samuel 7:1-999", "2 Samuel 8:1-999"]
    );
    config.chapterVerseCounts = savedCounts;

    return { ok: results.every(r => r.ok), results };
  }

  // ------------------------------------------------------------
  // 11. Public API
  // ------------------------------------------------------------
  window.PrimeBible = {
    VERSION: "2.5.3",
    scan: (element = document.body) => { scanElement(element, { immediate: true }); },
    clearCache: () => { cache.clear(); cacheTimestamps.clear(); pending.clear(); },
    config: (newConfig) => {
      let abortNeeded = false;
      if (Object.prototype.hasOwnProperty.call(newConfig, "translation") && newConfig.translation !== config.translation) abortNeeded = true;
      if (Object.prototype.hasOwnProperty.call(newConfig, "chapterVerseCounts")) abortNeeded = true;
      if (Object.prototype.hasOwnProperty.call(newConfig, "apiUrl") && newConfig.apiUrl !== config.apiUrl) abortNeeded = true;
      if (Object.prototype.hasOwnProperty.call(newConfig, "maxConcurrentFetches") && newConfig.maxConcurrentFetches !== config.maxConcurrentFetches) abortNeeded = true;

      Object.assign(config, newConfig);
      if (!config.chapterVerseCounts) config.chapterVerseCounts = DEFAULT_CHAPTER_VERSE_COUNTS;

      if (abortNeeded) {
        abortAllActiveRequests();
        cache.clear();
        cacheTimestamps.clear();
        pending.clear();
      }

      if (Object.prototype.hasOwnProperty.call(newConfig, "theme")) injectStyles();
      return config;
    },
    destroy: () => {
      abortAllActiveRequests();
      if (observer) { observer.disconnect(); observer = null; }
      if (bodySwapObserver) { bodySwapObserver.disconnect(); bodySwapObserver = null; }
      if (intersectionObserver) { intersectionObserver.disconnect(); intersectionObserver = null; }
      errorEvictionTimers.forEach(clearTimeout);
      errorEvictionTimers.clear();
      if (tooltip) {
        if (tooltip._updatePosition) {
          window.removeEventListener("scroll", tooltip._updatePosition);
          window.removeEventListener("resize", tooltip._updatePosition);
          window.removeEventListener("orientationchange", tooltip._updatePosition);
        }
        if (tooltip._kbdHandler) {
          tooltip.removeEventListener("keydown", tooltip._kbdHandler);
          tooltip._kbdHandler = null;
        }
        tooltip.remove();
        tooltip = null;
      }
      if (window.__PBV_GLOBAL_BOUND__) {
        document.removeEventListener("click", docClickHandler);
        document.removeEventListener("keydown", docKeydownHandler);
        window.__PBV_GLOBAL_BOUND__ = false;
      }
      const style = document.getElementById("pbv-styles");
      if (style) style.remove();
      document.querySelectorAll(".pbv-ref").forEach(span => {
        span.removeAttribute("data-pbv-bound");
        const text = document.createTextNode(span.textContent || "");
        if (span.parentNode) span.parentNode.replaceChild(text, span);
      });
      overTooltip = false;
      overAnyRef = false;
      cache.clear();
      cacheTimestamps.clear();
      pending.clear();
      globalCleanup.forEach(fn => fn());
      globalCleanup.length = 0;
    },
    getStats: () => ({
      cacheSize: cache.size,
      pendingRequests: pending.size,
      referencesFound: document.querySelectorAll(".pbv-ref").length,
      theme: resolveThemeName(),
      isMobile: isMobileMode(),
      tooltipOpen: !!(tooltip && tooltip.style.display === "block"),
      hoverState: { overTooltip, overAnyRef }
    }),
    prefetchRef: (ref) => fetchPassage(ref),
    setTranslation: (translation) => {
      if (translation !== config.translation) {
        config.translation = translation;
        abortAllActiveRequests();
        cache.clear();
        cacheTimestamps.clear();
        pending.clear();
      }
    },
    isSupported: () => {
      return typeof document !== "undefined" && typeof window !== "undefined" &&
             "addEventListener" in window && "querySelector" in document;
    },
    runTests
  };

  if (window.PrimeBible.isSupported()) init();
  else console.warn("PrimeBible: Browser not supported");

  if (typeof module !== "undefined" && module.exports) {
    if (typeof window !== "undefined" && window.PrimeBible) module.exports = window.PrimeBible;
    else module.exports = {};
  }
})();
