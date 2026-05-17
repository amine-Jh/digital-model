# Mental Rotation Images

Place the 20 question images here using this exact naming:

  rotation (1).jpg
  rotation (2).jpg
  ...
  rotation (20).jpg

Each image shows a 3D reference shape + 4 options (A, B, C, D).
If an image is missing, a placeholder is shown automatically.

## Regenerating from source PNGs

From the repo root (macOS `sips`):

```bash
bash scripts/generate-rotation-jpgs.sh
```

Sources (in order): Cursor assets `Rotation__N_-*.png`, then
`public/rotation-2d/Rotation (N).png`, then `public/rotation/Rotation (N).png`.
Questions **9** and **18** have no 3D asset in the bundle — they use `rotation-2d`.
