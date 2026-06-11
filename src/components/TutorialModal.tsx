import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

export const TutorialModal: React.FC = () => {
  const {
    tutorialMode,
    setTutorialMode,
    tutorialStep,
    setTutorialStep,
    tutorialSteps,
    language,
    setActiveHotspot,
    addLog
  } = useAppContext();

  const isHebrew = language === 'he';
  const currentStep = tutorialSteps[tutorialStep];

  // Automate active hotspot focus based on tutorial phase
  useEffect(() => {
    if (tutorialMode && currentStep) {
      if (currentStep.hotspotId) {
        setActiveHotspot(currentStep.hotspotId);
      } else {
        setActiveHotspot(null);
      }
    }
  }, [tutorialStep, tutorialMode, currentStep, setActiveHotspot]);

  if (!tutorialMode || !currentStep) return null;

  const title = isHebrew ? currentStep.titleHe : currentStep.titleEn;
  const description = isHebrew ? currentStep.descHe : currentStep.descEn;

  const handleNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
      addLog(
        `Tutorial advanced to step: ${tutorialStep + 2}`,
        `שלב המדריך התקדם לשלב: ${tutorialStep + 2}`
      );
    } else {
      setTutorialMode(false);
      setActiveHotspot(null);
      addLog('Tutorial completed successfully.', 'מדריך השימוש הושלם בהצלחה.');
    }
  };

  const handlePrev = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const handleSkip = () => {
    setTutorialMode(false);
    setActiveHotspot(null);
    addLog('Tutorial skipped by user.', 'המשתמש דילג על מדריך השימוש.');
  };

  return (
    <div className="fixed inset-x-0 bottom-6 md:bottom-12 flex justify-center items-center z-40 pointer-events-none px-4">
      <div 
        className="w-full max-w-lg glassmorphism p-5 rounded-2xl pointer-events-auto shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/10 relative transition-all duration-300"
        dir={isHebrew ? 'rtl' : 'ltr'}
      >
        {/* Subtle glowing anchor corner */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4ade80]/40 to-transparent rounded-t-full" />

        {/* Header with dismiss button */}
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono select-none">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="tracking-wider uppercase">
              {isHebrew ? 'מדריך סימולציה' : 'SIMULATION TUTORIAL'}
            </span>
            <span className="opacity-40">/</span>
            <span className="text-gray-400 font-bold">
              {tutorialStep + 1} of {tutorialSteps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1 hover:bg-white/5 rounded-full"
            title={isHebrew ? 'סגור' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title & Description */}
        <div className="space-y-1 my-3">
          <h2 className="font-display font-bold text-base md:text-lg text-white leading-tight">
            {title}
          </h2>
          <p className="font-sans text-[11.5px] md:text-xs text-gray-400 leading-relaxed font-normal min-h-[48px]">
            {description}
          </p>
        </div>

        {/* Footer controls & alignment */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/5">
          {/* Progress dots */}
          <div className="flex gap-1.5 items-center">
            {tutorialSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setTutorialStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === tutorialStep 
                    ? 'w-5 bg-[#4ade80] glowing-green-shadow' 
                    : 'w-1.5 bg-gray-600 hover:bg-gray-400'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {tutorialStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-2.5 py-1 text-[10.5px] font-mono text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-0.5"
              >
                {isHebrew ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                {isHebrew ? 'הקודם' : 'Back'}
              </button>
            )}
            
            <button
              onClick={handleSkip}
              className="px-3 py-1 text-[10.5px] font-mono text-gray-500 hover:text-gray-300 transition-colors duration-200"
            >
              {isHebrew ? 'דילג' : 'Skip'}
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-1.5 bg-[#4ade80] hover:bg-[#3ec470] text-[#0f1113] rounded-lg font-mono text-[10.5px] font-bold tracking-wider transition-all duration-200 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(74,222,128,0.25)]"
            >
              <span>
                {tutorialStep === tutorialSteps.length - 1 
                  ? (isHebrew ? 'בואו נתחיל' : 'Finish') 
                  : (isHebrew ? 'הבא' : 'Next')
                }
              </span>
              {tutorialStep !== tutorialSteps.length - 1 && (
                isHebrew ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
