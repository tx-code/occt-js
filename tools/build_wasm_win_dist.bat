@echo off
setlocal
pushd %~dp0\..

if not exist build mkdir build
set LOG_FILE=%CD%\build\wasm-build.log

echo Checking tracked type definitions...
node tools\check_wasm_prereqs.mjs dist-types || goto :error

call tools\build_wasm_win_release.bat || goto :error

if not exist dist mkdir dist

if exist build\wasm\occt-js.js (
    copy /Y build\wasm\occt-js.js dist\occt-js.js >nul || goto :error
)
if exist build\wasm\occt-js.wasm (
    copy /Y build\wasm\occt-js.wasm dist\occt-js.wasm >nul || goto :error
)

if not exist dist\occt-js.js (
    echo Missing dist\occt-js.js after build.
    goto :error
)
if not exist dist\occt-js.wasm (
    echo Missing dist\occt-js.wasm after build.
    goto :error
)

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
