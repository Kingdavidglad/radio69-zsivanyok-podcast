# Radio69 unified navigation updater.
# ASCII-only source: works with Windows PowerShell 5.1 even if the file is opened without UTF-8 BOM.
# Run this script from its saved location in the project root.

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-MainNavigation([string]$activeKey) {
    $items = @(
        @{ Key = 'home';   Href = 'index.html#home';              Label = 'F&#337;oldal' },
        @{ Key = 'djs';    Href = 'dj-k.html';                    Label = 'DJ-k' },
        @{ Key = 'shows';  Href = 'musoraink.html';               Label = 'M&#369;soraink' },
        @{ Key = 'events'; Href = 'rendezvenyek.html';            Label = 'Rendezv&eacute;nyek' },
        @{ Key = 'media';  Href = 'mediaajanlat.html';            Label = 'M&eacute;diaaj&aacute;nlat' },
        @{ Key = 'about';  Href = 'rolunk-kapcsolat.html#rolunk'; Label = 'R&oacute;lunk/Kapcsolat' }
    )

    $lines = @()
    foreach ($item in $items) {
        $attrs = ''
        if ($item.Key -eq $activeKey) {
            $attrs = ' class="active" aria-current="page"'
        } elseif ($item.Key -eq 'media') {
            $attrs = ' class="nav-media-link"'
        }
        $lines += ('      <a{0} href="{1}">{2}</a>' -f $attrs, $item.Href, $item.Label)
    }

    $nav = @(
        '<nav class="main-nav" id="mainNav" aria-label="F&#337; navig&#225;ci&#243;">'
        $lines
        '    </nav>'
    )
    return ($nav -join "`r`n")
}

function Read-ProjectFile([string]$fileName) {
    $path = Join-Path $projectRoot $fileName
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw ("Missing required file: {0}. Save the script in the project root folder." -f $fileName)
    }
    return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Save-ProjectFile([string]$fileName, [string]$content, [string]$originalContent) {
    $path = Join-Path $projectRoot $fileName
    $backup = "$path.bak"
    if (-not (Test-Path -LiteralPath $backup)) {
        [System.IO.File]::WriteAllText($backup, $originalContent, $utf8NoBom)
    }
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
    Write-Host ("Updated: {0}" -f $fileName) -ForegroundColor Green
}

function Update-MainPage([string]$fileName, [string]$activeKey, [string]$originalContent) {
    $content = $originalContent
    $navPattern = '<nav class="main-nav" id="mainNav" aria-label="[^"]*">[\s\S]*?</nav>'
    if (-not [regex]::IsMatch($content, $navPattern)) {
        throw ("Expected main navigation was not found in {0}. No file was changed." -f $fileName)
    }

    $newNav = Get-MainNavigation $activeKey
    $content = [regex]::Replace(
        $content,
        $navPattern,
        [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $newNav },
        1
    )

    # Remove the separate header CONTACT button. The combined About/Contact menu link remains.
    $contactButtonPattern = '\s*<a class="header-link" href="(?:rolunk-kapcsolat\.html#kapcsolat|#kapcsolat)">[\s\S]*?</a>'
    $content = [regex]::Replace($content, $contactButtonPattern, '', 1)

    Save-ProjectFile $fileName $content $originalContent
}

function Update-MediaOfferPage([string]$originalContent) {
    $fileName = 'mediaajanlat.html'
    $content = $originalContent
    $navPattern = '<nav class="nav-links" aria-label="[^"]*">[\s\S]*?</nav>'
    if (-not [regex]::IsMatch($content, $navPattern)) {
        throw 'The Media Offer page navigation was not found. No file was changed.'
    }

    $newNav = @'
      <nav class="nav-links" aria-label="F&#337; navig&#225;ci&#243;">
        <a href="index.html#home">F&#337;oldal</a>
        <a href="dj-k.html">DJ-k</a>
        <a href="musoraink.html">M&#369;soraink</a>
        <a href="rendezvenyek.html">Rendezv&eacute;nyek</a>
        <a href="mediaajanlat.html" aria-current="page">M&eacute;diaaj&aacute;nlat</a>
        <a href="rolunk-kapcsolat.html#rolunk">R&oacute;lunk/Kapcsolat</a>
        <a class="nav-cta" href="#ajanlatkeres">Bartermegkeres&eacute;s</a>
      </nav>
'@
    $content = [regex]::Replace(
        $content,
        $navPattern,
        [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $newNav.TrimEnd("`r", "`n") },
        1
    )
    Save-ProjectFile $fileName $content $originalContent
}

try {
    # The homepage was already updated. Check it before touching the other pages.
    $indexContent = Read-ProjectFile 'index.html'
    foreach ($href in @('dj-k.html', 'musoraink.html', 'rendezvenyek.html', 'mediaajanlat.html', 'rolunk-kapcsolat.html#rolunk')) {
        if (-not $indexContent.Contains(('href="{0}"' -f $href))) {
            throw ("The homepage does not contain the expected menu link: {0}. Update index.html first." -f $href)
        }
    }

    # Preflight all pages before writing any of them.
    $pages = @(
        @{ File = 'dj-k.html'; Active = 'djs' },
        @{ File = 'musoraink.html'; Active = 'shows' },
        @{ File = 'rendezvenyek.html'; Active = 'events' },
        @{ File = 'rolunk-kapcsolat.html'; Active = 'about' }
    )
    $originals = @{}
    foreach ($page in $pages) {
        $originals[$page.File] = Read-ProjectFile $page.File
        if (-not [regex]::IsMatch($originals[$page.File], '<nav class="main-nav" id="mainNav" aria-label="[^"]*">[\s\S]*?</nav>')) {
            throw ("Expected main navigation was not found in {0}. No files were changed." -f $page.File)
        }
    }
    $mediaOriginal = Read-ProjectFile 'mediaajanlat.html'
    if (-not [regex]::IsMatch($mediaOriginal, '<nav class="nav-links" aria-label="[^"]*">[\s\S]*?</nav>')) {
        throw 'The Media Offer page navigation was not found. No files were changed.'
    }

    foreach ($page in $pages) {
        Update-MainPage $page.File $page.Active $originals[$page.File]
    }
    Update-MediaOfferPage $mediaOriginal

    Write-Host ''
    Write-Host 'Navigation update completed.' -ForegroundColor Cyan
    Write-Host 'Backup files were created with the .bak extension.' -ForegroundColor Cyan
    Write-Host 'Review the five changed HTML files, then upload them to the GitHub main branch.' -ForegroundColor Yellow
}
catch {
    Write-Host ''
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
