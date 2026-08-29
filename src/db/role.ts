export type DeviceRole = 'host' | 'verifier';

export const DEVICE_ROLE_SETTING_KEY = 'device_role';

export function isDeviceRole(value: string | null): value is DeviceRole {
  return value === 'host' || value === 'verifier';
}
