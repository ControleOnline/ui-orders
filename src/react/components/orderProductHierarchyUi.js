/** Hierarchy presentation helpers for OrderProducts trees (ui-orders#5). */

export const resolveOrderProductImageSize = (depth, compactTree = false) => {
  const normalizedDepth = Math.max(0, Number(depth || 0))

  if (compactTree) {
    if (normalizedDepth === 0) return 48
    if (normalizedDepth === 1) return 32
    return 26
  }

  if (normalizedDepth === 0) return 56
  if (normalizedDepth === 1) return 42
  return 34
}

export const resolveOrderProductHierarchyIndent = (
  depth,
  compact,
  compactTree = false,
) =>
  Math.min(Math.max(0, Number(depth || 0)), 3) *
  (compactTree ? 10 : compact ? 12 : 18)

