# 3D Cube Generator (GitHub Pages Ready, Import Map Version)

This version is specifically configured to run on **GitHub Pages** without any bundlers.

It uses:

- **Three.js ES modules** from the **unpkg CDN**
- A `<script type="importmap">` in `index.html` so the bare specifier **`three`** is resolved
- A separate `js/main.js` module for all of the 3D logic

---

## File structure

```text
.
├── index.html       # Entry point, defines the import map and loads js/main.js
├── js/
│   └── main.js      # All Three.js / 3D logic (ES module)
└── README.md
```

---

## Important pieces

In `index.html`, the **import map**:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.165.0/build/three.module.js"
    }
  }
</script>
```

This tells the browser:

> When a module imports from `"three"`, actually load it from that CDN URL.

In `js/main.js`:

```js
import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';
```

The `OrbitControls.js` file itself imports things from `'three'`, and the **import map** ensures that works in a plain browser environment (like GitHub Pages).

---

## Deploying on GitHub Pages

1. Create / open your repo (e.g. `new123`).
2. Upload these files so the repo root looks like:

   ```text
   new123/
   │  index.html
   │  README.md
   └─ js/
      └─ main.js
   ```

3. In the repo, go to **Settings → Pages**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` (or your default branch)
   - **Folder:** `/ (root)`
4. Save and then open the URL GitHub shows, e.g.:

   `https://<username>.github.io/new123/`

You should see the 3D cube generator with:

- Dark header UI
- "Regenerate" button
- A rotating cloud of colorful cubes
- Mouse/scroll camera controls

If you change the Three.js version, update it in **both** places:

- The import map URL in `index.html`
- The OrbitControls URL in `js/main.js`
