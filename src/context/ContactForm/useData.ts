import { useContext } from "react";
import Context from "./Context";

export default function useData() {
  const dataContext = useContext(Context);
  if (!dataContext) {
    throw new Error('useContactForm must be used within ContactFormProvider');
  }
  return dataContext;
}