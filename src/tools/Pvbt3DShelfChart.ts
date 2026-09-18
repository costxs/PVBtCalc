// @ts-nocheck
/**
 * Pvbt3DShelfChart
 * ------------------------------------------------------------------
 * Grafico 3D "em prateleiras": cada curva (rodada salva) ocupa sua
 * propria trilha de profundidade, com uma cortina translucida ate o
 * piso para dar nocao de altura mesmo girando. Pensado para comparar
 * 2-6 curvas de PVBt (ou volume de acido) vs vazao sem que se
 * sobreponham como aconteceria num grafico 2D tradicional.
 *
 * Classe vanilla (sem depender de React) que se monta num elemento DOM.
 * O wrapper de React fica em Pvbt3DChart.tsx, no mesmo diretorio de
 * componentes.
 */

import * as THREE from 'three';

const DEFAULTS = {
  xLabel: 'Flowrate',
  yLabel: 'PVBt',
  xLog: true,
  xSpan: 8,
  yScale: null,        // null = auto-escala pelo maior valor entre todas as runs
  zLane: 2.2,           // espacamento entre trilhas
  curtainOpacity: 0.14,
  background: null,     // null = transparente
  axisColor: 0x898781,
  labelColor: '#52514e',
  pointEvery: 4,        // marca um ponto a cada N para nao poluir a curva
};

export class Pvbt3DShelfChart {
  onHover: ((point: { label: string; x: number; y: number }) => void) | null | undefined = null;

  constructor(container, options = {}) {
    this.container = container;
    this.opts = { ...DEFAULTS, ...options };
    this.runs = [];
    this.rotY = 0.55;
    this.rotX = 0.48;
    this.radius = 15;
    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;

    this._initScene();
    this._initInteraction();
    this._resize();
    this._animate();

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(container);
  }

  // -------------------------------------------------------------
  // API publica
  // -------------------------------------------------------------

  /**
   * runs: [{ label, color, qs, values }]
   *   label   - string mostrado na legenda
   *   color   - '#rrggbb' ou número hex (0xrrggbb)
   *   qs      - array de vazoes (eixo X) para esta run
   *   values  - array de PVBt/volume (eixo Y), mesmo tamanho de qs
   */
  setRuns(runs) {
    this.runs = runs.map((r) => ({
      ...r,
      color: typeof r.color === 'string' ? parseInt(r.color.replace('#', ''), 16) : r.color,
    }));
    this._rebuild();
  }

  /** Troca a rotacao para um angulo especifico (uteis para "vista de cima" etc). */
  setView(rotY, rotX) {
    this.rotY = rotY;
    this.rotX = rotX;
    this._updateCamera();
  }

  dispose() {
    this._resizeObserver.disconnect();
    cancelAnimationFrame(this._raf);
    this.renderer.dispose();
    this._clearRuns();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  // -------------------------------------------------------------
  // internals
  // -------------------------------------------------------------

  _initScene() {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.cursor = 'grab';
    this.container.appendChild(canvas);
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    if (this.opts.background) this.renderer.setClearColor(this.opts.background, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.5);
    dl.position.set(3, 6, 4);
    this.scene.add(dl);

    this._runGroups = [];
    this._axisGroup = new THREE.Group();
    this.scene.add(this._axisGroup);

    this._raycaster = new THREE.Raycaster();
    this._raycaster.params.Line = { threshold: 0.08 };
    this._hoverDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    this._hoverDot.visible = false;
    this.scene.add(this._hoverDot);
  }

  _initInteraction() {
    const el = this.canvas;
    el.addEventListener('pointerdown', (e) => {
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      el.style.cursor = 'grabbing';
    });
    
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.radius += e.deltaY * 0.01;
      this.radius = Math.max(5, Math.min(50, this.radius));
      this._updateCamera();
    });

