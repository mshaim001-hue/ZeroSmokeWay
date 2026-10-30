import { useEffect } from 'react';
import { AuthGate } from './auth/AuthGate';
import { installFullscreen } from './fullscreen';

export default function App() {
  useEffect(() => installFullscreen(), []);
  return <AuthGate />;
}
