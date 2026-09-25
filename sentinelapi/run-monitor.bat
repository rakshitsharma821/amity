@echo off
title SentinelAPI - 24/7 Continuous Security Monitor
color 0A
echo =================================================================
echo   [SENTINEL-API] 24/7 Continuous API Authorization Monitor
echo =================================================================
echo.
echo Target Config: sentinelapi/scanner/config.example.json
echo History Output: sentinelapi/history.json
echo Findings Output: sentinelapi/findings.json
echo Interval: 60 seconds (re-scans, detects new/resolved flaws, logs downtime)
echo.
echo Press Ctrl+C at any time to stop monitoring.
echo =================================================================
echo.

python sentinelapi/scanner/scanner.py --config sentinelapi/scanner/config.example.json --monitor --interval 60 --history sentinelapi/history.json --out sentinelapi/findings.json

pause
