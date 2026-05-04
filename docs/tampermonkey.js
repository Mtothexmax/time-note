// ==UserScript==
// @name         Time-Note ZEP Integrator
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Empfängt Time-Note-Daten per CustomEvent und trägt sie in ZEP ein
// @author       Time-Note
// @match        https://zep.example.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // Daten von Time-Note empfangen und speichern
    window.addEventListener('time-note-data', function(e) {
        const data = e.detail;
        if (!data || !data.Datum) return;
        GM_setValue('tn_' + data.Datum, JSON.stringify(data));
    });

    // ----- ZEP-spezifische Helfer -----

    // Setzt den Wert eines Select-Feldes und triggert ZEP-eigene Events
    function setZepSelect(id, wert) {
        const el = document.getElementById(id);
        if (!el || !wert) return false;
        for (let opt of el.options) {
            if (opt.title && opt.title.includes(wert)) {
                el.value = opt.value;
                // Native change (funktioniert bei ZEP-onchange Attributen)
                el.dispatchEvent(new Event('change', { bubbles: true }));
                // jQuery fallback (falls ZEP jQuery verwendet)
                if (typeof jQuery !== 'undefined') {
                    jQuery(el).trigger('change');
                }
                return true;
            }
        }
        return false;
    }

    // Setzt ein Textfeld
    function setTextField(id, wert) {
        const el = document.getElementById(id);
        if (!el || !wert) return;
        el.value = wert;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Speichern-Button klicken (ZEP-Formular speichern)
    function clickSave() {
        // Mögliche Selektoren für den Speichern-Button in ZEP
        const btns = [
            document.querySelector('button[type="submit"]'),
            document.querySelector('.btn-primary[type="submit"]'),
            document.querySelector('button:contains("Speichern")'),
            document.querySelector('[onclick*="speichern"]'),
            document.querySelector('[onclick*="save"]'),
            document.querySelector('input[type="submit"]')
        ];
        for (let b of btns) {
            if (b) { b.click(); return b; }
        }
        // Fallback: Formular submit
        const form = document.querySelector('form');
        if (form) form.submit();
        return null;
    }

    // ----- UI -----

    let statusEl = null;

    function setStatus(text, typ) {
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.style.color = typ === 'error' ? '#dc2626' : typ === 'success' ? '#16a34a' : '#2563eb';
    }

    function createUI() {
        const datumInput = document.querySelector('input[name="datum"]');
        if (!datumInput) return false;
        const datum = datumInput.value;
        if (!datum) return false;

        const dataStr = GM_getValue('tn_' + datum);
        if (!dataStr) return false;
        const data = JSON.parse(dataStr);
        if (!data || !data.Einträge || data.Einträge.length === 0) return false;

        const container = datumInput.closest('.card-body') || datumInput.closest('.row');
        if (!container) return false;
        if (container.querySelector('.tn-panel')) return true; // bereits erstellt

        const panel = document.createElement('div');
        panel.className = 'tn-panel';
        panel.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;padding:6px 10px;background:#f0f5ff;border-radius:6px;font-size:13px;';

        const label = document.createElement('span');
        label.textContent = 'Time-Note (' + data.Einträge.length + ' Einträge)';
        label.style.cssText = 'font-weight:600;color:#1e40af;white-space:nowrap;';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Import starten';
        btn.style.cssText = 'padding:4px 12px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;';
        btn.onclick = function() { runImport(data); };

        statusEl = document.createElement('span');
        statusEl.style.cssText = 'font-size:12px;color:#2563eb;';

        panel.appendChild(label);
        panel.appendChild(btn);
        panel.appendChild(statusEl);
        container.appendChild(panel);
        return true;
    }

    // ----- Import-Logik (Entry für Entry) -----

    let importing = false;

    async function runImport(data) {
        if (importing) return;
        importing = true;
        const entries = data.Einträge;
        let success = 0, errors = 0;

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            setStatus('Eintrag ' + (i + 1) + '/' + entries.length + ' wird verarbeitet ...', 'info');

            // Dauer setzen
            setTextField('dauer', entry.Dauer);

            // Projekt setzen (triggert ZEP-refresh → Vorgang-Liste aktualisiert sich)
            const projOk = setZepSelect('projektId', entry.Projekt);
            if (!projOk) { setStatus('Projekt nicht gefunden: ' + entry.Projekt, 'error'); errors++; continue; }

            // Kurz warten, damit ZEP den Refresh abschließen kann
            await new Promise(r => setTimeout(r, 500));

            // Vorgang setzen
            const vorgOk = setZepSelect('vorgangId', entry.Vorgang);
            if (!vorgOk) { setStatus('Vorgang nicht gefunden: ' + entry.Vorgang, 'error'); errors++; continue; }
            await new Promise(r => setTimeout(r, 300));

            // Tätigkeit setzen
            const taetOk = setZepSelect('taetigkeit', entry.Tätigkeit);
            if (!taetOk) { setStatus('Tätigkeit nicht gefunden: ' + entry.Tätigkeit, 'error'); errors++; continue; }

            // Bemerkung setzen
            setTextField('bemerkung', entry.Bemerkung);

            // Speichern klicken
            await new Promise(r => setTimeout(r, 300));
            clickSave();
            await new Promise(r => setTimeout(r, 500));

            success++;
            setStatus('Eintrag ' + (i + 1) + '/' + entries.length + ' erledigt', 'success');
        }

        setStatus(entries.length + ' Einträge: ' + success + ' ok, ' + errors + ' Fehler', errors > 0 ? 'error' : 'success');
        importing = false;
    }

    // Regelmäßig prüfen, ob die ZEP-Seite geladen ist
    setInterval(function() {
        if (!document.querySelector('.tn-panel')) {
            createUI();
        }
    }, 1000);
})();
