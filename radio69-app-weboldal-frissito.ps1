# Rádió69 weboldal – alkalmazásbemutató beszúrása
# Futtatás: abban a mappában, ahol a weboldal index.html fájlja található.
# A script előbb biztonsági másolatot készít, majd csak a főoldal index.html fájlját módosítja.

$ErrorActionPreference = "Stop"
$indexPath = Join-Path (Get-Location) "index.html"

if (-not (Test-Path -LiteralPath $indexPath)) {
    throw "Nem találom az index.html fájlt. Nyisd meg azt a mappát, ahol a Rádió69 weboldal fájljai vannak, és onnan futtasd ezt a scriptet."
}

$html = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)

$oldNav = '<a class="active" href="#home">Főoldal</a><a href="#friss">Olvasnivalók</a><a href="#temak">Témák</a><a href="#radio69">Rádió69</a><a href="#podcast">Zsiványok Podcast</a>'
$newNav = '<a class="active" href="#home">Főoldal</a><a href="#friss">Olvasnivalók</a><a href="#temak">Témák</a><a href="#radio69">Rádió69</a><a href="#alkalmazas">Alkalmazás</a><a href="#podcast">Zsiványok Podcast</a>'
$podcastMarker = '<section class="page-width section podcast-section" id="podcast">'

if ($html.Contains('id="radio69-app-showcase-style"') -or $html.Contains('id="alkalmazas"')) {
    throw "Úgy tűnik, az alkalmazásbemutató már benne van az index.html fájlban. Nem módosítottam semmit."
}
if (-not $html.Contains($oldNav)) {
    throw "Nem találom a várt felső menüsorrészt. A fájl eltér a jelenleg ellenőrzött főoldal-verziótól, ezért a script biztonsági okból leállt."
}
if (-not $html.Contains($podcastMarker)) {
    throw "Nem találom a Zsiványok Podcast szekció helyét. A fájl eltér a jelenleg ellenőrzött főoldal-verziótól, ezért a script biztonsági okból leállt."
}

$appSection = @'
    <section class="page-width app-showcase-section" id="alkalmazas" aria-labelledby="radio69AppTitle">
      <div class="app-showcase-card">
        <div class="app-showcase-copy">
          <span class="app-showcase-eyebrow"><i aria-hidden="true"></i> KÉSZÜL A RÁDIÓ69 ALKALMAZÁS</span>
          <h2 id="radio69AppTitle">A Rádió69 már<br><span>mindig veled.</span></h2>
          <p>Hamarosan a telefonodon is veled lehet a Rádió69! Hallgasd kedvenc csatornáidat, böngészd a műsorokat, és érd el a kedvenceidet egyetlen alkalmazásból.</p>
          <div class="app-showcase-features">
            <span>♫ Rádió69 Hits</span><span>♫ Rádió69 Remix</span><span>♡ Kedvencek</span><span>🎙 Műsorok</span>
          </div>
          <div class="app-platform-grid" aria-label="Tervezett platformok">
            <div class="app-platform-card"><span class="app-platform-icon">◆</span><span><strong>Android</strong><small>Hamarosan érkezik</small></span><b>↗</b></div>
            <div class="app-platform-card ios"><span class="app-platform-icon">●</span><span><strong>iOS</strong><small>Hamarosan érkezik</small></span><b>↗</b></div>
          </div>
          <p class="app-platform-note">Androidon és iOS-en egyaránt elérhető lesz.</p>
        </div>
        <div class="app-showcase-visual" aria-hidden="true">
          <span class="app-orbit orbit-one"></span><span class="app-orbit orbit-two"></span>
          <div class="app-phone">
            <div class="app-notch"></div>
            <div class="app-phone-top"><span>9:41</span><span>● ● ●</span></div>
            <div class="app-screen">
              <div class="app-brand"><img src="assets/radio69-logo.png" alt=""><span><b>RÁDIÓ<span>69</span></b><small>TEKERD FEL A HANGULATOT</small></span></div>
              <div class="app-welcome"><small>ÜDVÖZLÜNK A RÁDIÓ69-BEN!</small><strong>A zene mindig<br>veled lehet.</strong></div>
              <div class="app-station hits"><span>69</span><div><small>RÁDIÓ69</small><b>HITS</b></div><i>♫</i></div>
              <div class="app-station remix"><span>69</span><div><small>RÁDIÓ69</small><b>REMIX</b></div><i>♫</i></div>
              <div class="app-bottom"><span>⌂<small>KEZDŐLAP</small></span><span>≡<small>MŰSOROK</small></span><span>♡<small>KEDVENCEK</small></span><span>☰<small>MENÜ</small></span></div>
            </div>
          </div>
          <span class="app-visual-label">ANDROID <i>×</i> iOS</span>
        </div>
      </div>
    </section>

