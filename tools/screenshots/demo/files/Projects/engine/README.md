# Engine

A small software renderer used as demo content for Tandem Commander screenshots.
It draws triangles into a framebuffer and writes the result as a PNG.

## Building

```bash
python build.py --release
```

The build script compiles every file in `src/` and links `engine.exe`.

## Layout

| Path | Purpose |
|------|---------|
| `src/renderer.cpp` | rasteriser, depth buffer, clipping |
| `src/renderer.h` | public interface |
| `config.yaml` | resolution, sample count, output path |
| `build.py` | build driver |

## Roadmap

- [x] flat shading
- [x] depth buffer
- [ ] texture mapping
- [ ] multithreaded tiles

> The renderer favours clarity over speed: every stage is a plain function
> over plain data.
