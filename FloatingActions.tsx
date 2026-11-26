import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/* ------------------------------------------------------------------ */
/* Компонент                                                           */
/* ------------------------------------------------------------------ */

export type FloatingActionsProps = {
  children: React.ReactNode;
  /** Скролл-контейнер для расчёта видимости. По умолчанию viewport */
  root?: Element | null;
  /** Отступ от низа экрана в режиме «прижато», px */
  bottomOffset?: number;
  /** Класс якоря (блок на месте компонента) */
  className?: string;
  /** Класс контента в режиме «прижато» */
  floatingClassName?: string;
  /** Фон в режиме «прижато» */
  floatingBackground?: string;
  /** z-index в режиме «прижато» */
  zIndex?: number;
};

type Rect = { left: number; width: number };

export function FloatingActions({
  children,
  root = null,
  bottomOffset = 0,
  className,
  floatingClassName,
  floatingBackground = "#fff",
  zIndex = 1000,
}: FloatingActionsProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [floating, setFloating] = useState(false);
  const [height, setHeight] = useState(0);
  const [rect, setRect] = useState<Rect>({ left: 0, width: 0 });

  // 1. Высота контента -> высота якоря (чтобы вёрстка не прыгала)
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 2. left/width берём у якоря = ширина основного контейнера
  const measure = useCallback(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    setRect((prev) =>
      prev.left === r.left && prev.width === r.width
        ? prev
        : { left: r.left, width: r.width }
    );
  }, []);

  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(a);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [measure]);

  // 3. Видимость якоря
  useEffect(() => {
    const a = anchorRef.current;
    if (!a) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const rootBottom = entry.rootBounds?.bottom ?? window.innerHeight;
        // якорь ниже видимой области
        const below = entry.boundingClientRect.top >= rootBottom;
        setFloating(!entry.isIntersecting && below);
        measure();
      },
      {
        root,
        threshold: [0, 1],
        rootMargin: `0px 0px ${-bottomOffset}px 0px`,
      }
    );
    io.observe(a);
    return () => io.disconnect();
  }, [root, bottomOffset, measure]);

  const floatingStyle: React.CSSProperties | undefined = floating
    ? {
        position: "fixed",
        left: rect.left,
        width: rect.width,
        bottom: bottomOffset,
        zIndex,
        background: floatingBackground,
        boxShadow: "0 -2px 8px rgba(0,0,0,.12)",
        boxSizing: "border-box",
        paddingBottom: "env(safe-area-inset-bottom)",
      }
    : undefined;

  return (
    <div
      ref={anchorRef}
      className={className}
      style={{ height: height || undefined }}
    >
      <div
        ref={contentRef}
        className={floating ? floatingClassName : undefined}
        style={floatingStyle}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Пример использования                                                */
/* ------------------------------------------------------------------ */

export function FloatingActionsExample() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      {/* Основной контейнер: ширина произвольная, FloatingActions её не знает */}
      <div
        style={{
          width: "min(640px, 100%)",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <h2>Форма</h2>

        {/* Блок на месте якоря: если он ниже экрана — кнопки прижмутся к низу */}
        <FloatingActions bottomOffset={0}>
          <div style={{ display: "flex", gap: 8, padding: 12 }}>
            <button type="button">Сохранить</button>
            <button type="button">Отмена</button>
          </div>
        </FloatingActions>

        {Array.from({ length: 40 }, (_, i) => (
          <p key={i}>Строка контента {i + 1}</p>
        ))}
      </div>
    </div>
  );
}

export default FloatingActions;
