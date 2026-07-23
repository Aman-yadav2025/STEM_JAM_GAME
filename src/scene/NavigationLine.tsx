// import { Line } from '@react-three/drei';
// import { useStore } from '../state/store';

// // Renders the precomputed navigation route (see navigationPlanner.ts /
// // store.ts's setNavigationTarget) as a distinct guide line, separate from
// // TrajectoryLine's live gravity-only coast preview.
// //
// // Deliberately NOT recomputed here every frame the way TrajectoryLine
// // recomputes its coast path — navigationPath is a snapshot computed once
// // when the destination was chosen (or refreshed on demand via
// // refreshNavigationRoute()), since a full route simulation can be
// // thousands of physics ticks and isn't cheap enough to redo every render.
// // This component just draws whatever's currently in the store.
// export function NavigationLine() {
//   const navigationPath = useStore((state) => state.navigationPath);
//   const navigationReachable = useStore((state) => state.navigationReachable);

//   if (navigationPath.length < 2) return null;

//   const points = navigationPath.map((p) => [p.x, p.y, p.z] as [number, number, number]);

//   // Green + solid when the plan actually reaches STABLE_ORBIT at the
//   // destination; red + dashed when it stops short (out of fuel, crashed,
//   // or hit the step cap) — a visual cue that this route isn't currently
//   // achievable as planned, not just a cosmetic color choice.
//   return (
//     <Line
//       points={points}
//       color={navigationReachable ? '#4ade80' : '#f87171'}
//       lineWidth={2}
//       dashed={!navigationReachable}
//       dashSize={2}
//       gapSize={1.5}
//       transparent
//       opacity={0.85}
//     />
//   );
// }
