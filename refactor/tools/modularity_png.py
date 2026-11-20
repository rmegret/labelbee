"""SVG -> PNG with Playwright (no other renderer is installed). Usage: python3 refactor/tools/modularity_png.py in.svg out.png"""
import sys
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(device_scale_factor=2)
    pg.set_content('<body style="margin:0">' + open(sys.argv[1]).read() + '</body>')
    pg.locator('svg').screenshot(path=sys.argv[2])
