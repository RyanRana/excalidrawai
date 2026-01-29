# Create GitHub repo "excalidrawai"

## 1. Create the repo on GitHub

1. Go to **https://github.com/new?name=excalidrawai**
2. **Repository name:** `excalidrawai`
3. Choose **Public**
4. Leave "Add a README" **unchecked** (you already have code)
5. Click **Create repository**

## 2. Add remote and push (from this project folder)

```bash
# Add the new repo as remote (use your GitHub username if different)
git remote add excalidrawai https://github.com/YOUR_USERNAME/excalidrawai.git

# Push this branch (usually main or master)
git push -u excalidrawai main
```

If your default branch is `master`:

```bash
git push -u excalidrawai master
```

To make `excalidrawai` the main remote and push there:

```bash
git remote rename origin origin-upstream   # optional: keep old excalidraw-cli as origin-upstream
git remote add origin https://github.com/YOUR_USERNAME/excalidrawai.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username (e.g. `ryanrana`).
