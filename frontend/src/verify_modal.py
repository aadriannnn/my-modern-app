from playwright.sync_api import sync_playwright, expect
import time

def verify_advanced_analysis_modal(page):
    print("Navigating to home page...")
    page.goto("http://localhost:4173")

    # Wait for the page to load
    page.wait_for_load_state("networkidle")

    print("Looking for Analysis button...")
    # Based on MainContent.tsx, the button text is "Analiză Juridică AI (Experimental)"
    button = page.get_by_text("Analiză Juridică AI (Experimental)")
    button.click()

    print("Waiting for modal to appear...")
    # Wait for modal content
    expect(page.get_by_text("Analiză Juridică Avansată (AI)")).to_be_visible()

    print("Verifying Input Step...")
    # Verify Input Step elements
    expect(page.get_by_text("Întrebarea de cercetare")).to_be_visible()
    expect(page.get_by_placeholder("Ex: Care este pedeapsa medie")).to_be_visible()
    expect(page.get_by_text("Notificare Email (Opțional)")).to_be_visible()

    # Type something
    page.get_by_placeholder("Ex: Care este pedeapsa medie").fill("Test query for verification")

    # Take screenshot of Input Step
    page.screenshot(path="/home/jules/verification/modal_input_step.png")
    print("Screenshot taken: modal_input_step.png")

    # Verify buttons
    expect(page.get_by_role("button", name="Anulează")).to_be_visible()
    expect(page.get_by_role("button", name="Adaugă la Coadă")).to_be_visible()
    expect(page.get_by_role("button", name="Analizează Acum")).to_be_visible()

    print("Closing modal...")
    page.get_by_role("button", name="Anulează").click()

    # Verify modal closed
    expect(page.get_by_text("Analiză Juridică Avansată (AI)")).not_to_be_visible()

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_advanced_analysis_modal(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
