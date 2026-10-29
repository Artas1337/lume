# Desenha o simbolo do Lume (ponto de luz com halo) e salva como .ico 256x256.
param([Parameter(Mandatory)][string]$Saida)

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

# Fundo azul para violeta, igual ao simbolo do app
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 256, 256), ([System.Drawing.Color]::FromArgb(79, 124, 255)), ([System.Drawing.Color]::FromArgb(139, 92, 255))
$g.FillPath($bg, (RoundRect 8 8 240 240 56))

# Brilho em volta do ponto de luz
$halo = New-Object System.Drawing.Drawing2D.GraphicsPath
$halo.AddEllipse(58, 58, 140, 140)
$brilho = New-Object System.Drawing.Drawing2D.PathGradientBrush $halo
$brilho.CenterColor = [System.Drawing.Color]::FromArgb(150, 255, 255, 255)
$brilho.SurroundColors = [System.Drawing.Color[]]@([System.Drawing.Color]::FromArgb(0, 255, 255, 255))
$g.FillPath($brilho, $halo)

# Ponto de luz e os dois arcos do halo
$g.FillEllipse([System.Drawing.Brushes]::White, 85, 85, 86, 86)
$arco = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 19
$arco.StartCap = 'Round'; $arco.EndCap = 'Round'
$g.DrawArc($arco, 48, 48, 160, 160, -90, 90)
$arco.Color = [System.Drawing.Color]::FromArgb(140, 255, 255, 255)
$g.DrawArc($arco, 48, 48, 160, 160, 90, 90)
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
[System.IO.File]::WriteAllBytes($Saida, $out.ToArray())