    window.addEventListener('pointerup', () => {
      this._dragging = false;
      el.style.cursor = 'grab';
    });
    window.addEventListener('pointermove', (e) => {
      if (this._dragging) {
        this.rotY += (e.clientX - this._lastX) * 0.01;
        this.rotX = Math.max(0.15, Math.min(1.4, this.rotX - (e.clientY - this._lastY) * 0.008));
        this._lastX = e.clientX;
        this._lastY = e.clientY;
        this._updateCamera();
      } else {
        this._handleHover(e);
      }
    });
    el.addEventListener('mouseleave', () => {
      this._hoverDot.visible = false;
      if (this.onHover) this.onHover(null);
    });
  }

  _handleHover(e) {
    if (!this._runGroups.length) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const lines = this._runGroups.map((g) => g.line);
    const hits = this._raycaster.intersectObjects(lines, false);
    if (hits.length) {
      const hit = hits[0];
      const group = this._runGroups.find((g) => g.line === hit.object);
      this._hoverDot.position.copy(hit.point);
      this._hoverDot.material.color.setHex(group.color);
      this._hoverDot.visible = true;
      if (this.onHover) {
        this.onHover({
          label: group.label,
          x: this._pxToQ(hit.point.x),
          y: hit.point.y / this._yScaleFactor,
        });
      }
    } else {
      this._hoverDot.visible = false;
      if (this.onHover) this.onHover(null);
    }
  }

  _clearRuns() {
    this._runGroups.forEach((g) => {
      this.scene.remove(g.group);
      g.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    });
    this._runGroups = [];
    while (this._axisGroup.children.length) {
      const c = this._axisGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      if (c.material?.map) c.material.map.dispose();
    }
  }

  _rebuild() {
    this._clearRuns();
    if (!this.runs.length) return;

    const { xSpan, zLane, xLog } = this.opts;

    const allQ = this.runs.flatMap((r) => r.qs);
    const allV = this.runs.flatMap((r) => r.values);
    const qMin = Math.min(...allQ), qMax = Math.max(...allQ);
    const vMax = Math.max(...allV);
    this._qMin = qMin;
    this._qMax = qMax;
    this._xLog = xLog;
    const yScale = this.opts.yScale ?? 6 / vMax;
    this._yScaleFactor = yScale;

    const xPos = (q) =>
      xLog
        ? -xSpan / 2 + ((Math.log10(q) - Math.log10(qMin)) / (Math.log10(qMax) - Math.log10(qMin))) * xSpan
        : -xSpan / 2 + ((q - qMin) / (qMax - qMin)) * xSpan;
    this._xPos = xPos;

    const n = this.runs.length;
    const zFor = (i) => (i - (n - 1) / 2) * zLane;

    this.runs.forEach((run, i) => {
      const group = new THREE.Group();
      const z = zFor(i);
      const pts = run.qs.map((q, j) => new THREE.Vector3(xPos(q), run.values[j] * yScale, z));

      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: run.color, linewidth: 2 }));
      group.add(line);

      const curtainVerts = [];
      pts.forEach((p) => {
        curtainVerts.push(p.x, p.y, p.z, p.x, 0, p.z);
      });
      const idx = [];
      for (let k = 0; k < pts.length - 1; k++) {
        const a = k * 2, b = k * 2 + 1, c = (k + 1) * 2, d = (k + 1) * 2 + 1;
        idx.push(a, c, b, b, c, d);
      }
      const cgeo = new THREE.BufferGeometry();
      cgeo.setAttribute('position', new THREE.Float32BufferAttribute(curtainVerts, 3));
      cgeo.setIndex(idx);
      cgeo.computeVertexNormals();
      const curtain = new THREE.Mesh(
        cgeo,
        new THREE.MeshBasicMaterial({
          color: run.color,
          transparent: true,
          opacity: this.opts.curtainOpacity,
          side: THREE.DoubleSide,
        })
      );
      group.add(curtain);

      pts.forEach((p, j) => {
        if (j % this.opts.pointEvery !== 0) return;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 10, 10),
          new THREE.MeshStandardMaterial({ color: run.color })
        );
        dot.position.copy(p);
        group.add(dot);
      });

      this.scene.add(group);
      this._runGroups.push({ group, line, color: run.color, label: run.label });
    });

    this._buildAxes(xPos, zFor(0), zFor(n - 1), yScale, vMax);
  }

  _buildAxes(xPos, zStart, zEnd, yScale, vMax) {
    const axMat = new THREE.LineBasicMaterial({ color: this.opts.axisColor });
    const gridMat = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.4 });
    const mk = (a, b) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), axMat);
    const mkGrid = (a, b) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), gridMat);

    const z0 = zStart - this.opts.zLane / 2 - 0.6;
    const z1 = zEnd + this.opts.zLane / 2 + 0.6;
    const xSpan = this.opts.xSpan;

    this._axisGroup.add(mk(new THREE.Vector3(-xSpan / 2, 0, z1), new THREE.Vector3(xSpan / 2, 0, z1)));
    this._axisGroup.add(mk(new THREE.Vector3(-xSpan / 2, 0, z0), new THREE.Vector3(-xSpan / 2, 0, z1)));
    this._axisGroup.add(mk(new THREE.Vector3(-xSpan / 2, 0, z1), new THREE.Vector3(-xSpan / 2, vMax * yScale, z1)));

    // Floor lines for X axis
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const q = this._xLog
        ? Math.pow(10, Math.log10(this._qMin) + (i / tickCount) * (Math.log10(this._qMax) - Math.log10(this._qMin)))
        : this._qMin + (i / tickCount) * (this._qMax - this._qMin);
      this._addLabel(this._fmt(q), xPos(q), -0.35, z1 + 0.2, 0.85);
      this._axisGroup.add(mkGrid(new THREE.Vector3(xPos(q), 0, z0), new THREE.Vector3(xPos(q), 0, z1)));
    }
    
    // Back wall and side wall grid for Y axis
    for (let i = 0; i <= 5; i++) {
      const v = (vMax * i) / 5;
      const y = v * yScale;
      this._addLabel(this._fmt(v), -xSpan / 2 - 0.55, y, z1, 0.7);
      
      // Horizontal line on the side wall (from front to back)
      this._axisGroup.add(mkGrid(new THREE.Vector3(-xSpan / 2, y, z0), new THREE.Vector3(-xSpan / 2, y, z1)));
      // Horizontal line on the back wall (from left to right)
      this._axisGroup.add(mkGrid(new THREE.Vector3(-xSpan / 2, y, z0), new THREE.Vector3(xSpan / 2, y, z0)));
    }
    this._addLabel(this.opts.xLabel, 0, -0.75, z1 + 0.6, 1.8);
    this._addLabel(this.opts.yLabel, -xSpan / 2 - 0.65, vMax * yScale * 1.08, z1, 1.6);

    this.runs.forEach((run, i) => {
      const z = (i - (this.runs.length - 1) / 2) * this.opts.zLane;
      this._addLabel(run.label, xSpan / 2 + 0.7, 0.1, z, 0.7);
    });
  }

  _addLabel(text, x, y, z, size) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    c.fillStyle = this.opts.labelColor;
    c.font = '52px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 128, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(size * 1.3, size * 1.3 * 0.5, 1);
    sprite.position.set(x, y, z);
    this._axisGroup.add(sprite);
  }

  _fmt(v) {
    if (v >= 1000) return Math.round(v).toLocaleString();
    if (v < 1 && v !== 0) return v.toFixed(2);
    return Math.round(v * 100) / 100;
  }

  _pxToQ(x) {
    const xSpan = this.opts.xSpan;
    const f = (x + xSpan / 2) / xSpan;
    return this._xLog
      ? Math.pow(10, Math.log10(this._qMin) + f * (Math.log10(this._qMax) - Math.log10(this._qMin)))
      : this._qMin + f * (this._qMax - this._qMin);
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _updateCamera() {
    const r = this.radius;
    this.camera.position.set(
      r * Math.sin(this.rotY) * Math.cos(this.rotX),
      r * Math.sin(this.rotX) + 2.5,
      r * Math.cos(this.rotY) * Math.cos(this.rotX)
    );
    this.camera.lookAt(0, 2.2, 0);
  }

  _animate() {
    this._raf = requestAnimationFrame(() => this._animate());
    this.renderer.render(this.scene, this.camera);
  }
}
