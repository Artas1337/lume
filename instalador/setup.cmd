@echo off
chcp 65001 >nul
title PC-TV - instalador
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
