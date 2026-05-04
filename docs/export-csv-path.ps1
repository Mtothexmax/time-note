# Outlook-Kalender als CSV exportieren und Pfad in Zwischenablage kopieren
param(
    [string]$AusgabePfad  = "$env:USERPROFILE\Downloads\outlook-export.csv",
    [int]$TageVorher  = 14,
    [int]$TageNachher = 30
)

try {
    $outlook   = New-Object -ComObject Outlook.Application
    $namespace = $outlook.GetNamespace("MAPI")
    $kalender  = $namespace.GetDefaultFolder(9)   # 9 = olFolderCalendar

    $von = (Get-Date).AddDays(-$TageVorher)
    $bis = (Get-Date).AddDays($TageNachher)

    Write-Host "MAPI OK — Kalender: '$($kalender.Name)', Items: $($kalender.Items.Count)"
    Write-Host "Zeitraum: $($von.ToString('dd.MM.yyyy')) bis $($bis.ToString('dd.MM.yyyy'))"

    $zeilen = [System.Collections.Generic.List[string]]::new()
    $zeilen.Add('"Subject","Start Date","Start Time","End Date","End Time","Show time as"')

    $anzahl = 0

    foreach ($masterItem in $kalender.Items) {
        try {
            if (-not $masterItem.IsRecurring) {
                # Einmalige Termine: direkt pruefen
                if ($masterItem.Start -ge $von -and $masterItem.Start -le $bis) {
                    $appts = @($masterItem)
                } else { continue }
            } else {
                # Wiederkehrende Serie: jeden Tag im Zeitraum pruefen
                $pattern   = $masterItem.GetRecurrencePattern()
                $startTime = $masterItem.Start.TimeOfDay
                $appts     = [System.Collections.Generic.List[object]]::new()
                $tag       = $von.Date
                while ($tag -le $bis.Date) {
                    try {
                        $occ = $pattern.GetOccurrence($tag.Add($startTime))
                        $appts.Add($occ)
                    } catch {}
                    $tag = $tag.AddDays(1)
                }
            }

            foreach ($item in $appts) {
                $subject   = $item.Subject -replace '"', '""'
                $startDate = $item.Start.ToString('dd-MM-yyyy')
                $startTime2 = $item.Start.ToString('HH:mm')
                $endDate   = $item.End.ToString('dd-MM-yyyy')
                $endTime   = $item.End.ToString('HH:mm')
                $showAs    = if ($item.BusyStatus -eq 3) { 4 } else { $item.BusyStatus }
                $zeilen.Add("`"$subject`",`"$startDate`",`"$startTime2`",`"$endDate`",`"$endTime`",`"$showAs`"")
                $anzahl++
            }
        } catch {
            Write-Warning "Uebersprungen '$($masterItem.Subject)': $($_.Exception.Message)"
        }
    }

    Write-Host "Gefundene Termine: $anzahl"
    $zeilen | Out-File -FilePath $AusgabePfad -Encoding UTF8 -Force
    $AusgabePfad | Set-Clipboard
    Write-Host "Exportiert nach: $AusgabePfad"
    Write-Host "Pfad kopiert — jetzt in Time-Note einfuegen."
} catch {
    Write-Error "Fehler: $($_.Exception.Message)"
}
