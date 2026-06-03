"use client";

import type { FormEvent } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  convertToBaseUnit,
  isValidStrongPassword,
  unitsByDimension,
  type Role,
  type Unit,
  type ProductDimension,
} from "@/lib/units";

type Product = {
  id: string;
  sellerId: string;
  sellerName: string;
  sku: string;
  name: string;
  category: string;
  listedBy: string;
  description: string;
  dimension: ProductDimension;
  baseUnit: Unit;
  pricePerBaseUnit: number;
  availableQuantity: number;
  isActive: boolean;
};

type Order = {
  id: string;
  productId: string;
  buyerName: string;
  sellerName: string;
  productName: string;
  buyerQuantity: number;
  buyerUnit: Unit;
  convertedQuantity: number;
  baseUnit: Unit;
  ratePerBaseUnit: number;
  totalPrice: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
};

const orderStatusLabels: Record<Order["status"], string> = {
  pending: "Placed",
  approved: "Confirmed",
  rejected: "Cancelled",
  fulfilled: "Fulfilled",
};

type ProductRequest = {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  requestedProductName: string;
  requestedCategory: string;
  notes: string;
  status: "open" | "reviewed" | "fulfilled" | "dismissed";
  createdAt: string;
  updatedAt: string;
};

const starterProducts: Product[] = [
  {
    id: "seed-prod-1",
    sellerId: "seed-seller-1",
    sellerName: "Aasa Seller Desk",
    sku: "CHEM-SODIUM-CHLORIDE-001",
    name: "Sodium Chloride",
    category: "Laboratory Chemical",
    listedBy: "Aasa Seller Desk",
    description: "High purity laboratory grade salt.",
    dimension: "weight",
    baseUnit: "g",
    pricePerBaseUnit: 1.85,
    availableQuantity: 25000,
    isActive: true,
  },
  {
    id: "seed-prod-2",
    sellerId: "seed-seller-1",
    sellerName: "MedChem Seller Hub",
    sku: "SOLV-ETHANOL-0999-001",
    name: "Ethanol 99.9%",
    category: "Solvent",
    listedBy: "MedChem Seller Hub",
    description: "General purpose solvent for lab use.",
    dimension: "volume",
    baseUnit: "mL",
    pricePerBaseUnit: 0.72,
    availableQuantity: 18000,
    isActive: true,
  },
  {
    id: "seed-prod-3",
    sellerId: "seed-seller-1",
    sellerName: "Aasa Seller Desk",
    sku: "PACK-VIAL-001",
    name: "Glass Vial Pack",
    category: "Consumable",
    listedBy: "Aasa Seller Desk",
    description: "Pack of laboratory glass vials.",
    dimension: "count",
    baseUnit: "unit",
    pricePerBaseUnit: 24,
    availableQuantity: 420,
    isActive: true,
  },
];

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

function normalizeOrderStatus(status: string): Order["status"] {
  if (status === "pending" || status === "approved" || status === "rejected" || status === "fulfilled") {
    return status;
  }

  if (status === "Placed") {
    return "pending";
  }

  if (status === "Confirmed") {
    return "approved";
  }

  if (status === "Cancelled") {
    return "rejected";
  }

  return "pending";
}

function getOrderStatusOptions() {
  return [
    { value: "pending" as const, label: "Placed" },
    { value: "approved" as const, label: "Confirmed" },
    { value: "rejected" as const, label: "Cancelled" },
    { value: "fulfilled" as const, label: "Fulfilled" },
  ];
}

function blankSellerProduct() {
  return {
    sku: "",
    name: "",
    category: "",
    listedBy: "Aasa Seller Desk",
    description: "",
    dimension: "weight" as ProductDimension,
    baseUnit: "g" as Unit,
    pricePerBaseUnit: "",
    availableQuantity: "",
  };
}

