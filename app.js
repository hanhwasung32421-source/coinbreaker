/* eslint-disable no-alert */
(() => {
  // 빌드 버전(로컬에서 index.html을 바로 열어도 표시되도록 코드에 내장)
  // 수정할 때마다 값을 갱신합니다. 포맷: yyMMddHHmmss
  const BUILD_VERSION = "260623164458";

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
    buildVersion: document.getElementById("buildVersion"),
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
      // 과거 저장값(0,0)이 들어있는 경우 배경이 중앙 기준으로 어색하게 보일 수 있어
      // C에서는 기본 원본 느낌(0,28)을 기준으로 두고, (0,0)은 "미설정"으로 취급합니다.
      const sx = typeof state.bg.shiftX === "number" ? state.bg.shiftX : bgShiftX;
      const sy = typeof state.bg.shiftY === "number" ? state.bg.shiftY : bgShiftY;
      if (sx === 0 && sy === 0) {
        bgShiftX = 0;
        bgShiftY = 28;
      } else {
        bgShiftX = sx;
        bgShiftY = sy;
      }
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
    // C의 배경 X/Y는 "좌상단 기준(px)"으로 해석 (0,0이면 왼쪽 위에 맞춰짐)
    els.cardRoot.style.backgroundPosition = `${Math.round(bgShiftX)}px ${Math.round(bgShiftY)}px`;
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

  async function renderCardCanvas({ foreignObjectRendering = false } = {}) {
    await ensureFontsReady();
    if (typeof window.html2canvas !== "function") {
      throw new Error("html2canvas_missing");
    }

    // DOM 업데이트가 반영될 시간을 조금 줌(프리셋 클릭 직후 텍스트가 캔버스에 누락되는 케이스 완화)
    await new Promise((r) => requestAnimationFrame(() => r()));

    return window.html2canvas(els.cardRoot, {
      backgroundColor: null,
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering,
    });
  }

  // ---- 캡쳐 매커니즘 (새 구현) ----
  // 요구사항:
  // - 수익퍼센트/수익금액은 무조건 보이게 캡쳐
  // - 5% 확률로 수익화면 전체 캡쳐(카드 전체)
  // - 시작점은 항상 퍼센트 왼쪽 위 기준으로 랜덤한 좌표
  // - 캡쳐 가로: 카드의 60~100%
  // - 캡쳐 세로: (수익금액이 나오는 최소 범위) ~ (종료가격 숫자가 보이는 곳까지) 범위에서 랜덤
  function rectUnion(a, b) {
    if (!a) return b;
    if (!b) return a;
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.w, b.x + b.w);
    const y2 = Math.max(a.y + a.h, b.y + b.h);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  function getRectForSelector(sel) {
    const rootRect = els.cardRoot.getBoundingClientRect();
    const el = els.cardRoot.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left - rootRect.left,
      y: r.top - rootRect.top,
      w: r.width,
      h: r.height,
    };
  }

  function getRectForSelectors(selectors) {
    let u = null;
    for (const sel of selectors) u = rectUnion(u, getRectForSelector(sel));
    return u;
  }

  function clampRectToCard(rect, W, H) {
    const x = Math.max(0, Math.min(W - 1, Math.floor(rect.x)));
    const y = Math.max(0, Math.min(H - 1, Math.floor(rect.y)));
    const w = Math.max(1, Math.min(W - x, Math.ceil(rect.w)));
    const h = Math.max(1, Math.min(H - y, Math.ceil(rect.h)));
    return { x, y, w, h };
  }

  function computeCaptureRect() {
    // 좌표 계산은 getBoundingClientRect 기반으로 맞춰야 html2canvas 결과 캔버스와 싱크가 잘 맞습니다.
    const rootRect = els.cardRoot.getBoundingClientRect();
    const W = rootRect.width;
    const H = rootRect.height;
    if (Math.random() < 0.05) return { x: 0, y: 0, w: W, h: H };

    // 텍스트 실제 글자 기준(폭 100% 요소 제외)
    const percentRect =
      getRectForSelectors([".dr2-value .plus-sign", "#txtPercent", ".dr2-value .percent-sign"]) ||
      getRectForSelector(".dr2-value") ||
      { x: 0, y: 0, w: 1, h: 1 };
    const profitRect = getRectForSelectors([".dr3-value .plus-sign", "#txtProfit"]) || getRectForSelector(".dr3-value") || percentRect;
    const exitRect = getRectForSelector("#txtExit") || profitRect;

    // "무조건 포함" 영역(수익퍼센트 + 수익금액)
    const requiredRect = rectUnion(percentRect, profitRect);

    // 시작점: 퍼센트 왼쪽 위 기준으로 랜덤 (단, requiredRect를 포함하기 쉬운 범위로 제한)
    const startPadX = randInt(0, 28);
    const startPadY = randInt(0, 18);
    let x = Math.max(0, Math.floor(percentRect.x - startPadX));
    let y = Math.max(0, Math.floor(percentRect.y - startPadY));

    // 가로: 60~100% 랜덤, 단 텍스트(퍼센트+수익금)는 절대 잘리면 안 됨
    const requiredRight = Math.ceil(requiredRect.x + requiredRect.w);
    let w = Math.round(randFloat(0.6, 1.0) * W);
    w = Math.max(1, Math.min(W - x, w));
    if (x + w < requiredRight) w = Math.min(W - x, requiredRight - x);

    // 세로: 최소는 "수익금액이 보이는 최소 범위"(profit bottom 포함),
    // 최대는 "종료가격 숫자가 보이는 곳까지"(exit bottom 포함)
    const padBottom = randInt(12, 36);
    const minH = Math.ceil(profitRect.y + profitRect.h + padBottom) - y;
    const maxH = Math.ceil(exitRect.y + exitRect.h + padBottom) - y;
    const lo = Math.max(1, Math.min(H - y, Math.min(minH, maxH)));
    const hi = Math.max(lo, Math.min(H - y, Math.max(minH, maxH)));
    let h = randInt(lo, hi);

    // 최종 안전장치: requiredRect(퍼센트+수익금)가 항상 들어오도록 보정
    // (드물게 폰트/레이아웃 타이밍으로 rect가 흔들려도 캡쳐가 배경만 뜨는 것을 방지)
    if (x > requiredRect.x) x = Math.max(0, Math.floor(requiredRect.x));
    if (y > requiredRect.y) y = Math.max(0, Math.floor(requiredRect.y));
    if (x + w < requiredRect.x + requiredRect.w) w = Math.min(W - x, Math.ceil(requiredRect.x + requiredRect.w - x));
    if (y + h < requiredRect.y + requiredRect.h) h = Math.min(H - y, Math.ceil(requiredRect.y + requiredRect.h - y));

    // 안전: 필수 요소가 잘리지 않도록 최종 보정
    const requiredBottom = Math.ceil(profitRect.y + profitRect.h);
    if (y + h < requiredBottom) {
      const need = requiredBottom - y;
      return clampRectToCard({ x, y, w, h: need + randInt(8, 28) }, W, H);
    }
    return clampRectToCard({ x, y, w, h }, W, H);
  }

  function hasProfitTextLikePixels(offCtx, cropCss) {
    // required 영역(퍼센트+수익금) 안에서
    // - 밝은/초록 픽셀(텍스트)도 있어야 하고
    // - 어두운 픽셀(배경)도 같이 있어야 정상으로 간주합니다.
    // (첨부처럼 "초록색 덩어리만" 나오거나 "배경만" 나오는 케이스를 걸러냄)
    const rr = els.cardRoot.getBoundingClientRect();

    const percentRect =
      getRectForSelectors([".dr2-value .plus-sign", "#txtPercent", ".dr2-value .percent-sign"]) ||
      getRectForSelector(".dr2-value") ||
      { x: 0, y: 0, w: 1, h: 1 };
    const profitRect =
      getRectForSelectors([".dr3-value .plus-sign", "#txtProfit"]) ||
      getRectForSelector(".dr3-value") ||
      percentRect;
    const requiredRect = rectUnion(percentRect, profitRect);

    // offCtx는 crop된 이미지(1 CSS px = 1 off canvas px) 이므로,
    // requiredRect를 crop 기준으로 로컬 좌표로 변환해서 샘플링합니다.
    const sx = Math.max(0, Math.floor(requiredRect.x - cropCss.x));
    const sy = Math.max(0, Math.floor(requiredRect.y - cropCss.y));
    const ex = Math.min(offCtx.canvas.width, Math.ceil(requiredRect.x + requiredRect.w - cropCss.x));
    const ey = Math.min(offCtx.canvas.height, Math.ceil(requiredRect.y + requiredRect.h - cropCss.y));
    const w = Math.max(1, ex - sx);
    const h = Math.max(1, ey - sy);

    const img = offCtx.getImageData(sx, sy, w, h).data;
    const samples = 420;
    let darkCnt = 0;
    let brightOrGreenCnt = 0;

    for (let i = 0; i < samples; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      const idx = (y * w + x) * 4;
      const r = img[idx], g = img[idx + 1], b = img[idx + 2];
      const bright = (r + g + b) / 3;
      const darkish = bright < 45;
      const brightish = bright > 185;
      const greenish = g > 150 && g - r > 35 && g - b > 20;

      if (darkish) darkCnt++;
      if (brightish || greenish) brightOrGreenCnt++;
      if (darkCnt > 12 && brightOrGreenCnt > 12) return true;
    }

    // rr unused but kept to ensure rects are computed after layout
    void rr;
    return darkCnt > 12 && brightOrGreenCnt > 12;
  }

  function hasGreenishText(canvasOrCtx) {
    const canvas = canvasOrCtx instanceof CanvasRenderingContext2D ? canvasOrCtx.canvas : canvasOrCtx;
    const ctx = canvasOrCtx instanceof CanvasRenderingContext2D ? canvasOrCtx : canvas.getContext("2d");
    if (!ctx) return true;
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return true;
    // 텍스트(초록색/흰색)가 전혀 없는 "배경만" 캡쳐를 걸러내기 위한 휴리스틱
    // 랜덤 샘플 픽셀에서 초록색 계열(수익 텍스트) 또는 밝은 픽셀이 있으면 정상으로 간주
    const img = ctx.getImageData(0, 0, w, h).data;
    const samples = 260;
    for (let i = 0; i < samples; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      const idx = (y * w + x) * 4;
      const r = img[idx], g = img[idx + 1], b = img[idx + 2];
      const bright = (r + g + b) / 3;
      const greenish = g > 160 && g - r > 40 && g - b > 20;
      if (greenish || bright > 210) return true;
    }
    return false;
  }

  async function copyCardToClipboardAndPreview() {
    let blob = null;
    let lastErr = null;

    // 1) 일반 모드 + 규칙 캡쳐
    // 2) 일반 모드 + 전체 캡쳐
    // 3) foreignObjectRendering 모드 + 전체 캡쳐 (환경별 텍스트 누락 대응)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const useFO = attempt >= 2;
        const canvas = await renderCardCanvas({ foreignObjectRendering: useFO });
        const rr = els.cardRoot.getBoundingClientRect();
        const crop = attempt === 0 ? computeCaptureRect() : { x: 0, y: 0, w: rr.width, h: rr.height };
        const rootRect = els.cardRoot.getBoundingClientRect();
        const scaleX = canvas.width / rootRect.width;
        const scaleY = canvas.height / rootRect.height;

        const outW = Math.max(1, Math.round(crop.w));
        const outH = Math.max(1, Math.round(crop.h));
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

        // required(퍼센트+수익금) 영역에 "텍스트 + 배경"이 같이 있는지 검사
        // 실패하면 재시도(환경별 텍스트 누락/좌표 미스 대비)
        if (!hasProfitTextLikePixels(offCtx, crop)) {
          lastErr = new Error("capture_background_only");
          continue;
        }

        blob = await new Promise((resolve, reject) =>
          off.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/png")
        );
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!blob) throw lastErr || new Error("capture_failed");

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
          const msg = String(e?.message || "");
          if (msg.includes("html2canvas_missing")) {
            showToastFor("캡처 라이브러리 로딩 실패(html2canvas). 네트워크/차단 여부 확인", 3000);
          } else if (!window.isSecureContext || location.protocol === "file:") {
            showToastFor("파일로 열면(또는 비보안 환경) 캡처/복사가 제한될 수 있어요. localhost/HTTPS로 실행 권장", 3500);
          } else {
            showToastFor("클립보드 복사 실패 → 파일로 저장됨(권장: localhost/HTTPS로 실행)", 2500);
          }
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

    // 빌드 버전(커밋마다 갱신되는 version.json)
    if (els.buildVersion) {
      // file:// 로 열어도 무조건 표시되도록 우선 내장 버전을 표시
      els.buildVersion.textContent = BUILD_VERSION;
      try {
        // file:// 환경에서는 fetch가 실패할 수 있어, 성공할 때만 덮어씁니다.
        const res = await fetch(`./version.json?ts=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data && data.build) els.buildVersion.textContent = String(data.build);
      } catch {
        // ignore
      }
    }

    // file:// 로 직접 열면 html2canvas/clipboard 정책 때문에 캡처/복사가 실패할 수 있어 안내
    if (location.protocol === "file:") {
      showToastFor("권장: 로컬 서버로 열기(파일로 열면 캡처/복사 제한 가능)", 3500);
    }
  }

  init();
})();
