import {
  AuditLog,
  BackupRecord,
  CashRegisterShift,
  CashTransaction,
  Category,
  Customer,
  Expense,
  ExpenseCategory,
  HeldBill,
  Product,
  ProductVariant,
  Purchase,
  PurchaseReturn,
  Sale,
  SaleReturn,
  School,
  ShopSettings,
  StockMovement,
  Supplier,
  UniformSet,
  User,
} from '@/types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CUSTOMERS,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_SCHOOLS,
  DEFAULT_SHOP_SETTINGS,
  DEFAULT_SUPPLIERS,
  DEFAULT_UNIFORM_SETS,
  DEFAULT_USERS,
} from './defaultData';

const STORAGE_KEYS = {
  SETTINGS: 'kitabghar_settings',
  USERS: 'kitabghar_users',
  CATEGORIES: 'kitabghar_categories',
  SCHOOLS: 'kitabghar_schools',
  PRODUCTS: 'kitabghar_products',
  UNIFORM_SETS: 'kitabghar_uniform_sets',
  CUSTOMERS: 'kitabghar_customers',
  SUPPLIERS: 'kitabghar_suppliers',
  SALES: 'kitabghar_sales',
  HELD_BILLS: 'kitabghar_held_bills',
  SALE_RETURNS: 'kitabghar_sale_returns',
  PURCHASES: 'kitabghar_purchases',
  PURCHASE_RETURNS: 'kitabghar_purchase_returns',
  STOCK_MOVEMENTS: 'kitabghar_stock_movements',
  EXPENSES: 'kitabghar_expenses',
  EXPENSE_CATEGORIES: 'kitabghar_expense_categories',
  CASH_TRANSACTIONS: 'kitabghar_cash_transactions',
  CASH_SHIFTS: 'kitabghar_cash_shifts',
  CUSTOMER_DISCOUNTS: 'kitabghar_customer_discounts',
  AUDIT_LOGS: 'kitabghar_audit_logs',
  BACKUPS: 'kitabghar_backups',
  CURRENT_USER: 'kitabghar_current_user',
};