'@

$appStyles = @'
<style id="radio69-app-showcase-style">
.app-showcase-section{padding-top:78px}
.app-showcase-card{position:relative;isolation:isolate;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);align-items:center;gap:clamp(24px,5vw,64px);min-height:470px;padding:clamp(28px,5vw,58px);border:1px solid rgba(167,139,250,.32);border-radius:28px;background:radial-gradient(ellipse at 84% 24%,rgba(6,182,212,.18),transparent 34%),radial-gradient(ellipse at 10% 100%,rgba(124,58,237,.2),transparent 42%),linear-gradient(135deg,#19132b,#101321 60%,#111827);box-shadow:0 24px 70px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.04)}
.app-showcase-card:before{content:"";position:absolute;z-index:-1;width:370px;height:370px;right:-170px;top:-210px;border:1px solid rgba(103,232,249,.18);border-radius:50%;box-shadow:0 0 0 28px rgba(103,232,249,.025),0 0 0 58px rgba(167,139,250,.025);pointer-events:none}
.app-showcase-copy{min-width:0;max-width:640px}
.app-showcase-eyebrow{display:inline-flex;align-items:center;gap:10px;margin-bottom:17px;color:#9feaf4;font-size:10px;font-weight:900;letter-spacing:.15em}
.app-showcase-eyebrow i{width:8px;height:8px;border-radius:50%;background:#62e9f1;box-shadow:0 0 14px rgba(98,233,241,.9)}
.app-showcase-copy h2{margin:0;color:#fff;font:800 clamp(36px,4.2vw,57px)/1.04 var(--font-head);letter-spacing:-.045em}
.app-showcase-copy h2 span{background:linear-gradient(95deg,#c8a5ff,#a78bfa 48%,#67e8f9);-webkit-background-clip:text;background-clip:text;color:transparent}
.app-showcase-copy>p:not(.app-platform-note){max-width:590px;margin:18px 0 20px;color:#c0bfd2;font-size:14px;line-height:1.85}
.app-showcase-features{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 23px}
.app-showcase-features span{display:inline-flex;align-items:center;min-height:31px;padding:6px 10px;border:1px solid rgba(196,181,253,.2);border-radius:999px;color:#e4ddf7;background:rgba(255,255,255,.045);font-size:10px;font-weight:700}
.app-platform-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:490px}
.app-platform-card{min-width:0;display:flex;align-items:center;gap:11px;padding:13px 14px;border:1px solid rgba(167,139,250,.32);border-radius:14px;background:rgba(10,12,25,.55)}
.app-platform-card.ios{border-color:rgba(103,232,249,.25)}
.app-platform-icon{display:grid;place-items:center;width:35px;height:35px;flex:0 0 35px;border-radius:11px;color:#d9c6ff;background:rgba(139,92,246,.17);font-size:17px}
.app-platform-card.ios .app-platform-icon{color:#9cecf4;background:rgba(6,182,212,.12)}
.app-platform-card>span:nth-child(2){display:flex;flex-direction:column;min-width:0;gap:2px}
.app-platform-card strong{color:#fff;font-size:12px;line-height:1.2}
.app-platform-card small{color:#a9a7bd;font-size:10px;line-height:1.4}
.app-platform-card>b{margin-left:auto;color:#9f8bc8;font-size:15px}
.app-platform-note{margin:13px 0 0;color:#a9a7bd;font-size:11px;line-height:1.6}
.app-showcase-visual{position:relative;min-height:390px;display:flex;align-items:center;justify-content:center;isolation:isolate}
.app-orbit{position:absolute;z-index:-1;border:1px solid rgba(167,139,250,.2);border-radius:50%;pointer-events:none}
.orbit-one{width:340px;height:340px;box-shadow:0 0 0 26px rgba(167,139,250,.025),0 0 0 52px rgba(6,182,212,.025)}
.orbit-two{width:275px;height:275px;border-color:rgba(103,232,249,.18)}
.app-phone{position:relative;width:224px;height:390px;padding:8px;border:2px solid #77718b;border-radius:34px;background:linear-gradient(145deg,#343044,#090a12 45%,#29243b);box-shadow:0 25px 55px rgba(0,0,0,.5),0 0 45px rgba(139,92,246,.16),inset 0 0 0 1px rgba(255,255,255,.14);transform:rotate(5deg)}
.app-notch{position:absolute;z-index:3;top:12px;left:50%;width:66px;height:17px;transform:translateX(-50%);border-radius:99px;background:#080910}
.app-phone-top{position:absolute;z-index:2;top:12px;left:19px;right:19px;display:flex;justify-content:space-between;color:#f8f7ff;font-size:7px;font-weight:800}
.app-screen{position:relative;height:100%;overflow:hidden;padding:29px 12px 10px;border-radius:25px;background:radial-gradient(ellipse at 80% 18%,rgba(6,182,212,.18),transparent 37%),linear-gradient(160deg,#17132a,#0b1020 80%)}
.app-brand{display:flex;align-items:center;gap:8px;margin:2px 0 18px}
.app-brand img{width:31px;height:31px;object-fit:contain}
.app-brand b{display:block;color:#fff;font:800 13px/1 var(--font-head);letter-spacing:-.04em}
.app-brand b span{color:#bca0ff}
.app-brand small{display:block;margin-top:4px;color:#9c98b4;font-size:5px;font-weight:800;letter-spacing:.08em}
.app-welcome{display:flex;flex-direction:column;gap:6px;margin-bottom:15px}
.app-welcome small{color:#7ee8f0;font-size:6px;font-weight:900;letter-spacing:.1em}
.app-welcome strong{color:#fff;font:750 21px/1.07 var(--font-head);letter-spacing:-.04em}
.app-station{min-height:75px;display:flex;align-items:center;gap:9px;margin-bottom:9px;padding:10px;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:13px;background:radial-gradient(circle at 90% 10%,rgba(255,255,255,.13),transparent 38%),linear-gradient(120deg,#51268a,#1a1831)}
.app-station.remix{background:radial-gradient(circle at 90% 10%,rgba(255,255,255,.13),transparent 38%),linear-gradient(120deg,#0d6578,#182039)}
.app-station>span{color:rgba(255,255,255,.26);font:900 27px/.9 var(--font-head);letter-spacing:-.1em}
.app-station div{display:flex;flex-direction:column;gap:2px}
.app-station small{color:#e2d9f5;font-size:5px;font-weight:800;letter-spacing:.12em}
.app-station b{color:#fff;font:800 14px/1 var(--font-head);letter-spacing:.08em}
.app-station i{display:grid;place-items:center;width:26px;height:26px;margin-left:auto;border-radius:50%;color:#fff;background:rgba(255,255,255,.17);font-size:14px;font-style:normal}
.app-bottom{position:absolute;bottom:9px;left:10px;right:10px;display:flex;justify-content:space-between;gap:2px;padding-top:9px;border-top:1px solid rgba(255,255,255,.11)}
.app-bottom span{display:flex;flex-direction:column;align-items:center;gap:3px;color:#c8a5ff;font-size:14px}
.app-bottom small{color:#aaa6c2;font-size:5px;font-weight:800;white-space:nowrap}
.app-visual-label{position:absolute;right:2%;bottom:14px;padding:9px 13px;border:1px solid rgba(103,232,249,.3);border-radius:999px;color:#d9faff;background:rgba(11,20,33,.82);font-size:9px;font-weight:900;letter-spacing:.14em}
.app-visual-label i{margin:0 5px;color:#9b82e6;font-style:normal}
@media(max-width:760px){.app-showcase-section{padding-top:58px}.app-showcase-card{grid-template-columns:1fr;gap:22px;padding:26px 22px 20px;border-radius:23px}.app-showcase-visual{min-height:365px}.app-phone{transform:rotate(3deg) scale(.94)}.orbit-one{width:300px;height:300px}}
@media(max-width:440px){.app-showcase-card{padding:23px 17px 17px}.app-showcase-copy h2{font-size:36px}.app-platform-grid{grid-template-columns:1fr}.app-showcase-visual{min-height:350px}.app-phone{transform:rotate(2deg) scale(.88)}}
</style>
'@

$html = $html.Replace($oldNav, $newNav)
$html = $html.Replace($podcastMarker, ($appSection + $podcastMarker))
$headEnd = '</head>'
if (-not $html.Contains($headEnd)) { throw "A dokumentum fejléce nem található. Nem mentettem változtatást." }
$html = $html.Replace($headEnd, ($appStyles + "`r`n" + $headEnd))

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path (Get-Location) "index-before-radio69-app-$stamp.html"
Copy-Item -LiteralPath $indexPath -Destination $backupPath
[System.IO.File]::WriteAllText($indexPath, $html, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "KÉSZ! A Rádió69 alkalmazásbemutató bekerült a főoldalba." -ForegroundColor Green
Write-Host "Módosított fájl: $indexPath"
Write-Host "Biztonsági másolat: $backupPath"
Write-Host "A felső menüben megjelent az Alkalmazás ugrópont is."
Write-Host "Android és iOS egyaránt szerepel; mindkettő Hamarosan jelzést kapott."
Write-Host ""
