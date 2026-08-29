export type DeviceRole = 'host' | 'verifier';

export const DEVICE_ROLE_SETTING_KEY = 'device_role';

/** This device's own recovery master key, generated once the first time it
 * becomes host — see src/utils/codes.ts's generateMasterKey and the events
 * table's host_master_key column. */
export const HOST_MASTER_KEY_SETTING_KEY = 'host_master_key';

export function isDeviceRole(value: string | null): value is DeviceRole {
  return value === 'host' || value === 'verifier';
}
