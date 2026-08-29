/* =========================================================
   KYFRAME STUDIO
   ENGINE.JS — BRUSH & COLOR ENGINE V2
   =========================================================

   Motor independiente de:
   - Pinceles
   - Trazos
   - Presión
   - Velocidad
   - Estabilizador
   - Suavizado
   - Texturas procedurales
   - Goma
   - Colores
   - HSV / RGB / HEX
   - Favoritos
   - Pinceles personalizados
   - Entrada táctil / stylus / mouse

   Uso básico:

   const engine = new KyframeEngine(canvas);

   engine.setBrush("g-pen");
   engine.setColor("#ffffff");
   engine.setSize(12);
   engine.setOpacity(1);

   ========================================================= */

"use strict";

/* =========================================================
   UTILIDADES
   ========================================================= */

const KF = {

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    distance(a, b) {
        return Math.hypot(b.x - a.x, b.y - a.y);
    },

    random(min = 0, max = 1) {
        return Math.random() * (max - min) + min;
    },

    hexToRgb(hex) {

        hex = String(hex)
            .replace("#", "")
            .trim();

        if (hex.length === 3) {
            hex = hex
                .split("")
                .map(c => c + c)
                .join("");
        }

        const value = parseInt(hex, 16);

        if (Number.isNaN(value)) {
            return {
                r: 255,
                g: 255,
                b: 255
            };
        }

        return {
            r: (value >> 16) & 255,
            g: (value >> 8) & 255,
            b: value & 255
        };
    },

    rgbToHex(r, g, b) {

        const toHex = value =>
            KF.clamp(Math.round(value), 0, 255)
                .toString(16)
                .padStart(2, "0");

        return "#" +
            toHex(r) +
            toHex(g) +
            toHex(b);
    },

    rgbToHsv(r, g, b) {

        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        const d = max - min;

        let h = 0;

        if (d !== 0) {

            if (max === r) {
                h = ((g - b) / d) % 6;
            } else if (max === g) {
                h = (b - r) / d + 2;
            } else {
                h = (r - g) / d + 4;
            }

            h *= 60;

            if (h < 0) {
                h += 360;
            }
        }

        const s =
            max === 0
                ? 0
                : d / max;

        return {
            h,
            s,
            v: max
        };
    },

    hsvToRgb(h, s, v) {

        h = ((h % 360) + 360) % 360;

        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;

        let r = 0;
        let g = 0;
        let b = 0;

        if (h < 60) {
            r = c;
            g = x;
        } else if (h < 120) {
            r = x;
            g = c;
        } else if (h < 180) {
            g = c;
            b = x;
        } else if (h < 240) {
            g = x;
            b = c;
        } else if (h < 300) {
            r = x;
            b = c;
        } else {
            r = c;
            b = x;
        }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }
};


/* =========================================================
   BRUSH PRESETS
   ========================================================= */

