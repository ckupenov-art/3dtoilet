<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>3D Toilet Pack Generator</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f5f1e4;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #e5e7eb;
    }
    body { display: flex; flex-direction: column; }

    /* ===========================
       HEADER
    ============================ */
    header {
      padding: 0.8rem 1.4rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #020617;
      border-bottom: 1px solid rgba(148, 163, 184, 0.4);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.8);
      z-index: 10;
      font-size: 1rem;
    }
    header .title-block {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    header h1 {
      margin: 0;
      font-size: 1.15rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #e5e7eb;
    }
    header span.subtitle {
      font-size: 0.9rem;
      color: #9ca3af;
    }
    #count-label {
      font-size: 1rem;
      color: #e5e7eb;
      font-weight: 600;
    }

    /* ===========================
       MAIN & SCENE
    ============================ */
    main {
      position: relative;
      flex: 1;
    }
    #scene-container {
      position: absolute;
      inset: 0;
    }

    #hint {
      position: absolute;
      left: 50%;
      bottom: 0.8rem;
      transform: translateX(-50%);
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.5);
      font-size: 0.85rem;
      color: #9ca3af;
      pointer-events: none;
      white-space: nowrap;
    }

    /* ===========================
       UPDATED CONTROL PANEL (BIGGER)
    ============================ */
    #control-panel {
      position: absolute;
      top: 1.4rem;
      left: 1.4rem;
      z-index: 20;

      background: rgba(15, 23, 42, 0.92);
      border-radius: 1.2rem;
      padding: 1.4rem 1.6rem;
      border: 1px solid rgba(148, 163, 184, 0.7);
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.85);

      min-width: 300px;
      max-width: 360px;

      font-size: 1rem;
    }

    #control-panel h2 {
      margin: 0 0 1rem;
      font-size: 1.1rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #e5e7eb;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      margin-bottom: 1.2rem;
    }

    .field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .field label {
      flex: 1.4;
      font-size: 0.95rem;
      color: #cbd5f5;
    }

    .field input {
      width: 110px;
      padding: 0.45rem 0.55rem;
      border-radius: 0.55rem;

      border: 1px solid rgba(148, 163, 184, 0.9);
      background: #020617;
      color: #e5e7eb;
      font-size: 0.95rem;
    }

    #total-rolls {
      font-weight: 700;
      color: #ffffff;
      font-size: 1rem;
    }

    .buttons-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      margin-top: 0.6rem;
    }

    button {
      border: none;
      border-radius: 999px;
      padding: 0.55rem 1.1rem;
      cursor: pointer;

      font-size: 0.95rem;
      font-weight: 500;

      background: #4f46e5;
      color: white;

      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;

      box-shadow: 0 6px 14px rgba(79,70,229,0.6);
    }

    button.secondary {
      background: #0f172a;
      border: 1px solid rgba(148,163,184,0.9);
      color: #e5e7eb;
      box-shadow: none;
    }

    /* ===========================
       CAMERA DEBUG PANEL
    ============================ */
    #camera-debug {
      position: absolute;
      top: 1.4rem;
      right: 1.4rem;
      z-index: 20;
      background: rgba(15,23,42,0.92);
      border-radius: 0.8rem;
      padding: 0.8rem 1rem;
      border: 1px solid rgba(148, 163, 184, 0.5);
      font-size: 0.85rem;
      color: #cbd5f5;
      max-width: 220px;
      line-height: 1.4;
    }
    #camera-debug strong {
      color: #ffffff;
      font-size: 0.95rem;
    }
  </style>
</head>

<body>
  <header>
    <div class="title-block">
      <h1>3D Toilet Pack Generator</h1>
      <span class="subtitle">Sideways rolls · Three.js</span>
    </div>
    <div><span id="count-label">– rolls</span></div>
  </header>

  <main>
    <div id="scene-container"></div>
    <div id="hint">Left: Rotate · Right/Middle: Pan · Scroll: Zoom</div>

    <!-- =======================
         UPDATED CONTROL PANEL
    ======================== -->
    <div id="control-panel">
      <h2>Pack Settings</h2>

      <div class="field-group">
        <div class="field">
          <label for="rollsPerRowInput">Rolls per row</label>
          <input id="rollsPerRowInput" type="number" min="1" value="4">
        </div>
        <div class="field">
          <label for="rowsPerLayerInput">Rows per layer</label>
          <input id="rowsPerLayerInput" type="number" min="1" value="3">
        </div>
        <div class="field">
          <label for="layersInput">Layers</label>
          <input id="layersInput" type="number" min="1" value="2">
        </div>
        <div class="field">
          <label>Total rolls</label>
          <span id="total-rolls">–</span>
        </div>
      </div>

      <div class="field-group">
        <div class="field">
          <label for="rollDiameterInput">Roll Ø (mm)</label>
          <input id="rollDiameterInput" type="number" min="10" value="120">
        </div>
        <div class="field">
          <label for="coreDiameterInput">Core Ø (mm)</label>
          <input id="coreDiameterInput" type="number" min="5" value="45">
        </div>
        <div class="field">
          <label for="rollHeightInput">Height (mm)</label>
          <input id="rollHeightInput" type="number" min="10" value="100">
        </div>
        <div class="field">
          <label for="rollGapInput">Roll gap (mm)</label>
          <input id="rollGapInput" type="number" step="0.1" min="0" value="7">
        </div>
      </div>

      <div class="buttons-row">
        <button id="generateBtn">Generate</button>
        <button id="resetCameraBtn" class="secondary">Reset camera</button>
        <button id="exportPngBtn" class="secondary">Export PNG</button>
      </div>
    </div>

    <!-- Camera Debug -->
    <div id="camera-debug">
      <strong>Camera</strong><br>
      x: <span id="cam-x">–</span><br>
      y: <span id="cam-y">–</span><br>
      z: <span id="cam-z">–</span><br>
      <strong>Target</strong><br>
      tx: <span id="cam-tx">–</span><br>
      ty: <span id="cam-ty">–</span><br>
      tz: <span id="cam-tz">–</span>
    </div>
  </main>

  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.165.0/build/three.module.js"
      }
    }
  </script>

  <script type="module" src="./js/main_final.js?v=4"></script>
</body>
</html>
