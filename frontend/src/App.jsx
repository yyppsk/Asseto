import { useEffect } from 'react';
import { EnvironmentControls } from './components/EnvironmentControls.jsx';
import { LoadingScreen } from './components/LoadingScreen.jsx';
import { RaceHud } from './components/RaceHud.jsx';
import { RouteNavigation } from './components/RouteNavigation.jsx';
import { StoryPanels } from './components/StoryPanels.jsx';
import { initRaceExperience } from './raceExperience.js';

export function App() {
  useEffect(() => initRaceExperience(), []);

  return (
    <div id="app" className="relative min-h-screen text-paper">
      <canvas id="race-canvas" aria-label="Scroll-driven Spa-Francorchamps race scene"></canvas>
      <RouteNavigation />
      <EnvironmentControls />
      <StoryPanels />
      <RaceHud />
      <LoadingScreen />
    </div>
  );
}
