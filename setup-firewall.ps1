# Windows Firewall Setup Script
# Run this as Administrator in PowerShell

# Add firewall rule for your file transfer app
netsh advfirewall firewall add rule name="File Transfer App Port 4999" dir=in action=allow protocol=TCP localport=4999

# Alternative: Add rule for Node.js
netsh advfirewall firewall add rule name="Node.js File Transfer" dir=in action=allow program="C:\Program Files\nodejs\node.exe"

Write-Host "Firewall rules added successfully!"
Write-Host "Your local IP address for sharing: 192.168.100.120"
Write-Host "Share this URL with your friend: http://192.168.100.120:4999"
