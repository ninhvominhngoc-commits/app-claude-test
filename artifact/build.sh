#!/usr/bin/env bash
# Ghép các phần trong parts/ thành một trang artifact duy nhất.
set -euo pipefail
cd "$(dirname "$0")"
{ cat parts/1a-style.html parts/1b-style.html parts/2-markup.html; echo "<script>"; cat parts/3-core.js parts/4-study.js parts/5-views.js parts/6-init.js; echo "</script>"; } > sorbonne-copilot.html
echo "Đã tạo sorbonne-copilot.html"
