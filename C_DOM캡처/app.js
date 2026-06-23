/* eslint-disable no-alert */
(() => {
  const SUPABASE_URL = "https://dyfycrmltqosezmsufup.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Znljcm1sdHFvc2V6bXN1ZnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzg4MDIsImV4cCI6MjA5NTYxNDgwMn0.VpJCBdD1g8YZiaa6Zah9ZKIu3ydu_RkSgWCdEXe2QGw";
  const SUPABASE_TABLE = "coinbreaker_state";
  const SUPABASE_ROW_ID = "default";

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const LS_SIDE_TS = "coinbreaker_side_ts";
  const LS_ENTRY_TS = "coinbreaker_entry_ts";

  const DEFAULTS = {
    percentMin: "20",
    percentMax: "25",
    profitMin: "300",
    profitMax: "1000",
    symbol: "DOGE/USDT",
    side: "LONG",
    leverage: "100x",
    entry: "0.11445",
    bgZoom: 1.0,
    count: 1,
    prefix: "screenshot",
  };

  const els = {
    cardRoot: document.getElementById("cardRoot"),
    toast: document.getElementById("toast"),
    centerTip: document.getElementById("centerTip"),
    croppedPreviewImg: document.getElementById("croppedPreviewImg"),

    percentMin: document.getElementById("inpPercentMin"),
    percentMax: document.getElementById("inpPercentMax"),
    profitMin: document.getElementById("inpProfitMin"),
    profitMax: document.getElementById("inpProfitMax"),
    symbol: document.getElementById("inpSymbol"),
    side: document.getElementById("inpSide"),
    leverage: document.getElementById("inpLeverage"),
    entry: document.getElementById("inpEntry"),
    entryReal: document.getElementById("inpEntryReal"),
    exit: document.getElementById("inpExit"),
    bgZoom: document.getElementById("inpBgZoom"),
    bgShiftX: document.getElementById("inpBgShiftX"),
    bgShiftY: document.getElementById("inpBgShiftY"),
    count: document.getElementById("inpCount"),
    prefix: document.getElementById("inpPrefix"),

    generate: document.getElementById("btnGenerate"),
    downloadZip: document.getElementById("btnDownloadZip"),
    reroll: document.getElementById("btnReroll"),
    reset: document.getElementById("btnReset"),
    cloudLoad: document.getElementById("btnCloudLoad"),
    cloudSave: document.getElementById("btnCloudSave"),
    zoomIn: document.getElementById("btnZoomIn"),
    zoomOut: document.getElementById("btnZoomOut"),
    shiftUp: document.getElementById("btnShiftUp"),
    shiftDown: document.getElementById("btnShiftDown"),
    shiftLeft: document.getElementById("btnShiftLeft"),
    shiftRight: document.getElementById("btnShiftRight"),
    shiftReset: document.getElementById("btnShiftReset"),

    phraseFmt: document.getElementById("inpPhraseFmt"),
    phraseUnit: document.getElementById("inpPhraseUnit"),
    phrasePart3: document.getElementById("inpPhrasePart3"),
    phrasePart4: document.getElementById("inpPhrasePart4"),
    phrasePart4Prob: document.getElementById("inpPhrasePart4Prob"),

    txtPercent: document.getElementById("txtPercent"),
    txtProfit: document.getElementById("txtProfit"),
    txtSymbol: document.getElementById("txtSymbol"),
    txtSide: document.getElementById("txtSide"),
    txtLeverage: document.getElementById("txtLeverage"),
    txtEntry: document.getElementById("txtEntry"),
    txtExit: document.getElementById("txtExit"),
  };

  const sideUi = {
    longBtn: document.getElementById("btnSideLong"),
    shortBtn: document.getElementById("btnSideShort"),
  };

  let cloudReady = false;
  let cloudSaveTimer = null;
  let generatedItems = [];
  let previewIndex = -1;
  let samplePercent = null;
  let sampleProfit = null;
  let sampleEntry = null;
  let lastPercentKey = null;
  let lastProfitKey = null;
  let lastEntryBase = null;
  let lastPresetPhrase = "";
  let lastCroppedPreviewUrl = null;
  let bgShiftX = 0;
  let bgShiftY = 28;

  const DEFAULT_PHRASE_CFG = {
    fmt: ["int", "2", "1"],
    unit: ["%", "프로", "퍼", ""],
    part3: ["감사합니다", "감사합니다", "고맙습니다", "고맙습니다", "수익입니다"],
    // 프리셋 1~10은 "4) 추가 마무리 문구" 항목 수가 10개 미만이면 동작을 막습니다.
    // 기본 상태에서도 프리셋이 바로 동작하도록, 빈칸 포함 10개로 기본값을 채웁니다.
    // (빈칸은 "추가 문구가 안 붙는" 효과)
    part4: ["", "", "", "", "", "", "", "대표님.", "대단하십니다.", "대박입니다."],
    part4Prob: 25,
  };
  let phraseCfg = JSON.parse(JSON.stringify(DEFAULT_PHRASE_CFG));
  let presetPart4Assignment = null;
  let presetPart4PoolKey = "";

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1000);
  }
  showToast._t = null;

  function showToastFor(message, ms) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), ms);
  }

  function showCenterTip(message, ms = 1000) {
    if (!els.centerTip) return;
    els.centerTip.textContent = message;
    els.centerTip.classList.add("show");
    clearTimeout(showCenterTip._t);
    showCenterTip._t = setTimeout(() => els.centerTip.classList.remove("show"), ms);
  }
  showCenterTip._t = null;

  function clamp(n, a, b) {
    const x = Number(n);
    if (!Number.isFinite(x)) return a;
    return Math.max(a, Math.min(x, b));
  }

  function randInt(min, max) {
    const a = Math.ceil(min);
    const b = Math.floor(max);
    if (b <= a) return a;
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function parseNumber(text, fallback) {
    const t = String(text ?? "").trim().replace(/,/g, "").replace("%", "");
    const n = Number(t);
    return Number.isFinite(n) ? n : fallback;
  }

  function parseManWon(text, fallbackManWon) {
    return Math.floor(parseNumber(text, fallbackManWon) * 10000);
  }

  function getPercentMinMax() {
    const a = parseNumber(els.percentMin?.value, 20);
    const b = parseNumber(els.percentMax?.value, 25);
    return { minP: Math.min(a, b), maxP: Math.max(a, b) };
  }

  function getProfitMinMax() {
    const a = parseManWon(els.profitMin?.value, 300);
    const b = parseManWon(els.profitMax?.value, 1000);
    return { minWon: Math.min(a, b), maxWon: Math.max(a, b) };
  }

  function pickPercent2NoZeroSecondDigit(pMin, pMax) {
    const minI = Math.ceil(Math.min(pMin, pMax) * 100);
    const maxI = Math.floor(Math.max(pMin, pMax) * 100);
    let pi = minI;
    if (minI !== maxI) {
      for (let k = 0; k < 60; k++) {
        const cand = randInt(minI, maxI);
        if (Math.abs(cand) % 10 !== 0) {
          pi = cand;
          break;
        }
        pi = cand;
      }
      if (Math.abs(pi) % 10 === 0) {
        if (pi + 1 <= maxI) pi += 1;
        else if (pi - 1 >= minI) pi -= 1;
      }
    }
    return pi / 100;
  }

  function randomPercentProfit() {
    const { minP, maxP } = getPercentMinMax();
    const { minWon, maxWon } = getProfitMinMax();
    const p = pickPercent2NoZeroSecondDigit(minP, maxP);
    const f = minWon === maxWon ? minWon : randInt(minWon, maxWon);
    return { percent: p, profit: f };
  }

  function formatProfit(won) {
    return `${Number(won).toLocaleString("en-US")} WON`;
  }

  function parseEntryToInt(entryText) {
    const n = Number(String(entryText || "").trim());
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100000);
  }

  function entryIntToText(intVal) {
    return (intVal / 100000).toFixed(5);
  }

  function trimTrailingZeroIn5dp(text) {
    const s = String(text || "").trim();
    if (!s.includes(".")) return s;
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  function randomEntryFromBase(entryBaseText) {
    const baseInt = parseEntryToInt(entryBaseText);
    if (baseInt == null) return String(entryBaseText || "").trim();
    const next = Math.max(0, baseInt + [-2, -1, 0, 1, 2][randInt(0, 4)]);
    return trimTrailingZeroIn5dp(entryIntToText(next));
  }

  function parseLeverage(text) {
    const m = String(text || "").match(/(\d+(\.\d+)?)/);
    const v = m ? Number(m[1]) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  function computeExit(entry, pnlPercent, side, leverageText) {
    const e = Number(entry);
    const lev = parseLeverage(leverageText);
    const p = (Number(pnlPercent) / 100) / lev;
    const isShort = String(side || "").toUpperCase() === "SHORT";
    const raw = isShort ? e * (1 - p) : e * (1 + p);
    return trimTrailingZeroIn5dp((Math.round((raw + Number.EPSILON) * 100000) / 100000).toFixed(5));
  }

  function getTs(key) {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  }

  function setTs(key) {
    localStorage.setItem(key, String(Date.now()));
  }

  function cloudConfigured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  }

  function sbHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    };
  }

  function linesToWeightedArray(text, fallbackArr) {
    const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n").map((x) => x.trimEnd());
    const out = [];
    for (const raw of lines) {
      if (!raw) {
        out.push("");
        continue;
      }
      const m = raw.match(/^(.*?)(?:\|(\d+))?$/);
      const phrase = (m?.[1] ?? "").trim();
      const w = m?.[2] ? clamp(Number(m[2]), 1, 50) : 1;
      for (let i = 0; i < w; i++) out.push(phrase);
    }
    return out.length ? out : Array.isArray(fallbackArr) ? fallbackArr.slice() : [];
  }

  function pickFrom(arr, fallback = "") {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr[Math.floor(Math.random() * arr.length)] ?? fallback;
  }

  function cfgArrayToText(arr) {
    return (arr || []).map((x) => String(x ?? "")).join("\n");
  }

  function fillPhraseUiFromCfg() {
    if (els.phraseFmt) els.phraseFmt.value = cfgArrayToText(phraseCfg.fmt);
    if (els.phraseUnit) els.phraseUnit.value = cfgArrayToText(phraseCfg.unit);
    if (els.phrasePart3) els.phrasePart3.value = cfgArrayToText(phraseCfg.part3);
    if (els.phrasePart4) els.phrasePart4.value = cfgArrayToText(phraseCfg.part4);
    if (els.phrasePart4Prob) els.phrasePart4Prob.value = String(clamp(phraseCfg.part4Prob, 0, 100));
  }

  function readPhraseCfgFromUi() {
    return {
      fmt: linesToWeightedArray(els.phraseFmt?.value, DEFAULT_PHRASE_CFG.fmt),
      unit: linesToWeightedArray(els.phraseUnit?.value, DEFAULT_PHRASE_CFG.unit),
      part3: linesToWeightedArray(els.phrasePart3?.value, DEFAULT_PHRASE_CFG.part3),
      part4: linesToWeightedArray(els.phrasePart4?.value, DEFAULT_PHRASE_CFG.part4),
      part4Prob: clamp(els.phrasePart4Prob?.value, 0, 100),
    };
  }

  function getPart4ListAll(cfg) {
    const arr = Array.isArray(cfg?.part4) ? cfg.part4 : [];
    return arr.map((v) => String(v ?? "").trim());
  }

  function shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function ensurePresetPart4Assignment(cfg) {
    const list = getPart4ListAll(cfg);
    const key = list.join("\u0001");
    if (presetPart4Assignment && presetPart4PoolKey === key && presetPart4Assignment.length === 10) return presetPart4Assignment;
    if (list.length < 10) {
      presetPart4Assignment = null;
      presetPart4PoolKey = key;
      return null;
    }
    presetPart4Assignment = shuffleInPlace(list.slice()).slice(0, 10);
    presetPart4PoolKey = key;
    return presetPart4Assignment;
  }

  function makePresetPhrase(percentValue, presetId) {
    const cfg = phraseCfg || DEFAULT_PHRASE_CFG;
    const fmt = pickFrom(cfg.fmt, "int");
    const absP = Math.abs(Number(percentValue) || 0);
    let numText = "";
    if (fmt === "int") numText = String(Math.floor(absP));
    else if (fmt === "1") numText = (Math.floor(absP * 10) / 10).toFixed(1);
    else numText = (Math.floor(absP * 100) / 100).toFixed(2);
    if (numText.endsWith(".0")) numText = numText.slice(0, -2);

    const unit = pickFrom(cfg.unit, "%");
    const part3 = pickFrom(cfg.part3, "감사합니다");
    let part4 = "";
    if (presetId != null) {
      const assign = ensurePresetPart4Assignment(cfg);
      const idx = Math.max(0, Math.min(9, Number(presetId) - 1));
      part4 = assign ? String(assign[idx] ?? "").trim() : "";
    } else if (Math.random() < clamp(cfg.part4Prob, 0, 100) / 100) {
      part4 = pickFrom(cfg.part4, "");
    }
    return `${`${numText}${unit}`.trim()} ${part4 ? `${part3} ${part4}` : part3}`.trim();
  }

  function collectState() {
    const toVal = (el) => (el ? String(el.value ?? "") : "");
    return {
      v: 1,
      inputs: {
        percentMin: toVal(els.percentMin),
        percentMax: toVal(els.percentMax),
        profitMin: toVal(els.profitMin),
        profitMax: toVal(els.profitMax),
        symbol: toVal(els.symbol),
        side: toVal(els.side),
        leverage: toVal(els.leverage),
        entry: toVal(els.entry),
        bgZoom: toVal(els.bgZoom),
        count: toVal(els.count),
        prefix: toVal(els.prefix),
      },
      bg: { shiftX: bgShiftX, shiftY: bgShiftY },
      phraseCfg,
    };
  }

  function applyState(state) {
    if (!state || typeof state !== "object") return;
    const s = state.inputs || {};
    const setVal = (el, v) => {
      if (!el || v == null) return;
      el.value = String(v);
    };
    setVal(els.percentMin, s.percentMin);
    setVal(els.percentMax, s.percentMax);
    setVal(els.profitMin, s.profitMin);
    setVal(els.profitMax, s.profitMax);
    setVal(els.symbol, s.symbol);
    if (s.side) setSide(String(s.side).toUpperCase(), { shouldSave: false });
    setVal(els.leverage, s.leverage);
    setVal(els.entry, s.entry);
    setVal(els.bgZoom, s.bgZoom);
    setVal(els.count, s.count);
    setVal(els.prefix, s.prefix);
    if (state.bg) {
      if (typeof state.bg.shiftX === "number") bgShiftX = state.bg.shiftX;
      if (typeof state.bg.shiftY === "number") bgShiftY = state.bg.shiftY;
    }
    if (state.phraseCfg && typeof state.phraseCfg === "object") {
      const pc = state.phraseCfg;
      phraseCfg = {
        fmt: Array.isArray(pc.fmt) ? pc.fmt : DEFAULT_PHRASE_CFG.fmt,
        unit: Array.isArray(pc.unit) ? pc.unit : DEFAULT_PHRASE_CFG.unit,
        part3: Array.isArray(pc.part3) ? pc.part3 : DEFAULT_PHRASE_CFG.part3,
        part4: Array.isArray(pc.part4) ? pc.part4 : DEFAULT_PHRASE_CFG.part4,
        part4Prob: clamp(pc.part4Prob, 0, 100),
      };
    }
    fillPhraseUiFromCfg();
    syncBgShiftInputs();
    generatedItems = [];
    previewIndex = -1;
    samplePercent = null;
    sampleProfit = null;
    sampleEntry = null;
    presetPart4Assignment = null;
    presetPart4PoolKey = "";
    renderAll();
  }

  async function cloudLoad() {
    if (!cloudConfigured()) {
      showToastFor("Supabase 설정값(SUPABASE_URL/ANON_KEY) 필요", 2000);
      return;
    }
    try {
      const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=data&id=eq.${encodeURIComponent(SUPABASE_ROW_ID)}&limit=1`;
      const res = await fetch(url, { headers: sbHeaders() });
      if (!res.ok) throw new Error(`load failed: ${res.status}`);
      const rows = await res.json();
      if (rows && rows[0] && rows[0].data) {
        applyState(rows[0].data);
        showToastFor("클라우드 불러오기 완료", 1200);
      } else {
        showToastFor("클라우드 데이터 없음", 1200);
      }
    } catch (e) {
      console.error(e);
      showToastFor("클라우드 불러오기 실패", 2000);
    }
  }

  async function cloudSaveNow() {
    if (!cloudConfigured()) return;
    try {
      const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?on_conflict=id`;
      const body = [{ id: SUPABASE_ROW_ID, data: collectState() }];
      const res = await fetch(url, {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      showToastFor("클라우드 저장됨", 1000);
    } catch (e) {
      console.error(e);
      showToastFor("클라우드 저장 실패", 1500);
    }
  }

  function scheduleCloudSave() {
    if (!cloudReady || !cloudConfigured()) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => cloudSaveNow(), 1200);
  }

  function syncBgShiftInputs() {
    if (els.bgShiftX) els.bgShiftX.value = String(Math.round(bgShiftX));
    if (els.bgShiftY) els.bgShiftY.value = String(Math.round(bgShiftY));
  }

  function applyCardBackground() {
    if (!els.cardRoot) return;
    // DOM 배경은 zoom<1에서 가로가 줄어 "오른쪽이 비는" 문제가 생김.
    // 원본처럼 항상 가로는 꽉 차게 유지하고(>=100%), zoom은 확대(>=1)에서만 반영.
    const z = clamp(els.bgZoom?.value, 0.5, 2);
    const sizeZoom = Math.max(1, z);
    els.cardRoot.style.backgroundRepeat = "repeat-y";
    els.cardRoot.style.backgroundSize = `${(sizeZoom * 100).toFixed(3)}% auto`;
    // 중심 기준으로 X 이동(원본 느낌)
    els.cardRoot.style.backgroundPosition = `calc(50% + ${Math.round(bgShiftX)}px) ${Math.round(bgShiftY)}px`;
  }

  function setSide(value, { shouldSave = true } = {}) {
    if (els.side) els.side.value = value;
    if (sideUi.longBtn) sideUi.longBtn.classList.toggle("active", value === "LONG");
    if (sideUi.shortBtn) sideUi.shortBtn.classList.toggle("active", value === "SHORT");
    if (shouldSave) {
      setTs(LS_SIDE_TS);
      scheduleCloudSave();
    }
    renderAll();
  }

  function getCount() {
    const n = Number(els.count?.value);
    return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
  }

  function rerollIfNeeded(force = false) {
    const fk = `${String(els.profitMin?.value || "")}|${String(els.profitMax?.value || "")}`;
    const { minP, maxP } = getPercentMinMax();
    const pk = `${minP}|${maxP}`;
    if (force || pk !== lastPercentKey || fk !== lastProfitKey || samplePercent == null || sampleProfit == null) {
      samplePercent = pickPercent2NoZeroSecondDigit(minP, maxP);
      const { minWon, maxWon } = getProfitMinMax();
      sampleProfit = minWon === maxWon ? minWon : randInt(minWon, maxWon);
      lastPercentKey = pk;
      lastProfitKey = fk;
    }
    return { percent: samplePercent, profit: sampleProfit };
  }

  function renderCard(item) {
    const percentText = Number(item.percent).toFixed(2).replace(/\.00$/, "");
    if (els.txtPercent) els.txtPercent.textContent = percentText;
    if (els.txtProfit) els.txtProfit.textContent = formatProfit(item.profit);
    if (els.txtSymbol) els.txtSymbol.textContent = String(els.symbol?.value || "").trim();
    if (els.txtSide) {
      const side = String(els.side?.value || "LONG").toUpperCase();
      els.txtSide.textContent = side;
      els.txtSide.classList.toggle("LONG", side === "LONG");
      els.txtSide.classList.toggle("SHORT", side === "SHORT");
    }
    if (els.entryReal) els.entryReal.value = item.entry;
    if (els.txtLeverage) els.txtLeverage.textContent = String(els.leverage?.value || "").trim();
    if (els.txtEntry) els.txtEntry.textContent = item.entry;
    const exit = computeExit(item.entry, item.percent, els.side?.value, els.leverage?.value);
    if (els.exit) els.exit.value = exit;
    if (els.txtExit) els.txtExit.textContent = exit;
    applyCardBackground();
  }

  function renderPreview() {
    if (generatedItems.length > 0) {
      if (previewIndex < 0 || previewIndex >= generatedItems.length) previewIndex = 0;
      renderCard(generatedItems[previewIndex]);
      return;
    }
    const baseEntry = String(els.entry?.value || "").trim();
    if (sampleEntry == null || lastEntryBase !== baseEntry) {
      sampleEntry = randomEntryFromBase(baseEntry);
      lastEntryBase = baseEntry;
    }
    const { percent, profit } = rerollIfNeeded(false);
    renderCard({ percent, profit, entry: sampleEntry });
  }

  function renderAll() {
    renderPreview();
  }

  async function ensureFontsReady() {
    if (document.fonts && document.fonts.ready) {
      try {
        await Promise.allSettled([
          document.fonts.load('400 16px "Noto Sans KR"'),
          document.fonts.load('500 32px "Noto Sans KR"'),
          document.fonts.load('600 34px "Noto Sans KR"'),
        ]);
        await document.fonts.ready;
      } catch {
        // ignore
      }
    }
  }

  async function renderCardCanvas() {
    await ensureFontsReady();
    return window.html2canvas(els.cardRoot, {
      backgroundColor: null,
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: true,
    });
  }

  function getTargetBoxes() {
    const rootRect = els.cardRoot.getBoundingClientRect();
    const selectors = [".dr2-value", ".dr3-value", ".drp-label", ".drp-value"];
    return selectors.flatMap((sel) =>
      Array.from(els.cardRoot.querySelectorAll(sel)).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - rootRect.left,
          y: r.top - rootRect.top,
          w: r.width,
          h: r.height,
        };
      })
    );
  }

  function computeCropRect() {
    const W = els.cardRoot.clientWidth;
    const H = els.cardRoot.clientHeight;
    const boxes = getTargetBoxes();
    if (!boxes.length) return { x: 0, y: 0, w: W, h: H };
    const mode = Math.random();
    const wanted = mode < 0.15 ? boxes : boxes.slice(0, 2);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    wanted.forEach((b) => {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    });
    const padL = randInt(10, 50);
    const padT = randInt(10, 36);
    const padR = randInt(10, 80);
    const padB = randInt(10, 70);
    const x = Math.max(0, Math.floor(minX - padL));
    const y = Math.max(0, Math.floor(minY - padT));
    const w = Math.min(W - x, Math.ceil(maxX - minX + padL + padR));
    const h = Math.min(H - y, Math.ceil(maxY - minY + padT + padB));
    return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
  }

  async function copyCardToClipboardAndPreview() {
    const canvas = await renderCardCanvas();
    const crop = computeCropRect();
    const scaleX = canvas.width / els.cardRoot.clientWidth;
    const scaleY = canvas.height / els.cardRoot.clientHeight;
    const outScale = randFloat(0.7, 1.0);
    const outW = Math.max(1, Math.round(crop.w * outScale));
    const outH = Math.max(1, Math.round(crop.h * outScale));
    const off = document.createElement("canvas");
    off.width = outW;
    off.height = outH;
    const offCtx = off.getContext("2d");
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = "high";
    offCtx.drawImage(
      canvas,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.w * scaleX,
      crop.h * scaleY,
      0,
      0,
      outW,
      outH
    );
    const blob = await new Promise((resolve, reject) =>
      off.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/png")
    );

    // 미리보기는 항상 갱신
    if (els.croppedPreviewImg) {
      if (lastCroppedPreviewUrl) URL.revokeObjectURL(lastCroppedPreviewUrl);
      lastCroppedPreviewUrl = URL.createObjectURL(blob);
      els.croppedPreviewImg.src = lastCroppedPreviewUrl;
    }

    // 클립보드 복사는 브라우저 보안 정책(HTTPS/localhost)에서만 동작할 수 있음.
    // 실패하면 다운로드로 대체해 "복사 불가" 상황에서도 결과는 얻을 수 있게 함.
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("clipboard_not_supported");
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch (e) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cropped.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      throw new Error("clipboard_failed_downloaded");
    }
  }

  async function downloadZip() {
    if (!window.JSZip || !window.html2canvas) {
      alert("필수 라이브러리 로딩 실패");
      return;
    }
    const n = getCount();
    const prefix = (els.prefix?.value || "screenshot").trim() || "screenshot";
    const zip = new JSZip();
    const snapshot = {
      generatedItems: generatedItems.slice(),
      previewIndex,
      samplePercent,
      sampleProfit,
      sampleEntry,
      lastEntryBase,
    };
    const baseEntry = String(els.entry?.value || "").trim();
    for (let i = 1; i <= n; i++) {
      const { percent, profit } = randomPercentProfit();
      const entry = randomEntryFromBase(baseEntry);
      renderCard({ percent, profit, entry });
      const canvas = await renderCardCanvas();
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("캡처 실패"))), "image/png")
      );
      zip.file(`${prefix}_${String(i).padStart(4, "0")}.png`, blob);
    }
    generatedItems = snapshot.generatedItems;
    previewIndex = snapshot.previewIndex;
    samplePercent = snapshot.samplePercent;
    sampleProfit = snapshot.sampleProfit;
    sampleEntry = snapshot.sampleEntry;
    lastEntryBase = snapshot.lastEntryBase;
    renderAll();
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${prefix}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function doGenerate() {
    const n = getCount();
    const baseEntry = String(els.entry?.value || "").trim();
    generatedItems = Array.from({ length: n }, () => {
      const { percent, profit } = randomPercentProfit();
      return { percent, profit, entry: randomEntryFromBase(baseEntry) };
    });
    previewIndex = generatedItems.length > 0 ? 0 : -1;
    renderAll();
  }

  function bindPhraseUi() {
    fillPhraseUiFromCfg();
    const onEdit = () => {
      phraseCfg = readPhraseCfgFromUi();
      presetPart4Assignment = null;
      presetPart4PoolKey = "";
      scheduleCloudSave();
    };
    [els.phraseFmt, els.phraseUnit, els.phrasePart3, els.phrasePart4, els.phrasePart4Prob].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", onEdit);
      el.addEventListener("change", onEdit);
    });
  }

  function bindSideUi() {
    if (sideUi.longBtn) sideUi.longBtn.addEventListener("click", () => setSide("LONG"));
    if (sideUi.shortBtn) sideUi.shortBtn.addEventListener("click", () => setSide("SHORT"));
  }

  function bind() {
    const reRender = () => {
      renderAll();
      scheduleCloudSave();
    };
    [
      els.percentMin, els.percentMax, els.profitMin, els.profitMax, els.symbol,
      els.leverage, els.entry, els.bgZoom, els.count, els.prefix,
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", reRender);
      el.addEventListener("change", reRender);
    });
    if (els.entry) {
      const mark = () => setTs(LS_ENTRY_TS);
      els.entry.addEventListener("input", mark);
      els.entry.addEventListener("change", mark);
    }
    if (els.cloudLoad) els.cloudLoad.addEventListener("click", cloudLoad);
    if (els.cloudSave) els.cloudSave.addEventListener("click", cloudSaveNow);
    if (els.generate) els.generate.addEventListener("click", doGenerate);
    if (els.downloadZip) els.downloadZip.addEventListener("click", downloadZip);
    if (els.reroll) {
      els.reroll.addEventListener("click", () => {
        generatedItems = [];
        previewIndex = -1;
        samplePercent = null;
        sampleProfit = null;
        sampleEntry = null;
        rerollIfNeeded(true);
        renderAll();
      });
    }
    if (els.reset) {
      els.reset.addEventListener("click", () => {
        els.percentMin.value = DEFAULTS.percentMin;
        els.percentMax.value = DEFAULTS.percentMax;
        els.profitMin.value = DEFAULTS.profitMin;
        els.profitMax.value = DEFAULTS.profitMax;
        els.symbol.value = DEFAULTS.symbol;
        els.leverage.value = DEFAULTS.leverage;
        els.entry.value = DEFAULTS.entry;
        els.bgZoom.value = String(DEFAULTS.bgZoom.toFixed(3));
        els.count.value = String(DEFAULTS.count);
        els.prefix.value = DEFAULTS.prefix;
        bgShiftX = 0;
        bgShiftY = 28;
        setSide(DEFAULTS.side, { shouldSave: false });
        generatedItems = [];
        previewIndex = -1;
        samplePercent = null;
        sampleProfit = null;
        sampleEntry = null;
        lastEntryBase = null;
        syncBgShiftInputs();
        renderAll();
        scheduleCloudSave();
      });
    }

    const bumpZoom = (delta) => {
      const cur = Number(els.bgZoom?.value);
      els.bgZoom.value = clamp((Number.isFinite(cur) ? cur : 1) + delta, 0.5, 2).toFixed(3);
      renderAll();
      scheduleCloudSave();
    };
    if (els.zoomIn) els.zoomIn.addEventListener("click", () => bumpZoom(+0.001));
    if (els.zoomOut) els.zoomOut.addEventListener("click", () => bumpZoom(-0.001));

    const bumpBg = (key, delta) => {
      if (key === "x") bgShiftX = Math.round(bgShiftX) + delta;
      else bgShiftY = Math.round(bgShiftY) + delta;
      syncBgShiftInputs();
      renderAll();
      scheduleCloudSave();
    };
    if (els.shiftUp) els.shiftUp.addEventListener("click", () => bumpBg("y", -1));
    if (els.shiftDown) els.shiftDown.addEventListener("click", () => bumpBg("y", +1));
    if (els.shiftLeft) els.shiftLeft.addEventListener("click", () => bumpBg("x", -1));
    if (els.shiftRight) els.shiftRight.addEventListener("click", () => bumpBg("x", +1));
    if (els.shiftReset) {
      els.shiftReset.addEventListener("click", () => {
        bgShiftX = 0;
        bgShiftY = 28;
        syncBgShiftInputs();
        renderAll();
        scheduleCloudSave();
      });
    }
    if (els.bgShiftX) {
      els.bgShiftX.addEventListener("input", () => {
        bgShiftX = Number.isFinite(Number(els.bgShiftX.value)) ? Math.round(Number(els.bgShiftX.value)) : 0;
        renderAll();
        scheduleCloudSave();
      });
    }
    if (els.bgShiftY) {
      els.bgShiftY.addEventListener("input", () => {
        bgShiftY = Number.isFinite(Number(els.bgShiftY.value)) ? Math.round(Number(els.bgShiftY.value)) : 0;
        renderAll();
        scheduleCloudSave();
      });
    }

    let firstPresetHintShown = false;
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const presetId = btn.getAttribute("data-preset");
        const part4List = getPart4ListAll(phraseCfg || DEFAULT_PHRASE_CFG);
        if (part4List.length < 10) {
          showToastFor(`4) 추가 마무리 문구 항목이 10개 미만입니다. (현재 ${part4List.length}개)`, 2500);
          return;
        }
        ensurePresetPart4Assignment(phraseCfg || DEFAULT_PHRASE_CFG);

        const pmin = btn.getAttribute("data-pmin");
        const pmax = btn.getAttribute("data-pmax");
        if (els.profitMin && pmin != null) els.profitMin.value = String(pmin);
        if (els.profitMax && pmax != null) els.profitMax.value = String(pmax);

        doGenerate();
        const percentForPhrase = generatedItems?.[0]?.percent ?? samplePercent ?? 0;
        let phrase = "";
        for (let i = 0; i < 30; i++) {
          phrase = makePresetPhrase(percentForPhrase, presetId);
          if (phrase && phrase !== lastPresetPhrase) break;
        }
        lastPresetPhrase = phrase;
        const caption = document.querySelector(`.preset-caption[data-preset="${presetId}"]`);
        if (caption) {
          caption.textContent = phrase;
          const range = document.createRange();
          range.selectNodeContents(caption);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }

        if (!firstPresetHintShown) {
          firstPresetHintShown = true;
          showToastFor("프리셋 적용됨", 1500);
        }

        const now = Date.now();
        const sideSelected = ["LONG", "SHORT"].includes(String(els.side?.value || "").toUpperCase());
        const sideOk = sideSelected && now - getTs(LS_SIDE_TS) < ONE_HOUR_MS;
        const entryOk = getTs(LS_ENTRY_TS) > 0 && now - getTs(LS_ENTRY_TS) < ONE_HOUR_MS;
        if (!sideSelected) showCenterTip("롱/숏 확인하세요", 1000);
        else if (!sideOk || !entryOk) showToastFor("롱/숏·진입가 확인하세요", 2000);

        try {
          await copyCardToClipboardAndPreview();
          showToast("클립보드에 복사됨");
        } catch (e) {
          console.error(e);
          // copyCardToClipboardAndPreview()에서 실패 시 다운로드로 대체됨
          showToastFor("클립보드 복사 실패 → 파일로 저장됨(권장: localhost/HTTPS로 실행)", 2500);
        }
      });
    });
  }

  async function init() {
    bindPhraseUi();
    bind();
    bindSideUi();
    syncBgShiftInputs();
    cloudReady = false;
    if (cloudConfigured()) await cloudLoad();
    cloudReady = true;
    if (!els.side?.value) setSide(DEFAULTS.side, { shouldSave: false });
    rerollIfNeeded(true);
    renderAll();
  }

  init();
})();
