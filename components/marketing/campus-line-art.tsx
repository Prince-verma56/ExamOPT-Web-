/**
 * CampusLineArt — a fine-line, generic academic façade used as quiet
 * atmosphere behind editorial sections. It does not depict any specific
 * university building. Purely decorative (aria-hidden).
 */

import { cn } from "@/lib/utils";

const wingWindows = (start: number) => [0, 1, 2, 3].map((i) => start + i * 38);

function ArchedWindow({ x, y = 262, h = 40 }: { x: number; y?: number; h?: number }) {
  return <path d={`M${x} ${y + h} V${y} A9 9 0 0 1 ${x + 18} ${y} V${y + h}`} />;
}

export function CampusLineArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 340"
      aria-hidden
      focusable="false"
      className={cn("text-[#cbbfa9]", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g>
        {/* Masses — a whisper of warm tone so the drawing has weight */}
        <path d="M90 330 V212 H260 V330 Z M540 330 V212 H710 V330 Z" fill="#f1ece2" stroke="none" />
        <path d="M268 330 V186 L400 140 L532 186 V330 Z" fill="#f4efe6" stroke="none" />
        <path d="M345 150 V100 C345 62 372 44 400 44 C428 44 455 62 455 100 V150 Z" fill="#f1ece2" stroke="none" />

        {/* Dome, drum and lantern */}
        <path d="M345 150 V100 M455 150 V100 M338 100 H462" />
        <path d="M345 100 C345 62 372 44 400 44 C428 44 455 62 455 100" />
        <path d="M372 52 C366 66 364 82 364 100 M428 52 C434 66 436 82 436 100 M400 44 V100" opacity="0.55" />
        <path d="M391 44 V30 H409 V44 M388 30 H412 M400 30 V14" />
        {[356, 378, 422, 444].map((x) => (
          <path key={x} d={`M${x} 140 V114 A4 4 0 0 1 ${x + 8} 114 V140`} opacity="0.7" />
        ))}

        {/* Central portico */}
        <path d="M262 186 L400 136 L538 186 Z" />
        <path d="M290 182 L400 146 L510 182" opacity="0.5" />
        <circle cx="400" cy="167" r="7" opacity="0.6" />
        <path d="M268 186 H532 V200 H268 Z M272 193 H528" />
        {[288, 326, 364, 418, 456, 494].map((x) => (
          <g key={x}>
            <path d={`M${x} 200 V306 M${x + 14} 200 V306`} />
            <path d={`M${x - 3} 204 H${x + 17} M${x - 3} 306 H${x + 17}`} />
          </g>
        ))}
        <path d="M378 306 V258 A22 22 0 0 1 422 258 V306" />

        {/* Steps */}
        <path d="M256 306 H544 M246 318 H554 M236 330 H564" />

        {/* Wings */}
        <path d="M90 330 V212 H262 M538 212 H710 V330" />
        <path d="M84 212 H262 M538 212 H716 M90 224 H262 M538 224 H710" />
        {wingWindows(108).map((x) => (
          <ArchedWindow key={`l${x}`} x={x} />
        ))}
        {wingWindows(556).map((x) => (
          <ArchedWindow key={`r${x}`} x={x} />
        ))}
        {[...wingWindows(108), ...wingWindows(556)].map((x) => (
          <path key={`s${x}`} d={`M${x + 1} 244 H${x + 17} V234 H${x + 1} Z`} opacity="0.6" />
        ))}

        {/* Trees and ground */}
        <path d="M40 330 V292 M40 300 C16 300 8 276 22 262 C14 240 38 226 52 238 C70 230 86 252 74 268 C84 284 66 302 40 300" />
        <path d="M760 330 V286 M760 296 C734 296 728 270 744 258 C738 236 764 226 776 240 C794 236 804 260 790 272 C798 290 780 298 760 296" />
        <path d="M0 330 H800" />
        <path d="M120 338 H680" opacity="0.5" />
      </g>
    </svg>
  );
}
