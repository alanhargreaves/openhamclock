#!/bin/bash
#
# OpenHamClock Raspberry Pi Setup Script
# Configures Pi for kiosk mode operation
#
# Usage: chmod +x setup-pi.sh && ./setup-pi.sh
#

set -e

echo "========================================"
echo "  OpenHamClock Raspberry Pi Setup"
echo "========================================"
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ]; then
    echo "Warning: This doesn't appear to be a Raspberry Pi."
    echo "Continuing anyway..."
fi

# Get the current user
CURRENT_USER=$(whoami)
HOME_DIR=$(eval echo ~$CURRENT_USER)
OPENHAMCLOCK_DIR="$HOME_DIR/openhamclock"

echo "Installing for user: $CURRENT_USER"
echo "Install directory: $OPENHAMCLOCK_DIR"
echo ""

# Update system
echo ">>> Updating system packages..."
sudo apt-get update -qq

# Install required packages
echo ">>> Installing required packages..."
sudo apt-get install -y -qq \
    chromium \
    unclutter \
    xdotool \
    x11-xserver-utils

# Create OpenHamClock directory if it doesn't exist
echo ">>> Setting up OpenHamClock directory..."
mkdir -p "$OPENHAMCLOCK_DIR"

# Copy index.html if it exists in the current directory
if [ -f "index.html" ]; then
    cp index.html "$OPENHAMCLOCK_DIR/"
    echo ">>> Copied index.html to $OPENHAMCLOCK_DIR"
fi

# Create the autostart directory
echo ">>> Configuring autostart..."
mkdir -p "$HOME_DIR/.config/autostart"

# Create autostart entry for OpenHamClock
cat > "$HOME_DIR/.config/autostart/openhamclock.desktop" << EOF
[Desktop Entry]
Type=Application
Name=OpenHamClock
Comment=Amateur Radio Dashboard
Exec=/bin/bash $OPENHAMCLOCK_DIR/start-kiosk.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF

# Create kiosk start script
echo ">>> Creating kiosk start script..."
cat > "$OPENHAMCLOCK_DIR/start-kiosk.sh" << 'EOF'
#!/bin/bash
#
# OpenHamClock Kiosk Mode Launcher
#

# Wait for desktop to be ready
sleep 5

# Disable screen blanking and power management
xset s off
xset -dpms
xset s noblank

# Hide the mouse cursor after 3 seconds of inactivity
unclutter -idle 3 -root &

# Kill any existing Chromium processes
pkill -f chromium || true
sleep 2

# Start Chromium in kiosk mode
chromium \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --disable-features=TranslateUI \
    --check-for-update-interval=31536000 \
    --disable-component-update \
    --overscroll-history-navigation=0 \
    --incognito \
    "file://$HOME/openhamclock/index.html"
EOF

chmod +x "$OPENHAMCLOCK_DIR/start-kiosk.sh"

# Create a stop script
cat > "$OPENHAMCLOCK_DIR/stop-kiosk.sh" << 'EOF'
#!/bin/bash
# Stop OpenHamClock kiosk mode
pkill -f chromium-browser
pkill -f unclutter
echo "OpenHamClock stopped."
EOF

chmod +x "$OPENHAMCLOCK_DIR/stop-kiosk.sh"

# Create a restart script
cat > "$OPENHAMCLOCK_DIR/restart-kiosk.sh" << 'EOF'
#!/bin/bash
# Restart OpenHamClock
$HOME/openhamclock/stop-kiosk.sh
sleep 2
$HOME/openhamclock/start-kiosk.sh &
EOF

chmod +x "$OPENHAMCLOCK_DIR/restart-kiosk.sh"

# Create systemd service for headless operation (optional)
echo ">>> Creating systemd service (for headless operation)..."
sudo tee /etc/systemd/system/openhamclock.service > /dev/null << EOF
[Unit]
Description=OpenHamClock Kiosk
After=graphical-session.target

[Service]
Type=simple
User=$CURRENT_USER
Environment=DISPLAY=:0
ExecStart=/bin/bash $OPENHAMCLOCK_DIR/start-kiosk.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical-session.target
EOF

# Disable screen blanking in config.txt
echo ">>> Configuring boot options..."
if ! grep -q "consoleblank=0" /boot/cmdline.txt 2>/dev/null; then
    sudo sed -i '$ s/$/ consoleblank=0/' /boot/cmdline.txt 2>/dev/null || true
fi

# Configure GPU memory for better graphics (optional)
if ! grep -q "gpu_mem=" /boot/config.txt 2>/dev/null; then
    echo "gpu_mem=128" | sudo tee -a /boot/config.txt > /dev/null 2>/dev/null || true
fi

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "OpenHamClock has been installed to: $OPENHAMCLOCK_DIR"
echo ""
echo "Files created:"
echo "  - $OPENHAMCLOCK_DIR/index.html      (main application)"
echo "  - $OPENHAMCLOCK_DIR/start-kiosk.sh  (start in kiosk mode)"
echo "  - $OPENHAMCLOCK_DIR/stop-kiosk.sh   (stop kiosk)"
echo "  - $OPENHAMCLOCK_DIR/restart-kiosk.sh (restart kiosk)"
echo ""
echo "Auto-start:"
echo "  OpenHamClock will automatically start on next boot."
echo ""
echo "Manual commands:"
echo "  Start:   ~/openhamclock/start-kiosk.sh"
echo "  Stop:    ~/openhamclock/stop-kiosk.sh"
echo "  Restart: ~/openhamclock/restart-kiosk.sh"
echo ""
echo "To disable auto-start:"
echo "  rm ~/.config/autostart/openhamclock.desktop"
echo ""
echo "Reboot recommended to apply all changes."
echo ""
echo "73 de OpenHamClock!"
echo ""

read -p "Would you like to reboot now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo reboot
fi
