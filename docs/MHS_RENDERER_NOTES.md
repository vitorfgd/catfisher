# MHS Renderer Notes

`src/render/GameRenderer.ts` is the portability contract for drawing. The future MHS renderer should implement this interface with `DrawingCommandsBuilder` and keep `renderFrame(...)` unchanged.

| Method | MHS strategy | Risk |
|--------|--------------|------|
| `clear` | Call `builder.clear()` before rebuilding the frame. | Direct |
| `pushTranslate` / `pushScale` / `pushRotate` / `pop` | Use matching builder transform stack calls. Keep stack balance tests/manual checks during port. | Direct |
| `pushOpacity` / `popOpacity` | Use builder opacity/global alpha if available. Otherwise multiply alpha in helper draw calls. | Needs helper |
| `pushClipRect` / `popClip` | Use MHS scissor/clip rect support. All current clips are axis-aligned rectangles. | Needs helper |
| `drawRect` / `drawRectAlpha` | Use solid brushes; cache brushes for common colors. | Direct |
| `drawRoundRect` / `drawRoundRectAlpha` | Prefer builder round-rect support if present. Fallback is a plain rect or composed path. | Visual compromise possible |
| `drawEllipse` / `drawEllipseAlpha` | Use builder ellipse support with solid brushes. | Direct |
| `drawImage` / `drawImageAlpha` | Map logical asset ID to static `TextureAsset` and draw the texture. | Direct |
| `drawImageRegion` / `drawImageRegionAlpha` | Use source-rect image draw support if available. If not, split sprite sheets into separate assets before import. | Highest risk |
| `drawText` | Use cached `Font` and solid brush. Stroke/shadow fields may need duplicate draw passes or simplified styling. | Needs helper |
| `drawPolygon` | Use builder polygon/path support. Fallback is triangulation or simplifying effects to rect/ellipse draws. | Needs helper |
| `drawGradientRect` | Use gradient brush support if available. Fallback is a small number of alpha-blended bands or a flat color. | Visual compromise possible |

## Implementation Rules

- Do not add MHS imports to `src/render/RenderFrame.ts` or shared/core modules.
- Prefer adapting inside `MhsDrawingRenderer` over expanding `GameRenderer`.
- Cache reusable brushes, fonts, and texture lookups outside the per-frame hot path.
- If MHS cannot match a visual effect exactly, simplify the HTML5 effect first so both platforms converge.

## Smoke Features To Verify In Browser And MHS

- Nested transforms with fish sprites and harpoon rotation.
- Clip rects in the dive/breach wipe.
- Sprite-sheet source rects for transition bubbles.
- Text stroke/shadow on HUD and boat UI labels.
- Global opacity for fades and overlays.
- Gradient rects and polygons used in water/lighting effects.
