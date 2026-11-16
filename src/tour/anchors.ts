/** Elementos visíveis marcados com a âncora (data-tour ou data-tour-alt). Uma âncora pode
 *  marcar vários campos de uma grade; o destaque cobre todos juntos. */
export function findAnchors(anchor: string): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"], [data-tour-alt="${anchor}"]`),
  ).filter((el) => el.getClientRects().length > 0);
}
