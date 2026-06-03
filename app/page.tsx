"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type Unit = "g" | "kg" | "mL" | "L" | "unit";
type ProductDimension = "weight" | "volume" | "count";

type Product = {
  id: number;
  name: string;
  category: string;
  listedBy: string;
  dimension: ProductDimension;
  baseUnit: Unit;
  pricePerBaseUnit: number;
  availableQuantity: number;
};

const starterProducts: Product[] = [
  {
    id: 1,
    name: "Sodium Chloride",
    category: "Laboratory Chemical",
    listedBy: "Aasa Seller Desk",
    dimension: "weight",
    baseUnit: "g",
    pricePerBaseUnit: 1.85,
    availableQuantity: 25000,
  },
  {
    id: 2,
    name: "Ethanol 99.9%",
    category: "Solvent",
    listedBy: "Aasa Seller Desk",
    dimension: "volume",
    baseUnit: "mL",
    pricePerBaseUnit: 0.72,
    availableQuantity: 18000,
  },
  {
    id: 3,
    name: "Glass Vial Pack",
    category: "Consumable",
    listedBy: "Aasa Seller Desk",
    dimension: "count",
    baseUnit: "unit",
    pricePerBaseUnit: 24,
    availableQuantity: 420,
  },
];

const unitsByDimension: Record<ProductDimension, Unit[]> = {
  weight: ["g", "kg"],
  volume: ["mL", "L"],
  count: ["unit"],
};

