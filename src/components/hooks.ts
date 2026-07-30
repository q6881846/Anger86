import { useEffect, useId } from 'react';

/** 滚动渐入动画 Hook - 观察当前及后续新增的 .reveal 元素 */
export function useReveal() {
  const hookId = useId();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px -10px 0px' }
    );

    const observeAll = () => {
      document.querySelectorAll('.reveal:not(.visible)').forEach((el) => {
        io.observe(el);
      });
    };
    observeAll();

    let rafId: number | null = null;
    const scheduleObserve = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        observeAll();
      });
    };

    const mo = new MutationObserver(scheduleObserve);
    mo.observe(document.body, { childList: true, subtree: true });

    const fallback1 = setTimeout(observeAll, 100);
    const fallback2 = setTimeout(observeAll, 400);

    return () => {
      io.disconnect();
      mo.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(fallback1);
      clearTimeout(fallback2);
    };
  }, [hookId]);
}

/** 数字递增动画 Hook */
export function useCountUp(target: number, duration: number = 1500) {
  useEffect(() => {
    const el = document.querySelector(`[data-target="${target}"]`);
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            let current = 0;
            const frameMs = 16;
            const totalFrames = Math.max(1, Math.round(duration / frameMs));
            const increment = target / totalFrames;
            const timer = setInterval(() => {
              current += increment;
              if (current >= target) { current = target; clearInterval(timer); }
              el.textContent = String(Math.floor(current));
            }, frameMs);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);
}
