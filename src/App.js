import './App.css';
import VegaReactComponent from './weatherwiz';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Weather Data Visualization</h1>
      </header>
      <main>
        <VegaReactComponent />
      </main>
    </div>
  );
}

export default App;