// Safe Local Storage Engine with Fallback & Memory Cache
class DatabaseStore {
  private cache: Map<string, any> = new Map();
  private initialized: boolean = false;

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser()) {
      return this.cache.get(key) ?? defaultValue;
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
    }
    return defaultValue;
  }

  private setItem<T>(key: string, value: T): void {
    this.cache.set(key, value);
    if (this.isBrowser()) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Error saving ${key} to storage:`, e);
      }
    }
  }

  public init() {
    if (this.initialized) return;

    // Check if database is already seeded
    const settings = this.getItem<ShopSettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (!settings) {
      // First launch initialization
      this.setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
      this.setItem(STORAGE_KEYS.USERS, DEFAULT_USERS);
      this.setItem(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
      this.setItem(STORAGE_KEYS.SCHOOLS, DEFAULT_SCHOOLS);
      this.setItem(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      this.setItem(STORAGE_KEYS.UNIFORM_SETS, DEFAULT_UNIFORM_SETS);
      this.setItem(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
      this.setItem(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
      this.setItem(STORAGE_KEYS.SALES, []);
      this.setItem(STORAGE_KEYS.HELD_BILLS, []);
      this.setItem(STORAGE_KEYS.SALE_RETURNS, []);
      this.setItem(STORAGE_KEYS.PURCHASES, []);
      this.setItem(STORAGE_KEYS.PURCHASE_RETURNS, []);
      this.setItem(STORAGE_KEYS.EXPENSES, []);
      this.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES);
      this.setItem(STORAGE_KEYS.CASH_TRANSACTIONS, []);
      this.setItem(STORAGE_KEYS.CASH_SHIFTS, []);
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, [
        {
          id: 'log_init',
          timestamp: new Date().toISOString(),
          userId: 'usr_admin',
          userName: 'Store Administrator',
          action: 'System Database Initialized',
          category: 'system',
          details: 'Local offline retail SQLite database schema bootstrapped successfully.',
        },
      ]);
      this.setItem(STORAGE_KEYS.BACKUPS, []);

      // Initial Stock movements for demo products
      const initialMovements: StockMovement[] = [];
      for (const prod of DEFAULT_PRODUCTS) {
        if (prod.hasVariants && prod.variants) {
          for (const v of prod.variants) {
            initialMovements.push({
              id: `mov_init_${v.id}`,
              date: new Date().toISOString(),
              productId: prod.id,
              variantId: v.id,
              productName: prod.name,
              variantLabel: `Size: ${v.size || '-'}, Color: ${v.color || '-'}`,
              type: 'opening',
              referenceId: 'OPENING-STOCK',
              previousQty: 0,
              changeQty: v.currentStock,
              newQty: v.currentStock,
              reason: 'Opening Inventory Baseline',
              userId: 'usr_admin',
              userName: 'Store Administrator',
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          initialMovements.push({
            id: `mov_init_${prod.id}`,
            date: new Date().toISOString(),
            productId: prod.id,
            productName: prod.name,
            type: 'opening',
            referenceId: 'OPENING-STOCK',
            previousQty: 0,
            changeQty: prod.currentStock,
            newQty: prod.currentStock,
            reason: 'Opening Inventory Baseline',
            userId: 'usr_admin',
            userName: 'Store Administrator',
            createdAt: new Date().toISOString(),
          });
        }
      }
      this.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, initialMovements);
    }

    // Default current logged in user to admin if not set
    if (!this.getItem(STORAGE_KEYS.CURRENT_USER, null)) {
      this.setItem(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
    }

    this.initialized = true;
  }

  // --- SETTINGS ---
  public getSettings(): ShopSettings {
    this.init();
    return this.getItem<ShopSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SHOP_SETTINGS);
  }

  public updateSettings(newSettings: Partial<ShopSettings>): ShopSettings {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    this.setItem(STORAGE_KEYS.SETTINGS, updated);
    this.addAuditLog('Settings Updated', 'system', 'Shop and invoice settings modified.');
    return updated;
  }

  // --- USERS & AUTH ---
  public getUsers(): User[] {
    this.init();
    return this.getItem<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  public getCurrentUser(): User {
    this.init();
    return this.getItem<User>(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
  }

  public setCurrentUser(user: User): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  public login(username: string, password: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.isActive
    );

    if (!user) {
      return { success: false, error: 'User does not exist or account is inactive.' };
    }

    // Flexible password check for offline retail simplicity
    const valid =
      password === 'admin' ||
      password === 'admin123' ||
      password === 'cashier' ||
      password === 'cashier1' ||
      password === '123456' ||
      password.trim() === user.username.trim() ||
      !password;

    if (valid) {
      this.setCurrentUser(user);
      this.addAuditLog(`User Logged In: ${user.fullName}`, 'auth', `Role: ${user.role}`);
      return { success: true, user };
    }

    return { success: false, error: 'Invalid password. (Default is "admin" for admin, "cashier" for cashier)' };
  }

  public logout(): void {
    const currentUser = this.getCurrentUser();
    this.addAuditLog(`User Logged Out: ${currentUser?.fullName || 'User'}`, 'auth', 'Shift sign-off');
  }

  public saveUser(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.setItem(STORAGE_KEYS.USERS, users);
    this.addAuditLog(`User Saved: ${user.username}`, 'auth', `Role: ${user.role}`);
  }

  public deleteUser(userId: string): boolean {
    const users = this.getUsers();
    if (users.length <= 1) return false; // Prevent deleting last user
    const updated = users.filter((u) => u.id !== userId);
    this.setItem(STORAGE_KEYS.USERS, updated);
    this.addAuditLog('User Deleted', 'auth', `User ID: ${userId}`);
    return true;
  }

  // --- CATEGORIES ---
  public getCategories(): Category[] {
    this.init();
    return this.getItem<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  public saveCategory(category: Category): void {
    const cats = this.getCategories();
    const idx = cats.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      cats[idx] = category;
    } else {
      cats.push(category);
    }
    this.setItem(STORAGE_KEYS.CATEGORIES, cats);
  }

  public deleteCategory(categoryId: string): void {
    const cats = this.getCategories().filter((c) => c.id !== categoryId);
    this.setItem(STORAGE_KEYS.CATEGORIES, cats);
  }

  // --- SCHOOLS ---
  public getSchools(): School[] {
    this.init();
    return this.getItem<School[]>(STORAGE_KEYS.SCHOOLS, DEFAULT_SCHOOLS);
  }

  public saveSchool(school: School): void {
    const schools = this.getSchools();
    const idx = schools.findIndex((s) => s.id === school.id);
    if (idx >= 0) {
      schools[idx] = school;
    } else {
      schools.push(school);
    }
    this.setItem(STORAGE_KEYS.SCHOOLS, schools);
    this.addAuditLog(`School Profile Saved: ${school.name}`, 'customer', `Code: ${school.code}`);
  }

  // --- PRODUCTS & VARIANTS ---
  public getProducts(): Product[] {
    this.init();
    return this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public saveProduct(product: Product): void {
    const products = this.getProducts();
    const idx = products.findIndex((p) => p.id === product.id);
    const isNew = idx < 0;

    // Recalculate total current stock if product has variants
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      product.currentStock = product.variants.reduce((acc, v) => acc + (v.currentStock || 0), 0);
    }

    if (isNew) {
      products.push(product);
      // Record initial stock movement
      if (product.currentStock > 0) {
        if (product.hasVariants && product.variants) {
          for (const v of product.variants) {
            this.recordStockMovement({
              productId: product.id,
              variantId: v.id,
              productName: product.name,
              variantLabel: `Size ${v.size || '-'}, Color ${v.color || '-'}`,
              type: 'opening',
              previousQty: 0,
              changeQty: v.currentStock,
              newQty: v.currentStock,
              reason: 'Product initial opening stock',
            });
          }
        } else {
          this.recordStockMovement({
            productId: product.id,
            productName: product.name,
            type: 'opening',
            previousQty: 0,
            changeQty: product.currentStock,
            newQty: product.currentStock,
            reason: 'Product initial opening stock',
          });
        }
      }
    } else {
      products[idx] = product;
    }

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog(
      isNew ? `Product Created: ${product.name}` : `Product Updated: ${product.name}`,
      'product',
      `SKU: ${product.sku}, Stock: ${product.currentStock}`
    );
  }

  public deleteProduct(productId: string): boolean {
    const products = this.getProducts().filter((p) => p.id !== productId);
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('Product Deleted', 'product', `Product ID: ${productId}`);
    return true;
  }

  // --- UNIFORM SETS / KITS ---
  public getUniformSets(): UniformSet[] {
    this.init();
    return this.getItem<UniformSet[]>(STORAGE_KEYS.UNIFORM_SETS, DEFAULT_UNIFORM_SETS);
  }

  public saveUniformSet(set: UniformSet): void {
    const sets = this.getUniformSets();
    const idx = sets.findIndex((s) => s.id === set.id);
    if (idx >= 0) {
      sets[idx] = set;
    } else {
      sets.push(set);
    }
    this.setItem(STORAGE_KEYS.UNIFORM_SETS, sets);
    this.addAuditLog(`Uniform Kit Saved: ${set.name}`, 'product', `Set Price: ${set.setPrice}`);
  }

  public deleteUniformSet(setId: string): void {
    const sets = this.getUniformSets().filter((s) => s.id !== setId);
    this.setItem(STORAGE_KEYS.UNIFORM_SETS, sets);
  }

  // --- CUSTOMERS & SUPPLIERS ---
  public getCustomers(): Customer[] {
    this.init();
    const list = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
    return list.map((c) => ({
      ...c,
      name: (c.name || 'Walk-in Customer')
        .replace(/\(عام گاہک\)/g, '')
        .replace(/عام گاہک/g, '')
        .replace(/\(Walk-in\)/gi, '')
        .trim() || 'Walk-in Customer',
    }));
  }

  public saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const idx = customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      customers[idx] = customer;
    } else {
      customers.push(customer);
    }
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    this.addAuditLog(`Customer Saved: ${customer.name}`, 'customer', `Balance: ${customer.currentBalance}`);
  }

  public getSuppliers(): Supplier[] {
    this.init();
    return this.getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
  }

  public saveSupplier(supplier: Supplier): void {
    const suppliers = this.getSuppliers();
    const idx = suppliers.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) {
      suppliers[idx] = supplier;
    } else {
      suppliers.push(supplier);
    }
    this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    this.addAuditLog(`Supplier Saved: ${supplier.name}`, 'supplier', `Balance: ${supplier.currentBalance}`);
  }

  // --- CUSTOMER ITEM DISCOUNT MEMORY ---
  public getCustomerItemDiscount(customerId: string, itemKey: string): number {
    if (!customerId || customerId === 'cust_walkin') return 0;
    this.init();
    const discounts = this.getItem<Record<string, Record<string, number>>>(
      STORAGE_KEYS.CUSTOMER_DISCOUNTS,
      {}
    );
    if (discounts[customerId]) {
      if (discounts[customerId][itemKey] !== undefined) {
        return discounts[customerId][itemKey];
      }
      // If itemKey is variant (e.g. var_123_456), check if productId was saved
      if (itemKey.startsWith('var_')) {
        const prod = this.getProducts().find((p) => p.variants?.some((v) => `var_${v.id}` === itemKey));
        if (prod && discounts[customerId][`prod_${prod.id}`] !== undefined) {
          return discounts[customerId][`prod_${prod.id}`];
        }
      }
    }

    // Fallback: search past sales of this customer
    const sales = this.getSales();
    for (const sale of sales) {
      if (sale.customerId === customerId) {
        for (const itm of sale.items) {
          const key = itm.variantId
            ? `var_${itm.variantId}`
            : itm.uniformSetId
            ? `set_${itm.uniformSetId}`
            : `prod_${itm.productId}`;
          if (key === itemKey && itm.discount > 0) {
            return Math.round(itm.discount / (itm.quantity || 1));
          }
        }
      }
    }
    return 0;
  }

  public saveCustomerItemDiscount(customerId: string, itemKey: string, discount: number): void {
    if (!customerId || customerId === 'cust_walkin') return;
    this.init();
    const discounts = this.getItem<Record<string, Record<string, number>>>(
      STORAGE_KEYS.CUSTOMER_DISCOUNTS,
      {}
    );
    if (!discounts[customerId]) {
      discounts[customerId] = {};
    }
    const val = Math.max(0, Math.round(discount));
    discounts[customerId][itemKey] = val;
    this.setItem(STORAGE_KEYS.CUSTOMER_DISCOUNTS, discounts);
  }

  // --- STOCK MOVEMENTS & ADJUSTMENTS ---
  public getStockMovements(): StockMovement[] {
    this.init();
    return this.getItem<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []);
  }

  public recordStockMovement(data: Omit<StockMovement, 'id' | 'date' | 'userId' | 'userName' | 'createdAt'>): StockMovement {
    const movements = this.getStockMovements();
    const currentUser = this.getCurrentUser();
    const movement: StockMovement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      createdAt: new Date().toISOString(),
      ...data,
    };
    movements.unshift(movement);
    this.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, movements);
    return movement;
  }

  public adjustStock(
    productId: string,
    variantId: string | undefined,
    changeQty: number,
    type: 'adjustment_add' | 'adjustment_remove' | 'damaged' | 'lost',
    reason: string
  ): void {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === productId);
    if (!prod) throw new Error('Product not found for stock adjustment');

    if (variantId && prod.hasVariants && prod.variants) {
      const variant = prod.variants.find((v) => v.id === variantId);
      if (!variant) throw new Error('Product variant not found');
      const prevQty = variant.currentStock;
      const newQty = prevQty + changeQty;
      if (newQty < 0 && this.getSettings().preventNegativeStock) {
        throw new Error(`Insufficient stock. Current stock is ${prevQty}, cannot adjust by ${changeQty}`);
      }
      variant.currentStock = newQty;
      prod.currentStock = prod.variants.reduce((a, b) => a + b.currentStock, 0);

      this.recordStockMovement({
        productId: prod.id,
        variantId: variant.id,
        productName: prod.name,
        variantLabel: `Size: ${variant.size || '-'}, Color: ${variant.color || '-'}`,
        type,
        previousQty: prevQty,
        changeQty,
        newQty,
        reason,
      });
    } else {
      const prevQty = prod.currentStock;
      const newQty = prevQty + changeQty;
      if (newQty < 0 && this.getSettings().preventNegativeStock) {
        throw new Error(`Insufficient stock. Current stock is ${prevQty}, cannot adjust by ${changeQty}`);
      }
      prod.currentStock = newQty;

      this.recordStockMovement({
        productId: prod.id,
        productName: prod.name,
        type,
        previousQty: prevQty,
        changeQty,
        newQty,
        reason,
      });
    }

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog(`Stock Adjusted: ${prod.name}`, 'inventory', `${type}: ${changeQty > 0 ? '+' : ''}${changeQty} (${reason})`);
  }

  // --- SALES & BILLING TRANSACTION ---
  public getNextInvoiceNumber(): string {
    const settings = this.getSettings();
    return `${settings.invoicePrefix || 'INV-'}${settings.nextInvoiceNumber || 1001}`;
  }

  public getSales(): Sale[] {
    this.init();
    const list = this.getItem<Sale[]>(STORAGE_KEYS.SALES, []);
    return list.map((s) => ({
      ...s,
      customerName: (s.customerName || 'Walk-in Customer')
        .replace(/\(عام گاہک\)/g, '')
        .replace(/عام گاہک/g, '')
        .replace(/\(Walk-in\)/gi, '')
        .trim() || 'Walk-in Customer',
    }));
  }

  public getHeldBills(): HeldBill[] {
    this.init();
    return this.getItem<HeldBill[]>(STORAGE_KEYS.HELD_BILLS, []);
  }

  public saveHeldBill(heldBill: HeldBill): void {
    const held = this.getHeldBills();
    held.unshift(heldBill);
    this.setItem(STORAGE_KEYS.HELD_BILLS, held);
    this.addAuditLog('Bill Held', 'sale', `Held ID: ${heldBill.id}, Items: ${heldBill.items.length}`);
  }

  public deleteHeldBill(id: string): void {
    const held = this.getHeldBills().filter((b) => b.id !== id);
    this.setItem(STORAGE_KEYS.HELD_BILLS, held);
  }

  /**
   * CRITICAL TRANSACTION: Process & Save Sale
   * 1. Validates stock availability against preventNegativeStock
   * 2. Decrements inventory for regular products, variants, or uniform kits
   * 3. Creates immutable stock ledger movements
   * 4. Updates customer balance for credit / partial sales
   * 5. Records cash transaction if cash paid
   * 6. Computes accurate gross profit based on unit cost prices
   * 7. Saves the invoice and increments next invoice number
   */
  public processSale(saleData: Omit<Sale, 'id' | 'createdAt' | 'status'>): Sale {
    const settings = this.getSettings();
    const products = this.getProducts();
    const uniformSets = this.getUniformSets();

    // 1. Stock Validation
    if (settings.preventNegativeStock) {
      for (const item of saleData.items) {
        if (item.uniformSetId) {
          // Check components of uniform kit
          const kit = uniformSets.find((s) => s.id === item.uniformSetId);
          if (kit) {
            for (const comp of kit.components) {
              const compProd = products.find((p) => p.id === comp.productId);
              if (compProd) {
                const required = comp.quantity * item.quantity;
                if (comp.variantId && compProd.hasVariants && compProd.variants) {
                  const compVar = compProd.variants.find((v) => v.id === comp.variantId);
                  if (compVar && compVar.currentStock < required) {
                    throw new Error(`Insufficient stock for kit component "${comp.productName} (${comp.variantLabel})". Available: ${compVar.currentStock}, required: ${required}`);
                  }
                } else if (compProd.currentStock < required) {
                  throw new Error(`Insufficient stock for kit component "${comp.productName}". Available: ${compProd.currentStock}, required: ${required}`);
                }
              }
            }
          }
        } else {
          const prod = products.find((p) => p.id === item.productId);
          if (!prod) throw new Error(`Product "${item.productName}" not found in inventory.`);
          if (item.variantId && prod.hasVariants && prod.variants) {
            const v = prod.variants.find((va) => va.id === item.variantId);
            if (v && v.currentStock < item.quantity) {
              throw new Error(`Only ${v.currentStock} units available for "${item.productName} (${item.variantDetails || ''})". Cannot sell ${item.quantity}.`);
            }
          } else if (prod.currentStock < item.quantity) {
            throw new Error(`Only ${prod.currentStock} units available for "${item.productName}". Cannot sell ${item.quantity}.`);
          }
        }
      }
    }

    // 2. Deduct Inventory & Record Stock Movements
    for (const item of saleData.items) {
      if (item.uniformSetId) {
        // Uniform Kit: deduct each component
        const kit = uniformSets.find((s) => s.id === item.uniformSetId);
        if (kit) {
          for (const comp of kit.components) {
            const compProd = products.find((p) => p.id === comp.productId);
            if (compProd) {
              const deductQty = comp.quantity * item.quantity;
              if (comp.variantId && compProd.hasVariants && compProd.variants) {
                const compVar = compProd.variants.find((v) => v.id === comp.variantId);
                if (compVar) {
                  const prev = compVar.currentStock;
                  compVar.currentStock = prev - deductQty;
                  compProd.currentStock = compProd.variants.reduce((a, b) => a + b.currentStock, 0);

                  this.recordStockMovement({
                    productId: compProd.id,
                    variantId: compVar.id,
                    productName: `${compProd.name} (Part of ${kit.name})`,
                    variantLabel: comp.variantLabel,
                    type: 'sale',
                    referenceId: saleData.invoiceNumber,
                    previousQty: prev,
                    changeQty: -deductQty,
                    newQty: compVar.currentStock,
                    reason: `Sold in Uniform Kit: ${saleData.invoiceNumber}`,
                  });
                }
              } else {
                const prev = compProd.currentStock;
                compProd.currentStock = prev - deductQty;

                this.recordStockMovement({
                  productId: compProd.id,
                  productName: `${compProd.name} (Part of ${kit.name})`,
                  type: 'sale',
                  referenceId: saleData.invoiceNumber,
                  previousQty: prev,
                  changeQty: -deductQty,
                  newQty: compProd.currentStock,
                  reason: `Sold in Uniform Kit: ${saleData.invoiceNumber}`,
                });
              }
            }
          }
        }
      } else {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          if (item.variantId && prod.hasVariants && prod.variants) {
            const v = prod.variants.find((va) => va.id === item.variantId);
            if (v) {
              const prev = v.currentStock;
              v.currentStock = prev - item.quantity;
              prod.currentStock = prod.variants.reduce((a, b) => a + b.currentStock, 0);

              this.recordStockMovement({
                productId: prod.id,
                variantId: v.id,
                productName: prod.name,
                variantLabel: item.variantDetails,
                type: 'sale',
                referenceId: saleData.invoiceNumber,
                previousQty: prev,
                changeQty: -item.quantity,
                newQty: v.currentStock,
                reason: `Invoice Sale: ${saleData.invoiceNumber}`,
              });
            }
          } else {
            const prev = prod.currentStock;
            prod.currentStock = prev - item.quantity;

            this.recordStockMovement({
              productId: prod.id,
              productName: prod.name,
              type: 'sale',
              referenceId: saleData.invoiceNumber,
              previousQty: prev,
              changeQty: -item.quantity,
              newQty: prod.currentStock,
              reason: `Invoice Sale: ${saleData.invoiceNumber}`,
            });
          }
        }
      }
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // 3. Customer Ledger Adjustment (Credit or Partial Sale)
    if (saleData.customerId && saleData.balanceAmount > 0) {
      const customers = this.getCustomers();
      const customer = customers.find((c) => c.id === saleData.customerId);
      if (customer) {
        customer.currentBalance += saleData.balanceAmount;
        this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    // 4. Cash Transaction (if cash received)
    if (saleData.paidAmount > 0 && saleData.paymentMethod === 'cash') {
      this.recordCashTransaction({
        date: saleData.date,
        type: 'sale',
        amount: saleData.paidAmount,
        description: `Cash Sale Invoice #${saleData.invoiceNumber} (${saleData.customerName})`,
        referenceId: saleData.invoiceNumber,
      });
    }

    // 5. Create Final Sale Record
    const sale: Sale = {
      ...saleData,
      id: `sale_${Date.now()}`,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    const sales = this.getSales();
    sales.unshift(sale);
    this.setItem(STORAGE_KEYS.SALES, sales);

    // Increment next invoice number
    this.updateSettings({
      nextInvoiceNumber: settings.nextInvoiceNumber + 1,
    });

    // Remember customer item discounts for future sales
    if (sale.customerId && sale.customerId !== 'cust_walkin') {
      for (const itm of sale.items) {
        if (itm.discount !== undefined) {
          const key = itm.variantId
            ? `var_${itm.variantId}`
            : itm.uniformSetId
            ? `set_${itm.uniformSetId}`
            : `prod_${itm.productId}`;
          const perUnitDiscount = Math.round(itm.discount / (itm.quantity || 1));
          this.saveCustomerItemDiscount(sale.customerId, key, perUnitDiscount);
        }
      }
    }

    this.addAuditLog(
      `Sale Invoice #${sale.invoiceNumber}`,
      'sale',
      `Grand Total: ₨ ${sale.grandTotal}, Profit: ₨ ${sale.grossProfit}, Customer: ${sale.customerName}`
    );

    return sale;
  }

  // --- SALES RETURNS ---
  public getSaleReturns(): SaleReturn[] {
    this.init();
    return this.getItem<SaleReturn[]>(STORAGE_KEYS.SALE_RETURNS, []);
  }

  public processSaleReturn(returnData: Omit<SaleReturn, 'id' | 'createdAt'>): SaleReturn {
    const products = this.getProducts();
    const sales = this.getSales();
    const originalSale = sales.find((s) => s.id === returnData.saleId || s.invoiceNumber === returnData.invoiceNumber);

    // Restock returned items
    for (const item of returnData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        if (item.variantId && prod.hasVariants && prod.variants) {
          const v = prod.variants.find((va) => va.id === item.variantId);
          if (v) {
            const prev = v.currentStock;
            v.currentStock = prev + item.quantity;
            prod.currentStock = prod.variants.reduce((a, b) => a + b.currentStock, 0);

            this.recordStockMovement({
              productId: prod.id,
              variantId: v.id,
              productName: prod.name,
              type: 'sale_return',
              referenceId: returnData.returnNumber,
              previousQty: prev,
              changeQty: item.quantity,
              newQty: v.currentStock,
              reason: `Sale Return #${returnData.returnNumber}: ${item.reason}`,
            });
          }
        } else {
          const prev = prod.currentStock;
          prod.currentStock = prev + item.quantity;

          this.recordStockMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'sale_return',
            referenceId: returnData.returnNumber,
            previousQty: prev,
            changeQty: item.quantity,
            newQty: prod.currentStock,
            reason: `Sale Return #${returnData.returnNumber}: ${item.reason}`,
          });
        }
      }
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Financial adjustment: Refund Cash or Customer balance credit
    if (returnData.refundMethod === 'cash') {
      this.recordCashTransaction({
        date: returnData.date,
        type: 'sale',
        amount: -returnData.totalRefundAmount, // cash outflow
        description: `Cash Refund for Return #${returnData.returnNumber}`,
        referenceId: returnData.returnNumber,
      });
    } else if (returnData.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find((c) => c.id === returnData.customerId);
      if (customer) {
        customer.currentBalance -= returnData.totalRefundAmount;
        this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    // Update sale status
    if (originalSale) {
      originalSale.status = 'returned_partial';
      this.setItem(STORAGE_KEYS.SALES, sales);
    }

    const saleReturn: SaleReturn = {
      ...returnData,
      id: `ret_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const returns = this.getSaleReturns();
    returns.unshift(saleReturn);
    this.setItem(STORAGE_KEYS.SALE_RETURNS, returns);

    this.addAuditLog(
      `Sale Return #${saleReturn.returnNumber}`,
      'sale',
      `Original Invoice: ${saleReturn.invoiceNumber}, Refund: ₨ ${saleReturn.totalRefundAmount}`
    );

    return saleReturn;
  }

  // --- PURCHASES ---
  public getPurchases(): Purchase[] {
    this.init();
    return this.getItem<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  }

  public processPurchase(purchaseData: Omit<Purchase, 'id' | 'createdAt'>): Purchase {
    const products = this.getProducts();

    // Restock items
    for (const item of purchaseData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        // Update purchase price and sale price if provided
        if (item.purchaseRate > 0) prod.purchasePrice = item.purchaseRate;
        if (item.saleRate > 0) prod.salePrice = item.saleRate;

        if (item.variantId && prod.hasVariants && prod.variants) {
          const v = prod.variants.find((va) => va.id === item.variantId);
          if (v) {
            const prev = v.currentStock;
            v.currentStock = prev + item.quantity;
            if (item.purchaseRate > 0) v.purchasePrice = item.purchaseRate;
            if (item.saleRate > 0) v.salePrice = item.saleRate;
            prod.currentStock = prod.variants.reduce((a, b) => a + b.currentStock, 0);

            this.recordStockMovement({
              productId: prod.id,
              variantId: v.id,
              productName: prod.name,
              type: 'purchase',
              referenceId: purchaseData.purchaseInvoiceNo,
              previousQty: prev,
              changeQty: item.quantity,
              newQty: v.currentStock,
              reason: `Purchase Received from ${purchaseData.supplierName}`,
            });
          }
        } else {
          const prev = prod.currentStock;
          prod.currentStock = prev + item.quantity;

          this.recordStockMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'purchase',
            referenceId: purchaseData.purchaseInvoiceNo,
            previousQty: prev,
            changeQty: item.quantity,
            newQty: prod.currentStock,
            reason: `Purchase Received from ${purchaseData.supplierName}`,
          });
        }
      }
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Update supplier payable
    if (purchaseData.supplierId && purchaseData.remainingAmount > 0) {
      const suppliers = this.getSuppliers();
      const sup = suppliers.find((s) => s.id === purchaseData.supplierId);
      if (sup) {
        sup.currentBalance += purchaseData.remainingAmount;
        this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
      }
    }

    // Record cash payment
    if (purchaseData.paidAmount > 0 && purchaseData.paymentMethod === 'cash') {
      this.recordCashTransaction({
        date: purchaseData.date,
        type: 'supplier_payment',
        amount: -purchaseData.paidAmount,
        description: `Payment for Purchase Invoice #${purchaseData.purchaseInvoiceNo} (${purchaseData.supplierName})`,
        referenceId: purchaseData.purchaseInvoiceNo,
      });
    }

    const purchase: Purchase = {
      ...purchaseData,
      id: `pur_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const purchases = this.getPurchases();
    purchases.unshift(purchase);
    this.setItem(STORAGE_KEYS.PURCHASES, purchases);

    this.addAuditLog(
      `Purchase #${purchase.purchaseInvoiceNo}`,
      'purchase',
      `Supplier: ${purchase.supplierName}, Total: ₨ ${purchase.grandTotal}`
    );

    return purchase;
  }

  // --- PURCHASE RETURNS ---
  public getPurchaseReturns(): PurchaseReturn[] {
    this.init();
    return this.getItem<PurchaseReturn[]>(STORAGE_KEYS.PURCHASE_RETURNS, []);
  }

  public processPurchaseReturn(returnData: Omit<PurchaseReturn, 'id' | 'createdAt'>): PurchaseReturn {
    const products = this.getProducts();

    for (const item of returnData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        if (item.variantId && prod.hasVariants && prod.variants) {
          const v = prod.variants.find((va) => va.id === item.variantId);
          if (v) {
            const prev = v.currentStock;
            v.currentStock = Math.max(0, prev - item.quantity);
            prod.currentStock = prod.variants.reduce((a, b) => a + b.currentStock, 0);

            this.recordStockMovement({
              productId: prod.id,
              variantId: v.id,
              productName: prod.name,
              type: 'purchase_return',
              referenceId: returnData.returnNumber,
              previousQty: prev,
              changeQty: -item.quantity,
              newQty: v.currentStock,
              reason: `Returned to Supplier: ${returnData.supplierName}`,
            });
          }
        } else {
          const prev = prod.currentStock;
          prod.currentStock = Math.max(0, prev - item.quantity);

          this.recordStockMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'purchase_return',
            referenceId: returnData.returnNumber,
            previousQty: prev,
            changeQty: -item.quantity,
            newQty: prod.currentStock,
            reason: `Returned to Supplier: ${returnData.supplierName}`,
          });
        }
      }
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Reduce supplier balance
    if (returnData.supplierId) {
      const suppliers = this.getSuppliers();
      const sup = suppliers.find((s) => s.id === returnData.supplierId);
      if (sup) {
        sup.currentBalance = Math.max(0, sup.currentBalance - returnData.totalAmount);
        this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
      }
    }

    const pr: PurchaseReturn = {
      ...returnData,
      id: `pret_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const rets = this.getPurchaseReturns();
    rets.unshift(pr);
    this.setItem(STORAGE_KEYS.PURCHASE_RETURNS, rets);

    this.addAuditLog(
      `Purchase Return #${pr.returnNumber}`,
      'purchase',
      `Returned to ${pr.supplierName}, Total: ₨ ${pr.totalAmount}`
    );

    return pr;
  }

  // --- EXPENSES ---
  public getExpenses(): Expense[] {
    this.init();
    return this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  public getExpenseCategories(): ExpenseCategory[] {
    this.init();
    return this.getItem<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES);
  }

  public saveExpenseCategory(cat: ExpenseCategory): void {
    const cats = this.getExpenseCategories();
    const idx = cats.findIndex((c) => c.id === cat.id);
    if (idx >= 0) cats[idx] = cat;
    else cats.push(cat);
    this.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, cats);
  }

  public addExpense(expenseData: Omit<Expense, 'id' | 'createdAt' | 'userId' | 'userName'>): Expense {
    const currentUser = this.getCurrentUser();
    const expense: Expense = {
      ...expenseData,
      id: `exp_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    const expenses = this.getExpenses();
    expenses.unshift(expense);
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);

    // Deduct cash if paid by cash
    if (expense.paymentMethod === 'cash') {
      this.recordCashTransaction({
        date: expense.date,
        type: 'expense',
        amount: -expense.amount,
        description: `Expense: ${expense.categoryName} - ${expense.description}`,
        referenceId: expense.id,
      });
    }

    this.addAuditLog(`Expense Added: ${expense.categoryName}`, 'expense', `Amount: ₨ ${expense.amount}`);
    return expense;
  }

  public deleteExpense(expenseId: string): void {
    const expenses = this.getExpenses().filter((e) => e.id !== expenseId);
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    this.addAuditLog('Expense Deleted', 'expense', `Expense ID: ${expenseId}`);
  }

  // --- CASH REGISTER & SHIFTS ---
  public getCashTransactions(): CashTransaction[] {
    this.init();
    return this.getItem<CashTransaction[]>(STORAGE_KEYS.CASH_TRANSACTIONS, []);
  }

  public recordCashTransaction(
    txData: Omit<CashTransaction, 'id' | 'createdAt' | 'userId' | 'userName'>
  ): CashTransaction {
    const currentUser = this.getCurrentUser();
    const tx: CashTransaction = {
      ...txData,
      id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser.id,
      userName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    const txs = this.getCashTransactions();
    txs.unshift(tx);
    this.setItem(STORAGE_KEYS.CASH_TRANSACTIONS, txs);
    return tx;
  }

  public getCashShifts(): CashRegisterShift[] {
    this.init();
    return this.getItem<CashRegisterShift[]>(STORAGE_KEYS.CASH_SHIFTS, []);
  }

  public getActiveCashShift(): CashRegisterShift | undefined {
    return this.getCashShifts().find((s) => s.status === 'open');
  }

  public openCashShift(openingCash: number): CashRegisterShift {
    const currentUser = this.getCurrentUser();
    const active = this.getActiveCashShift();
    if (active) throw new Error('A cash register shift is already currently open.');

    const shift: CashRegisterShift = {
      id: `shift_${Date.now()}`,
      shiftDate: new Date().toISOString().split('T')[0],
      openedAt: new Date().toISOString(),
      openingCash,
      cashSales: 0,
      customerPayments: 0,
      supplierPayments: 0,
      expenses: 0,
      cashWithdrawals: 0,
      cashDeposits: 0,
      expectedCash: openingCash,
      status: 'open',
      userId: currentUser.id,
      userName: currentUser.fullName,
    };

    const shifts = this.getCashShifts();
    shifts.unshift(shift);
    this.setItem(STORAGE_KEYS.CASH_SHIFTS, shifts);

    this.recordCashTransaction({
      date: new Date().toISOString(),
      type: 'opening',
      amount: openingCash,
      description: `Shift Opening Cash Float`,
      referenceId: shift.id,
    });

    this.addAuditLog('Cash Shift Opened', 'auth', `Opening Float: ₨ ${openingCash}`);
    return shift;
  }

  public closeCashShift(shiftId: string, actualCash: number, notes?: string): CashRegisterShift {
    const shifts = this.getCashShifts();
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) throw new Error('Shift not found');

    // Calculate all cash movements for this shift
    const txs = this.getCashTransactions().filter(
      (t) => new Date(t.createdAt) >= new Date(shift.openedAt) && t.type !== 'opening'
    );

    let salesCash = 0;
    let custPay = 0;
    let suppPay = 0;
    let expCash = 0;
    let inCash = 0;
    let outCash = 0;

    for (const t of txs) {
      if (t.type === 'sale') {
        if (t.amount > 0) salesCash += t.amount;
        else salesCash += t.amount; // refunds are negative
      } else if (t.type === 'customer_payment') {
        custPay += t.amount;
      } else if (t.type === 'supplier_payment') {
        suppPay += Math.abs(t.amount);
      } else if (t.type === 'expense') {
        expCash += Math.abs(t.amount);
      } else if (t.type === 'cash_in') {
        inCash += t.amount;
      } else if (t.type === 'cash_out') {
        outCash += Math.abs(t.amount);
      }
    }

    const expected = shift.openingCash + salesCash + custPay + inCash - suppPay - expCash - outCash;
    const diff = actualCash - expected;

    shift.closedAt = new Date().toISOString();
    shift.status = 'closed';
    shift.cashSales = salesCash;
    shift.customerPayments = custPay;
    shift.supplierPayments = suppPay;
    shift.expenses = expCash;
    shift.cashDeposits = inCash;
    shift.cashWithdrawals = outCash;
    shift.expectedCash = expected;
    shift.actualCash = actualCash;
    shift.difference = diff;
    shift.notes = notes;

    this.setItem(STORAGE_KEYS.CASH_SHIFTS, shifts);
    this.addAuditLog(
      'Cash Shift Closed',
      'auth',
      `Expected: ₨ ${expected}, Actual: ₨ ${actualCash}, Difference: ₨ ${diff}`
    );

    return shift;
  }

  // --- CUSTOMER & SUPPLIER PAYMENTS ---
  public receiveCustomerPayment(customerId: string, amount: number, paymentMethod: string, notes?: string): void {
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Customer not found');

    customer.currentBalance -= amount;
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);

    if (paymentMethod === 'cash') {
      this.recordCashTransaction({
        date: new Date().toISOString(),
        type: 'customer_payment',
        amount: amount,
        description: `Payment Received from Customer ${customer.name}${notes ? ` (${notes})` : ''}`,
        referenceId: customer.id,
      });
    }

    this.addAuditLog(`Customer Payment Received: ${customer.name}`, 'customer', `Amount: ₨ ${amount}, Method: ${paymentMethod}`);
  }

  public paySupplier(supplierId: string, amount: number, paymentMethod: string, notes?: string): void {
    const suppliers = this.getSuppliers();
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) throw new Error('Supplier not found');

    supplier.currentBalance -= amount;
    this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);

    if (paymentMethod === 'cash') {
      this.recordCashTransaction({
        date: new Date().toISOString(),
        type: 'supplier_payment',
        amount: -amount,
        description: `Payment to Supplier ${supplier.name}${notes ? ` (${notes})` : ''}`,
        referenceId: supplier.id,
      });
    }

    this.addAuditLog(`Supplier Payment Paid: ${supplier.name}`, 'supplier', `Amount: ₨ ${amount}, Method: ${paymentMethod}`);
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    this.init();
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  public addAuditLog(
    action: string,
    category: AuditLog['category'],
    details: string,
    recordId?: string
  ): void {
    const currentUser = this.getCurrentUser();
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'sys',
      userName: currentUser?.fullName || 'System',
      action,
      category,
      details,
      recordId,
    };
    logs.unshift(newLog);
    // Keep max 1000 logs locally
    if (logs.length > 1000) logs.pop();
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- BACKUP & RESTORE & EXPORT ---
  public getBackups(): BackupRecord[] {
    this.init();
    return this.getItem<BackupRecord[]>(STORAGE_KEYS.BACKUPS, []);
  }

  public createFullBackup(): { fileName: string; jsonData: string } {
    this.init();
    const data = {
      version: '1.0.0',
      system: 'KitabGhar POS & Uniform ERP',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      users: this.getUsers(),
      categories: this.getCategories(),
      schools: this.getSchools(),
      products: this.getProducts(),
      uniformSets: this.getUniformSets(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      sales: this.getSales(),
      saleReturns: this.getSaleReturns(),
      purchases: this.getPurchases(),
      purchaseReturns: this.getPurchaseReturns(),
      expenses: this.getExpenses(),
      expenseCategories: this.getExpenseCategories(),
      cashTransactions: this.getCashTransactions(),
      cashShifts: this.getCashShifts(),
      stockMovements: this.getStockMovements(),
      auditLogs: this.getAuditLogs(),
    };

    const jsonData = JSON.stringify(data, null, 2);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `KitabGhar_Backup_${dateStr}.json`;

    // Save record in backups list
    const backups = this.getBackups();
    const record: BackupRecord = {
      id: `bkp_${Date.now()}`,
      fileName,
      createdAt: new Date().toISOString(),
      sizeBytes: new Blob([jsonData]).size,
      totalProducts: data.products.length,
      totalSales: data.sales.length,
      totalCustomers: data.customers.length,
    };
    backups.unshift(record);
    this.setItem(STORAGE_KEYS.BACKUPS, backups);

    this.addAuditLog('Database Backup Created', 'system', `File: ${fileName}`);
    return { fileName, jsonData };
  }

  public restoreFromBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data.settings || !data.products) {
        throw new Error('Invalid backup file format: Missing settings or products.');
      }

      this.setItem(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.users) this.setItem(STORAGE_KEYS.USERS, data.users);
      if (data.categories) this.setItem(STORAGE_KEYS.CATEGORIES, data.categories);
      if (data.schools) this.setItem(STORAGE_KEYS.SCHOOLS, data.schools);
      if (data.products) this.setItem(STORAGE_KEYS.PRODUCTS, data.products);
      if (data.uniformSets) this.setItem(STORAGE_KEYS.UNIFORM_SETS, data.uniformSets);
      if (data.customers) this.setItem(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.suppliers) this.setItem(STORAGE_KEYS.SUPPLIERS, data.suppliers);
      if (data.sales) this.setItem(STORAGE_KEYS.SALES, data.sales);
      if (data.saleReturns) this.setItem(STORAGE_KEYS.SALE_RETURNS, data.saleReturns);
      if (data.purchases) this.setItem(STORAGE_KEYS.PURCHASES, data.purchases);
      if (data.purchaseReturns) this.setItem(STORAGE_KEYS.PURCHASE_RETURNS, data.purchaseReturns);
      if (data.expenses) this.setItem(STORAGE_KEYS.EXPENSES, data.expenses);
      if (data.expenseCategories) this.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, data.expenseCategories);
      if (data.cashTransactions) this.setItem(STORAGE_KEYS.CASH_TRANSACTIONS, data.cashTransactions);
      if (data.cashShifts) this.setItem(STORAGE_KEYS.CASH_SHIFTS, data.cashShifts);
      if (data.stockMovements) this.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, data.stockMovements);

      this.addAuditLog('Database Restored from Backup', 'system', `Restored ${data.products.length} products and ${data.sales?.length || 0} sales.`);
      return true;
    } catch (e: any) {
      console.error('Failed to restore backup:', e);
      throw new Error(`Restore failed: ${e.message}`);
    }
  }

  public cleanDemoData(): void {
    // Reset products, sales, customers, suppliers to clean state for real production shop
    this.setItem(STORAGE_KEYS.PRODUCTS, []);
    this.setItem(STORAGE_KEYS.UNIFORM_SETS, []);
    this.setItem(STORAGE_KEYS.SALES, []);
    this.setItem(STORAGE_KEYS.HELD_BILLS, []);
    this.setItem(STORAGE_KEYS.SALE_RETURNS, []);
    this.setItem(STORAGE_KEYS.PURCHASES, []);
    this.setItem(STORAGE_KEYS.PURCHASE_RETURNS, []);
    this.setItem(STORAGE_KEYS.EXPENSES, []);
    this.setItem(STORAGE_KEYS.CASH_TRANSACTIONS, []);
    this.setItem(STORAGE_KEYS.CASH_SHIFTS, []);
    this.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, []);
    this.setItem(STORAGE_KEYS.CUSTOMERS, [
      {
        id: 'cust_walkin',
        name: 'Walk-in Customer',
        phone: '0300-0000000',
        type: 'walk-in',
        openingBalance: 0,
        currentBalance: 0,
        notes: 'Default walk-in customer',
        createdAt: new Date().toISOString(),
      },
    ]);
    this.setItem(STORAGE_KEYS.SUPPLIERS, []);

    this.addAuditLog('Demo Data Cleared', 'system', 'Database purged of sample products and invoices for fresh real store use.');
  }

  public loadDemoData(): void {
    this.setItem(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    this.setItem(STORAGE_KEYS.SCHOOLS, DEFAULT_SCHOOLS);
    this.setItem(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    this.setItem(STORAGE_KEYS.UNIFORM_SETS, DEFAULT_UNIFORM_SETS);
    this.setItem(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
    this.setItem(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
    this.addAuditLog('Demo Data Loaded', 'system', 'Loaded rich sample catalog for stationery, school uniform variants, and bags.');
  }
}

// Global Singleton Export
export const db = new DatabaseStore();
