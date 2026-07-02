// category-management.component.ts
import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CategoryService, Category } from '../../../core/services/category.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagementComponent implements OnInit, OnDestroy {

  // ── State ────────────────────────────────────────────────────────────────────
  categories: Category[] = [];
  isLoading = false;
  isSubmitting = false;
  isUploadingImage = false;
  showForm = false;
  editingId: string | null = null;

  // Image handling
  imagePreview: string | null = null;
  pendingImageFile: File | null = null;
  uploadedImageUrl = '';

  categoryForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private catSvc: CategoryService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  buildForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      isVisible: [true],
      sortOrder: [0, [Validators.min(0)]],
    });
  }

  // ── Load ──────────────────────────────────────────────────────────────────────
  loadCategories(): void {
    this.isLoading = true;
    this.catSvc.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.categories = res.data.categories;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Image Selection ───────────────────────────────────────────────────────────
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate type client-side
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.toast.error('نوع الملف غير مدعوم. استخدم JPG, PNG أو WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('حجم الصورة يتجاوز 5 ميجابايت');
      return;
    }

    this.pendingImageFile = file;
    this.imagePreview = URL.createObjectURL(file);
    this.cdr.markForCheck();
    input.value = '';
  }

  removeSelectedImage(): void {
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.imagePreview = null;
    this.pendingImageFile = null;
    this.uploadedImageUrl = '';
    this.cdr.markForCheck();
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    this.categoryForm.markAllAsTouched();
    if (this.categoryForm.invalid) return;

    this.isSubmitting = true;
    this.cdr.markForCheck();

    try {
      // 1. Upload image first if a new one was selected
      if (this.pendingImageFile) {
        this.isUploadingImage = true;
        this.cdr.markForCheck();

        const uploadRes = await this.catSvc.uploadImage(this.pendingImageFile).toPromise();
        this.uploadedImageUrl = uploadRes?.url || '';
        this.isUploadingImage = false;
      }

      const { name, isVisible, sortOrder } = this.categoryForm.value;
      const payload: any = {
        name,
        isVisible,
        sortOrder: sortOrder ?? 0,
        ...(this.uploadedImageUrl ? { image: this.uploadedImageUrl } : {}),
      };

      // 2. Create or update
      const req$ = this.editingId
        ? this.catSvc.update(this.editingId, payload)
        : this.catSvc.create(payload);

      req$.pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          this.toast.success(this.editingId ? 'تم تحديث القسم ✅' : 'تم إضافة القسم ✅');
          this.closeForm();
          this.loadCategories();
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          const msg = err?.error?.message || 'حدث خطأ، حاول مرة أخرى';
          this.toast.error(msg);
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
      });

    } catch {
      this.toast.error('فشل رفع الصورة، حاول مرة أخرى');
      this.isSubmitting = false;
      this.isUploadingImage = false;
      this.cdr.markForCheck();
    }
  }

  // ── Toggle Visibility (inline) ────────────────────────────────────────────────
  toggleVisibility(cat: Category): void {
    const newState = !cat.isVisible;

    // Optimistic update
    cat.isVisible = newState;
    this.cdr.markForCheck();

    this.catSvc.update(cat._id, { isVisible: newState })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(`تم ${newState ? 'تفعيل' : 'إخفاء'} القسم ✅`);
        },
        error: () => {
          // Rollback on failure
          cat.isVisible = !newState;
          this.toast.error('فشل تحديث الحالة، حاول مرة أخرى');
          this.cdr.markForCheck();
        },
      });
  }

  // ── Edit ──────────────────────────────────────────────────────────────────────
  openEditForm(cat: Category): void {
    this.editingId = cat._id;
    this.buildForm();
    this.categoryForm.patchValue({
      name: cat.name,
      isVisible: cat.isVisible,
      sortOrder: cat.sortOrder ?? 0,
    });
    this.uploadedImageUrl = cat.image || '';
    this.imagePreview = cat.image || null;
    this.pendingImageFile = null;
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openAddForm(): void {
    this.editingId = null;
    this.buildForm();
    this.imagePreview = null;
    this.pendingImageFile = null;
    this.uploadedImageUrl = '';
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    if (this.imagePreview && this.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.imagePreview = null;
    this.pendingImageFile = null;
    this.uploadedImageUrl = '';
    this.cdr.markForCheck();
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  confirmDelete(cat: Category): void {
    if (!confirm(`هل أنت متأكد من حذف قسم "${cat.name}"؟`)) return;

    this.catSvc.remove(cat._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.success('تم حذف القسم ✅');
        this.loadCategories();
      },
      error: () => this.toast.error('فشل حذف القسم، حاول مرة أخرى'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  trackById(_: number, cat: Category): string { return cat._id; }
}
