$ErrorActionPreference = "Stop"

$root = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent)).TrimEnd('\')
$targets = @(
    (Join-Path $root "src-tauri\target"),
    (Join-Path $root "node_modules\.vite")
)

foreach ($candidate in $targets) {
    $target = [IO.Path]::GetFullPath($candidate)
    if (-not $target.StartsWith("$root\", [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a build-cache path outside the workspace: $target"
    }
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
}
