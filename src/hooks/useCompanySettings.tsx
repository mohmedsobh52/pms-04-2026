import { useState, useEffect, useCallback } from 'react';

export interface CompanySettings {
  // بيانات الشركة
  companyNameAr: string;
  companyNameEn: string;
  description: string;
  phone: string;
  fax: string;            // رقم الفاكس
  email: string;
  website: string;
  city: string;
  country: string;
  address: string;        // العنوان التفصيلي
  taxNumber: string;      // الرقم الضريبي
  crNumber: string;       // رقم السجل التجاري
  
  // إعدادات التسعير الافتراضية
  defaultCurrency: string;
  defaultProfitMargin: number;
  defaultOverhead: number;
  defaultContingency: number;
  defaultInsurance: number;
  defaultAdmin: number;
}

const STORAGE_KEY = 'company-settings';

const defaultSettings: CompanySettings = {
  companyNameAr: 'الإمتياز الوطنية للمقاولات',
  companyNameEn: 'AL IMTYAZ ALWATANIYA CONT.',
  description: '',
  phone: '+966-12-677-3822',
  fax: '+966-12-677-3822',
  email: 'contact@imtyaz.sa',
  website: 'www.imtyaz.sa',
  city: 'Jeddah',
  country: 'Kingdom of Saudi Arabia',
  address: 'P.O.Box 24610 Post Code 21456',
  taxNumber: '',
  crNumber: '181551',
  defaultCurrency: 'SAR',
  defaultProfitMargin: 15,
  defaultOverhead: 10,
  defaultContingency: 5,
  defaultInsurance: 2,
  defaultAdmin: 3,
};

export const CURRENCIES = [
  { value: 'SAR', labelAr: 'ريال سعودي', labelEn: 'SAR - Saudi Riyal' },
  { value: 'USD', labelAr: 'دولار أمريكي', labelEn: 'USD - US Dollar' },
  { value: 'EUR', labelAr: 'يورو', labelEn: 'EUR - Euro' },
  { value: 'EGP', labelAr: 'جنيه مصري', labelEn: 'EGP - Egyptian Pound' },
  { value: 'AED', labelAr: 'درهم إماراتي', labelEn: 'AED - UAE Dirham' },
  { value: 'KWD', labelAr: 'دينار كويتي', labelEn: 'KWD - Kuwaiti Dinar' },
  { value: 'QAR', labelAr: 'ريال قطري', labelEn: 'QAR - Qatari Riyal' },
  { value: 'BHD', labelAr: 'دينار بحريني', labelEn: 'BHD - Bahraini Dinar' },
  { value: 'OMR', labelAr: 'ريال عماني', labelEn: 'OMR - Omani Rial' },
];

export const getCompanySettings = (): CompanySettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error reading company settings:', error);
  }
  return defaultSettings;
};

export const useCompanySettings = () => {
  const [settings, setSettings] = useState<CompanySettings>(getCompanySettings);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Error saving company settings:', error);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<CompanySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const getTotalMarkup = useCallback(() => {
    return settings.defaultProfitMargin + 
           settings.defaultOverhead + 
           settings.defaultContingency +
           settings.defaultInsurance +
           settings.defaultAdmin;
  }, [settings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    lastSavedAt,
    getTotalMarkup,
  };
};
