import { httpClient } from '../api';

export type CompanySettings = {
  company_name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  tax_information: string;
  support_email: string;
  invoice_footer_text: string;
  logo: string | null;
  logo_url?: string | null;
  updated_at: string;
};

export type CompanySettingsInput = Partial<
  Omit<CompanySettings, 'logo' | 'updated_at'> & {
    logo?: File | null;
  }
>;

export async function getCompanySettings() {
  const response = await httpClient.get<CompanySettings>('/settings/company/');
  return response.data;
}

export async function updateCompanySettings(payload: CompanySettingsInput) {
  const hasLogoFile = payload.logo instanceof File;

  if (hasLogoFile) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'logo' && value instanceof File) {
        formData.append('logo', value);
      } else if (typeof value === 'string') {
        formData.append(key, value);
      }
    });
    const response = await httpClient.patch<CompanySettings>('/settings/company/', formData);
    return response.data;
  }

  const { logo: _logo, ...jsonPayload } = payload;
  const response = await httpClient.patch<CompanySettings>('/settings/company/', jsonPayload);
  return response.data;
}
