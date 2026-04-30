// ==UserScript==
// @name         ZEP JSON Import
// @namespace    https://tampermonkey.net/
// @version      6.0
// @description  JSON-Import fuer ZEP Projektzeiten
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const LOG = (...a) => console.log('[ZEP-Import]', ...a);

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function normalizeDauer(d) {
        const parts = d.split(':');
        return parts.length === 2
            ? parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0')
            : d;
    }

    // ------------------------------------------------------------------
    // Inline status display (non-blocking, survives ZEP re-renders)
    // ------------------------------------------------------------------
    let _status = { msg: '', type: 'info' };

    function setStatus(msg, type = 'info') {
        _status = { msg, type };
        const el = document.getElementById('zep-import-status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = type === 'error' ? '#dc3545'
                       : type === 'success' ? '#0B8069'
                       : '#555';
    }

    // ------------------------------------------------------------------
    // Select2: set by visible text, trigger jQuery + native events
    // ------------------------------------------------------------------
    function setSelect(selectEl, text) {
        const opt = [...selectEl.options].find(o => o.text.trim() === text.trim());
        if (!opt) return false;
        selectEl.value = opt.value;
        if (window.jQuery) {
            jQuery(selectEl).val(opt.value).trigger('change');
        } else {
            selectEl.dispatchEvent(new Event('input', { bubbles: true }));
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
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
        if (msgDiv) {
            msgDiv.innerHTML = '';
        }

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
        if (window.zepDatumAuswahl) {
            LOG(`Setze Datum: ${datum}`);
            zepDatumAuswahl('#datum').setDate(new Date(y, m - 1, d));
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
    // Set the Dauer field (no timeEntry API — ZEP's variant produces NaN;
    // no 'change' event — it re-triggers the plugin and overwrites the value)
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
    // Fill one entry into the form
    // ------------------------------------------------------------------
    async function fillEntry(datum, eintrag) {
        await setDate(datum);

        if (eintrag.Projekt) {
            LOG(`Setze Projekt: ${eintrag.Projekt}`);
            const sel = document.getElementById('projektId');
            if (!sel) throw new Error('Projekt-Dropdown (#projektId) nicht gefunden');
            if (!setSelect(sel, eintrag.Projekt))
                throw new Error('Projekt nicht gefunden: "' + eintrag.Projekt + '"');
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
    // Click Speichern — native .click() required; jQuery .trigger('click')
    // does not fire the browser's native form-submit for type="submit"
    // ------------------------------------------------------------------
    function clickSpeichern() {
        const btn = document.getElementById('Speichern');
        if (!btn) throw new Error('Speichern-Button (#Speichern) nicht gefunden');
        LOG('Klicke Speichern ...');
        btn.click();
    }

    // ------------------------------------------------------------------
    // Main import loop
    // ------------------------------------------------------------------
    async function runImport() {
        LOG('Import gestartet');
        setStatus('Lese Zwischenablage ...');

        const importBtn = document.getElementById('zep-import-btn');
        if (importBtn) importBtn.disabled = true;

        try {
            let text;
            try {
                text = await navigator.clipboard.readText();
            } catch (e) {
                LOG('Clipboard-Fehler:', e);
                setStatus('Fehler: Kein Clipboard-Zugriff — Seite neu laden', 'error');
                return;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                setStatus('Fehler: Kein gültiges JSON in der Zwischenablage', 'error');
                return;
            }

            if (!data.Datum || !Array.isArray(data.Einträge) || !data.Einträge.length) {
                setStatus('Fehler: JSON-Format erwartet { "Datum": "...", "Einträge": [...] }', 'error');
                return;
            }

            const n = data.Einträge.length;
            let saved = 0;

            for (let i = 0; i < n; i++) {
                const eintrag = data.Einträge[i];
                setStatus(`Importiere ${i + 1}/${n} ...`);
                LOG(`--- Eintrag ${i + 1}/${n} ---`);

                try {
                    await fillEntry(data.Datum, eintrag);

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
    // Button + status injection (both survive ZEP's card-footer re-renders
    // because _status persists in the closure and is re-applied on each inject)
    // ------------------------------------------------------------------
    function injectButton() {
        const saveBtn = document.getElementById('Speichern');
        if (!saveBtn) return;

        if (!document.getElementById('zep-import-btn')) {
            const btn = document.createElement('input');
            btn.type = 'button';
            btn.id = 'zep-import-btn';
            btn.value = 'JSON importieren';
            btn.className = 'btn btn-secondary';
            btn.style.marginLeft = '0.5rem';
            btn.addEventListener('click', runImport);
            saveBtn.parentElement.appendChild(btn);
            LOG('Import-Button eingefügt.');
        }

        if (!document.getElementById('zep-import-status')) {
            const span = document.createElement('span');
            span.id = 'zep-import-status';
            span.style.cssText = 'margin-left:0.75rem;font-size:0.875rem;vertical-align:middle;';
            // Re-apply whatever status was showing before the re-render
            span.textContent = _status.msg;
            span.style.color = _status.type === 'error' ? '#dc3545'
                             : _status.type === 'success' ? '#0B8069'
                             : '#555';
            saveBtn.parentElement.appendChild(span);
        }
    }

    new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
    setInterval(injectButton, 800);
    injectButton();
})();
