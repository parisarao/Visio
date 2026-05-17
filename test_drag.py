from playwright.sync_api import sync_playwright
import time

def run(playwright):
    # Running visible so you can see it!
    browser = playwright.chromium.launch(headless=False, slow_mo=50)
    page = browser.new_page()
    
    # Listen to console
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    
    # Load app
    print("Loading the app...")
    page.goto("http://localhost:8001/index.html")
    time.sleep(2) # wait for load
    
    print("Adding a node to the canvas from the left toolbox...")
    # Find the shape palette and click the first item to add a node
    page.locator('.shape-item').first.click()
    
    print("Waiting 2 seconds...")
    time.sleep(2) 
    
    print("Clicking and dragging the new shape...")
    # Find the node shape
    node = page.locator('.node-shape').first
    box = node.bounding_box()
    if box:
        # Move mouse to the center of the node
        page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        page.mouse.down()
        print("Mouse pressed!")
        time.sleep(0.5)
        
        # Move it slowly by 150px
        page.mouse.move(box['x'] + box['width'] / 2 + 150, box['y'] + box['height'] / 2 + 150, steps=30)
        time.sleep(0.5)
        
        page.mouse.up()
        print("Mouse released! Drag sequence finished.")
    else:
        print("Could not find the node bounding box!")
    
    # Check if the node actually moved
    new_box = node.bounding_box()
    if new_box:
        print(f"Original position: {box['x']}, {box['y']} | New position: {new_box['x']}, {new_box['y']}")
    
    print("Waiting 5 seconds so you can see the result...")
    time.sleep(5)
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
