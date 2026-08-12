import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { installGlobalApi } from './agent/globalApi';
import './app/app.css';
// El CSS de impresión es global y va el último: sus `!important` deben ganar.
import './cv/print.css';

// `window.cvBuilder`: la capa de comandos accesible desde la consola y desde
// cualquier puente agente↔web (CLAUDE.md §5.3 y §8).
installGlobalApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
