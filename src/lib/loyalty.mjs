export const pointsForOrder = (totalCents, rule) => Math.floor(Math.max(0, totalCents) / 100) * (rule?.pointsPerEuro ?? 1);

export const balance = (entries) => entries.reduce((sum, e) => sum + (e.type === "earn" ? e.points : -e.points), 0);

export function progress(points, rewards) {
  const sorted = [...rewards].sort((a, b) => a.punten - b.punten);
  const next = sorted.find((r) => r.punten > points) || null;
  const prev = [...sorted].reverse().find((r) => r.punten <= points);
  const base = prev ? prev.punten : 0;
  return {
    next,
    remaining: next ? next.punten - points : 0,
    fraction: next ? (points - base) / (next.punten - base) : 1,
    available: sorted.filter((r) => r.punten <= points),
  };
}

export function earn(entries, points, now, ref, label = "Demo-bestelling") {
  if (points <= 0) return entries;
  return [...entries, { id: `e-${entries.length + 1}-${now.getTime()}`, type: "earn", points, date: now.toISOString(), ref, label }];
}

export function redeemReward(entries, reward, now, code) {
  if (balance(entries) < reward.punten) throw new Error("Onvoldoende punten voor deze beloning.");
  return [...entries, { id: `r-${entries.length + 1}-${now.getTime()}`, type: "redeem", points: reward.punten, date: now.toISOString(), ref: code, label: reward.naam }];
}

// Is de beloning inwisselbaar met dit saldo? (server en client gebruiken dezelfde regel)
export const canRedeem = (entries, reward) => Boolean(reward) && balance(entries) >= reward.punten;
