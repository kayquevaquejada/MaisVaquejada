export const APP_VERSION = {
  code: 1,
  name: "1.0.0",
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
