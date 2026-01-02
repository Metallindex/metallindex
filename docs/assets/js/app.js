// assets/js/app.js
// Vollständiges Script: initialisiert die Seiten (calculator, dashboard, analysis, index).
// Enthält: catalogDB, Rechnerfunktionen, renderPortfolio, PDF-Export, Consent Banner, TradingView lazy-load,
// Preise laden aus assets/prices.json (mit Fallback), Legal Modal.
// Dieses Skript ist so geschrieben, dass es auf jeder Seite sicher geladen werden kann.

(function () {
  /* ---------- STATE & DATA ---------- */
  let DAILY_SPOT_EUR = { gold: 3625, silver: 60, platinum: 1650, palladium: 1300 };
  let LAST_UPDATE = "Fallback " + new Date().toLocaleString('de-DE');
  const PREMIUMS = { gold_coin: 1, gold_bar: 1, silver_coin: 1, silver_bar: 1, plat_coin: 1, pall_coin: 1 };
  const COIN_MODIFIERS = { 'g_phil_1': 1.00, 'g_krue_1': 0.97, 'g_maple_1': 0.99, 'g_brit_1': 1.01, 'g_eagle_1': 0.995, 'g_buff_1': 1.03, 'g_krue_05': 0.99 };

  const catalogDB = [
    { id: 'g_krue_1', name: 'Krügerrand 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_krue_05', name: 'Krügerrand 1/2 oz', metal: 'gold', type: 'coin', fine: 15.552 },
    { id: 'g_maple_1', name: 'Maple Leaf 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_brit_1', name: 'Britannia 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_phil_1', name: 'Wiener Philharmoniker 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_eagle_1', name: 'American Eagle 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_buff_1', name: 'American Buffalo 1 oz', metal: 'gold', type: 'coin', fine: 31.103 },
    { id: 'g_vren', name: 'Vreneli 20 Fr', metal: 'gold', type: 'coin', fine: 5.806 },
    { id: 'g_dukat', name: '1 Dukat Österreich', metal: 'gold', type: 'coin', fine: 3.44 },
    { id: 'g_bar_100', name: 'Goldbarren 100g', metal: 'gold', type: 'bar', fine: 100.0 },
    { id: 'g_bar_50', name: 'Goldbarren 50g', metal: 'gold', type: 'bar', fine: 50.0 },
    { id: 'g_bar_1oz', name: 'Goldbarren 1 oz', metal: 'gold', type: 'bar', fine: 31.103 },
    { id: 'g_bar_10', name: 'Goldbarren 10g', metal: 'gold', type: 'bar', fine: 10.0 },
    { id: 's_maple', name: 'Silber Maple Leaf 1 oz', metal: 'silver', type: 'coin', fine: 31.103 },
    { id: 's_krue', name: 'Silber Krügerrand 1 oz', metal: 'silver', type: 'coin', fine: 31.103 },
    { id: 's_phil', name: 'Silber Philharmoniker 1 oz', metal: 'silver', type: 'coin', fine: 31.103 },
    { id: 's_eagle', name: 'Silber Eagle 1 oz', metal: 'silver', type: 'coin', fine: 31.103 },
    { id: 's_bar_1kg', name: 'Silberbarren 1 kg', metal: 'silver', type: 'bar', fine: 1000.0 },
    { id: 's_bar_100', name: 'Silberbarren 100g', metal: 'silver', type: 'bar', fine: 100.0 },
    { id: 'pt_maple', name: 'Platin Maple Leaf 1 oz', metal: 'platinum', type: 'coin', fine: 31.103 },
    { id: 'pt_brit', name: 'Platin Britannia 1 oz', metal: 'platinum', type: 'coin', fine: 31.103 },
    { id: 'pt_bar_1', name: 'Platinbarren 1 oz', metal: 'platinum', type: 'bar', fine: 31.103 },
    { id: 'pd_maple', name: 'Palladium Maple Leaf 1 oz', metal: 'palladium', type: 'coin', fine: 31.103 },
    { id: 'pd_bar_1', name: 'Palladiumbarren 1 oz', metal: 'palladium', type: 'bar', fine: 31.103 }
  ];

  let portfolio = [];
  let lastAddedIndex = -1;
  const STANDARD_ANKAUF_SPREAD = 1;

  /* ---------- UTILS ---------- */
  function formatMoney(val){
    try { return (typeof val === 'number' ? val : 0).toLocaleString('de-DE',{style:'currency',currency:'EUR'}); }
    catch(e){ return "0,00 €"; }
  }

  function getConsent(){ try { return localStorage.getItem('tt_consent'); } catch(e){ return null; } }
  function setConsent(v){ try { localStorage.setItem('tt_consent', v); } catch(e){} }

  /* ---------- CONSENT (Banner) ---------- */
  function showConsentBannerIfNeeded(){
    const overlay = document.getElementById('consent-overlay');
    const consent = getConsent();
    if (!overlay) return;
    if (!consent){
      overlay.style.display = 'flex';
      document.body.classList.add('no-scroll');
    } else if (consent === 'accepted') {
      initThirdPartyWidgets();
    }
  }
  function hideConsentBanner(){ const overlay = document.getElementById('consent-overlay'); if (!overlay) return; overlay.style.display = 'none'; document.body.classList.remove('no-scroll'); }
  function acceptConsent(){ setConsent('accepted'); hideConsentBanner(); initThirdPartyWidgets(); }
  function declineConsent(){ setConsent('declined'); hideConsentBanner(); }

  /* ---------- THIRD PARTY WIDGETS (lazy) ---------- */
  function initThirdPartyWidgets(){
    // Only load TradingView on dashboard page
    const chartRoot = document.getElementById('chart-root');
    if (chartRoot && !chartRoot.dataset.loaded){
      const s = document.createElement('script');
      s.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
      s.async = true;
      s.innerHTML = JSON.stringify({
        "symbols":[["Gold","FOREXCOM:XAUUSD|1D"],["Silber","FOREXCOM:XAGUSD|1D"],["Platin","TVC:PLATINUM|1D"],["Palladium","TVC:PALLADIUM|1D"]],
        "chartOnly":false,"width":"100%","height":"100%","locale":"de_DE","colorTheme":"dark","autosize":true
      });
      chartRoot.innerHTML = ''; // remove placeholder
      chartRoot.appendChild(s);
      chartRoot.dataset.loaded = "1";
    }

    // Ticker on index — if exists
    const tickerEl = document.querySelector('.ticker-reserve');
    if (tickerEl && !tickerEl.dataset.loaded){
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
  }

  /* ---------- PRICE LOADER ---------- */
  async function loadPrices(){
    const path = 'assets/prices.json';
    try {
      const res = await fetch(path, {cache:'no-store'});
      if (!res.ok) throw new Error('prices.json not accessible: ' + res.status);
      const data = await res.json();
      if (data && data.rates){
        if (data.rates.gold && typeof data.rates.gold.per_oz === 'number') DAILY_SPOT_EUR.gold = data.rates.gold.per_oz;
        if (data.rates.silver && typeof data.rates.silver.per_oz === 'number') DAILY_SPOT_EUR.silver = data.rates.silver.per_oz;
        if (data.rates.platinum && typeof data.rates.platinum.per_oz === 'number') DAILY_SPOT_EUR.platinum = data.rates.platinum.per_oz;
        if (data.rates.palladium && typeof data.rates.palladium.per_oz === 'number') DAILY_SPOT_EUR.palladium = data.rates.palladium.per_oz;
        LAST_UPDATE = data.updated_at || new Date().toLocaleString('de-DE');
      }
    } catch(err){
      console.warn('prices.json konnte nicht geladen werden, verwende Fallbacks', err);
      LAST_UPDATE = "Fallback " + new Date().toLocaleString('de-DE');
    }
  }

  /* ---------- CALC HELPERS ---------- */
  function calculateItemPrice(item){
    try {
      const spotPerOz = DAILY_SPOT_EUR[item.metal] || 0;
      const spotPerGram = spotPerOz / 31.1034768;
      let premium = 1.0;
      if (item.metal === 'gold') premium = (item.type === 'coin') ? PREMIUMS.gold_coin : PREMIUMS.gold_bar;
      if (item.metal === 'silver') premium = (item.type === 'coin') ? PREMIUMS.silver_coin : PREMIUMS.silver_bar;
      if (item.metal === 'platinum') premium = PREMIUMS.plat_coin;
      if (item.metal === 'palladium') premium = PREMIUMS.pall_coin;
      const coinModifier = (item.type === 'coin' && COIN_MODIFIERS[item.id]) ? COIN_MODIFIERS[item.id] : 1.0;
      return item.fine * spotPerGram * premium * coinModifier;
    } catch(e) { console.error(e); return 0; }
  }

  /* ---------- RENDER FUNCTIONS ---------- */
  function renderIndexDash(){
    const el = document.getElementById('index-dash');
    if (!el) return;
    const phil = catalogDB.find(i => i.id === 'g_phil_1');
    const val = phil ? calculateItemPrice(phil) : (DAILY_SPOT_EUR.gold || 0);
    el.innerHTML = `<div style="font-weight:700;color:var(--c-primary)">${formatMoney(val)}</div><div style="color:var(--c-text-muted);font-size:0.9rem">Stand: ${LAST_UPDATE}</div>`;
  }

  function renderDashboardPrices(){
    const container = document.getElementById('dash-prices');
    const update = document.getElementById('dash-update');
    if (!container) return;
    try {
      const gold = calculateItemPrice(catalogDB.find(i=>i.id==='g_phil_1')||{metal:'gold',fine:31.103});
      const silver = calculateItemPrice(catalogDB.find(i=>i.id==='s_maple')||{metal:'silver',fine:31.103});
      const plat = calculateItemPrice(catalogDB.find(i=>i.id==='pt_maple')||{metal:'platinum',fine:31.103});
      const pall = calculateItemPrice(catalogDB.find(i=>i.id==='pd_maple')||{metal:'palladium',fine:31.103});
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><strong>Gold (1oz)</strong><div style="color:var(--color-gold);font-weight:700">${formatMoney(gold)}</div></div>
          <div><strong>Silber (1oz)</strong><div style="color:var(--color-silver);font-weight:700">${formatMoney(silver)}</div></div>
          <div><strong>Platin (1oz)</strong><div style="color:var(--color-plat);font-weight:700">${formatMoney(plat)}</div></div>
          <div><strong>Palladium (1oz)</strong><div style="color:var(--color-pall);font-weight:700">${formatMoney(pall)}</div></div>
        </div>`;
      if (update) update.innerText = `Stand: ${LAST_UPDATE}`;
    } catch(e){ console.error('renderDashboardPrices error', e); container.innerText = 'Fehler beim Anzeigen der Preise.'; }
  }

  /* ---------- CATALOG UI (Calculator page) ---------- */
  function initCatalogSelect(){
    const toggle = document.getElementById('catalogToggle');
    const list = document.getElementById('catalogList');
    const native = document.getElementById('catalogSelect');
    if (!toggle || !list || !native) return;

    // close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.select-wrapper')) {
        list.hidden = true;
        toggle.setAttribute('aria-expanded','false');
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape'){ list.hidden = true; toggle.setAttribute('aria-expanded','false'); } });

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) { list.hidden = true; toggle.setAttribute('aria-expanded','false'); }
      else { list.hidden = false; toggle.setAttribute('aria-expanded','true'); list.focus(); }
    });
  }

  function populateCatalog(filter){
    const sel = document.getElementById('catalogSelect');
    const list = document.getElementById('catalogList');
    const toggle = document.getElementById('catalogToggle');
    if (!sel || !list || !toggle) return;
    sel.innerHTML = '';
    list.innerHTML = '';
    const items = catalogDB.filter(i => filter === 'all' || !filter || i.metal === filter);
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.text = item.name;
      sel.appendChild(opt);

      const li = document.createElement('li');
      li.tabIndex = 0;
      li.setAttribute('role','option');
      li.dataset.value = item.id;
      li.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px"><div>${item.name}</div><div style="opacity:0.7">${item.metal}</div></div>`;
      li.addEventListener('click', () => selectCatalogItem(item.id));
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectCatalogItem(item.id); });
      list.appendChild(li);
    });
    if (sel.options.length > 0) {
      sel.selectedIndex = 0;
      selectCatalogItem(sel.options[0].value);
    } else {
      toggle.innerText = "Keine Produkte";
    }
  }

  function selectCatalogItem(id){
    const sel = document.getElementById('catalogSelect');
    const list = document.getElementById('catalogList');
    const toggle = document.getElementById('catalogToggle');
    if (!sel || !list || !toggle) return;
    sel.value = id;
    Array.from(list.children).forEach(li => {
      if (li.dataset.value === id) li.setAttribute('aria-selected','true');
      else li.removeAttribute('aria-selected');
    });
    const item = catalogDB.find(i => i.id === id);
    if (!item) return;
    toggle.innerHTML = `${item.name} <i class="fa-solid fa-caret-down"></i>`;
    updateCatDetails();
    list.hidden = true;
    toggle.setAttribute('aria-expanded','false');
  }

  function updateCatDetails(){
    const sel = document.getElementById('catalogSelect');
    if (!sel) return;
    const id = sel.value || (sel.options[0] && sel.options[0].value);
    if (!id) return;
    const item = catalogDB.find(x => x.id === id);
    if (!item) return;
    const price = calculateItemPrice(item);
    const el = document.getElementById('cat-price-display');
    if (el) el.value = formatMoney(price);
  }

  function toggleCalcMode(mode){
    const cat = document.getElementById('mode-catalog');
    const raw = document.getElementById('mode-raw');
    const tabCat = document.getElementById('tab-cat');
    const tabRaw = document.getElementById('tab-raw');
    if (cat && raw && tabCat && tabRaw) {
      cat.style.display = (mode === 'catalog') ? 'block' : 'none';
      raw.style.display = (mode === 'raw') ? 'block' : 'none';
      tabCat.classList.toggle('active', mode === 'catalog');
      tabRaw.classList.toggle('active', mode === 'raw');
    }
  }

  function filterCatalog(metal){
    populateCatalog(metal);
  }

  /* ---------- PORTFOLIO FUNCTIONS ---------- */
  function addToPortfolio(){
    try {
      let itemToAdd = {};
      const catalogMode = document.getElementById('tab-cat') && document.getElementById('tab-cat').classList.contains('active');
      if (catalogMode){
        const id = document.getElementById('catalogSelect').value;
        const qty = parseInt(document.getElementById('cat-qty').value) || 1;
        const dbItem = catalogDB.find(x => x.id === id);
        if (!dbItem) return alert('Kein Produkt gewählt');
        let basePrice = calculateItemPrice(dbItem);
        itemToAdd = { name: dbItem.name, metal: dbItem.metal, singleVal: basePrice, qty: qty, spread: STANDARD_ANKAUF_SPREAD };
      } else {
        const metal = document.getElementById('raw-metal').value;
        const weight = parseFloat(document.getElementById('raw-weight').value);
        const purity = parseFloat(document.getElementById('raw-purity').value);
        if (!weight || weight <= 0) return alert('Gewicht fehlt oder ungültig');
        const spotPerOz = DAILY_SPOT_EUR[metal];
        const spotPerGram = spotPerOz / 31.1034768;
        let basePrice = (weight * purity) * spotPerGram;
        itemToAdd = { name: `Manuell (${metal.toUpperCase()})`, metal: metal, singleVal: basePrice, qty: 1, spread: STANDARD_ANKAUF_SPREAD };
      }
      portfolio.push(itemToAdd);
      lastAddedIndex = portfolio.length - 1;
      renderPortfolio();
    } catch(e){ console.error('addToPortfolio error', e); alert('Fehler beim Hinzufügen'); }
  }

  function renderPortfolio(){
    const container = document.getElementById('portfolio-container');
    if (!container) return;
    if (portfolio.length === 0){
      container.innerHTML = '<p style="text-align:center;color:var(--c-text-muted);padding-top:40px">Noch keine Positionen.</p>';
      const tv = document.getElementById('total-value'); if (tv) tv.innerText = formatMoney(0);
      const pc = document.getElementById('port-count'); if (pc) pc.innerText = "0 Positionen";
      return;
    }
    let html = '<div class="inventory-list">';
    let total = 0;
    portfolio.forEach((item, index) => {
      const totalItemVal = item.singleVal * (item.qty || 1) * (item.spread || 1);
      total += totalItemVal;
      let iconColor = 'var(--c-text-main)';
      if (item.metal === 'gold') iconColor = 'var(--color-gold)';
      if (item.metal === 'silver') iconColor = 'var(--color-silver)';
      if (item.metal === 'platinum') iconColor = 'var(--color-plat)';
      if (item.metal === 'palladium') iconColor = 'var(--color-pall)';
      html += `
        <div class="inventory-item" data-idx="${index}">
          <div style="display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-circle" style="font-size:0.7rem;color:${iconColor}"></i>
            <div>
              <div style="font-weight:700">${item.name}</div>
              <div style="font-size:0.82rem;color:var(--c-text-muted)">${item.qty} Stück</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700;color:var(--c-primary)">${formatMoney(totalItemVal)}</div>
            <i class="fa-solid fa-trash" style="cursor:pointer;color:var(--c-text-muted);margin-top:6px" onclick="removeFromPortfolio(${index})" aria-label="Löschen"></i>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
    // highlight last added
    if (lastAddedIndex >= 0){
      const itemEl = container.querySelector(`.inventory-item[data-idx='${lastAddedIndex}']`);
      if (itemEl) {
        itemEl.classList.add('item-added');
        setTimeout(()=> itemEl.classList.remove('item-added'), 700);
      }
      lastAddedIndex = -1;
    }
    const tv = document.getElementById('total-value'); if (tv) tv.innerText = formatMoney(total);
    const pc = document.getElementById('port-count'); if (pc) pc.innerText = portfolio.length + " Positionen";
  }

  function removeFromPortfolio(idx){ portfolio.splice(idx,1); renderPortfolio(); }
  function clearPortfolio(){ portfolio = []; renderPortfolio(); }

  /* ---------- PDF Export (jsPDF required) ---------- */
  function exportPortfolioPDF(){
    if (!portfolio || portfolio.length === 0){ alert('Das Portfolio ist leer.'); return; }
    if (!window.jspdf){ alert('PDF-Bibliothek nicht geladen. Stelle sicher, dass jsPDF eingebunden ist.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'mm',format:'a4'});
    const margin = 15; let y = 20;
    doc.setFontSize(14); doc.text('T&T Edelmetalle – Portfolio', margin, y);
    doc.setFontSize(10); y += 6; doc.text('Exportdatum: ' + new Date().toLocaleString('de-DE'), margin, y);
    y += 8; doc.setFontSize(11); doc.setFont(undefined,'bold');
    doc.text('Pos.', margin, y); doc.text('Bezeichnung', margin + 12, y); doc.text('Anz.', margin + 98, y); doc.text('Einzel', margin + 120, y); doc.text('Gesamt', margin + 160, y);
    y += 4; doc.setLineWidth(0.3); doc.setDrawColor(200); doc.line(margin,y,195,y); y += 6; doc.setFont(undefined,'normal');
    const lineHeight = 7;
    portfolio.forEach((item, idx) => {
      const totalItemVal = item.singleVal * (item.qty || 1) * (item.spread || 1);
      const name = item.name; const qtyStr = String(item.qty || 1);
      const singleStr = formatMoney(item.singleVal); const totalStr = formatMoney(totalItemVal);
      const maxWidthName = 80;
      const splitName = doc.splitTextToSize(name, maxWidthName);
      for (let i = 0; i < splitName.length; i++){
        if (y > 275){ doc.addPage(); y = 20; }
        if (i === 0){
          doc.text(String(idx+1), margin, y);
          doc.text(splitName[i], margin + 12, y);
          doc.text(qtyStr, margin + 98, y);
          doc.text(singleStr, margin + 120, y);
          doc.text(totalStr, margin + 160, y);
        } else {
          doc.text(splitName[i], margin + 12, y);
        }
        y += lineHeight;
      }
    });
    if (y > 260){ doc.addPage(); y = 20; }
    y += 4; doc.setLineWidth(0.4); doc.line(margin,y,195,y); y += 8;
    doc.setFont(undefined,'bold'); const totalValueText = document.getElementById('total-value') ? document.getElementById('total-value').innerText : formatMoney(0);
    doc.text('Gesamtwert: ' + totalValueText, margin, y);
    const filename = 'Portfolio_' + (new Date()).toISOString().slice(0,10) + '.pdf';
    doc.save(filename);
  }

  /* ---------- LEGAL MODAL ---------- */
  function openLegal(type){
    let overlay = document.getElementById('legal-overlay');
    let modal = document.getElementById('legal-modal');
    if (!overlay){
      // create simple overlay if not present
      overlay = document.createElement('div'); overlay.id = 'legal-overlay';
      overlay.style = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;padding:16px';
      modal = document.createElement('div'); modal.id = 'legal-modal';
      modal.style = 'max-width:900px;width:100%;max-height:85vh;overflow:auto;background:var(--c-bg-card);border:1px solid var(--c-border);border-radius:12px;padding:20px;color:var(--c-text-main)';
      overlay.appendChild(modal); document.body.appendChild(overlay);
    }
    let headline = '';
    let html = '';
    if (type === 'impressum'){
      headline = 'Impressum';
      html = `<p><strong>Angaben gemäß § 5 TMG</strong></p>
        <p>T&amp;T Edelmetalle<br>[Dein Name/Firma]<br>[Straße, Hausnummer]<br>[PLZ Ort]<br>[Land]</p>
        <p><strong>Kontakt</strong><br>E-Mail: [deine@email.de]</p>
        <p class="consent-small" style="color:var(--c-text-muted)">Bitte ersetzen Sie Platzhalter durch Ihre Daten.</p>`;
    } else if (type === 'datenschutz'){
      headline = 'Datenschutzerklärung';
      html = `<p><strong>Allgemeine Hinweise</strong></p>
        <p>Der Schutz Ihrer Daten ist uns wichtig. Diese Website speichert keine personenbezogenen Daten dauerhaft.</p>
        <p>Stand: Januar 2026</p>`;
    } else if (type === 'haftung'){
      headline = 'Haftungsausschluss';
      html = `<p>Die Inhalte wurden sorgfältig recherchiert, dennoch keine Gewähr.</p>`;
    }
    modal.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h3>${headline}</h3><button class="btn btn-outline" onclick="closeLegal()">Schliessen</button></div><div style="margin-top:12px;color:var(--c-text-muted);line-height:1.5">${html}</div>`;
    overlay.style.display = 'flex';
    document.body.classList.add('no-scroll');
  }
  function closeLegal(){
    const overlay = document.getElementById('legal-overlay');
    if (overlay){ overlay.style.display = 'none'; document.body.classList.remove('no-scroll'); }
  }

  /* ---------- INIT PER PAGE ---------- */
  async function initForPage(){
    await loadPrices();

    // always show consent if needed
    showConsentBannerIfNeeded();

    // render index if present
    if (document.querySelector('#index-dash')) renderIndexDash();

    // dashboard page
    if (document.querySelector('#dash-prices')){
      renderDashboardPrices();
      // if consent already accepted, init widgets
      if (getConsent() === 'accepted') initThirdPartyWidgets();
    }

    // calculator page
    if (document.querySelector('#calculator')){
      initCatalogSelect();
      populateCatalog('all');
      updateCatDetails();
      renderPortfolio();
      // Bind UI controls
      const sel = document.getElementById('catalogSelect'); if (sel) sel.addEventListener('change', updateCatDetails);
      const rawMetal = document.getElementById('raw-metal'); if (rawMetal) rawMetal.addEventListener('change', ()=>{});
      // expose functions globally used in HTML inline handlers
      window.toggleCalcMode = toggleCalcMode;
      window.filterCatalog = filterCatalog;
      window.addToPortfolio = addToPortfolio;
      window.clearPortfolio = clearPortfolio;
      window.exportPortfolioPDF = exportPortfolioPDF;
      window.removeFromPortfolio = removeFromPortfolio;
    }

    // analysis page: nothing to init
    // legal & consent functions globally
    window.openLegal = openLegal;
    window.closeLegal = closeLegal;
    window.acceptConsent = acceptConsent;
    window.declineConsent = declineConsent;
  }

  /* ---------- GLOBAL HANDLERS (for inline calls) ---------- */
  window.openLegal = openLegal;
  window.closeLegal = closeLegal;
  window.acceptConsent = acceptConsent;
  window.declineConsent = declineConsent;
  window.exportPortfolioPDF = exportPortfolioPDF;

  /* ---------- DOM READY ---------- */
  document.addEventListener('DOMContentLoaded', function(){
    initForPage().catch(e => console.error('initForPage error', e));
  });

  /* ---------- Expose removeFromPortfolio (used inline) ---------- */
  window.removeFromPortfolio = removeFromPortfolio;

})();
