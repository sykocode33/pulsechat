#!/bin/bash
# Run this once on your AWS Ubuntu server
# Generates self-signed SSL cert and sets up HTTPS for PulseChat

set -e

echo "🔐 Generating self-signed SSL certificate..."

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed cert (valid 1 year)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/pulsechat.key \
  -out /etc/nginx/ssl/pulsechat.crt \
  -subj "/C=US/ST=State/L=City/O=PulseChat/CN=$(curl -s ifconfig.me)"

sudo chmod 600 /etc/nginx/ssl/pulsechat.key

echo "✅ SSL cert generated!"
echo ""
echo "📋 AWS Security Group — make sure these ports are open:"
echo "   Port 80  (HTTP → redirects to HTTPS)"
echo "   Port 443 (HTTPS — required for voice calls)"
echo "   Port 3001 (Backend API)"
echo ""
echo "🚀 Now restart nginx:"
echo "   sudo systemctl restart nginx"
echo "   OR if using Docker: docker compose restart nginx"
echo ""
echo "🌐 Access your app at: https://$(curl -s ifconfig.me)"
echo "   ⚠️  Browser will show a security warning (self-signed cert)"
echo "   Click 'Advanced' → 'Proceed anyway' — this is safe for your own server"
