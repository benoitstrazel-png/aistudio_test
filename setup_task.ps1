$Action = New-ScheduledTaskAction -Execute "py.exe" -Argument "scripts/fetch_data.py" -WorkingDirectory "C:\Users\benoi\OneDrive\Documents\Github\aistudio_test"
$Action2 = New-ScheduledTaskAction -Execute "py.exe" -Argument "scripts/generate_app_data.py" -WorkingDirectory "C:\Users\benoi\OneDrive\Documents\Github\aistudio_test"

$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 2pm
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register Task
Register-ScheduledTask -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -TaskName "Ligue1_Data_Update" -Description "Updates Ligue 1 CSV and JSON data every Tuesday at 14:00" -Force

Write-Host "Task 'Ligue1_Data_Update' created successfully."
