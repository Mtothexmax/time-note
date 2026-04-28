param(
    [switch]$Keep,
    [string]$BasePath = ""
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Time-Note Export ===" -ForegroundColor Cyan
Write-Host ""

if ($BasePath -ne "") {
    Write-Host "Base path: $BasePath (for subdirectory deployment like GitHub Pages)" -ForegroundColor Yellow
}

# 1. Install adapter-static if needed
if (-not (Test-Path 'node_modules/@sveltejs/adapter-static')) {
    Write-Host "[1/4] Installing @sveltejs/adapter-static..." -ForegroundColor Yellow
    npm install -D @sveltejs/adapter-static
} else {
    Write-Host "[1/4] @sveltejs/adapter-static already installed" -ForegroundColor Green
}

# 2. Backup original config and create export config
Write-Host "[2/4] Creating export config..." -ForegroundColor Yellow
$origConfig = Get-Content 'svelte.config.js' -Raw

$baseLine = if ($BasePath -ne "") { "`t`tpaths: { base: '$BasePath' }," } else { "" }
$exportConfig = @"
import adapter from '@sveltejs/adapter-static';
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		$baseLine
		adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html', precompress: false, strict: true })
	}
};
export default config;
"@

Set-Content 'svelte.config.js' $exportConfig
Set-Content 'src/routes/+layout.ts' "export const prerender = true;`n"

try {
    # 3. Build
    Write-Host "[3/4] Building static export..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }

    # 4. Create export
    Write-Host "[4/4] Creating export files..." -ForegroundColor Yellow
    node bin/export-bundle.mjs
    if ($LASTEXITCODE -ne 0) { throw "Bundle failed" }

    Write-Host ""
    Write-Host "=== Done! ===" -ForegroundColor Cyan
    if (Test-Path 'time-note-export/index.html') {
        Write-Host "Portable folder: time-note-export/ (open index.html via file://)" -ForegroundColor Green
    }
    if (Test-Path 'time-note-export.html') {
        $size = [math]::Round((Get-Item 'time-note-export.html').Length / 1KB)
        Write-Host "Single file:     time-note-export.html ($size KB)" -ForegroundColor Green
    }
    if ($BasePath -ne "") {
        Write-Host ""
        Write-Host "For GitHub Pages deployment:" -ForegroundColor Cyan
        Write-Host "  Copy the 'build' folder contents to your gh-pages branch root" -ForegroundColor White
        Write-Host "  The site must be served under: $BasePath" -ForegroundColor White
    }
} finally {
    # Restore original config
    Set-Content 'svelte.config.js' $origConfig
    Remove-Item 'src/routes/+layout.ts' -Force -ErrorAction SilentlyContinue
    
    if (-not $Keep -and (Test-Path 'build')) {
        Remove-Item 'build' -Recurse -Force
        Write-Host "Cleaned up build folder" -ForegroundColor DarkGray
    }
}
