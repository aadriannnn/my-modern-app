import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, BookOpen, Award, Check, Shuffle } from 'lucide-react';
import Header from '../components/Header';

interface Question {
    id: string; // Unique ID for keying
    questionText: string;
    correctAnswer: string;
    wrongAnswer1: string;
    wrongAnswer2: string;
    caseName: string;
    caseId: number;
}

interface AnsweredQuestion extends Question {
    selectedAnswer: string;
    isCorrect: boolean;
}

const GridTestsPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [step, setStep] = useState<'setup' | 'quiz' | 'results'>('setup');

    // Data from navigation
    const sourceCases = (location.state as { results?: any[] })?.results || [];

    // State
    const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
    const [selectedCaseCount, setSelectedCaseCount] = useState<number>(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({}); // valid -> selectedAnswer
    const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

    // Extract questions from cases on mount
    useEffect(() => {
        if (!sourceCases || sourceCases.length === 0) {
            return;
        }

        const extracted: Question[] = [];

        sourceCases.forEach((c: any) => {
            // Data might be flat or in 'data' prop depending on search result structure
            const data = c.data || c;

            // We expect 5 questions per case
            const questionKeys = ['unu', 'doi', 'trei', 'patru', 'cinci'];

            questionKeys.forEach((key) => {
                // Construct field names based on the user provided pattern
                // "intrebari_doctrina_unu", "raspund_doctrina_corect_unu", "raspund_doctrina_fals_unu_doi", etc
                // careful with suffixes. User example:
                // intrebari_doctrina_unu
                // raspund_doctrina_corect_unu
                // raspund_doctrina_fals_unu_doi  <-- this seems to be correct based on request?
                // Wait, the user wrote: "raspund_doctrina_fals_unu_doi", "raspund_doctrina_fals_unu_trei"

                // Let's normalize the key generation.
                const qField = `intrebari_doctrina_${key}`;
                const correctField = `raspund_doctrina_corect_${key}`;
                // False answers seem to have variations in suffix?
                // Let's assume a pattern or check existence.
                // User example:
                // 1: fals_unu_doi, fals_unu_trei
                // 2: fals_doi_doi, fals_doi_trei
                // 3: fals_trei_doi, fals_trei_trei
                // 4: fals_patru_doi, fals_patru_trei
                // 5: fals_cinci_doi, fals_cinci_trei

                // It seems the pattern is `raspund_doctrina_fals_${key}_doi` and `raspund_doctrina_fals_${key}_trei`

                const wrong1Field = `raspund_doctrina_fals_${key}_doi`;
                const wrong2Field = `raspund_doctrina_fals_${key}_trei`;

                if (data[qField] && data[correctField]) {
                    extracted.push({
                        id: `${c.id}-${key}`,
                        questionText: data[qField],
                        correctAnswer: data[correctField],
                        wrongAnswer1: data[wrong1Field] || "Răspuns greșit 1 indisponibil",
                        wrongAnswer2: data[wrong2Field] || "Răspuns greșit 2 indisponibil",
                        caseName: data.denumire || `Speta #${c.id}`,
                        caseId: c.id
                    });
                }
            });
        });

        setAvailableQuestions(extracted);
        // Default to max cases (approx questions / 5)
        // Actually user wants to select number of CASES, not questions directly?
        // "sa ii dea posibilitatea sa micsoreze numarul de spete"
        const uniqueCases = new Set(extracted.map(q => q.caseId)).size;
        setSelectedCaseCount(uniqueCases);
    }, [sourceCases]);

    // Start Quiz
    const handleStartQuiz = () => {
        if (selectedCaseCount <= 0) return;

        // Group questions by case
        const questionsByCase: Record<number, Question[]> = {};
        availableQuestions.forEach(q => {
            if (!questionsByCase[q.caseId]) questionsByCase[q.caseId] = [];
            questionsByCase[q.caseId].push(q);
        });

        // Randomly select N cases
        const allCaseIds = Object.keys(questionsByCase).map(Number);
        const shuffledCaseIds = [...allCaseIds].sort(() => 0.5 - Math.random());
        const selectedIds = shuffledCaseIds.slice(0, selectedCaseCount);

        // Flatten questions from selected cases
        let finalQuestions: Question[] = [];
        selectedIds.forEach(id => {
            finalQuestions = [...finalQuestions, ...questionsByCase[id]];
        });

        // Shuffle questions order? User said "afisate pe rand inteligent". Random shuffle is standard.
        finalQuestions = finalQuestions.sort(() => 0.5 - Math.random());

        setQuizQuestions(finalQuestions);
        setStep('quiz');
        setCurrentQuestionIndex(0);
        setAnswers({});
    };

    // Memoize shuffled options for current question so they don't re-shuffle on re-render
    useEffect(() => {
        if (step === 'quiz' && quizQuestions[currentQuestionIndex]) {
            const q = quizQuestions[currentQuestionIndex];
            const opts = [q.correctAnswer, q.wrongAnswer1, q.wrongAnswer2];
            setShuffledOptions(opts.sort(() => 0.5 - Math.random()));
        }
    }, [step, currentQuestionIndex, quizQuestions]);

    const handleAnswerSelect = (option: string) => {
        const q = quizQuestions[currentQuestionIndex];
        setAnswers(prev => ({ ...prev, [q.id]: option }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setStep('results');
        }
    };

    // Render Setup
    if (step === 'setup') {
        const maxCases = new Set(availableQuestions.map(q => q.caseId)).size;

        if (availableQuestions.length === 0) {
            return (
                <div className="min-h-screen bg-brand-light flex flex-col">
                    <Header />
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nu am găsit grile disponibile</h2>
                        <p className="text-gray-600 mb-6">Rezultele căutării curente nu conțin întrebări de doctrină.</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-dark transition-colors"
                        >
                            Înapoi la rezultate
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-brand-light flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="bg-brand-accent p-6 text-center">
                            <BookOpen className="w-12 h-12 text-white mx-auto mb-3" />
                            <h1 className="text-2xl font-bold text-white">Teste Grilă Doctrină</h1>
                            <p className="text-blue-100 mt-2">Verifică-ți cunoștințele din spețele găsite</p>
                        </div>

                        <div className="p-8">
                            <div className="mb-8 text-center pt-2">
                                <span className="text-4xl font-bold text-brand-text">{availableQuestions.length}</span>
                                <p className="text-gray-500 text-sm uppercase tracking-wide font-semibold mt-1">Întrebări Disponibile</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Număr de spețe pentru testare:
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max={maxCases}
                                            value={selectedCaseCount}
                                            onChange={(e) => setSelectedCaseCount(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                                        />
                                        <span className="font-bold text-brand-accent text-xl w-8 text-center">
                                            {selectedCaseCount}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        Se vor extrage ~{selectedCaseCount * 5} întrebări (5 per speță)
                                    </p>
                                </div>

                                <button
                                    onClick={handleStartQuiz}
                                    className="w-full py-4 bg-gradient-to-r from-brand-accent to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-lg flex items-center justify-center gap-2"
                                >
                                    <Shuffle className="w-5 h-5" />
                                    Începe Testul
                                </button>

                                <button
                                    onClick={() => navigate(-1)}
                                    className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700 transition-colors"
                                >
                                    Anulează
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render Quiz
    if (step === 'quiz') {
        const question = quizQuestions[currentQuestionIndex];
        const selected = answers[question.id];
        const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                {/* Simple Header for Quiz Mode */}
                <div className="bg-white shadow-sm p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-brand-text font-bold">
                        <span className="w-8 h-8 flex items-center justify-center bg-brand-light rounded-full text-brand-accent text-sm">
                            {currentQuestionIndex + 1}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-500 text-sm">{quizQuestions.length}</span>
                    </div>
                    <button onClick={() => { if (confirm("Ești sigur că vrei să renunți?")) navigate(-1); }} className="text-gray-400 hover:text-red-500">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-gray-200">
                    <div
                        className="h-full bg-brand-accent transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex-1 flex flex-col justify-center p-4 sm:p-6 max-w-3xl mx-auto w-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 md:p-8">
                            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold uppercase rounded-full mb-4">
                                Întrebare de doctrină
                            </span>

                            <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed mb-8">
                                {question.questionText}
                            </h3>

                            <div className="space-y-3">
                                {shuffledOptions.map((option, idx) => {
                                    const isSelected = selected === option;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerSelect(option)}
                                            className={`w-full p-5 text-left rounded-xl border-2 transition-all duration-200 flex items-start gap-3 group
                                            ${isSelected
                                                    ? 'border-brand-accent bg-brand-light/30 shadow-md'
                                                    : 'border-gray-100 hover:border-brand-accent/50 hover:bg-gray-50'
                                                }
                                        `}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors
                                            ${isSelected ? 'border-brand-accent bg-brand-accent' : 'border-gray-300 group-hover:border-brand-accent'}
                                        `}>
                                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                            <span className={`text-base font-medium ${isSelected ? 'text-brand-text' : 'text-gray-600'}`}>
                                                {option}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 flex justify-end border-t border-gray-100">
                            <button
                                onClick={handleNext}
                                disabled={!selected}
                                className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform
                                ${selected
                                        ? 'bg-brand-accent text-white shadow-lg hover:bg-brand-accent-dark hover:-translate-y-0.5'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }
                            `}
                            >
                                {currentQuestionIndex === quizQuestions.length - 1 ? 'Finalizează' : 'Următoarea'}
                                {currentQuestionIndex !== quizQuestions.length - 1 && <ArrowLeft className="w-5 h-5 rotate-180" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render Results
    if (step === 'results') {
        let score = 0;
        const wrongAnswers: AnsweredQuestion[] = [];

        quizQuestions.forEach(q => {
            const selected = answers[q.id];
            const isCorrect = selected === q.correctAnswer;
            if (isCorrect) score++;
            else {
                wrongAnswers.push({ ...q, selectedAnswer: selected, isCorrect: false });
            }
        });

        const percentage = Math.round((score / quizQuestions.length) * 100);

        // Determine medal/color
        let message = "Mai încearcă!";
        let colorClass = "text-red-500";

        if (percentage >= 90) { message = "Excelent!"; colorClass = "text-green-500"; }
        else if (percentage >= 70) { message = "Foarte Bine!"; colorClass = "text-blue-500"; }
        else if (percentage >= 50) { message = "Bine!"; colorClass = "text-yellow-500"; }

        return (
            <div className="min-h-screen bg-brand-light flex flex-col">
                <Header />
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Score Card */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden text-center p-8 md:p-12 relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"></div>

                            <Award className={`w-20 h-20 mx-auto mb-4 ${colorClass}`} />

                            <h1 className="text-4xl md:text-5xl font-black text-brand-text mb-2">{percentage}%</h1>
                            <p className={`text-xl font-bold mb-6 ${colorClass}`}>{message}</p>

                            <div className="inline-flex items-center gap-8 bg-gray-50 px-8 py-4 rounded-2xl">
                                <div>
                                    <span className="block text-2xl font-bold text-green-600">{score}</span>
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Corecte</span>
                                </div>
                                <div className="w-px h-10 bg-gray-200"></div>
                                <div>
                                    <span className="block text-2xl font-bold text-red-500">{quizQuestions.length - score}</span>
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Greșite</span>
                                </div>
                            </div>
                        </div>

                        {/* Review Section */}
                        {wrongAnswers.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-brand-text px-2">Recapitulare Răspunsuri Greșite</h2>
                                {wrongAnswers.map((q, idx) => (
                                    <div key={idx} className="bg-white rounded-xl shadow-sm border-l-4 border-red-400 p-6">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <h3 className="font-bold text-gray-800 text-lg">{q.questionText}</h3>
                                            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded">
                                                Grila #{idx + 1}
                                            </span>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                                <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1">
                                                    <XCircle className="w-4 h-4" /> Răspunsul tău:
                                                </div>
                                                <p className="text-red-900">{q.selectedAnswer || "Nu ai răspuns"}</p>
                                            </div>

                                            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                                <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-1">
                                                    <CheckCircle className="w-4 h-4" /> Răspuns corect:
                                                </div>
                                                <p className="text-green-900">{q.correctAnswer}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg inline-flex">
                                            <BookOpen className="w-4 h-4" />
                                            Sursa: <span className="font-semibold text-brand-text">{q.caseName}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-center gap-4 pt-4 pb-12">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-8 py-3 bg-white border-2 border-brand-accent text-brand-accent font-bold rounded-xl hover:bg-brand-accent hover:text-white transition-all shadow-sm"
                            >
                                Înapoi la Căutare
                            </button>
                            <button
                                onClick={handleStartQuiz}
                                className="px-8 py-3 bg-brand-accent text-white font-bold rounded-xl hover:bg-brand-accent-dark transition-all shadow-lg"
                            >
                                Repetă Testul
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    return <div>Loading...</div>;
};

export default GridTestsPage;
