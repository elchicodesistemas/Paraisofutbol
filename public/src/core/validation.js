export function validateRecord(moduleId, input) {
  const title = String(input.title || '').trim();
  if (!title || title.length > 160) throw new Error('Ingresá un título de hasta 160 caracteres.');
  const result = { title };
  if (['calendar', 'agenda'].includes(moduleId)) {
    if (!input.date || !Number.isFinite(Date.parse(input.date))) throw new Error('Ingresá una fecha válida.');
    result.date = new Date(input.date).toISOString();
  }
  if (['payments', 'loyalty'].includes(moduleId)) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || (moduleId === 'loyalty' && !Number.isInteger(amount))) throw new Error('Ingresá un valor positivo válido.');
    result.amount = amount;
    if (moduleId === 'payments') result.status = 'pending';
  }
  return result;
}
