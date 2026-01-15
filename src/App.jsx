import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Coffee,
  ShoppingCart,
  Settings,
  LogOut,
  Trash2,
  CheckCircle,
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  RefreshCw,
  Printer,
  X,
  Sandwich,
  IceCream,
  Flame,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- SUPABASE ---
const SUPABASE_URL = "https://ygvgoqbbfanzpuulxrgj.supabase.co";
const SUPABASE_KEY = "sb_publishable_lHS0fQRNHsbes7v9CoMakA_Bw1k1yYU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = [
  { id: "all", name: "Barchasi", icon: <LayoutDashboard size={18} /> },
  { id: "fastfood", name: "Fast Food", icon: <Sandwich size={18} /> },
  { id: "coffee", name: "Kofe", icon: <Coffee size={18} /> },
  { id: "tea", name: "Choy", icon: <ChefHat size={18} /> },
  { id: "drink", name: "Ichimlik", icon: <IceCream size={18} /> },
];

const App = () => {
  const [role, setRole] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [adminSection, setAdminSection] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // YANGI: Telefonda savatni ochish/yopish
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    cleanAndInitializeMenu();
    fetchOrders();
    const channel = supabase
      .channel("realtime_orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function cleanAndInitializeMenu() {
    const { data: existingData } = await supabase.from("menu").select("*");
    const idealMenu = [
      { name: "Lavash (Mol)", price: 3.5, category: "fastfood" },
      { name: "Lavash (Tovuq)", price: 3.0, category: "fastfood" },
      { name: "Cheeseburger", price: 4.0, category: "fastfood" },
      { name: "Double Burger", price: 5.5, category: "fastfood" },
      { name: "Hot-Dog Royal", price: 2.5, category: "fastfood" },
      { name: "Club Sendvich", price: 3.5, category: "fastfood" },
      { name: "Fri Kartoshka", price: 1.5, category: "fastfood" },
      { name: "Pepperoni Pitsa", price: 6.0, category: "fastfood" },
      { name: "Amerikano", price: 1.5, category: "coffee" },
      { name: "Kapuchino", price: 2.2, category: "coffee" },
      { name: "Latte Macchiato", price: 2.5, category: "coffee" },
      { name: "Espresso", price: 1.2, category: "coffee" },
      { name: "Qora Choy (Choynak)", price: 0.5, category: "tea" },
      { name: "Ko'k Choy (Choynak)", price: 0.5, category: "tea" },
      { name: "Limon Choy", price: 1.0, category: "tea" },
      { name: "Coca-Cola 0.5", price: 1.0, category: "drink" },
      { name: "Fanta 0.5", price: 1.0, category: "drink" },
      { name: "Moxito (Muzdek)", price: 2.0, category: "drink" },
      { name: "Suv (Gazsiz)", price: 0.5, category: "drink" },
    ];

    if (
      !existingData ||
      existingData.length === 0 ||
      existingData.length > idealMenu.length + 5
    ) {
      if (existingData?.length > 0)
        await supabase.from("menu").delete().neq("id", 0);
      await supabase.from("menu").insert(idealMenu);
    }
    const { data: finalData } = await supabase
      .from("menu")
      .select("*")
      .order("name");
    const uniqueMenu = finalData
      ? finalData.filter(
          (v, i, a) => a.findIndex((v2) => v2.name === v.name) === i
        )
      : [];
    setMenu(uniqueMenu);
  }

  async function fetchMenu() {
    const { data } = await supabase.from("menu").select("*").order("name");
    if (data) {
      const uniqueData = data.filter(
        (v, i, a) => a.findIndex((v2) => v2.name === v.name) === i
      );
      setMenu(uniqueData);
    }
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setOrders(data);
  }

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing)
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((i) => i.id !== id));
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    const orderData = {
      items: cart,
      total: cartTotal,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("orders")
      .insert([orderData])
      .select();
    setLoading(false);
    if (!error) {
      setLastOrder({ ...orderData, id: data[0].id });
      setShowReceipt(true);
      setCart([]);
      setIsCartOpen(false); // Savatni yopamiz
    }
  };

  const handlePrint = () => window.print();

  const updatePrice = async (id, newPrice) => {
    setMenu(
      menu.map((item) =>
        item.id === id ? { ...item, price: parseFloat(newPrice) } : item
      )
    );
    await supabase
      .from("menu")
      .update({ price: parseFloat(newPrice) })
      .eq("id", id);
  };

  const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  const filteredMenu =
    selectedCategory === "all"
      ? menu
      : menu.filter((m) => m.category === selectedCategory);

  const getItemIcon = (name, category) => {
    const n = name.toLowerCase();
    if (category === "fastfood") {
      if (n.includes("burger")) return "🍔";
      if (n.includes("lavash")) return "🌯";
      if (n.includes("hot-dog")) return "🌭";
      if (n.includes("pitsa")) return "🍕";
      if (n.includes("fri") || n.includes("kartoshka")) return "🍟";
      if (n.includes("sendvich") || n.includes("club")) return "🥪";
      return "🌮";
    }
    if (category === "coffee") {
      if (n.includes("espresso")) return "☕";
      return "🥤";
    }
    if (category === "tea") return "🫖";
    if (category === "drink") {
      if (n.includes("cola") || n.includes("fanta")) return "🥤";
      if (n.includes("suv")) return "💧";
      if (n.includes("moxito")) return "🍹";
      return "🧃";
    }
    return "🍽️";
  };

  if (!role) {
    return (
      <div
        className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white notranslate"
        translate="no"
      >
        <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-red-500"></div>
          <div className="bg-gradient-to-br from-amber-400 to-red-500 w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20 transform rotate-3">
            <Flame size={40} className="text-white fill-white" />
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight">FoodPOS</h1>
          <p className="text-slate-400 mb-8 text-sm font-medium">
            Restoran boshqaruv tizimi
          </p>
          <button
            onClick={() => setRole("cashier")}
            className="w-full bg-emerald-500 hover:bg-emerald-600 py-4 rounded-xl font-bold mb-4 flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <ShoppingCart /> KASSIR REJIMI
          </button>
          <button
            onClick={() => {
              if (prompt("Parol:") === "1234") setRole("admin");
            }}
            className="w-full bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <Settings /> ADMIN PANELI
          </button>
        </div>
      </div>
    );
  }

  if (role === "cashier") {
    return (
      <div
        className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden notranslate"
        translate="no"
      >
        {showReceipt && lastOrder && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 print:bg-white print:p-0 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-2xl relative print:w-full print:shadow-none print:rounded-none overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-3 bg-slate-800 print:hidden"></div>
              <button
                onClick={() => setShowReceipt(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-red-500 print:hidden bg-slate-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
              <div className="text-center border-b-2 border-dashed border-slate-200 pb-6 mb-6 mt-4">
                <div className="flex justify-center mb-3">
                  <Flame size={32} className="text-slate-800 fill-slate-800" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900">
                  FAST FOOD
                </h2>
                <p className="text-xs text-slate-500 mt-2 font-mono">
                  {new Date(lastOrder.created_at).toLocaleString()}
                </p>
                <div className="bg-slate-100 inline-block px-3 py-1 rounded-lg mt-2">
                  <h3 className="text-sm font-bold text-slate-700">
                    CHEK #{lastOrder.id}
                  </h3>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {lastOrder.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm font-bold text-slate-700 border-b border-slate-50 pb-2"
                  >
                    <span>
                      {item.name}{" "}
                      <span className="text-xs font-normal text-slate-400 ml-1">
                        x{item.qty}
                      </span>
                    </span>
                    <span>${(item.price * item.qty).toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-between text-3xl font-black text-slate-900">
                <span>JAMI:</span>
                <span>${lastOrder.total.toFixed(1)}</span>
              </div>
              <button
                onClick={handlePrint}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold mt-8 flex items-center justify-center gap-2 print:hidden hover:bg-slate-800 active:scale-95 transition shadow-xl"
              >
                <Printer size={20} /> CHOP ETISH
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative print:hidden pb-24 md:pb-0">
          <div className="bg-white px-6 py-4 shadow-sm flex justify-between items-center z-10 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 transform -rotate-6">
                <Flame size={24} className="text-white fill-white" />
              </div>
              <div>
                <h2 className="font-black text-xl text-slate-800 tracking-tight leading-none">
                  MENYU
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Kassir Paneli
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  cleanAndInitializeMenu();
                }}
                className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={() => setRole(null)}
                className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition"
              >
                <LogOut size={16} /> Chiqish
              </button>
            </div>
          </div>

          <div className="bg-white border-b border-slate-100 overflow-x-auto flex gap-3 p-3 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? "bg-slate-900 text-white border-slate-800 shadow-md transform -translate-y-0.5"
                    : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start bg-slate-50/50">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-200 active:scale-95 transition-all cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-50 to-transparent rounded-bl-full -mr-6 -mt-6 transition-all group-hover:from-amber-100"></div>
                <div className="flex-1 flex items-center justify-center mb-2 z-10">
                  <span className="text-6xl drop-shadow-md transition-transform group-hover:scale-110 group-hover:rotate-6 filter">
                    {getItemIcon(item.name, item.category)}
                  </span>
                </div>
                <div className="z-10">
                  <h3 className="font-bold text-slate-800 leading-tight text-sm md:text-base mb-2 line-clamp-2">
                    {item.name}
                  </h3>
                  <div className="flex justify-between items-center">
                    <p className="text-slate-800 font-black text-lg">
                      ${item.price}
                    </p>
                    <div className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transform translate-x-10 group-hover:translate-x-0 transition-transform">
                      <PlusIcon size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SAVAT: TELEFONDA SUZIB YURUVCHI TUGMA */}
        <div className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%]">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                {cart.length}
              </div>
              <span className="font-bold">Savatni ochish</span>
            </div>
            <span className="font-black text-lg">${cartTotal.toFixed(1)}</span>
          </button>
        </div>

        {/* SAVAT: KOMPYUTERDA DOIMIY, TELEFONDA MODAL */}
        <div
          className={`fixed inset-0 z-50 md:static md:inset-auto md:z-20 w-full md:w-[400px] bg-black/50 md:bg-transparent transition-opacity ${
            isCartOpen
              ? "opacity-100 visible"
              : "opacity-0 invisible md:opacity-100 md:visible"
          }`}
        >
          <div
            className={`absolute bottom-0 left-0 w-full h-[85vh] md:h-full bg-white rounded-t-[2.5rem] md:rounded-none flex flex-col shadow-2xl transition-transform duration-300 ${
              isCartOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"
            }`}
          >
            {/* Tutqich (Telefonda yopish uchun) */}
            <div
              onClick={() => setIsCartOpen(false)}
              className="w-full h-8 flex justify-center items-center md:hidden cursor-pointer"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <ShoppingCart className="text-amber-500 fill-amber-500" />{" "}
                Buyurtma
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="md:hidden p-2 bg-slate-100 rounded-full"
              >
                <ChevronDown size={20} />
              </button>
              <span className="hidden md:block bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-sm font-black">
                {cart.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4">
                  <ShoppingBasketIcon size={80} className="opacity-20" />
                  <p className="text-sm font-medium text-slate-400">
                    Hozircha bo'sh...
                  </p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 group hover:border-amber-200 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-slate-100">
                        {getItemIcon(item.name, item.category)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 font-bold mt-0.5">
                          ${item.price} x {item.qty}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-800 text-lg">
                        ${(item.price * item.qty).toFixed(1)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-9 h-9 flex items-center justify-center bg-white text-slate-300 border border-slate-200 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 bg-white border-t border-slate-100 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 pb-8 md:pb-6">
              <div className="flex justify-between text-3xl font-black text-slate-900 tracking-tight">
                <span>Jami:</span>
                <span>${cartTotal.toFixed(1)}</span>
              </div>
              <button
                onClick={submitOrder}
                disabled={cart.length === 0 || loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white py-5 rounded-2xl font-bold shadow-xl shadow-slate-200 active:scale-95 transition flex items-center justify-center gap-3 text-lg"
              >
                {loading ? (
                  "Yuborilmoqda..."
                ) : (
                  <>
                    <CheckCircle fill="white" className="text-slate-900" />{" "}
                    ZAKAZ BERISH
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div
        className="min-h-screen bg-slate-50 font-sans notranslate"
        translate="no"
      >
        <header className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-xl">
              <Settings size={20} className="text-white" />
            </div>
            <h1 className="font-bold text-lg">Boshqaruv Paneli</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                cleanAndInitializeMenu();
                fetchOrders();
              }}
              className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={() => setRole(null)}
              className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <div className="flex bg-white border-b px-4 gap-8 overflow-x-auto shadow-sm">
          {["dashboard", "menu", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setAdminSection(tab)}
              className={`py-4 text-sm font-bold border-b-2 uppercase tracking-wide transition-colors ${
                adminSection === tab
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab === "dashboard"
                ? "Statistika"
                : tab === "menu"
                ? "Menyu"
                : "Tarix"}
            </button>
          ))}
        </div>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {adminSection === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-widest">
                    Jami Savdo
                  </div>
                  <div className="text-4xl font-black text-slate-800 tracking-tight">
                    ${totalSales.toFixed(1)}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-widest">
                    Buyurtmalar
                  </div>
                  <div className="text-4xl font-black text-blue-600 tracking-tight">
                    {orders.length} ta
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-80">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>{" "}
                  Jonli Savdo Dinamikasi
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart
                    data={orders
                      .slice()
                      .reverse()
                      .map((o, i) => ({ name: i + 1, total: o.total }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />{" "}
                    <Tooltip />{" "}
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                    <defs>
                      <linearGradient
                        id="colorTotal"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f59e0b"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {adminSection === "menu" && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 bg-white border-b font-bold text-lg text-slate-800">
                Mahsulotlar va Narxlar
              </div>
              <div className="divide-y divide-slate-100">
                {menu.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex justify-between items-center hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl">
                        {getItemIcon(item.name, item.category)}
                      </div>
                      <span className="font-bold text-slate-700">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                      <span className="text-slate-400 text-sm pl-2">$</span>
                      <input
                        type="number"
                        defaultValue={item.price}
                        onBlur={(e) => updatePrice(item.id, e.target.value)}
                        className="w-16 bg-transparent font-bold text-center outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {adminSection === "history" && (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition"
                >
                  <div>
                    <div className="font-black text-slate-800 text-lg mb-1">
                      Buyurtma #{order.id}
                    </div>
                    <div className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-lg w-fit">
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-2xl text-emerald-500">
                      ${order.total}
                    </div>
                    <div className="text-xs text-slate-400 font-bold mt-1">
                      {order.items.length} xil mahsulot
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
};

const ShoppingBasketIcon = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m5 11 4-7" />
    <path d="m19 11-4-7" />
    <path d="M2 11h20" />
    <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4" />
    <path d="m9 11 1 9" />
    <path d="m4.5 11 .1 9" />
    <path d="m15 11-1 9" />
    <path d="m19.5 11-.1 9" />
  </svg>
);
const PlusIcon = ({ size }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

export default App;
