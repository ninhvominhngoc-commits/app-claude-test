#!/usr/bin/env bash
# Ghép các phần trong parts/ thành một trang artifact duy nhất.
set -euo pipefail
cd "$(dirname "$0")"
{ cat parts/1a-style.html parts/1b-style.html parts/1c-game.html parts/1e-room.html parts/1d-adventure.html parts/2-markup.html; echo "<script>"; cat parts/3-core.js parts/4-study.js parts/5-views.js parts/7-game.js parts/8-cozy.js parts/9-adv-art.js parts/9-room-art.js parts/9-adv-data.js parts/10-adv.js parts/11-room.js parts/12-study2.js parts/6-init.js; echo "</script>"; } > sorbonne-copilot.html
echo "Đã tạo sorbonne-copilot.html"
