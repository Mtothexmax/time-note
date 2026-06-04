// @ts-nocheck
// ==UserScript==
// @name         Time-Note ZEP Integrator
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Empfängt Time-Note-Daten per CustomEvent und trägt sie in ZEP ein
// @author       Time-Note
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

    const RETRY_COUNT = 3;

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
    // Errors lock the display until a button is pressed again.
    // ------------------------------------------------------------------
    let _status = { msg: '', type: 'info' };
    let _statusLocked = false;

    function setStatus(msg, type = 'info') {
        if (_statusLocked) return;
        _status = { msg, type };
        if (type === 'error') _statusLocked = true;
        const el = document.getElementById('tn-import-status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = type === 'error'   ? '#dc3545'
                       : type === 'success' ? '#0B8069'
                       : '#555';
    }

    // ------------------------------------------------------------------
    // Append a line to the status display without clearing existing content.
    // Does NOT modify _statusLocked — caller manages lock state during retries.
    // ------------------------------------------------------------------
    function appendStatus(msg, type = 'info') {
        const el = document.getElementById('tn-import-status');
        if (!el) return;
        const color = type === 'error'   ? '#dc3545'
                    : type === 'success' ? '#0B8069'
                    : '#555';
        const span = document.createElement('span');
        span.textContent = msg;
        span.style.color = color;
        el.appendChild(document.createElement('br'));
        el.appendChild(span);
    }

    // ------------------------------------------------------------------
    // Set a <select> value without jQuery.
    // ZEP's inline onchange="zepFormElement(this).refreshForm()" is called
    // directly — this is what triggers the AJAX reload of dependent dropdowns.
    // A native 'change' event is also dispatched so any other listeners fire.
    // ------------------------------------------------------------------
    function setSelect(selectEl, text) {
        const t = text.trim();
        // "#<digits>" → match by option text containing the number (ZEP option text, not value attr)
        const opt = /^#\d+$/.test(t)
            ? [...selectEl.options].find(o => o.text.trim().includes(t.slice(1)))
            : [...selectEl.options].find(o => o.text.trim() === t);
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
        const t = text.trim();
        const byNum = /^#\d+$/.test(t);
        const num = byNum ? t.slice(1) : null;
        while (Date.now() < end) {
            const sel = document.getElementById(selectId);
            if (sel) {
                const found = byNum
                    ? [...sel.options].some(o => o.text.trim().includes(num))
                    : [...sel.options].some(o => o.text.trim() === t);
                if (found) {
                    LOG(`Option "${text}" gefunden.`);
                    return document.getElementById(selectId);
                }
            }
            await sleep(120);
        }
        throw new Error(`Timeout: Option "${text}" nicht in #${selectId} erschienen`);
    }

    // ------------------------------------------------------------------
    // Wait for a CSS selector to appear in the DOM
    // ------------------------------------------------------------------
    async function waitForElement(selector, ms = 5000) {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            const el = document.querySelector(selector);
            if (el) return el;
            await sleep(150);
        }
        throw new Error(`Timeout: Element "${selector}" nicht erschienen`);
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
    // Set the Dauer field.
    // ZEP validates the hidden 'Dauerhelp' field (minutes integer) on submit,
    // not the #dauer display input directly. The timeEntry plugin normally
    // fills Dauerhelp on blur/change, but we skip that event to avoid NaN.
    // We set Dauerhelp explicitly instead.
    // ------------------------------------------------------------------
    function setDauer(value) {
        const el = document.getElementById('dauer');
        if (!el) return;
        const normalized = normalizeDauer(value);
        LOG(`Setze Dauer: ${normalized}`);
        el.value = normalized;
        el.dispatchEvent(new Event('input', { bubbles: true }));

        const parts = normalized.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const totalMin = parts[0] * 60 + parts[1];
            const helper = document.getElementById('dauerhelp')
                || document.querySelector('[name="Dauerhelp"]')
                || document.querySelector('[name="dauerhelp"]');
            if (helper) {
                helper.value = String(totalMin);
                LOG(`Dauerhelp gesetzt: ${totalMin} min`);
            } else {
                LOG('WARN: Dauerhelp-Feld nicht gefunden');
            }
        }
    }

    // ------------------------------------------------------------------
    // Fill the cascade dropdowns only (Projekt → Vorgang → Tätigkeit).
    // Dauer and Bemerkung are NOT set here — they must be set AFTER this
    // function returns and an extra sleep has been observed, because ZEP's
    // AJAX refresh triggered by each dropdown wipes those fields.
    // ------------------------------------------------------------------
    async function fillEntry(datum, eintrag) {
        await setDate(datum);

        if (eintrag.Projekt) {
            LOG(`Setze Projekt: ${eintrag.Projekt}`);
            const sel = document.getElementById('projektId');
            if (!sel) throw new Error('Projekt-Dropdown (#projektId) nicht gefunden');
            if (!setSelect(sel, eintrag.Projekt))
                throw new Error('Projekt nicht gefunden: "' + eintrag.Projekt + '"');
            // ZEP reloads the entire form section after project change — needs extra time.
            await sleep(2000);
            if (eintrag.Vorgang)
                await waitForOption('vorgangId', eintrag.Vorgang);
            await sleep(600); // let form fully settle after Vorgang dropdown is populated
        }

        if (eintrag.Vorgang) {
            LOG(`Setze Vorgang: ${eintrag.Vorgang}`);
            const sel = document.getElementById('vorgangId');
            if (!sel) throw new Error('Vorgang-Dropdown (#vorgangId) nicht gefunden');
            if (!setSelect(sel, eintrag.Vorgang))
                throw new Error('Vorgang nicht gefunden: "' + eintrag.Vorgang + '"');
            if (eintrag['Tätigkeit'])
                await waitForOption('taetigkeit', eintrag['Tätigkeit']).catch(() => {});
            await sleep(600); // let form settle after Tätigkeit dropdown is populated
        }

        if (eintrag['Tätigkeit']) {
            LOG(`Setze Tätigkeit: ${eintrag['Tätigkeit']}`);
            const sel = document.getElementById('taetigkeit');
            if (sel && !setSelect(sel, eintrag['Tätigkeit']))
                throw new Error('Tätigkeit nicht gefunden: "' + eintrag['Tätigkeit'] + '"');
        }
        // Return immediately — caller waits for final AJAX to settle before Dauer/Bemerkung.
    }

    // ------------------------------------------------------------------
    // Re-apply Tätigkeit silently after AJAX settle.
    // ZEP's Vorgang onchange triggers refreshForm() AJAX which resets Tätigkeit
    // to the dropdown default. We re-set the value directly and notify only
    // select2's internal listener (change.select2) to avoid triggering another
    // refreshForm() loop.
    // ------------------------------------------------------------------
    function reapplyTaetigkeit(eintrag) {
        if (!eintrag['Tätigkeit']) return;
        const sel = document.getElementById('taetigkeit');
        if (!sel) return;
        const t = eintrag['Tätigkeit'].trim();
        const opt = [...sel.options].find(o => o.text.trim() === t);
        if (!opt) { LOG('reapplyTaetigkeit: Option nicht gefunden:', t); return; }
        sel.value = opt.value;
        const jq = unsafeWindow.jQuery || unsafeWindow.$;
        if (jq) jq(sel).trigger('change.select2');
        LOG('reapplyTaetigkeit: neu gesetzt:', t);
    }

    // ------------------------------------------------------------------
    // When Vorgang is a "#<number>" shorthand, prepend the matched option's
    // description (leading number and all parentheses removed) to Bemerkung.
    // Returns a shallow copy with augmented Bemerkung, or eintrag unchanged.
    // ------------------------------------------------------------------
    function augmentEintrag(eintrag) {
        if (!/^#\d+$/.test((eintrag.Vorgang || '').trim())) return eintrag;
        const sel = document.getElementById('vorgangId');
        const optText = sel?.selectedOptions[0]?.text?.trim();
        if (!optText) return eintrag;
        // "334429 (KA.R.3: (CMP-00575) Realisierung)" → strip number, strip all parens
        const description = optText
            .replace(/^\d+\s*/, '')
            .replace(/[()]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!description) return eintrag;
        const bem = typeof eintrag.Bemerkung === 'string' ? eintrag.Bemerkung : '';
        return { ...eintrag, Bemerkung: bem ? `${description} - ${bem}` : description };
    }

    // ------------------------------------------------------------------
    // Fill one entry end-to-end: cascade selects, re-apply Tätigkeit,
    // augment Bemerkung, set final fields, save.
    // ------------------------------------------------------------------
    async function fillAndSave(datum, eintrag) {
        await fillEntry(datum, eintrag);
        await sleep(2000);
        reapplyTaetigkeit(eintrag);
        const augmented = augmentEintrag(eintrag);
        setFinalFields(augmented);
        await sleep(300);
        const saveWait = waitForSave(augmented.Bemerkung || '', 15000);
        await sleep(300);
        clickSpeichern();
        await saveWait;
    }

    // ------------------------------------------------------------------
    // Set Dauer and Bemerkung — called AFTER cascade AJAX has settled.
    // ------------------------------------------------------------------
    function setFinalFields(eintrag) {
        if (eintrag.Dauer) setDauer(eintrag.Dauer);
        if (typeof eintrag.Bemerkung === 'string') {
            LOG(`Setze Bemerkung: ${eintrag.Bemerkung}`);
            const el = document.getElementById('bemerkung');
            if (el) {
                el.value = eintrag.Bemerkung;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    // ------------------------------------------------------------------
    // Copy current form state as JSON (same format as EventCard export)
    // ------------------------------------------------------------------
    function copyCurrentAsJSON() {
        try {
            const readField = (id) => {
                const el = document.getElementById(id);
                if (!el) return '';
                if (el.tagName === 'SELECT') return el.selectedOptions[0]?.text?.trim() || '';
                return el.value?.trim() || '';
            };

            const entry = {
                Dauer:       readField('dauer'),
                Projekt:     readField('projektId'),
                Vorgang:     readField('vorgangId'),
                'Tätigkeit': readField('taetigkeit'),
                Bemerkung:   readField('bemerkung')
            };

            navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
            setStatus('JSON kopiert ✓', 'success');
            LOG('JSON kopiert:', entry);
        } catch (err) {
            setStatus('Fehler beim Kopieren: ' + err.message, 'error');
        }
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
    // Today as YYYY-MM-DD
    // ------------------------------------------------------------------
    function todayISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // ------------------------------------------------------------------
    // Preview dialog — shows entries in a readable table before import.
    // Resolves with { freigeben: bool } when confirmed, or null if cancelled.
    // ------------------------------------------------------------------
    function showPreviewDialog(entries, datum) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';

            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:#fff;border-radius:10px;padding:20px 24px;max-width:760px;width:92%;max-height:82vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.35);';

            const titleEl = document.createElement('div');
            titleEl.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:14px;color:#111;';
            const totalMin = entries.reduce((sum, e) => {
                const parts = (e.Dauer || '').split(':').map(Number);
                return sum + (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts[0] * 60 + parts[1] : 0);
            }, 0);
            const totalStr = totalMin > 0 ? `  ·  ${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, '0')}h` : '';
            titleEl.textContent = `Vorschau: ${datum}  (${entries.length} Eintrag${entries.length !== 1 ? 'e' : ''}${totalStr})`;

            const table = document.createElement('table');
            table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:16px;';

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headerRow.style.cssText = 'background:#f0f0f0;';
            ['Dauer', 'Projekt', 'Vorgang', 'Tätigkeit', 'Bemerkung'].forEach(h => {
                const th = document.createElement('th');
                th.style.cssText = 'padding:6px 10px;text-align:left;border-bottom:2px solid #ddd;font-weight:600;color:#555;font-size:10px;text-transform:uppercase;letter-spacing:0.4px;white-space:nowrap;';
                th.textContent = h;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            entries.forEach((e, i) => {
                const tr = document.createElement('tr');
                tr.style.cssText = `border-bottom:1px solid #eee;${i % 2 === 1 ? 'background:#fafafa;' : ''}`;
                const cells = [e.Dauer || '', e.Projekt || '', e.Vorgang || '', e['Tätigkeit'] || '', e.Bemerkung || ''];
                cells.forEach((val, ci) => {
                    const td = document.createElement('td');
                    td.style.cssText = 'padding:7px 10px;vertical-align:top;' + (ci === 0 ? 'white-space:nowrap;font-weight:600;font-variant-numeric:tabular-nums;' : 'word-break:break-word;');
                    td.textContent = val || '—';
                    if (!val) td.style.color = '#bbb';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            const sep = document.createElement('div');
            sep.style.cssText = 'border-top:1px solid #e5e5e5;margin:4px 0 14px;';

            const checkWrapper = document.createElement('label');
            checkWrapper.style.cssText = 'display:flex;align-items:center;gap:9px;margin-bottom:18px;cursor:pointer;font-size:13px;color:#333;user-select:none;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cssText = 'width:15px;height:15px;cursor:pointer;flex-shrink:0;accent-color:#0d6efd;';
            const checkLabel = document.createElement('span');
            checkLabel.textContent = 'Bis heute freigeben, wenn es keine Fehler gibt';
            checkWrapper.appendChild(checkbox);
            checkWrapper.appendChild(checkLabel);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Abbrechen';
            cancelBtn.style.cssText = 'padding:8px 18px;border:1px solid #ccc;background:#fff;border-radius:6px;cursor:pointer;font-size:13px;color:#444;';

            const okBtn = document.createElement('button');
            okBtn.textContent = 'Importieren';
            okBtn.style.cssText = 'padding:8px 18px;background:#0d6efd;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;';

            function confirm() {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', keyHandler);
                resolve({ freigeben: checkbox.checked });
            }
            function cancel() {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', keyHandler);
                resolve(null);
            }

            cancelBtn.onclick = cancel;
            okBtn.onclick = confirm;

            function keyHandler(e) {
                if (e.key === 'Escape') cancel();
                if (e.key === 'Enter' && document.activeElement !== cancelBtn) confirm();
            }
            document.addEventListener('keydown', keyHandler);

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(okBtn);
            dialog.appendChild(titleEl);
            dialog.appendChild(table);
            dialog.appendChild(sep);
            dialog.appendChild(checkWrapper);
            dialog.appendChild(btnRow);
            overlay.appendChild(dialog);
            // Close on backdrop click
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });
            document.body.appendChild(overlay);
            okBtn.focus();
        });
    }

    // ------------------------------------------------------------------
    // Import loop — runs all entries with retry, returns true on full success.
    // ------------------------------------------------------------------
    async function importEntries(datum, entries) {
        const n = entries.length;
        let saved = 0;

        for (let i = 0; i < n; i++) {
            const eintrag = entries[i];
            setStatus(`Importiere ${i + 1}/${n} ...`);
            LOG(`--- Eintrag ${i + 1}/${n} ---`);

            let lastErr = null;
            for (let retry = 0; retry <= RETRY_COUNT; retry++) {
                try {
                    await fillAndSave(datum, eintrag);
                    lastErr = null;
                    break;
                } catch (err) {
                    LOG(`FEHLER Eintrag ${i + 1} (Versuch ${retry + 1}/${RETRY_COUNT + 1}):`, err);
                    lastErr = err;
                    if (retry < RETRY_COUNT) {
                        appendStatus(`Retry ${retry + 1}/${RETRY_COUNT}: ${err.message}`, 'error');
                        _statusLocked = false;
                        await sleep(2000);
                    }
                }
            }

            if (lastErr) {
                LOG(`FEHLER Eintrag ${i + 1} nach ${RETRY_COUNT + 1} Versuchen:`, lastErr);
                setStatus(`Fehler bei Eintrag ${i + 1}/${n}: ${lastErr.message}`, 'error');
                return false;
            }

            saved++;
            LOG(`Eintrag ${i + 1} gespeichert ✓`);
            setStatus(`Gespeichert ${saved}/${n}`, saved === n ? 'success' : 'info');
            await sleep(500);
        }

        setStatus(`✓ ${saved} von ${n} Einträgen gespeichert`, 'success');
        return true;
    }

    // ------------------------------------------------------------------
    // Click the Freigeben button, set date to today, confirm.
    // 3 attempts. Only called when import succeeded without errors.
    // ------------------------------------------------------------------
    async function runFreigeben() {
        LOG('Freigeben gestartet');
        const today = todayISO();

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                if (attempt > 0) await sleep(1500);

                // Find Freigeben button (lock icon in page header area)
                const freigebenBtn = document.getElementById('link_1')
                    || document.querySelector('i.icon-lock')?.closest('a');
                if (!freigebenBtn) throw new Error('Freigeben-Button nicht gefunden');
                LOG('Klicke Freigeben-Button ...');
                freigebenBtn.click();

                // Wait for popup with the Heute shortcut link
                await waitForElement('#freigabedatum a[title="Heute"]', 5000);
                await sleep(200);

                // Click "Heute"
                const heuteLink = document.querySelector('#freigabedatum a[title="Heute"]');
                if (!heuteLink) throw new Error('"Heute"-Link im Popup nicht gefunden');
                LOG('Klicke Heute ...');
                heuteLink.click();
                // preventDblClick delays 500ms, datepicker needs time to update hidden input
                await sleep(800);

                // Verify date was set correctly
                const hiddenInput = document.querySelector('input[name="freigabedatum"]');
                if (!hiddenInput) throw new Error('Freigabedatum-Feld nicht gefunden');
                if (hiddenInput.value !== today) {
                    throw new Error(`Datum falsch: "${hiddenInput.value}" (erwartet: "${today}")`);
                }
                LOG('Datum verifiziert:', hiddenInput.value);

                // Click Speichern inside the popup
                const popupSpeichern = document.querySelector('#zep-popup-content input[name="Speichern"]');
                if (!popupSpeichern) throw new Error('Speichern-Button im Popup nicht gefunden');
                LOG('Klicke Speichern im Popup ...');
                popupSpeichern.click();

                appendStatus(' · Freigegeben bis heute ✓', 'success');
                LOG('Freigeben erfolgreich');
                return;
            } catch (err) {
                LOG(`Freigeben Fehler (Versuch ${attempt + 1}/3):`, err);
                if (attempt === 2) {
                    appendStatus(` · Freigeben fehlgeschlagen: ${err.message}`, 'error');
                }
            }
        }
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
            if (!datum) { setStatus('Fehler: Datum nicht gefunden', 'error'); return; }

            const dataStr = GM_getValue('tn_' + datum);
            LOG('[Import] GM_getValue("tn_' + datum + '"):', dataStr ? 'gefunden (' + dataStr.length + ' chars)' : 'NICHT GEFUNDEN');
            if (!dataStr) { setStatus('Keine Time-Note-Daten für ' + datum, 'error'); return; }

            let data;
            try { data = JSON.parse(dataStr); } catch { setStatus('Fehler: Ungültige gespeicherte Daten', 'error'); return; }

            if (!Array.isArray(data.Einträge) || !data.Einträge.length) {
                setStatus('Keine Einträge für ' + datum, 'error');
                return;
            }

            const confirmed = await showPreviewDialog(data.Einträge, datum);
            if (!confirmed) return;

            _statusLocked = false;
            const statusEl = document.getElementById('tn-import-status');
            if (statusEl) { statusEl.textContent = ''; statusEl.style.color = '#555'; }

            const success = await importEntries(datum, data.Einträge);
            if (success && confirmed.freigeben) await runFreigeben();
        } finally {
            if (importBtn) importBtn.disabled = false;
        }
    }

    // ------------------------------------------------------------------
    // Clipboard import — reads a single JSON entry or full day export
    // ------------------------------------------------------------------
    async function runClipboardImport() {
        LOG('Clipboard-Import gestartet');
        const clipBtn = document.getElementById('tn-clipboard-btn');
        if (clipBtn) clipBtn.disabled = true;

        try {
            const datum = getCurrentDate();
            if (!datum) { setStatus('Fehler: Datum nicht gefunden', 'error'); return; }

            let text;
            try { text = await navigator.clipboard.readText(); } catch { setStatus('Fehler: Kein Clipboard-Zugriff', 'error'); return; }

            let parsed;
            try { parsed = JSON.parse(text); } catch { setStatus('Fehler: Kein gültiges JSON in Zwischenablage', 'error'); return; }

            if (!parsed || typeof parsed !== 'object') { setStatus('Fehler: Ungültiges JSON-Format', 'error'); return; }

            const entries = Array.isArray(parsed.Einträge) && parsed.Einträge.length
                ? parsed.Einträge
                : [parsed];

            const confirmed = await showPreviewDialog(entries, datum);
            if (!confirmed) return;

            _statusLocked = false;
            const statusEl = document.getElementById('tn-import-status');
            if (statusEl) { statusEl.textContent = ''; statusEl.style.color = '#555'; }

            const success = await importEntries(datum, entries);
            if (success && confirmed.freigeben) await runFreigeben();
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

        if (!document.getElementById('tn-copy-btn')) {
            const btn3 = document.createElement('input');
            btn3.type = 'button';
            btn3.id = 'tn-copy-btn';
            btn3.value = 'JSON kopieren';
            btn3.className = 'btn btn-secondary';
            btn3.style.marginLeft = '0.5rem';
            btn3.title = 'Aktuellen Eintrag als JSON kopieren';
            btn3.addEventListener('click', copyCurrentAsJSON);
            saveBtn.parentElement.appendChild(btn3);
            LOG('Kopieren-Button eingefügt.');
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
