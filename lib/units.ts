export type Role = "buyer" | "seller" | "admin";
export type Unit = "g" | "kg" | "mL" | "L" | "unit";
export type ProductDimension = "weight" | "volume" | "count";

export const unitsByDimension: Record<ProductDimension, Unit[]> = {
  weight: ["g", "kg"],
  volume: ["mL", "L"],
  count: ["unit"],
};

export function convertToBaseUnit(quantity: number, selectedUnit: Unit, baseUnit: Unit) {
  if (selectedUnit === baseUnit) {
    return quantity;
  }

  if (selectedUnit === "kg" && baseUnit === "g") {
    return quantity * 1000;
  }

  if (selectedUnit === "g" && baseUnit === "kg") {
    return quantity / 1000;
  }

  if (selectedUnit === "L" && baseUnit === "mL") {
    return quantity * 1000;
  }

  if (selectedUnit === "mL" && baseUnit === "L") {
    return quantity / 1000;
  }

  return quantity;
}

export function isValidStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}