export default function Home() {
  const [loggedInRole, setLoggedInRole] = useState<Role>("buyer");
  const [loggedInName, setLoggedInName] = useState("Buyer");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupRole, setSignupRole] = useState<Exclude<Role, "admin">>("buyer");
  const [signupError, setSignupError] = useState("");
  const [products, setProducts] = useState<Product[]>(starterProducts);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productRequests, setProductRequests] = useState<ProductRequest[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(starterProducts[0].id);
  const [orderQuantity, setOrderQuantity] = useState("2");
  const [selectedUnit, setSelectedUnit] = useState<Unit>("kg");
  const [buyerName, setBuyerName] = useState("Buyer");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [requestProductName, setRequestProductName] = useState("");
  const [requestCategory, setRequestCategory] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [sellerProduct, setSellerProduct] = useState(blankSellerProduct);

  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  ) ?? products[0] ?? starterProducts[0];

  const numericQuantity = Number(orderQuantity) || 0;
  const allowedBuyerUnits = unitsByDimension[selectedProduct.dimension];
  const sellerBaseUnits = unitsByDimension[sellerProduct.dimension];
  const deferredBuyerSearch = useDeferredValue(buyerSearch);

  const buyerProducts = products.filter((product) => {
    const searchText = `${product.name} ${product.category} ${product.listedBy}`;
    return searchText.toLowerCase().includes(deferredBuyerSearch.toLowerCase());
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

  async function apiRequest<T>(input: RequestInfo | URL, init?: RequestInit) {
    const response = await fetch(input, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    const payload = (await response.json().catch(() => ({}))) as T & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Something went wrong.");
    }

    return payload;
  }

  async function loadDashboardData(nextRole: Role) {
    const [productsResponse, ordersResponse, productRequestsResponse] = await Promise.all([
      apiRequest<{ products: Product[] }>("/api/products"),
      apiRequest<{ orders: Order[] }>("/api/orders"),
      apiRequest<{ requests: ProductRequest[] }>("/api/product-requests"),
    ]);

    setProducts(productsResponse.products);
    setOrders(ordersResponse.orders);
    setProductRequests(productRequestsResponse.requests);

    if (nextRole === "buyer" && productsResponse.products.length > 0) {
      setSelectedProductId(productsResponse.products[0].id);
      setSelectedUnit(unitsByDimension[productsResponse.products[0].dimension][0]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await fetch("/api/me", { credentials: "same-origin" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          user: { id: string; name: string; email: string; role: Role };
        };

        if (cancelled || !data.user) {
          return;
        }

        setIsLoggedIn(true);
        setLoggedInRole(data.user.role);
        setLoggedInName(data.user.name);
        setLoginEmail(data.user.email);
        setBuyerName(data.user.name);
        setSellerProduct((currentProduct) => ({
          ...currentProduct,
          listedBy: data.user.name,
        }));
        await loadDashboardData(data.user.role);
      } catch {
        // Leave the login screen visible if the session cannot be restored.
      } finally {
        if (!cancelled) {
          setSessionChecked(true);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginEmail.trim()) {
      setLoginError("Enter your email address.");
      return;
    }

    if (!loginPassword.trim()) {
      setLoginError("Enter your password.");
      return;
    }

    void (async () => {
      try {
        const data = await apiRequest<{
          user: { id: string; name: string; email: string; role: Role };
        }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
          }),
        });

        const nextRole = data.user.role;

        setLoginError("");
        setLoggedInRole(nextRole);
        setLoggedInName(data.user.name);
        setIsLoggedIn(true);
        setBuyerName(data.user.name);
        setSellerProduct((currentProduct) => ({
          ...currentProduct,
          listedBy: data.user.name,
        }));
        await loadDashboardData(nextRole);
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : "Login failed.");
      } finally {
        setSessionChecked(true);
      }
    })();
  }

  function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!signupName.trim()) {
      setSignupError("Enter your full name.");
      return;
    }

    if (!signupEmail.trim()) {
      setSignupError("Enter your email address.");
      return;
    }

    if (!isValidStrongPassword(signupPassword)) {
      setSignupError(
        "Password must have upper case, lower case, a number, a special character, and at least 8 characters.",
      );
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    void (async () => {
      try {
        const data = await apiRequest<{
          user: { id: string; name: string; email: string; role: Role };
        }>("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            name: signupName,
            email: signupEmail,
            password: signupPassword,
            role: signupRole,
          }),
        });

        const nextRole = data.user.role;

        setSignupError("");
        setLoginError("");
        setLoggedInRole(nextRole);
        setLoggedInName(data.user.name);
        setIsLoggedIn(true);
        setBuyerName(data.user.name);
        setLoginEmail(data.user.email);
        setSellerProduct((currentProduct) => ({
          ...currentProduct,
          listedBy: data.user.name,
        }));
        await loadDashboardData(nextRole);
      } catch (error) {
        setSignupError(error instanceof Error ? error.message : "Signup failed.");
      } finally {
        setSessionChecked(true);
      }
    })();
  }

  async function logout() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setIsLoggedIn(false);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
    setLoggedInRole("buyer");
    setLoggedInName("Buyer");
    setProducts(starterProducts);
    setOrders([]);
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

  async function addSellerProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const price = Number(sellerProduct.pricePerBaseUnit);
    const stock = Number(sellerProduct.availableQuantity);

    if (!sellerProduct.sku.trim() || !sellerProduct.name.trim() || price <= 0 || stock <= 0) {
      return;
    }

    const payload = await apiRequest<{ id: string }>("/api/products", {
      method: "POST",
      body: JSON.stringify({
        sku: sellerProduct.sku,
        name: sellerProduct.name,
        category: sellerProduct.category || "General",
        description: sellerProduct.description || "",
        dimension: sellerProduct.dimension,
        baseUnit: sellerProduct.baseUnit,
        availableQuantity: stock,
        pricePerBaseUnit: price,
        isActive: true,
      }),
    });

    void payload;

    await loadDashboardData(loggedInRole);
    setSellerProduct({
      ...blankSellerProduct(),
      listedBy: loggedInName,
    });
  }

  async function placeOrder() {
    if (!orderPreview.hasEnoughStock || numericQuantity <= 0) {
      return;
    }

    await apiRequest("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        productId: selectedProduct.id,
        requestedQty: numericQuantity,
        requestedUnit: selectedUnit,
        buyerName: buyerName.trim() || "Buyer",
      }),
    });

    await loadDashboardData(loggedInRole);
  }

  async function requestProductFromAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requestedProduct = requestProductName.trim() || deferredBuyerSearch.trim();

    if (!requestedProduct) {
      setRequestError("Tell us which product you want.");
      return;
    }

    try {
      await apiRequest("/api/product-requests", {
        method: "POST",
        body: JSON.stringify({
          requestedProductName: requestedProduct,
          requestedCategory: requestCategory,
          notes: requestNotes,
        }),
      });

      setRequestError("");
      setRequestSuccess("Request sent to admin.");
      setRequestProductName("");
      setRequestCategory("");
      setRequestNotes("");
      await loadDashboardData(loggedInRole);
    } catch (error) {
      setRequestSuccess("");
      setRequestError(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function updateProduct(productId: string, changes: Partial<Product>) {
    await apiRequest(`/api/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({
        sku: changes.sku,
        name: changes.name,
        category: changes.category,
        description: changes.description,
        dimension: changes.dimension,
        baseUnit: changes.baseUnit,
        availableQuantity: changes.availableQuantity,
        pricePerBaseUnit: changes.pricePerBaseUnit,
        isActive: changes.isActive,
      }),
    });

    await loadDashboardData(loggedInRole);
  }

  function updateProductDimension(product: Product, dimension: ProductDimension) {
    updateProduct(product.id, {
      dimension,
      baseUnit: unitsByDimension[dimension][0],
    });
  }

  async function deleteProduct(productId: string) {
    await apiRequest(`/api/products/${productId}`, {
      method: "DELETE",
    });

    await loadDashboardData(loggedInRole);
  }

  async function updateOrderStatus(orderId: string, status: Order["status"]) {
    await apiRequest(`/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    await loadDashboardData(loggedInRole);
  }

  if (!sessionChecked) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-copy-block">
            <p className="eyebrow eyebrow-chip">Secure session</p>
            <h1>AasaMedChem</h1>
            <p className="login-copy">
              Restoring your dashboard and loading the latest product data from
              the database.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-copy-block">
            <p className="eyebrow eyebrow-chip">AasaMedChem Assignment</p>
            <h1>Track lab stock without the usual clutter.</h1>
            <p className="login-copy">
              A cleaner way to quote chemicals, manage inventory, and keep
              buyer and seller workflows separate.
            </p>
          </div>

          <div className="login-card">
            <div className="login-card-head">
              <p className="eyebrow">Secure demo login</p>
              <div className="auth-switch">
                <button
                  className={authMode === "login" ? "auth-tab active" : "auth-tab"}
                  onClick={() => {
                    setAuthMode("login");
                    setLoginError("");
                    setSignupError("");
                  }}
                  type="button"
                >
                  Login
                </button>
                <button
                  className={authMode === "signup" ? "auth-tab active" : "auth-tab"}
                  onClick={() => {
                    setAuthMode("signup");
                    setLoginError("");
                    setSignupError("");
                  }}
                  type="button"
                >
                  Sign up
                </button>
              </div>
            </div>

            {authMode === "login" ? (
              <form className="login-form" onSubmit={handleLogin}>
                <label>
                  Email
                  <input
                    placeholder="buyer@aasamedchem.test"
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                  />
                </label>

                <label>
                  Password
                  <input
                    placeholder="Your password"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                  />
                </label>

                {loginError ? <p className="login-error">{loginError}</p> : null}

                <button className="primary-button" type="submit">
                  Login
                </button>

                <p className="helper-copy">
                  Need an account? Switch to sign up. Admin login is issued only
                  from the backend.
                </p>

                <div className="demo-note">
                  <span>Admin: admin@aasamedchem.test / Admin@123</span>
                  <span>Seller: seller@aasamedchem.test / Seller@123</span>
                  <span>Buyer: buyer@aasamedchem.test / Buyer@123</span>
                </div>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleSignup}>
                <label>
                  Full name
                  <input
                    placeholder="Asha Roy"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                  />
                </label>

                <label>
                  Email
                  <input
                    placeholder="name@example.com"
                    type="email"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                  />
                </label>

                <div className="quantity-row">
                  <label>
                    Role
                    <select
                      value={signupRole}
                      onChange={(event) =>
                        setSignupRole(event.target.value as Exclude<Role, "admin">)
                      }
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                    </select>
                  </label>

                  <label>
                    Account type
                    <input disabled value="Buyer / Seller only" />
                  </label>
                </div>

                <label>
                  Password
                  <input
                    placeholder="Create a strong password"
                    type="password"
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                  />
                </label>

                <label>
                  Confirm password
                  <input
                    placeholder="Re-enter password"
                    type="password"
                    value={signupConfirmPassword}
                    onChange={(event) => setSignupConfirmPassword(event.target.value)}
                  />
                </label>

                {signupError ? <p className="login-error">{signupError}</p> : null}

                <button className="primary-button" type="submit">
                  Create account
                </button>

                <p className="helper-copy">
                  Admin access is not available here. Buyers and sellers can
                  create accounts directly.
                </p>
              </form>
            )}
          </div>

          <div className="feature-strip">
            <div className="feature-card">
              <span>01 /</span>
              <strong>Base-unit storage</strong>
              <p>Weight lives in grams, volume in milliliters, and count in units.</p>
            </div>
            <div className="feature-card">
              <span>02 /</span>
              <strong>INR pricing</strong>
              <p>Rates stay stored per base unit as precise PostgreSQL numeric values.</p>
            </div>
            <div className="feature-card">
              <span>03 /</span>
              <strong>Role panels</strong>
              <p>Admins manage inventory and orders, while sellers place quotations.</p>
            </div>
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
          <strong>{loggedInName}</strong>
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

            {buyerProducts.length > 0 ? (
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
                        {product.sku} | {product.category} sold by {product.listedBy}
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
            ) : (
              <div className="empty-state request-empty">
                <strong>No products matched your search.</strong>
                <p>
                  Request the product from admin and they will see which buyer
                  asked for it.
                </p>
                <form className="request-form" onSubmit={requestProductFromAdmin}>
                  <label>
                    Requested product
                    <input
                      placeholder="Example: Acetone"
                      value={requestProductName || deferredBuyerSearch}
                      onChange={(event) => setRequestProductName(event.target.value)}
                    />
                  </label>
                  <label>
                    Category
                    <input
                      placeholder="Example: Solvent"
                      value={requestCategory}
                      onChange={(event) => setRequestCategory(event.target.value)}
                    />
                  </label>
                  <label>
                    Notes
                    <input
                      placeholder="Any pack size, purity, or brand preference"
                      value={requestNotes}
                      onChange={(event) => setRequestNotes(event.target.value)}
                    />
                  </label>
                  {requestError ? <p className="login-error">{requestError}</p> : null}
                  {requestSuccess ? <p className="request-success">{requestSuccess}</p> : null}
                  <button className="primary-button" type="submit">
                    Request product
                  </button>
                </form>
              </div>
            )}
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
                        (product) => product.id === event.target.value,
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

            <div className="unit-tip">
              Try divisible quantities like <strong>100 g</strong> for a 1 kg
              product, or <strong>250 mL</strong> for a 1 L product. The app
              converts it back to the stored base unit automatically.
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
                <h2>Publish and manage your stock</h2>
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

              <label>
                SKU
                <input
                  placeholder="CHEM-POTASSIUM-BROMIDE-001"
                  value={sellerProduct.sku}
                  onChange={(event) =>
                    setSellerProduct({
                      ...sellerProduct,
                      sku: event.target.value,
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
                  Description
                  <input
                    placeholder="Short product note"
                    value={sellerProduct.description}
                    onChange={(event) =>
                      setSellerProduct({
                        ...sellerProduct,
                        description: event.target.value,
                      })
                    }
                  />
                </label>

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

            <div className="unit-tip">
              The products you publish below are stored in your own seller
              account and will appear in the panel beside this form.
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">My listings</p>
                <h2>Products published by you</h2>
              </div>
              <span>{products.length} items</span>
            </div>

            {products.length > 0 ? (
              <div className="product-list">
                {products.map((product) => (
                  <div className="product-row seller-product-row" key={product.id}>
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {product.sku} | {product.category} | listed by you
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No products listed yet. Publish one above and it will appear
                here instantly.
              </div>
            )}
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
                            {product.sku} | {product.category} sold by {product.listedBy}
                            </small>
                          </>
                        )}
                    </div>

                    {isEditing ? (
                      <div className="admin-edit-grid">
                        <input
                          value={product.sku}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              sku: event.target.value,
                            })
                          }
                        />
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
                        <select
                          value={String(product.isActive)}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              isActive: event.target.value === "true",
                            })
                          }
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
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
                        <span>{product.isActive ? "Active" : "Inactive"}</span>
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
                <p className="eyebrow">Product requests</p>
                <h2>Buyer requests for unavailable products</h2>
              </div>
              <span>{productRequests.length} requests</span>
            </div>

            <RequestList requests={productRequests} />
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
  onStatusChange: (orderId: string, status: Order["status"]) => void;
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
              {getOrderStatusOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
    </div>
  );
}

function RequestList({ requests }: { requests: ProductRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="empty-state">
        Buyer requests will appear here with the buyer name, email, and the
        product they asked for.
      </div>
    );
  }

  return (
    <div className="request-list">
      {requests.map((request) => (
        <div className="request-row" key={request.id}>
          <div>
            <strong>{request.requestedProductName}</strong>
            <small>
              {request.buyerName} ({request.buyerEmail})
            </small>
          </div>
          <div>
            <span>
              Category: {request.requestedCategory || "Not specified"}
            </span>
            <span>Notes: {request.notes || "No notes added"}</span>
            <strong className="request-status">{request.status}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
