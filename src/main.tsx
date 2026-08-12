import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { installGlobalApi } from './agent/globalApi';
import { installWebMCP } from './agent/webmcp';
import { applyUrlParams } from './app/urlParams';
import './app/app.css';
// El CSS de impresión es global y va el último: sus `!important` deben ganar.
import './cv/print.css';

// `window.cvBuilder`: la capa de comandos accesible desde la consola y desde
// cualquier puente agente↔web (CLAUDE.md §5.3 y §8).
installGlobalApi();

// WebMCP, si el navegador lo trae. Aditivo: si no está, no pasa nada.
installWebMCP();

// ?template=…&theme=…&primary=…  — se aplica antes del primer render para no
// ver un parpadeo del tema anterior.
applyUrlParams();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
