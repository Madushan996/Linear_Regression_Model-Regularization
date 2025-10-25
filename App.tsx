
import React from 'react';
import InteractivePlayground from './components/InteractivePlayground';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
            Model Generalization & Regularization
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
            An interactive guide to understanding how models learn, fail, and can be improved with regularization.
          </p>
        </header>
        
        <InteractivePlayground />

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Built to demonstrate core machine learning concepts.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
