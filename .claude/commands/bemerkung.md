# ZEP-Bemerkung optimieren

Du hilfst dabei, einen Bemerkungstext für die Zeiterfassung (ZEP) zu formulieren oder zu verbessern.

Der Nutzer gibt dir entweder:
- einen rohen/schlechten Bemerkungstext zur Verbesserung, oder
- eine kurze Beschreibung der geleisteten Tätigkeit, aus der du einen passenden Text formulierst.

Zahlen wie „TFS 12345" oder „AM 12345" am Anfang ignorierst du – die werden separat eingefügt. Beziehe dich nur auf den Tätigkeitstext.

## Was der Bemerkungstext leisten muss

Die Bemerkung erscheint im Kundenzeitnachweis. Der Kunde sieht **nicht** den Aufgabentitel, nur diesen Text. Er muss deshalb die geleistete Tätigkeit und ihren Umfang für einen Außenstehenden verständlich und plausibel machen – ohne interne Details.

## Formale Regeln

- Kein Formatierungen, keine Spiegelstriche, keine Aufzählungen mit `&` oder `-`
- Keine internen Beteiligte nennen (keine Namen, keine Teams)
- Keine Ergebnisse oder Status nennen (ob etwas geklappt hat oder nicht gehört in die Aufgabe, nicht in die ZV)
- Kein internes Vorgehen beschreiben
- Ein Eintrag pro Aufgabe und Tag – keine Aufteilung in Vorbereitung / Durchführung / Dokumentation als separate Einträge
- Kurz, aber aussagekräftig – ein einzelnes Wort wie „Programmierung" reicht nicht

## Verbotene Begriffe (negative Keywords)

Folgende Wörter vermeiden, da sie beim Kunden Mängel oder Mehraufwand durch INTEND assoziieren:

- Fehler, Bugfix, Bug, Reparatur, Versuch, Suche, nicht erfolgreich, scheitern, Problem, blockiert
- Interne Kommunikation, Rücksprache, Abstimmung, Absprache, Gespräch (mit Personen)

## Was NICHT in die Bemerkung gehört

- Interne Kommunikation (Rückmeldung an PO, Daily, Absprache mit Kollegen) → dafür gibt es ADOS / Teams
- Ergebnisse oder Zwischenstände („funktioniert noch nicht", „wahrscheinlich gefunden")
- Interne Vorbereitungen die der Kunde nicht bezahlt (z.B. Reisevorbereitung → „Vorbereitung Consulting-Termin")
- Nebentätigkeiten, die zum Hauptauftrag gehören – Recherche, Vorbereitung etc. sind implizit enthalten

## Umfang

- Bei > 8 h Gesamtaufwand für eine Aufgabe muss der Text den Umfang durch konkrete Beschreibung plausibel machen – ein generischer Satz für mehrere Tage reicht dann nicht

## Transformationslogik (Beispiele aus den Guidelines)

| Schlecht | Besser | Grund |
|---|---|---|
| Absprache mit KL zu X, Y und Z | X und Y dokumentiert | Interne Beteiligung weglassen |
| Installation von X, bisher nicht erfolgreich | Installation von X | Ergebnis weglassen |
| Reparatur des Layers X: Test der Synchronisation | Konfiguration des Layers X: Test der Synchronisation | Negativkeyword ersetzen |
| Konzeption WS BaySF auf Basis von Katrins Entwurf | Konzeption Portal-Workshop BaySF | Namen und interne Basis weglassen |
| Fehler mit Kevin suchen | Analyse des Problems | Intern + Negativkeyword ersetzen |
| Nachtest, Kommunikation der Ergebnisse im Team | Nachtest der Funktionen und Dokumentation | Interne Kommunikation weglassen |
| Start Programmierung | Erweiterung [konkretes Feature] programmieren | Konkret werden |
| Testplan durchtesten und Fehler-PBI Erstellung | Testplan abarbeiten und Dokumentation der Ergebnisse | Positiv formulieren |

## Ausgabeformat

Gib **genau einen** optimierten Vorschlag aus – kein langer Erklärtext davor.
Falls du mehrere sinnvolle Varianten siehst (z.B. unterschiedliche Länge), gib maximal 2–3 Alternativen mit einer einzeiligen Begründung.
Wenn der Input bereits gut ist, sag das kurz und schlage höchstens eine kleine Verbesserung vor.

Antworte auf Deutsch.

---

$ARGUMENTS
