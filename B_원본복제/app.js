(() => {
  const els = {
    percent: document.getElementById("inpPercent"),
    profit: document.getElementById("inpProfit"),
    symbol: document.getElementById("inpSymbol"),
    leverage: document.getElementById("inpLeverage"),
    entry: document.getElementById("inpEntry"),
    exit: document.getElementById("inpExit"),
    btnLong: document.getElementById("btnLong"),
    btnShort: document.getElementById("btnShort"),

    txtPercent: document.getElementById("txtPercent"),
    txtProfit: document.getElementById("txtProfit"),
    txtSymbol: document.getElementById("txtSymbol"),
    txtLeverage: document.getElementById("txtLeverage"),
    txtEntry: document.getElementById("txtEntry"),
    txtExit: document.getElementById("txtExit"),
    txtSide: document.getElementById("txtSide"),
  };

  let side = "SHORT";

  function formatProfitText(v) {
    const raw = String(v || "").trim();
    if (!raw) return "";
    if (/won$/i.test(raw)) return raw.toUpperCase();
    return `${raw} WON`;
  }

  function render() {
    if (els.txtPercent) els.txtPercent.textContent = String(els.percent?.value || "").trim();
    if (els.txtProfit) els.txtProfit.textContent = formatProfitText(els.profit?.value);
    if (els.txtSymbol) els.txtSymbol.textContent = String(els.symbol?.value || "").trim();
    if (els.txtLeverage) els.txtLeverage.textContent = String(els.leverage?.value || "").trim();
    if (els.txtEntry) els.txtEntry.textContent = String(els.entry?.value || "").trim();
    if (els.txtExit) els.txtExit.textContent = String(els.exit?.value || "").trim();

    if (els.txtSide) {
      els.txtSide.textContent = side;
      els.txtSide.classList.toggle("LONG", side === "LONG");
      els.txtSide.classList.toggle("SHORT", side === "SHORT");
    }

    if (els.btnLong) els.btnLong.classList.toggle("active", side === "LONG");
    if (els.btnShort) els.btnShort.classList.toggle("active", side === "SHORT");
  }

  [els.percent, els.profit, els.symbol, els.leverage, els.entry, els.exit].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  if (els.btnLong) {
    els.btnLong.addEventListener("click", () => {
      side = "LONG";
      render();
    });
  }

  if (els.btnShort) {
    els.btnShort.addEventListener("click", () => {
      side = "SHORT";
      render();
    });
  }

  render();
})();
