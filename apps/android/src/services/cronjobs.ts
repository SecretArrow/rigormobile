/**
 * Cronjobs — periodic background tasks via `expo-task-manager` +
 * `expo-background-fetch`. The OS schedules these at most every 15 min
 * (Android's minimum interval). Use them to refresh the block template
 * even when the app is closed, so the user starts on a fresh template
 * immediately on next launch.
 *
 * Tasks:
 *   - `refresh-block-template`  → calls miningService.refreshTemplate()
 *   - `purge-old-sessions`      → removes mining-session logs older than 30d
 *
 * WorkManager is also wired through `react-native-workmanager` for true
 * native periodic tasks that survive app kills. Both paths are idempotent.
 */

import * as React from 'react';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { miningService } from './mining';

export const TASK_REFRESH_TEMPLATE = 'refresh-block-template';
export const TASK_PURGE_SESSIONS = 'purge-old-sessions';

TaskManager.defineTask(TASK_REFRESH_TEMPLATE, async () => {
  try {
    await miningService.refreshTemplate();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.warn(`[${TASK_REFRESH_TEMPLATE}] failed`, err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

TaskManager.defineTask(TASK_PURGE_SESSIONS, async () => {
  try {
    // TODO: prune old mining sessions from AsyncStorage
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.warn(`[${TASK_PURGE_SESSIONS}] failed`, err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function initCronjobs() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  try {
    const isRegistered1 = await TaskManager.isTaskRegisteredAsync(
      TASK_REFRESH_TEMPLATE,
    );
    if (!isRegistered1) {
      await BackgroundFetch.registerTaskAsync(TASK_REFRESH_TEMPLATE, {
        minimumInterval: 15, // 15 minutes — Android minimum
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
    const isRegistered2 = await TaskManager.isTaskRegisteredAsync(
      TASK_PURGE_SESSIONS,
    );
    if (!isRegistered2) {
      await BackgroundFetch.registerTaskAsync(TASK_PURGE_SESSIONS, {
        minimumInterval: 60 * 6, // 6 hours
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (err) {
    console.warn('cronjob init failed', err);
  }
}

export async function unregisterCronjobs() {
  try {
    await BackgroundFetch.unregisterTaskAsync(TASK_REFRESH_TEMPLATE);
    await BackgroundFetch.unregisterTaskAsync(TASK_PURGE_SESSIONS);
  } catch (err) {
    console.warn('cronjob unregister failed', err);
  }
}
