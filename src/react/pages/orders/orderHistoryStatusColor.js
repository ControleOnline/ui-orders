// Domain theme overrides are explicit configuration; otherwise preserve the status entity color.
export const resolveOrderHistoryStatusColor = (status, themeColors = {}) => {
  const key = String(typeof status === 'string' ? status : status?.status || status?.name || '').trim().toLowerCase();
  const token = 'orderStatus' + key.split(/[^a-z0-9]+/).filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join('');
  const themed = typeof themeColors[token] === 'string' ? themeColors[token].trim() : '';
  const configured = typeof status?.color === 'string' ? status.color.trim() : '';
  return themed || configured || themeColors.textMuted || themeColors.textSecondary || themeColors.textPrimary;
};
