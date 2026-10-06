'use client';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useTransitionStore } from '../../store/useTransitionStore';
import { useElevatorUiStore } from '../../stores/useElevatorUiStore';

export function SceneDiagnostics({ ready }: { ready: boolean }) {
  const get = useThree(s => s.get);
  const fixtureApplied = useRef(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    // Development-only fixture: actual ride input still goes through the visible UI.
    const fixture = ready && !fixtureApplied.current && ['elevator', 'elevator-approach', 'signage', 'corridor', 'bench', 'mural'].includes(query.get('qa') ?? '') ? window.setTimeout(() => {
      fixtureApplied.current = true;
      const state = get();
      if (query.get('qa') === 'signage') {
        state.camera.position.set(4, 2.05, 6); state.camera.lookAt(-2, 2.55, -9.5);
      } else if (query.get('qa') === 'bench') {
        state.camera.position.set(-4, 2.05, 6); state.camera.lookAt(-10.3, 1.6, 1);
      } else if (query.get('qa') === 'mural') {
        state.camera.position.set(1, 2.05, -3); state.camera.lookAt(9.8, 2.3, 0);
      } else if (query.get('qa') === 'corridor') {
        state.camera.position.set(-13, 2.05, -4.3); state.camera.lookAt(-39, 2.35, -5);
      } else if (useTransitionStore.getState().activeZone === 'hub') {
        state.camera.position.set(-24, 2.05, 0);
        state.camera.lookAt(-24, 1.85, 4);
      } else {
        state.camera.position.set(0, 2.05, query.get('qa') === 'elevator-approach' ? 4.4 : 7.45);
        state.camera.lookAt(0, 1.85, 12);
      }
      state.camera.updateMatrixWorld();
    }, 500) : null;
    const target = window as Window & { render_game_to_text?: () => string };
    const read = () => {
      const scene = get();
      const navigation = useTransitionStore.getState();
      const cabin = scene.scene.getObjectByName('creator-elevator-cabin');
      return JSON.stringify({
        coordinateSystem: 'Y up; camera forward follows view, metres',
        zone: navigation.activeZone, origin: navigation.originZone, target: navigation.targetZone,
        elevator: navigation.elevatorState, rideStatus: useElevatorUiStore.getState().rideStatus,
        canRide: useElevatorUiStore.getState().available,
        camera: scene.camera.position.toArray(), dpr: scene.gl.getPixelRatio(),
        canvas: [scene.gl.domElement.width, scene.gl.domElement.height],
        cabin: cabin ? { visible: cabin.visible, doors: cabin.children.filter(o => o.type === 'Group').map(o => o.position.x),
          shaftVisible: scene.scene.getObjectByName('creator-elevator-shaft')?.visible } : null,
      });
    };
    target.render_game_to_text = read;
    return () => {
      if (fixture !== null) window.clearTimeout(fixture);
      if (target.render_game_to_text === read) delete target.render_game_to_text;
    };
  }, [get, ready]);
  return null;
}
