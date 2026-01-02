// assets/js/app.js
// Basierend auf deinem Original-Upload — Funktionen 1:1 erhalten, modular verpackt.

(function () {
    // --- State & Defaults (aus deinem Upload) ---
    let DAILY_SPOT_EUR = { gold: 3625, silver: 60, platinum: 1650, palladium: 1300 };
    let LAST_UPDATE = "31.12.2025, 08:30 Uhr";
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

    // --- Utilities ---
    function formatMoney(val) {
        try { return (typeof val === 'number' ? val : 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }
        catch(e) { return "0,00 €"; }
    }

    function getConsent() { try { return localStorage.getItem('tt_consent'); } catch (e) { return null; } }
    function setConsent(v) { try { localStorage.setItem('tt_consent', v); } catch (e) { /* ignore */ } }

    // --- Consent Banner ---
    function showConsentBanner() {
        const overlay = document.getElementById('consent-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        document.body.classList.add('no-scroll');
        // focus first button for accessibility
        setTimeout(() => {
            const btn = overlay.querySelector('button.btn-primary');
            if (btn) btn.focus();
        }, 120);
    }
    function hideConsentBanner() {
        const overlay = document.getElementById('consent-overlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        document.body.classList.remove('no-scroll');
    }
    function acceptConsent() { setConsent('accepted'); hideConsentBanner(); initThirdPartyWidgets(); }
    function declineConsent() { setConsent('declined'); hideConsentBanner(); }

    // --- Lazy-load third-party widgets only after consent ---
    function initThirdPartyWidgets() {
        // TradingView ticker (index)
        const tickerEl = document.querySelector('.ticker-reserve');
        if (tickerEl && !tickerEl.dataset.loaded) {
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

        // TradingView chart (dashboard)
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

    // --- Price loading (optional local prices.json) ---
    async function loadPricesThenInit() {
        const PRICE_JSON_PATH = "assets/prices.json";
        try {
            const resp = await fetch(PRICE_JSON_PATH, {cache:'no-store'});
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.rates) {
                    if (data.rates.gold && typeof data.rates.gold.per_oz === 'number') DAILY_SPOT_EUR.gold = data.rates.gold.per_oz;
                    if (data.rates.silver && typeof data.rates.silver.per_oz === 'number') DAILY_SPOT_EUR.silver = data.rates.silver.per_oz;
                    if (data.rates.platinum && typeof data.rates.platinum.per_oz === 'number') DAILY_SPOT_EUR.platinum = data.rates.platinum.per_oz;
                    if (data.rates.palladium && typeof data.rates.palladium.per_oz === 'number') DAILY_SPOT_EUR.palladium = data.rates.palladium.per_oz;
                    LAST_UPDATE = data.updated_at || LAST_UPDATE;
                }
            }
        } catch (err) {
            // fallback: use defaults (already set)
            console.warn('prices.json konnte nicht geladen werden, verwende Fallbacks', err);
        } finally {
            try { initUIBindings(); } catch(e){ console.error(e); }
            showConsentIfNeeded();
            renderPrices();
            populateCatalog('all');
            renderPortfolio();
            responsiveInit();
        }
    }

    // --- Calculation helpers ---
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

    // --- Rendering functions ---
    function renderPrices() {
        try {
            const phil = catalogDB.find(i => i.id === 'g_phil_1');
            const philPrice = (phil) ? calculateItemPrice(phil) : (DAILY_SPOT_EUR.gold * PREMIUMS.gold_coin);
            const dashGold = document.getElementById('dash-gold');
            if (dashGold) dashGold.innerText = formatMoney(philPrice);
            const dashSilver = document.getElementById('dash-silver');
            if (dashSilver) dashSilver.innerText = formatMoney(calculateItemPrice(catalogDB.find(i=>i.id==='s_maple')||{metal:'silver',fine:31.103}));
            const dashPlat = document.getElementById('dash-plat');
            if (dashPlat) dashPlat.innerText = formatMoney(calculateItemPrice(catalogDB.find(i=>i.id==='pt_maple')||{metal:'platinum',fine:31.103}));
            const dashPall = document.getElementById('dash-pall');
            if (dashPall) dashPall.innerText = formatMoney(calculateItemPrice(catalogDB.find(i=>i.id==='pd_maple')||{metal:'palladium',fine:31.103}));
            const updateEl = document.getElementById('update-date');
            if (updateEl) updateEl.innerText = LAST_UPDATE;
        } catch(e){ console.error('renderPrices error', e); }
    }

    // --- Catalog population (custom select) ---
    function populateCatalog(metalType) {
        const sel = document.getElementById('catalogSelect');
        const list = document.getElementById('catalogList');
        const toggle = document.getElementById('catalogToggle');
        if (!sel || !list || !toggle) return;
        sel.innerHTML = '';
        list.innerHTML = '';
        const filtered = catalogDB.filter(i => !metalType || metalType === 'all' || i.metal === metalType);
        filtered.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.innerText = item.name;
            sel.appendChild(opt);

            const li = document.createElement('li');
            li.setAttribute('role','option');
            li.setAttribute('data-val', item.id);
            li.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px"><div>${item.name}</div><div style="opacity:0.7">${item.metal}</div></div>`;
            li.addEventListener('click', ()=> {
                selectCatalogItem(item.id);
            });
            list.appendChild(li);
        });

        // default select first
        if (sel.options.length>0) {
            sel.value = sel.options[0].value;
            toggle.innerHTML = `${sel.options[0].text} <i class="fa-solid fa-caret-down"></i>`;
            updateCatDetails();
        } else {
            toggle.innerHTML = `Keine Produkte <i class="fa-solid fa-caret-down"></i>`;
        }

        // toggle behavior
        toggle.onclick = function(){
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            if (expanded) {
                list.hidden = true;
                toggle.setAttribute('aria-expanded','false');
            } else {
                list.hidden = false;
                toggle.setAttribute('aria-expanded','true');
                // focus the first item
                const f = list.querySelector('[role="option"]');
                if (f) f.focus();
            }
        };
    }

    function selectCatalogItem(id) {
        const sel = document.getElementById('catalogSelect');
        const toggle = document.getElementById('catalogToggle');
        const list = document.getElementById('catalogList');
        if (!sel || !toggle) return;
        sel.value = id;
        const item = catalogDB.find(x=>x.id===id);
        toggle.innerHTML = `${item.name} <i class="fa-solid fa-caret-down"></i>`;
        updateCatDetails();
        if (list) { list.hidden = true; toggle.setAttribute('aria-expanded','false'); }
    }

    function updateCatDetails() {
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

    // --- Mode toggle ---
    function toggleCalcMode(mode) {
        const cat = document.getElementById('mode-catalog');
        const raw = document.getElementById('mode-raw');
        const tabCat = document.getElementById('tab-cat');
        const tabRaw = document.getElementById('tab-raw');
        if (cat && raw && tabCat && tabRaw) {
            cat.style.display = (mode==='catalog') ? 'block' : 'none';
            raw.style.display = (mode==='raw') ? 'block' : 'none';
            tabCat.classList.toggle('active', mode==='catalog');
            tabRaw.classList.toggle('active', mode==='raw');
        }
    }

    // --- Portfolio functions (unchanged logic) ---
    function addToPortfolio() {
        let itemToAdd = {};
        const spreadVal = STANDARD_ANKAUF_SPREAD;
        const catalogMode = document.getElementById('tab-cat') && document.getElementById('tab-cat').classList.contains('active');
        if (catalogMode) {
            const id = document.getElementById('catalogSelect').value;
            const qty = parseInt(document.getElementById('cat-qty').value) || 1;
            const dbItem = catalogDB.find(x => x.id === id);
            if (!dbItem) return alert('Kein Produkt gewählt');
            let basePrice = calculateItemPrice(dbItem);
            itemToAdd = { name: dbItem.name, metal: dbItem.metal, singleVal: basePrice, qty: qty, spread: spreadVal };
        } else {
            const metal = document.getElementById('raw-metal').value;
            const weight = parseFloat(document.getElementById('raw-weight').value);
            const purity = parseFloat(document.getElementById('raw-purity').value);
            if (!weight || weight <= 0) return alert("Gewicht fehlt oder ungültig");
            const spotPerOz = DAILY_SPOT_EUR[metal];
            const spotPerGram = spotPerOz / 31.1034768;
            let basePrice = (weight * purity) * spotPerGram;
            itemToAdd = { name: `Manuell (${metal.toUpperCase()})`, metal: metal, singleVal: basePrice, qty: 1, spread: spreadVal };
        }
        portfolio.push(itemToAdd);
        lastAddedIndex = portfolio.length - 1;
        renderPortfolio();
        const addBtn = document.querySelector('.btn.btn-primary');
        if (addBtn) { addBtn.style.transform = 'scale(0.98)'; setTimeout(()=> addBtn.style.transform = '', 140); }
    }

    function renderPortfolio() {
        const container = document.getElementById('portfolio-container');
        let total = 0;
        if (!container) return;
        if (portfolio.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: var(--c-text-muted); padding-top: 40px;">Noch keine Positionen.</p>';
            const tv = document.getElementById('total-value'); if (tv) tv.innerText = formatMoney(0);
            const pc = document.getElementById('port-count'); if (pc) pc.innerText = "0 Positionen";
            return;
        }
        let html = '<div class="inventory-list">';
        portfolio.forEach((item, index) => {
            const totalItemVal = item.singleVal * (item.qty || 1) * (item.spread || 1);
            total += totalItemVal;
            let spreadLabel = "";
            if (item.spread < 1.0 && item.spread > 0.8) spreadLabel = '<span style="font-size:0.7rem; color:var(--c-text-muted)">(Ankaufswert)</span>';
            let iconColor = 'var(--c-text-main)';
            if (item.metal === 'gold') iconColor = 'var(--color-gold)';
            if (item.metal === 'silver') iconColor = 'var(--color-silver)';
            if (item.metal === 'platinum') iconColor = 'var(--color-plat)';
            if (item.metal === 'palladium') iconColor = 'var(--color-pall)';
            html += `
<div class="inventory-item" data-idx="${index}">
  <div style="display:flex; align-items:center; gap:10px;">
    <i class="fa-solid fa-circle" style="font-size:0.7rem; color:${iconColor};"></i>
    <div>
      <div style="font-weight:700; color:var(--c-text-main);">${item.name}</div>
      <div style="font-size:0.82rem; color:var(--c-text-muted);">${item.qty} Stück ${spreadLabel}</div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="font-weight:700; color:var(--c-primary);">${formatMoney(totalItemVal)}</div>
    <i class="fa-solid fa-trash" style="cursor:pointer; color:var(--c-text-muted); font-size:0.88rem; margin-top:6px;" onclick="removeFromPortfolio(${index})" aria-label="Position löschen"></i>
  </div>
</div>`;
        });
        html += '</div>';
        container.innerHTML = html;
        if (lastAddedIndex >= 0) {
            const itemEl = container.querySelector(`.inventory-item[data-idx='${lastAddedIndex}']`);
            if (itemEl) {
                itemEl.classList.add('item-added');
                setTimeout(()=> itemEl.classList.remove('item-added'), 600);
            }
            lastAddedIndex = -1;
        }
        const tv = document.getElementById('total-value'); if (tv) tv.innerText = formatMoney(total);
        const pc = document.getElementById('port-count'); if (pc) pc.innerText = portfolio.length + " Positionen";
    }

    function removeFromPortfolio(idx) {
        portfolio.splice(idx,1);
        renderPortfolio();
    }
    function clearPortfolio() { portfolio = []; renderPortfolio(); }

    // --- Responsive / helper ---
    function responsiveInit() {
        buildMobileNav();
        function adjustCharts() {
            const tvs = document.querySelectorAll('.tradingview-widget-container');
            tvs.forEach(el => {
                if (window.innerWidth < 700) el.style.minHeight = '220px';
                else if (window.innerWidth < 1100) el.style.minHeight = '360px';
                else el.style.minHeight = '540px';
            });
        }
        adjustCharts();
        window.addEventListener('resize', adjustCharts);
    }

    // minimal mobile nav builder (keeps functionality, non-invasive)
    function buildMobileNav() {
        // if you want you can implement a drawer here. For now keep nav links visible.
    }

    // --- Legal modal ---
    function openLegal(type) {
        const overlay = document.getElementById('legal-overlay');
        const title = document.getElementById('legal-title');
        const content = document.getElementById('legal-content');
        let html = '';
        let headline = '';
        if (type === 'impressum') {
            headline = 'Impressum';
            html = `
                <p><strong>Angaben gemäß § 5 TMG</strong></p>
                <p>
                T&amp;T Edelmetalle<br>
                [Dein Name / Firma]<br>
                [Straße, Hausnummer]<br>
                [PLZ Ort]<br>
                [Land]
                </p>
                <p><strong>Kontakt</strong><br>E-Mail: [deine@email.de]</p>
                <p class="consent-small" style="margin-top:8px; color:var(--c-text-muted);">Bitte ersetzen Sie die eckigen Platzhalter durch Ihre tatsächlichen Angaben.</p>
            `;
        }
        if (type === 'haftung') {
            headline = 'Haftungsausschluss';
            html = `
                <p>Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>
                <p>Die dargestellten Preise stellen keine verbindlichen Angebote dar und dienen ausschließlich Informationszwecken.</p>
            `;
        }
        if (type === 'datenschutz') {
            headline = 'Datenschutzerklärung';
            html = `
                <p><strong>1. Allgemeine Hinweise</strong></p>
                <p>Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</p>
                <p><strong>2. Verantwortlicher</strong></p>
                <p>Verantwortlich: T&amp;T Edelmetalle — E-Mail: info.ttedelmetalle@gmail.com</p>
                <p><strong>3. Erhebung und Speicherung personenbezogener Daten</strong></p>
                <p>Diese Website kann grundsätzlich ohne Angabe personenbezogener Daten genutzt werden. Es werden <strong>keine Benutzerkonten</strong> und <strong>keine personenbezogenen Eingaben</strong> dauerhaft auf unseren Servern gespeichert.</p>
                <p>Stand: Januar 2026</p>
            `;
        }
        if (title) title.innerText = headline;
        if (content) content.innerHTML = html;
        if (overlay) { overlay.style.display = 'flex'; document.body.classList.add('no-scroll'); }
    }
    function closeLegal() { const overlay = document.getElementById('legal-overlay'); if (overlay) { overlay.style.display = 'none'; document.body.classList.remove('no-scroll'); } }

    // --- PDF Export (uses jsPDF) ---
    function exportPortfolioPDF() {
        if (!portfolio || portfolio.length === 0) { alert('Das Portfolio ist leer. Bitte fügen Sie zuerst Positionen hinzu.'); return; }
        if (!window.jspdf) { alert('PDF-Export: Bibliothek nicht geladen. Bitte prüfen Sie die Verbindung.'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const margin = 15;
        let y = 20;
        doc.setFontSize(14);
        doc.text('T&T Edelmetalle – Portfolio', margin, y);
        doc.setFontSize(10);
        y += 6;
        doc.text('Exportdatum: ' + new Date().toLocaleString('de-DE'), margin, y);
        y += 8;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Pos.', margin, y);
        doc.text('Bezeichnung', margin + 12, y);
        doc.text('Anz.', margin + 98, y);
        doc.text('Einzel', margin + 120, y);
        doc.text('Gesamt', margin + 160, y);
        y += 4;
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(margin, y, 195, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        const lineHeight = 7;
        portfolio.forEach((item, idx) => {
            const totalItemVal = item.singleVal * (item.qty || 1) * (item.spread || 1);
            const name = item.name;
            const qtyStr = String(item.qty || 1);
            const singleStr = formatMoney(item.singleVal);
            const totalStr = formatMoney(totalItemVal);

            const maxWidthName = 80;
            const splitName = doc.splitTextToSize(name, maxWidthName);
            const lines = Math.max(splitName.length, 1);

            for (let i = 0; i < lines; i++) {
                if (y > 275) { doc.addPage(); y = 20; }
                if (i === 0) {
                    doc.text(String(idx + 1), margin, y);
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

        if (y > 260) { doc.addPage(); y = 20; }
        y += 4;
        doc.setLineWidth(0.4);
        doc.line(margin, y, 195, y);
        y += 8;
        doc.setFont(undefined, 'bold');
        const totalValueText = document.getElementById('total-value').innerText || formatMoney(0);
        doc.text('Gesamtwert: ' + totalValueText, margin, y);
        const filename = 'Metallindex_Portfolio_' + (new Date()).toISOString().slice(0, 10) + '.pdf';

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIOS && navigator.share && navigator.canShare) {
            const blob = doc.output('blob');
            const file = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Portfolio Export', text: 'Hier ist dein Portfolio Export.' })
                    .catch((err) => console.error('Teilen abgebrochen oder fehlgeschlagen:', err));
            } else {
                window.open(doc.output('bloburl'), '_blank');
            }
        } else {
            doc.save(filename);
        }
    }

    // --- UI bindings ---
    function initUIBindings() {
        // catalog select bind
        const sel = document.getElementById('catalogSelect');
        if (sel) sel.addEventListener('change', updateCatDetails);
        const rawMetal = document.getElementById('raw-metal');
        if (rawMetal) rawMetal.addEventListener('change', ()=>{ /* nothing */ });
        // catalog toggle will be set in populateCatalog
        // Bind global functions to window for inline onclick handlers
        window.addToPortfolio = addToPortfolio;
        window.clearPortfolio = clearPortfolio;
        window.exportPortfolioPDF = exportPortfolioPDF;
        window.removeFromPortfolio = removeFromPortfolio;
        window.toggleCalcMode = toggleCalcMode;
        window.openLegal = openLegal;
        window.closeLegal = closeLegal;
        window.acceptConsent = acceptConsent;
        window.declineConsent = declineConsent;
    }

    // --- Consent on load ---
    function showConsentIfNeeded() {
        const current = getConsent();
        if (!current) showConsentBanner();
        else if (current === 'accepted') initThirdPartyWidgets();
    }

    // --- initialize on DOMContentLoaded ---
    document.addEventListener('DOMContentLoaded', function () {
        loadPricesThenInit();
    });

    // expose some functions in window scope that may be used by inline handlers
    window.openLegal = openLegal;
    window.closeLegal = closeLegal;
    window.acceptConsent = acceptConsent;
    window.declineConsent = declineConsent;
})();
