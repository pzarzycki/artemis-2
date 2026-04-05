type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

type GoogleTag = (command: 'event', eventName: string, params?: AnalyticsEventParams) => void;

export function trackAnalyticsEvent(eventName: string, params?: AnalyticsEventParams) {
  if (typeof window === 'undefined') {
    return;
  }

  const gtag = (window as Window & { gtag?: GoogleTag }).gtag;
  if (!gtag) {
    return;
  }

  gtag('event', eventName, params);
}