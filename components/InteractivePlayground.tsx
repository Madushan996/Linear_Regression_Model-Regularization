
import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Scatter, ResponsiveContainer } from 'recharts';
import { DataPoint, RegularizationType } from '../types';

// --- SERVICE/HELPER FUNCTIONS ---
// These functions contain the "model" logic.

const trueFunction = (x: number) => Math.sin(x * Math.PI * 0.5);

const generateTrainingData = (numPoints: number, noiseLevel: number, seed: number): DataPoint[] => {
    const data: DataPoint[] = [];
    // Basic pseudo-random generator for consistent "randomness" based on seed
    let currentSeed = seed;
    const pseudoRandom = () => {
        const x = Math.sin(currentSeed++) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i < numPoints; i++) {
        const x = -2 + (4 * i) / (numPoints - 1);
        const noise = (pseudoRandom() - 0.5) * noiseLevel * 2;
        const y = trueFunction(x) + noise;
        data.push({ x, y });
    }
    return data;
};


const getLineData = (model: (x: number) => number, domain: [number, number], steps: number): DataPoint[] => {
    const data: DataPoint[] = [];
    const stepSize = (domain[1] - domain[0]) / steps;
    for (let i = 0; i <= steps; i++) {
        const x = domain[0] + i * stepSize;
        const y = model(x);
        data.push({ x, y });
    }
    return data;
};

const calculateModelFunction = (
    data: DataPoint[], 
    complexity: number, 
    regType: RegularizationType, 
    regStrength: number, 
    noise: number
): { model: (x: number) => number; description: string } => {
    
    // Underfitting Case: Simple Linear Regression
    if (complexity <= 1) {
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = data.length;
        data.forEach(({ x, y }) => {
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        });
        const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const b = (sumY - m * sumX) / n;
        const model = (x: number) => m * x + b;
        const description = "Underfitting: The model is too simple (a straight line) and cannot capture the underlying curved trend in the data, resulting in high error on both training and new data.";
        return { model, description };
    }

    // Overfitting & Regularization Case
    const baseOverfitModel = (x: number) => {
        // A high-frequency sine wave is used to simulate the "wiggles" of a high-degree polynomial
        const wiggle = noise * 0.7 * Math.sin(x * Math.PI * complexity / 2);
        return trueFunction(x) + wiggle;
    };
    
    let model: (x: number) => number;
    let description: string;

    switch (regType) {
        case RegularizationType.L1:
            model = (x: number) => {
                const wiggle = noise * 0.7 * Math.sin(x * Math.PI * complexity / 2);
                // Soft-thresholding operator to simulate L1's feature selection
                const regularizedWiggle = Math.sign(wiggle) * Math.max(0, Math.abs(wiggle) - regStrength * 0.05);
                return trueFunction(x) + regularizedWiggle;
            };
            description = "L1 Regularization (Lasso) is applied. It penalizes the absolute size of coefficients. Notice how it can shrink the 'wiggles' (analogous to coefficients) to exactly zero, simplifying the model and performing feature selection.";
            if (regStrength === 0) description = "Overfitting: The model is overly complex. It learns the noise in the training data, not just the signal. This model will perform poorly on new, unseen data because it has memorized the training set's quirks.";
            break;
        case RegularizationType.L2:
             model = (x: number) => {
                const wiggle = noise * 0.7 * Math.sin(x * Math.PI * complexity / 2);
                // Shrinking factor to simulate L2's coefficient decay
                const regularizedWiggle = wiggle / (1 + regStrength * 0.5);
                return trueFunction(x) + regularizedWiggle;
            };
            description = "L2 Regularization (Ridge) is applied. It penalizes the squared size of coefficients. It shrinks the 'wiggles' towards zero but rarely makes them exactly zero, preventing any single feature from dominating.";
            if (regStrength === 0) description = "Overfitting: The model is overly complex. It learns the noise in the training data, not just the signal. This model will perform poorly on new, unseen data because it has memorized the training set's quirks.";
            break;
        default: // None
            model = baseOverfitModel;
            if (complexity > 5) {
                description = "Overfitting: The model is overly complex. It learns the noise in the training data, not just the signal. This model will perform poorly on new, unseen data because it has memorized the training set's quirks.";
            } else {
                description = "Good Fit: The model complexity is appropriate for the data. It captures the underlying trend without fitting the noise, achieving good generalization.";
            }
    }
    
    if (regStrength > 0 && regType !== RegularizationType.None) {
        if (complexity <= 5) {
             description += " With a low-complexity model, regularization has a smaller effect but still helps prevent overfitting."
        } else {
             description += " The regularization penalty effectively smooths the overfitted curve, leading to better generalization on unseen data."
        }
    }


    return { model, description };
};


