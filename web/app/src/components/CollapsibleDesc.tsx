import { useState, useRef, useEffect } from "react";

interface Props {
  text?: string;
}

const MAX_LINES = 3;

export function CollapsibleDesc({ text }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 检测是否超过最大行数
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    if (isNaN(lineHeight)) {
      // 兜底：字符数粗略估算，中文每行约 20 字
      setOverflow((text || "").length > MAX_LINES * 20);
      return;
    }
    // 比较完整高度与限制高度
    el.style.maxHeight = "none";
    const fullHeight = el.scrollHeight;
    const maxHeight = lineHeight * MAX_LINES;
    setOverflow(fullHeight > maxHeight + 2);
    if (!expanded) el.style.maxHeight = `${maxHeight}px`;
  }, [text, expanded]);

  if (!text) {
    return <p className="room-desc">环顾四周以了解所处之地。</p>;
  }

  return (
    <div className="room-desc-wrap">
      <p
        ref={ref}
        className={`room-desc ${!expanded && overflow ? "clamped" : ""}`}
        style={
          !expanded && overflow
            ? { maxHeight: `${MAX_LINES * 1.8}em`, WebkitLineClamp: MAX_LINES }
            : undefined
        }
      >
        {text}
      </p>
      {overflow && (
        <button
          type="button"
          className="desc-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起 ▲" : "展开 ▼"}
        </button>
      )}
    </div>
  );
}
