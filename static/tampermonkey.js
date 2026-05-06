// ==UserScript==
// @name         Time-Note ZEP Integrator
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Empfängt Time-Note-Daten per CustomEvent und trägt sie in ZEP ein
// @author       Time-Note
// @match        https://mtothexmax.github.io/time-note/*
// @match        https://www.zep-online.de/zepintendgeoinformatik/*
// @match        http://localhost:5173/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const LOG = (...a) => console.log('[Time-Note]', ...a);

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    LOG('Script gestartet auf:', location.hostname);

    // --- Approach 1: CustomEvent (unsafeWindow) ---
    unsafeWindow.addEventListener('time-note-data', function(e) {
        const data = e.detail;
        if (!data || !data.Datum) return;
        LOG('[Event] Empfangen für:', data.Datum, '| Einträge:', data.Einträge?.length);
        GM_setValue('tn_' + data.Datum, JSON.stringify(data));
        LOG('[Event] GM_setValue gespeichert: tn_' + data.Datum);
    });

    // --- Approach 2: localStorage polling (fallback, runs on Time-Note pages) ---
    // The app writes tn_export_YYYY-MM-DD to localStorage on every save/dispatch.
    function syncFromLocalStorage() {
        try {
            const ls = unsafeWindow.localStorage;
            for (let i = 0; i < ls.length; i++) {
                const key = ls.key(i);
                if (!key || !key.startsWith('tn_export_')) continue;
                const gmKey = 'tn_' + key.replace('tn_export_', '');
                const val = ls.getItem(key);
                if (val && GM_getValue(gmKey) !== val) {
                    GM_setValue(gmKey, val);
                    LOG('[localStorage] Synced:', gmKey);
                }
            }
        } catch(e) {
            LOG('[localStorage] Sync-Fehler:', e);
        }
    }

    // Only poll on Time-Note pages (not on ZEP)
    if (location.hostname !== 'www.zep-online.de') {
        setInterval(syncFromLocalStorage, 2000);
        syncFromLocalStorage();
    }

    // ------------------------------------------------------------------
    // Normalize duration format  hh:mm
    // ------------------------------------------------------------------
    function normalizeDauer(d) {
        const parts = d.split(':');
        return parts.length === 2
            ? parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0')
            : d;
    }

    // ------------------------------------------------------------------
    // Inline status display (survives ZEP re-renders via _status closure)
    // ------------------------------------------------------------------
    let _status = { msg: '', type: 'info' };

    function setStatus(msg, type = 'info') {
        _status = { msg, type };
        const el = document.getElementById('tn-import-status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = type === 'error'   ? '#dc3545'
                       : type === 'success' ? '#0B8069'
                       : '#555';
    }

    // ------------------------------------------------------------------
    // Set a <select> value without jQuery.
    // ZEP's inline onchange="zepFormElement(this).refreshForm()" is called
    // directly — this is what triggers the AJAX reload of dependent dropdowns.
    // A native 'change' event is also dispatched so any other listeners fire.
    // ------------------------------------------------------------------
    function setSelect(selectEl, text) {
        const opt = [...selectEl.options].find(o => o.text.trim() === text.trim());
        if (!opt) return false;
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof selectEl.onchange === 'function') {
            selectEl.onchange.call(selectEl);
        }
        return true;
    }

    // ------------------------------------------------------------------
    // Wait for an option in a <select> (re-queries by ID to survive AJAX re-renders)
    // ------------------------------------------------------------------
    async function waitForOption(selectId, text, ms = 8000) {
        LOG(`Warte auf Option "${text}" in #${selectId} ...`);
        const end = Date.now() + ms;
        while (Date.now() < end) {
            const sel = document.getElementById(selectId);
            if (sel && [...sel.options].some(o => o.text.trim() === text.trim())) {
                LOG(`Option "${text}" gefunden.`);
                return document.getElementById(selectId);
            }
            await sleep(120);
        }
        throw new Error(`Timeout: Option "${text}" nicht in #${selectId} erschienen`);
    }

    // ------------------------------------------------------------------
    // Save detection via MutationObserver
    // ------------------------------------------------------------------
    function getMsgDiv() {
        return document.querySelector('[id^="formularmessagediv_"]');
    }

    async function waitForSave(expectedBemerkung, ms = 15000) {
        const msgDiv = getMsgDiv();
        if (msgDiv) msgDiv.innerHTML = '';

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                obs.disconnect();
                reject(new Error('Timeout: Keine Antwort nach ' + (ms / 1000) + 's'));
            }, ms);

            const finish = (err) => {
                clearTimeout(timer);
                obs.disconnect();
                if (err) reject(err); else resolve();
            };

            const obs = new MutationObserver(() => {
                const div = getMsgDiv();
                if (div && div.innerHTML.trim()) {
                    const txt = div.textContent.trim();
                    LOG('formularmessagediv:', txt);
                    if (div.querySelector('.alert-danger, .text-danger') ||
                        txt.toLowerCase().includes('fehler') ||
                        txt.toLowerCase().includes('error')) {
                        finish(new Error('ZEP: ' + txt.substring(0, 250)));
                    } else {
                        finish(null);
                    }
                    return;
                }
                if (expectedBemerkung) {
                    const bem = document.getElementById('bemerkung');
                    if (bem && bem.value === '' && bem.value !== expectedBemerkung) {
                        LOG('Fallback: bemerkung geleert → Speichern erfolgreich.');
                        finish(null);
                    }
                }
            });

            obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        });
    }

    // ------------------------------------------------------------------
    // Set date via ZEP's own datepicker API
    // ------------------------------------------------------------------
    async function setDate(datum) {
        const parts = datum.split('-');
        if (parts.length !== 3) throw new Error('Ungültiges Datum: ' + datum);
        const [y, m, d] = parts.map(Number);
        if (unsafeWindow.zepDatumAuswahl) {
            LOG(`Setze Datum: ${datum}`);
            unsafeWindow.zepDatumAuswahl('#datum').setDate(new Date(y, m - 1, d));
            await sleep(400);
        } else {
            const hidden = document.querySelector('input[name="datum"]');
            if (hidden) {
                hidden.value = datum;
                hidden.dispatchEvent(new Event('change', { bubbles: true }));
                await sleep(400);
            }
        }
    }

    // ------------------------------------------------------------------
    // Set the Dauer field — no 'change' event; ZEP's timeEntry plugin
    // would overwrite the value and produce NaN
    // ------------------------------------------------------------------
    function setDauer(value) {
        const el = document.getElementById('dauer');
        if (!el) return;
        const normalized = normalizeDauer(value);
        LOG(`Setze Dauer: ${normalized}`);
        el.value = normalized;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ------------------------------------------------------------------
    // Fill one entry into the ZEP form
    // ------------------------------------------------------------------
    async function fillEntry(datum, eintrag) {
        await setDate(datum);

        if (eintrag.Projekt) {
            LOG(`Setze Projekt: ${eintrag.Projekt}`);
            const sel = document.getElementById('projektId');
            if (!sel) throw new Error('Projekt-Dropdown (#projektId) nicht gefunden');
            if (!setSelect(sel, eintrag.Projekt))
                throw new Error('Projekt nicht gefunden: "' + eintrag.Projekt + '"');
            // Wait for ZEP's AJAX refresh to start loading the Vorgang list
            await sleep(800);
            if (eintrag.Vorgang)
                await waitForOption('vorgangId', eintrag.Vorgang);
        }

        if (eintrag.Vorgang) {
            LOG(`Setze Vorgang: ${eintrag.Vorgang}`);
            const sel = document.getElementById('vorgangId');
            if (!sel) throw new Error('Vorgang-Dropdown (#vorgangId) nicht gefunden');
            if (!setSelect(sel, eintrag.Vorgang))
                throw new Error('Vorgang nicht gefunden: "' + eintrag.Vorgang + '"');
            if (eintrag['Tätigkeit'])
                await waitForOption('taetigkeit', eintrag['Tätigkeit']).catch(() => {});
        }

        if (eintrag['Tätigkeit']) {
            LOG(`Setze Tätigkeit: ${eintrag['Tätigkeit']}`);
            const sel = document.getElementById('taetigkeit');
            if (sel && !setSelect(sel, eintrag['Tätigkeit']))
                throw new Error('Tätigkeit nicht gefunden: "' + eintrag['Tätigkeit'] + '"');
        }

        if (eintrag.Dauer) setDauer(eintrag.Dauer);

        if (typeof eintrag.Bemerkung === 'string') {
            LOG(`Setze Bemerkung: ${eintrag.Bemerkung}`);
            const el = document.getElementById('bemerkung');
            if (el) {
                el.value = eintrag.Bemerkung;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        await sleep(200);
    }

    // ------------------------------------------------------------------
    // Click Speichern — native .click() fires the browser's form-submit
    // ------------------------------------------------------------------
    function clickSpeichern() {
        const btn = document.getElementById('Speichern');
        if (!btn) throw new Error('Speichern-Button (#Speichern) nicht gefunden');
        LOG('Klicke Speichern ...');
        btn.click();
    }

    // ------------------------------------------------------------------
    // Get current date from hidden datum input
    // ------------------------------------------------------------------
    function getCurrentDate() {
        const hidden = document.querySelector('input[name="datum"]');
        return hidden ? hidden.value : null;
    }

    // ------------------------------------------------------------------
    // Main import loop — reads data from GM storage for current date
    // ------------------------------------------------------------------
    async function runImport() {
        LOG('Import gestartet');
        const importBtn = document.getElementById('tn-import-btn');
        if (importBtn) importBtn.disabled = true;

        try {
            const datum = getCurrentDate();
            if (!datum) {
                setStatus('Fehler: Datum nicht gefunden', 'error');
                return;
            }

            const dataStr = GM_getValue('tn_' + datum);
            LOG('[Import] GM_getValue("tn_' + datum + '"):', dataStr ? 'gefunden (' + dataStr.length + ' chars)' : 'NICHT GEFUNDEN');
            if (!dataStr) {
                setStatus('Keine Time-Note-Daten für ' + datum, 'error');
                return;
            }

            let data;
            try {
                data = JSON.parse(dataStr);
            } catch {
                setStatus('Fehler: Ungültige gespeicherte Daten', 'error');
                return;
            }

            if (!Array.isArray(data.Einträge) || !data.Einträge.length) {
                setStatus('Keine Einträge für ' + datum, 'error');
                return;
            }

            const n = data.Einträge.length;
            let saved = 0;

            for (let i = 0; i < n; i++) {
                const eintrag = data.Einträge[i];
                setStatus(`Importiere ${i + 1}/${n} ...`);
                LOG(`--- Eintrag ${i + 1}/${n} ---`);

                try {
                    await fillEntry(datum, eintrag);

                    const saveWait = waitForSave(eintrag.Bemerkung || '', 15000);
                    await sleep(2500);
                    clickSpeichern();
                    await saveWait;

                    saved++;
                    LOG(`Eintrag ${i + 1} gespeichert ✓`);
                    setStatus(`Gespeichert ${saved}/${n}`, saved === n ? 'success' : 'info');

                    await sleep(500);
                } catch (err) {
                    LOG(`FEHLER Eintrag ${i + 1}:`, err);
                    setStatus(`Fehler bei Eintrag ${i + 1}/${n}: ${err.message}`, 'error');
                    return;
                }
            }

            setStatus(`✓ ${saved} von ${n} Einträgen gespeichert`, 'success');
        } finally {
            if (importBtn) importBtn.disabled = false;
        }
    }

    // ------------------------------------------------------------------
    // Clipboard import — reads a single JSON entry and fills + saves it
    // ------------------------------------------------------------------
    async function runClipboardImport() {
        LOG('Clipboard-Import gestartet');
        const clipBtn = document.getElementById('tn-clipboard-btn');
        if (clipBtn) clipBtn.disabled = true;

        try {
            const datum = getCurrentDate();
            if (!datum) {
                setStatus('Fehler: Datum nicht gefunden', 'error');
                return;
            }

            let text;
            try {
                text = await navigator.clipboard.readText();
            } catch {
                setStatus('Fehler: Kein Clipboard-Zugriff', 'error');
                return;
            }

            let eintrag;
            try {
                eintrag = JSON.parse(text);
            } catch {
                setStatus('Fehler: Kein gültiges JSON in Zwischenablage', 'error');
                return;
            }

            if (!eintrag || typeof eintrag !== 'object') {
                setStatus('Fehler: Ungültiges JSON-Format', 'error');
                return;
            }

            setStatus('Importiere aus Zwischenablage ...');
            LOG('Eintrag aus Clipboard:', eintrag);

            await fillEntry(datum, eintrag);

            const saveWait = waitForSave(eintrag.Bemerkung || '', 15000);
            await sleep(2500);
            clickSpeichern();
            await saveWait;

            setStatus('✓ Eintrag aus Zwischenablage gespeichert', 'success');
            LOG('Clipboard-Eintrag gespeichert ✓');
        } catch (err) {
            LOG('FEHLER Clipboard-Import:', err);
            setStatus('Fehler: ' + err.message, 'error');
        } finally {
            if (clipBtn) clipBtn.disabled = false;
        }
    }

    // ------------------------------------------------------------------
    // Button + status injection (survives ZEP card-footer re-renders)
    // ------------------------------------------------------------------
    function injectButton() {
        const saveBtn = document.getElementById('Speichern');
        if (!saveBtn) return;

        if (!document.getElementById('tn-import-btn')) {
            const datum = getCurrentDate();
            const hasData = datum && GM_getValue('tn_' + datum);

            const btn = document.createElement('input');
            btn.type = 'button';
            btn.id = 'tn-import-btn';
            btn.value = 'Time-Note importieren';
            btn.className = 'btn btn-secondary';
            btn.style.marginLeft = '0.5rem';
            if (!hasData) {
                btn.style.opacity = '0.6';
                btn.title = 'Keine Time-Note-Daten für dieses Datum vorhanden';
            }
            btn.addEventListener('click', runImport);
            saveBtn.parentElement.appendChild(btn);
            LOG('Import-Button eingefügt.');
        }

        if (!document.getElementById('tn-clipboard-btn')) {
            const btn2 = document.createElement('input');
            btn2.type = 'button';
            btn2.id = 'tn-clipboard-btn';
            btn2.value = 'JSON einfügen';
            btn2.className = 'btn btn-secondary';
            btn2.style.marginLeft = '0.5rem';
            btn2.title = 'Einzelnen Eintrag aus JSON-Zwischenablage importieren';
            btn2.addEventListener('click', runClipboardImport);
            saveBtn.parentElement.appendChild(btn2);
            LOG('Clipboard-Button eingefügt.');
        }

        if (!document.getElementById('tn-import-status')) {
            const span = document.createElement('span');
            span.id = 'tn-import-status';
            span.style.cssText = 'margin-left:0.75rem;font-size:0.875rem;vertical-align:middle;';
            span.textContent = _status.msg;
            span.style.color = _status.type === 'error'   ? '#dc3545'
                             : _status.type === 'success' ? '#0B8069'
                             : '#555';
            saveBtn.parentElement.appendChild(span);
        }
    }

    function setupInjector() {
        new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
        setInterval(injectButton, 800);
        injectButton();
    }

    if (document.body) {
        setupInjector();
    } else {
        document.addEventListener('DOMContentLoaded', setupInjector);
    }
})();
