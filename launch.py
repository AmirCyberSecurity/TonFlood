import subprocess
import webbrowser
import time
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

REQUIREMENTS = os.path.join(BASE_DIR, "requirements.txt")
MANAGE = os.path.join(BASE_DIR, "manage.py")

def main():
    print("[*] Initializing application...")

    if not os.path.isfile(REQUIREMENTS):
        print("[!] requirements.txt not found.")
        sys.exit(1)

    if not os.path.isfile(MANAGE):
        print("[!] manage.py not found.")
        sys.exit(1)

    print("[*] Installing dependencies...")

    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", REQUIREMENTS],
        check=True,
        cwd=BASE_DIR
    )

    print("[+] Dependencies installed.")
    print("[*] Starting application...")

    subprocess.Popen(
        [sys.executable, MANAGE, "runserver"],
        cwd=BASE_DIR
    )

    print("[+] Application launched.")
    print("[*] Opening browser in 3 seconds...")

    time.sleep(3)

    webbrowser.open("http://127.0.0.1:8000/")

    print("[+] Browser opened.")

if __name__ == "__main__":
    main()
