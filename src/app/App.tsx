import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { AppServicesContext } from './appContext';
import { routerBasename } from './config';
import type { AppServices } from './services';
import { SessionRoot } from './SessionRoot';

export function App({ services }: { services: AppServices }) {
  return (
    <AppServicesContext.Provider value={services}>
      <QueryClientProvider client={services.queryClient}>
        <BrowserRouter basename={routerBasename(services.config.basePath)}>
          <SessionRoot />
        </BrowserRouter>
      </QueryClientProvider>
    </AppServicesContext.Provider>
  );
}
