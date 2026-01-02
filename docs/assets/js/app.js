// assets/js/app.js
(() => {
  // --- Konfiguration / Default-Werte (aus deinem Original) ---
  let DAILY_SPOT_EUR = { gold: 3625, silver: 60, platinum: 1650, palladium: 1300 };
  let LAST_UPDATE = "Fallback " + new Date().toLocaleString('de-DE');
  const PREMIUMS = { gold_coin: 1, gold_bar: 1, silver_coin: 1, silver_bar: 1, plat_coin: 1, pall_coin: 1 };
  const COIN_MODIFIERS = { /* ... kopiere die COIN_MODIFIERS aus deinem Original ... */ };
  const catalogDB = [ /* ... kopiere catalogDB aus deinem Original ... */ ];
  let portfolio = [];
  let lastAddedIndex = -1;
  const STANDARD_ANKAUF_SPREAD = 1;

  // --- Consent: Speichern in localStorage ---
  function getConsent() {
    try { return localStorage.getItem('tt_consent'); } catch (e) { return null; }
  }
  function setConsent(v) { try { localStorage.setItem('tt_consent', v); } catch(e){} }

  function acceptConsent() { setConsent('accepted'); hideConsentBanner(); initThirdPartyWidgets(); }
  function declineConsent() { setConsent('declined'); hideConsentBanner(); /* do not init widgets */ }

  function showConsentBannerIfNeeded() {
    const current = getConsent();
    if (!current) {
      // show a simple unobtrusive banner (you can reuse your original markup)
      // For brevity: use confirm() only if you don't want the overlay. Here keep existing overlay handled in HTML if present.
      // If page contains #consent-overlay it will be shown (original markup).
      const overlay = document.getElementById('consent-overlay');
      if (overlay) { overlay.style.display = 'flex'; document.body.classList.add('no-scroll'); }
    } else if (current === 'accepted') {
      initThirdPartyWidgets();
    }
  }

  function hideConsentBanner() {
    const overlay = document.getElementById('consent-overlay');
    if (overlay) { overlay.style.display = 'none'; document.body.classList.remove('no-scroll'); }
  }

  // --- Lazy load external widgets (TradingView etc.) only when consent accepted ---
  function initThirdPartyWidgets() {
    // e.g. TradingView ticker on index page:
    const tickerEl = document.querySelector('.ticker-reserve');
    if (tickerEl && !tickerEl.dataset.loaded) {
      // create the tradingview script element
      const s = document.createElement('script');
      s.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
      s.async = true;
      s.innerHTML = JSON.stringify({
        "symbols":[{"proName":"FOREXCOM:XAUUSD","title":"Gold Spot $"},{"proName":"FOREXCOM:XAGUSD","title":"Silber Spot $"}],
        "colorTheme":"dark","isTransparent":true,"displayMode":"compact","locale":"de_DE"
      });
      tickerEl.appendChild(s);
      tickerEl.dataset.loaded = "1";
    }

    // TradingView charts in dashboard.html:
    const chartRoot = document.getElementById('chart-root');
    if (chartRoot && !chartRoot.dataset.loaded) {
      const s = document.createElement('script');
      s.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
      s.async = true;
      s.innerHTML = JSON.stringify({
        "symbols":[["Gold","FOREXCOM:XAUUSD|1D"],["Silber","FOREXCOM:XAGUSD|1D"]],
        "chartOnly":false,"width":"100%","height":"100%","locale":"de_DE","colorTheme":"dark","autosize":true
      });
      chartRoot.appendChild(s);
      chartRoot.dataset.loaded = "1";
    }
  }

  // --- load external prices (prices.json) with cache=no-store ---
  async function loadPricesThenInit() {
    try {
      const resp = await fetch('assets/prices.json', { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.rates) {
          if (data.rates.gold && typeof data.rates.gold.per_oz === 'number') DAILY_SPOT_EUR.gold = data.rates.gold.per_oz;
          if (data.rates.silver && typeof data.rates.silver.per_oz === 'number') DAILY_SPOT_EUR.silver = data.rates.silver.per_oz;
          if (data.rates.platinum && typeof data.rates.platinum.per_oz === 'number') DAILY_SPOT_EUR.platinum = data.rates.platinum.per_oz;
          if (data.rates.palladium && typeof data.rates.palladium.per_oz === 'number') DAILY_SPOT_EUR.palladium = data.rates.palladium.per_oz;
          LAST_UPDATE = data.updated_at || new Date().toLocaleString('de-DE');
        }
      }
    } catch (err) {
      console.warn('prices.json konnte nicht geladen werden, verwende Fallbacks', err);
    } finally {
      try {
        // init UI components only if those elements exist on the page
        if (typeof initCustomSelect === 'function') initCustomSelect();
        if (typeof populateCatalog === 'function') populateCatalog('all');
        if (typeof renderPrices === 'function') renderPrices();
        if (typeof renderPortfolio === 'function') renderPortfolio();
      } catch (e) { console.error(e); }
    }
    // show consent banner if needed
    showConsentBannerIfNeeded();
  }

  // --- The original functions (calculateItemPrice, formatMoney, renderPrices, addToPortfolio, renderPortfolio, etc.)
  // --- Copy them verbatim from your original file here. Do not change the logic.
  // For brevity in this snippet: place the original code lines into this file between the markers.
  // Example placeholder:
  function calculateItemPrice(item) {
    const spotPerOz = DAILY_SPOT_EUR[item.metal] || 0;
    const spotPerGram = spotPerOz / 31.1034768;
    let premium = 1.0;
    if (item.metal === 'gold') premium = (item.type === 'coin') ? PREMIUMS.gold_coin : PREMIUMS.gold_bar;
    if (item.metal === 'silver') premium = (item.type === 'coin') ? PREMIUMS.silver_coin : PREMIUMS.silver_bar;
    if (item.metal === 'platinum') premium = PREMIUMS.plat_coin;
    if (item.metal === 'palladium') premium = PREMIUMS.pall_coin;
    const coinModifier = (item.type === 'coin' && COIN_MODIFIERS[item.id]) ? COIN_MODIFIERS[item.id] : 1.0;
    return item.fine * spotPerGram * premium * coinModifier;
  }
  function formatMoney(val){ return (typeof val === 'number' ? val : 0).toLocaleString('de-DE',{style:'currency',currency:'EUR'}); }

  // NOTE: Paste the remainder of your original JS functions below: renderPrices, renderCoinComparison,
  // initCustomSelect, populateCatalog, selectCatalogItem, updateCatDetails, toggleCalcMode,
  // filterCatalog, addToPortfolio (unchanged), renderPortfolio (unchanged), removeFromPortfolio,
  // clearPortfolio, responsiveInit, openLegal, closeLegal, exportPortfolioPDF (unchanged).
  // Make sure to keep the exact function names and IDs: the HTML depends on them.

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    loadPricesThenInit();
    // wire consent buttons if present in the markup
    const acc = document.querySelector('#consent-banner .btn-primary');
    const dec = document.querySelector('#consent-banner .btn-outline');
    if (acc) acc.addEventListener('click', acceptConsent);
    if (dec) dec.addEventListener('click', declineConsent);
  });

  // Expose some methods to global scope if the HTML buttons expect them
  window.addToPortfolio = function(){ /* call original addToPortfolio here */ };
  window.clearPortfolio = function(){ /* call original clearPortfolio here */ };
  window.exportPortfolioPDF = function(){ /* call original exportPortfolioPDF here */ };
  window.toggleCalcMode = function(mode){ /* call original toggleCalcMode here */ };
  window.openLegal = function(type){ /* ... */ };
  window.closeLegal = function(){ /* ... */ };
})();
