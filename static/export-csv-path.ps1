# PowerShell-Script: Outlook-Kalender CSV-Pfad in die Zwischenablage kopieren
# Nach Ausführung kann der Pfad mit Strg+V eingefügt werden
param(
    [string]$Pfad = "$env:TEMP\outlook-export.csv"
)

# Beispiel: Pfad zur exportierten CSV in Zwischenablage
$Pfad | Set-Clipboard
Write-Host "Pfad kopiert: $Pfad"
