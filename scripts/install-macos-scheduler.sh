#!/bin/bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.distribution-agent.discovery.plist"
PUBLISH_PLIST="$HOME/Library/LaunchAgents/com.distribution-agent.publishing.plist"
LOG_DIR="$PROJECT_DIR/.data/logs"
NODE_BIN="$(command -v node)"
NPX_BIN="$(command -v npx)"
mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.distribution-agent.discovery</string>
<key>WorkingDirectory</key><string>${PROJECT_DIR}</string>
<key>ProgramArguments</key><array><string>${NPX_BIN}</string><string>tsx</string><string>scripts/run-daily-discovery.ts</string></array>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>$(dirname "$NODE_BIN"):/usr/local/bin:/usr/bin:/bin</string></dict>
<key>RunAtLoad</key><true/>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
<key>StandardOutPath</key><string>${LOG_DIR}/discovery.log</string>
<key>StandardErrorPath</key><string>${LOG_DIR}/discovery-error.log</string>
</dict></plist>
EOF
plutil -lint "$PLIST"
cat > "$PUBLISH_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.distribution-agent.publishing</string>
<key>WorkingDirectory</key><string>${PROJECT_DIR}</string>
<key>ProgramArguments</key><array><string>${NPX_BIN}</string><string>tsx</string><string>scripts/run-scheduled-publishing.ts</string></array>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>$(dirname "$NODE_BIN"):/usr/local/bin:/usr/bin:/bin</string></dict>
<key>RunAtLoad</key><true/>
<key>StartInterval</key><integer>300</integer>
<key>StandardOutPath</key><string>${LOG_DIR}/publishing.log</string>
<key>StandardErrorPath</key><string>${LOG_DIR}/publishing-error.log</string>
</dict></plist>
EOF
plutil -lint "$PUBLISH_PLIST"
launchctl bootout "gui/$(id -u)/com.distribution-agent.discovery" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl bootout "gui/$(id -u)/com.distribution-agent.publishing" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PUBLISH_PLIST"
echo "Installed. Discovery runs once daily; scheduled publishing checks every five minutes while this Mac is running."
