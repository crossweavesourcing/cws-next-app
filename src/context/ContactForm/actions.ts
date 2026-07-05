import { FormData } from './types';

export async function submitForm(formData: FormData) {
  try {
    const response = await fetch('/api/contact', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to submit form' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Client: Failed to submit to API route:", error);
    return { success: false, error: "Network error. Please check your connection." };
  }
}