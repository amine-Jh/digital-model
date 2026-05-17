# Mental Rotation Images

Place the 20 question images here using this exact naming:

  rotation (1).jpg
  rotation (2).jpg
  ...
  rotation (20).jpg

Each image shows a 3D reference shape + 4 options (A, B, C, D).

Source files: `Rotation (N).png` in this folder, or `public/rotation-2d/Rotation (N).png`
for items missing here (e.g. 9 and 18). Convert with:

```bash
sips -s format jpeg -s formatOptions 85 "Rotation (N).png" --out "rotation (N).jpg"
```

If an image is missing, a placeholder is shown automatically.
