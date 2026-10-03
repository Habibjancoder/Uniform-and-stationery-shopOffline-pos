'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  Clock,
  Printer,
  CreditCard,
  Banknote,
  CheckCircle,
  AlertCircle,
  Zap,
  ShoppingBag,
  ArrowRight,
  ShieldAlert,
  Percent,
  Keyboard,
  RotateCcw,
  Sparkles,
  Tag,
  AlertTriangle,
  Layers,
  ArrowDownUp,
  ShieldCheck,
} from 'lucide-react';
import { db } from '@/lib/database';
import { formatCurrency, Language, t } from '@/lib/i18n';
import {
  Customer,
  HeldBill,
  PaymentMethod,
  Product,
  ProductVariant,
  Sale,
  SaleItem,
  ShopSettings,
  UniformSet,
  User,
} from '@/types';
import { CustomerQuickModal } from './CustomerQuickModal';
import { HeldBillsModal } from './HeldBillsModal';
import { InvoicePrintModal } from './InvoicePrintModal';

interface POSViewProps {
  settings: ShopSettings;
  currentUser: User;
  lang: Language;
  onRefreshDatabase?: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  settings,
  currentUser,
  lang,
  onRefreshDatabase,
}) => {
  // Catalog Data
  const [products, setProducts] = useState<Product[]>([]);
  const [uniformSets, setUniformSets] = useState<UniformSet[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Search & Cart State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [activeCartIndex, setActiveCartIndex] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust_walkin');
  const [orderDiscount, setOrderDiscount] = useState<number>(0);

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState('');

  // Modals State
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const paymentPaidRef = useRef<HTMLInputElement>(null);

  // Helper to compute a consistent item key for customer discount memory
  const getItemKey = (item: { variantId?: string; uniformSetId?: string; productId?: string }) => {
    if (item.variantId) return `var_${item.variantId}`;
    if (item.uniformSetId) return `set_${item.uniformSetId}`;
    return `prod_${item.productId}`;
  };

  // Load Catalog Data
  const loadData = () => {
    setProducts(db.getProducts());
    setUniformSets(db.getUniformSets());
    setCustomers(db.getCustomers());
    setHeldBills(db.getHeldBills());
  };

  useEffect(() => {
    loadData();
    searchInputRef.current?.focus();
  }, []);

  // Calculate Totals
  const subtotal = cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const lineDiscountTotal = cartItems.reduce((acc, item) => acc + item.discount, 0);
  const totalDiscount = lineDiscountTotal + orderDiscount;
  const taxableAmount = Math.max(0, subtotal - orderDiscount);
  const tax = settings.taxEnabled ? (taxableAmount * settings.taxPercentage) / 100 : 0;
  const grandTotal = Math.round(taxableAmount + tax);

  // Active Item Reference for Discreet Admin Pricing Box
  const activeItem = cartItems[activeCartIndex] || cartItems[0] || null;
  const activeUnitCost = activeItem ? activeItem.costPrice || 0 : 0;
  const activeUnitWholesale = activeItem ? activeItem.wholesalePrice || activeItem.costPrice || 0 : 0;
  const activeUnitRetail = activeItem ? activeItem.unitPrice || 0 : 0;
  const activePerUnitDiscount = activeItem ? (activeItem.discount || 0) / (activeItem.quantity || 1) : 0;
  const activeEffectiveUnitRate = activeUnitRetail - activePerUnitDiscount;
  const activeIsBelowCost = activeEffectiveUnitRate < activeUnitCost;
  const activeLossPerUnit = activeUnitCost - activeEffectiveUnitRate;
  const activeMargin = activeEffectiveUnitRate - activeUnitCost;

  // Filtered Search Results
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matches: {
      type: 'product' | 'variant' | 'uniformSet';
      item: Product | ProductVariant | UniformSet;
      parentProduct?: Product;
      displayName: string;
      displayDetails: string;
      price: number;
      stock: number;
      barcode: string;
      sku: string;
    }[] = [];

    // 1. Uniform Sets (School Packages)
    for (const set of uniformSets) {
      const matchString = `${set.name} ${set.schoolName} ${set.sku} ${set.barcode}`.toLowerCase();
      if (matchString.includes(q)) {
        matches.push({
          type: 'uniformSet',
          item: set,
          displayName: `[Set] ${set.name}`,
          displayDetails: `${set.schoolName} • Season: ${set.season || 'All'}`,
          price: set.setPrice,
          stock: 99, // Bundles computed dynamically
          barcode: set.barcode,
          sku: set.sku,
        });
      }
    }

    // 2. Individual Products and Variants
    for (const p of products) {
      if (p.hasVariants && p.variants) {
        for (const v of p.variants) {
          const matchString = `${p.name} ${v.schoolName || p.schoolName || ''} ${v.size || ''} ${v.color || ''} ${p.brand || ''} ${p.categoryName} ${v.sku} ${v.barcode}`.toLowerCase();
          if (matchString.includes(q)) {
            matches.push({
              type: 'variant',
              item: v,
              parentProduct: p,
              displayName: `${p.name} - Size ${v.size} (${v.color || ''})`,
              displayDetails: `${v.schoolName || p.schoolName || p.categoryName} • ${v.gender || ''}`,
              price: v.salePrice,
              stock: v.currentStock,
              barcode: v.barcode,
              sku: v.sku,
            });
          }
        }
      } else {
        const matchString = `${p.name} ${p.brand || ''} ${p.categoryName} ${p.sku} ${p.barcode}`.toLowerCase();
        if (matchString.includes(q)) {
          matches.push({
            type: 'product',
            item: p,
            displayName: p.name,
            displayDetails: `${p.categoryName} ${p.brand ? `• ${p.brand}` : ''}`,
            price: p.salePrice,
            stock: p.currentStock,
            barcode: p.barcode,
            sku: p.sku,
          });
        }
      }
    }

    return matches.slice(0, 15);
  }, [searchQuery, products, uniformSets]);

  // Reset selected search index when results change
  useEffect(() => {
    setSelectedSearchIndex(0);
  }, [searchQuery]);

  // Auto-scroll selected search item into view
  useEffect(() => {
    if (searchResults.length > 0) {
      const el = document.getElementById(`search-res-${selectedSearchIndex}`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedSearchIndex, searchResults.length]);

  // Add Item To Cart with Customer Last Discount Memory
  const addItemToCart = (result: (typeof searchResults)[0]) => {
    setErrorMessage(null);

    // Check stock if negative stock is prevented
    if (settings.preventNegativeStock && result.stock <= 0) {
      setErrorMessage(`Cannot add "${result.displayName}". Product is out of stock!`);
      return;
    }

    // Determine unique item key for customer discount memory
    let itemKey = '';
    if (result.type === 'uniformSet') {
      itemKey = `set_${result.item.id}`;
    } else if (result.type === 'variant') {
      itemKey = `var_${result.item.id}`;
    } else {
      itemKey = `prod_${result.item.id}`;
    }

    // Recall customer's saved discount for this specific item (Auto-applied!)
    const customerSavedDiscountPerUnit =
      selectedCustomerId !== 'cust_walkin'
        ? db.getCustomerItemDiscount(selectedCustomerId, itemKey)
        : 0;

    setCartItems((prev) => {
      let existingIndex = -1;

      if (result.type === 'uniformSet') {
        const set = result.item as UniformSet;
        existingIndex = prev.findIndex((i) => i.uniformSetId === set.id);
      } else if (result.type === 'variant') {
        const v = result.item as ProductVariant;
        existingIndex = prev.findIndex((i) => i.variantId === v.id);
      } else {
        const p = result.item as Product;
        existingIndex = prev.findIndex((i) => i.productId === p.id && !i.variantId);
      }

      if (existingIndex >= 0) {
        // Increment quantity
        const updated = [...prev];
        const currentItem = updated[existingIndex];
        const newQty = currentItem.quantity + 1;

        if (settings.preventNegativeStock && result.stock < newQty) {
          setErrorMessage(`Only ${result.stock} units available in stock.`);
          return prev;
        }

        // Apply discount proportionally if per-unit discount exists
        const unitDisc =
          currentItem.discount > 0
            ? currentItem.discount / currentItem.quantity
            : customerSavedDiscountPerUnit;
        const newTotalDisc = Math.round(unitDisc * newQty);
        const lineTotal = newQty * currentItem.unitPrice - newTotalDisc;
        const lineProfit = lineTotal - newQty * currentItem.costPrice;

        updated[existingIndex] = {
          ...currentItem,
          quantity: newQty,
          discount: newTotalDisc,
          lineTotal,
          lineProfit,
        };
        return updated;
      }

      // Add new cart item
      let newItem: SaleItem;

      if (result.type === 'uniformSet') {
        const set = result.item as UniformSet;
        let totalCost = 0;
        for (const comp of set.components) {
          const compProd = products.find((p) => p.id === comp.productId);
          if (compProd) {
            if (comp.variantId && compProd.variants) {
              const compVar = compProd.variants.find((v) => v.id === comp.variantId);
              totalCost += (compVar?.purchasePrice || compProd.purchasePrice || 0) * comp.quantity;
            } else {
              totalCost += (compProd.purchasePrice || 0) * comp.quantity;
            }
          }
        }

        const disc = customerSavedDiscountPerUnit;
        const lineTotal = set.setPrice - disc;

        newItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          productId: set.id,
          uniformSetId: set.id,
          productName: `[Kit] ${set.name}`,
          categoryName: 'Uniform Sets',
          schoolName: set.schoolName,
          sku: set.sku,
          barcode: set.barcode,
          quantity: 1,
          unit: 'Kit',
          costPrice: totalCost,
          wholesalePrice: set.setPrice,
          minSalePrice: totalCost,
          unitPrice: set.setPrice,
          discount: disc,
          lineTotal,
          lineProfit: lineTotal - totalCost,
        };
      } else if (result.type === 'variant') {
        const v = result.item as ProductVariant;
        const parent = result.parentProduct!;
        const disc = customerSavedDiscountPerUnit;
        const lineTotal = v.salePrice - disc;

        newItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          productId: parent.id,
          variantId: v.id,
          productName: parent.name,
          variantDetails: `Size ${v.size} (${v.color || 'Standard'})`,
          categoryName: parent.categoryName,
          schoolName: v.schoolName || parent.schoolName,
          sku: v.sku,
          barcode: v.barcode,
          quantity: 1,
          unit: parent.unit || 'Pcs',
          costPrice: v.purchasePrice || 0,
          wholesalePrice: v.wholesalePrice || v.purchasePrice || 0,
          minSalePrice: v.minSalePrice || v.purchasePrice || 0,
          unitPrice: v.salePrice,
          discount: disc,
          lineTotal,
          lineProfit: lineTotal - (v.purchasePrice || 0),
        };
      } else {
        const p = result.item as Product;
        const disc = customerSavedDiscountPerUnit;
        const lineTotal = p.salePrice - disc;

        newItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          productId: p.id,
          productName: p.name,
          categoryName: p.categoryName,
          schoolName: p.schoolName,
          sku: p.sku,
          barcode: p.barcode,
          quantity: 1,
          unit: p.unit || 'Pcs',
          costPrice: p.purchasePrice || 0,
          wholesalePrice: p.wholesalePrice || p.purchasePrice || 0,
          minSalePrice: p.minSalePrice || p.purchasePrice || 0,
          unitPrice: p.salePrice,
          discount: disc,
          lineTotal,
          lineProfit: lineTotal - (p.purchasePrice || 0),
        };
      }

      return [newItem, ...prev];
    });

    setActiveCartIndex(0);

    // Seamless Keyboard Loop: Move focus to the Quantity input of the newly added item immediately
    setTimeout(() => {
      const qtyEl = document.getElementById('cart-qty-0') as HTMLInputElement | null;
      if (qtyEl) {
        qtyEl.focus();
        qtyEl.select();
      }
    }, 60);
  };

  // Keyboard navigation inside search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If user presses Tab inside search bar, jump directly to cart quantity
    if (cartItems.length > 0 && e.key === 'Tab') {
      e.preventDefault();
      const qtyEl = document.getElementById('cart-qty-0') as HTMLInputElement | null;
      qtyEl?.focus();
      qtyEl?.select();
      return;
    }

    if (searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSearchIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        // Check exact barcode match first
        const exactBarcode = searchResults.find(
          (r) => r.barcode.toLowerCase() === searchQuery.trim().toLowerCase()
        );
        if (exactBarcode) {
          addItemToCart(exactBarcode);
          setSearchQuery('');
          setSelectedSearchIndex(0);
          return;
        }

        // Add the currently highlighted item
        const selected = searchResults[selectedSearchIndex] || searchResults[0];
        if (selected) {
          addItemToCart(selected);
          setSearchQuery('');
          setSelectedSearchIndex(0);
        }
        return;
      }
    }

    if (e.key === 'Escape') {
      setSearchQuery('');
      setSelectedSearchIndex(0);
    }
  };

  // Barcode / Form Submit Fallback
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const exactBarcode = searchResults.find(
      (r) => r.barcode.toLowerCase() === searchQuery.trim().toLowerCase()
    );
    if (exactBarcode) {
      addItemToCart(exactBarcode);
      setSearchQuery('');
      setSelectedSearchIndex(0);
      return;
    }

    if (searchResults.length > 0) {
      addItemToCart(searchResults[selectedSearchIndex] || searchResults[0]);
      setSearchQuery('');
      setSelectedSearchIndex(0);
    }
  };

  // When customer changes, automatically update cart items with their remembered discounts
  const handleCustomerChange = (newCustId: string) => {
    setSelectedCustomerId(newCustId);
    if (newCustId !== 'cust_walkin' && cartItems.length > 0) {
      setCartItems((prev) =>
        prev.map((item) => {
          const itemKey = getItemKey(item);
          const savedDiscPerUnit = db.getCustomerItemDiscount(newCustId, itemKey);
          if (savedDiscPerUnit > 0) {
            const newDisc = savedDiscPerUnit * item.quantity;
            const lineTotal = item.quantity * item.unitPrice - newDisc;
            const lineProfit = lineTotal - item.quantity * item.costPrice;
            return {
              ...item,
              discount: newDisc,
              lineTotal,
              lineProfit,
            };
          }
          return item;
        })
      );
    }
  };

  // Cart Item Modifications with Automatic Customer Discount Saving
  const updateItemQuantity = (index: number, quantity: number) => {
    setErrorMessage(null);
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;
      const newQty = Math.max(1, Number(quantity) || 1);

      if (settings.preventNegativeStock) {
        if (item.variantId) {
          const prod = products.find((p) => p.id === item.productId);
          const v = prod?.variants?.find((va) => va.id === item.variantId);
          if (v && v.currentStock < newQty) {
            setErrorMessage(`Only ${v.currentStock} units available for ${item.productName} (${item.variantDetails}).`);
            return prev;
          }
        } else if (item.productId && !item.uniformSetId) {
          const prod = products.find((p) => p.id === item.productId);
          if (prod && prod.currentStock < newQty) {
            setErrorMessage(`Only ${prod.currentStock} units available for ${item.productName}.`);
            return prev;
          }
        }
      }

      // Keep per-unit discount ratio
      const perUnitDisc = item.discount > 0 ? item.discount / (item.quantity || 1) : 0;
      const newDiscount = Math.round(perUnitDisc * newQty);
      const lineTotal = newQty * item.unitPrice - newDiscount;
      const lineProfit = lineTotal - newQty * item.costPrice;

      updated[index] = {
        ...item,
        quantity: newQty,
        discount: newDiscount,
        lineTotal,
        lineProfit,
      };

      // Keep customer memory synced
      if (selectedCustomerId && selectedCustomerId !== 'cust_walkin' && perUnitDisc > 0) {
        const itemKey = getItemKey(item);
        db.saveCustomerItemDiscount(selectedCustomerId, itemKey, Math.round(perUnitDisc));
      }

      return updated;
    });
  };

  const updateItemDiscount = (index: number, discount: number) => {
    const disc = Math.max(0, Number(discount) || 0);
    setCartItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;
      const lineTotal = item.quantity * item.unitPrice - disc;
      const lineProfit = lineTotal - item.quantity * item.costPrice;

      updated[index] = {
        ...item,
        discount: disc,
        lineTotal,
        lineProfit,
      };

      // Automatically remember and save this discount for this saved customer!
      if (selectedCustomerId && selectedCustomerId !== 'cust_walkin') {
        const itemKey = getItemKey(item);
        const perUnitDisc = Math.round(disc / (item.quantity || 1));
        db.saveCustomerItemDiscount(selectedCustomerId, itemKey, perUnitDisc);
      }

      return updated;
    });
  };

  const updateItemUnit = (index: number, unit: string) => {
    setCartItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], unit };
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
    setActiveCartIndex((prev) => (prev >= index && prev > 0 ? prev - 1 : 0));
  };

  const clearCart = () => {
    setCartItems([]);
    setActiveCartIndex(0);
    setOrderDiscount(0);
    setOrderNotes('');
    setErrorMessage(null);
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) return;

    const customer = customers.find((c) => c.id === selectedCustomerId);
    const cleanCustName =
      (customer?.name || 'Walk-in Customer')
        .replace(/\(عام گاہک\)/g, '')
        .replace(/عام گاہک/g, '')
        .trim() || 'Walk-in Customer';

    const held: HeldBill = {
      id: `hold_${Date.now()}`,
      name: `Bill for ${cleanCustName}`,
      createdAt: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: cleanCustName,
      items: [...cartItems],
      discount: orderDiscount,
      notes: orderNotes,
    };

    db.saveHeldBill(held);
    clearCart();
    setHeldBills(db.getHeldBills());
  };

  const handleResumeBill = (bill: HeldBill) => {
    setCartItems(bill.items);
    setSelectedCustomerId(bill.customerId);
    setOrderDiscount(bill.discount);
    setOrderNotes(bill.notes || '');
    db.deleteHeldBill(bill.id);
    setHeldBills(db.getHeldBills());
    setIsHeldModalOpen(false);
  };

  // Quick Sale (Fast 1-click cash checkout for walk-in customer)
  const handleQuickSale = () => {
    if (cartItems.length === 0) return;
    executeCheckout('cash', grandTotal, 0, 0);
  };

  const openPaymentModal = () => {
    if (cartItems.length === 0) return;
    setPaidAmount(grandTotal);
    setIsPaymentModalOpen(true);
    setTimeout(() => {
      paymentPaidRef.current?.focus();
      paymentPaidRef.current?.select();
    }, 100);
  };

  // Execute Final Checkout Transaction
  const executeCheckout = (
    method: PaymentMethod,
    paid: number,
    balance: number,
    change: number
  ) => {
    try {
      const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
      const cleanCustName =
        (customer?.name || 'Walk-in Customer')
          .replace(/\(عام گاہک\)/g, '')
          .replace(/عام گاہک/g, '')
          .trim() || 'Walk-in Customer';

      const totalCost = cartItems.reduce((acc, i) => acc + i.quantity * i.costPrice, 0);
      const grossProfit = grandTotal - totalCost;

      // Auto-save remembered discounts for this customer across all items
      if (customer.id && customer.id !== 'cust_walkin') {
        for (const itm of cartItems) {
          if (itm.discount > 0) {
            const itemKey = getItemKey(itm);
            const perUnitDisc = Math.round(itm.discount / (itm.quantity || 1));
            db.saveCustomerItemDiscount(customer.id, itemKey, perUnitDisc);
          }
        }
      }

      const sale = db.processSale({
        invoiceNumber: db.getNextInvoiceNumber(),
        date: new Date().toISOString(),
        customerId: customer.id,
        customerName: cleanCustName,
        customerPhone: customer.phone,
        customerType: customer.type || 'walk-in',
        userId: currentUser.id,
        userName: currentUser.fullName,
        items: [...cartItems],
        subtotal,
        discount: totalDiscount,
        tax,
        grandTotal,
        totalCost,
        grossProfit,
        paymentMethod: method,
        payments: [
          {
            method,
            amount: paid,
            date: new Date().toISOString(),
          },
        ],
        paidAmount: paid,
        balanceAmount: balance,
        changeAmount: change,
        notes: orderNotes,
      });

      setLastCompletedSale(sale);
      clearCart();
      setIsPaymentModalOpen(false);
      setIsPrintModalOpen(true); // Auto-open print modal immediately!
      loadData();
      if (onRefreshDatabase) onRefreshDatabase();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing invoice transaction.');
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paid = Number(paidAmount) || 0;
    let balance = 0;
    let change = 0;

    if (paid >= grandTotal) {
      change = paid - grandTotal;
      balance = 0;
    } else {
      balance = grandTotal - paid;
      change = 0;
    }

    executeCheckout(paymentMethod, paid, balance, change);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in standard textareas or other modals
      const activeTag = document.activeElement?.tagName;
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      // Global F-keys
      if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
      }
      // F2: Focus Search Bar
      else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F3: Quick Cash Checkout
      else if (e.key === 'F3') {
        e.preventDefault();
        if (cartItems.length > 0) handleQuickSale();
      }
      // F4: Quick New Customer
      else if (e.key === 'F4') {
        e.preventDefault();
        setIsQuickCustomerOpen(true);
      }
      // F5 or Alt+Q: Jump directly to first cart item's Quantity
      else if (e.key === 'F5' || (e.altKey && e.key.toLowerCase() === 'q')) {
        e.preventDefault();
        const qtyEl = document.getElementById('cart-qty-0') as HTMLInputElement | null;
        qtyEl?.focus();
        qtyEl?.select();
      }
      // F6: Hold Current Bill
      else if (e.key === 'F6') {
        e.preventDefault();
        if (cartItems.length > 0) handleHoldBill();
      }
      // F7: Open Held Bills
      else if (e.key === 'F7') {
        e.preventDefault();
        setIsHeldModalOpen(true);
      }
      // F8: Open Payment Modal
      else if (e.key === 'F8') {
        e.preventDefault();
        if (cartItems.length > 0) openPaymentModal();
      }
      // F9: Print Last Invoice
      else if (e.key === 'F9') {
        e.preventDefault();
        if (lastCompletedSale) setIsPrintModalOpen(true);
      }
      // F10: Clear Cart
      else if (e.key === 'F10') {
        e.preventDefault();
        if (cartItems.length > 0 && confirm('Are you sure you want to clear the cart?')) {
          clearCart();
        }
      }
      // ESC: Close Modals
      else if (e.key === 'Escape') {
        setIsPaymentModalOpen(false);
        setIsHeldModalOpen(false);
        setIsQuickCustomerOpen(false);
        setIsPrintModalOpen(false);
        setShowShortcutsHelp(false);
        setErrorMessage(null);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-100 overflow-hidden select-none">
      {/* Top POS Action Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-xs gap-3">
        {/* Search & Scanner Input with Quick Tab Jump Button */}
        <div className="flex items-center gap-2 flex-1 max-w-2xl relative">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Scan Barcode or Search (Name, School, Size, Bag) [F2] • ↓/↑ to navigate • Enter to add • Tab to Qty"
              className="w-full pl-9 pr-32 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 font-medium"
            />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('cart-qty-0') as HTMLInputElement | null;
                    el?.focus();
                    el?.select();
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold border border-slate-300 transition flex items-center gap-0.5"
                  title="Shift Keyboard to Cart Quantity & Unit [Tab]"
                >
                  <span>Tab ⇥</span>
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-xs transition"
              >
                Add Item
              </button>
            </div>
          </form>

          {/* Search Dropdown Results with Keyboard Arrow Navigation */}
          {searchResults.length > 0 && (
            <div className="absolute top-10 left-0 right-0 z-40 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-84 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold flex justify-between items-center">
                <span>Matching Items ({searchResults.length})</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Use [↓] [↑] to move • Press [Enter ↵] to add
                </span>
              </div>
              {searchResults.map((res, idx) => {
                const isSelected = idx === selectedSearchIndex;
                return (
                  <div
                    key={idx}
                    id={`search-res-${idx}`}
                    onClick={() => {
                      addItemToCart(res);
                      setSearchQuery('');
                      setSelectedSearchIndex(0);
                    }}
                    onMouseEnter={() => setSelectedSearchIndex(idx)}
                    className={`px-3 py-2 border-b border-slate-100 cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-inner font-semibold'
                        : 'hover:bg-emerald-50 text-slate-900'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{res.displayName}</span>
                        {isSelected && (
                          <span className="text-[9px] bg-white text-emerald-800 font-bold px-1.5 py-0.2 rounded-sm shadow-xs uppercase tracking-wide">
                            Enter ↵
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        {res.displayDetails}
                      </div>
                      <div
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-emerald-200' : 'text-slate-400'
                        }`}
                      >
                        SKU: {res.sku} | Barcode: {res.barcode}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">{formatCurrency(res.price)}</div>
                      <div
                        className={`text-[10px] font-semibold ${
                          isSelected
                            ? 'text-white'
                            : res.stock <= 0
                            ? 'text-red-600 font-bold'
                            : res.stock < 10
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        Stock: {res.stock}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Selector & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Customer Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600">Customer:</span>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-800 focus:outline-none max-w-44 truncate cursor-pointer"
            >
              {customers.map((c) => {
                const cleanName =
                  (c.name || 'Walk-in Customer')
                    .replace(/\(عام گاہک\)/g, '')
                    .replace(/عام گاہک/g, '')
                    .trim() || 'Walk-in Customer';
                return (
                  <option key={c.id} value={c.id}>
                    {cleanName} {c.currentBalance > 0 ? `(Owes ₨ ${c.currentBalance})` : ''}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => setIsQuickCustomerOpen(true)}
              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded transition"
              title="Add New Customer [F4]"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Held Bills Button */}
          <button
            onClick={() => setIsHeldModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition"
            title="View Held Bills [F7]"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Held ({heldBills.length}) [F7]</span>
          </button>

          {/* Hold Current Bill */}
          <button
            onClick={handleHoldBill}
            disabled={cartItems.length === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-lg text-xs font-semibold transition"
            title="Hold Current Bill [F6]"
          >
            Hold [F6]
          </button>

          {/* Shortcuts Info Button */}
          <button
            onClick={() => setShowShortcutsHelp((prev) => !prev)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
            title="Keyboard Shortcuts Cheat Sheet [F1]"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shortcuts Quick Ribbon */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1 text-[11px] flex items-center justify-between overflow-x-auto gap-4">
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-emerald-400">F2:</strong> Search
          </span>
          <span className="text-cyan-300 font-semibold">
            <strong className="text-cyan-400">Tab Cycle:</strong> Search → Qty → Unit → Disc → Search
          </span>
          <span>
            <strong className="text-amber-400">F3:</strong> Quick Cash Sale
          </span>
          <span>
            <strong className="text-emerald-400">F4:</strong> New Cust
          </span>
          <span>
            <strong className="text-emerald-400">F6:</strong> Hold
          </span>
          <span>
            <strong className="text-emerald-400">F8:</strong> Payment
          </span>
          <span>
            <strong className="text-red-400">F10:</strong> Clear
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
          {isAdmin ? (
            <span className="text-purple-300 font-bold bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700">
              🛡️ Admin Cost & Wholesale Insight Active
            </span>
          ) : (
            <span className="text-emerald-300 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              👤 Cashier Fast POS Mode Active
            </span>
          )}
          <span>| Logged: <strong className="text-white">{currentUser.fullName}</strong></span>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="mx-4 mt-2 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold px-2">
            ×
          </button>
        </div>
      )}

      {/* Main Billing Work Area */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Cart Item Grid (Left 70%) */}
        <div className="flex-1 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col overflow-hidden">
          {/* Table Header */}
          <div className="px-4 py-2.5 bg-slate-900 text-white text-xs font-bold grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">Item / Uniform Variant</div>
            <div className="col-span-2 text-center">Qty & Unit [Tab ⇥]</div>
            <div className="col-span-2 text-right">Unit Rate</div>
            <div className="col-span-2 text-center">Disc (₨) [Tab ⇥]</div>
            <div className="col-span-2 text-right">Line Total</div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300" />
                <div className="text-xs font-semibold">Cart is currently empty.</div>
                <p className="text-[11px] text-slate-400 max-w-sm text-center">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-bold">F2</kbd> to search or scan barcodes with your USB scanner. Use <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-bold">↓</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-bold">↑</kbd> to navigate items and press <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-bold">Enter</kbd> to add.
                </p>
                <div className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 font-medium max-w-md text-center">
                  ⚡ <strong>Fast Tab Cycle:</strong> Search item → press <kbd className="font-bold">Enter</kbd> → change Quantity → press <kbd className="font-bold">Tab</kbd> → change Unit → press <kbd className="font-bold">Tab</kbd> → enter Discount → press <kbd className="font-bold">Tab / Enter</kbd> → back to Search!
                </div>
              </div>
            ) : (
              cartItems.map((item, index) => {
                // Admin Cost Insight Calculations
                const unitCost = item.costPrice || 0;
                const unitWholesale = item.wholesalePrice || item.costPrice || 0;
                const unitRetail = item.unitPrice || 0;
                const perUnitDiscount = (item.discount || 0) / (item.quantity || 1);
                const effectiveUnitRate = unitRetail - perUnitDiscount;
                const isBelowCost = effectiveUnitRate < unitCost;
                const lossPerUnit = unitCost - effectiveUnitRate;

                // Recall saved customer discount per unit
                const itemKey = getItemKey(item);
                const savedCustDiscPerUnit =
                  selectedCustomerId !== 'cust_walkin'
                    ? db.getCustomerItemDiscount(selectedCustomerId, itemKey)
                    : 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveCartIndex(index)}
                    onFocus={() => setActiveCartIndex(index)}
                    className={`py-2 px-2 rounded-lg transition cursor-pointer border ${
                      activeCartIndex === index
                        ? 'bg-slate-50 border-emerald-400 ring-1 ring-emerald-200'
                        : isBelowCost && isAdmin
                        ? 'bg-red-50/50 border-red-200'
                        : 'border-transparent hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-2 items-center text-xs">
                      {/* Name and Variant */}
                      <div className="col-span-4 pr-2">
                        <div className="font-bold text-slate-900 truncate">{item.productName}</div>
                        {item.variantDetails && (
                          <div className="text-[11px] text-emerald-800 font-medium truncate">
                            {item.variantDetails} {item.schoolName ? `• ${item.schoolName}` : ''}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.sku}
                        </div>
                      </div>

                      {/* Quantity Stepper & Unit Selector [Tab shifts to Unit] */}
                      <div className="col-span-2 flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            id={`cart-qty-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, Number(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Tab' || e.key === 'Enter') {
                                if (e.shiftKey) {
                                  e.preventDefault();
                                  searchInputRef.current?.focus();
                                  searchInputRef.current?.select();
                                } else {
                                  e.preventDefault();
                                  const unitEl = document.getElementById(`cart-unit-${index}`) as HTMLElement | null;
                                  unitEl?.focus();
                                }
                              }
                            }}
                            className="w-14 text-center py-1 px-1 border-2 border-slate-300 rounded font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 text-xs"
                            title="Quantity: Type number, then press Tab to move to Unit"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Unit Changer [Tab shifts to Discount] */}
                        <select
                          id={`cart-unit-${index}`}
                          value={item.unit || 'Pcs'}
                          onChange={(e) => updateItemUnit(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab' || e.key === 'Enter') {
                              if (e.shiftKey) {
                                e.preventDefault();
                                const qtyEl = document.getElementById(`cart-qty-${index}`) as HTMLInputElement | null;
                                qtyEl?.focus();
                                qtyEl?.select();
                              } else {
                                e.preventDefault();
                                const discEl = document.getElementById(`cart-disc-${index}`) as HTMLInputElement | null;
                                discEl?.focus();
                                discEl?.select();
                              }
                            }
                          }}
                          className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 cursor-pointer"
                          title="Unit: Use ↑/↓ to choose unit, press Tab to move to Discount"
                        >
                          <option value="Pcs">Pcs</option>
                          <option value="Kit">Kit / Set</option>
                          <option value="Pack">Pack</option>
                          <option value="Box">Box</option>
                          <option value="Dozen">Dozen</option>
                          <option value="Meter">Meter</option>
                        </select>
                      </div>

                      {/* Unit Rate */}
                      <div className="col-span-2 text-right">
                        <div className="font-bold text-slate-800">{formatCurrency(item.unitPrice)}</div>
                        <div className="text-[10px] text-slate-400">/ {item.unit || 'pc'}</div>
                      </div>

                      {/* Line Discount Input [Tab shifts straight back to Search Bar!] */}
                      <div className="col-span-2 flex flex-col items-center justify-center">
                        <input
                          id={`cart-disc-${index}`}
                          type="number"
                          min="0"
                          value={item.discount || ''}
                          onChange={(e) => updateItemDiscount(index, Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab' || e.key === 'Enter') {
                              if (e.shiftKey) {
                                e.preventDefault();
                                const unitEl = document.getElementById(`cart-unit-${index}`) as HTMLElement | null;
                                unitEl?.focus();
                              } else {
                                e.preventDefault();
                                // Jump straight back to Search Bar!
                                searchInputRef.current?.focus();
                                searchInputRef.current?.select();
                              }
                            }
                          }}
                          placeholder="0"
                          className={`w-18 text-center py-1 px-1 border-2 rounded text-xs font-bold transition ${
                            isBelowCost && isAdmin
                              ? 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-400'
                              : 'border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600'
                          }`}
                          title="Discount (Press Tab or Enter to jump straight back to search bar)"
                        />

                        {/* Saved Customer Discount Memory Indicator */}
                        {savedCustDiscPerUnit > 0 ? (
                          <div
                            className="text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded font-bold mt-1 flex items-center justify-center gap-0.5"
                            title="Customer previous discount auto-applied"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span>Last Disc: ₨ {savedCustDiscPerUnit}/pc</span>
                          </div>
                        ) : item.discount > 0 ? (
                          <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                            -₨ {item.discount}
                          </div>
                        ) : null}
                      </div>

                      {/* Total & Delete Button */}
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatCurrency(item.lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                          title="Remove Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ADMIN ONLY: DISCREET BOTTOM BOX IN ENGLISH */}
          {isAdmin && cartItems.length > 0 && activeItem && (
            <div className="px-3.5 py-2 bg-slate-900 text-slate-200 border-t border-slate-800 text-xs flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2 overflow-hidden truncate">
                <span className="text-[10px] font-mono uppercase bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-700 font-bold">
                  Admin CP/WS Bar
                </span>
                <span className="font-semibold text-white truncate max-w-xs text-[11px]" title={activeItem.productName}>
                  {activeItem.productName} {activeItem.variantDetails ? `(${activeItem.variantDetails})` : ''}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
                <span className="text-slate-300">
                  CP: <strong className="text-white font-bold">₨ {activeUnitCost}</strong>
                </span>
                <span className="text-slate-300">
                  WS: <strong className="text-sky-300 font-bold">₨ {activeUnitWholesale}</strong>
                </span>
                <span className="text-slate-300">
                  RP: <strong className="text-slate-300 font-bold">₨ {activeUnitRetail}</strong>
                </span>
                <span className="text-slate-300">
                  Net: <strong className="text-emerald-300 font-bold">₨ {activeEffectiveUnitRate.toFixed(0)}</strong>
                </span>

                {activeIsBelowCost ? (
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Below CP (Loss: -₨ {activeLossPerUnit.toFixed(0)})</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    Margin: +₨ {activeMargin.toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Cart Footer Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="text-slate-500 font-medium">
              Total Items: <strong className="text-slate-800">{cartItems.length}</strong> | Total Units:{' '}
              <strong className="text-slate-800">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </strong>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 font-bold transition flex items-center gap-1"
                title="Cancel Bill [F10]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cart [F10]</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Checkout Panel (30%) */}
        <div className="w-80 bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between p-4">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Order Summary</h2>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Inv #{db.getNextInvoiceNumber()}
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>

              {/* Order Level Discount */}
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1">
                  <span>Additional Discount</span>
                  <Percent className="w-3 h-3 text-slate-400" />
                </span>
                <input
                  type="number"
                  min="0"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-20 text-right py-0.5 px-2 border rounded font-semibold text-slate-800 bg-slate-50 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Discount</span>
                  <span>- {formatCurrency(totalDiscount)}</span>
                </div>
              )}

              {settings.taxEnabled && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({settings.taxPercentage}%)</span>
                  <span>+ {formatCurrency(tax)}</span>
                </div>
              )}

              {/* Notes Input */}
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Order notes / Customer reference (Optional)"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full text-xs p-1.5 border rounded-lg bg-slate-50 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Grand Total Big Display */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
              <div className="text-[11px] uppercase tracking-wider text-emerald-800 font-bold mb-0.5">
                Total Payable
              </div>
              <div className="text-3xl font-black text-emerald-950 font-mono tracking-tight">
                {formatCurrency(grandTotal)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            {/* 1-Click Cash Sale Button */}
            <button
              onClick={handleQuickSale}
              disabled={cartItems.length === 0}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              title="Instant Cash Payment [F3]"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Exact Cash Checkout [F3]</span>
            </button>

            {/* Detailed Payment Modal Button */}
            <button
              onClick={openPaymentModal}
              disabled={cartItems.length === 0}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              title="Open Payment Options [F8]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Payment Options [F8]</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Processing Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Finalize Payment</h3>
                <div className="text-[11px] text-slate-300">
                  Total Payable: <strong className="text-emerald-400 font-mono">{formatCurrency(grandTotal)}</strong>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['cash', 'card', 'bank', 'credit'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2 rounded-lg border text-xs font-bold capitalize transition flex flex-col items-center gap-1 ${
                        paymentMethod === m
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'cash' && <Banknote className="w-4 h-4" />}
                      {m === 'card' && <CreditCard className="w-4 h-4" />}
                      {m === 'bank' && <RotateCcw className="w-4 h-4" />}
                      {m === 'credit' && <Tag className="w-4 h-4" />}
                      <span>{m === 'bank' ? 'Bank Transfer' : m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Paid Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount Received (₨)
                </label>
                <input
                  ref={paymentPaidRef}
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full p-2.5 border-2 border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaidAmount(grandTotal)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  Exact (₨ {grandTotal})
                </button>
                {[500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPaidAmount(amt)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                  >
                    ₨ {amt}
                  </button>
                ))}
              </div>

              {/* Balance / Change Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Grand Total:</span>
                  <span className="font-semibold">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid:</span>
                  <span className="font-semibold">{formatCurrency(paidAmount)}</span>
                </div>
                {paidAmount >= grandTotal ? (
                  <div className="flex justify-between text-emerald-700 font-bold border-t pt-1">
                    <span>Change Return:</span>
                    <span>{formatCurrency(paidAmount - grandTotal)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-amber-700 font-bold border-t pt-1">
                    <span>Credit / Balance Due:</span>
                    <span>{formatCurrency(grandTotal - paidAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel [ESC]
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Confirm & Print [Enter]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {isHeldModalOpen && (
        <HeldBillsModal
          heldBills={heldBills}
          lang={lang}
          onClose={() => setIsHeldModalOpen(false)}
          onResume={handleResumeBill}
          onDelete={(id) => {
            db.deleteHeldBill(id);
            setHeldBills(db.getHeldBills());
          }}
        />
      )}

      {/* Quick Customer Add Modal */}
      {isQuickCustomerOpen && (
        <CustomerQuickModal
          onClose={() => setIsQuickCustomerOpen(false)}
          onSave={(newCust) => {
            db.saveCustomer(newCust);
            loadData();
            setSelectedCustomerId(newCust.id);
            setIsQuickCustomerOpen(false);
          }}
        />
      )}

      {/* Auto Invoice Print Modal */}
      {isPrintModalOpen && lastCompletedSale && (
        <InvoicePrintModal
          sale={lastCompletedSale}
          settings={settings}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* Shortcuts Modal Sheet */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">POS Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                ⚡ <strong>Fast Tab Cycle:</strong> Add item → type Quantity → press <kbd className="font-bold">Tab</kbd> → change Unit → press <kbd className="font-bold">Tab</kbd> → type Discount → press <kbd className="font-bold">Tab / Enter</kbd> → scan next item!
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>Tab</span>
                <span className="font-mono font-bold">Shift focus: Search → Qty → Unit → Disc → Search</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F2</span>
                <span className="font-mono font-bold">Focus Search Bar</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>↓ / ↑</span>
                <span className="font-mono font-bold">Navigate search dropdown / Change Unit</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>Enter</span>
                <span className="font-mono font-bold">Add item / Confirm action</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F5 / Alt+Q</span>
                <span className="font-mono font-bold">Jump to Cart Item Quantity</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F3</span>
                <span className="font-mono font-bold">Exact Cash Checkout</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F4</span>
                <span className="font-mono font-bold">Quick New Customer</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F6</span>
                <span className="font-mono font-bold">Hold / Park Current Bill</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F7</span>
                <span className="font-mono font-bold">Open Held Bills</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F8</span>
                <span className="font-mono font-bold">Open Payment Options</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F9</span>
                <span className="font-mono font-bold">Reprint Last Bill</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-50 rounded">
                <span>F10</span>
                <span className="font-mono font-bold">Clear Active Cart</span>
              </div>
            </div>
            <div className="p-3 bg-slate-100 border-t flex justify-end">
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
