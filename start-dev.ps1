# start-dev.ps1

# Function to create a new terminal and run commands
function Start-DevServer {
    param (
        [string]$Name,
        [string]$Directory,
        [string[]]$Commands
    )
    
    # Create a temporary script file to run commands
    $tempScriptPath = Join-Path $PSScriptRoot "$Name-commands.ps1"
    
    # Write commands to the temp script
    $scriptContent = @"
cd "$Directory"
Write-Host "Starting $Name server..." -ForegroundColor Green
$($Commands -join "`r`n")
"@
    
    Set-Content -Path $tempScriptPath -Value $scriptContent
    
    # Start a new PowerShell process in a new window
    Start-Process powershell.exe -ArgumentList "-NoExit", "-File", "`"$tempScriptPath`""
}

# Start backend server
$backendCommands = @(
    "cd backend",
    ".\venv\scripts\activate",
    "python manage.py runserver"
)
Start-DevServer -Name "Backend" -Directory "$PSScriptRoot\backend" -Commands $backendCommands

# Start frontend server
$frontendCommands = @(
    "cd frontend",
    "npm run dev"
)
Start-DevServer -Name "Frontend" -Directory "$PSScriptRoot\frontend" -Commands $frontendCommands

Write-Host "Development servers started!" -ForegroundColor Cyan