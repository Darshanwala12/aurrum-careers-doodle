import { lazy, Suspense } from 'react';
import App from './App.jsx';
const CharacterDemoPage = lazy(() => import('./avatar/demo/CharacterDemoPage.jsx'));
const CharacterLab = lazy(() => import('./avatar/character/CharacterLab.jsx'));
export default function AppRoutes() {
  const demo = new URLSearchParams(window.location.search).get('demo');
  if (demo === 'elena') return <Suspense fallback={null}><CharacterLab /></Suspense>;
  if (demo === 'characters') return <Suspense fallback={null}><CharacterDemoPage /></Suspense>;
  return <App />;
}
