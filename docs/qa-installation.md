---
tags: [qa, installation, quick-start, cuda, systemd]
---

# QA: Installation

Practical, step-by-step examples for installing and configuring Betty.

See also: [[USER-MANUAL]] • [[troubleshooting]]

## Example 1: Fresh Installation on Ubuntu

```bash
# 1. Clone the repository
git clone <repo-url>
cd betty

# 2. Run the interactive installer
chmod +x install.sh
./install.sh
# Choose option 4 (All: APT → CUDA → Service)

# 3. Start the server
npm start

# 4. Open browser
# Navigate to http://localhost:3456
```

## Example 2: Custom Port and CORS

```bash
# Set environment variables
export API_PORT=8080
export API_HOST=0.0.0.0
export CORS_ORIGIN="http://example.com,http://localhost:3000"

# Start
npm start
# Server now listens on http://0.0.0.0:8080
```

## Example 3: Manual APT Dependencies

```bash
# Install build tools
sudo apt update
sudo apt install -y build-essential cmake git curl wget

# Install CUDA (if not using installer)
# Download from https://developer.nvidia.com/cuda-toolkit-archive
# Or use the installer's CUDA option
```

## Example 4: Systemd Service Installation

```bash
# Via the installer
./install.sh
# Choose option 3 (Install systemd service)

# Or manually from the Config page:
# 1. Run a benchmark
# 2. Save a report
# 3. Open report → Click a test run row
# 4. Click "Install" under Systemd Service
```

## Example 5: Remote Access Setup

```bash
# Start server bound to all interfaces
API_HOST=0.0.0.0 API_PORT=3456 npm start

# Access from another machine
# Open http://<server-ip>:3456

# Optional: Set up a reverse proxy with Nginx
sudo apt install nginx
sudo tee /etc/nginx/sites-available/betty << 'EOF'
server {
    listen 80;
    server_name betty.example.com;

    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/betty /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

## Verification Checklist

After installation, verify:

- [ ] Server starts without errors (`npm start`)
- [ ] Web UI loads at `http://localhost:3456`
- [ ] Health check returns OK: `curl http://localhost:3456/api/health`
- [ ] Configs endpoint works: `curl http://localhost:3456/api/configs`
- [ ] CUDA is available: `nvcc --version`
- [ ] CMake is available: `cmake --version`
