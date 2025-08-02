import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const isProd = window.location.hostname !== 'localhost';

export const appInsights = new ApplicationInsights({
  config: {
    connectionString: isProd ? import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING : undefined,
    disableTelemetry: !isProd
  }
});

if (isProd) {
  appInsights.loadAppInsights();
}