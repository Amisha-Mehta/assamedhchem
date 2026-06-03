"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type Role = "buyer" | "seller" | "admin";
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

type Order = {
  id: number;
  productId: number;
  buyerName: string;
  sellerName: string;
  productName: string;
  buyerQuantity: number;
  buyerUnit: Unit;
  convertedQuantity: number;
  baseUnit: Unit;
  ratePerBaseUnit: number;
  totalPrice: number;
  status: "Placed" | "Confirmed" | "Cancelled";
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
    listedBy: "MedChem Seller Hub",
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

function blankSellerProduct() {
  return {
    name: "",
    category: "",
    listedBy: "Aasa Seller Desk",
    dimension: "weight" as ProductDimension,
    baseUnit: "g" as Unit,
    pricePerBaseUnit: "",
    availableQuantity: "",
  };
}

function getRoleFromEmail(email: string): Role {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.includes("admin")) {
    return "admin";
  }

  if (normalizedEmail.includes("seller")) {
    return "seller";
  }

  return "buyer";
}

export default function Home() {
  const [loggedInRole, setLoggedInRole] = useState<Role>("buyer");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [products, setProducts] = useState<Product[]>(starterProducts);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(starterProducts[0].id);
  const [orderQuantity, setOrderQuantity] = useState("2");
  const [selectedUnit, setSelectedUnit] = useState<Unit>("kg");
  const [buyerName, setBuyerName] = useState("Buyer");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [sellerProduct, setSellerProduct] = useState(blankSellerProduct);

  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  ) ?? products[0] ?? starterProducts[0];

  const numericQuantity = Number(orderQuantity) || 0;
  const allowedBuyerUnits = unitsByDimension[selectedProduct.dimension];
  const sellerBaseUnits = unitsByDimension[sellerProduct.dimension];

  const buyerProducts = products.filter((product) => {
    const searchText = `${product.name} ${product.category} ${product.listedBy}`;
    return searchText.toLowerCase().includes(buyerSearch.toLowerCase());
  });

  const adminProducts = products.filter((product) => {
    const searchText = `${product.name} ${product.category} ${product.listedBy}`;
    return searchText.toLowerCase().includes(adminSearch.toLowerCase());
  });

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

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginEmail.trim()) {
      return;
    }

    const nextRole = getRoleFromEmail(loginEmail);
    setLoggedInRole(nextRole);
    setIsLoggedIn(true);

    if (nextRole === "buyer") {
      setBuyerName(loginEmail.split("@")[0] || "Buyer");
    }

    if (nextRole === "seller") {
      setSellerProduct((currentProduct) => ({
        ...currentProduct,
        listedBy: loginEmail.split("@")[0] || "Seller",
      }));
    }
  }

  function logout() {
    setIsLoggedIn(false);
    setLoginEmail("");
    setLoggedInRole("buyer");
  }

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
      ...blankSellerProduct(),
      listedBy: sellerProduct.listedBy,
    });
  }

  function placeOrder() {
    if (!orderPreview.hasEnoughStock || numericQuantity <= 0) {
      return;
    }

    const newOrder: Order = {
      id: Date.now(),
      productId: selectedProduct.id,
      buyerName: buyerName.trim() || "Buyer",
      sellerName: selectedProduct.listedBy,
      productName: selectedProduct.name,
      buyerQuantity: numericQuantity,
      buyerUnit: selectedUnit,
      convertedQuantity: orderPreview.convertedQuantity,
      baseUnit: selectedProduct.baseUnit,
      ratePerBaseUnit: selectedProduct.pricePerBaseUnit,
      totalPrice: orderPreview.totalPrice,
      status: "Placed",
    };

    updateProduct(selectedProduct.id, {
      availableQuantity:
        selectedProduct.availableQuantity - orderPreview.convertedQuantity,
    });
    setOrders((currentOrders) => [newOrder, ...currentOrders]);
  }

  function updateProduct(productId: number, changes: Partial<Product>) {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, ...changes } : product,
      ),
    );
  }

  function updateProductDimension(product: Product, dimension: ProductDimension) {
    updateProduct(product.id, {
      dimension,
      baseUnit: unitsByDimension[dimension][0],
    });
  }

  function deleteProduct(productId: number) {
    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id !== productId),
    );
    if (selectedProductId === productId) {
      const nextProduct = products.find((product) => product.id !== productId);
      if (nextProduct) {
        chooseProduct(nextProduct);
      }
    }
  }

  function updateOrderStatus(orderId: number, status: Order["status"]) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div>
            <p className="eyebrow">AasaMedChem Inventory</p>
            <h1>Sign in to open your dashboard</h1>
            <p className="login-copy">
              One login page routes users automatically by email. Use an admin,
              seller, or buyer email to enter the correct dashboard.
            </p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Email address
              <input
                placeholder="admin@aasamedchem.com"
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
              />
            </label>
            <button className="primary-button" type="submit">
              Continue
            </button>
          </form>

          <div className="login-examples">
            <span>Try these emails:</span>
            <button
              type="button"
              onClick={() => setLoginEmail("buyer@aasamedchem.com")}
            >
              buyer@aasamedchem.com
            </button>
            <button
              type="button"
              onClick={() => setLoginEmail("seller@aasamedchem.com")}
            >
              seller@aasamedchem.com
            </button>
            <button
              type="button"
              onClick={() => setLoginEmail("admin@aasamedchem.com")}
            >
              admin@aasamedchem.com
            </button>
          </div>
        </section>
      </main>
    );
  }

  function roleTitle() {
    if (loggedInRole === "admin") {
      return "Admin Dashboard";
    }

    if (loggedInRole === "seller") {
      return "Seller Dashboard";
    }

    return "Buyer Dashboard";
  }

  return (
    <main className="page-shell">
      <section className="top-bar">
        <div>
          <p className="eyebrow">AasaMedChem Inventory</p>
          <h1>{roleTitle()}</h1>
        </div>
        <div className="user-box">
          <span>{loginEmail}</span>
          <strong>{loggedInRole} account</strong>
          <button onClick={logout} type="button">
            Logout
          </button>
        </div>
      </section>

      <section className="summary-strip">
        <div>
          <span>Total products</span>
          <strong>{products.length}</strong>
        </div>
        <div>
          <span>Orders and quotations</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>Unit conversion</span>
          <strong>kg to g, L to mL, unit count</strong>
        </div>
      </section>

      {loggedInRole === "buyer" && (
        <section className="dashboard-grid">
          <div className="panel large-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Buyer dashboard</p>
                <h2>Search and select products</h2>
              </div>
              <span>{buyerProducts.length} matches</span>
            </div>

            <label className="search-field">
              Search products
              <input
                placeholder="Search by product, category, or seller"
                value={buyerSearch}
                onChange={(event) => setBuyerSearch(event.target.value)}
              />
            </label>

            <div className="product-list">
              {buyerProducts.map((product) => (
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
                      {product.category} sold by {product.listedBy}
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
                <p className="eyebrow">Order flow</p>
                <h2>Buy from seller</h2>
              </div>
              <span>{selectedProduct.name}</span>
            </div>

            <div className="order-form">
              <label>
                Buyer name
                <input
                  value={buyerName}
                  onChange={(event) => setBuyerName(event.target.value)}
                />
              </label>

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
                  Quantity
                  <input
                    min="0"
                    step="0.0001"
                    type="number"
                    value={orderQuantity}
                    onChange={(event) => setOrderQuantity(event.target.value)}
                  />
                </label>

                <label>
                  Unit
                  <select
                    value={selectedUnit}
                    onChange={(event) => setSelectedUnit(event.target.value as Unit)}
                  >
                    {allowedBuyerUnits.map((unit) => (
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
                <span>Converted for seller stock</span>
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
                <span>Total quotation</span>
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

            <button
              className="primary-button quotation-button"
              disabled={!orderPreview.hasEnoughStock || numericQuantity <= 0}
              onClick={placeOrder}
              type="button"
            >
              Place order
            </button>
          </div>
        </section>
      )}

      {loggedInRole === "seller" && (
        <section className="dashboard-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Seller dashboard</p>
                <h2>List product</h2>
              </div>
              <span>Inventory entry</span>
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
                Publish product
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Seller orders</p>
                <h2>Incoming buyer requests</h2>
              </div>
              <span>{orders.length} active</span>
            </div>

            <OrderList orders={orders} onStatusChange={updateOrderStatus} />
          </div>
        </section>
      )}

      {loggedInRole === "admin" && (
        <section className="admin-stack">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Admin dashboard</p>
                <h2>Search and edit all products</h2>
              </div>
              <span>Full visibility</span>
            </div>

            <label className="search-field">
              Admin search
              <input
                placeholder="Search any product, category, or seller"
                value={adminSearch}
                onChange={(event) => setAdminSearch(event.target.value)}
              />
            </label>

            <div className="admin-table">
              {adminProducts.map((product) => {
                const isEditing = editingProductId === product.id;
                const adminBaseUnits = unitsByDimension[product.dimension];

                return (
                  <div className="admin-row" key={product.id}>
                    <div className="admin-main">
                      {isEditing ? (
                        <input
                          value={product.name}
                          onChange={(event) =>
                            updateProduct(product.id, { name: event.target.value })
                          }
                        />
                      ) : (
                        <>
                          <strong>{product.name}</strong>
                          <small>
                            {product.category} sold by {product.listedBy}
                          </small>
                        </>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="admin-edit-grid">
                        <input
                          value={product.category}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              category: event.target.value,
                            })
                          }
                        />
                        <select
                          value={product.dimension}
                          onChange={(event) =>
                            updateProductDimension(
                              product,
                              event.target.value as ProductDimension,
                            )
                          }
                        >
                          <option value="weight">Weight</option>
                          <option value="volume">Volume</option>
                          <option value="count">Count</option>
                        </select>
                        <select
                          value={product.baseUnit}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              baseUnit: event.target.value as Unit,
                            })
                          }
                        >
                          {adminBaseUnits.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                        <input
                          min="0"
                          step="0.0001"
                          type="number"
                          value={product.availableQuantity}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              availableQuantity: Number(event.target.value),
                            })
                          }
                        />
                        <input
                          min="0"
                          step="0.0001"
                          type="number"
                          value={product.pricePerBaseUnit}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              pricePerBaseUnit: Number(event.target.value),
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="admin-read-grid">
                        <span>
                          Stock {formatQuantity(product.availableQuantity)}{" "}
                          {product.baseUnit}
                        </span>
                        <span>
                          {formatMoney(product.pricePerBaseUnit)} /{" "}
                          {product.baseUnit}
                        </span>
                      </div>
                    )}

                    <div className="admin-actions">
                      <button
                        className="small-button"
                        onClick={() =>
                          setEditingProductId(isEditing ? null : product.id)
                        }
                        type="button"
                      >
                        {isEditing ? "Done" : "Edit"}
                      </button>
                      <button
                        className="small-button danger-button"
                        onClick={() => deleteProduct(product.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Admin orders</p>
                <h2>All quotations and conversion details</h2>
              </div>
              <span>{orders.length} records</span>
            </div>

            <OrderList orders={orders} onStatusChange={updateOrderStatus} />
          </div>
        </section>
      )}
    </main>
  );
}

function OrderList({
  orders,
  onStatusChange,
}: {
  orders: Order[];
  onStatusChange: (orderId: number, status: Order["status"]) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        Orders will appear here with buyer quantity, converted quantity, rate,
        and INR total.
      </div>
    );
  }

  return (
    <div className="order-list">
      {orders.map((order) => (
        <div className="order-row" key={order.id}>
          <div>
            <strong>{order.productName}</strong>
            <small>
              {order.buyerName} buying from {order.sellerName}
            </small>
          </div>
          <div>
            <span>
              Buyer entered: {formatQuantity(order.buyerQuantity)}{" "}
              {order.buyerUnit}
            </span>
            <span>
              Converted: {formatQuantity(order.convertedQuantity)}{" "}
              {order.baseUnit}
            </span>
            <span>
              Rate: {formatMoney(order.ratePerBaseUnit)} / {order.baseUnit}
            </span>
            <strong>{formatMoney(order.totalPrice)}</strong>
          </div>
          <label className="status-field">
            Status
            <select
              value={order.status}
              onChange={(event) =>
                onStatusChange(order.id, event.target.value as Order["status"])
              }
            >
              <option value="Placed">Placed</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      ))}
    </div>
  );
}
