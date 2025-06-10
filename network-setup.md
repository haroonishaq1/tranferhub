# Cross-Network File Transfer Setup Guide

## The Issue
Your file transfer works locally but fails between different machines because:
1. Your friend's MacBook can't access your Windows laptop's server
2. Network firewalls and NAT may be blocking connections
3. Different network configurations

## Solutions

### Option 1: Make Your Server Accessible (Recommended)

#### Step 1: Find Your Local IP Address
On Windows:
```bash
ipconfig
```
Look for your IPv4 Address (usually something like 192.168.1.x or 10.0.0.x)

#### Step 2: Configure Windows Firewall
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change Settings" then "Allow another app..."
4. Browse to your Node.js installation or add the port 4999
5. Check both "Private" and "Public" boxes

#### Step 3: Start Server Accessible to Network
Instead of just running the backend, use:
```bash
cd backend
node server.js
```

The server should show: `Server running on port 4999`

#### Step 4: Share Your Network IP
Give your friend your network IP instead of localhost:
- Instead of: `http://localhost:4999`
- Use: `http://YOUR_LOCAL_IP:4999` (e.g., `http://192.168.1.100:4999`)

### Option 2: Use a Tunneling Service (Alternative)

Use ngrok to make your local server publicly accessible:

1. Download ngrok: https://ngrok.com/
2. Run: `ngrok http 4999`
3. Share the https URL provided by ngrok

### Option 3: Deploy to Cloud (Production Solution)

Deploy your app to Render, Vercel, or Netlify for public access.

## Testing Steps

1. Make sure your server is running and accessible
2. Have your friend try to access: `http://YOUR_IP:4999`
3. If they can see the page, the file transfer should work
4. If not, check firewall settings and network configuration

## Common Issues

- **Port blocked**: Try port 3000 or 8080 instead of 4999
- **Router blocking**: Check router firewall settings
- **Different networks**: Consider using a cloud deployment
- **ISP restrictions**: Some ISPs block certain ports

## Quick Test Commands

Check if port is accessible from another machine:
```bash
# From your friend's MacBook
curl http://YOUR_IP:4999
```

If this works, the file transfer should work too.
