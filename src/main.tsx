import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app/App';
import { readConfig } from './app/config';
import { createAppServices } from './app/services';

const config = readConfig(import.meta.env, window.location.origin);
const services = createAppServices(config);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
);
