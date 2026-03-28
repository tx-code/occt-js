@echo off
setlocal
REM ---------------------------------------------------------------------------
REM  Install and activate Emscripten SDK on Windows
REM  The SDK is stored under build\wasm\emsdk so clean worktrees remain
REM  self-contained and do not depend on a shared root-level emsdk directory.
REM ---------------------------------------------------------------------------

pushd %~dp0\..

if not exist build mkdir build
if not exist build\wasm mkdir build\wasm

if not exist build\wasm\emsdk (
    echo === Cloning Emscripten SDK into build\wasm\emsdk ===
    git clone https://github.com/emscripten-core/emsdk.git build\wasm\emsdk || goto :error
)

pushd build\wasm\emsdk

echo === Installing Emscripten 3.1.69 ===
call emsdk install 3.1.69 || goto :error

echo === Activating Emscripten 3.1.69 ===
call emsdk activate 3.1.69 || goto :error

echo === Installing MinGW 7.1.0 64-bit ===
call emsdk install mingw-7.1.0-64bit || goto :error

echo === Activating MinGW 7.1.0 64-bit ===
call emsdk activate mingw-7.1.0-64bit || goto :error

popd
echo.
echo === Done ===
echo To use emcmake/emmake in this shell, run:
echo   call build\wasm\emsdk\emsdk_env.bat
echo.
popd
exit /b 0

:error
echo Setup failed with error %errorlevel%.
popd
popd
exit /b 1
