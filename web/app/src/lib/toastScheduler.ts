/** 单槽 toast：后一次覆盖前一次，并取消旧的清空定时器，避免见闻连刷时被提前冲掉。 */
export type ToastShowOptions = {
  /** 展示毫秒；默认按文案长度估算 */
  durationMs?: number;
};

export function toastDurationMs(message: string): number {
  const len = Array.from(String(message || "").trim()).length;
  if (len <= 8) return 3200;
  if (len <= 16) return 4200;
  return 5200;
}

export function createToastScheduler(setToast: (msg: string) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;
  let lastMsg = "";

  const clearTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    show(msg: string, opts?: ToastShowOptions) {
      const text = String(msg || "").trim();
      if (!text) return;
      seq += 1;
      const my = seq;
      lastMsg = text;
      setToast(text);
      clearTimer();
      const ms = opts?.durationMs ?? toastDurationMs(text);
      timer = setTimeout(() => {
        if (my === seq) {
          setToast("");
          lastMsg = "";
        }
        timer = null;
      }, ms);
    },
    /** 同一文案且仍在展示时不再重置计时，避免状态心跳把可读时间截断。 */
    showUnlessSame(msg: string, opts?: ToastShowOptions) {
      const text = String(msg || "").trim();
      if (!text) return;
      if (text === lastMsg) return;
      this.show(text, opts);
    },
    clear() {
      seq += 1;
      lastMsg = "";
      clearTimer();
      setToast("");
    },
  };
}

export type ToastScheduler = ReturnType<typeof createToastScheduler>;
