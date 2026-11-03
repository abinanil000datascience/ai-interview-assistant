import { useState } from 'react';
import SetupScreen from './components/SetupScreen';
import Interviewer from './components/Interviewer';

function App() {
  const [isReady, setIsReady] = useState(false);

  return (
    <div>
      {!isReady ? (
        <SetupScreen onSetupComplete={() => setIsReady(true)} />
      ) : (
        <Interviewer />
      )}
    </div>
  );
}

export default App;