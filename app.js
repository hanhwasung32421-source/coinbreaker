/* eslint-disable no-alert */
(() => {
  const CANVAS_W = 462;
  const CANVAS_H = 354;

  // ---- 클라우드 저장(Supabase) 설정 ----
  // Supabase 대시보드(Project Settings → API)에서 아래 2개 값을 복사해서 넣어주세요.
  // 예) SUPABASE_URL = "https://xxxx.supabase.co"
  // 예) SUPABASE_ANON_KEY = "eyJhbGciOi..."
  const SUPABASE_URL = "https://dyfycrmltqosezmsufup.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Znljcm1sdHFvc2V6bXN1ZnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzg4MDIsImV4cCI6MjA5NTYxNDgwMn0.VpJCBdD1g8YZiaa6Zah9ZKIu3ydu_RkSgWCdEXe2QGw";
  const SUPABASE_TABLE = "coinbreaker_state";
  const SUPABASE_ROW_ID = "default";

  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById("cardCanvas");
  const ctx = canvas.getContext("2d");
  let canvasDpr = 1;
  const toastEl = document.getElementById("toast");
  const centerTipEl = document.getElementById("centerTip");
  const croppedPreviewImg = document.getElementById("croppedPreviewImg");
  let lastCroppedPreviewUrl = null;

  const els = {
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
    zoomIn: document.getElementById("btnZoomIn"),
    zoomOut: document.getElementById("btnZoomOut"),
    bgShiftX: document.getElementById("inpBgShiftX"),
    bgShiftY: document.getElementById("inpBgShiftY"),
    cloudLoad: document.getElementById("btnCloudLoad"),
    cloudSave: document.getElementById("btnCloudSave"),
    shiftUp: document.getElementById("btnShiftUp"),
    shiftDown: document.getElementById("btnShiftDown"),
    shiftLeft: document.getElementById("btnShiftLeft"),
    shiftRight: document.getElementById("btnShiftRight"),
    shiftReset: document.getElementById("btnShiftReset"),

    padX: document.getElementById("inpPadX"),
    topPercentY: document.getElementById("inpTopPercentY"),
    topProfitY: document.getElementById("inpTopProfitY"),
    percentSignDy: document.getElementById("inpPercentSignDy"),
    sectionStartY: document.getElementById("inpSectionStartY"),
    rowGap: document.getElementById("inpRowGap"),
    labelToValueGap: document.getElementById("inpLabelToValueGap"),
    sideDx: document.getElementById("inpSideDx"),
    sideDy: document.getElementById("inpSideDy"),
    r1LabelDy: document.getElementById("inpR1LabelDy"),
    r1ValueDy: document.getElementById("inpR1ValueDy"),
    r2LabelDy: document.getElementById("inpR2LabelDy"),
    r2ValueDy: document.getElementById("inpR2ValueDy"),
    r3LabelDy: document.getElementById("inpR3LabelDy"),
    r3ValueDy: document.getElementById("inpR3ValueDy"),
    r4LabelDy: document.getElementById("inpR4LabelDy"),
    r4ValueDy: document.getElementById("inpR4ValueDy"),

    count: document.getElementById("inpCount"),
    prefix: document.getElementById("inpPrefix"),
    generate: document.getElementById("btnGenerate"),
    downloadZip: document.getElementById("btnDownloadZip"),
    reroll: document.getElementById("btnReroll"),
    reset: document.getElementById("btnReset"),

    // 프리셋 문구(자동 생성) 설정
    phraseFmt: document.getElementById("inpPhraseFmt"),
    phraseUnit: document.getElementById("inpPhraseUnit"),
    phrasePart3: document.getElementById("inpPhrasePart3"),
    phrasePart4: document.getElementById("inpPhrasePart4"),
    phrasePart4Prob: document.getElementById("inpPhrasePart4Prob"),
  };

  const sideUi = {
    longBtn: document.getElementById("btnSideLong"),
    shortBtn: document.getElementById("btnSideShort"),
  };

  let lastPresetPhrase = "";
  // 프리셋(1~10)에서 "4) 추가 마무리 문구"를 1~10에 골고루(각각 1개씩) 배정하기 위한 매핑
  // - 프리셋 1~10 버튼을 눌렀을 때는 "절대 중복"으로 붙도록(=프리셋 10개에 서로 다른 10개 배정) 동작
  // - 서로 다른 추가문구(빈칸 제외)가 10개 미만이면 경고 후 프리셋 동작 자체를 막음
  /** @type {string[] | null} */
  let presetPart4Assignment = null; // index 0..9 => preset 1..10
  let presetPart4PoolKey = "";

  // ---- 프리셋 문구(자동 생성) 설정 ----
  const DEFAULT_PHRASE_CFG = {
    // 1) 수익률 숫자 포맷: int / 1 / 2 (가중치 적용 가능)
    fmt: ["int", "2", "1"],
    // 2) 단위
    unit: ["%", "프로", "퍼", ""],
    // 3) 기본 마무리 문구(가중치: 감사합니다 2, 고맙습니다 2, 수익입니다 1)
    part3: ["감사합니다", "감사합니다", "고맙습니다", "고맙습니다", "수익입니다"],
    // 4) 추가 마무리 문구(확률적으로 붙음. 빈 문구도 가능)
    part4: ["", "대표님.", "대단하십니다.", "대박입니다."],
    part4Prob: 25, // %
  };

  function clamp(n, a, b) {
    const x = Number(n);
    if (!Number.isFinite(x)) return a;
    return Math.max(a, Math.min(x, b));
  }

  function normalizeLines(text) {
    return String(text ?? "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((x) => x.trimEnd());
  }

  function linesToWeightedArray(text, fallbackArr) {
    const lines = normalizeLines(text);
    const out = [];
    for (const raw of lines) {
      // 빈 줄도 허용(옵션으로 취급)
      const line = raw.trim();
      if (!raw) {
        out.push("");
        continue;
      }
      // "문구|2" 형태로 가중치
      const m = line.match(/^(.*?)(?:\|(\d+))?$/);
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

  function getPart4ListAll(cfg) {
    // "4) 추가 마무리 문구"는 중복 문구도 각각의 항목으로 취급.
    // 또한 "빈칸 포함해서 10개" 규칙을 위해 빈칸도 항목으로 카운트/배정 가능하게 함.
    // (빈칸이 배정되면 해당 프리셋은 추가 문구가 안 붙는 효과)
    const arr = Array.isArray(cfg?.part4) ? cfg.part4 : [];
    return arr.map((v) => String(v ?? "").trim());
  }

  function shuffleInPlace(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
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
    const pool = shuffleInPlace(list.slice());
    presetPart4Assignment = pool.slice(0, 10);
    presetPart4PoolKey = key;
    return presetPart4Assignment;
  }

  function cfgArrayToText(arr) {
    // 가중치까지 “그대로” 보여주기 위해 단순 join (중복은 그대로 노출)
    return (arr || []).map((x) => String(x ?? "")).join("\n");
  }

  // DB(클라우드)에 저장/불러오기 할 값. 기본값으로 시작하고, cloudLoad()의 applyState에서 덮어씁니다.
  let phraseCfg = JSON.parse(JSON.stringify(DEFAULT_PHRASE_CFG));

  function fillPhraseUiFromCfg() {
    if (els.phraseFmt) els.phraseFmt.value = cfgArrayToText(phraseCfg.fmt);
    if (els.phraseUnit) els.phraseUnit.value = cfgArrayToText(phraseCfg.unit);
    if (els.phrasePart3) els.phrasePart3.value = cfgArrayToText(phraseCfg.part3);
    if (els.phrasePart4) els.phrasePart4.value = cfgArrayToText(phraseCfg.part4);
    if (els.phrasePart4Prob) els.phrasePart4Prob.value = String(clamp(phraseCfg.part4Prob, 0, 100));
  }

  function readPhraseCfgFromUi() {
    const next = {
      fmt: linesToWeightedArray(els.phraseFmt?.value, DEFAULT_PHRASE_CFG.fmt),
      unit: linesToWeightedArray(els.phraseUnit?.value, DEFAULT_PHRASE_CFG.unit),
      part3: linesToWeightedArray(els.phrasePart3?.value, DEFAULT_PHRASE_CFG.part3),
      part4: linesToWeightedArray(els.phrasePart4?.value, DEFAULT_PHRASE_CFG.part4),
      part4Prob: clamp(els.phrasePart4Prob?.value, 0, 100),
    };
    return next;
  }

  function bindPhraseUi() {
    // UI가 없으면(구버전 HTML 등) 조용히 종료
    if (!els.phraseFmt || !els.phraseUnit || !els.phrasePart3 || !els.phrasePart4 || !els.phrasePart4Prob) return;

    fillPhraseUiFromCfg();

    const onEdit = () => {
      phraseCfg = readPhraseCfgFromUi();
      // 다른 수치들처럼 변경 즉시 저장(클라우드 저장 타이머 사용)
      scheduleCloudSave();
      // 조합이 바뀌면 프리셋 1~10 배정도 초기화(새 조합으로 재배정)
      presetPart4Assignment = null;
      presetPart4PoolKey = "";
    };
    els.phraseFmt.addEventListener("input", onEdit);
    els.phraseUnit.addEventListener("input", onEdit);
    els.phrasePart3.addEventListener("input", onEdit);
    els.phrasePart4.addEventListener("input", onEdit);
    els.phrasePart4Prob.addEventListener("input", onEdit);
    els.phrasePart4Prob.addEventListener("change", onEdit);
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), 1000);
  }
  showToast._t = null;

  function showToastFor(message, ms) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  function showCenterTip(message, ms = 1000) {
    if (!centerTipEl) return;
    centerTipEl.textContent = message;
    centerTipEl.classList.add("show");
    clearTimeout(showCenterTip._t);
    showCenterTip._t = setTimeout(() => centerTipEl.classList.remove("show"), ms);
  }
  showCenterTip._t = null;

  async function copyTextWithSelection(text) {
    const t = String(text || "");
    if (!t.trim()) return false;

    // 1) clipboard API 우선
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(t);
        return true;
      } catch {
        // fallthrough
      }
    }

    // 2) fallback: 임시 textarea 생성 후 전체 선택 + execCommand
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select(); // "전체 선택" 느낌
    try {
      const ok = document.execCommand && document.execCommand("copy");
      return !!ok;
    } finally {
      document.body.removeChild(ta);
    }
  }

  function selectElementText(el) {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const LS_SIDE_TS = "coinbreaker_side_ts";
  const LS_ENTRY_TS = "coinbreaker_entry_ts";

  const LS_CLOUD_LAST_PULL = "coinbreaker_cloud_last_pull";

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
        padX: toVal(els.padX),
        topPercentY: toVal(els.topPercentY),
        topProfitY: toVal(els.topProfitY),
        percentSignDy: toVal(els.percentSignDy),
        sectionStartY: toVal(els.sectionStartY),
        rowGap: toVal(els.rowGap),
        labelToValueGap: toVal(els.labelToValueGap),
        sideDx: toVal(els.sideDx),
        sideDy: toVal(els.sideDy),
        r1LabelDy: toVal(els.r1LabelDy),
        r1ValueDy: toVal(els.r1ValueDy),
        r2LabelDy: toVal(els.r2LabelDy),
        r2ValueDy: toVal(els.r2ValueDy),
        r3LabelDy: toVal(els.r3LabelDy),
        r3ValueDy: toVal(els.r3ValueDy),
        r4LabelDy: toVal(els.r4LabelDy),
        r4ValueDy: toVal(els.r4ValueDy),
      },
      bg: { shiftX: bgShiftX, shiftY: bgShiftY },
      textAdjust,
      // 프리셋 문구(자동 생성) 조합 설정도 DB에 같이 저장
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
    if (s.side) {
      setVal(els.side, s.side);
      if (["LONG", "SHORT"].includes(String(s.side).toUpperCase())) setTs(LS_SIDE_TS);
    }
    setVal(els.leverage, s.leverage);
    setVal(els.entry, s.entry);
    if (s.entry) setTs(LS_ENTRY_TS);
    setVal(els.bgZoom, s.bgZoom);
    setVal(els.count, s.count);
    setVal(els.prefix, s.prefix);

    setVal(els.padX, s.padX);
    setVal(els.topPercentY, s.topPercentY);
    setVal(els.topProfitY, s.topProfitY);
    setVal(els.percentSignDy, s.percentSignDy);
    setVal(els.sectionStartY, s.sectionStartY);
    setVal(els.rowGap, s.rowGap);
    setVal(els.labelToValueGap, s.labelToValueGap);
    setVal(els.sideDx, s.sideDx);
    setVal(els.sideDy, s.sideDy);
    setVal(els.r1LabelDy, s.r1LabelDy);
    setVal(els.r1ValueDy, s.r1ValueDy);
    setVal(els.r2LabelDy, s.r2LabelDy);
    setVal(els.r2ValueDy, s.r2ValueDy);
    setVal(els.r3LabelDy, s.r3LabelDy);
    setVal(els.r3ValueDy, s.r3ValueDy);
    setVal(els.r4LabelDy, s.r4LabelDy);
    setVal(els.r4ValueDy, s.r4ValueDy);

    if (state.bg) {
      if (typeof state.bg.shiftX === "number") bgShiftX = state.bg.shiftX;
      if (typeof state.bg.shiftY === "number") bgShiftY = state.bg.shiftY;
    }

    if (state.textAdjust && typeof state.textAdjust === "object") {
      Object.keys(textAdjust).forEach((k) => delete textAdjust[k]);
      Object.assign(textAdjust, state.textAdjust);
    }

    // 프리셋 문구 조합 설정 (DB에서 불러오기)
    if (state.phraseCfg && typeof state.phraseCfg === "object") {
      const pc = state.phraseCfg;
      phraseCfg = {
        fmt: Array.isArray(pc.fmt) ? pc.fmt : DEFAULT_PHRASE_CFG.fmt,
        unit: Array.isArray(pc.unit) ? pc.unit : DEFAULT_PHRASE_CFG.unit,
        part3: Array.isArray(pc.part3) ? pc.part3 : DEFAULT_PHRASE_CFG.part3,
        part4: Array.isArray(pc.part4) ? pc.part4 : DEFAULT_PHRASE_CFG.part4,
        part4Prob: clamp(pc.part4Prob, 0, 100),
      };
      // UI에도 반영
      fillPhraseUiFromCfg();
    }

    // 미리보기 엔트리 랜덤값 재계산
    sampleEntry = null;
    lastEntryBase = null;
    syncBgShiftInputs();
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
        setTs(LS_CLOUD_LAST_PULL);
        showToastFor("클라우드 불러오기 완료", 1500);
      } else {
        showToastFor("클라우드 데이터 없음", 1500);
      }
    } catch (e) {
      console.error(e);
      showToastFor("클라우드 불러오기 실패", 2000);
    }
  }

  async function cloudSaveNow() {
    if (!cloudConfigured()) {
      showToastFor("Supabase 설정값(SUPABASE_URL/ANON_KEY) 필요", 2000);
      return;
    }
    try {
      const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?on_conflict=id`;
      const body = [{ id: SUPABASE_ROW_ID, data: collectState() }];
      const res = await fetch(url, {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      showToastFor("클라우드 저장됨", 1200);
    } catch (e) {
      console.error(e);
      showToastFor("클라우드 저장 실패", 2000);
    }
  }

  let cloudSaveTimer = null;
  let cloudReady = false;
  function scheduleCloudSave() {
    if (!cloudReady) return;
    if (!cloudConfigured()) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => cloudSaveNow(), 1200);
  }

  function syncBgShiftInputs() {
    if (els.bgShiftX) els.bgShiftX.value = String(Math.round(bgShiftX));
    if (els.bgShiftY) els.bgShiftY.value = String(Math.round(bgShiftY));
  }

  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    const a = Math.ceil(min);
    const b = Math.floor(max);
    if (b <= a) return a;
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function makePresetPhrase(percentValue, presetId) {
    // 1번 : ## / ##.## / ##.#
    const cfg = phraseCfg || DEFAULT_PHRASE_CFG;
    const fmt = pickFrom(cfg.fmt, "int");
    const absP = Math.abs(Number(percentValue) || 0);
    let numText = "";
    // 반올림 금지: 버림(Trunc)으로 처리
    if (fmt === "int") {
      numText = String(Math.floor(absP));
    } else if (fmt === "1") {
      const v = Math.floor(absP * 10) / 10;
      numText = v.toFixed(1);
    } else {
      const v = Math.floor(absP * 100) / 100;
      numText = v.toFixed(2);
    }

    // "##.0" 같은 경우 .0은 표시하지 않음
    if (numText.endsWith(".0")) numText = numText.slice(0, -2);

    // 2번 : % / 프로 / 퍼 / (빈칸)
    const unit = pickFrom(cfg.unit, "%");

    // 3번 : 감사합니다(2) / 고맙습니다(2) / 수익입니다(1)
    const part3 = pickFrom(cfg.part3, "감사합니다");

    // 4번 : 프리셋(1~10) 버튼에서는 "절대 중복 없이" 10개를 배정해서 붙임
    //       (10개 미만이면 프리셋 클릭 자체가 막히므로 여기서는 안전장치만 둠)
    let part4 = "";
    if (presetId != null) {
      const assign = ensurePresetPart4Assignment(cfg);
      const idx = Math.max(0, Math.min(9, Number(presetId) - 1));
      part4 = assign ? String(assign[idx] ?? "").trim() : "";
    } else {
      // (예비) presetId가 없는 호출이 생기면 기존 확률 로직 사용
      const p4prob = clamp(cfg.part4Prob, 0, 100) / 100;
      if (Math.random() < p4prob) part4 = pickFrom(cfg.part4, "");
    }

    const first = `${numText}${unit}`.trim();
    const rest = part4 ? `${part3} ${part4}` : part3;
    return `${first} ${rest}`.trim();
  }

  const DEFAULTS = {
    percentMin: "20",
    percentMax: "25",
    // 만원 단위 입력
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

  // 배경 이동은 입력칸 없이 버튼으로만 조절
  let bgShiftX = 0;
  let bgShiftY = 28;

  // ---- 스타일 (첨부 이미지 기준 통일) ----
  // 아래 매핑은 "캔버스(스크린샷 카드)"에 적용되는 기본 폰트/크기/색상입니다.
  // 다음에 설정값을 주면 이 블록만 수정하면 바로 전체에 반영되도록 세분화해두었습니다.
  //
  // # 1) 수익률(+) + 숫자  : percentNum  (Noto Sans KR Medium, 32px, #49F5B8)
  // # 2) 수익률(%)         : percentSign (Noto Sans KR Bold,   34px, #49F5B8)
  // # 3) 수익금(+) + WON   : profit      (Noto Sans KR Regular,20px, #49F5B8)
  // # 4) 라벨(코인/레버리지/진입가격/종료가격)
  // # 5) 코인 값(DOGE/USDT): stockValue  (Noto Sans KR Bold,   20px, #49F5B8)
  // # 6) 포지션(LONG/SHORT): side        (Noto Sans KR Bold,   18px, LONG=#49F5B8 / SHORT=#FA4F4F)
  // # 7) 값(100x/0.08608..): value       (Noto Sans KR Bold,   18px, #E8E6E3)
  const COLORS = {
    green: "rgb(73,245,184)",
    red: "rgb(250,79,79)",
    label: "rgb(176,169,159)",
    value: "rgb(232,230,227)",
  };

  const CARD_FONT_FAMILY = '"Noto Sans KR", system-ui, -apple-system, Segoe UI, Arial, sans-serif';

  // 캔버스 텍스트 ID별 기본 스타일(크기/굵기)
  const CARD_TEXT_BASE = {
    // 상단
    percentNum: { size: 32, weight: 500 },
    percentSign: { size: 34, weight: 600 },
    profit: { size: 20, weight: 400 },

    // 섹션
    stockLabel: { size: 16, weight: 400 },
    stockValue: { size: 20, weight: 600 },
    side: { size: 18, weight: 600 },

    leverageLabel: { size: 16, weight: 400 },
    leverageValue: { size: 18, weight: 600 },

    entryLabel: { size: 16, weight: 400 },
    entryValue: { size: 18, weight: 600 },

    exitLabel: { size: 16, weight: 400 },
    exitValue: { size: 18, weight: 600 },
  };

  // 좌표 (462x354 캔버스 기준). (제공된 .dg-body 카드 기준)
  const POS = {
    padX: 18,
    topPercentY: 44,
    topProfitY: 76,
    sectionStartY: 118,
    rowGap: 58,
    labelToValueGap: 24,
    // %가 숫자보다 살짝 아래에 붙는 느낌
    percentSignDy: 3,
    // 배경을 조금 더 "내려" 보이게(카드 안에서 배경이 아래로 이동)
    bgShiftDownPx: 28,
  };

  function numFrom(inputEl, fallback) {
    // inputEl이 없을 때 Number(null)=0 이 되어 좌표가 전부 0으로 깨지는 문제 방지
    if (!inputEl) return fallback;
    const v = Number(inputEl.value);
    return Number.isFinite(v) ? v : fallback;
  }

  function getFont() {
    // 사용자 입력이 없으면 기존 FONT 기반으로 fallback
    const sPercentNum = Math.max(1, Math.round(numFrom(els.sizePercentNum, 32)));
    const sPercentSign = Math.max(1, Math.round(numFrom(els.sizePercentSign, 34)));
    const sProfit = Math.max(1, Math.round(numFrom(els.sizeProfit, 20)));
    const sLabel = Math.max(1, Math.round(numFrom(els.sizeLabel, 16)));
    const sValue = Math.max(1, Math.round(numFrom(els.sizeValue, 18)));
    const sSide = Math.max(1, Math.round(numFrom(els.sizeSide, 18)));
    return {
      percentNum: `500 ${sPercentNum}px Roboto`,
      percentSign: `500 ${sPercentSign}px Roboto`,
      profit: `500 ${sProfit}px Roboto`,
      label: `400 ${sLabel}px Roboto`,
      value: `700 ${sValue}px Roboto`,
      side: `700 ${sSide}px Roboto`,
    };
  }

  function getPos() {
    return {
      padX: Math.round(numFrom(els.padX, POS.padX)),
      topPercentY: Math.round(numFrom(els.topPercentY, POS.topPercentY)),
      topProfitY: Math.round(numFrom(els.topProfitY, POS.topProfitY)),
      sectionStartY: Math.round(numFrom(els.sectionStartY, POS.sectionStartY)),
      rowGap: Math.round(numFrom(els.rowGap, POS.rowGap)),
      labelToValueGap: Math.round(numFrom(els.labelToValueGap, POS.labelToValueGap)),
      percentSignDy: Math.round(numFrom(els.percentSignDy, POS.percentSignDy)),
      sideDx: Math.round(numFrom(els.sideDx, 6)),
      sideDy: Math.round(numFrom(els.sideDy, 0)),
      rowLabelDy: [
        Math.round(numFrom(els.r1LabelDy, 0)),
        Math.round(numFrom(els.r2LabelDy, 0)),
        Math.round(numFrom(els.r3LabelDy, 0)),
        Math.round(numFrom(els.r4LabelDy, 0)),
      ],
      rowValueDy: [
        Math.round(numFrom(els.r1ValueDy, 0)),
        Math.round(numFrom(els.r2ValueDy, 0)),
        Math.round(numFrom(els.r3ValueDy, 0)),
        Math.round(numFrom(els.r4ValueDy, 0)),
      ],
    };
  }

  const bgImg = new Image();
  bgImg.src = "./bg.jpg";

  // 미리보기에서는 범위가 바뀌지 않으면 같은 랜덤 값을 유지
  let samplePercent = null; // number
  let sampleProfit = null; // number (int)
  let sampleEntry = null; // string (0.11445)
  let lastEntryBase = null; // string
  let lastPercentKey = null;
  let lastProfitKey = null;

  // 생성 결과(갤러리)
  /** @type {{percent:number, profit:number}[]} */
  let generatedItems = [];
  let previewIndex = -1; // 생성된 것 중 현재 미리보기로 보여줄 인덱스

  // 캔버스 클릭 선택(글자 항목별 조정)
  /** @type {null | string} */
  let selectedTextId = null;
  /** @type {Record<string, {dx:number, dy:number, size:number|null, bold:boolean|null}>} */
  const textAdjust = {};
  /** @type {Record<string, {x:number, y:number}>} */
  const baseAnchor = {};
  /** @type {{id:string,name:string,x:number,y:number,w:number,h:number,size:number}[]} */
  let lastHitboxes = [];

  function parseRange(text, fallbackMin, fallbackMax) {
    const t = String(text || "")
      .trim()
      .replace("%", "")
      .replace("+", "")
      .replace(/\s+/g, "");
    if (!t) return [fallbackMin, fallbackMax];
    const parts = t.split(/~|-/).filter(Boolean);
    if (parts.length === 1) {
      const v = Number(parts[0].replace(/,/g, ""));
      return [v, v];
    }
    if (parts.length >= 2) {
      const a = Number(parts[0].replace(/,/g, ""));
      const b = Number(parts[1].replace(/,/g, ""));
      return a <= b ? [a, b] : [b, a];
    }
    return [fallbackMin, fallbackMax];
  }

  function roundTo(value, digits) {
    const f = 10 ** digits;
    return Math.round((value + Number.EPSILON) * f) / f;
  }

  function parseNumber(text, fallback) {
    const t = String(text ?? "")
      .trim()
      .replace(/,/g, "")
      .replace("%", "");
    const n = Number(t);
    return Number.isFinite(n) ? n : fallback;
  }

  function pickPercent2NoZeroSecondDigit(pMin, pMax) {
    // 0.01 단위 정수로 뽑되, (x*100)%10 != 0  (백분의 자리 0 금지)
    const minI = Math.ceil(Math.min(pMin, pMax) * 100);
    const maxI = Math.floor(Math.max(pMin, pMax) * 100);
    let pi = minI;
    if (minI === maxI) {
      // 범위가 단일 값이면 그대로 사용 (이 값이 0으로 끝나면 범위 내에서 해결 불가)
    } else {
      for (let k = 0; k < 60; k++) {
        const cand = Math.floor(Math.random() * (maxI - minI + 1)) + minI;
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

  function formatPercent(p) {
    // 소수점 2자리 무조건 표시
    return `+${Number(p).toFixed(2)}%`;
  }

  function formatProfit(won) {
    return `+${won.toLocaleString("en-US")} WON`;
  }

  function getPercentMinMax() {
    const a = parseNumber(els.percentMin?.value, 20);
    const b = parseNumber(els.percentMax?.value, 25);
    const minP = Math.min(a, b);
    const maxP = Math.max(a, b);
    return { minP, maxP };
  }

  function parseEntryToInt(entryText) {
    // 기본 진입가 형식: 0.11445 (소수 5자리)
    const n = Number(String(entryText || "").trim());
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100000); // 1e5
  }

  function entryIntToText(intVal) {
    return (intVal / 100000).toFixed(5);
  }

  function trimTrailingZeroIn5dp(text) {
    // "0.10050" -> "0.1005" / "0.10000" -> "0.1"
    const s = String(text || "").trim();
    if (!s.includes(".")) return s;
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  function randomEntryFromBase(entryBaseText) {
    const baseInt = parseEntryToInt(entryBaseText);
    if (baseInt == null) return String(entryBaseText || "").trim();
    // 마지막 자리(소수 5번째 자리) 기준 +-2
    // 요청: 본 가격(0)도 포함해서 -2,-1,0,+1,+2 중 랜덤
    const deltas = [-2, -1, 0, 1, 2];
    const d = deltas[Math.floor(Math.random() * deltas.length)];
    const next = Math.max(0, baseInt + d);
    // 예: 0.10050 이 나오면 스크린샷에는 0.1005 로 보이게(끝 0 제거)
    return trimTrailingZeroIn5dp(entryIntToText(next));
  }

  function parseLeverage(text) {
    // "100x", "50X", "100" 등에서 숫자만 추출
    const m = String(text || "").match(/(\d+(\.\d+)?)/);
    const v = m ? Number(m[1]) : 1;
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  function computeExit(entry, pnlPercent, side, leverageText) {
    /**
     * 첨부 스크린샷 기준:
     * - 표시되는 +21.84% 는 '가격 변동률'이 아니라 레버리지 적용된 PnL% 입니다.
     * - 가격 변동률(%) = pnlPercent / leverage
     *   예) 100x, +21.84%  => 가격은 +0.2184% 움직임
     *
     * LONG: exit = entry * (1 + (pnlPercent/100)/leverage)
     * SHORT: exit = entry * (1 - (pnlPercent/100)/leverage)
     *
     * 소수점 5자리 반올림 후 5자리로 표시.
     */
    const e = Number(entry);
    const lev = parseLeverage(leverageText);
    const p = (Number(pnlPercent) / 100) / lev;
    const isShort = String(side || "").toUpperCase() === "SHORT";
    const raw = isShort ? e * (1 - p) : e * (1 + p);
    const rounded = roundTo(raw, 5);
    // 예: 0.10050 이 나오면 스크린샷에는 0.1005 로 보이게(끝 0 제거)
    return trimTrailingZeroIn5dp(rounded.toFixed(5));
  }

  function getBgZoom() {
    if (!els.bgZoom) return 1.0;
    const z = Number(els.bgZoom.value);
    if (!Number.isFinite(z) || z <= 0) return 1.0;
    return z;
  }

  function getBgShiftX() {
    return Math.round(bgShiftX);
  }

  function getBgShiftY() {
    return Math.round(bgShiftY);
  }

  function getCount() {
    const n = Number(els.count.value);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.floor(n));
  }

  function rerollIfNeeded(force = false) {
    const fk = `${String(els.profitMin?.value || "")}|${String(els.profitMax?.value || "")}`;
    const { minP, maxP } = getPercentMinMax();
    const pk = `${minP}|${maxP}`;
    if (force || pk !== lastPercentKey || fk !== lastProfitKey || samplePercent === null || sampleProfit === null) {
      samplePercent = pickPercent2NoZeroSecondDigit(minP, maxP);
      const { minWon, maxWon } = getProfitMinMax();
      sampleProfit = minWon === maxWon ? minWon : Math.floor(Math.random() * (maxWon - minWon + 1)) + minWon;
      lastPercentKey = pk;
      lastProfitKey = fk;
    }
    return { percent: samplePercent, profit: sampleProfit };
  }

  function parseManWon(text, fallbackManWon) {
    // 만원 단위 입력 -> WON 변환
    const man = parseNumber(text, fallbackManWon);
    return Math.floor(man * 10000);
  }

  function getProfitMinMax() {
    const a = parseManWon(els.profitMin?.value, 300);
    const b = parseManWon(els.profitMax?.value, 1000);
    const minWon = Math.min(a, b);
    const maxWon = Math.max(a, b);
    return { minWon, maxWon };
  }

  function randomPercentProfit() {
    const { minP: pMin, maxP: pMax } = getPercentMinMax();
    const { minWon: fMin, maxWon: fMax } = getProfitMinMax();
    const p = pickPercent2NoZeroSecondDigit(pMin, pMax);
    const f = fMin === fMax ? fMin : Math.floor(Math.random() * (fMax - fMin + 1)) + fMin;
    return { percent: p, profit: f };
  }

  function drawBackgroundCoverTo(targetCtx) {
    // cover 렌더링 (center/cover)
    const iw = bgImg.naturalWidth || bgImg.width;
    const ih = bgImg.naturalHeight || bgImg.height;
    if (!iw || !ih) return;

    // --- 배경 이미지가 "가로는 맞는데 세로가 부족"한 경우 ---
    // 사용자가 말한 것처럼 작은 bg를 위아래로 이어붙인(타일) 느낌을 그대로 재현:
    // 1) 가로를 캔버스 폭에 맞춘 스케일을 기준으로
    // 2) 세로가 캔버스보다 작으면 repeat-y로 채웁니다.
    // (기존 cover 크롭 방식은 작은 이미지에서도 확대되어 seam이 안 나지만,
    //  원본처럼 "이어붙인" 느낌을 원할 때는 repeat-y가 맞습니다.)
    const zoom = getBgZoom();
    const scaleToWidth = (CANVAS_W / iw) * zoom;
    const tileDw = Math.max(1, Math.round(iw * scaleToWidth));
    const tileDh = Math.max(1, Math.round(ih * scaleToWidth));
    if (tileDh > 0 && tileDh < CANVAS_H) {
      const dx0 = Math.round((CANVAS_W - tileDw) / 2);
      const dx = dx0 + getBgShiftX();

      // shiftY는 "패턴 시작점"을 이동시키되, 항상 빈 공간 없이 채워지도록 모듈러로 처리
      const offY = getBgShiftY();
      const mod = ((offY % tileDh) + tileDh) % tileDh;
      let y = -tileDh + mod;
      while (y < CANVAS_H) {
        targetCtx.drawImage(bgImg, dx, y, tileDw, tileDh);
        y += tileDh;
      }
      return;
    }

    // cover(기본) 기준 배율
    const baseScale = Math.max(CANVAS_W / iw, CANVAS_H / ih);
    const scale = baseScale * zoom;

    // zoom >= 1: "크롭창 이동" 방식 (기존 cover 이동)
    if (zoom >= 1) {
      const sw = CANVAS_W / scale;
      const sh = CANVAS_H / scale;
      const sx0 = (iw - sw) / 2;
      const sy0 = (ih - sh) / 2;
      const shiftXSrc = getBgShiftX() / scale;
      const shiftYSrc = getBgShiftY() / scale;
      let sx = sx0 - shiftXSrc;
      let sy = sy0 - shiftYSrc;

      sy = Math.max(0, Math.min(sy, ih - sh));
      sx = Math.max(0, Math.min(sx, iw - sw));
      targetCtx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
      return;
    }

    // zoom < 1: 이미지가 캔버스보다 작아질 수 있으므로 "캔버스 위에서 이미지 자체를 이동" 방식으로 처리
    // (이때 네비게이터는 dest 좌표를 움직여서 항상 동작하게 함)
    // 서브픽셀(소수점)로 그리면 가장자리 1px 투명/흰줄이 생길 수 있어서 정수 픽셀로 스냅
    const dw = Math.max(1, Math.round(iw * scale));
    const dh = Math.max(1, Math.round(ih * scale));
    const dx0 = Math.round((CANVAS_W - dw) / 2);
    const dy0 = Math.round((CANVAS_H - dh) / 2);

    const dx = dx0 + getBgShiftX();
    const dy = dy0 + getBgShiftY();

    // 남는 영역(빈 부분)은 아무것도 채우지 않음(투명)
    // => "배경 박스(실제 이미지)"만 보이게
    targetCtx.drawImage(bgImg, dx, dy, dw, dh);
  }

  function drawBackgroundCover() {
    drawBackgroundCoverTo(ctx);
  }

  function splitPercentText(text) {
    // "+21.84%" => ["+21.84", "%"]
    const t = (text || "").trim();
    if (t.endsWith("%")) return [t.slice(0, -1), "%"];
    return [t, ""];
  }

  function getOrInitAdjust(id) {
    if (!textAdjust[id]) textAdjust[id] = { dx: 0, dy: 0, size: null, bold: null };
    return textAdjust[id];
  }

  function parseFontSizePx(fontStr, fallback = 16) {
    const m = String(fontStr || "").match(/(\d+(?:\.\d+)?)px/);
    return m ? Number(m[1]) : fallback;
  }

  function getBaseStyleForTextId(id) {
    if (CARD_TEXT_BASE[id]) return CARD_TEXT_BASE[id];
    if (String(id).endsWith("Label")) return { size: 16, weight: 400 };
    return { size: 18, weight: 600 };
  }

  function fontForTextId(id) {
    const adj = getOrInitAdjust(id);
    const baseStyle = getBaseStyleForTextId(id);
    const baseW = baseStyle.weight;
    const w = adj.bold === true ? 600 : adj.bold === false ? baseW : baseW;
    const size = adj.size == null ? baseStyle.size : adj.size;
    return `${w} ${size}px ${CARD_FONT_FAMILY}`;
  }

  function drawTextTo(targetCtx, { id, name, text, x, y, font, fill, recordHitbox }) {
    const adj = getOrInitAdjust(id);
    const xx = x + adj.dx;
    const yy = y + adj.dy;
    targetCtx.font = font;
    targetCtx.fillStyle = fill;
    targetCtx.fillText(text, xx, yy);

    const size = parseFontSizePx(font, 16);
    if (recordHitbox) {
      const m = targetCtx.measureText(text);
      const asc = Number.isFinite(m.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : size * 0.8;
      const des = Number.isFinite(m.actualBoundingBoxDescent) ? m.actualBoundingBoxDescent : size * 0.25;
      lastHitboxes.push({
        id,
        name,
        x: xx,
        y: yy - asc,
        w: m.width,
        h: asc + des,
        size,
      });
      return m.width;
    }
    return targetCtx.measureText(text).width;
  }

  function buildCardTextData(percentValue, profitValue, entryOverride) {
    const symbol = (els.symbol?.value || "").trim();
    const side = (els.side?.value || "LONG").trim();
    const leverage = (els.leverage?.value || "").trim();
    const entry = (entryOverride ?? els.entry?.value ?? "").trim();
    if (els.entryReal) els.entryReal.value = entry;
    const exit = computeExit(entry, percentValue, side, leverage);
    if (els.exit) els.exit.value = exit;
    return {
      percentText: formatPercent(percentValue),
      profitText: formatProfit(profitValue),
      symbol,
      side,
      leverage,
      entry,
      exit,
    };
  }

  function drawCardTo(targetCtx, percentValue, profitValue, { recordHitboxes = false, entryOverride } = {}) {
    const POS2 = getPos();

    if (recordHitboxes) lastHitboxes = [];

    targetCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackgroundCoverTo(targetCtx);

    const t = buildCardTextData(percentValue, profitValue, entryOverride);
    targetCtx.textAlign = "left";
    targetCtx.textBaseline = "alphabetic";

    // percent (+24.8%)
    const [pNum, pSign] = splitPercentText(t.percentText);
    const x0 = POS2.padX;
    // 요청: 수익률(숫자) 시작점을 현재보다 5px 아래로
    const y0 = POS2.topPercentY + 5;
    const wNum = drawTextTo(targetCtx, {
      id: "percentNum",
      name: "수익률 숫자",
      text: pNum,
      x: x0,
      y: y0,
      font: fontForTextId("percentNum"),
      fill: COLORS.green,
      recordHitbox: recordHitboxes,
    });
    if (pSign) {
      // % 위치는 최초 렌더링 기준(anchor)을 고정하고, 이후에는 그 기준에서만 이동
      // 요청: % 시작점을 위로 1px 더 이동 => 아래 3px, 왼쪽 1px
      if (!baseAnchor.percentSign) baseAnchor.percentSign = { x: x0 + wNum + 1 - 1, y: y0 + POS2.percentSignDy + 3 };
      drawTextTo(targetCtx, {
        id: "percentSign",
        name: "%",
        text: pSign,
        x: baseAnchor.percentSign.x,
        y: baseAnchor.percentSign.y,
        font: fontForTextId("percentSign"),
        fill: COLORS.green,
        recordHitbox: recordHitboxes,
      });
    }

    // profit
    drawTextTo(targetCtx, {
      id: "profit",
      name: "수익금",
      text: t.profitText,
      x: POS2.padX,
      y: POS2.topProfitY,
      font: fontForTextId("profit"),
      fill: COLORS.green,
      recordHitbox: recordHitboxes,
    });

    // rows
    const rows = [
      { key: "stock", label: "코인", value: t.symbol, extra: t.side },
      { key: "leverage", label: "레버리지", value: t.leverage },
      { key: "entry", label: "진입가격", value: t.entry },
      { key: "exit", label: "종료가격", value: t.exit },
    ];

    rows.forEach((row, idx) => {
      const baseY = POS2.sectionStartY + idx * POS2.rowGap;
      const labelY = baseY + (POS2.rowLabelDy?.[idx] ?? 0);
      const valueY = baseY + POS2.labelToValueGap + (POS2.rowValueDy?.[idx] ?? 0);

      const labelId = `${row.key}Label`;
      const valueId = `${row.key}Value`;

      drawTextTo(targetCtx, {
        id: labelId,
        name: `${row.label} 라벨`,
        text: row.label,
        x: POS2.padX,
        y: labelY,
        font: fontForTextId(labelId),
        fill: COLORS.label,
        recordHitbox: recordHitboxes,
      });

      // 원본 기준: "DOGE/USDT"는 흰색 계열(value), 포지션(LONG/SHORT)만 색상으로 구분
      const valueFill = COLORS.value;
      const wVal = drawTextTo(targetCtx, {
        id: valueId,
        name: `${row.label} 값`,
        text: row.value,
        x: POS2.padX,
        y: valueY,
        font: fontForTextId(valueId),
        fill: valueFill,
        recordHitbox: recordHitboxes,
      });

      if (idx === 0 && row.extra) {
        // LONG/SHORT 위치도 최초 렌더링 기준(anchor)을 고정
        if (!baseAnchor.side) {
          baseAnchor.side = { x: POS2.padX + wVal + POS2.sideDx, y: valueY + POS2.sideDy };
        }
        drawTextTo(targetCtx, {
          id: "side",
          name: "LONG/SHORT",
          text: row.extra,
          x: baseAnchor.side.x,
          y: baseAnchor.side.y,
          font: fontForTextId("side"),
          fill: String(row.extra).toUpperCase() === "SHORT" ? COLORS.red : COLORS.green,
          recordHitbox: recordHitboxes,
        });
      }
    });

    // 선택 강조 표시(미리보기)
    if (recordHitboxes && selectedTextId) {
      const b = lastHitboxes.find((x) => x.id === selectedTextId);
      if (b) {
        targetCtx.save();
        targetCtx.strokeStyle = "rgba(255,255,255,0.55)";
        targetCtx.lineWidth = 1;
        targetCtx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
        targetCtx.restore();
      }
    }
  }

  function renderPreview() {
    // 생성된 결과가 있으면 그 중 선택된(또는 첫번째) 것을 미리보기로
    if (generatedItems.length > 0) {
      if (previewIndex < 0 || previewIndex >= generatedItems.length) previewIndex = 0;
      const it = generatedItems[previewIndex];
      drawCardTo(ctx, it.percent, it.profit, { recordHitboxes: true, entryOverride: it.entry });
      return;
    }
    // 생성된 결과가 없을 때: 기준진입가 마지막 자리 +-2 랜덤 적용
    const baseEntry = (els.entry?.value || "").trim();
    if (sampleEntry == null || lastEntryBase !== baseEntry) {
      sampleEntry = randomEntryFromBase(baseEntry);
      lastEntryBase = baseEntry;
    }
    const { percent, profit } = rerollIfNeeded(false);
    drawCardTo(ctx, percent, profit, { recordHitboxes: true, entryOverride: sampleEntry });
  }

  function renderGallery() {
    // (생성 결과 UI 제거됨)
  }

  function renderAll() {
    renderPreview();
  }

  function setSide(value, { closeModal = true } = {}) {
    if (els.side) els.side.value = value;
    if (sideUi.longBtn) sideUi.longBtn.classList.toggle("active", value === "LONG");
    if (sideUi.shortBtn) sideUi.shortBtn.classList.toggle("active", value === "SHORT");
    // LONG/SHORT 선택도 다른 값들처럼 클라우드 저장 대상
    if (["LONG", "SHORT"].includes(String(value).toUpperCase())) setTs(LS_SIDE_TS);
    renderAll();
    scheduleCloudSave();
  }

  function bindSideUi() {
    // 메인 버튼
    if (sideUi.longBtn)
      sideUi.longBtn.addEventListener("click", () => {
        setSide("LONG", { closeModal: false });
      });
    if (sideUi.shortBtn)
      sideUi.shortBtn.addEventListener("click", () => {
        setSide("SHORT", { closeModal: false });
      });
  }

  function getBgRectOnCanvas() {
    const W = CANVAS_W;
    const H = CANVAS_H;
    const iw = bgImg.naturalWidth || bgImg.width;
    const ih = bgImg.naturalHeight || bgImg.height;
    if (!iw || !ih) return { x: 0, y: 0, w: W, h: H };

    const zoom = getBgZoom();

    // repeat-y 모드에서는 배경이 항상 캔버스를 꽉 채우므로 전체를 반환
    const scaleToWidth = (W / iw) * zoom;
    const tileDh = Math.max(1, Math.round(ih * scaleToWidth));
    if (tileDh > 0 && tileDh < H) return { x: 0, y: 0, w: W, h: H };

    const baseScale = Math.max(W / iw, H / ih);
    const scale = baseScale * zoom;

    // zoom >= 1: 배경은 항상 캔버스를 꽉 채움
    if (zoom >= 1) return { x: 0, y: 0, w: W, h: H };

    // zoom < 1: 배경이 캔버스보다 작아질 수 있으므로, 실제 배경이 그려진 영역만 반환(검정 영역 제외)
    // drawBackgroundCoverTo()와 동일한 정수 스냅 로직을 사용해 "투명 1px"이 포함되지 않게 함
    const dw = Math.max(1, Math.round(iw * scale));
    const dh = Math.max(1, Math.round(ih * scale));
    const dx0 = Math.round((W - dw) / 2);
    const dy0 = Math.round((H - dh) / 2);
    const dx = dx0 + getBgShiftX();
    const dy = dy0 + getBgShiftY();

    const x1 = Math.max(0, dx);
    const y1 = Math.max(0, dy);
    const x2 = Math.min(W, dx + dw);
    const y2 = Math.min(H, dy + dh);
    const w = Math.max(0, x2 - x1);
    const h = Math.max(0, y2 - y1);

    // 너무 작아져서 유효 영역이 없으면(극단값) 안전하게 전체로
    if (w < 2 || h < 2) return { x: 0, y: 0, w: W, h: H };
    return { x: x1, y: y1, w, h };
  }


  function computeCropRect() {
    const bgRect = getBgRectOnCanvas();
    const L = bgRect.x;
    const T = bgRect.y;
    const R = bgRect.x + bgRect.w;
    const B = bgRect.y + bgRect.h;

    // 15%: 세로 전체 글씨 포함 / 15%: 거의 전체 이미지 / 70%: 수익률+수익금 포함 랜덤
    const mode = Math.random();

    // (2) 15% - 거의 전체 이미지 (단, 항상 배경 영역 안에서만)
    if (mode >= 0.15 && mode < 0.30) {
      // 가로는 60~100% 사이를 1% 단위로 랜덤 (왼쪽은 항상 배경의 왼쪽 끝)
      const widthPct = randInt(60, 100) / 100;
      const cropW = Math.max(1, Math.floor(bgRect.w * widthPct));

      const maxMy = Math.min(24, Math.floor(bgRect.h * 0.08));
      const myT = randInt(0, Math.max(0, maxMy));
      const myB = randInt(0, Math.max(0, maxMy));
      const x = L; // 왼쪽 고정
      const y = T + myT;
      const w = cropW;
      const h = Math.max(1, bgRect.h - myT - myB); // 세로는 길게 나올 수 있게(거의 전체)
      return { x, y, w, h };
    }

    // 배경이 축소된 상태(bgRect가 작을 때)에도 랜덤 크롭이 되도록 패딩을 bgRect 크기에 비례해 제한
    const padMaxX = Math.max(10, Math.floor(bgRect.w * 0.18));
    const padMaxY = Math.max(10, Math.floor(bgRect.h * 0.18));
    const padL = randInt(10, padMaxX);
    const padT = randInt(10, padMaxY);
    const padR = randInt(10, padMaxX);
    const padB = randInt(10, padMaxY);

    let boxes = [];
    if (mode < 0.15) {
      boxes = lastHitboxes.slice(); // 전체 글씨
    } else {
      const wanted = ["percentNum", "percentSign", "profit"]; // 수익률/수익금
      boxes = lastHitboxes.filter((b) => wanted.includes(b.id));
    }
    if (boxes.length === 0) boxes = lastHitboxes.slice();
    if (boxes.length === 0) return { x: L, y: T, w: bgRect.w, h: bgRect.h };

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    boxes.forEach((b) => {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    });

    // 글자 외곽(특히 왼쪽 첫 글자) 절대 안 잘리게: 추가 안전 여백
    // (hitbox가 글리프의 왼쪽/오버행을 100% 포함 못하는 경우가 있어 고정 여유를 더함)
    const SAFE_L = 26;
    const SAFE_R = 18;
    const SAFE_T = 16;
    const SAFE_B = 16;

    const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
    // 필수 포함 영역(텍스트 포함)도 배경 영역 안으로만 클램프
    const reqX = clamp(Math.floor(minX - padL - SAFE_L), L, R);
    const reqY = clamp(Math.floor(minY - padT - SAFE_T), T, B);
    const reqMaxX = clamp(Math.ceil(maxX + padR + SAFE_R), L, R);
    const reqMaxY = clamp(Math.ceil(maxY + padB + SAFE_B), T, B);
    const reqW = Math.max(1, reqMaxX - reqX);
    const reqH = Math.max(1, reqMaxY - reqY);

    // 배경 영역이 너무 작아서 텍스트 포함이 불가능하면 배경 영역 전체로
    if (reqW >= bgRect.w || reqH >= bgRect.h) return { x: L, y: T, w: bgRect.w, h: bgRect.h };

    const extraW = mode < 0.15 ? randInt(80, 260) : randInt(40, 220);
    const extraH = mode < 0.15 ? randInt(60, 160) : randInt(20, 120);
    // 왼쪽은 고정(L)이고 오른쪽만 랜덤: 최소 폭은 "필수 포함 영역"의 오른쪽 끝(reqMaxX)까지
    const minReqW = Math.max(1, reqMaxX - L);
    if (minReqW >= bgRect.w) return { x: L, y: T, w: bgRect.w, h: bgRect.h };

    const wUpper = Math.min(bgRect.w, minReqW + extraW);
    const hUpper = Math.min(bgRect.h, reqH + extraH);
    const w = randInt(minReqW, Math.max(minReqW, wUpper));
    const h = randInt(reqH, Math.max(reqH, hUpper));

    // x는 항상 배경의 왼쪽 끝
    const x = L;
    const yMin = Math.max(T, reqMaxY - h);
    const yMax = Math.min(B - h, reqY);

    const y = randInt(Math.min(yMin, yMax), Math.max(yMin, yMax));
    return { x, y, w, h };
  }

  async function copyCanvasToClipboardAndPreview() {
    // ClipboardItem은 HTTPS 환경에서 안정적으로 동작 (Vercel 권장)
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      throw new Error("클립보드 API를 지원하지 않습니다.");
    }

    const crop = computeCropRect();
    // 화질 개선: 업스케일(>1.0)에서 품질 저하가 커서, 랜덤은 유지하되 1.0 이하로 제한(다운스케일만)
    const scale = randFloat(0.7, 1.0);
    const outW = Math.max(1, Math.round(crop.w * scale));
    const outH = Math.max(1, Math.round(crop.h * scale));

    // 다운스케일 품질 개선(슈퍼샘플링): 2배로 렌더링 후 다시 축소
    const SS = 2;
    const hi = document.createElement("canvas");
    hi.width = outW * SS;
    hi.height = outH * SS;
    const hiCtx = hi.getContext("2d");
    hiCtx.imageSmoothingEnabled = true;
    hiCtx.imageSmoothingQuality = "high";
    // HiDPI 캔버스(미리보기)는 devicePixelRatio로 내부 해상도가 커져있을 수 있어 source 좌표에 dpr을 곱함
    const dpr = canvasDpr || 1;
    hiCtx.drawImage(canvas, crop.x * dpr, crop.y * dpr, crop.w * dpr, crop.h * dpr, 0, 0, hi.width, hi.height);

    const off = document.createElement("canvas");
    off.width = outW;
    off.height = outH;
    const offCtx = off.getContext("2d");
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = "high";
    offCtx.drawImage(hi, 0, 0, hi.width, hi.height, 0, 0, outW, outH);

    const blob = await new Promise((resolve, reject) => {
      off.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/png");
    });

    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);

    if (croppedPreviewImg) {
      if (lastCroppedPreviewUrl) URL.revokeObjectURL(lastCroppedPreviewUrl);
      lastCroppedPreviewUrl = URL.createObjectURL(blob);
      croppedPreviewImg.src = lastCroppedPreviewUrl;
    }
  }

  async function ensureFontsReady() {
    // Roboto 로딩 대기(가능한 경우)
    if (document.fonts && document.fonts.ready) {
      try {
        // 캔버스에서 바로 쓰는 weight들을 명시적으로 로드(로컬 @font-face가 있어도 초기엔 미로드일 수 있음)
        if (document.fonts.load) {
          await Promise.allSettled([
            document.fonts.load('400 16px "Noto Sans KR"'),
            document.fonts.load('500 32px "Noto Sans KR"'),
            document.fonts.load('600 34px "Noto Sans KR"'),
          ]);
        }
        await document.fonts.ready;
      } catch {
        // ignore
      }
    }
  }

  function setupHiDpiCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.max(1, Math.floor((window.devicePixelRatio || 1) * 1000) / 1000);
    canvasDpr = dpr;
    // CSS 크기는 기존 논리 크기 유지
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    // 내부 해상도는 dpr만큼 확장
    canvas.width = Math.round(CANVAS_W * dpr);
    canvas.height = Math.round(CANVAS_H * dpr);
    // 이후 모든 draw는 "논리 좌표(462x354)"로 하도록 스케일 적용
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  function downloadPng() {
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "screenshot.png";
      a.click();
    } catch (e) {
      alert(
        "PNG 내보내기에 실패했습니다. (파일을 더블클릭으로 열면 보안 정책 때문에 실패할 수 있어요)\n\n" +
          "권장: python -m http.server 로 서버 실행 후 http://localhost:8000/index.html 로 접속해서 다시 시도해주세요."
      );
    }
  }

  function dataUrlToUint8Array(dataUrl) {
    const [meta, b64] = dataUrl.split(",");
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  async function downloadZip() {
    if (!window.JSZip) {
      alert("JSZip 로딩에 실패했습니다. 인터넷 연결을 확인해주세요.");
      return;
    }

    const n = getCount();
    const prefix = (els.prefix.value || "screenshot").trim() || "screenshot";

    const zip = new JSZip();

    // 오프스크린 캔버스에서 렌더링
    const off = document.createElement("canvas");
    off.width = CANVAS_W;
    off.height = CANVAS_H;
    const offCtx = off.getContext("2d");

    function renderTo(targetCtx, percentValue, profitValue, entryOverride) {
      drawCardTo(targetCtx, percentValue, profitValue, { recordHitboxes: false, entryOverride });
    }

    // 폰트 로딩 대기(가능한 경우)
    await ensureFontsReady();

    for (let i = 1; i <= n; i++) {
      const { percent: pv, profit: fv } = randomPercentProfit();
      const entryV = randomEntryFromBase((els.entry?.value || "").trim());
      renderTo(offCtx, pv, fv, entryV);
      const dataUrl = off.toDataURL("image/png");
      const bytes = dataUrlToUint8Array(dataUrl);
      const name = `${prefix}_${String(i).padStart(4, "0")}.png`;
      zip.file(name, bytes);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${prefix}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function bind() {
    const reRender = () => {
      renderAll();
      scheduleCloudSave();
    };
    Object.values(els).forEach((el) => {
      if (!el) return;
      if (el.tagName === "INPUT" || el.tagName === "SELECT") {
        el.addEventListener("input", reRender);
        el.addEventListener("change", reRender);
      }
    });

    // 기준진입가를 수정하면 "최근 1시간 내 확인"으로 간주
    if (els.entry) {
      const mark = () => setTs(LS_ENTRY_TS);
      els.entry.addEventListener("input", mark);
      els.entry.addEventListener("change", mark);
    }
    if (els.cloudLoad) els.cloudLoad.addEventListener("click", cloudLoad);
    if (els.cloudSave) els.cloudSave.addEventListener("click", cloudSaveNow);

    // 배경 확대/축소 0.1% 단위 버튼
    const bumpZoom = (delta) => {
      if (!els.bgZoom) return;
      const cur = Number(els.bgZoom.value);
      const next = (Number.isFinite(cur) ? cur : 1) + delta;
      const min = Number(els.bgZoom.getAttribute("min") ?? 0.5);
      const max = Number(els.bgZoom.getAttribute("max") ?? 2);
      const clamped = Math.min(max, Math.max(min, next));
      // 0.1% = 0.001 단위이므로 소수 3자리로 표시
      els.bgZoom.value = clamped.toFixed(3);
      renderAll();
      scheduleCloudSave();
    };
    if (els.zoomIn)
      els.zoomIn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        bumpZoom(+0.001);
      });
    if (els.zoomOut)
      els.zoomOut.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        bumpZoom(-0.001);
      });

    // 배경 이동 좌표 입력(X/Y)
    if (els.bgShiftX)
      els.bgShiftX.addEventListener("input", () => {
        const v = Number(els.bgShiftX.value);
        if (Number.isFinite(v)) bgShiftX = Math.round(v);
        renderAll();
        scheduleCloudSave();
      });
    if (els.bgShiftY)
      els.bgShiftY.addEventListener("input", () => {
        const v = Number(els.bgShiftY.value);
        if (Number.isFinite(v)) bgShiftY = Math.round(v);
        renderAll();
        scheduleCloudSave();
      });

    const doGenerate = () => {
      const n = getCount();
      const baseEntry = (els.entry?.value || "").trim();
      generatedItems = Array.from({ length: n }, () => {
        const { percent, profit } = randomPercentProfit();
        return { percent, profit, entry: randomEntryFromBase(baseEntry) };
      });
      previewIndex = generatedItems.length > 0 ? 0 : -1;
      renderAll();
    };

    if (els.generate) els.generate.addEventListener("click", doGenerate);

    // 프리셋: 수익금(만원) 범위만 변경 → 생성 → 문구 표시 → 자동 클립보드 복사 + 미리보기
    let firstPresetHintShown = false;
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const presetId = btn.getAttribute("data-preset");
        // 4) 추가 마무리 문구는 프리셋 1~10에서 "절대 중복 없이" 10개를 배정해서 사용
        // => (빈칸 포함) 항목 수가 10개 미만이면 경고 후 프리셋 동작 자체를 막음
        const cfg = phraseCfg || DEFAULT_PHRASE_CFG;
        const part4List = getPart4ListAll(cfg);
        if (part4List.length < 10) {
          showToastFor(`4) 추가 마무리 문구 항목이 10개 미만입니다. (현재 ${part4List.length}개)`, 2500);
          return;
        }
        // 배정이 아직 없으면 여기서 한번 생성(프리셋 1~10에 골고루 분배)
        ensurePresetPart4Assignment(cfg);

        const pmin = btn.getAttribute("data-pmin");
        const pmax = btn.getAttribute("data-pmax");
        if (els.profitMin && pmin != null) els.profitMin.value = String(pmin);
        if (els.profitMax && pmax != null) els.profitMax.value = String(pmax);

        // 새로 생성(프리셋 클릭은 사용자 제스처이므로 이 안에서 클립보드 복사가 가능)
        doGenerate();

        // 프리셋 문구(연속 중복 방지)
        const percentForPhrase = generatedItems?.[0]?.percent ?? samplePercent ?? 0;
        let phrase = "";
        for (let i = 0; i < 30; i++) {
          phrase = makePresetPhrase(percentForPhrase, presetId);
          if (phrase && phrase !== lastPresetPhrase) break;
        }
        lastPresetPhrase = phrase;
        const caption = presetId ? document.querySelector(`.preset-caption[data-preset="${presetId}"]`) : null;
        if (caption) {
          caption.textContent = phrase;
          // 프리셋 클릭만 해도 문구가 "드래그(선택)"된 상태로 보이게
          selectElementText(caption);
        }

        // 1) 프리셋 첫 클릭 시 2초 팝업
        if (!firstPresetHintShown) {
          firstPresetHintShown = true;
          showToastFor("프리셋 적용됨", 2000);
        }

        // 2) 롱/숏 또는 진입가를 최근 1시간 내에 확인/수정 안 했다면 2초 팝업
        const now = Date.now();
        const sideSelected = ["LONG", "SHORT"].includes(String(els.side?.value || "").toUpperCase());
        const sideTs = getTs(LS_SIDE_TS);
        const entryTs = getTs(LS_ENTRY_TS);
        const sideOk = sideSelected && now - sideTs < ONE_HOUR_MS;
        const entryOk = entryTs > 0 && now - entryTs < ONE_HOUR_MS;
        if (!sideSelected) {
          // 롱/숏을 아직 안 눌렀으면: 중앙 툴팁 1초
          showCenterTip("롱/숏 확인하세요", 1000);
        } else if (!sideOk || !entryOk) {
          showToastFor("롱/숏·진입가 확인하세요", 2000);
        }

        try {
          await copyCanvasToClipboardAndPreview();
          showToast("클립보드에 복사됨");
        } catch (e) {
          console.error(e);
          showToast("클립보드 복사 실패(HTTPS에서만 가능)");
        }
      });
    });

    // 프리셋 아래 문구 클릭 시: 드래그(선택)된 상태로만 만들기(복사는 하지 않음)
    document.querySelectorAll(".preset-caption").forEach((cap) => {
      cap.addEventListener("click", () => {
        selectElementText(cap);
      });
    });
    if (els.downloadZip) els.downloadZip.addEventListener("click", downloadZip);
    if (els.reroll)
      els.reroll.addEventListener("click", () => {
        if (generatedItems.length > 0) {
          const baseEntry = (els.entry?.value || "").trim();
          generatedItems = generatedItems.map(() => {
            const { percent, profit } = randomPercentProfit();
            return { percent, profit, entry: randomEntryFromBase(baseEntry) };
          });
          previewIndex = generatedItems.length > 0 ? Math.min(Math.max(previewIndex, 0), generatedItems.length - 1) : -1;
          renderAll();
        } else {
          rerollIfNeeded(true);
          // 미리보기(단건)도 생성할 때마다 진입가 랜덤 변경
          const baseEntry = (els.entry?.value || "").trim();
          sampleEntry = randomEntryFromBase(baseEntry);
          lastEntryBase = baseEntry;
          renderAll();
        }
      });
    if (els.reset)
      els.reset.addEventListener("click", () => {
      if (els.percentMin) els.percentMin.value = DEFAULTS.percentMin;
      if (els.percentMax) els.percentMax.value = DEFAULTS.percentMax;
      if (els.profitMin) els.profitMin.value = DEFAULTS.profitMin;
      if (els.profitMax) els.profitMax.value = DEFAULTS.profitMax;
      els.symbol.value = DEFAULTS.symbol;
      els.side.value = DEFAULTS.side;
      els.leverage.value = DEFAULTS.leverage;
      els.entry.value = DEFAULTS.entry;
      els.bgZoom.value = String(DEFAULTS.bgZoom.toFixed(2));
      bgShiftX = 0;
      bgShiftY = 28;
      els.count.value = String(DEFAULTS.count);
      els.prefix.value = DEFAULTS.prefix;
      if (els.padX) els.padX.value = "18";
      if (els.topPercentY) els.topPercentY.value = "44";
      if (els.topProfitY) els.topProfitY.value = "76";
      if (els.percentSignDy) els.percentSignDy.value = "3";
      if (els.sectionStartY) els.sectionStartY.value = "118";
      if (els.rowGap) els.rowGap.value = "58";
      if (els.labelToValueGap) els.labelToValueGap.value = "24";
      if (els.sideDx) els.sideDx.value = "6";
      if (els.sideDy) els.sideDy.value = "0";
      if (els.r1LabelDy) els.r1LabelDy.value = "0";
      if (els.r1ValueDy) els.r1ValueDy.value = "0";
      if (els.r2LabelDy) els.r2LabelDy.value = "0";
      if (els.r2ValueDy) els.r2ValueDy.value = "0";
      if (els.r3LabelDy) els.r3LabelDy.value = "0";
      if (els.r3ValueDy) els.r3ValueDy.value = "0";
      if (els.r4LabelDy) els.r4LabelDy.value = "0";
      if (els.r4ValueDy) els.r4ValueDy.value = "0";
      // 생성 결과/선택/개별 조정 초기화
      generatedItems = [];
      previewIndex = -1;
      selectedTextId = null;
      Object.keys(textAdjust).forEach((k) => delete textAdjust[k]);
      Object.keys(baseAnchor).forEach((k) => delete baseAnchor[k]);
      sampleEntry = null;
      lastEntryBase = null;
      rerollIfNeeded(true);
      renderAll();
      });

    const bump = (key, delta) => {
      if (key === "x") bgShiftX = Math.round(bgShiftX) + delta;
      else bgShiftY = Math.round(bgShiftY) + delta;
      renderAll();
      scheduleCloudSave();
      syncBgShiftInputs();
    };
    if (els.shiftUp) els.shiftUp.addEventListener("click", () => bump("y", -1));
    if (els.shiftDown) els.shiftDown.addEventListener("click", () => bump("y", +1));
    if (els.shiftLeft) els.shiftLeft.addEventListener("click", () => bump("x", -1));
    if (els.shiftRight) els.shiftRight.addEventListener("click", () => bump("x", +1));
    if (els.shiftReset)
      els.shiftReset.addEventListener("click", () => {
        bgShiftX = 0;
        bgShiftY = 28;
        renderAll();
        syncBgShiftInputs();
        scheduleCloudSave();
      });

    // 텍스트 항목별 1px 이동 버튼
    document.querySelectorAll(".text-move-pad").forEach((pad) => {
      const id = pad.getAttribute("data-text-id");
      if (!id) return;

      const move = (dx, dy) => {
        selectedTextId = id;
        const adj = getOrInitAdjust(id);
        adj.dx += dx;
        adj.dy += dy;
        renderAll();
      };

      pad.querySelectorAll(".text-move-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const dir = btn.getAttribute("data-dir");
          if (dir === "up") return move(0, -1);
          if (dir === "down") return move(0, +1);
          if (dir === "left") return move(-1, 0);
          if (dir === "right") return move(+1, 0);
        });
      });

      const resetBtn = pad.querySelector(".text-move-reset");
      if (resetBtn)
        resetBtn.addEventListener("click", () => {
          selectedTextId = id;
          delete textAdjust[id];
          renderAll();
        });

      // 글씨 크기 +/- (항목별)
      pad.querySelectorAll(".text-size-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedTextId = id;
          const dir = btn.getAttribute("data-size");
          const delta = dir === "down" ? -1 : +1;
          const baseSize = getBaseStyleForTextId(id).size;
          const adj = getOrInitAdjust(id);
          const cur = adj.size == null ? baseSize : adj.size;
          adj.size = Math.max(1, Math.round(cur + delta));
          renderAll();
        });
      });

      // 볼드 토글 (항목별)
      const boldBtn = pad.querySelector(".text-bold-btn");
      if (boldBtn) {
        const sync = () => {
          const adj = getOrInitAdjust(id);
          boldBtn.classList.toggle("active", adj.bold === true);
        };
        sync();
        boldBtn.addEventListener("click", () => {
          selectedTextId = id;
          const adj = getOrInitAdjust(id);
          adj.bold = adj.bold === true ? false : true;
          sync();
          renderAll();
        });
      }
    });

    // 캔버스에서 텍스트 클릭 선택
    canvas.addEventListener("click", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * CANVAS_W;
      const y = ((ev.clientY - rect.top) / rect.height) * CANVAS_H;
      const hit = lastHitboxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      selectedTextId = hit ? hit.id : null;
      renderPreview();
    });
  }

  async function init() {
    bindPhraseUi();
    bind();
    bindSideUi();
    syncBgShiftInputs();
    // 클라우드 불러오기(가능하면) → 이후부터 자동 저장 활성화
    cloudReady = false;
    if (cloudConfigured()) {
      await cloudLoad();
    }
    cloudReady = true;
    await ensureFontsReady();
    setupHiDpiCanvas();

    if (bgImg.complete) {
      rerollIfNeeded(true);
      renderAll();
    } else {
      bgImg.addEventListener(
        "load",
        () => {
          rerollIfNeeded(true);
          renderAll();
        },
        { once: true }
      );
      bgImg.addEventListener(
        "error",
        () => {
          ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.fillStyle = "#fff";
          ctx.font = "14px Roboto, Arial";
          ctx.fillText("배경 이미지 로드 실패: ./bg.jpg", 12, 24);
        },
        { once: true }
      );
    }
  }

  init();
})();
