// Lặp lại ngắt quãng (thuật toán SM-2 rút gọn).
import * as store from "./db.js";

export function addCards(cards, deck) {
  const db = store.get();
  const today = store.todayParis();
  const added = cards.map((c) => ({
    id: store.newId(), deck, front: c.front, back: c.back, mnemonic: c.mnemonic || "",
    ef: 2.5, interval: 0, reps: 0, due: today, lapses: 0, createdAt: new Date().toISOString(),
  }));
  db.cards.push(...added);
  store.save();
  return added;
}

// grade: 0 = Quên, 3 = Khó, 4 = Ổn, 5 = Dễ
export function review(card, grade) {
  if (grade < 3) {
    card.reps = 0;
    card.interval = 0; // ôn lại ngay trong hôm nay
    card.lapses = (card.lapses || 0) + 1;
  } else {
    card.reps += 1;
    card.interval = card.reps === 1 ? 1 : card.reps === 2 ? 4 : Math.round(Math.max(1, card.interval) * card.ef);
    if (grade === 5) card.interval = Math.round(card.interval * 1.3);
  }
  card.ef = Math.max(1.3, card.ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  card.due = store.addDays(store.todayParis(), card.interval);
  card.lastReview = new Date().toISOString();
  return card;
}

export function dueCards(deck) {
  const today = store.todayParis();
  return store.get().cards.filter((c) => c.due <= today && (!deck || c.deck === deck));
}