const KYFRAME_BRUSHES = {

    pencil_hb: {
        name: "Lápiz HB",
        category: "Dibujo",
        type: "pencil",
        size: 7,
        opacity: 0.75,
        hardness: 0.65,
        spacing: 0.18,
        smoothing: 0.20,
        stabilizer: 0.10,
        pressureSize: 0.65,
        pressureOpacity: 0.25,
        speedSize: 0.10,
        texture: 0.45,
        roundness: 0.85
    },

    pencil_2b: {
        name: "Lápiz 2B",
        category: "Dibujo",
        type: "pencil",
        size: 9,
        opacity: 0.82,
        hardness: 0.58,
        spacing: 0.17,
        smoothing: 0.20,
        stabilizer: 0.10,
        pressureSize: 0.70,
        pressureOpacity: 0.30,
        speedSize: 0.10,
        texture: 0.55,
        roundness: 0.82
    },

    pencil_4b: {
        name: "Lápiz 4B",
        category: "Dibujo",
        type: "pencil",
        size: 12,
        opacity: 0.90,
        hardness: 0.48,
        spacing: 0.15,
        smoothing: 0.18,
        stabilizer: 0.08,
        pressureSize: 0.72,
        pressureOpacity: 0.35,
        speedSize: 0.12,
        texture: 0.65,
        roundness: 0.80
    },

    pencil_6b: {
        name: "Lápiz 6B",
        category: "Dibujo",
        type: "pencil",
        size: 16,
        opacity: 0.92,
        hardness: 0.38,
        spacing: 0.14,
        smoothing: 0.16,
        stabilizer: 0.08,
        pressureSize: 0.78,
        pressureOpacity: 0.38,
        speedSize: 0.12,
        texture: 0.72,
        roundness: 0.78
    },

    mechanical: {
        name: "Portaminas",
        category: "Dibujo",
        type: "hard",
        size: 3,
        opacity: 1,
        hardness: 0.95,
        spacing: 0.08,
        smoothing: 0.30,
        stabilizer: 0.20,
        pressureSize: 0.30,
        pressureOpacity: 0.10,
        speedSize: 0.05,
        texture: 0.08,
        roundness: 0.98
    },

    pencil_soft: {
        name: "Lápiz Suave",
        category: "Dibujo",
        type: "soft",
        size: 14,
        opacity: 0.65,
        hardness: 0.35,
        spacing: 0.13,
        smoothing: 0.22,
        stabilizer: 0.12,
        pressureSize: 0.70,
        pressureOpacity: 0.35,
        speedSize: 0.10,
        texture: 0.48,
        roundness: 0.85
    },


    pen: {
        name: "Pluma",
        category: "Entintado",
        type: "ink",
        size: 7,
        opacity: 1,
        hardness: 1,
        spacing: 0.07,
        smoothing: 0.32,
        stabilizer: 0.25,
        pressureSize: 0.75,
        pressureOpacity: 0.15,
        speedSize: 0.12,
        texture: 0,
        roundness: 0.95
    },

    g_pen: {
        name: "Pluma G",
        category: "Entintado",
        type: "ink",
        size: 9,
        opacity: 1,
        hardness: 1,
        spacing: 0.06,
        smoothing: 0.35,
        stabilizer: 0.30,
        pressureSize: 0.92,
        pressureOpacity: 0.08,
        speedSize: 0.16,
        texture: 0,
        roundness: 0.90
    },

    technical: {
        name: "Pluma Técnica",
        category: "Entintado",
        type: "hard",
        size: 4,
        opacity: 1,
        hardness: 1,
        spacing: 0.05,
        smoothing: 0.30,
        stabilizer: 0.18,
        pressureSize: 0.12,
        pressureOpacity: 0.02,
        speedSize: 0,
        texture: 0,
        roundness: 1
    },

    fine_ink: {
        name: "Tinta Fina",
        category: "Entintado",
        type: "ink",
        size: 3,
        opacity: 1,
        hardness: 1,
        spacing: 0.05,
        smoothing: 0.30,
        stabilizer: 0.20,
        pressureSize: 0.45,
        pressureOpacity: 0.05,
        speedSize: 0.05,
        texture: 0,
        roundness: 1
    },

    thick_ink: {
        name: "Tinta Gruesa",
        category: "Entintado",
        type: "ink",
        size: 18,
        opacity: 1,
        hardness: 1,
        spacing: 0.06,
        smoothing: 0.34,
        stabilizer: 0.25,
        pressureSize: 0.75,
        pressureOpacity: 0.10,
        speedSize: 0.18,
        texture: 0,
        roundness: 0.92
    },

    comic: {
        name: "Cómic",
        category: "Entintado",
        type: "ink",
        size: 11,
        opacity: 1,
        hardness: 0.98,
        spacing: 0.06,
        smoothing: 0.40,
        stabilizer: 0.35,
        pressureSize: 0.85,
        pressureOpacity: 0.08,
        speedSize: 0.18,
        texture: 0,
        roundness: 0.90
    },

    calligraphy: {
        name: "Caligrafía",
        category: "Entintado",
        type: "calligraphy",
        size: 14,
        opacity: 1,
        hardness: 1,
        spacing: 0.06,
        smoothing: 0.30,
        stabilizer: 0.28,
        pressureSize: 0.50,
        pressureOpacity: 0.05,
        speedSize: 0.10,
        texture: 0,
        roundness: 0.35,
        angle: -20
    },


    basic: {
        name: "Pincel Básico",
        category: "Pintura",
        type: "basic",
        size: 18,
        opacity: 1,
        hardness: 0.85,
        spacing: 0.08,
        smoothing: 0.25,
        stabilizer: 0.15,
        pressureSize: 0.60,
        pressureOpacity: 0.25,
        speedSize: 0.08,
        texture: 0,
        roundness: 1
    },

    hard_brush: {
        name: "Pincel Duro",
        category: "Pintura",
        type: "hard",
        size: 20,
        opacity: 1,
        hardness: 1,
        spacing: 0.08,
        smoothing: 0.25,
        stabilizer: 0.15,
        pressureSize: 0.55,
        pressureOpacity: 0.20,
        speedSize: 0.05,
        texture: 0,
        roundness: 1
    },

    soft_brush: {
        name: "Pincel Suave",
        category: "Pintura",
        type: "soft",
        size: 30,
        opacity: 0.75,
        hardness: 0.18,
        spacing: 0.10,
        smoothing: 0.22,
        stabilizer: 0.10,
        pressureSize: 0.45,
        pressureOpacity: 0.40,
        speedSize: 0.05,
        texture: 0,
        roundness: 1
    },

    acrylic: {
        name: "Acrílico",
        category: "Pintura",
        type: "texture",
        size: 28,
        opacity: 0.85,
        hardness: 0.75,
        spacing: 0.13,
        smoothing: 0.20,
        stabilizer: 0.08,
        pressureSize: 0.55,
        pressureOpacity: 0.25,
        speedSize: 0.10,
        texture: 0.55,
        roundness: 0.85
    },

    oil: {
        name: "Óleo",
        category: "Pintura",
        type: "oil",
        size: 34,
        opacity: 0.85,
        hardness: 0.65,
        spacing: 0.15,
        smoothing: 0.18,
        stabilizer: 0.08,
        pressureSize: 0.65,
        pressureOpacity: 0.30,
        speedSize: 0.12,
        texture: 0.72,
        roundness: 0.82
    },

    gouache: {
        name: "Gouache",
        category: "Pintura",
        type: "texture",
        size: 24,
        opacity: 0.90,
        hardness: 0.72,
        spacing: 0.12,
        smoothing: 0.20,
        stabilizer: 0.10,
        pressureSize: 0.60,
        pressureOpacity: 0.20,
        speedSize: 0.10,
        texture: 0.50,
        roundness: 0.85
    },


    watercolor: {
        name: "Acuarela",
        category: "Acuarela",
        type: "watercolor",
        size: 32,
        opacity: 0.35,
        hardness: 0.20,
        spacing: 0.10,
        smoothing: 0.18,
        stabilizer: 0.08,
        pressureSize: 0.55,
        pressureOpacity: 0.55,
        speedSize: 0.05,
        texture: 0.30,
        roundness: 0.90,
        flow: 0.35
    },

    watercolor_wet: {
        name: "Acuarela Húmeda",
        category: "Acuarela",
        type: "watercolor",
        size: 38,
        opacity: 0.25,
        hardness: 0.12,
        spacing: 0.09,
        smoothing: 0.16,
        stabilizer: 0.05,
        pressureSize: 0.50,
        pressureOpacity: 0.65,
        speedSize: 0.04,
        texture: 0.22,
        roundness: 0.95,
        flow: 0.22
    },

    watercolor_dry: {
        name: "Acuarela Seca",
        category: "Acuarela",
        type: "texture",
        size: 24,
        opacity: 0.45,
        hardness: 0.38,
        spacing: 0.13,
        smoothing: 0.18,
        stabilizer: 0.10,
        pressureSize: 0.55,
        pressureOpacity: 0.35,
        speedSize: 0.08,
        texture: 0.65,
        roundness: 0.82
    },


    charcoal: {
        name: "Carboncillo",
        category: "Tradicional",
        type: "texture",
        size: 25,
        opacity: 0.65,
        hardness: 0.42,
        spacing: 0.15,
        smoothing: 0.12,
        stabilizer: 0.04,
        pressureSize: 0.70,
        pressureOpacity: 0.50,
        speedSize: 0.08,
        texture: 0.85,
        roundness: 0.78
    },

    chalk: {
        name: "Tiza",
        category: "Tradicional",
        type: "texture",
        size: 28,
        opacity: 0.75,
        hardness: 0.55,
        spacing: 0.16,
        smoothing: 0.12,
        stabilizer: 0.05,
        pressureSize: 0.55,
        pressureOpacity: 0.35,
        speedSize: 0.08,
        texture: 0.78,
        roundness: 0.80
    },

    pastel: {
        name: "Pastel",
        category: "Tradicional",
        type: "texture",
        size: 30,
        opacity: 0.70,
        hardness: 0.48,
        spacing: 0.15,
        smoothing: 0.14,
        stabilizer: 0.05,
        pressureSize: 0.65,
        pressureOpacity: 0.40,
        speedSize: 0.08,
        texture: 0.72,
        roundness: 0.80
    },

    graphite: {
        name: "Grafito",
        category: "Tradicional",
        type: "pencil",
        size: 12,
        opacity: 0.80,
        hardness: 0.52,
        spacing: 0.13,
        smoothing: 0.18,
        stabilizer: 0.08,
        pressureSize: 0.70,
        pressureOpacity: 0.32,
        speedSize: 0.10,
        texture: 0.60,
        roundness: 0.82
    },


    airbrush: {
        name: "Aerógrafo",
        category: "Efectos",
        type: "airbrush",
        size: 70,
        opacity: 0.18,
        hardness: 0.02,
        spacing: 0.04,
        smoothing: 0.12,
        stabilizer: 0,
        pressureSize: 0.40,
        pressureOpacity: 0.65,
        speedSize: 0,
        texture: 0,
        roundness: 1
    },

    glow: {
        name: "Brillo",
        category: "Efectos",
        type: "glow",
        size: 45,
        opacity: 0.28,
        hardness: 0.05,
        spacing: 0.05,
        smoothing: 0.15,
        stabilizer: 0,
        pressureSize: 0.35,
        pressureOpacity: 0.60,
        speedSize: 0,
        texture: 0,
        roundness: 1
    },

    smoke: {
        name: "Humo",
        category: "Efectos",
        type: "soft",
        size: 55,
        opacity: 0.15,
        hardness: 0.05,
        spacing: 0.12,
        smoothing: 0.10,
        stabilizer: 0,
        pressureSize: 0.45,
        pressureOpacity: 0.50,
        speedSize: 0,
        texture: 0.15,
        roundness: 1
    },

    particles: {
        name: "Partículas",
        category: "Efectos",
        type: "particles",
        size: 16,
        opacity: 0.80,
        hardness: 0.70,
        spacing: 0.35,
        smoothing: 0.05,
        stabilizer: 0,
        pressureSize: 0.30,
        pressureOpacity: 0.30,
        speedSize: 0,
        texture: 0.30,
        roundness: 0.75
    },

    spray: {
        name: "Spray",
        category: "Efectos",
        type: "particles",
        size: 35,
        opacity: 0.45,
        hardness: 0.20,
        spacing: 0.20,
        smoothing: 0.05,
        stabilizer: 0,
        pressureSize: 0.35,
        pressureOpacity: 0.30,
        speedSize: 0,
        texture: 0.60,
        roundness: 0.90
    },

    splash: {
        name: "Salpicadura",
        category: "Efectos",
        type: "particles",
        size: 25,
        opacity: 0.70,
        hardness: 0.55,
        spacing: 0.28,
        smoothing: 0.04,
        stabilizer: 0,
        pressureSize: 0.30,
        pressureOpacity: 0.35,
        speedSize: 0,
        texture: 0.80,
        roundness: 0.85
    },

    cloud: {
        name: "Nube",
        category: "Efectos",
        type: "soft",
        size: 65,
        opacity: 0.18,
        hardness: 0.08,
        spacing: 0.15,
        smoothing: 0.08,
        stabilizer: 0,
        pressureSize: 0.35,
        pressureOpacity: 0.45,
        speedSize: 0,
        texture: 0.30,
        roundness: 0.90
    },


    eraser_hard: {
        name: "Goma Dura",
        category: "Gomas",
        type: "eraser",
        size: 30,
        opacity: 1,
        hardness: 1,
        spacing: 0.06,
        smoothing: 0.25,
        stabilizer: 0.12,
        pressureSize: 0.65,
        pressureOpacity: 0,
        speedSize: 0.08,
        texture: 0,
        roundness: 1
    },

    eraser_soft: {
        name: "Goma Suave",
        category: "Gomas",
        type: "eraser_soft",
        size: 40,
        opacity: 0.70,
        hardness: 0.15,
        spacing: 0.08,
        smoothing: 0.20,
        stabilizer: 0.08,
        pressureSize: 0.60,
        pressureOpacity: 0.35,
        speedSize: 0,
        texture: 0,
        roundness: 1
    },

    eraser_precision: {
        name: "Goma Precisión",
        category: "Gomas",
        type: "eraser",
        size: 8,
        opacity: 1,
        hardness: 1,
        spacing: 0.04,
        smoothing: 0.35,
        stabilizer: 0.25,
        pressureSize: 0.45,
        pressureOpacity: 0,
        speedSize: 0,
        texture: 0,
        roundness: 1
    }
};


