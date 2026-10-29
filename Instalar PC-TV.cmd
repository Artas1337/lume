@echo off
chcp 65001 >nul
title PC-TV - instalador
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalador\instalar.ps1"
