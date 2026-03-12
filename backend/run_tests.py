import subprocess
result = subprocess.run(["python", "-m", "pytest", "tests/", "-v", "--tb=short"], capture_output=True, text=True)
with open("test_results_detailed.txt", "w", encoding="utf-8") as f:
    f.write(result.stdout)
    if result.stderr:
        f.write("\n\nSTDERR:\n")
        f.write(result.stderr)
