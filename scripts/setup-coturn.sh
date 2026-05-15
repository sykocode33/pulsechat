#!/bin/bash
# Install and configure Coturn TURN server for PulseChat WebRTC
# Run this on your AWS Ubuntu server

set -e

echo "📡 Installing Coturn TURN server..."
sudo apt update
sudo apt install -y coturn

# Enable coturn to start on boot
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Create coturn config
sudo tee /etc/turnserver.conf > /dev/null <<'EOF'
# Listening ports
listening-port=3478
tls-listening-port=5349

# Your AWS public IP (will be auto-detected)
external-ip=$(curl -s ifconfig.me)

# Relay ports range
min-port=49152
max-port=65535

# Credentials (must match useWebRTC.ts)
user=pulsechat:pulsechat_turn_secret
realm=chat.ankitktool.site

# Logging
log-file=/var/log/turnserver.log
verbose

# Security
fingerprint
lt-cred-mech
no-multicast-peers
EOF

# Get public IP and update the config
PUBLIC_IP=$(curl -s ifconfig.me)
sudo sed -i "s|external-ip=\$(curl -s ifconfig.me)|external-ip=$PUBLIC_IP|" /etc/turnserver.conf

echo "✅ Coturn configured with IP: $PUBLIC_IP"

# Start coturn
sudo systemctl enable coturn
sudo systemctl restart coturn
sudo systemctl status coturn --no-pager

echo ""
echo "📋 Open these ports in AWS Security Group (inbound):"
echo "   3478  UDP  — TURN/STUN"
echo "   3478  TCP  — TURN/STUN"
echo "   5349  TCP  — TURN/STUN over TLS"
echo "   49152-65535 UDP — WebRTC media relay"
echo ""
echo "🧪 Test TURN server:"
echo "   https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/"
echo "   Add: turn:chat.ankitktool.site:3478"
echo "   Username: pulsechat"
echo "   Credential: pulsechat_turn_secret"
