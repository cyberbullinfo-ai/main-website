import re
from pathlib import Path

root = Path('.')
html_files = list(root.glob('*.html'))
count = 0
pattern = re.compile(r'(<button[^>]*id=["\']languageButton["\'][^>]*>)(.*?)(</button>)', re.IGNORECASE | re.DOTALL)
encodings = ['utf-8', 'cp1252', 'latin-1']
for f in html_files:
    text = None
    for enc in encodings:
        try:
            text = f.read_text(encoding=enc)
            break
        except Exception:
            continue
    if text is None:
        print(f"Skipped {f} (unreadable)")
        continue
    new_text, n = pattern.subn(r"\1🌐 Taal\3", text)
    if n > 0:
        # write back using utf-8
        f.write_text(new_text, encoding='utf-8')
        print(f'Updated {f} ({n} replacements)')
        count += n
print(f'Done. Total replacements: {count}')
