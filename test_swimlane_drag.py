from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto("http://localhost:8001/index.html")
    time.sleep(2)
    
    print("Adding swimlane...")
    page.locator('#btn-add-lane').click()
    time.sleep(1)
    
    print("Adding node...")
    page.locator('.shape-item').first.click()
    time.sleep(1)
    
    print("Executing JS to check what is under the node...")
    # Find the node bounding box
    node = page.locator('.node-shape').first
    box = node.bounding_box()
    if box:
        x = box['x'] + box['width'] / 2
        y = box['y'] + box['height'] / 2
        
        # Ask the browser what element is at (x, y)
        element_info = page.evaluate(f"""
            () => {{
                const el = document.elementFromPoint({x}, {y});
                if (!el) return 'No element found';
                return {{
                    tag: el.tagName,
                    classes: el.className.baseVal || el.className,
                    id: el.id
                }};
            }}
        """)
        print(f"Element at node center ({x}, {y}): {element_info}")
    
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
