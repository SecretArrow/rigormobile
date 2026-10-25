/**
 * Keep-awake hook — uses `expo-keep-awake` to prevent the screen/CPU
 * from sleeping while mining.
 */

import * as React from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export function keepAwakeActivate() {
  activateKeepAwakeAsync('rigormobile-mining').catch(() => {
    /* ignore */
  });
}

export function keepAwakeDeactivate() {
  deactivateKeepAwake('rigormobile-mining');
}
