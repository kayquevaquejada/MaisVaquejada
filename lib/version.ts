export const APP_VERSION = {
  code: 43,
  name: "1.0.43",
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
