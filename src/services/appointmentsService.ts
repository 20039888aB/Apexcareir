import { httpClient } from '../api';

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function extractResults<T>(payload: PaginatedResponse<T> | T[]) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type Appointment = {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  county: string;
  procedure_interest: string;
  preferred_date: string | null;
  preferred_time: string;
  message: string;
  status: AppointmentStatus;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
};

export type CreateAppointmentInput = {
  full_name: string;
  phone_number: string;
  email?: string;
  county: string;
  procedure_interest?: string;
  preferred_date?: string;
  preferred_time?: string;
  message?: string;
};

export type ContactRequest = {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'reviewed' | 'closed';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
};

export type ContactRequestStatus = ContactRequest['status'];

export type CreateContactRequestInput = {
  full_name: string;
  phone_number: string;
  email?: string;
  subject?: string;
  message: string;
};

export async function createAppointment(payload: CreateAppointmentInput) {
  const response = await httpClient.post<Appointment>('/appointments/', payload);
  return response.data;
}

export async function listAppointments(params?: {
  search?: string;
  status?: AppointmentStatus | '';
  ordering?: string;
}) {
  const response = await httpClient.get<PaginatedResponse<Appointment> | Appointment[]>('/appointments/', { params });
  return extractResults(response.data);
}

export async function updateAppointment(
  id: number,
  payload: Partial<Pick<Appointment, 'status' | 'admin_notes' | 'preferred_date' | 'preferred_time' | 'message'>>,
) {
  const response = await httpClient.patch<Appointment>(`/appointments/${id}/`, payload);
  return response.data;
}

export async function deleteAppointment(id: number) {
  await httpClient.delete(`/appointments/${id}/`);
}

export async function createContactRequest(payload: CreateContactRequestInput) {
  const response = await httpClient.post<ContactRequest>('/contact-requests/', payload);
  return response.data;
}

export async function listContactRequests(params?: {
  search?: string;
  status?: ContactRequestStatus | '';
  ordering?: string;
}) {
  const response = await httpClient.get<PaginatedResponse<ContactRequest> | ContactRequest[]>('/contact-requests/', { params });
  return extractResults(response.data);
}

export async function updateContactRequest(
  id: number,
  payload: Partial<Pick<ContactRequest, 'status' | 'admin_notes'>>,
) {
  const response = await httpClient.patch<ContactRequest>(`/contact-requests/${id}/`, payload);
  return response.data;
}

export async function deleteContactRequest(id: number) {
  await httpClient.delete(`/contact-requests/${id}/`);
}
