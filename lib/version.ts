export const APP_VERSION = {
  code: 52,
  name: "1.0.52",
};

export interface RemoteConfig {
  latest_version_code: number;
  latest_version_name: string;
  min_required_version: number;
  apk_url: string;
  force_update: boolean;
  title: string;
  message: string;
}
