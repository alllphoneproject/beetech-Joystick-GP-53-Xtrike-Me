import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { startVibrationHum, stopVibrationHum, playClickSound } from '../utils/audio';
import {
  Volume2,
  VolumeX,
  Languages,
  RotateCcw,
  Zap,
  Activity,
  Play,
  Tv,
  Power,
  Sliders,
  Sparkles,
  Compass
} from 'lucide-react';

export const UIOverlay: React.FC = () => {
  const {
    language,
    setLanguage,
    deviceState,
    setDeviceState,
    lightOn,
    setLightOn,
    soundOn,
    setSoundOn,
    logs,
    clearLogs,
    tutorialMode,
    setTutorialMode,
    setTutorialStep,
    addLog
  } = useAppContext();

  const isHebrew = language === 'he';
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Scroll interactive terminal logs down when new events register
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle physical synthesizer sound hum sync during vibration tests
  useEffect(() => {
    if (deviceState === 'vibrating') {
      if (soundOn) {
        startVibrationHum();
      } else {
        stopVibrationHum();
      }
    } else {
      stopVibrationHum();
    }
    return () => stopVibrationHum();
  }, [deviceState, soundOn]);

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'he' : 'en';
    setLanguage(nextLang);
    addLog(
      `Language switched to: ${nextLang === 'en' ? 'English' : 'Hebrew'}`,
      `שפת ממשק שונתה לעברית`
    );
    if (soundOn) playClickSound();
  };

  const handleVibrationTest = () => {
    if (deviceState === 'off') {
      addLog('Turn controller ON before testing vibration motors', 'אנא הפעילו את הבקר לפני הפעלת הרטט');
      return;
    }
    if (deviceState === 'vibrating') {
      setDeviceState('idle');
      addLog('Haptic vibration motors disabled', 'מנועי רטט האפטי כובו');
    } else {
      setDeviceState('vibrating');
      addLog('TRIGGER HAPTIC TEST: Vibration motors running at 55Hz', 'בדיקת רטט הופעלה: מנועים רוטטים בתדר 55Hz');
    }
    if (soundOn) playClickSound();
  };

  const handleRestartTutorial = () => {
    setTutorialStep(0);
    setTutorialMode(true);
    addLog('Interactive walk-through tour restarted', 'סיור ההדרכה האינטראקטיבי הופעל מחדש');
    if (soundOn) playClickSound();
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-30 select-none"
      dir={isHebrew ? 'rtl' : 'ltr'}
    >
      {/* 1. TOP DOCKS: LOGO, SOUNDS, LANG */}
      <header className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center w-full">
        {/* Logo Shield */}
        <div className="flex items-center gap-3 glassmorphism px-4 py-2.5 rounded-xl pointer-events-auto shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] glowing-green-shadow pulsing-led" />
          <div className="flex flex-col">
            <h1 className="font-display font-black text-xs md:text-sm tracking-widest text-white leading-tight uppercase">
              GP-53 XTRIKE ME
            </h1>
            <span className="font-mono text-[8px] text-gray-500 tracking-wider">
              {isHebrew ? 'דגם סימולציה תלת-ממדי פרו' : '3D PRO SIMULATOR'}
            </span>
          </div>
        </div>

        {/* Global UI Toggle bar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Sound toggle button */}
          <button
            onClick={() => {
              setSoundOn(!soundOn);
              addLog(`Synthesizer audio: ${!soundOn ? 'ENABLED' : 'MUTED'}`, `משוב קולי מכני: ${!soundOn ? 'פעיל' : 'מושתק'}`);
            }}
            className={`p-2.5 rounded-xl transition-all duration-300 border ${
              soundOn 
                ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80] glowing-green-shadow' 
                : 'bg-[#111315]/80 border-white/5 text-gray-500 hover:text-white'
            }`}
            title={isHebrew ? 'משוב קולי' : 'Keyboard sound FX'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Language selection button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#111315]/80 hover:bg-white/5 text-gray-300 hover:text-white border border-white/5 rounded-xl font-mono text-[10.5px] transition-all duration-300"
          >
            <Languages className="w-4 h-4 text-[#4ade80]" />
            <span>{isHebrew ? 'English' : 'עברית'}</span>
          </button>

          {/* Replay Tutorial help */}
          <button
            onClick={handleRestartTutorial}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#4ade80]/10 hover:bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/20 rounded-xl font-mono text-[10.5px] font-bold tracking-wide transition-all "
          >
            <Sparkles className="w-4 h-4" />
            <span>{isHebrew ? 'הדרכה' : 'Tutorial'}</span>
          </button>
        </div>
      </header>

      {/* 2. MIDDLE FLOATING CONTROLS (SIMULATED CONTROL BOARD AND DIAGNOSTICS) */}
      <div className="flex flex-col md:flex-row gap-4 w-full justify-between items-end mt-auto pointer-events-none">
        
        {/* SIDE BAR: CONTROL DASHBOARD */}
        <div className="w-full md:w-64 glassmorphism p-4 rounded-2xl pointer-events-auto shadow-2xl flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono tracking-wider uppercase border-b border-white/5 pb-2">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isHebrew ? 'מרכז שליטה ובקרה' : 'Active Controller Lab'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Power simulated toggle */}
            <button
              onClick={() => {
                if (deviceState === 'off') {
                  setDeviceState('idle');
                  addLog('Controller powers up', 'הבקר מופעל');
                } else {
                  setDeviceState('off');
                  addLog('Controller shuts down', 'הבקר מכבה פעילות');
                }
                if (soundOn) playClickSound();
              }}
              className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-mono font-medium ${
                deviceState !== 'off' 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{deviceState !== 'off' ? (isHebrew ? 'כבה בקר' : 'Shutdown') : (isHebrew ? 'הדלק בקר' : 'Boot up')}</span>
            </button>

            {/* Vibration Simulated hum button */}
            <button
              onClick={handleVibrationTest}
              className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-mono font-medium ${
                deviceState === 'vibrating' 
                  ? 'bg-emerald-400 text-black border-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]' 
                  : 'bg-[#181a1d] border-white/5 text-gray-300 hover:text-white'
              }`}
            >
              <Activity className={`w-4 h-4 ${deviceState === 'vibrating' ? 'animate-bounce' : ''}`} />
              <span>{isHebrew ? 'מנוע האפטי' : 'Vibe Engine'}</span>
            </button>
          </div>

          <div className="space-y-2 mt-1.5">
            {/* Light LED Toggle state info */}
            <div className="flex justify-between items-center bg-[#15171a] p-2 rounded-lg border border-white/5 font-mono text-[10px]">
              <span className="text-gray-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${lightOn ? 'bg-emerald-400' : 'bg-gray-600'}`}></span>
                {isHebrew ? 'תאורת LED בגב' : 'Backlight Slider'}
              </span>
              <span className={lightOn ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
                {lightOn ? (isHebrew ? 'דולק / פעיל' : 'ENABLED') : (isHebrew ? 'כבוי' : 'MUTED')}
              </span>
            </div>

            {/* Turbo status */}
            <div className="flex justify-between items-center bg-[#15171a] p-2 rounded-lg border border-white/5 font-mono text-[10px]">
              <span className="text-gray-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#4ade80]" />
                {isHebrew ? 'מצב טורבו מהיר' : 'Turbo Rapid Mode'}
              </span>
              <span className={deviceState === 'turbo' ? 'text-amber-400 font-bold' : 'text-gray-500'}>
                {deviceState === 'turbo' ? (isHebrew ? 'פעיל 120Hz' : 'ACTIVE') : (isHebrew ? 'לא זמין' : 'DISENGAGED')}
              </span>
            </div>
          </div>
        </div>

        {/* TERMINAL SCROLLING CONSOLE */}
        <div className="w-full md:max-w-md flex-1 glassmorphism p-4 rounded-2xl pointer-events-auto shadow-2xl flex flex-col gap-2.5 h-[162px]">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/5 pb-2 text-xs">
            <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px] tracking-wide uppercase">
              <Tv className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isHebrew ? 'פעילות וקלט חומרה' : 'Interactive Event Signals'}</span>
            </div>
            <button
              onClick={clearLogs}
              className="text-[9px] font-mono text-gray-500 hover:text-white transition-all bg-white/5 border border-white/5 px-2 py-0.5 rounded"
            >
              {isHebrew ? 'נקה' : 'Clear'}
            </button>
          </div>

          {/* Log events list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[9.5px]">
            {logs.length === 0 ? (
              <div className="text-gray-600 italic text-center py-4">
                {isHebrew ? 'ממתין לפעולות קלט...' : 'Waiting for hardware signals...'}
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2 text-gray-400 border-l border-[#4ade80]/10 pl-2">
                  <span className="text-gray-600 shrink-0 select-none">{log.timestamp}</span>
                  <span className="text-emerald-400 shrink-0">::</span>
                  <span className="text-gray-200">
                    {isHebrew ? log.textHe : log.textEn}
                  </span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>

      </div>

      {/* 3. CAM CONTROL GUIDE BAR (HUD bottom footer layout) */}
      <footer className="w-full text-center mt-4">
        <div className="inline-flex items-center gap-2 bg-[#111315]/75 border border-white/10 px-3 py-1.5 rounded-full text-[9px] font-mono text-gray-400">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
          <span>
            {isHebrew 
              ? 'לחצו וגררו את העכבר כדי לסובב | השתמשו בגלגלת כדי להגדיל' 
              : 'Drag mouse to rotate device | Scroll wheel to zoom in & out'
            }
          </span>
        </div>
      </footer>
    </div>
  );
};
