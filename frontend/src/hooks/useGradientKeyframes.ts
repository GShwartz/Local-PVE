import { useEffect } from 'react';

const STYLE_ID = 'abtn-gradient-keyframes';

export const useGradientKeyframes = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;

    const styleTag = document.createElement('style');
    styleTag.id = STYLE_ID;
    styleTag.type = 'text/css';
    styleTag.textContent = `
      @keyframes abtn_bar_sweep {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(300%); }
      }
      @keyframes abtn_bar_gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(styleTag);
  }, []);
};
