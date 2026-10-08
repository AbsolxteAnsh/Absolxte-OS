type ClosestTarget = {
  closest: (selector: string) => unknown;
};

type WindowPointerInput = {
  button: number;
  target: unknown;
};

const NO_DRAG_SELECTOR =
  "button, input, select, textarea, a, [data-no-drag]";

function canFindClosest(target: unknown): target is ClosestTarget {
  return (
    typeof target === "object" &&
    target !== null &&
    "closest" in target &&
    typeof target.closest === "function"
  );
}

export function isWindowDragTarget({
  button,
  target,
}: WindowPointerInput): boolean {
  return (
    button === 0 &&
    canFindClosest(target) &&
    target.closest(NO_DRAG_SELECTOR) === null
  );
}
