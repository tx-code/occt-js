@echo off
setlocal
pushd %~dp0\..

if "%~1"=="" (
    set BUILD_TYPE=Release
) else (
    set BUILD_TYPE=%~1
)

if "%BUILD_JOBS%"=="" (
    set BUILD_JOBS=4
)

if not exist build mkdir build
set LOG_FILE=%CD%\build\wasm-build.log
set DIST_JS=dist\occt-js.js
set DIST_WASM=dist\occt-js.wasm

> "%LOG_FILE%" echo === occt-js Windows Wasm build ===
>> "%LOG_FILE%" echo Build type: %BUILD_TYPE%
>> "%LOG_FILE%" echo Build jobs: %BUILD_JOBS%
>> "%LOG_FILE%" echo Working directory: %CD%

echo Checking prerequisites...
node tools\check_wasm_prereqs.mjs windows dist-types || goto :error_prereqs

echo Activating local Emscripten toolchain... 1>> "%LOG_FILE%"
call build\wasm\emsdk\emsdk_env.bat >> "%LOG_FILE%" 2>&1 || goto :error_env

echo Configuring with emcmake... (log: %LOG_FILE%)
>> "%LOG_FILE%" echo.
>> "%LOG_FILE%" echo === Configuring with emcmake ===
call emcmake cmake -S . -B build\wasm -G "MinGW Makefiles" -DCMAKE_MAKE_PROGRAM=mingw32-make -DCMAKE_BUILD_TYPE=%BUILD_TYPE% >> "%LOG_FILE%" 2>&1 || goto :error_configure

echo Building with emmake... (log: %LOG_FILE%)
>> "%LOG_FILE%" echo.
>> "%LOG_FILE%" echo === Building with emmake ===
call emmake mingw32-make -C build\wasm -j%BUILD_JOBS% >> "%LOG_FILE%" 2>&1 || goto :error_build

if not exist "%DIST_JS%" goto :error_artifacts
if not exist "%DIST_WASM%" goto :error_artifacts

node tools\generate_esm_runtime_entry.mjs >> "%LOG_FILE%" 2>&1 || goto :error_artifacts

echo Build Succeeded.
echo Build log: %LOG_FILE%
popd
exit /b 0

:error_prereqs
echo Prerequisite check failed. Resolve the console error above, then re-run the build.
echo Build log: %LOG_FILE%
popd
exit /b 1

:error_env
echo Failed to activate the local Emscripten toolchain.
echo Build log: %LOG_FILE%
popd
exit /b 1

:error_configure
echo Configure failed.
echo Build log: %LOG_FILE%
echo Retry with: set BUILD_JOBS=1 ^&^& tools\build_wasm_win.bat %BUILD_TYPE%
popd
exit /b 1

:error_build
echo Build failed.
echo Build log: %LOG_FILE%
echo Retry with: set BUILD_JOBS=1 ^&^& tools\build_wasm_win.bat %BUILD_TYPE%
popd
exit /b 1

:error_artifacts
echo Build finished without the canonical runtime artifacts.
echo Expected: %DIST_JS% and %DIST_WASM%
echo Build log: %LOG_FILE%
echo Retry with: set BUILD_JOBS=1 ^&^& tools\build_wasm_win.bat %BUILD_TYPE%
popd
exit /b 1
