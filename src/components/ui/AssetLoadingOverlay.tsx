import { useProgress } from '@react-three/drei';
import LoadingOverlay from './LoadingOverlay';

export default function AssetLoadingOverlay() {
  const { active, progress } = useProgress();

  if (!active) return null;

  const rounded = Math.max(0, Math.min(100, Math.round(progress)));
  return <LoadingOverlay message={`Loading assets… ${rounded}%`} nonBlocking />;
}
