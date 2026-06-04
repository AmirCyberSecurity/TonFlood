import subprocess
import webbrowser
import time
import sys

subprocess.run(
    [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
    check=True
)

subprocess.Popen(
    [sys.executable, "manage.py", "runserver"]
)

time.sleep(3)

webbrowser.open("http://127.0.0.1:8000/")