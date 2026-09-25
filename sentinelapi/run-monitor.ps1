# SentinelAPI 24/7 Continuous Monitoring Launcher
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  [SENTINEL-API] 24/7 Continuous API Authorization Monitor" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Target Config: sentinelapi/scanner/config.example.json"
Write-Host "History File:  sentinelapi/history.json"
Write-Host "Findings File: sentinelapi/findings.json"
Write-Host "Interval:      60 seconds"
Write-Host "Press Ctrl+C at any time to pause or exit."
Write-Host "================================================================="

python sentinelapi/scanner/scanner.py --config sentinelapi/scanner/config.example.json --monitor --interval 60 --history sentinelapi/history.json --out sentinelapi/findings.json
