# WEB DESIGN — the system's motion + interaction toolkit

The curated, non-noise web-design foundation now baked into Athena. This is what the
NEOFORM builder and the composed section **schematics** draw from. Principle: **an
animation LAYER, orchestrated — not tweens buried inside components.**

## Installed into the site-builder (real deps — shipped sites can import these)
`~/projects/neoform-site-template` → `gsap`, `lenis`, `split-type` (+ next/react).
- **GSAP** — the timeline spine. Orchestrate reveals/transitions with one `gsap.timeline()`; stagger, custom eases (`power4.out`, `elastic.out`), magnetic transforms. The industry standard.
- **Lenis** — ultra-smooth scroll; the base for every scroll-linked reveal/parallax/pin.
- **SplitType** — split headings into lines/words/chars for mask-rise + per-character motion.

Keep the shipped-site set light (these three). Heavier engines below are used in
**standalone schematic demos** (via CDN / raw WebGL) so they never bloat client sites.

## The technique layers (curated from the full ecosystem — the useful 90%)
| Layer | Tool | What it buys |
|---|---|---|
| Timeline | **GSAP** (+ScrollTrigger, SplitText) | orchestrated motion, the spine |
| Smooth scroll | **Lenis** | scroll feel + scroll-linked effects |
| Text | **SplitType** | line/char reveals, kinetic type |
| WebGL (light) | **OGL** / **raw WebGL** | shader backgrounds, image distortion (no Three weight) |
| WebGL (scenes) | **Three.js + R3F + drei** | 3D scenes, meshes, particles (heavy — demos only) |
| Post FX | **react-postprocessing**, **lygia**/**glsl-noise** | bloom, grain, chromatic aberration — the "expensive" feel |
| Interaction | **VanillaTilt**, **use-gesture** | tilt, magnetic, drag/inertia |
| Math/easing | **maath** | damping, interpolation, spring-ish motion |

## Composed section schematics (the premium layer)
Prebuilt sections that **layer multiple techniques into ONE section** — the way
award studios (Lusion, Active Theory, Locomotive) build. Live in
`frontend/public/demos/s/`, indexed by `frontend/public/schematics.json`, surfaced in
**Showcase → Schematics**. Built so far:
- **Aurora Kinetic** (Hero) — WebGL aurora flow-field + GSAP split-text mask-rise + magnetic CTA + film grain.
- **Kinetic Type** (Hero) — GSAP line reveal + scroll-velocity marquee skew + hover char-scramble + pointer parallax.

Queued combinations: *Cinematic Scroll* (Lenis + pinned parallax layers), *Fluid Cursor*
(WebGL fluid + trailing cursor), then Gallery / CTA / Proof section schematics.

## Architecture principle (how high-end studios organize)
Not just a `components/` folder — organize around **rendering · motion · state · reusable
systems**: `scenes/`, `shaders/`, `animations/{timelines,scroll,transitions}`,
`materials/`, `postprocessing/`, `hooks/`, `stores/`. Everything transitions (page, image,
camera, text, cursor). Design tokens (spacing/type/radius/duration/easing/color/z) are
never hard-coded.

## Reference wells (for mining new techniques)
Codrops demos, Awwwards experiments, ShaderToy, The Book of Shaders, Bruno Simon /
14islands experiments, `pmndrs` (R3F/drei/postprocessing/maath), GreenSock, darkroom/Lenis,
lygia shader library, Awesome-Three.js. New novel effects get downloaded → a demo →
the catalog/schematics (see the capability manifest for the running download log).

---

# FEATURE LIBRARY — the build queue (make each amazing once -> copy-paste forever)

Goal: every item below becomes a **polished, copy-paste feature**. Athena then just
*picks* the best for a site and injects the real business content (copy, photos, reviews,
contact). Build primitives first, then combos. [x] = already built/in-catalog · [ ] = to build.

### 1. Hero
Cinematic · Full-screen video · 3D model · Interactive particle · Morphing mesh · Shader background [x] · Floating islands · Orbital camera · Infinite world · Split-screen · Sticky reveal

### 1b. Typography (hero-scale)
Giant kinetic [x] · Split text reveal [x] · Char-by-char [x] · Word cascade · Gradient text [x] · Noise text · Glass text · Metallic text · Outline text · Parallax type

### 2. Navigation
Floating navbar · Glass navbar · Expanding navbar · Magnetic buttons [x] · Animated hamburger · Circular · Full-screen overlay · Radial · Mega menu · Dock (macOS) · Scroll-hide · Morphing · Breadcrumb anim

### 3. Scroll Systems
Sticky sections · Horizontal storytelling · Infinite · Nested · Pinning · Snap · Progress [x] · Scroll-driven camera · Scroll-driven shaders · Scroll-triggered video · Scroll-linked timelines · Multi-axis

### 4. Card Systems
Floating · Glass · Perspective · 3D tilt [x] · Window · GPU image · Video · Expand-on-click · Magnetic · Stack · Masonry · Infinite gallery · Bento [x]

### 5. Gallery Systems
Horizontal · Vertical · Infinite · Filmstrip · Masonry [x] · Curved · Cylindrical · Carousel · Coverflow · Ribbon · Floating · 3D gallery wall

### 6. Section Layouts
Split [x] · Editorial [x] · Offset [x] · Bento · Magazine · Floating content · Asymmetrical · Grid-break · Immersive storytelling · Timeline · Comparison · Feature spotlight

### 7. Transitions
Crossfade · Morph · Liquid · Ripple · Zoom · Portal · Mask reveal [x] · Circular wipe · Shader dissolve · Pixel dissolve · Noise dissolve · Camera fly-through · Shared-element · Page morph

### 8. Cursor Systems
Blob · Ring · Magnetic · Physics · Trails · Spotlight · Distortion · Labels · Morphing · Particles

### 9. Buttons
Magnetic [x] · Liquid · Glow · Ripple · Outline-fill · Sliding text · Elastic · Spring · Glass · Neumorphic · Morphing · Shimmer [x]

### 10. Image Systems
Hover zoom · GPU distortion · RGB split · Pixel reveal · Noise reveal · Sliding masks · Window reveal · UV scroll · Infinite textures · Image parallax · Curved planes

### 11. Video Systems
Video textures · Hover play · Scroll scrub [x] · Cinematic transitions · Multi-video sync · Background video [x] · Shader video · Floating video windows

### 12. Typography Animation
Fade · Blur reveal [x] · Word stagger · Char stagger [x] · Line reveal [x] · Wave · Scramble [x] · Typewriter · Elastic · Split letters · Scroll-linked · SVG path drawing

### 13. Backgrounds
Aurora [x] · Particle fields · Infinite stars · Animated gradients [x] · Noise · Flow fields · Mesh gradients · Procedural · Fluid blobs · Glass distortion · Light rays · Fog

### 14. 3D Objects
Floating orb · Floating cubes · Abstract sculptures · Product viewer · Robot · Planet · Terrain · Hologram · Device mockup · Glass objects · Wireframe

### 15. Camera Behaviors
Dolly · Orbit · Crane · Follow · Parallax · Cinematic pan · Shake · FOV zoom · Path anim · Scroll camera · Mouse camera

### 16. Shaders
Fresnel · Glass · Hologram · Liquid · Water · Fire · Smoke · Heat distortion · Refraction · Chromatic aberration · Flow maps · Dissolve · Glitch · Pixelation · Frost

### 17. Particle Systems
Dust · Snow · Rain · Sparks · Fireflies · Smoke · Confetti [x] · Energy · Trails · Nebula · GPU particles · Instanced

### 18. Post Processing
Bloom · DoF · Motion blur · SSAO · SSR · Vignette [x] · Grain [x] · Lens distortion · Color grading · Glare · Tilt-shift

### 19. Loading Screens
Progress ring · Animated logo · 3D loader · Particle loader · Skeleton [x] · Scene preloader · Shader intro · Charm preloader [x]

### 20. Forms
Floating labels · Animated validation [x] · Glass inputs · Multi-step [x] · Conversational · AI chat forms

### 21. About Sections
Timeline · Floating milestones · Interactive history · Team cards · Mission statement · Animated stats [x]

### 22. Service Sections (beyond boring cards)
Horizontal immersive world · Floating islands · Orbiting service nodes · Service planets · Glass corridor · Sliding windows · Vertical cinematic reveal · Infinite ribbon · Interactive network graph · 3D workspace

### 23. Testimonials
Video wall [x] · Sliding cards · Infinite marquee [x] · Speech bubbles · Floating avatars · Storybook

### 24. Pricing
Animated tiers · Expandable · Slider · Comparison tables · Interactive calculator

### 25. Footers
Infinite horizon · Animated skyline · Particle footer · Large typography · Interactive globe

### 26. Motion Principles (every feature exposes these easings)
Linear · EaseIn · EaseOut · EaseInOut · Expo · Quint · Quart · Cubic · Spring · Elastic · Bounce · Anticipation · Overshoot · Follow-through

### 27. Interaction Patterns
Hover lift · Magnetic attraction · Scroll pin · Drag-to-explore · Click-to-expand · Swipe · Momentum scroll · Inertia · Physics movement · Snap points · Cursor-follow · Mouse parallax [x]

### 28. Reusable ENGINE Systems (the backbone that makes it all reusable)
Asset manager · Scene manager · Timeline manager · Scroll manager · Transition manager · Camera manager · Audio manager · Theme manager · Responsive layout manager · Resource preloader · Performance monitor · State manager · Event bus · Analytics hooks · Accessibility helpers

## The Lusion north star
Not 100 unique animations — a **small set of extremely polished primitives, recombined**:
smooth inertial scroll · cinematic camera · layered depth (fg/mg/bg) · GPU image+video planes ·
carefully-timed type · asymmetric composition · negative space · a **shared transition
language** site-wide · subtle shaders over flashy ones · consistent motion curves+durations.

## Engine toolkit (downloaded into feature-lab/ — heavy libs ISOLATED from shipped sites)
Rendering: three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, ogl,
postprocessing · Motion: gsap, lenis, framer-motion, maath · Physics: @react-three/rapier ·
Particles: tsparticles · Text: split-type, troika-three-text · State: zustand · Tuning: leva ·
Input: @use-gesture/react · Noise: simplex-noise. Shipped sites stay light (gsap+lenis+split-type);
each feature pulls its own extras only when picked.
