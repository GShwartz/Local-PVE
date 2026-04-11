# Windows Server Phase 2 — Post-reboot configuration
# Variables: ${PACKAGES}, ${RUN_COMMANDS}

# Remove phase 2 auto-run key
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" `
  -Name "CloudInitPhase2" -ErrorAction SilentlyContinue

# Install Chocolatey if not present
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install packages
# choco install ${PACKAGES} -y

# Run custom commands
${RUN_COMMANDS}

"Phase 2 complete: $(Get-Date)" | Out-File C:\deploy-phase2.log -Encoding utf8 -Append
