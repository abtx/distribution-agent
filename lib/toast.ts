export type AppToast = {
  title: string;
  message: string;
  url?: string | null;
};

export const toastEvent = "distribution-agent:toast";

export function showToast(toast: AppToast) {
  window.dispatchEvent(new CustomEvent<AppToast>(toastEvent, { detail: toast }));
}
