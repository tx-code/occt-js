@echo off
setlocal
pushd %~dp0\..

if not exist build mkdir build
set LOG_FILE=%CD%\build\wasm-build.log
set DIST_JS=dist\occt-js.js
set DIST_WASM=dist\occt-js.wasm

echo Checking tracked type definitions...
node tools\check_wasm_prereqs.mjs dist-types || goto :error

call tools\build_wasm_win_release.bat || goto :error

if not exist dist mkdir dist

if not exist "%DIST_JS%" (
    echo Missing %DIST_JS% after build.
    goto :error
)
if not exist "%DIST_WASM%" (
    echo Missing %DIST_WASM% after build.
    goto :error
)

node tools\generate_esm_runtime_entry.mjs || goto :error

node tools\check_wasm_prereqs.mjs dist-types || goto :error

echo Build Succeeded.
echo Build log: %LOG_FILE%
popd
exit /b 0

:error
echo Build Failed with Error %errorlevel%.
echo Build log: %LOG_FILE%
popd
exit /b 1
