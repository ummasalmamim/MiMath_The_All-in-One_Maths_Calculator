#!/bin/sh
# Builds index.html from the files in src/. Run: sh build.sh
set -e
cd "$(dirname "$0")"
{
  echo '<!doctype html>'
  echo '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  cat src/head.html
  echo '</head><body>'
  cat src/body.html
  echo '<script src="https://cdn.jsdelivr.net/npm/mathjs@12.4.2/lib/browser/math.js"></script>'
  echo '<script src="https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/all.min.js"></script>'
  echo '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"></script>'
  for f in engine-core engine-solve engine-calculus ui-base ui-plot ui-calc ui-solve ui-graph ui-charts ui-complex ui-bases ui-convert ui-tools ui-main; do
    echo '<script>'; cat src/$f.js; echo '</script>'
  done
  echo '</body></html>'
} > index.html
echo "Built index.html ($(wc -c < index.html) bytes)"
