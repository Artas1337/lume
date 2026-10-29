# Cria o icone (icone.ico) e o atalho "PC-TV" na area de trabalho.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$icoPath = Join-Path $dir 'icone.ico'

if (-not (Test-Path $icoPath)) {
  Add-Type -AssemblyName System.Drawing

  function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc($x, $y, $r * 2, $r * 2, 180, 90)
    $p.AddArc($x + $w - $r * 2, $y, $r * 2, $r * 2, 270, 90)
    $p.AddArc($x + $w - $r * 2, $y + $h - $r * 2, $r * 2, $r * 2, 0, 90)
    $p.AddArc($x, $y + $h - $r * 2, $r * 2, $r * 2, 90, 90)
    $p.CloseFigure()
    return $p
  }

  $bmp = New-Object System.Drawing.Bitmap 256, 256
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'

  # Fundo
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 256, 256), ([System.Drawing.Color]::FromArgb(34, 42, 77)), ([System.Drawing.Color]::FromArgb(11, 12, 16))
  $g.FillPath($bg, (RoundRect 8 8 240 240 52))

  # Tela da TV
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 14
  $g.DrawPath($pen, (RoundRect 40 56 176 116 18))
  $g.DrawLine($pen, 96, 200, 160, 200)

  # Play
  $blue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(79, 124, 255))
  $tri = [System.Drawing.Point[]]@((New-Object System.Drawing.Point 112, 90), (New-Object System.Drawing.Point 112, 138), (New-Object System.Drawing.Point 152, 114))
  $g.FillPolygon($blue, $tri)
  $g.Dispose()

  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $png = $ms.ToArray()

  # ICO com uma imagem PNG 256x256 dentro
  $out = New-Object System.IO.MemoryStream
  $w = New-Object System.IO.BinaryWriter $out
  $w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]1)
  $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$png.Length); $w.Write([UInt32]22)
  $w.Write($png)
  [System.IO.File]::WriteAllBytes($icoPath, $out.ToArray())
}

$lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'PC-TV.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = 'wscript.exe'
$s.Arguments = "`"$dir\iniciar-oculto.vbs`""
$s.WorkingDirectory = $dir
$s.IconLocation = "$icoPath,0"
$s.Description = 'Abrir PC-TV'
$s.Save()
Write-Host "Atalho criado: $lnk"