// --- CUSTOM HOOK ---
// Manages all the state and derived data for the playground
const useModelData = () => {
    const [complexity, setComplexity] = useState(10);
    const [noise, setNoise] = useState(0.5);
    const [regType, setRegType] = useState<RegularizationType>(RegularizationType.None);
    const [regStrength, setRegStrength] = useState(0.0);
    const [dataSeed, setDataSeed] = useState(1);

    const trainingData = useMemo(() => {
        return generateTrainingData(30, noise, dataSeed);
    }, [noise, dataSeed]);

    const trueLine = useMemo(() => {
        return getLineData(trueFunction, [-2, 2], 100);
    }, []);

    const { model, description } = useMemo(() => {
        return calculateModelFunction(trainingData, complexity, regType, regStrength, noise);
    }, [trainingData, complexity, regType, regStrength, noise]);

    const modelLine = useMemo(() => {
        return getLineData(model, [-2, 2], 100);
    }, [model]);
    
    const regenerateData = useCallback(() => {
        setDataSeed(s => s + 1);
    }, []);

    return {
        complexity, setComplexity,
        noise, setNoise,
        regType, setRegType,
        regStrength, setRegStrength,
        trainingData,
        trueLine,
        modelLine,
        description,
        regenerateData,
    };
};


// --- UI COMPONENTS ---
// These are defined outside the main component to prevent re-creation on every render

interface ControlPanelProps {
    complexity: number;
    setComplexity: (v: number) => void;
    noise: number;
    setNoise: (v: number) => void;
    regType: RegularizationType;
    setRegType: (t: RegularizationType) => void;
    regStrength: number;
    setRegStrength: (v: number) => void;
    regenerateData: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    complexity, setComplexity, noise, setNoise, regType, setRegType, regStrength, setRegStrength, regenerateData
}) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl space-y-6">
        <div>
            <div className="flex justify-between items-center text-gray-300 mb-2">
                <label htmlFor="complexity" className="font-medium">Model Complexity</label>
                <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">{complexity}</span>
            </div>
            <input id="complexity" type="range" min="1" max="20" step="1" value={complexity}
                onChange={(e) => setComplexity(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
        </div>
        <div>
            <div className="flex justify-between items-center text-gray-300 mb-2">
                <label htmlFor="noise" className="font-medium">Data Noise</label>
                <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">{noise.toFixed(2)}</span>
            </div>
            <input id="noise" type="range" min="0" max="1" step="0.05" value={noise}
                onChange={(e) => setNoise(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
        </div>
        <div>
            <label className="font-medium text-gray-300 mb-3 block">Regularization Type</label>
            <div className="grid grid-cols-3 gap-2">
                {(Object.values(RegularizationType)).map(type => (
                    <button key={type} onClick={() => setRegType(type)}
                        className={`px-3 py-2 text-sm rounded-md transition-colors font-semibold ${regType === type ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>
        </div>
        <div>
            <div className="flex justify-between items-center text-gray-300 mb-2">
                <label htmlFor="regStrength" className="font-medium">Regularization Strength (α)</label>
                <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">{regStrength.toFixed(2)}</span>
            </div>
            <input id="regStrength" type="range" min="0" max="10" step="0.1" value={regStrength}
                onChange={(e) => setRegStrength(parseFloat(e.target.value))}
                disabled={regType === RegularizationType.None}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>
        <button onClick={regenerateData} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Regenerate Data
        </button>
    </div>
);


interface ModelChartProps {
    trainingData: DataPoint[];
    modelLine: DataPoint[];
    trueLine: DataPoint[];
}

const ModelChart: React.FC<ModelChartProps> = ({ trainingData, modelLine, trueLine }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-xl aspect-w-16 aspect-h-9 min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="x" type="number" domain={[-2, 2]} tick={{ fill: '#A0AEC0' }} />
                <YAxis domain={[-2, 2]} tick={{ fill: '#A0AEC0' }} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568', color: '#CBD5E0' }}
                    labelStyle={{ color: '#E2E8F0' }}
                    itemStyle={{ color: '#CBD5E0' }}
                />
                <Legend wrapperStyle={{ color: '#A0AEC0' }} />
                <Scatter name="Training Data" data={trainingData} fill="#4299E1" shape="circle" />
                <Line name="True Function" dataKey="y" data={trueLine} stroke="#718096" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line name="Model" dataKey="y" data={modelLine} stroke="#9F7AEA" strokeWidth={3} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);


interface ExplanationPanelProps {
    description: string;
}

const ExplanationPanel: React.FC<ExplanationPanelProps> = ({ description }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg ring-1 ring-gray-700">
        <h3 className="text-xl font-semibold text-purple-400 mb-3">What's Happening?</h3>
        <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
);


// --- MAIN COMPONENT ---

const InteractivePlayground: React.FC = () => {
    const modelProps = useModelData();
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                <ControlPanel {...modelProps} />
                <ExplanationPanel description={modelProps.description} />
            </div>
            <div className="lg:col-span-2">
                <ModelChart
                    trainingData={modelProps.trainingData}
                    modelLine={modelProps.modelLine}
                    trueLine={modelProps.trueLine}
                />
            </div>
        </div>
    );
};

export default InteractivePlayground;
