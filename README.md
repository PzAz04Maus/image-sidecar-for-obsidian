# image-sidecar-for-obsidian

Creates a Markdown “sidecar” note for images/PDFs.

## Install / reinstall

Obsidian loads community plugins from:

`<your-vault>/.obsidian/plugins/<plugin-id>/`

For this plugin, `<plugin-id>` is the `id` field in `manifest.json`: `image-sidecar-plugin`.

### Manual install (from a build)

1. In Obsidian: **Settings → Community plugins**
	- Turn **Restricted mode** off (if you use community plugins)
	- Click **Open plugins folder**
2. Create a folder named `image-sidecar-plugin`
3. Copy these files into that folder:
	- `manifest.json`
	- `main.js`
	- `styles.css` (only if present)
4. Back in Obsidian: **Settings → Community plugins → Installed plugins** → enable **Image Sidecar Plugin**
5. If it doesn’t appear immediately, restart Obsidian.

### Build locally

```bash
npm install
npm run build
```

This produces `main.js` at the repo root.

### Create a release folder

```bash
npm run release
```

This writes a ready-to-copy bundle to `release/image_sidecar_for_obsidian/`.

### Windows PowerShell copy example

Example vault path:

`\\M1abrams\j\_Vaults\CharacterVault\.obsidian\plugins\image-sidecar-plugin\`

From the repo root, after running `npm run release`:

```powershell
Copy-Item -Force -Path ".\release\image_sidecar_for_obsidian\*" -Destination "\\M1abrams\j\_Vaults\CharacterVault\.obsidian\plugins\image-sidecar-plugin\"
```

**Behavior**
- When enabled, newly-created image/PDF files are enqueued and processed in a cooperative background job (chunked + yielding) to keep Obsidian responsive.
- Progress shows in the status bar (no per-file Notice spam).

**Commands**
- `Generate missing sidecars (scan vault)`: scans the vault for images/PDFs and creates missing sidecars.
- `Pause sidecar generation`
- `Resume sidecar generation`
- `Cancel sidecar generation`