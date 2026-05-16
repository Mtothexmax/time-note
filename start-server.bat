@echo off
powershell -Command "Start-Process powershell -ArgumentList '-Command npm run dev' -WindowStyle Hidden"
