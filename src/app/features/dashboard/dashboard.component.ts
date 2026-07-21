import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit,
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { gsap } from 'gsap';
import { ProductService, GetProductsParams } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UploadService } from '../../core/services/upload.service';
import { Product, SIZES, Size } from '../../core/models/product.model';
import { Admin } from '../../core/models/auth.model';
import { AdminOrderService, Order } from '../../core/services/admin-order.service';
import { CategoryService, Category } from '../../core/services/category.service';

export type FormStep = 1 | 2 | 3;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sidebar', { static: true }) sidebarRef!: ElementRef;

  admin: Admin | null = null;
  products: Product[] = [];
  isLoadingProducts = false;
  isSubmitting = false;
  showAddForm = false;
  currentStep: FormStep = 1;
  currentView: 'products' | 'orders' | 'analytics' | 'categories' = 'products';
  readonly SIZES = SIZES;
  dbCategories: Category[] = [];
  get CATEGORIES(): string[] {
    return this.dbCategories.length > 0
      ? this.dbCategories.map(c => c.name)
      : ['تيشيرتات', 'قمصان', 'بنطلونات', 'جاكيتات', 'إكسسوارات'];
  }

  // ── Filter State ─────────────────────────────────────────────────────────────────
  searchTerm = '';
  filterCategory = '';
  filterMinPrice: number | null = null;
  filterMaxPrice: number | null = null;
  private searchSubject = new Subject<string>();

  currentPage = 1;
  totalPages = 1;
  totalProducts = 0;
  readonly PAGE_SIZE = 8;

  // ── Orders State ─────────────────────────────────────────────────────────────────
  orders: Order[] = [];
  isLoadingOrders = false;
  ordersCurrentPage = 1;
  ordersTotalPages = 1;
  ordersTotal = 0;
  filterOrderStatus = '';
  orderSearchTerm = '';
  private orderSearchSubject = new Subject<string>();

  editingProductId: string | null = null;
  deletingProductId: string | null = null;

  productForm!: FormGroup;

  // ── Size Chart File State ──────────────────────────────────────────────────────
  sizeChartFile: File | null = null;
  sizeChartPreview = '';
  sizeChartUploading = false;

  // ── Per-color image state ─────────────────────────────────────────────────────
  // Index = color index; value = { files: File[], previews: string[], uploadedUrls: string[] }
  colorImageState: Array<{ files: File[]; previews: string[]; uploadedUrls: string[]; uploading: boolean }> = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private productSvc: ProductService,
    private authSvc: AuthService,
    private toast: ToastService,
    private uploadSvc: UploadService,
    private orderSvc: AdminOrderService,
    private catSvc: CategoryService,
  ) { }

  ngOnInit(): void {
    this.authSvc.admin$.pipe(takeUntil(this.destroy$)).subscribe(a => (this.admin = a));
    this.buildForm();
    this.loadDbCategories();
    this.loadProducts();
    this.loadOrders();

    // ── Debounced search: wait 400ms after user stops typing ────────────────────
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadProducts(1));

    // ── Debounced orders search: wait 400ms after user stops typing ─────────────
    this.orderSearchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadOrders(1));
  }

  loadDbCategories(): void {
    this.catSvc.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.dbCategories = res?.data?.categories || [];
      },
      error: (err) => {
        console.error('Failed to load categories', err);
      }
    });
  }

  getCategoryName(cat: any): string {
    if (!cat) return '';
    if (typeof cat === 'object') {
      return cat.nameAr || cat.nameEn || cat.name || '';
    }
    return String(cat);
  }

  ngAfterViewInit(): void {
    // 1. نتأكد إننا في المتصفح والـ DOM جاهز
    setTimeout(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      let hasAnimation = false;

      // 2. أنميشن السايد بار (لو موجود)
      if (this.sidebarRef && this.sidebarRef.nativeElement) {
        tl.fromTo(this.sidebarRef.nativeElement, { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7 });
        hasAnimation = true;
      }

      // 3. أنميشن الكروت (بنتأكد الأول إنها مرسومة في الـ HTML)
      const cards = document.querySelectorAll('.dash-stat-card');
      if (cards.length > 0) {
        tl.fromTo(cards, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, hasAnimation ? '-=0.3' : '0');
        hasAnimation = true;
      }

      // 4. أنميشن الجداول (بنتأكد إنها مرسومة)
      const tables = document.querySelectorAll('.products-table-wrapper, .orders-table-wrapper');
      if (tables.length > 0) {
        tl.fromTo(tables, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, hasAnimation ? '-=0.1' : '0');
      }
    }, 50); // تأخير 50 ملي ثانية عشان نضمن إن الأنجولار رسم الـ DOM الجديد تماماً
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Form ──────────────────────────────────────────────────────────────────────
  buildForm(): void {
    this.productForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      basePrice: [null, [Validators.required, Validators.min(0)]],
      discountPrice: [0, Validators.min(0)],
      category: ['', Validators.required],
      isActive: [true],
      isNewArrival: [false],
      sizeChartImage: [''],
      colors: this.fb.array([this.buildColorGroup()]),
      variants: this.fb.array([this.buildVariantGroup()]),
    });
    this.colorImageState = [{ files: [], previews: [], uploadedUrls: [], uploading: false }];
  }

  buildColorGroup(): FormGroup {
    return this.fb.group({ name: ['', Validators.required] });
  }

  buildVariantGroup(): FormGroup {
    return this.fb.group({
      color: ['', Validators.required],
      size: ['Small', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
    });
  }

  get colorsArray(): FormArray { return this.productForm.get('colors') as FormArray; }
  get variantsArray(): FormArray { return this.productForm.get('variants') as FormArray; }

  addColor(): void {
    this.colorsArray.push(this.buildColorGroup());
    this.colorImageState.push({ files: [], previews: [], uploadedUrls: [], uploading: false });
    setTimeout(() => gsap.fromTo('.color-entry:last-child', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 }), 10);
  }

  removeColor(i: number): void {
    if (this.colorsArray.length > 1) {
      this.colorsArray.removeAt(i);
      this.colorImageState.splice(i, 1);
    }
  }

  addVariant(): void {
    this.variantsArray.push(this.buildVariantGroup());
    setTimeout(() => gsap.fromTo('.variant-entry:last-child', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 }), 10);
  }
  removeVariant(i: number): void { if (this.variantsArray.length > 1) this.variantsArray.removeAt(i); }

  // ── Image File Selection ──────────────────────────────────────────────────────
  onFilesSelected(event: Event, colorIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const newFiles = Array.from(input.files);
    const state = this.colorImageState[colorIndex];

    // Add to existing files
    state.files = [...state.files, ...newFiles];

    // Generate object URL previews (fast, no upload yet)
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    state.previews = [...state.previews, ...newPreviews];

    // Reset input so the same file can be re-selected
    input.value = '';
  }

  removePreview(colorIndex: number, imgIndex: number): void {
    const state = this.colorImageState[colorIndex];
    URL.revokeObjectURL(state.previews[imgIndex]);
    state.files.splice(imgIndex, 1);
    state.previews.splice(imgIndex, 1);
    state.uploadedUrls.splice(imgIndex, 1);
  }

  onSizeChartSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.sizeChartFile = input.files[0];
    if (this.sizeChartPreview && this.sizeChartPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.sizeChartPreview);
    }
    this.sizeChartPreview = URL.createObjectURL(this.sizeChartFile);
    input.value = '';
  }

  removeSizeChart(): void {
    if (this.sizeChartPreview && this.sizeChartPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.sizeChartPreview);
    }
    this.sizeChartFile = null;
    this.sizeChartPreview = '';
    this.productForm.patchValue({ sizeChartImage: '' });
  }

  // ── Upload all pending images for a colour, returns Cloudinary URLs ───────────
  private uploadColorImages(colorIndex: number): Promise<string[]> {
    const state = this.colorImageState[colorIndex];

    // If no new files but already have uploaded URLs from edit mode, reuse them
    if (state.files.length === 0) {
      return Promise.resolve(state.uploadedUrls);
    }

    state.uploading = true;
    return new Promise((resolve, reject) => {
      this.uploadSvc.uploadImages(state.files).subscribe({
        next: (res) => {
          state.uploading = false;
          // Merge any pre-existing URLs (from edit mode) with newly uploaded ones
          const allUrls = [...state.uploadedUrls, ...res.urls];
          state.uploadedUrls = allUrls;
          resolve(allUrls);
        },
        error: (err) => { state.uploading = false; reject(err); }
      });
    });
  }

  // ── Step Navigation ───────────────────────────────────────────────────────────
  nextStep(): void {
    if (this.currentStep === 1 && !this.isStep1Valid()) return;
    if (this.currentStep < 3) this.animateStep(() => (this.currentStep as any)++);
  }
  prevStep(): void {
    if (this.currentStep > 1) this.animateStep(() => (this.currentStep as any)--);
  }
  private animateStep(cb: () => void): void {
    gsap.to('.step-content', {
      opacity: 0, x: -20, duration: 0.2, onComplete: () => {
        cb();
        gsap.fromTo('.step-content', { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 });
      }
    });
  }
  isStep1Valid(): boolean {
    ['title', 'description', 'basePrice', 'category'].forEach(c => this.productForm.get(c)?.markAsTouched());
    return ['title', 'description', 'basePrice', 'category'].every(c => this.productForm.get(c)?.valid);
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) { this.productForm.markAllAsTouched(); this.toast.error('يوجد بيانات ناقصة'); return; }

    // Validate at least 1 image per color
    for (let i = 0; i < this.colorImageState.length; i++) {
      const s = this.colorImageState[i];
      if (s.files.length === 0 && s.uploadedUrls.length === 0) {
        this.toast.error(`يجب رفع صورة واحدة على الأقل للون رقم ${i + 1}`);
        return;
      }
    }

    this.isSubmitting = true;
    try {
      const raw = this.productForm.value;

      // 1. Upload size chart image if selected
      let sizeChartUrl = raw.sizeChartImage || '';
      if (this.sizeChartFile) {
        this.sizeChartUploading = true;
        try {
          const res = await this.uploadSvc.uploadImages([this.sizeChartFile]).toPromise();
          if (res && res.urls && res.urls.length > 0) {
            sizeChartUrl = res.urls[0];
          }
        } catch (err) {
          this.sizeChartUploading = false;
          this.toast.error('فشل رفع صورة جدول المقاسات');
          this.isSubmitting = false;
          return;
        }
        this.sizeChartUploading = false;
      }

      // 2. Upload color images in parallel
      const urlsPerColor = await Promise.all(
        this.colorImageState.map((_, i) => this.uploadColorImages(i))
      );

      const colorControls = this.colorsArray.controls as FormGroup[];

      const payload = {
        title: raw.title,
        description: raw.description,
        basePrice: +raw.basePrice,
        discountPrice: +(raw.discountPrice ?? 0),
        category: (() => {
          const selected = this.dbCategories.find(c => c.name === raw.category);
          return selected ? { nameAr: selected.name, nameEn: selected.name, slug: selected.slug } : raw.category;
        })(),
        isActive: raw.isActive,
        isNewArrival: raw.isNewArrival,
        sizeChartImage: sizeChartUrl,
        options: {
          colors: colorControls.map((ctrl, i) => ({
            name: ctrl.get('name')!.value,
            images: urlsPerColor[i],
          })),
        },
        variants: raw.variants.map((v: any) => ({
          color: v.color,
          size: v.size,
          stock: +v.stock,
        })),
      };

      const req$ = this.editingProductId
        ? this.productSvc.update(this.editingProductId, payload)
        : this.productSvc.create(payload);

      req$.subscribe({
        next: () => {
          this.toast.success(this.editingProductId ? 'تم تحديث المنتج ✅' : 'تم إضافة المنتج ✅');
          this.isSubmitting = false;
          this.closeForm();
          this.loadProducts(this.currentPage);
        },
        error: () => { this.isSubmitting = false; }
      });

    } catch {
      this.isSubmitting = false;
      this.toast.error('فشل رفع الصور، حاول مرة أخرى');
    }
  }

  // ── Load Products ─────────────────────────────────────────────────────────────
  loadProducts(page = 1): void {
    this.isLoadingProducts = true;
    const params: any = { page, limit: this.PAGE_SIZE };
    if (this.searchTerm.trim()) params.search = this.searchTerm.trim();
    if (this.filterCategory) params.category = this.filterCategory;
    if (this.filterMinPrice != null) params.minPrice = this.filterMinPrice;
    if (this.filterMaxPrice != null) params.maxPrice = this.filterMaxPrice;

    this.productSvc.getAll(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.products = res.data.products;
        this.totalProducts = res.data.total;
        this.totalPages = res.data.totalPages;
        this.currentPage = res.data.page;
        this.isLoadingProducts = false;
        setTimeout(() => gsap.fromTo('.product-row', { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.35 }), 10);
      },
      error: () => { this.isLoadingProducts = false; }
    });
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  onFilterChange(): void { this.loadProducts(1); }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterCategory = '';
    this.filterMinPrice = null;
    this.filterMaxPrice = null;
    this.loadProducts(1);
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterCategory || this.filterMinPrice != null || this.filterMaxPrice != null);
  }

  changePage(p: number): void { if (p >= 1 && p <= this.totalPages) this.loadProducts(p); }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  // ── Edit Product ──────────────────────────────────────────────────────────────
  editProduct(p: Product): void {
    this.editingProductId = p._id;
    this.buildForm();
    this.productForm.patchValue({
      title: p.title, description: p.description, basePrice: p.basePrice,
      discountPrice: p.discountPrice, category: this.getCategoryName(p.category), isActive: p.isActive,
      isNewArrival: p.isNewArrival, sizeChartImage: p.sizeChartImage || '',
    });
    this.sizeChartFile = null;
    this.sizeChartPreview = p.sizeChartImage || '';

    this.colorsArray.clear();
    this.colorImageState = [];
    p.options.colors.forEach(c => {
      this.colorsArray.push(this.fb.group({ name: [c.name, Validators.required] }));
      // Pre-populate uploadedUrls with existing images from DB
      this.colorImageState.push({ files: [], previews: c.images, uploadedUrls: c.images, uploading: false });
    });

    this.variantsArray.clear();
    p.variants.forEach(v => this.variantsArray.push(this.fb.group({
      color: [v.color, Validators.required],
      size: [v.size, Validators.required],
      stock: [v.stock, [Validators.required, Validators.min(0)]],
    })));

    this.showAddForm = true; this.currentStep = 1;
    setTimeout(() => document.querySelector('.product-form-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  confirmDelete(id: string): void { this.deletingProductId = id; }
  cancelDelete(): void { this.deletingProductId = null; }
  deleteProduct(): void {
    if (!this.deletingProductId) return;
    this.productSvc.delete(this.deletingProductId).subscribe({
      next: () => { this.toast.success('تم حذف المنتج'); this.deletingProductId = null; this.loadProducts(this.currentPage); },
      error: () => { this.deletingProductId = null; }
    });
  }

  toggleActive(p: Product): void {
    const newState = !p.isActive;
    this.productSvc.update(p._id, { isActive: newState } as any).subscribe({
      next: () => {
        p.isActive = newState;  // update local model only on confirmed success
        this.toast.success(`تم ${newState ? 'تفعيل' : 'إيقاف'} المنتج ✅`);
      },
    });
  }

  openAddForm(): void {
    this.editingProductId = null; this.buildForm(); this.currentStep = 1; this.showAddForm = true;
    setTimeout(() => document.querySelector('.product-form-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }
  closeForm(): void {
    // Revoke object URLs to avoid memory leaks
    this.colorImageState.forEach(s => s.previews.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); }));
    if (this.sizeChartPreview && this.sizeChartPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.sizeChartPreview);
    }
    this.sizeChartFile = null;
    this.sizeChartPreview = '';
    this.showAddForm = false; this.editingProductId = null; this.currentStep = 1;
  }
  logout(): void { this.authSvc.logout(); }

  ctrl(n: string): AbstractControl { return this.productForm.get(n)!; }
  colorCtrl(i: number, f: string): AbstractControl { return (this.colorsArray.at(i) as FormGroup).get(f)!; }
  variantCtrl(i: number, f: string): AbstractControl { return (this.variantsArray.at(i) as FormGroup).get(f)!; }
  totalStock(p: Product): number { return p.variants.reduce((s, v) => s + v.stock, 0); }
  thumbUrl(p: Product): string { return (p.options?.colors?.[0]?.images?.[0]) ?? ''; }
  get currentYear(): number { return new Date().getFullYear(); }

  isAnyUploading(): boolean { return this.colorImageState.some(s => s.uploading); }

  /** Safe accessor for colorImageState — prevents optional-chain errors in templates */
  colorState(i: number) {
    return this.colorImageState[i] ?? { files: [], previews: [], uploadedUrls: [], uploading: false };
  }

  // ── Orders ─────────────────────────────────────────────────────────────────────
  changeView(view: 'products' | 'orders' | 'analytics' | 'categories'): void {
    if (this.currentView === view) return;
    this.currentView = view;
    if (view === 'products') {
      this.loadDbCategories();
      this.loadProducts();
    }
    if (view === 'orders') this.loadOrders();
    if (view === 'categories') this.loadDbCategories();
    // analytics and category components manage their own data load via ngOnInit
    if (view !== 'analytics' && view !== 'categories') {
      setTimeout(() => {
        gsap.fromTo(view === 'products' ? '.products-table-wrapper' : '.orders-table-wrapper',
          { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
      }, 10);
    } else {
      setTimeout(() => {
        gsap.fromTo(view === 'analytics' ? '.analytics-view-wrapper' : '.category-view-wrapper',
          { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
      }, 10);
    }
  }

  loadOrders(page = 1): void {
    this.isLoadingOrders = true;
    const params: any = { page, limit: this.PAGE_SIZE };
    if (this.filterOrderStatus) params.status = this.filterOrderStatus;
    if (this.orderSearchTerm && this.orderSearchTerm.trim()) {
      params.search = this.orderSearchTerm.trim();
    }

    this.orderSvc.getAll(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.orders = res.data.orders;
        this.ordersTotal = res.data.total;
        this.ordersTotalPages = res.data.totalPages;
        this.ordersCurrentPage = res.data.page;
        this.isLoadingOrders = false;
        setTimeout(() => gsap.fromTo('.order-row', { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.35 }), 10);
      },
      error: () => { this.isLoadingOrders = false; }
    });
  }

  onOrderSearchInput(val: string): void {
    this.orderSearchTerm = val;
    this.orderSearchSubject.next(val);
  }

  onOrderStatusFilterChange(): void { this.loadOrders(1); }
  changeOrderPage(p: number): void { if (p >= 1 && p <= this.ordersTotalPages) this.loadOrders(p); }
  get orderPageNumbers(): number[] { return Array.from({ length: this.ordersTotalPages }, (_, i) => i + 1); }

  // ── Translates any backend error message to Arabic ──────────────────────────
  private translateOrderError(err: any): string {
    const httpStatus: number = err?.status;
    const rawMsg: string = (err?.error?.message || err?.error?.error || err?.message || '').toLowerCase();

    // ── Map by HTTP status code first ────────────────────────────────────────
    if (httpStatus === 404) return 'الطلب غير موجود في قاعدة البيانات';
    if (httpStatus === 401) return 'غير مصرح لك بتعديل الطلبات — يرجى تسجيل الدخول مجدداً';
    if (httpStatus === 403) return 'ليس لديك صلاحية تعديل هذا الطلب';
    if (httpStatus === 500) return 'خطأ داخلي في الخادم — يرجى المحاولة لاحقاً';
    if (httpStatus === 0) return 'لا يوجد اتصال بالخادم — تأكد من تشغيل الباكاند';

    // ── Map by known English error message patterns ──────────────────────────
    if (rawMsg.includes('cannot move order')) return `لا يمكن تغيير حالة الطلب — الانتقال غير مسموح به`;
    if (rawMsg.includes('terminal state')) return 'هذا الطلب في حالة نهائية ولا يمكن تغييرها';
    if (rawMsg.includes('allowed transitions')) return 'هذا الانتقال غير مسموح به وفق ترتيب الحالات';
    if (rawMsg.includes('invalid status')) return 'قيمة الحالة المُرسلة غير صالحة';
    if (rawMsg.includes('invalid order id')) return 'معرّف الطلب غير صحيح';
    if (rawMsg.includes('order not found')) return 'الطلب غير موجود';
    if (rawMsg.includes('not found')) return 'العنصر المطلوب غير موجود';
    if (rawMsg.includes('conflict')) return 'يوجد تعارض في بيانات الطلب';
    if (rawMsg.includes('unauthorized')) return 'غير مصرح — يرجى تسجيل الدخول مجدداً';
    if (rawMsg.includes('forbidden')) return 'ليس لديك صلاحية لهذا الإجراء';
    if (rawMsg.includes('network')) return 'مشكلة في الاتصال بالشبكة';
    if (rawMsg.includes('timeout')) return 'انتهت مهلة الطلب — حاول مرة أخرى';

    // ── If the message is already in Arabic, return it directly ─────────────
    if (err?.error?.message && /[\u0600-\u06FF]/.test(err.error.message)) {
      return err.error.message;
    }

    // ── Generic fallback with HTTP code ──────────────────────────────────────
    return httpStatus ? `فشل الطلب (كود الخطأ: ${httpStatus})` : 'حدث خطأ غير متوقع — يرجى المحاولة لاحقاً';
  }

  updateOrderStatus(order: Order, newStatus: string): void {
    if (!newStatus) return;

    const previousStatus = order.status;

    this.orderSvc.updateStatus(order._id, newStatus).subscribe({
      next: (res) => {
        order.status = res.data.status as any;
        const statusLabels: Record<string, string> = {
          pending: 'في الانتظار',
          confirmed: 'تم التأكيد',
          processing: 'قيد التجهيز',
          shipped: 'تم الشحن',
          delivered: 'تم التوصيل',
          cancelled: 'ملغي',
          refunded: 'تم الاسترجاع',
        };
        const label = statusLabels[newStatus] ?? newStatus;
        this.toast.success(`✅ تم تحديث حالة الطلب إلى "${label}" بنجاح`);
      },
      error: (err) => {
        order.status = previousStatus; // revert dropdown
        const reason = this.translateOrderError(err);
        this.toast.error(`❌ فشل تحديث الحالة\n${reason}`);
      }
    });
  }
}
