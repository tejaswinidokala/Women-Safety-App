/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

interface ShakeConfig {
  threshold?: number; // threshold of change in acceleration
  timeout?: number;   // debounce timeout between shakes in ms
}

export function useShakeDetector(onShake: () => void, config: ShakeConfig = {}) {
  const { threshold = 15, timeout = 1000 } = config;
  const [permissionState, setPermissionState] = useState<string>('unknown');
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastZ: number | null = null;
    let lastUpdate = 0;

    const handleMotionEvent = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity || event.acceleration;
      if (!acceleration) return;

      const { x, y, z } = acceleration;
      if (x === null || y === null || z === null) return;

      const currentTime = Date.now();
      if (currentTime - lastUpdate > 100) {
        const diffTime = currentTime - lastUpdate;
        lastUpdate = currentTime;

        if (lastX !== null && lastY !== null && lastZ !== null) {
          const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;

          if (speed > threshold * 5) { // Adjusted scaling to feel natural
            onShake();
          }
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    // Check device support
    if (typeof window !== 'undefined') {
      if (!window.DeviceMotionEvent) {
        setIsSupported(false);
      } else {
        window.addEventListener('devicemotion', handleMotionEvent);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotionEvent);
      }
    };
  }, [onShake, threshold, timeout]);

  const requestPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        setPermissionState(permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting DeviceMotion permission:', error);
        setPermissionState('denied');
        return false;
      }
    } else {
      setPermissionState('granted');
      return true;
    }
  };

  return { isSupported, permissionState, requestPermission };
}
