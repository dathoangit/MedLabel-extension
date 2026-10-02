import type { MedicationLine, TreatmentOrder } from '../contracts/lookup.v1';

/** Route is injectable if it starts with "Tiêm" and does not contain "truyền". */
export function isInjectableRoute(duongDung: string | null): boolean {
  if (!duongDung) {
    return false;
  }
  const name = duongDung.trim();
  if (!/^tiêm/i.test(name)) {
    return false;
  }
  return !/truyền/i.test(name);
}

export function injectablesInOrder(order: TreatmentOrder): MedicationLine[] {
  return order.medications.filter(
    (med) => !med.laThuocDungKem && isInjectableRoute(med.duongDung)
  );
}

export function countInjectables(orders: TreatmentOrder[]): number {
  return orders.reduce(
    (sum, order) => sum + injectablesInOrder(order).length,
    0
  );
}

/** Infusion if the route name contains "truyền" (IV drip, not a plain injection). */
export function isInfusionRoute(duongDung: string | null): boolean {
  return !!duongDung && /truyền/i.test(duongDung);
}

export function infusionsInOrder(order: TreatmentOrder): MedicationLine[] {
  return order.medications.filter(
    (med) => !med.laThuocDungKem && isInfusionRoute(med.duongDung)
  );
}

export function countInfusions(orders: TreatmentOrder[]): number {
  return orders.reduce((sum, order) => sum + infusionsInOrder(order).length, 0);
}
