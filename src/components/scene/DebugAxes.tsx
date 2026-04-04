import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface LocalAxesProps {
  size: number;
  visible?: boolean;
}

export function LocalAxes({ size, visible = true }: LocalAxesProps) {
  const helper = useMemo(() => {
    const axes = new THREE.AxesHelper(size);
    const materials = Array.isArray(axes.material) ? axes.material : [axes.material];
    for (const material of materials) {
      material.depthTest = false;
      material.toneMapped = false;
    }
    axes.renderOrder = 1000;
    return axes;
  }, [size]);

  useEffect(() => () => helper.dispose(), [helper]);

  return <primitive object={helper} visible={visible} />;
}
