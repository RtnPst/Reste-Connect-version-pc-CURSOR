export function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function toDisplayChoices(choices: string[]) {
  const choiceOrder = shuffledOrder(choices.length);
  return {
    choices: choiceOrder.map((idx) => choices[idx]),
    choiceOrder,
  };
}

export function displayIndexFromOriginal(choiceOrder: number[], originalIndex: number) {
  return choiceOrder.indexOf(originalIndex);
}
