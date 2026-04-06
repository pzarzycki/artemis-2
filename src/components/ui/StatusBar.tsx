import { useMissionTime } from '../../hooks/useMissionTime';
import { trackAnalyticsEvent } from '../../lib/analytics';
import { useMissionStore } from '../../store/missionStore';
import { projectConfig } from '../../config/project';
import ArtemisLogo from './ArtemisLogo';
import LearnDialog from './LearnDialog';
import SettingsDialog from './SettingsDialog';
import styles from './StatusBar.module.css';

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.actionIcon} aria-hidden="true">
      <path d="M6.8 8.5v8.7M6.8 5.9a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8ZM10.7 8.5v8.7m0-4.8c0-2.1 1.1-3.9 3.2-3.9 1.8 0 2.8 1.2 2.8 3.5v5.2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.actionIcon} aria-hidden="true">
      <path d="M6 5.5l12 13M18 5.5l-4.4 4.8M10.3 13.9 6 18.5" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className={`${styles.actionIcon} ${styles.githubIcon}`} aria-hidden="true">
      <path d="M9.1 18.6c-3 .9-3-1.5-4.2-1.8m8.4 3.6v-2.4c0-.7 0-1.3-.3-1.8 2.8-.3 5.8-1.4 5.8-6.3 0-1.4-.5-2.5-1.3-3.4.1-.3.6-1.6-.1-3.3 0 0-1.1-.3-3.6 1.3a12 12 0 0 0-6.6 0C4.7 2.9 3.6 3.2 3.6 3.2c-.7 1.7-.2 3-.1 3.3A4.9 4.9 0 0 0 2.2 10c0 4.9 3 6 5.8 6.3-.2.5-.3 1-.3 1.8v2.4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className={`${styles.actionIcon} ${styles.starIcon}`} aria-hidden="true">
      <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.5-5-2.6-5 2.6.9-5.5-4-3.9 5.6-.8L12 3.8Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.actionIcon} aria-hidden="true">
      <path d="M21 8.5c0-1.2-.9-2.2-2.1-2.4A58 58 0 0 0 12 5.8a58 58 0 0 0-6.9.3A2.4 2.4 0 0 0 3 8.5v7c0 1.2.9 2.2 2.1 2.4a58 58 0 0 0 6.9.3 58 58 0 0 0 6.9-.3A2.4 2.4 0 0 0 21 15.5v-7Z" />
      <path d="M10.3 9.3v5.4l5-2.7-5-2.7Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function StatusBar() {
  const { utcString, metString } = useMissionTime();
  const mode = useMissionStore((s) => s.mode);
  const activeDialog = useMissionStore((s) => s.activeDialog);
  const openDialog = useMissionStore((s) => s.openDialog);
  const closeDialog = useMissionStore((s) => s.closeDialog);

  const shareText = encodeURIComponent(`${projectConfig.title} | Scientific WebGL mission viewer`);
  const shareUrl = encodeURIComponent(projectConfig.siteUrl);

  const openExternal = (url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openLearnDialog = () => {
    trackAnalyticsEvent('open_learn_dialog', { section: 'sources' });
    openDialog('learn', 'sources');
  };

  const openSettingsDialog = () => {
    trackAnalyticsEvent('open_settings_dialog');
    openDialog('settings');
  };

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.mission}>
          <ArtemisLogo size={28} />
          <span className={styles.name}>ARTEMIS II</span>
        </div>
        <div className={styles.times}>
          <div className={styles.timeItem}>
            <span className={styles.label}>UTC</span>
            <span className={`${styles.value} mono`}>{utcString}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.timeItem}>
            <span className={styles.label}>MET</span>
            <span className={`${styles.value} mono`}>{metString}</span>
          </div>
          {mode === 'live' && (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              LIVE
            </span>
          )}
        </div>
        <div className={styles.status}>

          <button
            type="button"
            className={`${styles.learnBtn} ${styles.tooltipButton}`}
            data-tooltip="Open Learn reference"
            onClick={openLearnDialog}
            aria-label="Open Learn reference"
          >
            <span>Learn</span>
          </button>
          <button
            type="button"
            className={`${styles.learnBtn} ${styles.tooltipButton}`}
            data-tooltip="Open scene settings"
            onClick={openSettingsDialog}
            aria-label="Open scene settings"
          >
            <span>Settings</span>
          </button>

            <button
              type="button"
              className={`${styles.actionBtn} ${styles.youtubeBtn} ${styles.tooltipButton}`}
              onClick={() => openExternal('https://www.youtube.com/watch?v=m3kR2KK8TEs')}
              aria-label="Watch NASA's Artemis II Live Mission Coverage"
              data-tooltip="Watch NASA's Artemis II Live Mission Coverage"
            >
              <YouTubeIcon />
            </button>
            


          <div className={styles.externalGroup}>
            <button
              type="button"
              className={`${styles.learnBtn} ${styles.githubCta} ${styles.tooltipButton}`}
              data-tooltip="Open source on GitHub"
              onClick={() => openExternal(projectConfig.sourceUrl)}
              aria-label="Open source on GitHub"
            >
              <StarIcon />
              <span>Project GitHub</span>
            </button>
          </div>
          <div className={styles.shareGroup}>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.shareBtn} ${styles.tooltipButton}`}
              onClick={() => openExternal(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`)}
              aria-label="Share on LinkedIn"
              data-tooltip="Share the live mission viewer on LinkedIn"
            >
              <LinkedInIcon />
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.shareBtn} ${styles.tooltipButton}`}
              onClick={() => openExternal(`https://x.com/intent/post?text=${shareText}&url=${shareUrl}`)}
              aria-label="Share on X"
              data-tooltip="Share the live mission viewer on X"
            >
              <XIcon />
            </button>

          </div>
        </div>
      </div>
      {activeDialog === 'learn' && <LearnDialog onClose={closeDialog} />}
      {activeDialog === 'settings' && <SettingsDialog onClose={closeDialog} />}
    </>
  );
}
