@echo off
chcp 65001 >nul
title Lume - instalador
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
