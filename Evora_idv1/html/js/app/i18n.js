// Evora ID — Arabic interface strings

export const T = {
  appName: 'Evora ID',
  nav: { home: 'الرئيسية', designs: 'التصاميم', presets: 'القوالب', favorites: 'المفضلة', drafts: 'المسودات' },
  navDesc: {
    home: 'حالة تصميمك الحالي وإجراءات سريعة.',
    designs: 'تصاميمك المحفوظة والتصاميم المستخدمة مؤخراً.',
    presets: 'تصاميم كاملة جاهزة. اختر قالباً ثم عدّل عليه بحرية.',
    favorites: 'القوالب والتصاميم التي ميّزتها بنجمة.',
    drafts: 'تُحفظ مسودتك تلقائياً على جهازك ولا تُطبّق إلا عند الحفظ.',
  },
  tabs: {
    text: 'النص', font: 'الخط', colors: 'الألوان', gradient: 'التدرج', effect: 'التأثير', image: 'الصورة',
    position: 'الموضع', shadow: 'الظلال', outline: 'الإطار', chars: 'الأحرف', layers: 'الطبقات', voice: 'الصوت',
  },
  status: {
    permanent: 'دائم', temporary: 'مؤقت', expired: 'منتهي', draft: 'مسودة', none: 'بدون تصميم', cooldown: 'فترة انتظار', locked: 'مقفل',
    featured: 'مميز', hidden: 'مخفي',
  },
  sel: { stage: 'التكوين', group: 'المجموعة', text: 'النص', image: 'الصورة', voice: 'مؤشر التحدث' },
  numerals: { latin: 'إنجليزية', arabic: 'عربية', persian: 'فارسية' },
  fontCats: {
    all: 'الكل', arabic: 'عربي', 'arabic-display': 'عربي عرض', 'arabic-serif': 'عربي كلاسيكي', sans: 'حديث', condensed: 'ضيق',
    display: 'عرض', tech: 'تقني', mono: 'أحادي', serif: 'سيريف', retro: 'ريترو',
  },
  errors: {
    no_permission: 'لا تملك الصلاحية لهذا الإجراء.',
    not_ready: 'بياناتك لم تُحمّل بعد، حاول بعد لحظات.',
    invalid_design: 'التصميم غير صالح.',
    cooldown: 'لا يمكنك الحفظ الآن، فترة الانتظار لم تنتهِ.',
    locked: 'تصميمك مقفل من الإدارة ولا يمكن تعديله.',
    preset_locked: 'هذا القالب مقفل ومتاح للإدارة فقط.',
    db_unavailable: 'قاعدة البيانات غير متاحة حالياً.',
    db_error: 'تعذّر الحفظ في قاعدة البيانات.',
    rate_limited: 'طلبات كثيرة، انتظر قليلاً.',
    timeout: 'انتهت مهلة الاتصال بالخادم.',
    server_error: 'حدث خطأ في الخادم.',
    images_disabled: 'الصور معطلة على هذا السيرفر.',
    url_disabled: 'روابط الصور معطلة على هذا السيرفر.',
    discord_disabled: 'صور ديسكورد معطلة على هذا السيرفر.',
    invalid_url: 'الرابط غير صالح. يجب أن يبدأ بـ https://',
    host_not_allowed: 'هذا الموقع غير مسموح. استخدم رابطاً من المواقع المعتمدة.',
    bad_extension: 'صيغة الملف غير مدعومة (PNG, JPG, WEBP, GIF).',
    not_image: 'الرابط لا يشير إلى صورة.',
    unreachable: 'تعذّر الوصول إلى الصورة.',
    too_large: 'حجم الصورة أكبر من المسموح.',
    gif_not_allowed: 'الصور المتحركة غير مسموحة.',
    invalid_discord_id: 'معرّف ديسكورد غير صالح (17 إلى 20 رقماً).',
    discord_user_not_found: 'لم يتم العثور على مستخدم ديسكورد.',
    invalid_asset: 'الشعار غير موجود.',
    invalid_image: 'الصورة غير صالحة.',
    invalid_slot: 'رقم التصميم غير صالح.',
    favorites_full: 'وصلت إلى الحد الأقصى للمفضلة.',
    preset_not_found: 'القالب غير موجود.',
    builtin_preset: 'لا يمكن حذف القوالب المدمجة، يمكنك إخفاؤها.',
    invalid_target: 'اللاعب المحدد غير صالح.',
    target_not_found: 'لم يتم العثور على اللاعب.',
    invalid_duration: 'المدة غير صالحة.',
    invalid_mode: 'نوع الصلاحية غير صالح.',
    invalid_name: 'الاسم مطلوب.',
    no_design: 'لا يوجد تصميم لهذا اللاعب.',
    force_disabled: 'فرض التصاميم معطل في الإعدادات.',
    player_not_ready: 'اللاعب غير متصل.',
    load_failed: 'تعذّر تحميل الصورة.',
    closed: 'المحرر مغلق.',
    unknown_action: 'إجراء غير معروف.',
  },
  audit: {
    open_manager: 'فتح الإدارة', edit_design: 'تعديل تصميم', apply_preset: 'تطبيق قالب', delete_design: 'حذف تصميم',
    reset_cooldown: 'إعادة ضبط الانتظار', change_expiration: 'تغيير الصلاحية', lock_design: 'قفل / فتح', force_style: 'فرض تصميم',
    preset_create: 'إنشاء قالب', preset_update: 'تعديل قالب', preset_delete: 'حذف قالب', self_save: 'حفظ شخصي',
  },
};

export function errText(key) {
  if (!key) return T.errors.server_error;
  return T.errors[key] || String(key);
}

// "2d 4h" style duration in Arabic
export function dur(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0));
  const d = Math.floor(seconds / 86400), hh = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} يوم${hh ? ` و ${hh} ساعة` : ''}`;
  if (hh > 0) return `${hh} ساعة${m ? ` و ${m} دقيقة` : ''}`;
  return `${Math.max(1, m)} دقيقة`;
}

export function ago(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'الآن';
  if (s < 3600) return `منذ ${Math.floor(s / 60)} دقيقة`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} ساعة`;
  return `منذ ${Math.floor(s / 86400)} يوم`;
}
