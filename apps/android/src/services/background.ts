/**
 * Background mining service — uses `react-native-background-actions` to keep
 * a persistent foreground notification alive while mining continues in the
 * background.
 *
 * On Android 14+, foreground services require a `dataSync` type which we
 * declare in app.json (`FOREGROUND_SERVICE_DATA_SYNC` permission).
 *
 * The service does NOT itself run mining — it just keeps the JS thread
 * alive so the {@link miningService} singleton continues hashing. The
 * actual mining loop runs in the JS thread under `setInterval`-driven
 * microtasks (see services/mining.ts).
 */

import * as React from 'react';
import { Platform, NativeModules } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import { miningService } from './mining';

const CHANNEL_ID = 'rigormobile-mining';
const CHANNEL_NAME = 'RigorMobile Mining';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const veryIntensiveTask = async (taskData: { title: string }) => {
  await new Promise(async (resolve) => {
    // Loop until miningService reports status !== 'running'
    while (miningService['state'].status === 'running') {
      // The actual mining happens inside miningService; we just keep this
      // async task alive so the foreground notification stays visible.
      await sleep(1000);
    }
    resolve(undefined);
  });
};

const options = {
  taskName: 'RigorMobile Miner',
  taskTitle: 'Mining RigorChain',
  taskDesc: 'SHA3-256 (RGRPOW01) · keeping your CPU/GPU warm',
  taskIcon: { name: 'ic_notification', type: 'mipmap' },
  color: '#10b981',
  linkingURI: 'rigormobile://miner',
  progressBar: { max: 100, value: 0, indeterminate: true },
};

export async function initBackgroundService() {
  if (Platform.OS !== 'android') return;
  try {
    // Make sure the notification channel exists on Android 8+.
    await NativeModules.RigorNotifications?.createChannel?.(
      CHANNEL_ID,
      CHANNEL_NAME,
      'low',
    );
  } catch (err) {
    console.warn('failed to create notification channel', err);
  }
}

export async function startMiningBackground() {
  if (Platform.OS !== 'android') return;
  try {
    await BackgroundService.start(veryIntensiveTask, options);
  } catch (err) {
    console.warn('failed to start background service', err);
  }
}

export async function stopMiningBackground() {
  if (Platform.OS !== 'android') return;
  try {
    await BackgroundService.stop();
  } catch {
    /* ignore */
  }
}
