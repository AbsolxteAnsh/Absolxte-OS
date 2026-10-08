$ErrorActionPreference = "Stop"

$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path -LiteralPath $cargoBin) {
    $env:Path = "$cargoBin;$env:Path"
}

npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

cargo test --manifest-path src-tauri\Cargo.toml
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

cargo check --manifest-path src-tauri\Cargo.toml --message-format short
exit $LASTEXITCODE
