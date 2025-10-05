import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { openDB } from "idb";
import CustomerRegister from "@/components/CustomerRegister";
import Select from "react-select";

// --- IndexedDB helper functions ---
async function initDB() {
  return openDB("pos-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("salesQueue")) {
        db.createObjectStore("salesQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
}

async function addSaleOffline(sale) {
  const db = await initDB();
  await db.add("salesQueue", { ...sale, createdAt: Date.now() });
}

async function getAllOfflineSales() {
  const db = await initDB();
  return db.getAll("salesQueue");
}

async function removeOfflineSale(id) {
  const db = await initDB();
  await db.delete("salesQueue", id);
}

// --- Sale Component ---
function SaleRow({ batch, idx, selectedIndex, addToCart }) {
  return (
    <tr className={`${idx === selectedIndex ? "bg-blue-100" : ""}`}>
      <td className="p-2">{batch.id}</td>
      <td className="p-2 font-medium">{batch.productName}</td>
      <td className="p-2">{batch.price.toFixed(2)}</td>
      <td className="p-2">{batch.stock}</td>
      <td className="p-2">{batch.expiry || "—"}</td>
      <td className="p-2 text-right">
        <button
          onClick={() => addToCart(batch, 1)}
          className="bg-green-600 hover:bg-green-700 shadow-md shadow-green-300 hover:shadow-green-100 text-white px-3 py-1 rounded"
        >
          Add +
        </button>
      </td>
    </tr>
  );
}

export default function Home() {
  const [batches, setBatches] = useState([]);
  const [page, setPage] = useState(1);
  const defaultPageSize =
    Number(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE) || 50;
  const maxPageSize = Number(process.env.NEXT_PUBLIC_MAX_PAGE_SIZE) || 200;
  const pageSizeOptions = [10, 25, 50, 100].filter((n) => n <= maxPageSize);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [totalItems, setTotalItems] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cart, setCart] = useState([]);
  const cartRef = useRef(null);
  const prevCartLength = useRef(cart.length);
  const [highlightedRowId, setHighlightedRowId] = useState(null);

  const addToCart = useCallback((batch, qty = 1) => {
    setCart((cart) => {
      const existing = cart.find(
        (c) =>
          c.product_batch_id === batch.id ||
          c.product_batch_id === batch.product_batch_id
      );
      if (existing) {
        return cart.map((c) =>
          c.product_batch_id === (batch.id || batch.product_batch_id)
            ? {
                ...c,
                quantity: Math.min(c.quantity + qty, batch.stock ?? c.stock),
              }
            : c
        );
      } else {
        return [
          ...cart,
          {
            product_batch_id: batch.id || batch.product_batch_id,
            productName: batch.productName || batch.product_name,
            price: (batch.price ?? Number(batch.price)) || 0,
            quantity: Math.min(qty, batch.stock ?? 0),
            discount: 0,
            stock: batch.stock ?? 0,
            expiry: batch.expiry,
          },
        ];
      }
    });
  }, []);

  function updateDiscount(batchId, discountPercent) {
    const d = Math.max(0, Math.min(100, Number(discountPercent) || 0));
    setCart((prev) =>
      prev.map((c) =>
        c.product_batch_id === batchId ? { ...c, discount: d } : c
      )
    );
  }

  function removeFromCart(batchId) {
    setCart((prev) => prev.filter((c) => c.product_batch_id !== batchId));
  }

  function updateQty(batchId, qty) {
    const n = Number(qty) || 0;
    if (n <= 0) return removeFromCart(batchId);
    setCart((prev) =>
      prev.map((c) =>
        c.product_batch_id === batchId
          ? { ...c, quantity: Math.min(n, c.stock ?? n) }
          : c
      )
    );
  }
  const [customers, setCustomers] = useState([{ id: 0, name: "Walk-in" }]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0].id);
  const [isOnline, setIsOnline] = useState(true);
  const [globalDiscount, setGlobalDiscount] = useState(1); // percent
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  const options = customers.map((c) => ({
    value: c.id,
    label: ` ${c.name}${c.phone ? ` (${c.phone})` : ""}`,
  }));

  const selected =
    options.find((opt) => opt.value === selectedCustomerId) || null;
  const loadCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to load customers");
      const data = await res.json();
      setCustomers(data.customers);
    } catch (err) {
      console.error("Failed to load customers:", err);
      // Keep default Walk-in customer if API fails
      setCustomers([{ id: 1, name: "Walk-in" }]);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const setLastCustomer = () =>
    setSelectedCustomerId(
      customers.length > 0 ? Math.max(...customers.map((c) => c.id + 1)) : 1
    );

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((b) =>
      (b.productName || "").toLowerCase().includes(q)
    );
  }, [batches, query]);

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (query) params.set("q", query);
        const res = await fetch("/api/items?" + params.toString());
        if (!res.ok) throw new Error("Failed to load items");
        const data = await res.json();
        if (cancelled) return;
        const items = data.items.map((d) => ({
          id: d.id,
          productName: d.productName || d.product_name,
          price: Number(d.price),
          stock: d.stock != null ? Number(d.stock) : 0,
          expiry: d.expiry
            ? typeof d.expiry === "string"
              ? d.expiry.split("T")[0]
              : d.expiry
            : null,
        }));
        if (page === 1) setBatches(items);
        else setBatches((prev) => prev.concat(items));
        setTotalItems(data.total || 0);
      } catch (e) {
        console.error("Failed to fetch items", e);
      }
    }
    loadItems();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, query]);
  // --- Totals calculations (ensure variables are defined for UI and receipt)
  const subtotalBeforeLineDiscount = cart.reduce(
    (s, it) => s + it.price * it.quantity,
    0
  );
  const lineDiscountAmount = +cart
    .reduce(
      (s, it) =>
        s +
        ((it.discount ? Number(it.discount) : 0) * (it.price * it.quantity)) /
          100,
      0
    )
    .toFixed(2);
  const grossTotal = +(
    subtotalBeforeLineDiscount - Number(lineDiscountAmount)
  ).toFixed(2);
  const globalDiscPercent = Math.max(
    0,
    Math.min(100, Number(globalDiscount) || 0)
  );
  const globalDiscountAmount = +(
    grossTotal *
    (globalDiscPercent / 100)
  ).toFixed(2);
  const netAmount = +(grossTotal - globalDiscountAmount).toFixed(2);
  function printReceipt() {
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const win = window.open("", "PRINT", "height=600,width=400");
    win.document.write("<html><head><title>Receipt</title>");
    win.document.write(
      "<style>body { font-family: monospace; font-size: 12px; width: 72mm; }</style>"
    );
    win.document.write("</head><body>");
    win.document.write('<h3 style="text-align:center">SALES RECEIPT</h3>');
    win.document.write(`<div>Customer: ${customer?.name || ""}</div>`);
    win.document.write("<hr/>");
    cart.forEach((item) => {
      const itDisc = item.discount ? Number(item.discount) : 0;
      const line = (item.price * item.quantity * (1 - itDisc / 100)).toFixed(2);
      win.document.write(
        `<div>${item.productName} x${item.quantity} — Rs ${line}</div>`
      );
    });
    win.document.write("<hr/>");
    win.document.write(
      `<div>Subtotal: Rs ${subtotalBeforeLineDiscount.toFixed(2)}</div>`
    );
    win.document.write(
      `<div>Line Discount: Rs ${Number(lineDiscountAmount).toFixed(2)}</div>`
    );
    win.document.write(`<div>Gross Total: Rs ${grossTotal.toFixed(2)}</div>`);
    win.document.write(
      `<div>Global discount (${globalDiscPercent}%): Rs ${globalDiscountAmount.toFixed(
        2
      )}</div>`
    );
    win.document.write(`<div>Net Amount: Rs ${netAmount.toFixed(2)}</div>`);
    win.document.write('<hr/><div style="text-align:center">Thank you!</div>');
    win.document.write("</body></html>");
    win.document.close();
    win.print();
  }

  async function checkout() {
    if (cart.length === 0) return alert("Cart is empty");
    const sale = {
      items: cart,
      total: netAmount,
      globalDiscount: globalDiscPercent,
      globalDiscountAmount,
      lineDiscountAmount,
      customerId: selectedCustomerId,
      createdAt: Date.now(),
    };

    if (!navigator.onLine) {
      try {
        await addSaleOffline(sale);
        alert("No internet! Sale saved offline.");
      } catch (error) {
        console.error("Failed to save offline:", error);
        alert("Failed to save sale offline");
        return;
      }
    } else {
      try {
        const response = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sale),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error("Failed to save sale:", error);
        alert("Failed to save sale");
        return;
      }
    }

    printReceipt();
    setCart([]);
  }

  const handleKeyDown = useCallback(
    (e) => {
      if (filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        // If not at end of filtered list, move down normally
        if (selectedIndex < filtered.length - 1) {
          setSelectedIndex((prev) => prev + 1);
        } else {
          // At end: if there are more items on server, load next page and advance selection
          if (batches.length < totalItems) {
            setPage((p) => p + 1);
            setSelectedIndex((prev) => prev + 1);
          } else {
            // wrap to top
            setSelectedIndex(0);
          }
        }
      } else if (e.key === "ArrowUp") {
        // Move up, wrapping around
        if (selectedIndex > 0) setSelectedIndex((prev) => prev - 1);
        else setSelectedIndex(filtered.length - 1);
      } else if (e.key === "Enter") addToCart(filtered[selectedIndex]);
    },
    [filtered, selectedIndex, batches, totalItems, addToCart]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    async function syncOfflineSales() {
      if (!navigator.onLine) return;
      const offlineSales = await getAllOfflineSales();
      for (const sale of offlineSales) {
        try {
          await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sale),
          });
          await removeOfflineSale(sale.id);
        } catch (e) {
          console.error("Sync failed", e);
        }
      }
    }
    window.addEventListener("online", syncOfflineSales);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("online", syncOfflineSales);
    };
  }, [handleKeyDown]);

  // When a new item is added to the cart (length increases), scroll the cart container to bottom
  useEffect(() => {
    try {
      if (!cartRef.current) return;
      if (cart.length > prevCartLength.current) {
        cartRef.current.scrollTop = cartRef.current.scrollHeight;
        // highlight the newly added bottom row briefly
        const last = cart[cart.length - 1];
        if (last) {
          setHighlightedRowId(last.product_batch_id);
          setTimeout(() => setHighlightedRowId(null), 1200);
        }
      }
    } finally {
      prevCartLength.current = cart.length;
    }
  }, [cart.length, cart]);

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== "undefined") {
      // Set initial online status
      setIsOnline(navigator.onLine);

      // Event handlers
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      // Add event listeners
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Cleanup
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []); // Empty dependency array since we only want to run this once

  return (
    <div className="min-h-screen bg-gradient-to-l from-slate-500 to-slate-700 p-2 sm:p-6">
      <div className="max-w-full mx-auto">
        <header className="mb-2 flex flex-col  sm:flex-row items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-200 mb-2 sm:mb-0">
            POS — Sales
          </h1>
          <div
            className={`font-semibold ${
              isOnline ? "text-green-600" : "text-red-600"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <section className="sm:col-span-7 bg-white rounded-lg shadow shadow-gray-700 p-2 sm:p-4 h-[60vh] sm:h-[85vh] overflow-auto">
            <div className="flex  items-center  gap-2 mb-3">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search product..."
                className="flex-1 border rounded p-2"
              />
              <button
                className="border rounded p-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xl"
                onClick={() => setQuery("")}
              >
                &larr;
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setPage(1);
                  setBatches([]);
                  setPageSize(val);
                }}
                className="border rounded p-2"
              >
                {pageSizeOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <table className="w-full text-sm ">
              <thead className="text-left text-gray-600 ">
                <tr className=" border-sky-600  divide-sky-600 bg-gradient-to-tl from-sky-100 to-sky-50">
                  <th className="p-2 border border-sky-600 ">ID</th>
                  <th className="p-2 border border-sky-600 ">Product</th>
                  <th className="p-2 border border-sky-600 ">Price</th>
                  <th className="p-2 border border-sky-600 ">Stock</th>
                  <th className="p-2 border border-sky-600 ">Expiry</th>
                  <th className="p-2 border border-sky-600 "></th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-600">
                {filtered.map((b, idx) => (
                  <SaleRow
                    key={b.id}
                    batch={b}
                    idx={idx}
                    selectedIndex={selectedIndex}
                    addToCart={addToCart}
                  />
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-center">
              {batches.length < totalItems ? (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700  text-white rounded"
                >
                  Load more items
                </button>
              ) : (
                <div className="text-sm border border-sky-200 rounded p-2 text-gray-500">
                  All items loaded
                </div>
              )}
            </div>
          </section>

          <aside className="sm:col-span-5 bg-white rounded-lg shadow flex flex-col p-2 sm:p-4 h-[85vh] sm:h-[85vh]">
            <div className="mb-4 flex gap-2">
              <Select
                className="flex-1"
                value={selected}
                onChange={(option) => setSelectedCustomerId(option?.value ?? 1)}
                options={options}
                placeholder="Search or select customer..."
                isClearable
                isSearchable
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: "0.5rem",
                    padding: "2px",
                  }),
                }}
              />
              <button
                onClick={() => setShowCustomerDialog(true)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow shadow-green-300"
              >
                Register New
              </button>
            </div>

            <div ref={cartRef} className="flex-1 overflow-auto">
              <div className=" border-b bg-slate-50">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                  <div>Product</div>
                  <div className="flex items-center space-x-6">
                    <div className="w-6 text-left">Qty</div>
                    <div className="w-26 text-center">Disc %</div>
                  </div>
                </div>
              </div>
              {cart.map((item, index) => {
                const disc = item.discount ? Number(item.discount) : 0;
                const lineTotal = item.price * item.quantity * (1 - disc / 100);
                return (
                  <div
                    key={item.product_batch_id}
                    className={`p-1 hover:bg-blue-100 bg-slate-100 ${
                      highlightedRowId === item.product_batch_id
                        ? "cart-glow"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-center border-b">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {index + 1}. {item.productName}
                        </div>
                        <div className="text-xs text-gray-600">
                          Rs {item.price.toFixed(2)} × {item.quantity} ={" "}
                          <span className=" font-bold">
                            Rs {lineTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            updateQty(item.product_batch_id, item.quantity - 1)
                          }
                          className="px-2 py-0.5 bg-gray-300 hover:bg-gray-400 font-medium rounded text-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = val === "" ? 0 : parseInt(val, 10);
                            if (Number.isNaN(num)) return;
                            updateQty(item.product_batch_id, num);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-12 text-center border rounded p-0.5 text-sm"
                        />
                        <button
                          onClick={() =>
                            updateQty(item.product_batch_id, item.quantity + 1)
                          }
                          className="px-2 py-0.5 bg-gray-300 hover:bg-gray-400 font-medium rounded text-sm"
                        >
                          +
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={disc}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            updateDiscount(
                              item.product_batch_id,
                              e.target.value
                            )
                          }
                          className="w-12 text-center border rounded p-0.5 text-sm"
                          title="Discount %"
                        />
                        <button
                          onClick={() => removeFromCart(item.product_batch_id)}
                          className=" text-md hover:shadow-red-800 text-red-200 bg-red-500 hover:bg-red-600 w-5 h-5 rounded-full "
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className=" pt-1 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal :</span>
                <span>Rs {subtotalBeforeLineDiscount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Line Discount Amount:</span>
                <span>Rs {Number(lineDiscountAmount).toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-semibold">
                <span>Gross Total:</span>
                <span>Rs {grossTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between ">
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-14 text-center border rounded p-1"
                  />
                </div>
                <div className="text-sm">
                  Rs {globalDiscountAmount.toFixed(2)}
                </div>
              </div>

              <div className="flex justify-between font-bold pt-2">
                <span>Net Amount:</span>
                <span>Rs {netAmount.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={checkout}
                  className="w-full bg-sky-600 hover:bg-sky-700 shadow shadow-sky-400 text-white py-2 rounded"
                >
                  Pay Only
                </button>
                <button
                  onClick={checkout}
                  className="w-full bg-blue-600 hover:bg-blue-700 shadow shadow-blue-400 text-white py-2 rounded"
                >
                  Pay & Print
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <CustomerRegister
        open={showCustomerDialog}
        onClose={() => {
          setShowCustomerDialog(false), loadCustomers(), setLastCustomer();
        }}
      />
    </div>
  );
}
