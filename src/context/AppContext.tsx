import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, DeviceState, HotspotInfo, TutorialStep, DisplayMode } from '../types';

export interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  deviceState: DeviceState;
  setDeviceState: (state: DeviceState) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  activeHotspot: string | null;
  setActiveHotspot: (id: string | null) => void;
  tutorialMode: boolean;
  setTutorialMode: (active: boolean) => void;
  tutorialStep: number;
  setTutorialStep: (step: number) => void;
  lightOn: boolean;
  setLightOn: (on: boolean) => void;
  soundOn: boolean;
  setSoundOn: (on: boolean) => void;
  logs: Array<{ id: string; timestamp: string; textEn: string; textHe: string }>;
  addLog: (textEn: string, textHe: string) => void;
  clearLogs: () => void;
  hotspots: HotspotInfo[];
  tutorialSteps: TutorialStep[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const hotspotsData: HotspotInfo[] = [
  {
    id: 'touchpad',
    nameEn: 'Embedded Touchpad',
    nameHe: 'משטח מגע מובנה',
    descEn: 'Capacitive touch panel for swipe gestures, cursor manipulation, and secondary interactions.',
    descHe: 'לוח מגע קפסיטיבי למחוות החלקה, שליטה בסמן ואינטראקציות משניות.',
    position: [0, 0.5, 0.4], // Relative center top-front
  },
  {
    id: 'left_stick',
    nameEn: 'Left Analog Stick',
    nameHe: 'ג׳ויסטיק אנלוגי שמאלי',
    descEn: 'Ultra-durable, high-precision thumbstick with texturized ergonomic outer grip ring.',
    descHe: 'סטיק אנלוגי שמאלי עמיד ומדויק במיוחד, עם טבעת אחיזה ארגונומית מחוספסת.',
    position: [-0.9, -0.2, 0.45],
  },
  {
    id: 'right_stick',
    nameEn: 'Right Analog Stick',
    nameHe: 'ג׳ויסטיק אנלוגי ימני',
    descEn: 'Precision joystick positioned for natural ergonomic thumb alignment and camera tracking.',
    descHe: 'סטיק אנלוגי ימני ממוקם בארגונומיקה מושלמת למעקב מצלמה וכיוון נוח.',
    position: [0.9, -0.2, 0.45],
  },
  {
    id: 'dpad',
    nameEn: 'D-Pad Cross Key',
    nameHe: 'מקש צלב כיוונים',
    descEn: 'Tactile directional pad providing responsive physical indexing and strict 4-way isolation.',
    descHe: 'מקשי כיוון (צלב) טקטיליים המספקים משוב מהיר והפרדה מדויקת בין ארבעת הכיוונים.',
    position: [-1.4, 0.5, 0.4],
  },
  {
    id: 'action_buttons',
    nameEn: 'Premium Action Keys',
    nameHe: 'מקשי פעולה ראשיים',
    descEn: 'Four crisp mechanical action buttons featuring unique geometric symbols for clean feedback.',
    descHe: 'ארבעה מקשי פעולה מכניים עם סמלים גיאומטריים ייחודיים למשוב מהיר וחד.',
    position: [1.4, 0.5, 0.4],
  },
  {
    id: 'home_button',
    nameEn: 'Home Mode Selector',
    nameHe: 'לחצן בית ובקרה',
    descEn: 'LED illuminated Home button. Press to wake up the device or toggle mode indicators.',
    descHe: 'לחצן בית מואר ב-LED. לחיצה מעירה את הבקר או מאפשרת מעבר בין מצבי בקרה.',
    position: [0, -0.25, 0.55],
  },
  {
    id: 'turbo_button',
    nameEn: 'Hardware Turbo Key',
    nameHe: 'לחצן טורבו פיזי',
    descEn: 'Enables high-frequency rapid-fire emulation on assigned bumpers and action buttons.',
    descHe: 'מפעיל הדמיית ירי מהיר בתדר גבוה על מקשי הפעולה וההדקים שיוגדרו.',
    position: [0, -0.65, 0.6],
  },
  {
    id: 'light_switch',
    nameEn: 'LED Slide Slider',
    nameHe: 'בורר תאורה פיזי',
    descEn: 'Mechanical slider switch located on the underside to toggle backplate and ambient glow effect.',
    descHe: 'מתג הזזה מכני הממוקם בגב המכשיר להדלקה וכיבוי של תאורת ה-LED והזוהר ההיקפי.',
    position: [0, -0.15, -0.45], // on back!
  },
  {
    id: 'paddles',
    nameEn: 'M1 & M2 Back Paddles',
    nameHe: 'משוטי בקרה M1 & M2',
    descEn: 'Programmable rear macro-triggers situated directly where fingers naturally rest.',
    descHe: 'לחצני מאקרו אחוריים ניתנים לתכנות, ממוקמים בדיוק במקום מנוחת האצבעות.',
    position: [-0.9, -0.3, -0.4], // back grip areas
  },
  {
    id: 'usb_port',
    nameEn: 'USB-C Interface',
    nameHe: 'ממשק טעינה USB-C',
    descEn: 'High-speed interface port for immediate zero-latency wired gameplay and quick battery recharge.',
    descHe: 'חיבור במהירות גבוהה המיועד למשחקיות קווית ללא השהיה וטעינת סוללה מהירה.',
    position: [0, 0.85, -0.2], // top
  }
];

export const tutorialStepsData: TutorialStep[] = [
  {
    id: 'intro',
    titleEn: 'Meet GP-53 Xtrike Me',
    titleHe: 'הכירו את GP-53 Xtrike Me',
    descEn: 'Welcome to the interactive 3D portal of the GP-53 Gamepad controller. Let\'s explore the tactical capabilities of this professional gaming device.',
    descHe: 'ברוכים הבאים לפורטל התלת-ממדי האינטראקטיבי של בקר ה-GP-53. בואו נחקור את היכולות הטקטיות של מכשיר הגיימינג המקצועי הזה.',
    cameraLoc: [0, 1.2, 3.2],
  },
  {
    id: 'step_analogs',
    titleEn: 'Analog Thumbsticks',
    titleHe: 'ג׳ויסטיקים אנלוגיים מדויקים',
    descEn: 'Interact with the heavy-duty Left and Right Analogs. Click and test their simulated range. Check the interactive event logs to see vector angles update in real-time.',
    descHe: 'התנסו בסטיקים האנלוגיים השמאלי והימני. לחצו ובדקו את טווחי התנועה. עקבו אחר יומן הפעילות (Logs) כדי לראות את הנתונים בזמן אמת.',
    hotspotId: 'left_stick',
    cameraLoc: [-0.5, 0.3, 1.8],
  },
  {
    id: 'step_touch',
    titleEn: 'Interactive Touchpad',
    titleHe: 'משטח מגע אינטראקטיבי',
    descEn: 'Positioned right at the center, the capacitive touchpad supports complex navigational workflows.',
    descHe: 'ממוקם בדיוק במרכז הבקר, משטח המגע הקפסיטיבי תומך במחוות וניווט מתקדם.',
    hotspotId: 'touchpad',
    cameraLoc: [0, 0.8, 1.6],
  },
  {
    id: 'step_keys',
    titleEn: 'Tactile Navigation Cross',
    titleHe: 'לחצנים מכניים וצלב',
    descEn: 'The premium D-pad and high-feedback action buttons ensure latency-free input registration during heated matches.',
    descHe: 'לחצני הצלב ומקשי הפעולה המכניים מבטיחים רישום ללא השהיות במהלך קרבות גיימינג סוערים.',
    hotspotId: 'action_buttons',
    cameraLoc: [1.0, 0.5, 1.6],
  },
  {
    id: 'step_switch',
    titleEn: 'Backlighting Slide Switch',
    titleHe: 'מתג תאורה בגב הבקר',
    descEn: 'Rotate the camera to the back to discover the LED light slider. Grab, slide, and experience the glowing visual indicators!',
    descHe: 'סובבו את המצלמה לאחור כדי למצוא את מתג התאורה הפיזי. גררו אותו כדי להדליק או לכבות את שורת הלדים המעוצבת!',
    hotspotId: 'light_switch',
    cameraLoc: [0, 0.3, -2.5],
  },
  {
    id: 'summary',
    titleEn: 'Ready for Battle',
    titleHe: 'מוכן לקרב גיימינג',
    descEn: 'You are now ready. Fire up turbo, trigger realistic haptic vibration tests, toggle the Hebrew or English overlays, and customize your configuration.',
    descHe: 'השלמתם את המדריך בהצלחה. כעת תוכלו להפעיל טורבו, לבצע בדיקת רטט האפטי מציאותית, להחליף שפה ולגלות את הבקר מכל כיוון.',
    cameraLoc: [0, 1.0, 3.0],
  }
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [deviceState, setDeviceState] = useState<DeviceState>('idle');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('interactive');
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [tutorialMode, setTutorialMode] = useState<boolean>(true);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [lightOn, setLightOn] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [logs, setLogs] = useState<Array<{ id: string; timestamp: string; textEn: string; textHe: string }>>([
    {
      id: 'init',
      timestamp: new Date().toLocaleTimeString(),
      textEn: 'GP-53 Xtrike Me Simulator initialized.',
      textHe: 'סימולטור GP-53 Xtrike Me הופעל בהצלחה.'
    }
  ]);

  const addLog = (textEn: string, textHe: string) => {
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      textEn,
      textHe
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 49)]); // keep last 50
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        deviceState,
        setDeviceState,
        displayMode,
        setDisplayMode,
        activeHotspot,
        setActiveHotspot,
        tutorialMode,
        setTutorialMode,
        tutorialStep,
        setTutorialStep,
        lightOn,
        setLightOn,
        soundOn,
        setSoundOn,
        logs,
        addLog,
        clearLogs,
        hotspots: hotspotsData,
        tutorialSteps: tutorialStepsData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