/* =========================================================
   BRUSH ENGINE
   ========================================================= */

class BrushEngine {

    constructor(canvas, options = {}) {

        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error(
                "Kyframe BrushEngine necesita un elemento <canvas>."
            );
        }

        this.canvas = canvas;

        this.ctx =
            canvas.getContext("2d", {
                alpha: true,
                desynchronized: true
            });

        this.options = {

            maxSize: options.maxSize || 500,
            minSize: options.minSize || 0.5,

            pressureEnabled:
                options.pressureEnabled !== false,

            velocityEnabled:
                options.velocityEnabled !== false,

            smoothing:
                options.smoothing !== false,

            highQuality:
                options.highQuality !== false
        };

        this.brushes = {};

        this.registerDefaultBrushes();

        this.currentBrush =
            this.cloneBrush(
                this.brushes.g_pen
            );

        this.color = {
            r: 0,
            g: 0,
            b: 0,
            a: 1
        };

        this.isDrawing = false;

        this.pointerId = null;

        this.points = [];

        this.lastPoint = null;

        this.lastTime = 0;

        this.velocity = 0;

        this.smoothedVelocity = 0;

        this.strokeDistance = 0;

        this.listeners = {};

        this._bindPointerEvents();

        this.resizeCanvas();
    }


    /* =====================================================
       REGISTRO DE PINCELES
       ===================================================== */

    registerDefaultBrushes() {

        Object.entries(KYFRAME_BRUSHES)
            .forEach(([id, brush]) => {

                this.brushes[id] =
                    this.cloneBrush(brush);
            });
    }


    registerBrush(id, preset) {

        if (!id) {
            throw new Error(
                "El pincel necesita un ID."
            );
        }

        this.brushes[id] =
            this.cloneBrush({
                ...preset,
                id
            });

        return this.brushes[id];
    }


    removeBrush(id) {

        if (
            id in this.brushes &&
            !KYFRAME_BRUSHES[id]
        ) {

            delete this.brushes[id];

            return true;
        }

        return false;
    }


    cloneBrush(brush) {

        return JSON.parse(
            JSON.stringify(brush)
        );
    }


    getBrushes() {

        return Object.entries(this.brushes)
            .map(([id, brush]) => ({
                id,
                ...this.cloneBrush(brush)
            }));
    }


    getBrush(id) {

        return this.brushes[id]
            ? this.cloneBrush(this.brushes[id])
            : null;
    }


    setBrush(id) {

        if (!this.brushes[id]) {
            return false;
        }

        this.currentBrush =
            this.cloneBrush(
                this.brushes[id]
            );

        this.emit(
            "brushchange",
            this.currentBrush
        );

        return true;
    }


    createCustomBrush(
        id,
        name,
        settings = {}
    ) {

        const base =
            this.cloneBrush(
                this.currentBrush
            );

        const custom = {
            ...base,
            ...settings,
            name,
            custom: true
        };

        this.registerBrush(
            id,
            custom
        );

        return this.getBrush(id);
    }


    /* =====================================================
       FAVORITOS
       ===================================================== */

    getFavorites() {

        try {

            return JSON.parse(
                localStorage.getItem(
                    "KYFRAME_BRUSH_FAVORITES"
                )
            ) || [];

        } catch {

            return [];
        }
    }


    toggleFavorite(id) {

        const favorites =
            this.getFavorites();

        const index =
            favorites.indexOf(id);

        if (index >= 0) {

            favorites.splice(index, 1);

        } else {

            favorites.push(id);
        }

        try {

            localStorage.setItem(
                "KYFRAME_BRUSH_FAVORITES",
                JSON.stringify(favorites)
            );

        } catch {}

        this.emit(
            "favoriteschange",
            favorites
        );

        return favorites;
    }


    isFavorite(id) {

        return this
            .getFavorites()
            .includes(id);
    }


    /* =====================================================
       CONFIGURACIÓN
       ===================================================== */

    setSetting(name, value) {

        if (
            typeof this.currentBrush[name] ===
            "number"
        ) {

            value = Number(value);

            if (!Number.isFinite(value)) {
                return;
            }
        }

        this.currentBrush[name] =
            value;

        this.emit(
            "brushsettingchange",
            {
                name,
                value
            }
        );
    }


    getSetting(name) {

        return this.currentBrush[name];
    }


    setSize(size) {

        size = KF.clamp(
            Number(size),
            this.options.minSize,
            this.options.maxSize
        );

        this.currentBrush.size =
            size;
    }


    getSize() {

        return this.currentBrush.size;
    }


    setOpacity(opacity) {

        this.currentBrush.opacity =
            KF.clamp(
                Number(opacity),
                0,
                1
            );
    }


    getOpacity() {

        return this.currentBrush.opacity;
    }


    setStabilizer(value) {

        this.currentBrush.stabilizer =
            KF.clamp(
                Number(value),
                0,
                1
            );
    }


    /* =====================================================
       COLOR
       ===================================================== */

    setColor(color) {

        if (
            typeof color ===
            "string"
        ) {

            const rgb =
                KF.hexToRgb(color);

            this.color = {
                ...rgb,
                a: 1
            };

        } else if (
            color &&
            typeof color === "object"
        ) {

            this.color = {

                r: KF.clamp(
                    color.r ?? 0,
                    0,
                    255
                ),

                g: KF.clamp(
                    color.g ?? 0,
                    0,
                    255
                ),

                b: KF.clamp(
                    color.b ?? 0,
                    0,
                    255
                ),

                a: KF.clamp(
                    color.a ?? 1,
                    0,
                    1
                )
            };
        }

        this.emit(
            "colorchange",
            this.getColor()
        );
    }


    setAlpha(alpha) {

        this.color.a =
            KF.clamp(
                Number(alpha),
                0,
                1
            );
    }


    getColor() {

        return {
            ...this.color
        };
    }


    getHex() {

        return KF.rgbToHex(
            this.color.r,
            this.color.g,
            this.color.b
        );
    }


    getHSV() {

        return KF.rgbToHsv(
            this.color.r,
            this.color.g,
            this.color.b
        );
    }


    setHSV(h, s, v) {

        const rgb =
            KF.hsvToRgb(
                h,
                s,
                v
            );

        this.setColor({
            ...rgb,
            a: this.color.a
        });
    }


    /* =====================================================
       CANVAS
       ===================================================== */

    resizeCanvas(
        width = this.canvas.clientWidth,
        height = this.canvas.clientHeight
    ) {

        if (!width || !height) {
            return;
        }

        const dpr =
            Math.max(
                1,
                Math.min(
                    window.devicePixelRatio || 1,
                    3
                )
            );

        this.canvas.width =
            Math.round(width * dpr);

        this.canvas.height =
            Math.round(height * dpr);

        this.canvas.style.width =
            `${width}px`;

        this.canvas.style.height =
            `${height}px`;

        this.ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        this.ctx.imageSmoothingEnabled =
            true;

        this.dpr = dpr;
    }


    clear() {

        const rect =
            this.canvas.getBoundingClientRect();

        this.ctx.clearRect(
            0,
            0,
            rect.width,
            rect.height
        );
    }


    /* =====================================================
       POINTER EVENTS
       ===================================================== */

    _bindPointerEvents() {

        this.canvas.style.touchAction =
            "none";

        this.canvas.addEventListener(
            "pointerdown",
            event =>
                this.pointerDown(event)
        );

        this.canvas.addEventListener(
            "pointermove",
            event =>
                this.pointerMove(event)
        );

        this.canvas.addEventListener(
            "pointerup",
            event =>
                this.pointerUp(event)
        );

        this.canvas.addEventListener(
            "pointercancel",
            event =>
                this.pointerUp(event)
        );

        this.canvas.addEventListener(
            "pointerleave",
            event => {

                if (
                    this.isDrawing &&
                    event.pointerType === "mouse"
                ) {
                    this.pointerUp(event);
                }
            }
        );
    }


    _getPoint(event) {

        const rect =
            this.canvas.getBoundingClientRect();

        return {

            x:
                event.clientX -
                rect.left,

            y:
                event.clientY -
                rect.top,

            pressure:
                event.pressure > 0
                    ? event.pressure
                    : 0.5,

            time:
                performance.now()
        };
    }


    pointerDown(event) {

        if (
            event.pointerType === "touch" &&
            this._touchCount() > 1
        ) {
            return;
        }

        event.preventDefault();

        try {
            this.canvas.setPointerCapture(
                event.pointerId
            );
        } catch {}

        const point =
            this._getPoint(event);

        this.isDrawing = true;

        this.pointerId =
            event.pointerId;

        this.points = [
            point
        ];

        this.lastPoint =
            point;

        this.lastTime =
            point.time;

        this.velocity = 0;

        this.smoothedVelocity = 0;

        this.strokeDistance = 0;

        this._drawDot(point);

        this.emit(
            "strokeStart",
            point
        );
    }


    pointerMove(event) {

        if (
            !this.isDrawing ||
            event.pointerId !==
            this.pointerId
        ) {
            return;
        }

        event.preventDefault();

        const point =
            this._getPoint(event);

        const previous =
            this.lastPoint;

        const distance =
            KF.distance(
                previous,
                point
            );

        if (distance < 0.15) {
            return;
        }

        const dt =
            Math.max(
                1,
                point.time -
                this.lastTime
            );

        this.velocity =
            distance / dt;

        this.smoothedVelocity =
            KF.lerp(
                this.smoothedVelocity,
                this.velocity,
                0.35
            );

        this.strokeDistance +=
            distance;

        const processed =
            this._processPoint(
                point
            );

        this.points.push(
            processed
        );

        this._drawSegment(
            previous,
            processed
        );

        this.lastPoint =
            processed;

        this.lastTime =
            point.time;

        this.emit(
            "stroke",
            processed
        );
    }


    pointerUp(event) {

        if (
            !this.isDrawing ||
            event.pointerId !==
            this.pointerId
        ) {
            return;
        }

        event.preventDefault();

        try {
            this.canvas.releasePointerCapture(
                event.pointerId
            );
        } catch {}

        this.isDrawing = false;

        this.emit(
            "strokeEnd",
            {
                points:
                    this.points.slice(),
                distance:
                    this.strokeDistance
            }
        );

        this.pointerId = null;

        this.points = [];
    }


    _touchCount() {

        if (!window.navigator) {
            return 1;
        }

        return 1;
    }


    /* =====================================================
       PROCESAMIENTO DEL TRAZO
       ===================================================== */

    _processPoint(point) {

        const brush =
            this.currentBrush;

        let pressure =
            point.pressure;

        if (
            !this.options.pressureEnabled
        ) {
            pressure = 0.5;
        }

        if (
            pressure <= 0
        ) {
            pressure = 0.5;
        }

        pressure =
            KF.clamp(
                pressure,
                0.05,
                1
            );

        let size =
            brush.size;

        if (
            brush.pressureSize
        ) {

            size *=
                KF.lerp(
                    1 -
                    brush.pressureSize,
                    1,
                    pressure
                );
        }

        if (
            this.options.velocityEnabled &&
            brush.speedSize
        ) {

            const speed =
                KF.clamp(
                    this.smoothedVelocity * 20,
                    0,
                    1
                );

            size *=
                KF.lerp(
                    1,
                    1 -
                    brush.speedSize,
                    speed
                );
        }

        size =
            KF.clamp(
                size,
                this.options.minSize,
                this.options.maxSize
            );

        let opacity =
            brush.opacity;

        if (
            brush.pressureOpacity
        ) {

            opacity *=
                KF.lerp(
                    1 -
                    brush.pressureOpacity,
                    1,
                    pressure
                );
        }

        return {
            ...point,
            pressure,
            size,
            opacity
        };
    }


    /* =====================================================
       TAMAÑO DEL PUNTO
       ===================================================== */

    _drawDot(point) {

        this._stamp(
            point.x,
            point.y,
            point.size ??
            this.currentBrush.size,
            point.opacity ??
            this.currentBrush.opacity
        );
    }


    /* =====================================================
       SEGMENTO
       ===================================================== */

    _drawSegment(a, b) {

        const brush =
            this.currentBrush;

        const distance =
            KF.distance(a, b);

        const spacing =
            Math.max(
                0.01,
                brush.spacing ||
                0.08
            );

        const step =
            Math.max(
                0.5,
                Math.min(
                    10,
                    b.size * spacing
                )
            );

        const count =
            Math.max(
                1,
                Math.ceil(
                    distance / step
                )
            );

        for (
            let i = 1;
            i <= count;
            i++
        ) {

            const t =
                i / count;

            const x =
                KF.lerp(
                    a.x,
                    b.x,
                    t
                );

            const y =
                KF.lerp(
                    a.y,
                    b.y,
                    t
                );

            const size =
                KF.lerp(
                    a.size ??
                    brush.size,
                    b.size ??
                    brush.size,
                    t
                );

            const opacity =
                KF.lerp(
                    a.opacity ??
                    brush.opacity,
                    b.opacity ??
                    brush.opacity,
                    t
                );

            this._stamp(
                x,
                y,
                size,
                opacity
            );
        }
    }


    /* =====================================================
       STAMP
       ===================================================== */

    _stamp(
        x,
        y,
        size,
        opacity
    ) {

        const brush =
            this.currentBrush;

        const ctx =
            this.ctx;

        const radius =
            Math.max(
                0.1,
                size / 2
            );

        ctx.save();

        if (
            brush.type ===
            "eraser" ||
            brush.type ===
            "eraser_soft"
        ) {

            ctx.globalCompositeOperation =
                "destination-out";

        } else {

            ctx.globalCompositeOperation =
                "source-over";
        }

        const alpha =
            KF.clamp(
                opacity *
                this.color.a,
                0,
                1
            );

        ctx.globalAlpha =
            alpha;

        const color =
            `rgb(${this.color.r},${this.color.g},${this.color.b})`;

        ctx.fillStyle =
            color;

        switch (
            brush.type
        ) {

            case "soft":
                this._softStamp(
                    x,
                    y,
                    radius
                );
                break;

            case "airbrush":
                this._airbrushStamp(
                    x,
                    y,
                    radius
                );
                break;

            case "glow":
                this._glowStamp(
                    x,
                    y,
                    radius
                );
                break;

            case "particles":
                this._particleStamp(
                    x,
                    y,
                    radius
                );
                break;

            case "texture":
            case "pencil":
            case "oil":
                this._textureStamp(
                    x,
                    y,
                    radius
                );
                break;

            case "watercolor":
                this._watercolorStamp(
                    x,
                    y,
                    radius
                );
                break;

            case "calligraphy":
                this._calligraphyStamp(
                    x,
                    y,
                    radius
                );
                break;

            default:
                this._basicStamp(
                    x,
                    y,
                    radius
                );
        }

        ctx.restore();
    }


    /* =====================================================
       TIPOS DE PUNTA
       ===================================================== */

    _basicStamp(
        x,
        y,
        radius
    ) {

        this.ctx.beginPath();

        this.ctx.arc(
            x,
            y,
            radius,
            0,
            Math.PI * 2
        );

        this.ctx.fill();
    }


    _softStamp(
        x,
        y,
        radius
    ) {

        const gradient =
            this.ctx.createRadialGradient(
                x,
                y,
                0,
                x,
                y,
                radius
            );

        gradient.addColorStop(
            0,
            `rgba(${this.color.r},${this.color.g},${this.color.b},1)`
        );

        gradient.addColorStop(
            0.45,
            `rgba(${this.color.r},${this.color.g},${this.color.b},0.55)`
        );

        gradient.addColorStop(
            1,
            `rgba(${this.color.r},${this.color.g},${this.color.b},0)`
        );

        this.ctx.fillStyle =
            gradient;

        this.ctx.beginPath();

        this.ctx.arc(
            x,
            y,
            radius,
            0,
            Math.PI * 2
        );

        this.ctx.fill();
    }


    _airbrushStamp(
        x,
        y,
        radius
    ) {

        const gradient =
            this.ctx.createRadialGradient(
                x,
                y,
                radius * 0.05,
                x,
                y,
                radius
            );

        gradient.addColorStop(
            0,
            `rgba(${this.color.r},${this.color.g},${this.color.b},0.28)`
        );

        gradient.addColorStop(
            0.45,
            `rgba(${this.color.r},${this.color.g},${this.color.b},0.10)`
        );

        gradient.addColorStop(
            1,
            `rgba(${this.color.r},${this.color.g},${this.color.b},0)`
        );

        this.ctx.fillStyle =
            gradient;

        this.ctx.beginPath();

        this.ctx.arc(
            x,
            y,
            radius,
            0,
            Math.PI * 2
        );

        this.ctx.fill();
    }


    _glowStamp(
        x,
        y,
        radius
    ) {

        this.ctx.shadowColor =
            `rgb(${this.color.r},${this.color.g},${this.color.b})`;

        this.ctx.shadowBlur =
            radius * 0.7;

        this.ctx.beginPath();

        this.ctx.arc(
            x,
            y,
            radius * 0.35,
            0,
            Math.PI * 2
        );

        this.ctx.fill();

        this.ctx.shadowBlur = 0;
    }


    _textureStamp(
        x,
        y,
        radius
    ) {

        const brush =
            this.currentBrush;

        const texture =
            KF.clamp(
                brush.texture || 0,
                0,
                1
            );

        const baseCount =
            Math.max(
                2,
                Math.round(
                    radius * 0.35
                )
            );

        for (
            let i = 0;
            i < baseCount;
            i++
        ) {

            const angle =
                Math.random() *
                Math.PI * 2;

            const distance =
                Math.random() *
                radius;

            const px =
                x +
                Math.cos(angle) *
                distance;

            const py =
                y +
                Math.sin(angle) *
                distance;

            const particleRadius =
                Math.max(
                    0.2,
                    radius *
                    KF.random(
                        0.05,
                        0.18
                    ) *
                    (0.5 + texture)
                );

            this.ctx.globalAlpha *=
                KF.random(
                    0.25,
                    0.9
                );

            this.ctx.beginPath();

            this.ctx.arc(
                px,
                py,
                particleRadius,
                0,
                Math.PI * 2
            );

            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;
    }


    _watercolorStamp(
        x,
        y,
        radius
    ) {

        const rings = 4;

        for (
            let i = 0;
            i < rings;
            i++
        ) {

            const factor =
                0.55 +
                i * 0.14;

            const r =
                radius *
                factor;

            const gradient =
                this.ctx.createRadialGradient(
                    x,
                    y,
                    r * 0.1,
                    x,
                    y,
                    r
                );

            gradient.addColorStop(
                0,
                `rgba(${this.color.r},${this.color.g},${this.color.b},0.06)`
            );

            gradient.addColorStop(
                0.7,
                `rgba(${this.color.r},${this.color.g},${this.color.b},0.035)`
            );

            gradient.addColorStop(
                1,
                `rgba(${this.color.r},${this.color.g},${this.color.b},0)`
            );

            this.ctx.fillStyle =
                gradient;

            this.ctx.beginPath();

            this.ctx.arc(
                x +
                KF.random(
                    -radius * 0.08,
                    radius * 0.08
                ),

                y +
                KF.random(
                    -radius * 0.08,
                    radius * 0.08
                ),

                r,
                0,
                Math.PI * 2
            );

            this.ctx.fill();
        }
    }


    _particleStamp(
        x,
        y,
        radius
    ) {

        const brush =
            this.currentBrush;

        const count =
            Math.max(
                3,
                Math.round(
                    radius *
                    0.35
                )
            );

        for (
            let i = 0;
            i < count;
            i++
        ) {

            const angle =
                Math.random() *
                Math.PI * 2;

            const distance =
                Math.random() *
                radius;

            const px =
                x +
                Math.cos(angle) *
                distance;

            const py =
                y +
                Math.sin(angle) *
                distance;

            const size =
                KF.random(
                    0.5,
                    Math.max(
                        1,
                        radius * 0.12
                    )
                );

            this.ctx.globalAlpha =
                KF.random(
                    0.15,
                    0.8
                );

            this.ctx.beginPath();

            this.ctx.arc(
                px,
                py,
                size,
                0,
                Math.PI * 2
            );

            this.ctx.fill();
        }
    }


    _calligraphyStamp(
        x,
        y,
        radius
    ) {

        const brush =
            this.currentBrush;

        const angle =
            (brush.angle || 0) *
            Math.PI /
            180;

        const width =
            radius *
            2;

        const height =
            Math.max(
                1,
                width *
                (1 -
                brush.roundness)
            );

        this.ctx.save();

        this.ctx.translate(
            x,
            y
        );

        this.ctx.rotate(
            angle
        );

        this.ctx.beginPath();

        this.ctx.ellipse(
            0,
            0,
            width / 2,
            height / 2,
            0,
            0,
            Math.PI * 2
        );

        this.ctx.fill();

        this.ctx.restore();
    }


    /* =====================================================
       HISTORIAL DEL BRUSH ENGINE
       ===================================================== */

    getStrokeData() {

        return {
            points:
                this.points.slice(),
            brush:
                this.cloneBrush(
                    this.currentBrush
                ),
            color:
                this.getColor()
        };
    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    on(
        event,
        callback
    ) {

        if (
            !this.listeners[event]
        ) {
            this.listeners[event] = [];
        }

        this.listeners[event]
            .push(callback);

        return () => {

            this.off(
                event,
                callback
            );
        };
    }


    off(
        event,
        callback
    ) {

        if (
            !this.listeners[event]
        ) {
            return;
        }

        this.listeners[event] =
            this.listeners[event]
                .filter(
                    fn =>
                        fn !== callback
                );
    }


    emit(
        event,
        data
    ) {

        if (
            !this.listeners[event]
        ) {
            return;
        }

        this.listeners[event]
            .forEach(
                callback => {

                    try {
                        callback(data);
                    } catch (error) {

                        console.error(
                            "KYFRAME ENGINE:",
                            error
                        );
                    }
                }
            );
    }
}


/* =========================================================
   COLOR ENGINE V2
   ========================================================= */

class KyframeColorEngine {

    constructor() {

        this.primary = {
            r: 0,
            g: 0,
            b: 0,
            a: 1
        };

        this.secondary = {
            r: 255,
            g: 255,
            b: 255,
            a: 1
        };

        this.recent = [];

        this.favorites = [];

        this.load();
    }


    setPrimary(color) {

        this.primary =
            this.parseColor(
                color
            );

        this.addRecent(
            this.primary
        );

        this.save();

        return this.getPrimary();
    }


    setSecondary(color) {

        this.secondary =
            this.parseColor(
                color
            );

        this.save();
    }


    getPrimary() {

        return {
            ...this.primary
        };
    }


    getSecondary() {

        return {
            ...this.secondary
        };
    }


    swap() {

        const temp =
            this.primary;

        this.primary =
            this.secondary;

        this.secondary =
            temp;

        this.save();
    }


    parseColor(color) {

        if (
            typeof color ===
            "string"
        ) {

            const rgb =
                KF.hexToRgb(
                    color
                );

            return {
                ...rgb,
                a: 1
            };
        }

        return {

            r: KF.clamp(
                color?.r ?? 0,
                0,
                255
            ),

            g: KF.clamp(
                color?.g ?? 0,
                0,
                255
            ),

            b: KF.clamp(
                color?.b ?? 0,
                0,
                255
            ),

            a: KF.clamp(
                color?.a ?? 1,
                0,
                1
            )
        };
    }


    getPrimaryHex() {

        return KF.rgbToHex(
            this.primary.r,
            this.primary.g,
            this.primary.b
        );
    }


    getSecondaryHex() {

        return KF.rgbToHex(
            this.secondary.r,
            this.secondary.g,
            this.secondary.b
        );
    }


    getPrimaryHSV() {

        return KF.rgbToHsv(
            this.primary.r,
            this.primary.g,
            this.primary.b
        );
    }


    setPrimaryHSV(
        h,
        s,
        v
    ) {

        const rgb =
            KF.hsvToRgb(
                h,
                s,
                v
            );

        this.primary = {
            ...rgb,
            a: this.primary.a
        };

        this.addRecent(
            this.primary
        );

        this.save();
    }


    addRecent(color) {

        const hex =
            KF.rgbToHex(
                color.r,
                color.g,
                color.b
            );

        this.recent =
            this.recent.filter(
                item =>
                    item !== hex
            );

        this.recent.unshift(
            hex
        );

        this.recent =
            this.recent.slice(
                0,
                20
            );
    }


    toggleFavorite(color) {

        const hex =
            typeof color === "string"
                ? color
                : KF.rgbToHex(
                    color.r,
                    color.g,
                    color.b
                );

        const index =
            this.favorites
                .indexOf(hex);

        if (index >= 0) {

            this.favorites
                .splice(index, 1);

        } else {

            this.favorites
                .push(hex);
        }

        this.save();

        return this.favorites
            .slice();
    }


    getRecent() {

        return this.recent
            .slice();
    }


    getFavorites() {

        return this.favorites
            .slice();
    }


    save() {

        try {

            localStorage.setItem(
                "KYFRAME_COLORS",
                JSON.stringify({
                    primary:
                        this.primary,
                    secondary:
                        this.secondary,
                    recent:
                        this.recent,
                    favorites:
                        this.favorites
                })
            );

        } catch {}
    }


    load() {

        try {

            const data =
                JSON.parse(
                    localStorage.getItem(
                        "KYFRAME_COLORS"
                    )
                );

            if (!data) {
                return;
            }

            this.primary =
                data.primary ||
                this.primary;

            this.secondary =
                data.secondary ||
                this.secondary;

            this.recent =
                data.recent ||
                [];

            this.favorites =
                data.favorites ||
                [];

        } catch {}
    }
}


/* =========================================================
   KYFRAME ENGINE
   ========================================================= */

class KyframeEngine {

    constructor(
        canvas,
        options = {}
    ) {

        this.canvas = canvas;

        this.brush =
            new BrushEngine(
                canvas,
                options
            );

        this.colors =
            new KyframeColorEngine();

        this.brush.setColor(
            this.colors.getPrimary()
        );

        this._connectColorEvents();
    }


    _connectColorEvents() {

        this.brush.on(
            "colorchange",
            color => {

                this.colors
                    .setPrimary(
                        color
                    );
            }
        );
    }


    /* -----------------------------------------------------
       PINCELES
       ----------------------------------------------------- */

    setBrush(id) {

        return this.brush
            .setBrush(id);
    }


    getBrushes() {

        return this.brush
            .getBrushes();
    }


    getBrush(id) {

        return this.brush
            .getBrush(id);
    }


    createBrush(
        id,
        name,
        settings
    ) {

        return this.brush
            .createCustomBrush(
                id,
                name,
                settings
            );
    }


    setBrushSetting(
        name,
        value
    ) {

        this.brush
            .setSetting(
                name,
                value
            );
    }


    setSize(size) {

        this.brush
            .setSize(size);
    }


    setOpacity(opacity) {

        this.brush
            .setOpacity(opacity);
    }


    setStabilizer(value) {

        this.brush
            .setStabilizer(value);
    }


    toggleFavorite(id) {

        return this.brush
            .toggleFavorite(id);
    }


    getFavorites() {

        return this.brush
            .getFavorites();
    }


    /* -----------------------------------------------------
       COLOR
       ----------------------------------------------------- */

    setColor(color) {

        this.colors
            .setPrimary(color);

        this.brush
            .setColor(
                this.colors
                    .getPrimary()
            );
    }


    getColor() {

        return this.colors
            .getPrimary();
    }


    getHex() {

        return this.colors
            .getPrimaryHex();
    }


    setHSV(h, s, v) {

        this.colors
            .setPrimaryHSV(
                h,
                s,
                v
            );

        this.brush
            .setColor(
                this.colors
                    .getPrimary()
            );
    }


    getHSV() {

        return this.colors
            .getPrimaryHSV();
    }


    getRecentColors() {

        return this.colors
            .getRecent();
    }


    getFavoriteColors() {

        return this.colors
            .getFavorites();
    }


    swapColors() {

        this.colors.swap();

        this.brush
            .setColor(
                this.colors
                    .getPrimary()
            );
    }


    /* -----------------------------------------------------
       CANVAS
       ----------------------------------------------------- */

    clear() {

        this.brush.clear();
    }


    resize() {

        this.brush.resizeCanvas();
    }


    /* -----------------------------------------------------
       EVENTOS
       ----------------------------------------------------- */

    on(
        event,
        callback
    ) {

        return this.brush
            .on(
                event,
                callback
            );
    }
}


/* =========================================================
   EXPORTACIÓN GLOBAL
   ========================================================= */

window.KYFRAME_BRUSHES =
    KYFRAME_BRUSHES;

window.KyframeBrushEngine =
    BrushEngine;

window.KyframeColorEngine =
    KyframeColorEngine;

window.KyframeEngine =
    KyframeEngine;


/* =========================================================
   INICIALIZACIÓN AUTOMÁTICA OPCIONAL

   Si existe:

   <canvas id="kyframeCanvas"></canvas>

   se crea automáticamente:

   window.kyframeEngine
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const canvas =
            document.getElementById(
                "kyframeCanvas"
            );

        if (!canvas) {
            return;
        }

        try {

            window.kyframeEngine =
                new KyframeEngine(
                    canvas
                );

            window.kyframeEngine
                .setBrush(
                    "g_pen"
                );

            window.kyframeEngine
                .setColor(
                    "#000000"
                );

            console.log(
                "KYFRAME STUDIO ENGINE V2 iniciado."
            );

        } catch (error) {

            console.error(
                "No se pudo iniciar KYFRAME ENGINE:",
                error
            );
        }
    }
);
