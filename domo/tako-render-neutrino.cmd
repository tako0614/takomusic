@echo off
setlocal
set ROOT=%~dp0..
node "%ROOT%\tools\tako-render-neutrino\index.js" %*
endlocal