function convertToBaseUnit(quantity: number, selectedUnit: Unit, baseUnit: Unit) {
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

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatQuantity(quantity: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 4,
  }).format(quantity);
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(starterProducts);
  const [selectedProductId, setSelectedProductId] = useState(starterProducts[0].id);
  const [orderQuantity, setOrderQuantity] = useState("2");
  const [selectedUnit, setSelectedUnit] = useState<Unit>("kg");
  const [sellerProduct, setSellerProduct] = useState({
    name: "",
    category: "",
    listedBy: "Aasa Seller Desk",
    dimension: "weight" as ProductDimension,
    baseUnit: "g" as Unit,
    pricePerBaseUnit: "",
    availableQuantity: "",
  });

  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  ) ?? products[0] ?? starterProducts[0];

  const allowedUnits = unitsByDimension[selectedProduct.dimension];
  const numericQuantity = Number(orderQuantity) || 0;
  const sellerBaseUnits = unitsByDimension[sellerProduct.dimension];

  const orderPreview = useMemo(() => {
    const convertedQuantity = convertToBaseUnit(
      numericQuantity,
      selectedUnit,
      selectedProduct.baseUnit,
    );

    return {
      convertedQuantity,
      totalPrice: convertedQuantity * selectedProduct.pricePerBaseUnit,
      hasEnoughStock: convertedQuantity <= selectedProduct.availableQuantity,
    };
  }, [numericQuantity, selectedProduct, selectedUnit]);

  function chooseProduct(product: Product) {
    setSelectedProductId(product.id);
    setSelectedUnit(unitsByDimension[product.dimension][0]);
    setOrderQuantity(product.dimension === "count" ? "10" : "2");
  }

  function updateSellerDimension(dimension: ProductDimension) {
    setSellerProduct((currentProduct) => ({
      ...currentProduct,
      dimension,
      baseUnit: unitsByDimension[dimension][0],
    }));
  }

  function addSellerProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const price = Number(sellerProduct.pricePerBaseUnit);
    const stock = Number(sellerProduct.availableQuantity);

    if (!sellerProduct.name.trim() || price <= 0 || stock <= 0) {
      return;
    }

    const newProduct: Product = {
      id: Date.now(),
      name: sellerProduct.name.trim(),
      category: sellerProduct.category.trim() || "General",
      listedBy: sellerProduct.listedBy.trim() || "Seller",
      dimension: sellerProduct.dimension,
      baseUnit: sellerProduct.baseUnit,
      pricePerBaseUnit: price,
      availableQuantity: stock,
    };

    setProducts((currentProducts) => [newProduct, ...currentProducts]);
    chooseProduct(newProduct);
    setSellerProduct({
      name: "",
      category: "",
      listedBy: sellerProduct.listedBy,
      dimension: "weight",
      baseUnit: "g",
      pricePerBaseUnit: "",
      availableQuantity: "",
    });
  }

  return (
    <main className="page-shell">
      <section className="top-bar">
        <div>
          <p className="eyebrow">AasaMedChem assignment</p>
          <h1>Inventory listing with visible unit conversion</h1>
        </div>
        <div className="role-badge">Seller + Buyer flow</div>
      </section>

      <section className="workspace-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Seller side</p>
              <h2>Listed products</h2>
            </div>
            <span>{products.length} products</span>
          </div>

          <div className="product-list">
            {products.map((product) => (
              <button
                className={
                  product.id === selectedProduct.id
                    ? "product-row active"
                    : "product-row"
                }
                key={product.id}
                onClick={() => chooseProduct(product)}
                type="button"
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {product.category} listed by {product.listedBy}
                  </small>
                </span>
                <span className="right-text">
                  <strong>
                    {formatMoney(product.pricePerBaseUnit)} / {product.baseUnit}
                  </strong>
                  <small>
                    Stock {formatQuantity(product.availableQuantity)}{" "}
                    {product.baseUnit}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Seller side</p>
              <h2>List new product</h2>
            </div>
            <span>Step 2</span>
          </div>

          <form className="seller-form" onSubmit={addSellerProduct}>
            <label>
              Product name
              <input
                placeholder="Example: Potassium Bromide"
                value={sellerProduct.name}
                onChange={(event) =>
                  setSellerProduct({
                    ...sellerProduct,
                    name: event.target.value,
                  })
                }
              />
            </label>

            <div className="quantity-row">
              <label>
                Category
                <input
                  placeholder="Chemical"
                  value={sellerProduct.category}
                  onChange={(event) =>
                    setSellerProduct({
                      ...sellerProduct,
                      category: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Type
                <select
                  value={sellerProduct.dimension}
                  onChange={(event) =>
                    updateSellerDimension(event.target.value as ProductDimension)
                  }
                >
                  <option value="weight">Weight</option>
                  <option value="volume">Volume</option>
                  <option value="count">Count</option>
                </select>
              </label>
            </div>

            <div className="quantity-row">
              <label>
                Stock quantity
                <input
                  min="0"
                  placeholder="5000"
                  step="0.0001"
                  type="number"
                  value={sellerProduct.availableQuantity}
                  onChange={(event) =>
                    setSellerProduct({
                      ...sellerProduct,
                      availableQuantity: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Base unit
                <select
                  value={sellerProduct.baseUnit}
                  onChange={(event) =>
                    setSellerProduct({
                      ...sellerProduct,
                      baseUnit: event.target.value as Unit,
                    })
                  }
                >
                  {sellerBaseUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Price per base unit in INR
              <input
                min="0"
                placeholder="1.85"
                step="0.0001"
                type="number"
                value={sellerProduct.pricePerBaseUnit}
                onChange={(event) =>
                  setSellerProduct({
                    ...sellerProduct,
                    pricePerBaseUnit: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Seller name
              <input
                value={sellerProduct.listedBy}
                onChange={(event) =>
                  setSellerProduct({
                    ...sellerProduct,
                    listedBy: event.target.value,
                  })
                }
              />
            </label>

            <button className="primary-button" type="submit">
              List product
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Buyer side</p>
              <h2>Create order preview</h2>
            </div>
            <span>{selectedProduct.name}</span>
          </div>

          <div className="order-form">
            <label>
              Product
              <select
                value={selectedProduct.id}
                onChange={(event) =>
                  chooseProduct(
                    products.find(
                      (product) => product.id === Number(event.target.value),
                    ) ?? products[0],
                  )
                }
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="quantity-row">
              <label>
                Buyer quantity
                <input
                  min="0"
                  step="0.0001"
                  type="number"
                  value={orderQuantity}
                  onChange={(event) => setOrderQuantity(event.target.value)}
                />
              </label>

              <label>
                Buyer unit
                <select
                  value={selectedUnit}
                  onChange={(event) => setSelectedUnit(event.target.value as Unit)}
                >
                  {allowedUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="calculation-box">
            <div>
              <span>Buyer entered</span>
              <strong>
                {formatQuantity(numericQuantity)} {selectedUnit}
              </strong>
            </div>
            <div>
              <span>System stores/calculates as</span>
              <strong>
                {formatQuantity(orderPreview.convertedQuantity)}{" "}
                {selectedProduct.baseUnit}
              </strong>
            </div>
            <div>
              <span>Rate used</span>
              <strong>
                {formatMoney(selectedProduct.pricePerBaseUnit)} /{" "}
                {selectedProduct.baseUnit}
              </strong>
            </div>
            <div>
              <span>Total payable</span>
              <strong>{formatMoney(orderPreview.totalPrice)}</strong>
            </div>
          </div>

          <div
            className={
              orderPreview.hasEnoughStock ? "stock-note ok" : "stock-note warning"
            }
          >
            {orderPreview.hasEnoughStock
              ? "Stock is available for this order."
              : "Order quantity is higher than available stock."}
          </div>
        </div>
      </section>
    </main>
  );
}
