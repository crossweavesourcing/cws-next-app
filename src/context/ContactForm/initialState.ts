import { FormState } from "./types";
const initialState: FormState = {
  formData: { name: '', email: '', subject: '', message: '' },
  isSubmitting: false,
  submitSuccess: false,
  submitError: null,
};
export default initialState