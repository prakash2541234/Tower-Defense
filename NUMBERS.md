# Performance numbers

The before/after results below use the same local browser, viewport, and in-game stress action. Each final reading came from the app's latest 300 animation-frame samples after the scene settled. This is a useful live comparison, not a full browser Performance trace or a guarantee for every device. The last browser capture preceded the final C-route revision; the rendering code and stress counts were otherwise the same, but rerun the browser sample after opening the final build for an exact result on the current map.

| Version | Active enemies | Towers | Active projectiles | FPS | Frames slower than 45 FPS (>22.2 ms) | Frames over 33 ms |
|---|---:|---:|---:|---:|---:|---:|
| Initial measured implementation | 5,000 | 100 | 1,000 | 25 | Not recorded | 92.3% |
| Optimized, with the full crowd visible | 5,000 | 100 | 1,000 | 56 | 4.3% | 4.3% |

The final sample met both frame targets locally: 95.7% of frames were at or above approximately 45 FPS, and 95.7% were at or below 33 ms. The separate 33 ms result happens to match the slower-than-45 result in this sample. The stress scene uses a 0.58 WebGL pixel ratio; normal gameplay remains at full pixel ratio. Browser and hardware change results, so repeat on the intended computer before making a device-wide performance claim.

## Optimizations included

- Batched the 5,000 enemies into four shared walk-pose meshes, with archetype color/scale per instance.
- Updated only active instance-matrix and color ranges and wrote transforms directly to those buffers.
- Batched towers by weapon type, reducing hundreds of part-level tower draw calls to six instanced batches.
- Lowered stress-mode pixel ratio and skipped enemy/projectile instances outside the camera frustum.
- Used a spatial grid for tower targeting, direct projectile target references, in-place array compaction, and bounded shot/effect pools.

## Measurement procedure and limitations

1. Open the local app and select **Performance Stress Test**.
2. Wait for the counters to show 5,000 enemies, 100 towers, and 1,000 active projectiles.
3. After warmup, read the rolling 300-frame telemetry. `>22MS` counts callbacks over 22.2 ms (slower than 45 FPS); `>33MS` counts callbacks over 33 ms.
4. For a formal benchmark, capture a longer browser Performance trace and record browser, device, viewport, and graphics hardware. The figures here were live HUD samples, not a trace.
5. No complete 50-wave heap profile has been captured. Compare browser heap snapshots before and after a full campaign to verify long-run memory stability.

The original version was not preserved as a separate production build, so the baseline is the initial working tree observed at the start of this optimization pass. The final scene was rechecked after fixing an enemy-pose distribution issue that could otherwise leave some instances outside their allocated batch. The campaign's memory requirement remains unverified until the full-run profile is collected.

## Campaign completion check

An accelerated simulation reached the 50th round and victory state in 10,277 update steps (50 ms per step, run at 2× simulation speed), with 60 level-4 artillery towers and elevated test health. All 50 rounds completed and the enemy list returned to zero. This checks campaign progression and the win state; the deliberately strong test defense does not establish ordinary-player balance or prove the full browser UI flow. No browser heap profile was captured during this check.
